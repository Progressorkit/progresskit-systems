"""Final installation contracts. Browser geometry and visual acceptance are separate."""
from collections import Counter
from html import escape
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('final_world_builder', ROOT/'scripts/build-site.py')
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class Page(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.elements = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def matching(self, name):
        return [(tag, attrs) for tag, attrs in self.elements if name in attrs]

    def classes(self, name):
        return [(tag, attrs) for tag, attrs in self.elements if name in attrs.get('class', '').split()]


class FinalWorldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = BUILDER.read_catalog()
        cls.outputs = BUILDER.generated(cls.data)
        cls.home = Page(cls.outputs['index.html'])

    def test_single_shared_decorative_scene_does_not_duplicate_the_interactive_core(self):
        for route in ['index.html', *[f'projekty/{p["slug"]}/index.html' for p in self.data['projects']], 'glikemia-premium/index.html']:
            with self.subTest(route=route):
                page = Page(self.outputs[route])
                scenes = page.matching('data-world-scene')
                self.assertLessEqual(len(scenes), 1)
                if route == 'index.html':
                    self.assertEqual(1, len(scenes))
                for tag, attrs in scenes:
                    self.assertEqual('canvas', tag)
                    self.assertEqual('true', attrs.get('aria-hidden'))
                self.assertEqual(1, len(page.classes('world-environment')))
        core = self.home.matching('data-core-activate')
        self.assertEqual(1, len(core))
        self.assertEqual('button', core[0][0])
        self.assertEqual('button', core[0][1].get('type'))
        self.assertFalse(self.home.matching('data-showroom'))

    def test_all_projects_are_real_artifact_links_with_their_catalogue_identities(self):
        artifacts = self.home.classes('artifact-card')
        self.assertGreaterEqual(len(artifacts), 1)
        self.assertTrue(all(tag == 'a' for tag, _ in artifacts))
        expected = Counter(f'/projekty/{p["slug"]}/' for p in self.data['projects'])
        actual = Counter('/' + attrs['href'].lstrip('/') for _, attrs in artifacts)
        self.assertEqual(len(actual), len(artifacts))
        self.assertTrue(set(actual).issubset(expected))
        self.assertTrue(any(attrs.get('href') == 'projekty/' for tag, attrs in self.home.elements if tag == 'a'))
        catalogue = Page(self.outputs['projekty/index.html'])
        self.assertEqual(len(self.data['projects']), len(catalogue.classes('catalog-card')))
        for project in self.data['projects']:
            self.assertIn(escape(project['name'], quote=True), self.outputs['projekty/index.html'])

    def test_project_shell_and_navigation_preserve_semantic_chapters(self):
        expected = {'problem', 'architektura', 'funkcje', 'galeria', 'wyzwania', 'rozwoj', 'dostep'}
        for project in self.data['projects']:
            with self.subTest(project=project['id']):
                page = Page(self.outputs[f'projekty/{project["slug"]}/index.html'])
                self.assertEqual(1, len(page.classes('project-world-hero')))
                self.assertEqual(1, len(page.matching('data-project-chapters')))
                ids = [attrs['id'] for _, attrs in page.elements if 'id' in attrs]
                self.assertEqual(len(ids), len(set(ids)))
                chapters = expected | ({'platformy', 'weryfikacja'} if project.get('portfolio') else set())
                self.assertEqual(1, ids.count('zrodla'))
                for chapter in chapters:
                    self.assertEqual(1, ids.count(chapter), chapter)
                    self.assertTrue(any(tag == 'a' and attrs.get('href') == '#'+chapter for tag, attrs in page.elements), chapter)

    def test_glikemia_both_routes_expose_canonical_download_and_read_only_counter(self):
        for route in ('projekty/glikemia-premium/index.html', 'glikemia-premium/index.html'):
            with self.subTest(route=route):
                page = Page(self.outputs[route])
                self.assertGreaterEqual(len(page.classes('project-download-console')), 1)
                self.assertTrue(page.matching('data-download-count'))
                ctas = page.matching('data-download-apk')
                self.assertTrue(ctas)
                for tag, attrs in ctas:
                    self.assertEqual('a', tag)
                    self.assertEqual('/download/glikemia-premium', attrs['href'])
                scripts = [attrs.get('src', '') for tag, attrs in page.elements if tag == 'script']
                self.assertTrue(any(src.endswith('/assets/product-downloads.mjs') or src.endswith('assets/product-downloads.mjs') for src in scripts))
                for tag, attrs in page.elements:
                    if tag == 'link' and attrs.get('rel') in ('prefetch', 'preload'):
                        self.assertNotIn('/download/', attrs.get('href', ''))
                        self.assertNotIn('.apk', attrs.get('href', ''))

    def test_project_shell_uses_one_shared_material_system_without_historical_stylesheet_stack(self):
        routes = ['index.html', 'projekty/glikemia-premium/index.html', 'glikemia-premium/index.html']
        for route in routes:
            with self.subTest(route=route):
                page = Page(self.outputs[route])
                styles = [urlsplit(attrs['href']).path.rsplit('/', 1)[-1] for tag, attrs in page.elements if tag == 'link' and attrs.get('rel') == 'stylesheet']
                self.assertEqual(1, styles.count('world.css'))
                self.assertEqual(len(styles), len(set(styles)))
                for legacy in ('hero.css', 'hero-entry.css', 'world-continuity.css', 'luxury-world.css', 'site-v4.css'):
                    self.assertNotIn(legacy, styles)
                if route != 'index.html':
                    self.assertEqual(1, styles.count('project-world.css'))

    def test_old_runtime_layers_are_not_in_the_release_allowlist(self):
        spec=importlib.util.spec_from_file_location('final_world_stager',ROOT/'scripts/stage-public.py')
        stager=importlib.util.module_from_spec(spec);spec.loader.exec_module(stager)
        public=set(stager.public_files())
        for legacy in ('site-v4.css','site-v5.css','hero.css','hero-entry.mjs',
                       'showroom-3d.mjs','world-journey.mjs','installation.mjs',
                       'luxury-world.css','project-showroom.js'):
            self.assertNotIn('assets/'+legacy,public)
        for module in ('world.css','world.mjs','world-scene.mjs','project-world.css',
                       'project-world.mjs','client-inquiry.mjs','product-downloads.mjs'):
            self.assertIn('assets/'+module,public)

    def test_owner_visual_approval_remains_open(self):
        brand = json.loads((ROOT/'catalog/brand.json').read_text())
        self.assertEqual('OPEN', brand['ownerVisualApproval'])


if __name__ == '__main__':
    unittest.main()
