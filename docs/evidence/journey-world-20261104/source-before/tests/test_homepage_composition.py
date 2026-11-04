"""Homepage composition regressions; visual/browser acceptance is separate."""
import copy
from html import escape
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('homepage_builder', ROOT / 'scripts/build-site.py')
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class Composition(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.elements = []
        self.sections = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'section':
            self.sections.append(values.get('id'))
        self.elements.append((tag, values, tuple(self.sections)))

    def handle_endtag(self, tag):
        if tag == 'section':
            self.sections.pop()


class HomepageCompositionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = BUILDER.read_catalog()
        cls.markup = BUILDER.homepage(cls.data)
        cls.page = Composition(cls.markup)

    def test_one_interactive_project_collection_contains_all_catalogue_identities(self):
        projects = [attrs['data-project-id'] for tag, attrs, _ in self.page.elements
                    if tag == 'article' and 'showroom-card' in attrs.get('class', '').split()]
        self.assertEqual(len(self.data['projects']), len(projects))
        self.assertTrue({'glikemia-premium','progresskit-mail','progresskit-translator','vaeloria','progresskit-community','progresskit-tax','adivara','gotrans360','ignira','obserwator','kan-system','progresskit-systems','progresskit-analytics','progresskit-infrastructure'}.issubset(projects))
        self.assertEqual([project['id'] for project in self.data['projects']], projects)
        self.assertEqual(1, sum('data-showroom' in attrs for _, attrs, _ in self.page.elements))
        for _, attrs, _ in self.page.elements:
            self.assertNotIn('data-engineering-select', attrs)
            self.assertNotIn('data-engineering-case', attrs)
            self.assertNotIn('catalog-card', attrs.get('class', '').split())

    def test_preserved_section_anchors_resolve_once_and_case_studies_use_one_catalogue_link(self):
        ids = [attrs['id'] for _, attrs, _ in self.page.elements if 'id' in attrs]
        for identifier in ('start', 'projekty', 'o-mnie', 'uslugi', 'wyzwania', 'technologie',
                           'ekosystem', 'wydania', 'kontakt', 'brief'):
            self.assertEqual(1, ids.count(identifier), identifier)
        case_links = [attrs['href'] for tag, attrs, sections in self.page.elements
                      if tag == 'a' and 'wyzwania' in sections]
        self.assertEqual(['projekty/'], case_links)
        self.assertFalse(any(tag in ('article', 'button', 'details') for tag, _, sections
                             in self.page.elements if 'wyzwania' in sections))

    def test_project_payload_and_catalogue_remain_unchanged_by_homepage_composition(self):
        before = copy.deepcopy(self.data)
        markup = BUILDER.homepage(self.data)
        self.assertEqual(before, self.data)
        payload = re.search(r'<script type="application/json" id="showroom-data">(.*?)</script>',
                            markup, re.S)
        self.assertIsNotNone(payload)
        records = json.loads(payload.group(1))
        self.assertEqual([project['id'] for project in self.data['projects']],
                         [record['id'] for record in records])
        for project, record in zip(self.data['projects'], records):
            for key in ('name', 'category', 'summary', 'problem', 'technologies', 'gallery'):
                self.assertEqual(project[key], record[key])

    def test_full_case_routes_retain_original_analyses_and_download_entry_points(self):
        generated = BUILDER.generated(self.data)
        self.assertIn('projekty/index.html', generated)
        for project in self.data['projects']:
            route = f'projekty/{project["slug"]}/'
            self.assertIn(route + 'index.html', generated)
            case = generated[route + 'index.html']
            self.assertIn('id="wyzwania"', case)
            for source in project['sources']:
                self.assertIn(f'id="source-{source["id"]}"', case)
            for analysis in project['cases']:
                self.assertIn(escape(analysis['problem'], quote=True), case)
                self.assertIn(escape(analysis['verification'], quote=True), case)
        self.assertIn('href="glikemia-premium/"', self.markup)
        self.assertIn('href="/download/glikemia-premium"', self.markup)
        self.assertIn('href="projekty/"', self.markup)


if __name__ == '__main__':
    unittest.main()
