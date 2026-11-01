"""Loopback-only asset/CSP and completed-download verification on synthetic DB."""
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.parse import urlsplit
from urllib.error import HTTPError
from hashlib import sha256
import importlib.util
import json
import time
import datetime
import sys
sys.dont_write_bytecode = True

ROOT = Path.cwd()
OUT = Path(__file__).parent
BASE = 'http://127.0.0.1:8111'
checks = []
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
class LoopbackRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urlsplit(newurl)
        if target.scheme != 'http' or target.hostname != '127.0.0.1' or target.port != 8111:
            raise ValueError('Redirect outside authorized loopback preview refused')
        return super().redirect_request(req, fp, code, msg, headers, newurl)
opener = build_opener(ProxyHandler({}), LoopbackRedirect())

def request(path, headers=None, method='GET'):
    try:
        with opener.open(Request(BASE + path, headers=headers or {}, method=method), timeout=10) as response:
            return response.status, {key.lower(): value for key, value in response.headers.items()}, response.read()
    except HTTPError as error:
        return error.code, {key.lower(): value for key, value in error.headers.items()}, error.read()

def check(name, success, details):
    checks.append({'name': name, 'status': 'PASS' if success else 'FAIL', 'details': details})

spec = importlib.util.spec_from_file_location('public_stage', ROOT / 'scripts/stage-public.py')
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)
public_files = stage.public_files()
assert len(public_files) == 67, len(public_files)
source_before = {name: sha256((ROOT / name).read_bytes()).hexdigest() for name in public_files}
for name in public_files:
    status, headers, body = request('/' + name)
    csp = headers.get('content-security-policy', '')
    check(name, status == 200 and sha256(body).digest() == sha256((ROOT / name).read_bytes()).digest()
          and "script-src-attr 'none'" in csp and "connect-src 'self'" in csp,
          {'status': status, 'bytes': len(body), 'sha256': sha256(body).hexdigest(), 'strictCSP': bool(csp)})

def count():
    return json.loads(request('/api/glikemia/downloads')[2])['downloads']

before = count()
status, headers, body = request('/download/glikemia-premium', method='HEAD')
check('HEAD never downloads or counts', status == 405 and count() == before, {'status': status, 'allow': headers.get('allow')})
status, headers, body = request('/download/glikemia-premium', {'Purpose': 'prefetch'})
check('Prefetch never counts', status == 204 and count() == before, {'status': status})
status, headers, body = request('/download/glikemia-premium', {'Range': 'bytes=0-1023'})
check('Range preserves APK without counting', status == 206 and len(body) == 1024 and count() == before, {'status': status, 'bytes': len(body)})
status, headers, body = request('/download/glikemia-premium')
metadata = json.loads((ROOT / 'downloads/glikemia-premium.json').read_text())
for _ in range(20):
    after = count()
    if after == before + 1:
        break
    time.sleep(.05)
check('Completed full APK response counts exactly once', status == 200 and len(body) == metadata['bytes']
      and sha256(body).hexdigest() == metadata['sha256'] and after == before + 1,
      {'status': status, 'bytes': len(body), 'sha256': sha256(body).hexdigest(), 'counterBefore': before, 'counterAfter': after,
       'database': '/tmp/progresskit-material-v3-20261023/product.db'})
source_after = {name: sha256((ROOT / name).read_bytes()).hexdigest() for name in public_files}
assert len(checks) == 71, len(checks)
report = {'startedUtc': started, 'finishedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'expectedPublicFiles': 67, 'totalChecks': len(checks), 'sourceUnchangedDuringChecks': source_before == source_after,
          'externalRequests': False, 'proxyDisabled': True, 'redirectsRestrictedToAuthorizedLoopback': True, 'base': BASE, 'scope': 'Local isolated preview; no external requests or production state.',
          'checks': checks, 'PASS': sum(c['status'] == 'PASS' for c in checks), 'FAIL': sum(c['status'] == 'FAIL' for c in checks)}
(OUT / 'http-check.json').write_text(json.dumps(report, indent=2) + '\n')
print({key: report[key] for key in ['PASS', 'FAIL']})
raise SystemExit(report['FAIL'] > 0 or source_before != source_after)
