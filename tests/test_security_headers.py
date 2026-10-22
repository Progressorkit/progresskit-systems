"""Offline header, streaming and synthetic endpoint regression checks."""
import asyncio
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('site_security_headers', ROOT / 'analytics/security_headers.py')
SECURITY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SECURITY)


class SecurityHeadersUnitTests(unittest.TestCase):
    def test_policy_blocks_injection_framing_sensitive_devices_and_external_egress(self):
        policy = SECURITY.content_security_policy()
        for directive in ("default-src 'none'", "script-src 'self'", "script-src-attr 'none'",
                          "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'",
                          "base-uri 'none'", "form-action 'self'", "worker-src 'none'"):
            self.assertIn(directive, policy)
        for unsafe in ("'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:', 'blob:', 'data:'):
            self.assertNotIn(unsafe, policy)

    def test_only_the_exact_existing_svg_style_attribute_is_hash_authorized(self):
        digest = base64.b64encode(hashlib.sha256(b'display:none').digest()).decode('ascii')
        policy = SECURITY.content_security_policy()
        self.assertIn("style-src-attr 'unsafe-hashes' 'sha256-" + digest + "'", policy)
        self.assertNotIn('display:block', policy)

    def test_dashboard_hashes_are_exact_and_inert_json_does_not_authorize_scripts(self):
        markup = '<script>const value = "<data>";</script><style>body{color:red}</style>'
        policy = SECURITY.content_security_policy(markup)
        self.assertIn(SECURITY._hash_source('const value = "<data>";'), policy)
        self.assertIn(SECURITY._hash_source('body{color:red}'), policy)
        self.assertNotIn(SECURITY._hash_source('const value = "changed";'), policy)
        inert = '<script type="application/json">{"untrusted":"data"}</script>'
        self.assertEqual(SECURITY.content_security_policy(), SECURITY.content_security_policy(inert))

    def test_status_body_range_cache_and_scope_are_preserved_for_success_and_errors(self):
        for status in (200, 204, 206, 308, 403, 404, 405, 416, 422, 503):
            with self.subTest(status=status):
                sent = []
                scope = {'type': 'http', 'path': '/download/example', 'method': 'GET',
                         'extensions': {'http.response.pathsend': {}}}
                async def application(observed_scope, receive, send):
                    self.assertIs(scope, observed_scope)
                    await send({'type': 'http.response.start', 'status': status, 'headers': [
                        (b'content-range', b'bytes 0-2/20'), (b'cache-control', b'no-store'),
                        (b'content-length', b'3'), (b'X-Frame-Options', b'SAMEORIGIN')]})
                    await send({'type': 'http.response.body', 'body': b'fir', 'more_body': True})
                    await send({'type': 'http.response.body', 'body': b'st', 'more_body': False})
                async def receive():
                    raise AssertionError('Header middleware must not read requests.')
                async def send(message):
                    sent.append(message)
                asyncio.run(SECURITY.SecurityHeadersMiddleware(application)(scope, receive, send))
                self.assertEqual(status, sent[0]['status'])
                headers = dict(sent[0]['headers'])
                self.assertEqual(b'bytes 0-2/20', headers[b'content-range'])
                self.assertEqual(b'no-store', headers[b'cache-control'])
                self.assertEqual(b'3', headers[b'content-length'])
                self.assertEqual(b'DENY', headers[b'x-frame-options'])
                self.assertNotIn(b'X-Frame-Options', headers)
                self.assertEqual([b'fir', b'st'], [message['body'] for message in sent[1:]])
                self.assertEqual([True, False], [message['more_body'] for message in sent[1:]])

    def test_failed_send_propagates_instead_of_appearing_to_complete_a_download(self):
        async def application(scope, receive, send):
            await send({'type': 'http.response.body', 'body': b'synthetic'})
        async def receive():
            raise AssertionError('No request read expected.')
        async def send(message):
            raise OSError('synthetic disconnected receiver')
        with self.assertRaisesRegex(OSError, 'synthetic disconnected receiver'):
            asyncio.run(SECURITY.SecurityHeadersMiddleware(application)({'type': 'http', 'path': '/'}, receive, send))

    def test_private_dashboard_hashes_do_not_apply_to_other_paths(self):
        policies = {}
        async def application(scope, receive, send):
            await send({'type': 'http.response.start', 'status': 200, 'headers': []})
        async def receive():
            return {'type': 'http.disconnect'}
        async def run():
            middleware = SECURITY.SecurityHeadersMiddleware(application, {'/': '<script>dashboard()</script>'})
            for path in ('/', '/summary', '/api/glikemia/downloads'):
                async def send(message):
                    policies[path] = dict(message['headers'])[b'content-security-policy'].decode()
                await middleware({'type': 'http', 'path': path}, receive, send)
        asyncio.run(run())
        dashboard_hash = SECURITY._hash_source('dashboard()')
        self.assertIn(dashboard_hash, policies['/'])
        self.assertNotIn(dashboard_hash, policies['/summary'])
        self.assertNotIn(dashboard_hash, policies['/api/glikemia/downloads'])

    def test_non_http_lifespan_messages_are_unmodified(self):
        message = {'type': 'lifespan.startup.complete'}
        sent = []
        async def application(scope, receive, send):
            await send(message)
        async def receive():
            return {'type': 'lifespan.startup'}
        async def send(value):
            sent.append(value)
        asyncio.run(SECURITY.SecurityHeadersMiddleware(application)({'type': 'lifespan'}, receive, send))
        self.assertIs(message, sent[0])

    def test_collector_limit_rejects_chunked_and_forged_lengths_before_application_runs(self):
        variants = (
            ([], [b'x'*4096, b'y'*4096, b'z']),
            ([(b'content-length', b'1')], [b'x'*8193]),
            ([(b'content-length', b'0')], [b'x'*4096, b'y'*4097]),
            ([(b'content-length', b'9000')], []),
        )
        for headers, chunks in variants:
            with self.subTest(headers=headers, chunk_sizes=[len(c) for c in chunks]):
                sent = []
                remaining = list(chunks)
                async def application(scope, receive, send):
                    self.fail('Oversized analytics must not reach the JSON parser/application.')
                async def receive():
                    chunk = remaining.pop(0)
                    return {'type': 'http.request', 'body': chunk, 'more_body': bool(remaining)}
                async def send(message):
                    sent.append(message)
                asyncio.run(SECURITY.SecurityHeadersMiddleware(application)(
                    {'type': 'http', 'path': '/_analytics/event', 'method': 'POST', 'headers': headers}, receive, send))
                self.assertEqual(413, sent[0]['status'])
                self.assertEqual(b'DENY', dict(sent[0]['headers'])[b'x-frame-options'])
                self.assertNotIn(b'x'*100, sent[-1]['body'])

    def test_bounded_collector_body_is_replayed_exactly_without_changing_other_requests(self):
        observed = []
        chunks = [b'{"event_type":', b'"page_view","path":"/"}']
        remaining = list(chunks)
        async def application(scope, receive, send):
            observed.append(await receive())
            await send({'type': 'http.response.start', 'status': 204, 'headers': []})
            await send({'type': 'http.response.body', 'body': b''})
        async def receive():
            chunk = remaining.pop(0)
            return {'type': 'http.request', 'body': chunk, 'more_body': bool(remaining)}
        async def send(message):
            pass
        asyncio.run(SECURITY.SecurityHeadersMiddleware(application)(
            {'type': 'http', 'path': '/_analytics/event', 'method': 'POST', 'headers': []}, receive, send))
        self.assertEqual([{'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}], observed)
        self.assertEqual([], remaining)


DEPENDENCIES_AVAILABLE = all(importlib.util.find_spec(name) is not None for name in ('fastapi', 'httpx'))


@unittest.skipUnless(DEPENDENCIES_AVAILABLE, 'BLOCKED: FastAPI/httpx test dependencies are unavailable.')
class SecurityHeadersIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Separate process avoids sharing product.DB_PATH/module state with other suites.
        script = r'''
import json,os,pathlib,sys
from fastapi.testclient import TestClient
sys.path.insert(0,str(pathlib.Path.cwd()/'analytics'))
import product,preview,app
client=TestClient(preview.app)
rows={}
for path in ('/','/projekty/progresskit-tax/','/glikemia-premium/','/catalog/projects.json','/summary','/.git/config','/api/glikemia/downloads'):
    r=client.get(path);rows[path]={'status':r.status_code,'headers':dict(r.headers)}
before=client.get('/api/glikemia/downloads').json()['downloads']
partial=client.get('/download/glikemia-premium',headers={'Range':'bytes=0-31'})
head=client.head('/download/glikemia-premium')
prefetch=client.get('/download/glikemia-premium',headers={'Sec-Purpose':'prefetch'})
missing=pathlib.Path(os.environ['PK_PRODUCT_DB']).parent/'missing.apk'
product.APK_PATH=missing
unavailable=client.get('/download/glikemia-premium')
after_non_download=client.get('/api/glikemia/downloads').json()['downloads']
synthetic=missing.with_name('synthetic.apk');synthetic.write_bytes(b'synthetic transfer fixture')
product.APK_PATH=synthetic
full=client.get('/download/glikemia-premium')
after_full=client.get('/api/glikemia/downloads').json()['downloads']
backend=TestClient(app.app)
dashboard=backend.get('/')
summary=backend.get('/summary')
with app.connect() as db:events_before=db.execute('SELECT count(*) FROM events').fetchone()[0]
oversized=json.dumps({'event_type':'page_view','path':'/synthetic','padding':'x'*9000}).encode()
oversized_statuses=[backend.post('/_analytics/event',content=oversized,headers=headers).status_code
 for headers in ({'Content-Type':'application/json'},
                 {'Content-Type':'application/json','Content-Length':'1'},
                 {'Content-Type':'application/json','Content-Length':'0'})]
with app.connect() as db:events_after_rejected=db.execute('SELECT count(*) FROM events').fetchone()[0]
small=backend.post('/_analytics/event',json={'event_type':'page_view','path':'/synthetic'})
with app.connect() as db:events_after_small=db.execute('SELECT count(*) FROM events').fetchone()[0]
print(json.dumps({'routes':rows,'rangeStatus':partial.status_code,'rangeBytes':len(partial.content),
 'rangeHeaders':dict(partial.headers),'headStatus':head.status_code,'prefetchStatus':prefetch.status_code,
 'unavailableStatus':unavailable.status_code,'unavailableHeaders':dict(unavailable.headers),
 'counterBefore':before,'counterAfterNonDownloads':after_non_download,'counterAfterFull':after_full,
 'fullStatus':full.status_code,'fullBytesMatch':full.content==b'synthetic transfer fixture',
 'fullHeaders':dict(full.headers),'dashboardStatus':dashboard.status_code,
 'dashboardCsp':dashboard.headers['content-security-policy'],'summaryCsp':summary.headers['content-security-policy'],
 'oversizedStatuses':oversized_statuses,'eventsBefore':events_before,'eventsAfterRejected':events_after_rejected,
 'smallEventStatus':small.status_code,'eventsAfterSmall':events_after_small}))
'''
        with tempfile.TemporaryDirectory(prefix='progresskit-security-headers-') as temporary:
            env = dict(os.environ, PK_PRODUCT_DB=str(Path(temporary)/'product.db'),
                       PK_ANALYTICS_DB=str(Path(temporary)/'events.db'), PYTHONDONTWRITEBYTECODE='1')
            completed = subprocess.run([sys.executable, '-c', script], cwd=ROOT, env=env,
                                       check=True, capture_output=True, text=True, timeout=90)
        cls.result = json.loads(completed.stdout)

    def test_public_routes_and_private_denials_have_security_headers(self):
        for path, result in self.result['routes'].items():
            with self.subTest(path=path):
                expected = 404 if path in ('/catalog/projects.json', '/summary', '/.git/config') else 200
                self.assertEqual(expected, result['status'])
                self.assertEqual('nosniff', result['headers']['x-content-type-options'])
                self.assertEqual('DENY', result['headers']['x-frame-options'])
                self.assertEqual('no-referrer', result['headers']['referrer-policy'])
                self.assertIn('microphone=()', result['headers']['permissions-policy'])
                self.assertNotIn("'unsafe-inline'", result['headers']['content-security-policy'])

    def test_range_head_prefetch_missing_and_full_download_retain_counter_semantics(self):
        r = self.result
        self.assertEqual((206, 32, 405, 204, 503),
                         (r['rangeStatus'], r['rangeBytes'], r['headStatus'], r['prefetchStatus'], r['unavailableStatus']))
        self.assertEqual(r['counterBefore'], r['counterAfterNonDownloads'])
        self.assertEqual(r['counterBefore']+1, r['counterAfterFull'])
        self.assertEqual(200, r['fullStatus'])
        self.assertTrue(r['fullBytesMatch'])
        self.assertEqual('no-store', r['fullHeaders']['cache-control'])
        self.assertIn('attachment;', r['fullHeaders']['content-disposition'])
        for headers in (r['fullHeaders'], r['rangeHeaders'], r['unavailableHeaders']):
            self.assertEqual('DENY', headers['x-frame-options'])

    def test_existing_private_dashboard_is_hash_enabled_without_weakening_api_policy(self):
        self.assertEqual(200, self.result['dashboardStatus'])
        dashboard = self.result['dashboardCsp']
        api = self.result['summaryCsp']
        self.assertIn("script-src 'self' 'sha256-", dashboard)
        self.assertIn("style-src 'self' 'sha256-", dashboard)
        self.assertIn("script-src 'self';", api)
        self.assertIn("style-src 'self';", api)
        self.assertNotIn("'unsafe-inline'", dashboard)

    def test_collector_oversized_json_including_false_lengths_cannot_insert_events(self):
        r = self.result
        self.assertEqual([413, 413, 413], r['oversizedStatuses'])
        self.assertEqual(r['eventsBefore'], r['eventsAfterRejected'])
        self.assertEqual(204, r['smallEventStatus'])
        self.assertEqual(r['eventsBefore']+1, r['eventsAfterSmall'])


if __name__ == '__main__':
    unittest.main()
