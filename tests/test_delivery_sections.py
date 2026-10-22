"""Delivery sections use approved text, safe routes and the existing catalogue."""
import copy
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('delivery_markup', ROOT / 'scripts/delivery_markup.py')
DELIVERY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DELIVERY)


class Page(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.elements = []
        self.text = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)


class DeliverySectionsTests(unittest.TestCase):
    def setUp(self):
        self.projects = json.loads((ROOT / 'catalog/projects.json').read_text())['projects']
        self.markup = DELIVERY.render_delivery(self.projects)
        self.page = Page(self.markup)

    def test_ecosystem_references_three_existing_products_without_mutating_catalogue(self):
        before = copy.deepcopy(self.projects)
        DELIVERY.render_delivery(self.projects)
        self.assertEqual(before, self.projects)
        nodes = [attrs['data-ecosystem-project'] for tag, attrs in self.page.elements
                 if tag == 'article' and 'data-ecosystem-project' in attrs]
        self.assertEqual(['progresskit-tax', 'progresskit-translator', 'progresskit-mail'], nodes)
        self.assertTrue(set(nodes).issubset({p['id'] for p in self.projects}))

    def test_approved_relationships_are_explicitly_planned_not_an_available_offer(self):
        text = ''.join(self.page.text)
        for label in (
                'Tax — obsługa biura',
                'Translator — niezależny moduł językowy offline-first',
                'Mail — komunikacja e-mail',
                'Roadmapa: bezpieczny komunikator, lokalni agenci AI, integracje telefoniczne.',
                'Planowane połączenia między produktami; nie stanowią dostępnej oferty.'):
            self.assertIn(label, text)
        self.assertEqual(3, self.page.text.count('W rozwoju'))

    def test_release_explanation_does_not_assign_stable_or_commercial_to_products(self):
        text = ''.join(self.page.text)
        for label in (
                'Beta — rozwiązania testowe',
                'Stable — rozwiązania zweryfikowane',
                'Commercial — dostępność komercyjna, niezależna od statusu wydania',
                'W tym katalogu nie potwierdzono wydań Stable ani dostępności komercyjnej.'):
            self.assertIn(label, text)
        for tag, attrs in self.page.elements:
            if 'data-ecosystem-project' in attrs:
                self.assertNotIn('release-channel', attrs)
                self.assertNotIn('commercial-status', attrs)

    def test_route_links_exist_and_roadmap_does_not_create_fake_routes(self):
        links = [attrs['href'] for tag, attrs in self.page.elements if tag == 'a']
        self.assertCountEqual(['projekty/progresskit-tax/', 'projekty/progresskit-translator/',
                               'projekty/progresskit-mail/'], links)
        for link in links:
            self.assertTrue((ROOT / link / 'index.html').is_file())

    def test_unique_ids_and_aria_labels_resolve(self):
        ids = [attrs['id'] for tag, attrs in self.page.elements if 'id' in attrs]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertIn('ekosystem', ids)
        self.assertIn('wydania', ids)
        for tag, attrs in self.page.elements:
            for value in attrs.get('aria-labelledby', '').split():
                self.assertIn(value, ids)

    def test_catalogue_names_cannot_inject_html_into_accessible_link_labels(self):
        projects = copy.deepcopy(self.projects)
        next(p for p in projects if p['id'] == 'progresskit-tax')['name'] = '<img src=x onerror=alert(1)> & Tax'
        page = Page(DELIVERY.render_delivery(projects))
        self.assertFalse(any(tag == 'img' for tag, attrs in page.elements))
        self.assertIn('<img src=x onerror=alert(1)> & Tax', ''.join(page.text))

    def test_invalid_or_duplicate_identities_and_unsafe_routes_are_rejected(self):
        with self.assertRaises(ValueError):
            DELIVERY.render_delivery({})
        with self.assertRaises(ValueError):
            DELIVERY.render_delivery(self.projects + [self.projects[0]])
        with self.assertRaises(ValueError):
            DELIVERY.render_delivery([p for p in self.projects if p['id'] != 'progresskit-tax'])
        for slug in ('../private', 'javascript:alert(1)', 'safe\" onmouseover=\"alert(1)', 'https://example.invalid'):
            with self.subTest(slug=slug):
                projects = copy.deepcopy(self.projects)
                next(p for p in projects if p['id'] == 'progresskit-tax')['slug'] = slug
                with self.assertRaises(ValueError):
                    DELIVERY.render_delivery(projects)

    def test_services_have_a_real_section_heading_preserved_competencies_and_contact_paths(self):
        page = Page((ROOT / 'templates/about-contact.html').read_text())
        sections = [attrs for tag, attrs in page.elements if tag == 'section' and attrs.get('id') == 'uslugi']
        self.assertEqual(1, len(sections))
        self.assertEqual('services-title', sections[0]['aria-labelledby'])
        for label in ('Aplikacje mobilne', 'Backend .NET i API', 'SaaS i bazy danych', 'Infrastruktura',
                      'Platformy internetowe', 'Gry i 3D', 'Testy i wdrożenia', 'Automatyzacja i integracje'):
            self.assertIn(label, page.text)
        hrefs = [attrs['href'] for tag, attrs in page.elements if tag == 'a']
        self.assertIn('#kontakt', hrefs)
        self.assertIn('#brief', hrefs)
        technologies = {technology for project in self.projects for technology in project['technologies']}
        for href in hrefs:
            if href.startswith('projekty/?technologia='):
                value = parse_qs(urlsplit(href).query)['technologia'][0]
                self.assertIn(value, technologies)


if __name__ == '__main__':
    unittest.main()
