"""Local-only review: site allowlist plus this task's explicit proof artifacts."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import importlib.util
import re

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
            if artifact not in PROOF and not (Path(artifact).name == artifact and (OUT / artifact).is_file() and Path(artifact).suffix in {'.png','.mp4','.json','.txt','.html'}):
                self.send_error(404)
                return
            if Path(artifact).suffix == '.mp4' and (OUT / artifact).is_file():
                return self.serve_video(OUT / artifact)
            self.path = '/' + (OUT / artifact).relative_to(ROOT).as_posix()
        else:
            if not name or name.endswith('/'):
                name += 'index.html'
            if name not in public.public_files() and name not in {'assets/interactions.css','assets/interactions.mjs'}:
                self.send_error(404)
                return
        super().do_GET()
    def serve_video(self, path):
        size = path.stat().st_size
        start, end, status = 0, size - 1, 200
        value = self.headers.get('Range')
        if value:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
            if not match or not any(match.groups()):
                self.send_error(416)
                return
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last))
            end = min(size - 1, int(last)) if first and last else size - 1
            if start > end or start >= size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
            status = 206
        self.send_response(status)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        try:
            with path.open('rb') as stream:
                stream.seek(start)
                remaining = end - start + 1
                while remaining:
                    block = stream.read(min(65536, remaining))
                    if not block:
                        break
                    self.wfile.write(block)
                    remaining -= len(block)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, *args):
        pass

if __name__ == '__main__':
    print('Site: http://127.0.0.1:8207/ | Proof: http://127.0.0.1:8207/proof/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8207), Handler).serve_forever()
