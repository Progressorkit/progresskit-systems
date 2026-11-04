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
        self.records = []
        self.stack = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.elements.append((tag, values))
        self.records.append((tag, values, tuple(self.stack)))
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                       'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append((tag, values))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

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
        self.assertEqual(1, self.page.text.count('Wersja testowa'))
        self.assertEqual(0, self.page.text.count('Prototyp'))
        self.assertEqual(3, self.page.text.count('Planowane'))
        self.assertEqual(3, self.page.text.count('Planowane połączenie'))

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
        self.assertEqual(10, len(relationships))  # Five visible annotations and five matching SVG paths.
        self.assertEqual({'planned'}, {attrs['data-integration-status'] for attrs in relationships})

    def test_six_native_role_buttons_control_exact_visible_fallback_details(self):
        roles = ['tax', 'translator', 'agents', 'voice', 'mail', 'messenger']
        nodes = [attrs for _, attrs in self.page.elements if 'data-ecosystem-node' in attrs]
        self.assertEqual(roles, [attrs['data-ecosystem-node'] for attrs in nodes])
        buttons = [(tag, attrs) for tag, attrs in self.page.elements if 'data-ecosystem-select' in attrs]
        self.assertEqual(roles, [attrs['data-ecosystem-select'] for _, attrs in buttons])
        by_id = {attrs['id']: (tag, attrs) for tag, attrs in self.page.elements if 'id' in attrs}
        details = [attrs for _, attrs in self.page.elements
                   if 'ecosystem-node__detail' in attrs.get('class', '').split()]
        self.assertEqual(6, len(details))
        for tag, button in buttons:
            role = button['data-ecosystem-select']
            with self.subTest(role=role):
                self.assertEqual('button', tag)
                self.assertEqual('button', button['type'])
                self.assertEqual(f'ecosystem-trigger-{role}', button['id'])
                self.assertEqual(f'ecosystem-role-{role}', button['aria-controls'])
                self.assertEqual(f'ecosystem-name-{role}', button['aria-labelledby'])
                self.assertEqual(f'ecosystem-status-{role}', button['aria-describedby'])
                self.assertEqual('true', button['aria-expanded'])
                self.assertNotIn('tabindex', button)
                self.assertNotIn('role', button)
                detail_tag, detail = by_id[button['aria-controls']]
                self.assertEqual('div', detail_tag)
                self.assertEqual('region', detail['role'])
                self.assertEqual(button['aria-labelledby'], detail['aria-labelledby'])
                self.assertNotIn('hidden', detail)
                for _, attrs, ancestors in self.page.records:
                    if attrs is detail:
                        self.assertFalse(any('hidden' in ancestor for _, ancestor in ancestors))
                        self.assertTrue(any(ancestor.get('data-ecosystem-node') == role
                                            for _, ancestor in ancestors))
        for tag, _, ancestors in self.page.records:
            if tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'select'}:
                self.assertFalse(any(parent == 'button' for parent, _ in ancestors), tag)

    def test_graph_host_has_only_the_five_planned_connections_and_starts_without_a_duplicate_panel(self):
        systems = [attrs for _, attrs in self.page.elements if 'data-ecosystem-system' in attrs]
        self.assertEqual(1, len(systems))
        self.assertEqual('ekosystem', systems[0]['id'])
        wires = [(tag, attrs) for tag, attrs in self.page.elements if 'data-ecosystem-wires' in attrs]
        self.assertEqual(1, len(wires))
        self.assertEqual('svg', wires[0][0])
        self.assertEqual('true', wires[0][1]['aria-hidden'])
        self.assertEqual('false', wires[0][1]['focusable'])
        edges = [(tag, attrs) for tag, attrs in self.page.elements if 'data-ecosystem-edge' in attrs]
        expected = [('tax', 'translator'), ('translator', 'agents'), ('agents', 'voice'),
                    ('tax', 'mail'), ('mail', 'messenger')]
        self.assertEqual(expected, [(attrs['data-from'], attrs['data-to']) for _, attrs in edges])
        for tag, attrs in edges:
            self.assertEqual('path', tag)
            self.assertEqual(f'{attrs["data-from"]}-{attrs["data-to"]}', attrs['data-ecosystem-edge'])
            self.assertEqual('planned', attrs['data-integration-status'])
            self.assertNotIn('href', attrs)
            self.assertNotIn('xlink:href', attrs)
        consoles = [attrs for _, attrs in self.page.elements if 'data-ecosystem-console' in attrs]
        self.assertEqual(1, len(consoles))
        self.assertEqual('ecosystem-console', consoles[0]['id'])
        self.assertIn('hidden', consoles[0])
        self.assertEqual('polite', consoles[0]['aria-live'])
        self.assertEqual('true', consoles[0]['aria-atomic'])
        self.assertFalse(any(any('data-ecosystem-console' in parent for _, parent in ancestors)
                             for _, _, ancestors in self.page.records))

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

    def test_node_stage_attributes_use_exact_catalogue_states_without_implying_availability(self):
        stages = {attrs['data-ecosystem-node']: attrs['data-ecosystem-stage']
                  for _, attrs in self.page.elements if 'data-ecosystem-node' in attrs}
        self.assertEqual({'tax': 'development', 'translator': 'development', 'agents': 'planned',
                          'voice': 'planned', 'mail': 'testing', 'messenger': 'planned'}, stages)
        for stage in ('W ROZWOJU', 'w rozwoju', 'WERSJA TESTOWA', 'wersja testowa',
                      'Wersja testowa ', 'Stable', 'Commercial', 'Niepotwierdzony etap',
                      '<img src=x onerror=alert(1)>'):
            with self.subTest(stage=stage):
                projects = copy.deepcopy(self.projects)
                next(p for p in projects if p['id'] == 'progresskit-tax')['stage'] = stage
                page = Page(DELIVERY.render_delivery(projects))
                node = next(attrs for _, attrs in page.elements if attrs.get('data-ecosystem-node') == 'tax')
                self.assertEqual('unconfirmed', node['data-ecosystem-stage'])
                self.assertIn(stage, page.text)
                self.assertFalse(any(tag == 'img' for tag, _ in page.elements))

    def test_testing_product_stage_preserves_all_planned_connections_and_release_boundaries(self):
        projects = copy.deepcopy(self.projects)
        next(p for p in projects if p['id'] == 'progresskit-tax')['stage'] = 'Wersja testowa'
        page = Page(DELIVERY.render_delivery(projects))
        node = next(attrs for _, attrs in page.elements if attrs.get('data-ecosystem-node') == 'tax')
        self.assertEqual('testing', node['data-ecosystem-stage'])
        self.assertIn('Wersja testowa', page.text)
        edges = [attrs for _, attrs in page.elements if 'data-ecosystem-edge' in attrs]
        self.assertEqual(5, len(edges))
        self.assertEqual({'planned'}, {attrs['data-integration-status'] for attrs in edges})
        self.assertIn('W tym katalogu nie potwierdzono wydań Stable ani dostępności komercyjnej.',
                      ''.join(page.text))

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
            for attribute in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
                for value in attrs.get(attribute, '').split():
                    self.assertIn(value, ids, attribute)

    def test_catalogue_names_cannot_inject_html_into_accessible_link_labels(self):
        projects = copy.deepcopy(self.projects)
        next(p for p in projects if p['id'] == 'progresskit-tax')['name'] = '<img src=x onerror=alert(1)> & Tax'
        page = Page(DELIVERY.render_delivery(projects))
        self.assertFalse(any(tag == 'img' for tag, attrs in page.elements))
        self.assertIn('<img src=x onerror=alert(1)> & Tax', ''.join(page.text))

    def test_catalogue_stages_are_escaped_and_no_inline_executable_or_remote_graph_markup_is_added(self):
        projects = copy.deepcopy(self.projects)
        stage = '<script>alert("stage")</script> & prototype'
        next(p for p in projects if p['id'] == 'progresskit-translator')['stage'] = stage
        page = Page(DELIVERY.render_delivery(projects))
        self.assertIn(stage, page.text)
        for tag, attrs in page.elements:
            self.assertNotIn(tag, {'script', 'style', 'iframe', 'object', 'embed', 'image', 'use'})
            self.assertNotIn('style', attrs)
            self.assertNotIn('src', attrs)
            self.assertFalse(any(name.lower().startswith('on') for name in attrs))
        for invalid in (1, {'name': 'Prototyp'}):
            with self.subTest(stage=invalid):
                projects = copy.deepcopy(self.projects)
                next(p for p in projects if p['id'] == 'progresskit-translator')['stage'] = invalid
                with self.assertRaises(ValueError):
                    DELIVERY.render_delivery(projects)

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
