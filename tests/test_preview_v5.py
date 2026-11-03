"""HTTP integration for the local release boundary; no production writes."""
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'analytics'))
TEMP=tempfile.TemporaryDirectory()
os.environ.setdefault('PK_PRODUCT_DB',str(Path(TEMP.name)/'product.db'))
from fastapi.testclient import TestClient
from preview import app
CLIENT=TestClient(app)
spec=importlib.util.spec_from_file_location('preview_stager',ROOT/'scripts/stage-public.py')
STAGER=importlib.util.module_from_spec(spec);spec.loader.exec_module(STAGER)


class PreviewV5Tests(unittest.TestCase):
    def test_all_release_files_are_served_with_matching_bytes(self):
        for name in STAGER.public_files():
            with self.subTest(name=name):
                response=CLIENT.get('/'+name)
                self.assertEqual(200,response.status_code)
                self.assertEqual((ROOT/name).read_bytes(),response.content)

    def test_all_pages_have_direct_directory_routes(self):
        for name in STAGER.public_files():
            if not name.endswith('index.html'):
                continue
            directory='/'+name[:-len('index.html')]
            with self.subTest(directory=directory):
                self.assertEqual(200,CLIENT.get(directory).status_code)
                if directory!='/':
                    response=CLIENT.get(directory.rstrip('/'),follow_redirects=False)
                    self.assertEqual(308,response.status_code)
                    self.assertEqual(directory,response.headers['location'])

    def test_private_sources_and_unreviewed_assets_are_not_exposed(self):
        for path in ('/.git/config','/catalog/operator.json','/marketing/brand-launch-2026-11-02/preview/brand-v1.mp4','/catalog/projects.json','/templates/site.html','/analytics/app.py',
                     '/docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md','/tests/test_product.py',
                     '/scripts/build-site.py','/downloads/glikemia-premium.json','/summary','/health',
                     '/assets/projects/vaeloria/vaeloria-cover.png','/assets/projects/rwr/rwr-cover.webp',
                     '/assets/projects/glikemia/product-history.webp','/.env'):
            with self.subTest(path=path):
                self.assertEqual(404,CLIENT.get(path).status_code)

    def test_missing_project_returns_real_404(self):
        response=CLIENT.get('/projekty/not-a-real-project/')
        self.assertEqual(404,response.status_code)
        self.assertIn('Nie znaleziono strony.',response.text)

    def test_navigation_and_range_do_not_increment_downloads(self):
        before=CLIENT.get('/api/glikemia/downloads').json()['downloads']
        for path in ('/','/projekty/glikemia-premium/','/glikemia-premium/',
                     '/assets/projects/glikemia/product-measurement.webp'):
            self.assertEqual(200,CLIENT.get(path).status_code)
        response=CLIENT.get('/download/glikemia-premium',headers={'Range':'bytes=0-31'})
        self.assertEqual(206,response.status_code)
        self.assertEqual(32,len(response.content))
        self.assertEqual(before,CLIENT.get('/api/glikemia/downloads').json()['downloads'])


if __name__=='__main__':
    unittest.main()
