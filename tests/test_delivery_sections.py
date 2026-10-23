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
                 if 'data-ecosystem-project' in attrs]
        self.assertEqual(['progresskit-tax', 'progresskit-translator', 'progresskit-mail'], nodes)
        self.assertTrue(set(nodes).issubset({p['id'] for p in self.projects}))

    def test_approved_relationships_are_explicitly_planned_not_an_available_offer(self):
        text = ''.join(self.page.text)
        for label in (
                'ProgressKit Tax', 'Obsługa biura.',
                'ProgressKit Translator', 'Niezależny moduł językowy offline-first.',
                'ProgressKit Mail', 'Komunikacja e-mail. Połączenie z głównym przepływem — planowane.',
                'Local AI Agents', 'Lokalni agenci AI.', 'Voice Gateway', 'Integracje telefoniczne.',
                'Bezpieczny komunikator', 'Niezależna komunikacja',
                'Osobny kierunek rozwoju. Połączenie z ekosystemem — planowane.',
                'Plan współpracy modułów. Połączenia poniżej są roadmapą, nie potwierdzeniem działających integracji.',
                'Nie potwierdzono działających integracji między tymi modułami. Planowane połączenia nie stanowią dostępnej oferty.'):
            self.assertIn(label, text)
        self.assertEqual(2, self.page.text.count('W rozwoju'))
        self.assertEqual(1, self.page.text.count('Prototyp'))

    def test_main_flow_is_an_ordered_roadmap_and_independent_communication_is_a_separate_branch(self):
        flow_nodes = [(tag, attrs) for tag, attrs in self.page.elements
                      if 'delivery-flow__node' in attrs.get('class', '').split()]
        self.assertEqual(['li'] * 4, [tag for tag, _ in flow_nodes])
        self.assertEqual(['progresskit-tax', 'progresskit-translator', 'local-ai-agents', 'voice-gateway'],
                         [attrs.get('data-ecosystem-project', attrs.get('data-ecosystem-concept'))
                          for _, attrs in flow_nodes])
        branches = [attrs for tag, attrs in self.page.elements
                    if 'delivery-branch' in attrs.get('class', '').split()]
        self.assertEqual(['progresskit-mail', 'secure-messenger'],
                         [attrs.get('data-ecosystem-project', attrs.get('data-ecosystem-concept'))
                          for attrs in branches])
        self.assertEqual(1, sum(tag == 'ol' and 'delivery-flow' in attrs.get('class', '').split()
                                for tag, attrs in self.page.elements))
        relationships = [attrs for _, attrs in self.page.elements if 'data-integration-status' in attrs]
        self.assertEqual(5, len(relationships))
        self.assertEqual({'planned'}, {attrs['data-integration-status'] for attrs in relationships})

    def test_roadmap_concepts_do_not_become_catalogue_projects_or_unverified_release_badges(self):
        concepts = [attrs['data-ecosystem-concept'] for _, attrs in self.page.elements
                    if 'data-ecosystem-concept' in attrs]
        self.assertEqual(['local-ai-agents', 'voice-gateway', 'secure-messenger'], concepts)
        catalogue_ids = {project['id'] for project in self.projects}
        self.assertTrue(set(concepts).isdisjoint(catalogue_ids))
        for _, attrs in self.page.elements:
            if 'data-ecosystem-project' in attrs or 'data-ecosystem-concept' in attrs:
                self.assertNotIn('release-channel', attrs)
                self.assertNotIn('commercial-status', attrs)

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
