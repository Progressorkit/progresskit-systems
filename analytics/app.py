import os
import re
import sqlite3
import time
from contextlib import closing
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("PK_ANALYTICS_DB", "analytics.db"))
ALLOWED_EVENTS = {
    "page_view",
    "contact_click",
    "project_open",
    "external_click",
}
SAFE_TOKEN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

app = FastAPI(
    title="ProgressKit Analytics",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with closing(connect()) as db:
        db.executescript(
            """
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                path TEXT NOT NULL,
                referrer_host TEXT,
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT
            );

            CREATE INDEX IF NOT EXISTS ix_events_created_at
                ON events(created_at);

            CREATE INDEX IF NOT EXISTS ix_events_type_created
                ON events(event_type, created_at);

            CREATE INDEX IF NOT EXISTS ix_events_source_created
                ON events(utm_source, created_at);
            """
        )
        db.commit()


initialize()


class AnalyticsEvent(BaseModel):
    event_type: str = Field(min_length=1, max_length=32)
    path: str = Field(min_length=1, max_length=256)
    referrer_host: str | None = Field(default=None, max_length=255)
    utm_source: str | None = Field(default=None, max_length=64)
    utm_medium: str | None = Field(default=None, max_length=64)
    utm_campaign: str | None = Field(default=None, max_length=64)


def optional_token(value: str | None) -> str | None:
    if value is None or value == "":
        return None

    return value if SAFE_TOKEN.fullmatch(value) else None


@app.post("/_analytics/event", status_code=204)
def collect(event: AnalyticsEvent):
    if event.event_type not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="unsupported_event")

    if not event.path.startswith("/"):
        raise HTTPException(status_code=400, detail="invalid_path")

    referrer = event.referrer_host
    if referrer:
        referrer = referrer.lower().strip(".")[:255]

    with closing(connect()) as db:
        db.execute(
            """
            INSERT INTO events (
                created_at,
                event_type,
                path,
                referrer_host,
                utm_source,
                utm_medium,
                utm_campaign
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(time.time()),
                event.event_type,
                event.path,
                referrer,
                optional_token(event.utm_source),
                optional_token(event.utm_medium),
                optional_token(event.utm_campaign),
            ),
        )
        db.commit()

    return Response(status_code=204)


@app.get("/summary")
def summary():
    now = int(time.time())
    five_minutes = now - 300
    thirty_minutes = now - 1800

    local = time.localtime(now)
    today_start = int(
        time.mktime(
            (
                local.tm_year,
                local.tm_mon,
                local.tm_mday,
                0, 0, 0,
                local.tm_wday,
                local.tm_yday,
                local.tm_isdst,
            )
        )
    )

    with closing(connect()) as db:
        def scalar(query, params=()):
            return db.execute(query, params).fetchone()[0]

        result = {
            "events_5m": scalar(
                "SELECT COUNT(*) FROM events WHERE created_at >= ?",
                (five_minutes,),
            ),
            "events_30m": scalar(
                "SELECT COUNT(*) FROM events WHERE created_at >= ?",
                (thirty_minutes,),
            ),
            "page_views_today": scalar(
                """
                SELECT COUNT(*) FROM events
                WHERE created_at >= ? AND event_type = 'page_view'
                """,
                (today_start,),
            ),
            "linkedin_today": scalar(
                """
                SELECT COUNT(*) FROM events
                WHERE created_at >= ?
                  AND event_type = 'page_view'
                  AND (
                    utm_source = 'linkedin'
                    OR referrer_host = 'linkedin.com'
                    OR referrer_host = 'www.linkedin.com'
                  )
                """,
                (today_start,),
            ),
            "contact_clicks_today": scalar(
                """
                SELECT COUNT(*) FROM events
                WHERE created_at >= ? AND event_type = 'contact_click'
                """,
                (today_start,),
            ),
        }

        campaigns = db.execute(
            """
            SELECT utm_campaign AS campaign, COUNT(*) AS events
            FROM events
            WHERE created_at >= ?
              AND utm_campaign IS NOT NULL
            GROUP BY utm_campaign
            ORDER BY events DESC
            LIMIT 10
            """,
            (today_start,),
        ).fetchall()

        result["campaigns"] = [dict(row) for row in campaigns]

    return result


@app.get("/", response_class=HTMLResponse)
def dashboard():
    return """
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ProgressKit Analytics</title>
<style>
body{margin:0;background:#080b10;color:#e9eef5;font-family:system-ui,sans-serif}
main{max-width:960px;margin:auto;padding:28px}
h1{font-size:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.card{background:#111720;border:1px solid #25303d;border-radius:14px;padding:18px}
.value{font-size:34px;font-weight:700;margin-top:8px}
small{color:#8fa0b3}
pre{white-space:pre-wrap}
</style>
</head>
<body>
<main>
<h1>ProgressKit Analytics</h1>
<div class="grid">
<div class="card"><small>Aktywność / 5 min</small><div id="m5" class="value">—</div></div>
<div class="card"><small>Aktywność / 30 min</small><div id="m30" class="value">—</div></div>
<div class="card"><small>Page views / dziś</small><div id="today" class="value">—</div></div>
<div class="card"><small>LinkedIn / dziś</small><div id="linkedin" class="value">—</div></div>
<div class="card"><small>Kontakt / dziś</small><div id="contact" class="value">—</div></div>
</div>

<h2>Kampanie dzisiaj</h2>
<pre id="campaigns">—</pre>
</main>

<script>
async function refresh() {
  const r = await fetch('./summary', {cache:'no-store'});
  const d = await r.json();

  m5.textContent = d.events_5m;
  m30.textContent = d.events_30m;
  today.textContent = d.page_views_today;
  linkedin.textContent = d.linkedin_today;
  contact.textContent = d.contact_clicks_today;
  campaigns.textContent =
    d.campaigns.length
      ? d.campaigns.map(x => `${x.campaign}: ${x.events}`).join('\\n')
      : 'Brak danych';
}

refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>
"""


@app.get("/health")
def health():
    return {"status": "ok"}
