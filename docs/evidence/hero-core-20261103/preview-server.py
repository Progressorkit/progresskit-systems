"""Local-only review: site allowlist plus this task's explicit proof artifacts."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import importlib.util

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
spec = importlib.util.spec_from_file_location('public', ROOT / 'scripts/stage-public.py')
public = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public)
PROOF = {'index.html', '01-hero-start.png', '02-hero-pulse.png', '03-transition.png',
         '04-showroom.png', '05-crystal-detail.png', '06-mobile-hero.png',
         'desktop.mp4', 'mobile.mp4', 'QA.json', 'ODBIOR.txt', 'SHA256SUMS.txt'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip('/')
        if name == 'proof' or name == 'proof/':
            name = 'proof/index.html'
        if name.startswith('proof/'):
            artifact = name.removeprefix('proof/')
            if artifact not in PROOF:
                self.send_error(404)
                return
            self.path = '/' + (OUT / artifact).relative_to(ROOT).as_posix()
        else:
            if not name or name.endswith('/'):
                name += 'index.html'
            if name not in public.public_files():
                self.send_error(404)
                return
        super().do_GET()
    def log_message(self, *args):
        pass

if __name__ == '__main__':
    print('Site: http://127.0.0.1:8203/ | Proof: http://127.0.0.1:8203/proof/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8203), Handler).serve_forever()
