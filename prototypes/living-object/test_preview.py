"""Integration boundaries and catalogue preservation for the local-only proof."""
from pathlib import Path
import importlib.util
import json
import os
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
temporary = tempfile.TemporaryDirectory(prefix='progresskit-proof-tests-')
os.environ['PK_PRODUCT_DB'] = str(Path(temporary.name) / 'synthetic.db')
sys.path.insert(0, str(HERE))
from fastapi.testclient import TestClient
import build
import proof_preview


class ProofPreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(proof_preview.app)

    def test_local_proof_is_explicit_noindex_and_uncached(self):
        response = self.client.get('/proof-of-direction/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['x-robots-tag'], 'noindex, nofollow')
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertIn('noindex,nofollow', response.text)

    def test_security_headers_are_retained(self):
        response = self.client.get('/proof-of-direction/')
        self.assertIn("default-src 'none'", response.headers['content-security-policy'])
        self.assertEqual(response.headers['content-security-policy'],
                         self.client.get('/').headers['content-security-policy'])
        self.assertEqual(response.headers['x-content-type-options'], 'nosniff')
        self.assertNotIn('unsafe-eval', response.headers['content-security-policy'])

    def test_only_explicit_proof_assets_are_served(self):
        for name in ('world.css', 'world.js', 'brushed-alloy.svg'):
            with self.subTest(name=name):
                response = self.client.get('/proof-of-direction/' + name)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.content, (HERE/name).read_bytes())

    def test_private_sources_and_traversal_are_not_exposed(self):
        for path in ('proof_preview.py', 'build.py', 'template.html', 'test_preview.py',
                     '%2e%2e/build.py', '%2e%2e/%2e%2e/.git/config'):
            with self.subTest(path=path):
                self.assertEqual(self.client.get('/proof-of-direction/' + path).status_code, 404)
        self.assertEqual(self.client.get('/prototypes/living-object/template.html').status_code, 404)
        self.assertEqual(self.client.get('/docs/evidence/living-object-proof-20261101/baseline.json').status_code, 404)

    def test_existing_home_and_catalog_remain_the_same(self):
        self.assertEqual(self.client.get('/').content, (ROOT/'index.html').read_bytes())
        self.assertEqual(self.client.get('/projekty/glikemia-premium/').content,
                         (ROOT/'projekty/glikemia-premium/index.html').read_bytes())

    def test_public_staging_excludes_the_prototype(self):
        spec = importlib.util.spec_from_file_location('public_stage', ROOT/'scripts/stage-public.py')
        stage = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(stage)
        files = stage.public_files()
        self.assertFalse(any(p.startswith('prototypes/') or 'proof-of-direction' in p for p in files))
        self.assertEqual(len(files), 71)

    def test_generated_content_uses_current_catalogue(self):
        self.assertEqual((HERE/'index.html').read_text(), build.generated())
        p = next(p for p in json.loads((ROOT/'catalog/projects.json').read_text())['projects'] if p['id']=='glikemia-premium')
        output = self.client.get('/proof-of-direction/').text
        for value in (p['name'], p['summary'], p['problem'], p['stage'], p['gallery'][0]['src']):
            self.assertIn(value, output)

    def test_directory_canonicalization(self):
        response = self.client.get('/proof-of-direction', follow_redirects=False)
        self.assertEqual(response.status_code, 308)
        self.assertEqual(response.headers['location'], '/proof-of-direction/')


if __name__ == '__main__':
    unittest.main(verbosity=2)
