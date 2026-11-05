"""Durable inquiry notification outbox; never part of the acceptance request.

At-least-once delivery: SMTP can accept a message before a worker crashes. A stable
Message-ID aids deduplication; it cannot guarantee exactly-once SMTP delivery.
"""
from __future__ import annotations

import argparse
from contextlib import closing
from email.message import EmailMessage
import os
from pathlib import Path
import smtplib
import socket
import sqlite3
import ssl
import time
import uuid

import inquiries

RECIPIENT = 'pawel@progresskit.pl'
LEASE_SECONDS = 120
MAX_RETRY_SECONDS = 21600


class SMTPConfigurationError(Exception):
    """Deliberately carries no environment values or credentials."""


def smtp_message(row):
    sender = os.environ.get('PK_INQUIRIES_SMTP_FROM', 'notifications@progresskit.pl')
    try:
        sender = inquiries.email_address(sender)
    except ValueError:
        raise SMTPConfigurationError() from None
    message = EmailMessage()
    message['From'] = sender
    message['To'] = RECIPIENT
    message['Subject'] = 'ProgressKit: nowe zgłoszenie projektu'
    message['Date'] = inquiries.datetime.fromtimestamp(row['created_at'], inquiries.timezone.utc)
    message['Message-ID'] = f'<project-inquiry.{row["id"]}@progresskit.pl>'
    # Contact information and brief remain exclusively in the retained database.
    # The notification does not create an indefinite second PII archive in email.
    message.set_content('\n'.join((
        'Zapisano nowe zgłoszenie projektu w prywatnej bazie ProgressKit.',
        f'Identyfikator: {row["id"]}',
        f'Data UTC: {inquiries.iso_date(row["created_at"])}',
        f'Typ klienta: {row["client_type"]}',
        'Status: new',
        'Dane kontaktowe i opis są dostępne wyłącznie w prywatnym odczycie zgłoszeń.',
    )))
    return message


def smtp_send(message):
    host = os.environ.get('PK_INQUIRIES_SMTP_HOST', '')
    mode = os.environ.get('PK_INQUIRIES_SMTP_MODE', 'starttls')
    try:
        port = int(os.environ.get('PK_INQUIRIES_SMTP_PORT', '465' if mode == 'ssl' else '587'))
    except ValueError:
        raise SMTPConfigurationError() from None
    if not host or mode not in ('ssl', 'starttls') or not 1 <= port <= 65535:
        raise SMTPConfigurationError()
    username = os.environ.get('PK_INQUIRIES_SMTP_USERNAME', '')
    password_path = os.environ.get('PK_INQUIRIES_SMTP_PASSWORD_FILE')
    try:
        password = (Path(password_path).read_text(encoding='utf-8').rstrip('\r\n')
                    if password_path else os.environ.get('PK_INQUIRIES_SMTP_PASSWORD', ''))
    except (OSError, UnicodeError):
        raise SMTPConfigurationError() from None
    if bool(username) != bool(password):
        raise SMTPConfigurationError()
    context = ssl.create_default_context()  # CA and hostname verification are mandatory.
    factory = smtplib.SMTP_SSL if mode == 'ssl' else smtplib.SMTP
    options = {'host': host, 'port': port, 'timeout': 20}
    if mode == 'ssl':
        options['context'] = context
    with factory(**options) as smtp:
        smtp.ehlo()
        if mode == 'starttls':
            smtp.starttls(context=context)  # No fallback to plaintext if unavailable.
            smtp.ehlo()
        if username:
            smtp.login(username, password)
        refused = smtp.send_message(message, from_addr=message['From'], to_addrs=[RECIPIENT])
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)


