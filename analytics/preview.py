"""Local preview exposes only explicitly public paths, never the repository root."""
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from product import router
root = Path(__file__).resolve().parents[1]
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router)
app.mount('/assets', StaticFiles(directory=root/'assets'), name='assets')
app.mount('/glikemia-premium', StaticFiles(directory=root/'glikemia-premium', html=True), name='glikemia-product')
app.mount('/progresskit-mail', StaticFiles(directory=root/'progresskit-mail', html=True), name='mail-product')
@app.get('/')
def home():
    return FileResponse(root/'index.html')
# Legacy homepage images only; no arbitrary file lookup.
for path in list(root.glob('*.png')) + list(root.glob('*.jpg')):
    def response_for(file):
        def image_response():
            return FileResponse(file)
        return image_response
    app.add_api_route('/'+path.name, response_for(path), methods=['GET'])
