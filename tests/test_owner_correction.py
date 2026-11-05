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
        if tag=='article' and 'showroom-card' in classes:self.projects.append(a)
        if tag=='a':self.links.append(a.get('href'))
        if tag=='img':self.images.append(a.get('src'))

class OwnerCorrectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=(ROOT/'index.html').read_text();cls.home=Composition(cls.source)
        cls.data=json.loads((ROOT/'catalog/projects.json').read_text())['projects']

    def test_homepage_section_order_matches_owner_composition(self):
        expected=['start','projekty','o-mnie','wyzwania','technologie','kontakt','brief']
        self.assertEqual(expected,[id_ for id_ in self.home.sections if id_ in expected])
        self.assertLess(self.source.index('id="project-hologram"'),self.source.index('id="o-mnie"'))

    def test_all_six_category_filters_use_one_catalog_showroom_without_duplicate_projects(self):
        expected={'mobile','saas','platforms','games','web','technology'}
        self.assertEqual(expected,set(self.home.gates))
        for key,gate in self.home.gates.items():
            with self.subTest(category=key):
                members=[p['id'] for p in self.data if p['category']==key]
                self.assertEqual(members,[p['data-project-id'] for p in self.home.projects if p['data-category']==key])
                self.assertIn(gate['aria-controls'],self.home.ids)
                self.assertEqual('false',gate['aria-pressed'])
                for id_ in members:self.assertIn('projekty/'+id_+'/',self.home.links)
        self.assertEqual(Counter(p['id'] for p in self.data),Counter(p['data-project-id'] for p in self.home.projects))
        payload=re.search(r'<script type="application/json" id="showroom-data">(.*?)</script>',self.source,re.S)
        records=json.loads(payload.group(1))
        self.assertEqual([p['id'] for p in self.data],[p['id'] for p in records])
        allowed={'id','name','category','categoryLabel','summary','problem','stage','technologies','gallery','url'}
        for record,project in zip(records,self.data):
            self.assertEqual(allowed,set(record))
            for key in ('name','category','summary','problem','technologies','gallery'):
                self.assertEqual(project[key],record[key])

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

    def test_hero_preserves_original_logo_and_does_not_invent_missing_landscape(self):
        self.assertIn('aria-label="PROGRESSKIT SYSTEMS"',self.source)
        self.assertIn('data-stone="PROGRESSKIT"',self.source)
        self.assertIn('data-stone="SYSTEMS"',self.source)
        self.assertIn('assets/brand/progressorkit-stamp.png',self.home.images)
        brand=json.loads((ROOT/'catalog/brand.json').read_text())
        if 'hero--installation' in self.home.classes:
            # The retained foyer/Core flow uses a declared procedural environment,
            # rather than the older single landscape SVG. Keep original branding
            # and the real handoff, and require every decorative source locally.
            self.assertIn('data-hero-layout="world"',self.source)
            self.assertIn('data-hero-art="procedural"',self.source)
            self.assertEqual(1,self.home.ids.count('rdzen'))
            core=self.source.split('<section id="rdzen"',1)[1].split('</section>',1)[0]
            self.assertIn('data-hero-enter',core)
            self.assertIn('href="#projekty"',core)
            self.assertIn('src="assets/brand/progressorkit-stamp.png"',core)
            for stylesheet,asset in (
                ('world-continuity.css','installation-chamber.webp'),
                ('hero-entry.css','optical-core.webp'),
            ):
                self.assertIn("world/"+asset,(ROOT/'assets'/stylesheet).read_text())
                self.assertTrue((ROOT/'assets/world'/asset).is_file())
            if brand['heroBackground'] is not None:
                self.assertTrue((ROOT/brand['heroBackground']).is_file())
        elif brand['heroBackground'] is None:
            self.assertIn('data-hero-art="missing"',self.source)
            self.assertIn('No substitute landscape',(ROOT/'assets/hero.css').read_text())
            self.assertEqual('OPEN',brand['ownerVisualApproval'])
        else:
            self.assertTrue((ROOT/brand['heroBackground']).is_file())
            start=self.source.index('<svg class="hero__scene"')
            end=self.source.index('</svg>',start)+len('</svg>')
            scene=ET.fromstring(self.source[start:end])
            ns={'s':'http://www.w3.org/2000/svg'}
            self.assertEqual('0 0 1983 793',scene.attrib['viewBox'])
            landscape=scene.find('s:image',ns)
            self.assertEqual(brand['heroBackground'],landscape.attrib['href'])
            relief=scene.find('s:g[@class="hero__wall-relief"]',ns)
            # The wall projection and scenery share one coordinate system; no new PK path.
            self.assertEqual(['{http://www.w3.org/2000/svg}image'],[child.tag for child in relief])
            self.assertEqual('assets/brand/progressorkit-stamp.png',relief[0].attrib['href'])
            self.assertIn('matrix(',relief.attrib['transform'])

    def test_publication_is_blocked_until_explicit_owner_approval(self):
        spec=importlib.util.spec_from_file_location('owner_publication_gate',ROOT/'scripts/check-publication.py')
        gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
        self.assertTrue(gate.publication_errors({'ownerVisualApproval':'OPEN','heroSourceStatus':'REVIEWED_EDIT','heroBackground':'assets/brand/hero.webp'}))
        self.assertTrue(gate.publication_errors({'ownerVisualApproval':'APPROVED','heroSourceStatus':'MISSING_APPROVED_ASSET','heroBackground':None}))
        self.assertFalse(gate.publication_errors({'ownerVisualApproval':'APPROVED','heroSourceStatus':'REVIEWED_EDIT','heroBackground':'assets/brand/hero.webp'}))


if __name__=='__main__':
    unittest.main()