def purge_expired(now=None):
    """Run at least daily in the deployed worker and immediately at worker startup."""
    now = int(time.time()) if now is None else int(now)
    with closing(inquiries.connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        count = db.execute('DELETE FROM project_inquiries WHERE expires_at<=?', (now,)).rowcount
        # ON DELETE CASCADE also removes pending/sending/sent notification metadata.
        db.execute('DELETE FROM inquiry_tokens WHERE expires_at<=?', (now,))
        db.execute('DELETE FROM inquiry_limits WHERE expires_at<=?', (now,))
        db.commit()
        # secure_delete overwrites freed database cells; checkpoint also retires
        # historical WAL pages. Retry a busy checkpoint rather than silently
        # retaining old frames until a later maintenance cycle.
        checkpoint = db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
        if checkpoint[0]:
            raise sqlite3.OperationalError('retention checkpoint busy')
    return count


def claim(now):
    lease = str(uuid.uuid4())
    with closing(inquiries.connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('''SELECT o.id AS outbox_id,p.id,p.created_at,p.client_type,o.attempts
            FROM inquiry_outbox o JOIN project_inquiries p ON p.id=o.inquiry_id
            WHERE p.expires_at>? AND ((o.state='pending' AND o.next_attempt_at<=?)
              OR (o.state='sending' AND o.lease_until<=?))
            ORDER BY o.next_attempt_at,o.id LIMIT 1''', (now, now, now)).fetchone()
        if not row:
            db.commit()
            return None
        db.execute("UPDATE inquiry_outbox SET state='sending',attempts=attempts+1,lease_id=?,lease_until=? WHERE id=?",
                   (lease, now + LEASE_SECONDS, row['outbox_id']))
        db.commit()
    return dict(row, lease_id=lease, attempts=row['attempts'] + 1)


def run_once(sender=None, *, now=None):
    """Return idle/sent/retry. An injectable sender is only an in-process test seam."""
    current = int(time.time()) if now is None else int(now)
    row = claim(current)
    if row is None:
        return 'idle'
    error = None
    try:
        message = smtp_message(row)
        (sender or smtp_send)(message)
    except SMTPConfigurationError:
        error = 'smtp_configuration'
    except (smtplib.SMTPException, OSError, socket.timeout):
        error = 'smtp_unavailable'
    except Exception:
        # A programming/transport failure also leaves the durable item retryable;
        # never store or print exception text which may contain contact data/secrets.
        error = 'delivery_error'
    finished = int(time.time()) if now is None else current
    with closing(inquiries.connect()) as db:
        db.execute('BEGIN IMMEDIATE')
        if error:
            delay = min(MAX_RETRY_SECONDS, 30 * (2 ** min(row['attempts'] - 1, 10)))
            db.execute("UPDATE inquiry_outbox SET state='pending',next_attempt_at=?,lease_id=NULL,"
                       'lease_until=NULL,last_error_code=? WHERE id=? AND lease_id=?',
                       (finished + delay, error, row['outbox_id'], row['lease_id']))
        else:
            db.execute("UPDATE inquiry_outbox SET state='sent',sent_at=?,lease_id=NULL,lease_until=NULL,"
                       'last_error_code=NULL WHERE id=? AND lease_id=?',
                       (finished, row['outbox_id'], row['lease_id']))
        db.commit()
    return 'retry' if error else 'sent'


def main():
    parser = argparse.ArgumentParser(description='ProgressKit private inquiry notification worker')
    parser.add_argument('--once', action='store_true', help='Purge expired data and attempt one notification')
    parser.add_argument('--purge-only', action='store_true', help='Apply retention without sending notifications')
    args = parser.parse_args()
    try:
        removed = purge_expired()
        if args.purge_only:
            print(f'inquiry_retention_deleted={removed}')
            return 0
        if args.once:
            state = run_once()
            print(f'inquiry_notification={state};retention_deleted={removed}')
            return 0
        last_purge = time.monotonic()
        while True:
            try:
                state = run_once()
                if time.monotonic() - last_purge >= 86400:
                    purge_expired()
                    last_purge = time.monotonic()
                if state == 'idle':
                    time.sleep(5)
            except sqlite3.Error:
                print('inquiry_worker=storage_unavailable', flush=True)
                time.sleep(5)
    except sqlite3.Error:
        print('inquiry_worker=storage_unavailable', flush=True)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
