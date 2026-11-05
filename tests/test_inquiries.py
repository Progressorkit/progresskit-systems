"""Real HTTP/SQLite tests; SMTP is an injected local transport, never live email."""
import concurrent.futures
from contextlib import closing
import hashlib
import importlib
import json
import os
from pathlib import Path
import smtplib
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import uuid

workspace = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(workspace / 'analytics'))
fixture = tempfile.TemporaryDirectory()
os.environ.setdefault('PK_PRODUCT_DB', str(Path(fixture.name) / 'product.db'))
os.environ['PK_INQUIRIES_DB'] = str(Path(fixture.name) / 'inquiries.db')
os.environ['PK_INQUIRIES_HMAC_SECRET'] = 'hmac-fixture-' + 'a' * 48
os.environ['PK_INQUIRIES_READ_TOKEN'] = 'read-fixture-' + 'b' * 48
from fastapi import FastAPI
from fastapi.testclient import TestClient
import inquiries
import inquiry_worker
importlib.reload(inquiries)
app = FastAPI()
app.include_router(inquiries.router)
client = TestClient(app)


class InquiryTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            'PK_INQUIRIES_HMAC_SECRET': 'hmac-fixture-' + 'a' * 48,
            'PK_INQUIRIES_READ_TOKEN': 'read-fixture-' + 'b' * 48,
            'PK_INQUIRIES_RETENTION_DAYS': '180',
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        with closing(inquiries.connect()) as db:
            for table in ('inquiry_outbox', 'project_inquiries', 'inquiry_tokens', 'inquiry_limits'):
                db.execute('DELETE FROM ' + table)
            db.commit()
        self.headers = {'Origin': inquiries.ORIGIN, 'X-PK-Form': 'project-inquiry',
                        'Sec-Fetch-Site': 'same-origin'}

    def token(self, aged=True):
        result = client.get('/api/project-inquiries/token', headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        token = result.json()['token']
        if aged:
            with closing(inquiries.connect()) as db:
                db.execute('UPDATE inquiry_tokens SET created_at=created_at-4 WHERE token_hash=?',
                           (hashlib.sha256(token.encode()).hexdigest(),))
                db.commit()
        return token

    def payload(self, **changes):
        return {'token': self.token(), 'submission_key': str(uuid.uuid4()),
                'contact_name': 'Przykładowa Firma', 'email': 'test@example.com',
                'client_type': 'company', 'phone': '', 'website': '',
                'answers': {'problem': 'Potrzebujemy systemu obsługi projektów.', 'users': 'Zespół biurowy',
                            'processes': 'Obsługa zleceń', 'integrations': '', 'budget': '', 'deadline': ''}} | changes

    def post(self, payload, **changes):
        return client.post('/api/project-inquiries', json=payload, headers=self.headers | changes)

    def scalar(self, query, params=()):
        with closing(inquiries.connect()) as db:
            return db.execute(query, params).fetchone()[0]

    def read_headers(self):
        return {'Authorization': 'Bearer ' + os.environ['PK_INQUIRIES_READ_TOKEN']}

    def test_commit_receipt_and_atomic_outbox_survive_fresh_connection(self):
        payload = self.payload()
        result = self.post(payload)
        self.assertEqual(result.status_code, 201, result.text)
        receipt = result.json()
        self.assertEqual(set(receipt), {'id', 'created_at', 'status', 'message'})
        self.assertEqual(receipt['message'], 'Zgłoszenie przyjęte')
        self.assertEqual(str(uuid.UUID(receipt['id'])), receipt['id'])
        self.assertTrue(receipt['created_at'].endswith('Z'))
        self.assertEqual(receipt['status'], 'new')
        self.assertIn('no-store', result.headers['cache-control'])
        with closing(inquiries.connect()) as db:
            row = db.execute('SELECT * FROM project_inquiries').fetchone()
            queue = db.execute('SELECT * FROM inquiry_outbox').fetchone()
            self.assertEqual(row['id'], receipt['id'])
            self.assertEqual(row['email'], payload['email'])
            self.assertEqual(json.loads(row['answers_json']), payload['answers'])
            self.assertEqual(row['description'], payload['answers']['problem'])
            self.assertEqual(row['expires_at'] - row['created_at'], 180 * 86400)
            self.assertEqual(queue['inquiry_id'], row['id'])
            self.assertEqual(queue['state'], 'pending')
            self.assertEqual(queue['attempts'], 0)
            self.assertEqual(db.execute('PRAGMA synchronous').fetchone()[0], 2)
        self.assertEqual(inquiries.DB_PATH.stat().st_mode & 0o077, 0)

    def test_idempotent_lost_response_retry_even_after_token_cleanup(self):
        data = self.payload()
        first = self.post(data)
        with closing(inquiries.connect()) as db:
            db.execute('DELETE FROM inquiry_tokens')
            db.commit()
        second = self.post(data)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 1)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM inquiry_outbox'), 1)

    def test_replay_token_and_payload_conflicts_do_not_expose_or_duplicate(self):
        data = self.payload()
        self.assertEqual(self.post(data).status_code, 201)
        self.assertEqual(self.post(data | {'submission_key': str(uuid.uuid4())}).status_code, 400)
        self.assertEqual(self.post(data | {'contact_name': 'Inna firma'}).status_code, 409)
        self.assertEqual(self.post(data | {'token': self.token()}).status_code, 409)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 1)

    def test_concurrent_duplicate_requests_commit_exactly_one_record_and_outbox(self):
        data = self.payload()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: self.post(data), range(16)))
        self.assertTrue(all(r.status_code == 201 for r in results), [r.status_code for r in results])
        self.assertEqual(len({r.json()['id'] for r in results}), 1)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 1)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM inquiry_outbox'), 1)

    def test_required_contact_fields_and_plain_text_are_validated(self):
        base = self.payload()
        invalid = [
            {'contact_name': ''}, {'contact_name': '  '}, {'contact_name': 'x'},
            {'contact_name': 'Name\nBcc: somebody'}, {'contact_name': '<img src=x onerror=alert(1)>'},
            {'phone': '123\r\nHeader: value'}, {'phone': '\u202eevil'},
            {'client_type': ''}, {'client_type': 'unknown'}, {'client_type': True},
            {'website': 'https://spam.example'}, {'surprise': 'field'}, {'submission_key': str(uuid.uuid1())},
            {'answers': base['answers'] | {'problem': '   '}},
            {'answers': base['answers'] | {'problem': 'a' * 6001}},
            {'answers': base['answers'] | {'users': '<script>alert(1)</script>'}},
            {'answers': base['answers'] | {'budget': False}},
            {'answers': {}},
        ]
        for changes in invalid:
            with self.subTest(changes=changes):
                result = self.post(base | changes)
                self.assertEqual(result.status_code, 422, result.text)
                self.assertNotIn('test@example.com', result.text)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_email_rejects_invalid_header_injection_and_accepts_valid_domain_case(self):
        data = self.payload()
        for email in ('', 'not-an-email', '@example.com', 'x@', 'x@localhost', 'x@ex..com',
                      '.x@example.com', 'x..y@example.com', 'x@-domain.com', 'x@example.123',
                      'x@example.com\r\nBcc: victim@example.com', 'x y@example.com', '<x@example.com>'):
            with self.subTest(email=email):
                self.assertEqual(self.post(data | {'email': email}).status_code, 422)
        self.assertEqual(self.post(data | {'email': 'User+project@EXAMPLE.COM'}).status_code, 201)
        self.assertEqual(self.scalar('SELECT email FROM project_inquiries'), 'User+project@example.com')

    def test_preserves_all_six_6000_character_answers_unicode_and_sql_quotes(self):
        data = self.payload()
        data['contact_name'] = "D'Angelo Sp. z o.o."
        data['answers'] = {key: "Żółć'" * 1200 for key in inquiries.ANSWER_KEYS}
        self.assertEqual(self.post(data).status_code, 201)
        with closing(inquiries.connect()) as db:
            stored = json.loads(db.execute('SELECT answers_json FROM project_inquiries').fetchone()[0])
        self.assertEqual(stored, data['answers'])

    def test_token_requires_browser_csrf_context_but_accepts_browser_get_without_origin(self):
        for headers in ({}, {'Origin': 'https://evil.example', 'X-PK-Form': 'project-inquiry'},
                        self.headers | {'Sec-Fetch-Site': 'cross-site'},
                        self.headers | {'Sec-Fetch-Mode': 'navigate'},
                        self.headers | {'Origin': 'https://evil.example'}):
            self.assertEqual(client.get('/api/project-inquiries/token', headers=headers).status_code, 403)
        result = client.get('/api/project-inquiries/token', headers={
            'X-PK-Form': 'project-inquiry', 'Sec-Fetch-Site': 'same-origin'})
        self.assertEqual(result.status_code, 200)
        with closing(inquiries.connect()) as db:
            value = db.execute('SELECT token_hash FROM inquiry_tokens').fetchone()[0]
        self.assertNotEqual(value, result.json()['token'])

    def test_post_csrf_content_type_size_and_malformed_json(self):
        data = self.payload()
        for headers in ({}, {'Origin': inquiries.ORIGIN}, self.headers | {'Origin': 'https://evil.example'},
                        self.headers | {'Sec-Fetch-Site': 'same-site'},
                        self.headers | {'Sec-Fetch-Mode': 'no-cors'}):
            self.assertEqual(client.post('/api/project-inquiries', json=data, headers=headers).status_code, 403)
        result = client.post('/api/project-inquiries', content='a=b', headers=self.headers | {'Content-Type': 'text/plain'})
        self.assertEqual(result.status_code, 415)
        result = client.post('/api/project-inquiries', content=b'x' * (inquiries.MAX_BODY_BYTES + 1),
                             headers=self.headers | {'Content-Type': 'application/json'})
        self.assertEqual(result.status_code, 413)
        for body in ('{', 'null', '[]', '{}'):
            self.assertEqual(client.post('/api/project-inquiries', content=body,
                             headers=self.headers | {'Content-Type': 'application/json'}).status_code, 422)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_token_minimum_time_expiry_unknown_and_honeypot(self):
        data = self.payload(token=self.token(aged=False))
        self.assertEqual(self.post(data).json()['detail']['code'], 'form_too_fast')
        with closing(inquiries.connect()) as db:
            db.execute('UPDATE inquiry_tokens SET expires_at=?', (int(time.time()) - 1,))
            db.commit()
        self.assertEqual(self.post(data).json()['detail']['code'], 'token_expired')
        self.assertEqual(self.post(data | {'token': 'a' * 43}).status_code, 400)
        self.assertEqual(self.post(self.payload(website='robot')).status_code, 422)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_ip_throttle_cannot_be_bypassed_with_forwarded_header(self):
        for index in range(7):
            result = self.post(self.payload(email=f'client{index}@example.com'),
                               **{'X-Forwarded-For': f'192.0.2.{index}', 'X-Real-IP': f'198.51.100.{index}'})
            self.assertEqual(result.status_code, 201 if index < 6 else 429)
        with closing(inquiries.connect()) as db:
            scopes = [r[0] for r in db.execute('SELECT scope FROM inquiry_limits')]
        self.assertFalse(any('192.0.2' in value or '198.51.100' in value or 'testclient' in value for value in scopes))
        self.assertEqual(len({value.split(':')[1] for value in scopes if value.startswith('submit-ip:')}), 1)

    def test_email_throttle_and_rate_limits_survive_reinitialization(self):
        for index in range(4):
            result = self.post(self.payload())
            self.assertEqual(result.status_code, 201 if index < 3 else 429)
        inquiries.initialize()
        self.assertEqual(self.post(self.payload()).status_code, 429)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 3)

    def test_token_issuance_and_rejected_attempts_are_bounded(self):
        for _ in range(20):
            self.token(aged=False)
        self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 429)
        for index in range(31):
            result = self.post({})
            self.assertEqual(result.status_code, 422 if index < 30 else 429)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_outbox_failure_rolls_back_record_and_token_consumption(self):
        data = self.payload()
        with closing(inquiries.connect()) as db:
            db.execute("CREATE TRIGGER reject_outbox BEFORE INSERT ON inquiry_outbox BEGIN SELECT RAISE(ABORT,'fixture'); END")
            db.commit()
        try:
            result = self.post(data)
            self.assertEqual(result.status_code, 503)
            self.assertNotIn('Zgłoszenie przyjęte', result.text)
            self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)
            self.assertIsNone(self.scalar('SELECT used_at FROM inquiry_tokens'))
        finally:
            with closing(inquiries.connect()) as db:
                db.execute('DROP TRIGGER reject_outbox')
                db.commit()
        self.assertEqual(self.post(data).status_code, 201)

    def test_commit_failure_rolls_back_and_retry_recovers_same_submission(self):
        data = self.payload()
        original = inquiries.connect
        count = 0
        class CommitFailure:
            def __init__(self, db): self.db = db
            def __getattr__(self, name): return getattr(self.db, name)
            def commit(self): raise sqlite3.OperationalError('synthetic fsync failure')
            def close(self): self.db.close()
        def failing_connection():
            nonlocal count
            count += 1
            db = original()
            return CommitFailure(db) if count == 2 else db
        with patch.object(inquiries, 'connect', side_effect=failing_connection):
            result = self.post(data)
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('Zgłoszenie przyjęte', result.text)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM inquiry_outbox'), 0)
        self.assertIsNone(self.scalar('SELECT used_at FROM inquiry_tokens'))
        self.assertEqual(self.post(data).status_code, 201)

    def test_concurrent_workers_claim_only_one_delivery_and_stale_lease_cannot_ack(self):
        self.post(self.payload())
        now = int(time.time())
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            rows = list(pool.map(lambda _: inquiry_worker.claim(now), range(12)))
        claimed = [row for row in rows if row]
        self.assertEqual(len(claimed), 1)
        self.assertEqual(self.scalar('SELECT attempts FROM inquiry_outbox'), 1)
        old = claimed[0]
        current = inquiry_worker.claim(now + inquiry_worker.LEASE_SECONDS)
        with closing(inquiries.connect()) as db:
            changed = db.execute("UPDATE inquiry_outbox SET state='sent' WHERE id=? AND lease_id=?",
                                 (old['outbox_id'], old['lease_id'])).rowcount
            db.commit()
        self.assertEqual(changed, 0)
        self.assertEqual(self.scalar('SELECT lease_id FROM inquiry_outbox'), current['lease_id'])

    def test_storage_failure_has_no_false_acceptance_or_sensitive_error(self):
        data = self.payload()
        with patch.object(inquiries, 'connect', side_effect=sqlite3.OperationalError('sensitive/path/fixture.db')):
            result = self.post(data)
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('sensitive', result.text)
        self.assertNotIn('Zgłoszenie przyjęte', result.text)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_no_mailto_redirect_or_smtp_in_acceptance_path(self):
        with patch.object(inquiry_worker, 'smtp_send', side_effect=AssertionError('SMTP must not run')):
            result = self.post(self.payload())
        self.assertEqual(result.status_code, 201)
        self.assertNotIn('location', result.headers)
        self.assertNotIn('mailto:', result.text)

    def test_permissions_fail_closed_without_chmod_or_smtp_then_recover(self):
        data = self.payload()
        main = inquiries.DB_PATH
        before = main.stat().st_mode
        main.chmod(0o644)
        try:
            self.assertFalse(inquiries.storage_is_private())
            self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
            result = self.post(data)
            self.assertEqual(result.status_code, 503)
            self.assertNotIn(str(main), result.text)
            self.assertEqual(client.get('/internal/project-inquiries', headers=self.read_headers()).status_code, 404)
            with self.assertRaises(sqlite3.OperationalError):
                inquiry_worker.run_once(lambda _: self.fail('Unsafe storage must not send SMTP'))
            self.assertEqual(main.stat().st_mode & 0o777, 0o644)
        finally:
            main.chmod(before & 0o777)
        self.assertTrue(inquiries.storage_is_private())
        self.assertEqual(self.post(data).status_code, 201)

    def test_unsafe_shared_storage_does_not_disable_existing_service_routes(self):
        database = Path(fixture.name) / 'unsafe-shared-product.db'
        with closing(sqlite3.connect(database)) as db:
            db.execute('CREATE TABLE fixture(id INTEGER)')
            db.commit()
        database.chmod(0o644)
        environment = dict(os.environ, PK_PRODUCT_DB=str(database), PK_INQUIRIES_DB=str(database),
                           PK_ANALYTICS_DB=str(Path(fixture.name) / 'isolated-analytics.db'))
        code = """
import json
from fastapi.testclient import TestClient
import app
client=TestClient(app.app)
headers={'Origin':'https://progresskit.pl','X-PK-Form':'project-inquiry'}
print(json.dumps({
  'health':client.get('/health').status_code,
  'product':client.get('/api/glikemia/downloads').status_code,
  'analytics':client.post('/_analytics/event',json={'event_type':'page_view','path':'/'}).status_code,
  'inquiry':client.get('/api/project-inquiries/token',headers=headers).status_code,
}))
"""
        run = subprocess.run([sys.executable, '-c', code], cwd=workspace / 'analytics',
                             env=environment, text=True, capture_output=True, timeout=30, check=True)
        self.assertEqual(json.loads(run.stdout), {'health': 200, 'product': 200, 'analytics': 204, 'inquiry': 503})
        self.assertEqual(database.stat().st_mode & 0o777, 0o644)

    def test_sidecar_permissions_and_symlinks_are_refused(self):
        self.token()
        with closing(inquiries.connect()) as db:
            db.execute('INSERT INTO inquiry_limits VALUES (?,?,?,?)', ('sidecar-fixture', 1, 1, int(time.time()) + 60))
            db.commit()
            for suffix in ('-wal', '-shm'):
                sidecar = Path(str(inquiries.DB_PATH) + suffix)
                self.assertTrue(sidecar.exists())
                original = sidecar.stat().st_mode & 0o777
                sidecar.chmod(0o644)
                try:
                    self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
                    self.assertEqual(client.get('/internal/project-inquiries', headers=self.read_headers()).status_code, 404)
                    self.assertEqual(sidecar.stat().st_mode & 0o777, 0o644)
                finally:
                    sidecar.chmod(original)
        link = Path(fixture.name) / 'inquiries-link.db'
        link.symlink_to(inquiries.DB_PATH)
        try:
            with patch.object(inquiries, 'DB_PATH', link):
                inquiries.initialize()  # Does not follow/repair a DB symlink or break app import.
                self.assertFalse(inquiries.storage_is_private())
                self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
                self.assertEqual(client.get('/internal/project-inquiries', headers=self.read_headers()).status_code, 404)
                with self.assertRaises(sqlite3.OperationalError):
                    inquiry_worker.run_once(lambda _: self.fail('Symlink DB must not send SMTP'))
        finally:
            link.unlink()
        self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 200)

    def test_fail_closed_configuration_only_affects_inquiry_api(self):
        with patch.dict(os.environ, {'PK_INQUIRIES_HMAC_SECRET': ''}):
            self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
        with patch.object(inquiries, 'ORIGIN', 'http://progresskit.pl'):
            self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
        with patch.dict(os.environ, {'PK_INQUIRIES_RETENTION_DAYS': '181'}):
            self.assertEqual(self.post(self.payload()).status_code, 503)
        with patch.dict(os.environ, {'PK_INQUIRIES_HMAC_SECRET_FILE': '/not-existing-fixture-secret'}):
            self.assertEqual(client.get('/api/project-inquiries/token', headers=self.headers).status_code, 503)
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 0)

    def test_private_read_is_fail_closed_before_db_and_public_routes_cannot_read(self):
        identifier = self.post(self.payload()).json()['id']
        for path in ('/internal/project-inquiries', '/internal/project-inquiries/' + identifier):
            with patch.object(inquiries, 'connect', side_effect=AssertionError('Unauthorized must not query')):
                for headers in ({}, {'Authorization': 'Bearer wrong'}, {'Authorization': 'Basic fixture'}):
                    self.assertEqual(client.get(path, headers=headers).status_code, 404)
            with patch.dict(os.environ, {'PK_INQUIRIES_READ_TOKEN': ''}):
                self.assertEqual(client.get(path, headers=self.read_headers()).status_code, 404)
            with patch.dict(os.environ, {'PK_INQUIRIES_READ_TOKEN': os.environ['PK_INQUIRIES_HMAC_SECRET']}):
                self.assertEqual(client.get(path, headers=self.read_headers()).status_code, 404)
        for path in ('/api/project-inquiries', '/api/project-inquiries/' + identifier,
                     '/api/project-inquiries/status/' + identifier):
            self.assertIn(client.get(path).status_code, (404, 405))

    def test_private_read_pagination_detail_no_tokens_and_no_cache(self):
        ids = []
        for index in range(3):
            ids.append(self.post(self.payload(email=f'client{index}@example.com')).json()['id'])
        first = client.get('/internal/project-inquiries?limit=2', headers=self.read_headers())
        self.assertEqual(first.status_code, 200)
        self.assertIn('no-store', first.headers['cache-control'])
        self.assertEqual(len(first.json()['inquiries']), 2)
        second = client.get('/internal/project-inquiries', params=first.json()['next'] | {'limit': 2},
                            headers=self.read_headers())
        self.assertEqual(len(second.json()['inquiries']), 1)
        self.assertIsNone(second.json()['next'])
        collected = first.json()['inquiries'] + second.json()['inquiries']
        self.assertEqual({row['id'] for row in collected}, set(ids))
        for row in collected:
            self.assertNotIn('submission_key', row)
            self.assertNotIn('receipt_token_hash', row)
        detail = client.get('/internal/project-inquiries/' + ids[0], headers=self.read_headers())
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(set(detail.json()['answers']), set(inquiries.ANSWER_KEYS))
        for query in ('limit=0', 'limit=101', 'limit=x', 'before_at=-1', 'before_at=999999999999999999999999', 'before_id=bad'):
            self.assertEqual(client.get('/internal/project-inquiries?' + query, headers=self.read_headers()).status_code, 400)
        self.assertEqual(client.get('/internal/project-inquiries/not-a-uuid', headers=self.read_headers()).status_code, 404)

    def test_smtp_failure_retry_and_process_restart_never_lose_inquiry(self):
        identifier = self.post(self.payload()).json()['id']
        now = int(time.time())
        captured = []
        def failure(message):
            captured.append(message)
            raise smtplib.SMTPServerDisconnected('synthetic secret failure detail')
        self.assertEqual(inquiry_worker.run_once(failure, now=now), 'retry')
        self.assertEqual(self.scalar('SELECT COUNT(*) FROM project_inquiries'), 1)
        self.assertEqual(self.scalar('SELECT state FROM inquiry_outbox'), 'pending')
        self.assertEqual(self.scalar('SELECT attempts FROM inquiry_outbox'), 1)
        self.assertEqual(self.scalar('SELECT last_error_code FROM inquiry_outbox'), 'smtp_unavailable')
        self.assertEqual(inquiry_worker.run_once(lambda m: captured.append(m), now=now + 29), 'idle')
        importlib.reload(inquiry_worker)
        self.assertEqual(inquiry_worker.run_once(lambda m: captured.append(m), now=now + 31), 'sent')
        self.assertEqual(self.scalar('SELECT state FROM inquiry_outbox'), 'sent')
        self.assertEqual(self.scalar('SELECT attempts FROM inquiry_outbox'), 2)
        self.assertEqual(captured[0]['Message-ID'], captured[1]['Message-ID'])
        self.assertEqual(captured[0]['To'], 'pawel@progresskit.pl')
        message = str(captured[0])
        self.assertIn(identifier, message)
        for sensitive in ('test@example.com', 'Przykładowa Firma', 'Potrzebujemy', 'synthetic secret'):
            self.assertNotIn(sensitive, message)

    def test_worker_leases_are_exclusive_recover_after_crash_and_retries_bounded(self):
        self.post(self.payload())
        now = int(time.time())
        first = inquiry_worker.claim(now)
        self.assertIsNotNone(first)
        self.assertIsNone(inquiry_worker.claim(now + 1))
        replacement = inquiry_worker.claim(now + inquiry_worker.LEASE_SECONDS)
        self.assertIsNotNone(replacement)
        self.assertNotEqual(first['lease_id'], replacement['lease_id'])
        with closing(inquiries.connect()) as db:
            db.execute("UPDATE inquiry_outbox SET state='pending',attempts=100,next_attempt_at=?", (now,))
            db.commit()
        self.assertEqual(inquiry_worker.run_once(lambda _: (_ for _ in ()).throw(OSError('fixture')), now=now), 'retry')
        self.assertEqual(self.scalar('SELECT next_attempt_at FROM inquiry_outbox'), now + inquiry_worker.MAX_RETRY_SECONDS)

    def test_retention_cascades_pending_and_sent_outbox_and_expired_private_read(self):
        identifier = self.post(self.payload()).json()['id']
        self.assertEqual(inquiry_worker.run_once(lambda _: None), 'sent')
        now = int(time.time())
        with closing(inquiries.connect()) as db:
            db.execute('UPDATE project_inquiries SET expires_at=?', (now,))
            db.execute('UPDATE inquiry_tokens SET expires_at=?', (now,))
            db.execute('UPDATE inquiry_limits SET expires_at=?', (now,))
            db.commit()
        self.assertEqual(client.get('/internal/project-inquiries/' + identifier, headers=self.read_headers()).status_code, 404)
        self.assertEqual(inquiry_worker.purge_expired(now), 1)
        for table in ('project_inquiries', 'inquiry_outbox', 'inquiry_tokens', 'inquiry_limits'):
            self.assertEqual(self.scalar('SELECT COUNT(*) FROM ' + table), 0)
        self.assertEqual(inquiry_worker.run_once(lambda _: self.fail('Expired notification sent'), now=now), 'idle')

    def test_smtp_transport_requires_verified_tls_and_fixed_recipient(self):
        self.post(self.payload())
        row = inquiry_worker.claim(int(time.time()))
        message = inquiry_worker.smtp_message(row)
        with patch.dict(os.environ, {'PK_INQUIRIES_SMTP_HOST': 'smtp.fixture', 'PK_INQUIRIES_SMTP_MODE': 'starttls',
                                     'PK_INQUIRIES_SMTP_USERNAME': '', 'PK_INQUIRIES_SMTP_PASSWORD': ''}):
            with patch.object(inquiry_worker.smtplib, 'SMTP') as transport:
                smtp = transport.return_value.__enter__.return_value
                smtp.send_message.return_value = {}
                inquiry_worker.smtp_send(message)
                context = smtp.starttls.call_args.kwargs['context']
                self.assertTrue(context.check_hostname)
                self.assertEqual(context.verify_mode, inquiry_worker.ssl.CERT_REQUIRED)
                self.assertEqual(smtp.send_message.call_args.kwargs['to_addrs'], ['pawel@progresskit.pl'])
            with patch.object(inquiry_worker.smtplib, 'SMTP') as transport:
                transport.return_value.__enter__.return_value.starttls.side_effect = smtplib.SMTPNotSupportedError('no TLS')
                with self.assertRaises(smtplib.SMTPNotSupportedError):
                    inquiry_worker.smtp_send(message)
                transport.return_value.__enter__.return_value.send_message.assert_not_called()
        with patch.dict(os.environ, {'PK_INQUIRIES_SMTP_HOST': 'smtp.fixture', 'PK_INQUIRIES_SMTP_MODE': 'plain'}):
            with self.assertRaises(inquiry_worker.SMTPConfigurationError):
                inquiry_worker.smtp_send(message)


if __name__ == '__main__':
    unittest.main()
