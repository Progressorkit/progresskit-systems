"""Catalogue provenance, fallback and HTML safety; runtime behavior is browser-tested."""
import copy
from html import escape
from html.parser import HTMLParser
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result)
    return result
B=module('living_builder','scripts/build-site.py')
L=module('living_markup','scripts/living_markup.py')

class Elements(HTMLParser):
    def __init__(self,source):
        super().__init__();self.elements=[];self.feed(source)
    def handle_starttag(self,tag,attrs):
        self.elements.append((tag,dict(attrs)))

class LivingTests(unittest.TestCase):
    def setUp(self):
        self.data=B.read_catalog();self.markup=L.render(self.data['projects'],B.stage,B.project_url)
        self.page=Elements(self.markup)
    def test_all_nineteen_catalogue_items_have_unique_native_links(self):
        links=[a for tag,a in self.page.elements if 'data-project-id' in a]
        self.assertEqual({p['id'] for p in self.data['projects']},{a['data-project-id'] for a in links})
        self.assertEqual(len(self.data['projects']),len(links))
        for p in self.data['projects']:
            self.assertIn(B.project_url(p),[a['href'] for a in links])
    def test_main_scenes_use_exact_catalogue_facts_and_reviewed_media(self):
        public=module('living_stager','scripts/stage-public.py').public_files()
        for p in self.data['projects']:
            if p['id'] in L.FEATURED:
                self.assertIn(escape(p['summary']),self.markup)
                self.assertIn(escape(p['stage']),self.markup)
        images=[a for tag,a in self.page.elements if tag=='img']
        for a in images:
            self.assertIn(a['src'],public)
            self.assertTrue((ROOT/a['src']).is_file())
        for p in self.data['projects']:
            if p['id'] in ('progresskit-tax','progresskit-remote'):
                self.assertEqual([],p['gallery'])
        self.assertEqual(1,self.markup.count('Nie jest ekranem aplikacji ani telemetrią.'))
        self.assertIn('dane DEMO',self.markup)
        self.assertIn('test bez sieci pocztowej',self.markup)
        self.assertIn('nie render rozgrywki',self.markup)
        self.assertIn('assets/living/tax-documents.webp',self.markup)
    def test_every_chapter_and_marker_has_one_unique_identifier(self):
        ids=[a['id'] for _,a in self.page.elements if 'id' in a]
        self.assertEqual(len(ids),len(set(ids)))
        for p in L.FEATURED:
            self.assertEqual(1,ids.count('scena-'+p))
        self.assertLess(self.markup.index('class="living-intro"'),self.markup.index('id="projekty"'))
        self.assertLess(self.markup.index('id="projekty"'),self.markup.index('id="scena-progresskit-mail"'))
    def test_fallback_contains_all_information_without_dynamic_html_insertion(self):
        self.assertEqual(5,self.markup.count('Pełna prezentacja'))
        self.assertIn('mailto:pawel@progresskit.pl',self.markup)
        controller=(ROOT/'assets/living-experience.mjs').read_text()
        self.assertNotIn('innerHTML',controller)
        self.assertNotIn('eval(',controller)
        self.assertNotIn('setInterval',controller)
        self.assertIn('scope.abort()',controller)
    def test_untrusted_product_copy_is_escaped_in_text_and_attributes(self):
        projects=copy.deepcopy(self.data['projects'])
        p=next(p for p in projects if p['id']=='progresskit-mail')
        payload='<img src=x onerror="alert(1)"> & text'
        p['summary']=payload;p['name']=payload;p['gallery'][0]['alt']=payload
        rendered=L.render(projects,B.stage,B.project_url)
        self.assertNotIn(payload,rendered)
        self.assertIn(escape(payload),rendered)
        self.assertFalse(any('onerror' in a for _,a in Elements(rendered).elements))
    def test_scene_assets_are_local_and_do_not_add_dependencies_or_external_scripts(self):
        output=B.generated(self.data)['index.html']
        scripts=[a['src'] for tag,a in Elements(output).elements if tag=='script']
        self.assertIn('assets/living-experience.mjs',scripts)
        self.assertTrue(all('://' not in src for src in scripts))
        self.assertNotIn('three.module.js',(ROOT/'assets/world-scene.mjs').read_text())

if __name__=='__main__': unittest.main()
