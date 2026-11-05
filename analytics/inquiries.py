"""Private project inquiries, persisted before any public acceptance response.

Runs inside the existing analytics service, sharing PK_PRODUCT_DB by default.
No request body, raw IP, email or secret is logged by this module.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import stat
import time
import unicodedata
import uuid
from contextlib import closing
from datetime import datetime, timezone
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StrictStr, ValidationError, field_validator

_database = os.environ.get('PK_INQUIRIES_DB') or os.environ.get('PK_PRODUCT_DB')
DB_PATH = Path(_database) if _database else None
ORIGIN = os.environ.get('PK_PUBLIC_ORIGIN', 'https://progresskit.pl').rstrip('/')
TOKEN_TTL = 1800
MIN_WAIT_SECONDS = 3
MAX_BODY_BYTES = 160 * 1024
ANSWER_KEYS = ('problem', 'users', 'processes', 'integrations', 'budget', 'deadline')
router = APIRouter()
EMAIL_LOCAL = re.compile(r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$")
DOMAIN_LABEL = re.compile(r'^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$')
TOKEN_PATTERN = re.compile(r'^[A-Za-z0-9_-]{43}$')


def storage_is_private():
    """Conservative POSIX readiness gate; never repair operator-owned storage.

    Validate sidecars too: chmod of an existing main file alone does not protect
    an older WAL/SHM. Backups and containing directories remain deployment gates.
    """
    if DB_PATH is None or os.name != 'posix':
        return False
    for suffix in ('', '-wal', '-shm', '-journal'):
        path = Path(str(DB_PATH) + suffix)
        try:
            info = path.lstat()
        except FileNotFoundError:
            if suffix:
                continue
            return False
        except OSError:
            return False
        if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) & 0o077:
            return False
    return True


def connect():
    if not storage_is_private():
        raise sqlite3.OperationalError('private storage unavailable')
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('PRAGMA synchronous=FULL')
    db.execute('PRAGMA secure_delete=ON')
    return db


def initialize():
    if DB_PATH is None:
        return
    DB_PATH.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    try:
        descriptor = os.open(DB_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        pass  # Existing shared product storage is owned/configured by the deployment.
    else:
        os.close(descriptor)
    if not storage_is_private():
        return  # Keep unrelated analytics/product routes available; inquiries fail closed.
    with closing(connect()) as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS project_inquiries (
            id TEXT PRIMARY KEY, created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL, contact_name TEXT NOT NULL,
            email TEXT NOT NULL, client_type TEXT NOT NULL
                CHECK(client_type IN ('company','private','cooperation')),
            phone TEXT NOT NULL, description TEXT NOT NULL, answers_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new')),
            submission_key TEXT NOT NULL UNIQUE, receipt_token_hash TEXT NOT NULL,
            payload_hash TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_project_inquiries_created
            ON project_inquiries(created_at DESC,id DESC);
        CREATE INDEX IF NOT EXISTS ix_project_inquiries_expiry
            ON project_inquiries(expires_at);
        CREATE TABLE IF NOT EXISTS inquiry_tokens (
            token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL, used_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS ix_inquiry_tokens_expiry ON inquiry_tokens(expires_at);
        CREATE TABLE IF NOT EXISTS inquiry_limits (
            scope TEXT NOT NULL, bucket INTEGER NOT NULL, total INTEGER NOT NULL,
            expires_at INTEGER NOT NULL, PRIMARY KEY(scope,bucket)
        );
        CREATE INDEX IF NOT EXISTS ix_inquiry_limits_expiry ON inquiry_limits(expires_at);
        CREATE TABLE IF NOT EXISTS inquiry_outbox (
            id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL UNIQUE
                REFERENCES project_inquiries(id) ON DELETE CASCADE,
            created_at INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'pending'
                CHECK(state IN ('pending','sending','sent')),
            attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL,
            lease_id TEXT, lease_until INTEGER, sent_at INTEGER, last_error_code TEXT
        );
        CREATE INDEX IF NOT EXISTS ix_inquiry_outbox_ready
            ON inquiry_outbox(state,next_attempt_at,lease_until);
        ''')
        db.commit()


initialize()


def response(data, status=200):
    return JSONResponse(data, status_code=status, headers={
        'Cache-Control': 'no-store, private', 'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    })


def fail(status, code, message):
    raise HTTPException(status, {'code': code, 'message': message}, headers={
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    })


def secret(name):
    """Secret files support container secrets; a bad file never falls back silently."""
    path = os.environ.get(name + '_FILE')
    try:
        value = Path(path).read_text(encoding='utf-8').rstrip('\r\n') if path else os.environ.get(name, '')
    except (OSError, UnicodeError):
        return ''
    return value if 32 <= len(value) <= 512 and not any(ord(c) < 33 or ord(c) > 126 for c in value) else ''


def valid_origin():
    try:
        parsed = urlsplit(ORIGIN)
        if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
            return False
        if not parsed.hostname or parsed.port == 0:
            return False
        if parsed.scheme == 'https':
            return True
        # Explicit loopback is solely for local proof. Never permit arbitrary HTTP hosts.
        return parsed.scheme == 'http' and parsed.hostname in ('localhost', '127.0.0.1', '::1')
    except ValueError:
        return False


def public_ready():
    key = secret('PK_INQUIRIES_HMAC_SECRET')
    if not key or not valid_origin():
        fail(503, 'temporarily_unavailable', 'Formularz jest chwilowo niedostępny. Zachowaj treść i spróbuj później.')
    if not storage_is_private():
        fail(503, 'storage_unavailable', 'Formularz jest chwilowo niedostępny. Zachowaj treść i spróbuj później.')
    return key


def same_origin(request, *, token=False):
    origin = request.headers.get('origin')
    fetch_site = request.headers.get('sec-fetch-site')
    fetch_mode = request.headers.get('sec-fetch-mode')
    if fetch_site is not None and fetch_site != 'same-origin':
        fail(403, 'invalid_origin', 'Niedozwolone źródło formularza.')
    if fetch_mode is not None and fetch_mode not in ('cors', 'same-origin'):
        fail(403, 'invalid_origin', 'Niedozwolone źródło formularza.')
    if token:
        if (request.headers.get('x-pk-form') != 'project-inquiry'
                or (origin != ORIGIN and not (origin is None and fetch_site == 'same-origin'))):
            fail(403, 'invalid_origin', 'Niedozwolone źródło formularza.')
    elif origin != ORIGIN or request.headers.get('x-pk-form') != 'project-inquiry':
        fail(403, 'invalid_origin', 'Niedozwolone źródło formularza.')


def identity(request, key):
    # Forwarded headers are deliberately not interpreted here. Configure only trusted
    # proxy IPs in Uvicorn; direct clients cannot choose their own rate-limit identity.
    address = request.client.host if request.client else 'unknown'
    return hmac.new(key.encode(), ('ip:' + address).encode(), hashlib.sha256).hexdigest()


def limit(db, scope, maximum, seconds, now):
    bucket = now // seconds
    row = db.execute('SELECT total FROM inquiry_limits WHERE scope=? AND bucket=?',
                     (scope + ':' + str(seconds), bucket)).fetchone()
    if row and row['total'] >= maximum:
        fail(429, 'rate_limited', 'Zbyt wiele prób. Zachowaj treść i spróbuj ponownie później.')
    db.execute('INSERT INTO inquiry_limits VALUES (?,?,1,?) '
               'ON CONFLICT(scope,bucket) DO UPDATE SET total=total+1',
               (scope + ':' + str(seconds), bucket, (bucket + 1) * seconds))


def basic_limit(request, key, *, token):
    """Count rejected attempts too, using only keyed hashes and short-lived buckets."""
    now = int(time.time())
    who = identity(request, key)
    try:
        with closing(connect()) as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM inquiry_limits WHERE expires_at<=?', (now,))
            db.execute('DELETE FROM inquiry_tokens WHERE expires_at<=?', (now,))
            if token:
                limit(db, 'token-ip:' + who, 20, 3600, now)
                limit(db, 'token-global', 300, 3600, now)
            else:
                limit(db, 'attempt-ip:' + who, 30, 600, now)
                limit(db, 'attempt-global', 300, 600, now)
            db.commit()
    except sqlite3.Error:
        fail(503, 'storage_unavailable', 'Nie udało się potwierdzić zapisu. Zachowaj treść i spróbuj ponownie.')
    return who


@router.get('/api/project-inquiries/token')
def issue_token(request: Request):
    key = public_ready()
    same_origin(request, token=True)
    basic_limit(request, key, token=True)
    now = int(time.time())
    value = secrets.token_urlsafe(32)
    try:
        with closing(connect()) as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT COUNT(*) FROM inquiry_tokens').fetchone()[0] >= 10000:
                fail(429, 'rate_limited', 'Formularz jest obciążony. Spróbuj ponownie później.')
            db.execute('INSERT INTO inquiry_tokens VALUES (?,?,?,NULL)',
                       (hashlib.sha256(value.encode()).hexdigest(), now, now + TOKEN_TTL))
            db.commit()
    except sqlite3.Error:
        fail(503, 'storage_unavailable', 'Formularz jest chwilowo niedostępny. Spróbuj ponownie.')
    return response({'token': value, 'expires_in': TOKEN_TTL, 'min_wait_seconds': MIN_WAIT_SECONDS})


def plain(value):
    value = unicodedata.normalize('NFC', value).strip()
    if '<' in value or '>' in value or any(unicodedata.category(c) in ('Cc', 'Cf', 'Cs')
                                          and c not in '\n\t' for c in value):
        raise ValueError('Dozwolony jest zwykły tekst bez HTML i znaków sterujących.')
    return value


def email_address(value):
    value = value.strip()
    if len(value) > 254 or value.count('@') != 1 or not value.isascii():
        raise ValueError('Niepoprawny adres e-mail.')
    local, domain = value.rsplit('@', 1)
    if (not 1 <= len(local) <= 64 or not EMAIL_LOCAL.fullmatch(local)
            or local.startswith('.') or local.endswith('.') or '..' in local
            or len(domain) > 253 or '.' not in domain
            or not all(DOMAIN_LABEL.fullmatch(label) for label in domain.split('.'))):
        raise ValueError('Niepoprawny adres e-mail.')
    # Reject IP literals, all-numeric TLDs and local names; no DNS lookup or external
    # provider is required to save a client's otherwise valid inquiry.
    if len(domain.rsplit('.', 1)[-1]) < 2 or domain.rsplit('.', 1)[-1].isdigit():
        raise ValueError('Niepoprawny adres e-mail.')
    return local + '@' + domain.lower()


class Answers(BaseModel):
    model_config = ConfigDict(extra='forbid')
    problem: StrictStr = Field(min_length=10, max_length=6000)
    users: StrictStr = Field(max_length=6000)
    processes: StrictStr = Field(max_length=6000)
    integrations: StrictStr = Field(max_length=6000)
    budget: StrictStr = Field(max_length=6000)
    deadline: StrictStr = Field(max_length=6000)

    @field_validator('*', mode='before')
    @classmethod
    def text(cls, value):
        return plain(value) if isinstance(value, str) else value


class Inquiry(BaseModel):
    model_config = ConfigDict(extra='forbid')
    token: StrictStr = Field(min_length=43, max_length=43)
    submission_key: StrictStr = Field(min_length=36, max_length=36)
    contact_name: StrictStr = Field(min_length=2, max_length=160)
    email: StrictStr = Field(min_length=3, max_length=254)
    client_type: StrictStr
    phone: StrictStr = Field(default='', max_length=40)
    answers: Answers
    website: StrictStr = Field(default='', max_length=0)

    @field_validator('contact_name', 'phone', mode='before')
    @classmethod
    def text(cls, value):
        if not isinstance(value, str):
            return value
        value = plain(value)
        if '\n' in value or '\t' in value:
            raise ValueError('Wymagana jedna linia tekstu.')
        return value

    @field_validator('email')
    @classmethod
    def email_valid(cls, value):
        return email_address(value)

    @field_validator('client_type')
    @classmethod
    def type_valid(cls, value):
        if value not in ('company', 'private', 'cooperation'):
            raise ValueError('Wybierz typ klienta.')
        return value

    @field_validator('token')
    @classmethod
    def token_valid(cls, value):
        if not TOKEN_PATTERN.fullmatch(value):
            raise ValueError('Niepoprawny token.')
        return value

    @field_validator('submission_key')
    @classmethod
    def key_valid(cls, value):
        try:
            parsed = uuid.UUID(value)
        except ValueError:
            raise ValueError('Niepoprawny identyfikator próby.') from None
        if parsed.version != 4 or str(parsed) != value:
            raise ValueError('Niepoprawny identyfikator próby.')
        return value


def retention_days():
    try:
        days = int(os.environ.get('PK_INQUIRIES_RETENTION_DAYS', '180'))
    except ValueError:
        days = 0
    if not 1 <= days <= 180:
        fail(503, 'temporarily_unavailable', 'Formularz jest chwilowo niedostępny. Zachowaj treść i spróbuj później.')
    return days


def iso_date(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace('+00:00', 'Z')


def receipt(row):
    return response({'id': row['id'], 'created_at': iso_date(row['created_at']),
                     'status': row['status'], 'message': 'Zgłoszenie przyjęte'}, 201)


@router.post('/api/project-inquiries', status_code=201)
async def submit(request: Request):
    key = public_ready()
    same_origin(request)
    if request.headers.get('content-type', '').split(';', 1)[0].strip().lower() != 'application/json':
        fail(415, 'invalid_content_type', 'Wymagany jest formularz JSON.')
    who = basic_limit(request, key, token=False)
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_BODY_BYTES:
            fail(413, 'too_large', 'Formularz jest za duży. Skróć opis i spróbuj ponownie.')
        body.extend(chunk)
    try:
        inquiry = Inquiry.model_validate_json(body)
    except ValidationError:
        fail(422, 'invalid_fields', 'Sprawdź nazwę, adres e-mail, typ klienta i opis projektu (co najmniej 10 znaków). Dozwolony jest zwykły tekst; maksymalnie 6000 znaków na odpowiedź.')
    days = retention_days()
    payload = inquiry.model_dump(exclude={'token', 'submission_key', 'website'})
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    digest = hashlib.sha256(serialized.encode()).hexdigest()
    token_hash = hashlib.sha256(inquiry.token.encode()).hexdigest()
    now = int(time.time())
    try:
        with closing(connect()) as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT id,created_at,expires_at,status,receipt_token_hash,payload_hash '
                                  'FROM project_inquiries WHERE submission_key=?',
                                  (inquiry.submission_key,)).fetchone()
            if existing:
                if not (secrets.compare_digest(existing['receipt_token_hash'], token_hash)
                        and secrets.compare_digest(existing['payload_hash'], digest)):
                    fail(409, 'submission_conflict', 'Ta próba ma inne dane. Odśwież formularz przed nowym zgłoszeniem.')
                if existing['expires_at'] <= now:
                    fail(409, 'receipt_expired', 'Okres przechowywania poprzedniego zgłoszenia upłynął. Utwórz nowe zgłoszenie.')
                # Retry after a lost response returns only the original receipt, even
                # after its one-use token expires. No contact data is exposed.
                db.commit()
                return receipt(existing)
            token = db.execute('SELECT created_at,expires_at,used_at FROM inquiry_tokens WHERE token_hash=?',
                               (token_hash,)).fetchone()
            if not token or token['used_at'] is not None or token['expires_at'] <= now:
                fail(400, 'token_expired', 'Sesja formularza wygasła. Odśwież możliwość wysłania; treść pozostaje w formularzu.')
            if now - token['created_at'] < MIN_WAIT_SECONDS:
                fail(400, 'form_too_fast', 'Odczekaj co najmniej 3 sekundy przed wysłaniem formularza.')
            email_hash = hmac.new(key.encode(), ('email:' + inquiry.email.lower()).encode(), hashlib.sha256).hexdigest()
            limit(db, 'submit-ip:' + who, 6, 3600, now)
            limit(db, 'submit-ip:' + who, 30, 86400, now)
            limit(db, 'submit-email:' + email_hash, 3, 3600, now)
            limit(db, 'submit-email:' + email_hash, 10, 86400, now)
            limit(db, 'submit-global', 60, 3600, now)
            identifier = str(uuid.uuid4())
            answers = json.dumps(payload['answers'], ensure_ascii=False, separators=(',', ':'))
            db.execute('INSERT INTO project_inquiries '
                       '(id,created_at,expires_at,contact_name,email,client_type,phone,description,answers_json,status,'
                       'submission_key,receipt_token_hash,payload_hash) VALUES (?,?,?,?,?,?,?,?,?,\'new\',?,?,?)',
                       (identifier, now, now + days * 86400, inquiry.contact_name, inquiry.email,
                        inquiry.client_type, inquiry.phone, inquiry.answers.problem, answers,
                        inquiry.submission_key, token_hash, digest))
            db.execute('INSERT INTO inquiry_outbox (id,inquiry_id,created_at,next_attempt_at) VALUES (?,?,?,?)',
                       (str(uuid.uuid4()), identifier, now, now))
            db.execute('UPDATE inquiry_tokens SET used_at=? WHERE token_hash=?', (now, token_hash))
            # FULL synchronization means acceptance follows SQLite's durable commit,
            # not merely validation or queuing a best-effort email.
            db.commit()
    except sqlite3.Error:
        fail(503, 'storage_unavailable', 'Nie udało się potwierdzić zapisu. Zachowaj treść i spróbuj ponownie z tym samym zgłoszeniem.')
    return receipt({'id': identifier, 'created_at': now, 'status': 'new'})


def authorize_private(request):
    expected = secret('PK_INQUIRIES_READ_TOKEN')
    hmac_key = secret('PK_INQUIRIES_HMAC_SECRET')
    if not expected or (hmac_key and secrets.compare_digest(expected, hmac_key)):
        fail(404, 'not_found', 'Nie znaleziono zasobu.')
    supplied = request.headers.get('authorization', '')
    parts = supplied.split(' ')
    if len(parts) != 2 or parts[0].lower() != 'bearer' or not secrets.compare_digest(parts[1].encode('utf-8'), expected.encode('ascii')):
        fail(404, 'not_found', 'Nie znaleziono zasobu.')
    if not storage_is_private():
        fail(404, 'not_found', 'Nie znaleziono zasobu.')


def private_record(row, *, detail):
    data = {'id': row['id'], 'created_at': iso_date(row['created_at']),
            'expires_at': iso_date(row['expires_at']), 'status': row['status'],
            'contact_name': row['contact_name'], 'email': row['email'],
            'client_type': row['client_type'], 'phone': row['phone'], 'description': row['description']}
    if detail:
        data['answers'] = json.loads(row['answers_json'])
    return data


@router.get('/internal/project-inquiries')
def private_list(request: Request):
    authorize_private(request)
    try:
        size = int(request.query_params.get('limit', '25'))
        before_at = int(request.query_params.get('before_at', str(2**63 - 1)))
        before_id = request.query_params.get('before_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
        if not 1 <= size <= 100 or not 0 <= before_at <= 2**63 - 1 or str(uuid.UUID(before_id)) != before_id:
            raise ValueError
    except ValueError:
        fail(400, 'invalid_pagination', 'Niepoprawne parametry stronicowania.')
    try:
        with closing(connect()) as db:
            rows = db.execute('SELECT * FROM project_inquiries WHERE expires_at>? '
                              'AND (created_at<? OR (created_at=? AND id<?)) '
                              'ORDER BY created_at DESC,id DESC LIMIT ?',
                              (int(time.time()), before_at, before_at, before_id, size + 1)).fetchall()
    except sqlite3.Error:
        fail(503, 'storage_unavailable', 'Odczyt jest chwilowo niedostępny.')
    selected = rows[:size]
    last = selected[-1] if len(rows) > size else None
    return response({'inquiries': [private_record(row, detail=False) for row in selected],
                     'next': {'before_at': last['created_at'], 'before_id': last['id']} if last else None})


@router.get('/internal/project-inquiries/{identifier}')
def private_detail(identifier: str, request: Request):
    authorize_private(request)
    try:
        if str(uuid.UUID(identifier)) != identifier:
            raise ValueError
    except ValueError:
        fail(404, 'not_found', 'Nie znaleziono zasobu.')
    try:
        with closing(connect()) as db:
            row = db.execute('SELECT * FROM project_inquiries WHERE id=? AND expires_at>?',
                             (identifier, int(time.time()))).fetchone()
    except sqlite3.Error:
        fail(503, 'storage_unavailable', 'Odczyt jest chwilowo niedostępny.')
    if not row:
        fail(404, 'not_found', 'Nie znaleziono zasobu.')
    return response(private_record(row, detail=True))
