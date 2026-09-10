import asyncio
import concurrent.futures
import hashlib
import importlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

workspace = Path(__file__).resolve().parents[1]
temporary = tempfile.TemporaryDirectory()
os.environ['PK_PRODUCT_DB'] = str(Path(temporary.name)/'product.db')
sys.path.insert(0,str(workspace/'analytics'))
from fastapi import FastAPI
from fastapi.testclient import TestClient
import product
app=FastAPI(); app.include_router(product.router)
client=TestClient(app)

class ProductTests(unittest.TestCase):
    def setUp(self):
        with product.connect() as db:
            db.execute('UPDATE downloads SET total=0,last_at=NULL')
            for table in ('reviews','form_tokens','review_limits'): db.execute(f'DELETE FROM {table}')

    def payload(self):
        token=client.get('/api/glikemia/review-token').json()['token']
        with product.connect() as db:
            db.execute('UPDATE form_tokens SET created_at=? WHERE token=?',(int(time.time())-4,token))
        return dict(nickname='Tester',rating=4,comment='Przykładowa opinia testowa.',version='1.0',website='',token=token)

    def post(self,data,**kw):
        return client.post('/api/glikemia/reviews',json=data,headers={'Origin':product.ORIGIN},**kw)

    def test_download_hash_persistence_and_headers(self):
        self.assertEqual(client.get('/api/glikemia/downloads').json(),{'downloads':0})
        metadata=json.loads((workspace/'downloads/glikemia-premium.json').read_text())
        for url in ('/download/glikemia-premium','/downloads/glikemia-premium.apk'):
            response=client.get(url)
            self.assertEqual(response.status_code,200)
            self.assertEqual(hashlib.sha256(response.content).hexdigest(),metadata['sha256'])
            self.assertIn('attachment;',response.headers['content-disposition'])
            self.assertEqual(response.headers['content-type'],'application/vnd.android.package-archive')
            self.assertEqual(response.headers['cache-control'],'no-store')
        importlib.reload(product)
        self.assertEqual(client.get('/api/glikemia/downloads').json(),{'downloads':2})
        self.assertEqual(client.head('/download/glikemia-premium').status_code,405)
        self.assertEqual(client.get('/api/glikemia/downloads').json(),{'downloads':2})

    def test_atomic_counter(self):
        original = product.APK_PATH
        tiny = Path(temporary.name)/"concurrent.apk"
        tiny.write_bytes(b"synthetic transfer fixture")
        try:
            product.APK_PATH = tiny
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
                responses = list(pool.map(lambda _: client.get("/download/glikemia-premium"), range(48)))
            self.assertTrue(all(r.status_code == 200 for r in responses))
        finally:
            product.APK_PATH = original
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'],48)

    def test_missing_apk_not_counted(self):
        original=product.APK_PATH
        try:
            product.APK_PATH=Path(temporary.name)/'absent.apk'
            self.assertEqual(client.get('/download/glikemia-premium').status_code,503)
            self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'],0)
        finally: product.APK_PATH=original

    def test_moderation_and_replay(self):
        payload=self.payload()
        self.assertEqual(self.post(payload).status_code,201)
        self.assertEqual(client.get('/api/glikemia/reviews').json(),{'reviews':[]})
        self.assertEqual(self.post(payload).status_code,400)
        with product.connect() as db: db.execute("UPDATE reviews SET status='approved'")
        public=client.get('/api/glikemia/reviews').json()['reviews'][0]
        self.assertEqual(set(public),{'nickname','rating','comment','version','created_at'})
        self.assertEqual(public['comment'],payload['comment'])

    def test_validation(self):
        for change in ({'rating':6},{'rating':True},{'rating':'5'},{'nickname':' '},{'comment':'x'*2001},{'comment':'<script>alert(1)</script>'},{'website':'spam'},{'unexpected':'field'}):
            self.assertEqual(self.post(self.payload()|change).status_code,422,change)
        self.assertEqual(client.post('/api/glikemia/reviews',json=self.payload()).status_code,403)
        self.assertEqual(client.post('/api/glikemia/reviews',content='x'*12001,headers={'Origin':product.ORIGIN,'Content-Type':'application/json'}).status_code,413)

    def test_non_download_requests(self):
        from preview import app as preview_app
        preview = TestClient(preview_app)
        for path in ('/glikemia-premium/', '/glikemia-premium/',
                     '/glikemia-premium/product.js', '/assets/projects/glikemia/product-measurement.webp',
                     '/api/glikemia/downloads', '/api/glikemia/reviews'):
            self.assertEqual(preview.get(path).status_code, 200)
        for path in ('/download/glikemia-premium', '/downloads/glikemia-premium.apk'):
            self.assertEqual(client.head(path).status_code, 405)
            for header in ('Purpose', 'Sec-Purpose', 'X-Purpose', 'X-Moz'):
                r = client.get(path, headers={header: 'prefetch;prerender'})
                self.assertEqual(r.status_code, 204)
                self.assertEqual(r.content, b'')
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'], 0)

    def test_range_and_resume_not_counted(self):
        path = '/download/glikemia-premium'
        self.assertEqual(client.get(path).status_code, 200)
        for value in ('bytes=0-9', 'bytes=10-19', 'bytes=-10', 'bytes=0-1,10-11'):
            self.assertEqual(client.get(path, headers={'Range': value}).status_code, 206)
        self.assertEqual(client.get(path, headers={'Range': 'bytes=999999999-'}).status_code, 416)
        self.assertEqual(client.get(path, headers={'Range': 'nonsense'}).status_code, 400)
        self.assertEqual(client.get(path, headers={'Range': 'bytes=1-', 'If-Range': '"stale"'}).status_code, 200)
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'], 1)

    def test_failed_file_open_not_counted(self):
        with patch('starlette.responses.anyio.open_file', side_effect=PermissionError('fixture')):
            with self.assertRaises(PermissionError):
                client.get('/download/glikemia-premium')
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'], 0)

    def test_interrupted_send_not_counted(self):
        async def run():
            async def send(message):
                if message['type'] == 'http.response.body':
                    raise OSError('simulated disconnected client')
            async def receive():
                return {'type': 'http.disconnect'}
            response = product.CountedAPKResponse(product.APK_PATH)
            await response({'type':'http', 'method':'GET', 'headers':[], 'extensions':{}}, receive, send)
        with self.assertRaises(OSError):
            asyncio.run(run())
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'], 0)

    def test_truncated_body_not_counted(self):
        async def fake_transfer(response, scope, receive, send):
            await send({'type':'http.response.start', 'status':200, 'headers':[(b'content-length',b'20')]})
            await send({'type':'http.response.body', 'body':b'short', 'more_body':False})
        async def run():
            async def send(message): pass
            async def receive(): return {'type':'http.disconnect'}
            await product.CountedAPKResponse(product.APK_PATH)(
                {'type':'http', 'method':'GET', 'headers':[], 'extensions':{}}, receive, send)
        with patch('starlette.responses.FileResponse.__call__', fake_transfer):
            asyncio.run(run())
        self.assertEqual(client.get('/api/glikemia/downloads').json()['downloads'], 0)

    def test_abuse_and_moderation_no_bypass(self):
        for change in ({'comment':' '*30}, {'rating':0}, {'rating':-1}, {'rating':1.5},
                       {'nickname':'x'*61}, {'version':'x'*31}, {'status':'approved'},
                       {'comment':'&lt;script&gt;alert(1)&lt;/script&gt;'}):
            expected = 201 if change.get('comment', '').startswith('&lt;') else 422
            self.assertEqual(self.post(self.payload() | change).status_code, expected)
        self.assertEqual(client.get('/api/glikemia/reviews').json()['reviews'], [])
        self.assertEqual(client.post('/api/glikemia/reviews', json=self.payload(), headers={'Origin':'https://evil.example'}).status_code, 403)
        self.assertEqual(client.post('/api/glikemia/reviews', content='nickname=x', headers={'Origin':product.ORIGIN, 'Content-Type':'application/x-www-form-urlencoded'}).status_code, 415)
        self.assertEqual(client.post('/api/glikemia/reviews/1/approve').status_code, 404)

    def test_rate_limit_and_fresh_token(self):
        data=self.payload()
        with product.connect() as db: db.execute('UPDATE form_tokens SET created_at=?',(int(time.time()),))
        self.assertEqual(self.post(data).status_code,400)
        with product.connect() as db: db.execute('INSERT INTO review_limits VALUES (?,20)',(int(time.time())//3600,))
        self.assertEqual(self.post(self.payload()).status_code,429)

if __name__=='__main__': unittest.main()
