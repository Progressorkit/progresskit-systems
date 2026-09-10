"""Privacy-minimal product API. No visitor identifiers or request logging."""
import os
import secrets
import sqlite3
import time
from contextlib import closing
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

# Fail closed if deployment omits its persistent storage configuration.
DB_PATH = Path(os.environ['PK_PRODUCT_DB'])
APK_PATH = Path(os.environ.get('PK_APK_PATH', str(Path(__file__).resolve().parents[1] / 'downloads/glikemia-premium.apk')))
ORIGIN = os.environ.get('PK_PUBLIC_ORIGIN', 'https://progresskit.pl')
router = APIRouter()


def connect():
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    return db


def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY CHECK(id=1), total INTEGER NOT NULL, last_at INTEGER);
        INSERT OR IGNORE INTO downloads VALUES (1,0,NULL);
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY, nickname TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
          comment TEXT NOT NULL, version TEXT NOT NULL, created_at INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')));
        CREATE TABLE IF NOT EXISTS form_tokens (token TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS review_limits (hour INTEGER PRIMARY KEY, total INTEGER NOT NULL);
        ''')
        db.commit()


initialize()


def no_cache(data, status=200):
    return JSONResponse(data, status_code=status, headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.get('/api/glikemia/downloads')
def count():
    with closing(connect()) as db:
        return no_cache({'downloads': db.execute('SELECT total FROM downloads WHERE id=1').fetchone()[0]})


class CountedAPKResponse(FileResponse):
    """Count only completed full responses; never failed sends or Range retries."""
    async def __call__(self, scope, receive, send):
        status = None
        complete = False
        expected = 0
        transferred = 0

        async def observed_send(message):
            nonlocal status, complete, expected, transferred
            await send(message)  # A failed/disconnected send must never be counted.
            if message['type'] == 'http.response.start':
                status = message['status']
                expected = int(dict(message.get('headers', [])).get(b'content-length', b'0'))
            elif message['type'] == 'http.response.body':
                transferred += len(message.get('body', b''))
                complete = not message.get('more_body', False)

        # Do not delegate transfer to pathsend: observe actual ASGI body completion.
        scope = dict(scope, extensions={k: v for k, v in scope.get('extensions', {}).items()
                                       if k != 'http.response.pathsend'})
        await super().__call__(scope, receive, observed_send)
        headers = dict(scope.get('headers', []))
        if (complete and transferred == expected and expected > 0 and status == 200
                and b'range' not in headers and scope['method'] == 'GET'):
            with closing(connect()) as db:
                db.execute('UPDATE downloads SET total=total+1,last_at=? WHERE id=1', (int(time.time()),))
                db.commit()


@router.get('/download/glikemia-premium')
@router.get('/downloads/glikemia-premium.apk')
def download(request: Request):
    purpose = ' '.join(request.headers.get(name, '') for name in
                       ('purpose', 'sec-purpose', 'x-purpose', 'x-moz')).lower()
    if 'prefetch' in purpose or 'prerender' in purpose:
        return Response(status_code=204, headers={'Cache-Control': 'no-store'})
    if not APK_PATH.is_file():
        raise HTTPException(503, 'Pobieranie chwilowo niedostępne.')
    return CountedAPKResponse(APK_PATH, media_type='application/vnd.android.package-archive',
                              filename='glikemia-premium.apk',
                              headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.get('/api/glikemia/reviews')
def reviews():
    with closing(connect()) as db:
        rows = db.execute("SELECT nickname,rating,comment,version,created_at FROM reviews WHERE status='approved' ORDER BY created_at DESC,id DESC LIMIT 50").fetchall()
    return no_cache({'reviews': [dict(r) for r in rows]})


@router.get('/api/glikemia/review-token')
def token():
    now = int(time.time())
    with closing(connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM form_tokens WHERE created_at < ?', (now-1800,))
        if db.execute('SELECT COUNT(*) FROM form_tokens').fetchone()[0] >= 1000:
            raise HTTPException(429, 'Spróbuj później.')
        value = secrets.token_urlsafe(32)
        db.execute('INSERT INTO form_tokens VALUES (?,?)', (value, now))
        db.commit()
    return no_cache({'token': value})


class Review(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    nickname: str = Field(min_length=2, max_length=60)
    rating: int = Field(ge=1, le=5, strict=True)
    comment: str = Field(min_length=10, max_length=2000)
    version: str = Field(default='', max_length=30)
    website: str = Field(default='', max_length=0)
    token: str = Field(min_length=32, max_length=64)

    @field_validator('nickname', 'comment', 'version')
    @classmethod
    def plain_text(cls, value):
        if '<' in value or '>' in value or any(ord(c) < 32 and c not in '\n\t' for c in value):
            raise ValueError('Dozwolony jest tylko zwykły tekst.')
        return value


@router.post('/api/glikemia/reviews')
async def submit(request: Request):
    if request.headers.get('origin') != ORIGIN:
        raise HTTPException(403, 'Niedozwolone źródło formularza.')
    if request.headers.get('content-type', '').split(';')[0] != 'application/json':
        raise HTTPException(415, 'Wymagany JSON.')
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 12000:
            raise HTTPException(413, 'Formularz jest za duży.')
    try:
        review = Review.model_validate_json(body)
    except ValidationError:
        raise HTTPException(422, 'Sprawdź pola: pseudonim 2–60, komentarz 10–2000 znaków, ocena 1–5. Bez HTML.') from None
    now = int(time.time())
    with closing(connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT created_at FROM form_tokens WHERE token=?', (review.token,)).fetchone()
        if not row or not 3 <= now-row[0] <= 1800:
            raise HTTPException(400, 'Odśwież formularz i odczekaj co najmniej 3 sekundy.')
        db.execute('DELETE FROM review_limits WHERE hour < ?', (now//3600-24,))
        used = db.execute('SELECT total FROM review_limits WHERE hour=?', (now//3600,)).fetchone()
        if (used and used[0] >= 20) or db.execute("SELECT COUNT(*) FROM reviews WHERE status='pending'").fetchone()[0] >= 500:
            raise HTTPException(429, 'Limit opinii. Spróbuj ponownie później.')
        db.execute('DELETE FROM form_tokens WHERE token=?', (review.token,))
        db.execute('INSERT INTO review_limits VALUES (?,1) ON CONFLICT(hour) DO UPDATE SET total=total+1', (now//3600,))
        db.execute('INSERT INTO reviews(nickname,rating,comment,version,created_at) VALUES (?,?,?,?,?)', (review.nickname, review.rating, review.comment, review.version, now))
        db.commit()
    return no_cache({'message': 'Dziękujemy. Opinia pojawi się po zatwierdzeniu przez ProgressKit.'}, 201)
