"""Structural regressions for the owner's corrected composition; not visual approval."""
from collections import Counter
from html import escape
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]


class Composition(HTMLParser):
    def __init__(self,source):
        super().__init__();self.sections=[];self.gates={};self.projects=[]
        self.classes=[];self.links=[];self.images=[];self.ids=[]
        self.feed(source)

    def handle_starttag(self,tag,attrs):
        a=dict(attrs);classes=a.get('class','').split();self.classes+=classes
        if a.get('id'):self.ids.append(a['id'])
        if tag=='section':self.sections.append(a.get('id'))
        if tag=='button' and a.get('data-showroom-category'):
            self.gates[a['data-showroom-category']]=a
        if tag=='a' and 'artifact-card' in classes:self.projects.append(a)
        if tag=='a':self.links.append(a.get('href'))
        if tag=='img':self.images.append(a.get('src'))

class OwnerCorrectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=(ROOT/'index.html').read_text();cls.home=Composition(cls.source)
        cls.data=json.loads((ROOT/'catalog/projects.json').read_text())['projects']

    def test_homepage_section_order_matches_owner_composition(self):
        expected=['start','projekty','wyzwania','technologie','o-mnie','kontakt','brief']
        self.assertEqual(expected,[id_ for id_ in self.home.ids if id_ in expected])
        self.assertLess(self.source.index('id="projekty"'),self.source.index('id="o-mnie"'))

    def test_all_categories_and_projects_remain_in_the_dedicated_catalogue(self):
        page=Composition((ROOT/'projekty/index.html').read_text())
        expected={'mobile','saas','platforms','games','web','technology'}
        catalogue=(ROOT/'projekty/index.html').read_text()
        for category in expected:
            self.assertIn('data-filter-category="'+category+'"',catalogue)
        for project in self.data:
            self.assertIn('data-id="'+project['id']+'"',catalogue)
            self.assertIn('href="'+project['slug']+'/"',catalogue)
        featured=[p['data-project-id'] for p in self.home.projects]
        self.assertEqual(len(featured),len(set(featured)))
        self.assertTrue(set(featured).issubset(p['id'] for p in self.data))
        self.assertIn('glikemia-premium',featured)
        self.assertIn('projekty/',self.home.links)

    def test_homepage_has_no_full_catalog_grid_or_selected_project_section(self):
        self.assertNotIn('catalog-grid',self.home.classes)
        self.assertNotIn('catalog-card',self.home.classes)
        self.assertNotIn('Wybrane projekty',self.source)
        self.assertNotIn('selected-work-grid',self.source)

    def test_showroom_preserves_functional_copy_and_exposes_confirmed_development(self):
        spec=importlib.util.spec_from_file_location('owner_showroom_markup',ROOT/'scripts/showroom_markup.py')
        markup=importlib.util.module_from_spec(spec);spec.loader.exec_module(markup)
        rendered=markup.render_showroom(self.data)
        self.assertEqual(len(self.data),rendered.count('data-confirmed-stage='))
        for project in self.data:
            with self.subTest(project=project['id']):
                card=rendered.split('data-project-id="'+project['id']+'"',1)[1].split('</article>',1)[0]
                stage=escape(project.get('stage') or 'Etap do potwierdzenia',quote=True)
                functional=escape(project.get('portfolio',{}).get('functionalStatus') or project.get('stage') or 'Etap do potwierdzenia',quote=True)
                self.assertIn('<span class="showroom-card__stage">'+functional+'</span>',card)
                self.assertIn('data-confirmed-stage="'+stage+'" aria-label="Etap rozwoju: '+stage+'">'+stage+'</span>',card)
                self.assertIn('aria-describedby="showroom-development-'+project['id']+'"',card)
                self.assertIn('id="showroom-development-'+project['id']+'"',card)
        self.assertEqual(1,rendered.count('data-core-close'))
        self.assertIn('data-core-close hidden aria-label="Zamknij rdzeń ProgressKit"',rendered)
        self.assertEqual(1,rendered.count('data-core-status role="status" aria-live="polite" aria-atomic="true"'))

    def test_confirmed_stage_is_escaped_in_both_attribute_and_visible_text(self):
        spec=importlib.util.spec_from_file_location('owner_showroom_escaping',ROOT/'scripts/showroom_markup.py')
        markup=importlib.util.module_from_spec(spec);spec.loader.exec_module(markup)
        project=dict(self.data[0],stage='Beta "preview" <unsafe> & draft')
        rendered=markup.render_showroom([project])
        expected=escape(project['stage'],quote=True)
        self.assertIn('data-confirmed-stage="'+expected+'"',rendered)
        self.assertIn('aria-label="Etap rozwoju: '+expected+'">'+expected+'</span>',rendered)
        self.assertNotIn('<unsafe>',rendered)

    def test_about_ctas_and_single_brief_remain_functional(self):
        self.assertEqual(1,self.home.ids.count('o-mnie'))
        self.assertEqual(1,self.home.ids.count('brief'))
        for id_ in ('problem','users','processes','integrations','budget','deadline'):
            self.assertEqual(1,self.home.ids.count('brief-'+id_))
        for link in ('#kontakt','#brief','#wyzwania','mailto:pawel@progresskit.pl'):
            self.assertIn(link,self.home.links)

    def test_full_search_and_history_are_preserved_under_separate_catalog_address(self):
        index=(ROOT/'projekty/index.html').read_text();page=Composition(index)
        self.assertIn('catalog-filters',page.ids)
        self.assertIn('rozwoj',page.ids)
        self.assertIn('catalog-grid',page.classes)
        self.assertEqual(len(self.data),page.classes.count('catalog-card'))
        self.assertIn('projekty/',self.home.links)
        self.assertNotIn('href="projekty/projekty/',index)

    def test_hero_uses_one_original_mechanism_throughout_the_journey(self):
        self.assertEqual(1,self.home.images.count('assets/brand/optical-core.webp'))
        for leaf in range(1,7):
            self.assertEqual(1,self.home.images.count(f'assets/brand/iris-leaf-{leaf}.webp'))
        self.assertIn('core-sigil',self.home.classes)
        self.assertIn('core-smoked-glass',self.home.classes)
        self.assertNotIn('core-brand',self.home.classes)
        self.assertEqual(1,self.source.count('data-original-mechanism'))
        self.assertEqual(1,self.source.count('data-world-scene'))
        self.assertEqual(1,self.source.count('data-core-activate'))
        self.assertEqual(1,self.home.ids.count('rdzen'))
        self.assertNotIn('data-hero-enter',self.source)
        self.assertNotIn('data-brand-core-mark',self.source)
        self.assertEqual(1,self.home.classes.count('living-identity'))
        brand=json.loads((ROOT/'catalog/brand.json').read_text())
        self.assertEqual('OPEN',brand['ownerVisualApproval'])
        self.assertTrue((ROOT/'assets/brand/progressorkit-stamp.png').is_file())

    def test_publication_is_blocked_until_explicit_owner_approval(self):
        spec=importlib.util.spec_from_file_location('owner_publication_gate',ROOT/'scripts/check-publication.py')
        gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
        self.assertTrue(gate.publication_errors({'ownerVisualApproval':'OPEN','heroSourceStatus':'REVIEWED_EDIT','heroBackground':'assets/brand/hero.webp'}))
        self.assertTrue(gate.publication_errors({'ownerVisualApproval':'APPROVED','heroSourceStatus':'MISSING_APPROVED_ASSET','heroBackground':None}))
        self.assertFalse(gate.publication_errors({'ownerVisualApproval':'APPROVED','heroSourceStatus':'REVIEWED_EDIT','heroBackground':'assets/brand/hero.webp'}))


if __name__=='__main__':
    unittest.main()
