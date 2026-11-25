"""Local preview exposes only explicitly public paths, never the repository root."""
from pathlib import Path
import json
import importlib.util
from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from product import router
from inquiries import router as inquiry_router
from security_headers import SecurityHeadersMiddleware
root = Path(__file__).resolve().parents[1]
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
# Match the release's recommended HTTP compression for text/module responses.
app.add_middleware(GZipMiddleware, minimum_size=1024)
media_routes = {'/', '/echo-worlds/', '/taskpet/'}
for slug, exhibit in json.loads((root/'catalog/product-showcases.json').read_text()).items():
    if exhibit.get('video'):
        media_routes.add('/projekty/' + slug + '/')
app.add_middleware(SecurityHeadersMiddleware, media_pages=media_routes | {path+'index.html' for path in media_routes})
app.include_router(router)
app.include_router(inquiry_router)
spec=importlib.util.spec_from_file_location('stage_public',root/'scripts/stage-public.py')
public=importlib.util.module_from_spec(spec);spec.loader.exec_module(public)

def response_for(file):
    def response():
        return FileResponse(file)
    return response

def redirect_to(url):
    def redirect():
        return RedirectResponse(url,status_code=308)
    return redirect

# Use the release allowlist, including catalog pages, without exposing raw assets.
for name in public.public_files():
    route='/'+name
    app.add_api_route(route,response_for(root/name),methods=['GET'])
    if name.endswith('index.html'):
        directory=route[:-len('index.html')]
        app.add_api_route(directory,response_for(root/name),methods=['GET'])
        if directory!='/':
            app.add_api_route(directory.rstrip('/'),redirect_to(directory),methods=['GET'])

@app.get('/{missing:path}')
def not_found(missing:str):
    return FileResponse(root/'404.html',status_code=404)
