"""Local-only three-scene prototype. No prototype file enters public staging."""
from pathlib import Path
import importlib.util
import sys

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'analytics'))
from security_headers import SecurityHeadersMiddleware

spec = importlib.util.spec_from_file_location('existing_public_preview', ROOT / 'analytics/preview.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(SecurityHeadersMiddleware)


def local_file(name):
    def response():
        return FileResponse(HERE / name, headers={'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow'})
    return response


app.add_api_route('/proof-of-direction/', local_file('index.html'), methods=['GET'])
for name in ('world.css', 'world.js', 'brushed-alloy.svg'):
    app.add_api_route('/proof-of-direction/' + name, local_file(name), methods=['GET'])


@app.get('/proof-of-direction')
def canonical():
    return RedirectResponse('/proof-of-direction/', status_code=308)


app.mount('/', site.app)
