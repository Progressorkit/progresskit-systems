"""Offline checks for generated pages and the reviewed public staging boundary."""
import copy
from collections import Counter
import hashlib
from html import escape
from html.parser import HTMLParser
import importlib.util
from pathlib import Path
import re
import struct
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://progresskit.pl'
# These are backend-owned download routes, never files in a static Pages artifact.
BACKEND_ROUTES = {'/download/glikemia-premium', '/downloads/glikemia-premium.apk'}


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILDER = load_module('site_v5_builder', ROOT / 'scripts/build-site.py')
STAGER = load_module('site_v5_stager', ROOT / 'scripts/stage-public.py')


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.ids = []
        self.headings = []
        self.title = ''
        self.text = []
        self._heading = None
        self._in_title = False
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.elements.append((tag, values))
        if 'id' in values:
            self.ids.append(values['id'])
        if re.fullmatch(r'h[1-6]', tag):
            self._heading = [int(tag[1]), '']
        if tag == 'title':
            self._in_title = True

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if re.fullmatch(r'h[1-6]', tag) and self._heading is not None:
            self.headings.append(tuple(self._heading))
            self._heading = None
        if tag == 'title':
            self._in_title = False

    def handle_data(self, data):
        self.text.append(data)
        if self._heading is not None:
            self._heading[1] += data
        if self._in_title:
            self.title += data

    def metadata(self, key, attribute='name'):
        return [attrs.get('content', '') for tag, attrs in self.elements
                if tag == 'meta' and attrs.get(attribute) == key]

    def links(self, rel=None):
        return [attrs.get('href', '') for tag, attrs in self.elements
                if tag == 'link' and (rel is None or attrs.get('rel') == rel)]


def local_target(page_name, reference):
    """Resolve as the browser does; return a public file and optional fragment."""
    current = ORIGIN + '/' + page_name
    if page_name.endswith('index.html'):
        current = current[:-len('index.html')]
    resolved = urlsplit(urljoin(current, reference))
    if resolved.scheme not in ('http', 'https') or resolved.netloc != 'progresskit.pl':
        return None
    if resolved.path in BACKEND_ROUTES:
        return None
    path = unquote(resolved.path).lstrip('/')
    if not path or path.endswith('/'):
        path += 'index.html'
    return path, unquote(resolved.fragment)


def image_dimensions(path):
    """Read PNG/JPEG/WebP dimensions without an optional imaging dependency."""
    raw = path.read_bytes()
    if raw.startswith(b'\x89PNG\r\n\x1a\n') and raw[12:16] == b'IHDR':
        return struct.unpack('>II', raw[16:24])
    if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        offset = 12
        while offset + 8 <= len(raw):
            kind = raw[offset:offset + 4]
            length = int.from_bytes(raw[offset + 4:offset + 8], 'little')
            chunk = raw[offset + 8:offset + 8 + length]
            if kind == b'VP8X':
                return 1 + int.from_bytes(chunk[4:7], 'little'), 1 + int.from_bytes(chunk[7:10], 'little')
            if kind == b'VP8 ' and chunk[3:6] == b'\x9d\x01\x2a':
                return int.from_bytes(chunk[6:8], 'little') & 0x3fff, int.from_bytes(chunk[8:10], 'little') & 0x3fff
            if kind == b'VP8L' and chunk[:1] == b'\x2f':
                packed = int.from_bytes(chunk[1:5], 'little')
                return 1 + (packed & 0x3fff), 1 + ((packed >> 14) & 0x3fff)
            offset += 8 + length + (length % 2)
    if raw.startswith(b'\xff\xd8'):
        offset = 2
        sof_markers = {0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf}
        while offset + 4 <= len(raw):
            if raw[offset] != 0xff:
                raise ValueError('Invalid JPEG marker in ' + str(path))
            while offset < len(raw) and raw[offset] == 0xff:
                offset += 1
            marker = raw[offset]
            offset += 1
            if marker in {0x01, 0xd8, 0xd9} or 0xd0 <= marker <= 0xd7:
                continue
            length = int.from_bytes(raw[offset:offset + 2], 'big')
            if marker in sof_markers:
                return int.from_bytes(raw[offset + 5:offset + 7], 'big'), int.from_bytes(raw[offset + 3:offset + 5], 'big')
            if length < 2:
                break
            offset += length
    raise ValueError('Unsupported or malformed image: ' + str(path))


class SiteV5Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = BUILDER.read_catalog()
        cls.outputs = BUILDER.generated(cls.data)
        cls.html = {name: value for name, value in cls.outputs.items() if name.endswith('.html')}
        cls.pages = {name: Page(value) for name, value in cls.html.items()}
        cls.public = set(STAGER.public_files())

    def test_catalog_and_generated_files_are_consistent(self):
        self.assertEqual([], BUILDER.validate_catalog(self.data))
        for name, expected in self.outputs.items():
            with self.subTest(file=name):
                self.assertTrue((ROOT / name).is_file(), 'Generated file is missing.')
                self.assertEqual(expected, (ROOT / name).read_text(), 'Generated file is stale.')
                self.assertNotIn('@@', expected, 'Unfilled template slot.')

    def test_all_catalog_projects_have_generated_and_staged_case_pages(self):
        for project in self.data['projects']:
            route = 'projekty/' + project['slug'] + '/index.html'
            with self.subTest(project=project['id']):
                self.assertIn(route, self.pages)
                self.assertIn(route, self.public)
        for route in ('index.html', '404.html', 'progresskit-mail/index.html',
                      'glikemia-premium/index.html', 'prywatnosc/index.html'):
            self.assertIn(route, self.pages)
            self.assertIn(route, self.public)

    def test_technology_groups_keep_every_catalog_filter_once_with_real_counts(self):
        projects = self.data['projects']
        expected = Counter(technology for project in projects for technology in set(project['technologies']))
        markup = BUILDER.technology_section(projects)
        page = Page(markup)
        links = [attrs['href'] for tag, attrs in page.elements
                 if tag == 'a' and 'technology-chip' in attrs.get('class', '').split()]
        technologies = [parse_qs(urlsplit(href).query)['technologia'][0] for href in links]
        self.assertCountEqual(expected.keys(), technologies)
        self.assertEqual(len(expected), len(set(technologies)))
        for technology, count in expected.items():
            self.assertIn(f'>{escape(technology)} <span>{count}</span></a>', markup)

    def test_unknown_technologies_remain_filterable_and_escape_public_markup(self):
        technology = 'Future <tool> & C#'
        markup = BUILDER.technology_section([{'technologies': [technology, technology]}])
        page = Page(markup)
        links = [attrs['href'] for tag, attrs in page.elements if tag == 'a' and 'technology-chip' in attrs.get('class', '').split()]
        self.assertEqual(1, len(links))
        self.assertEqual([technology], parse_qs(urlsplit(links[0]).query)['technologia'])
        self.assertIn('Inne', ''.join(page.text))
        self.assertIn('Future &lt;tool&gt; &amp; C# <span>1</span>', markup)
        self.assertFalse(any(tag == 'tool' for tag, attrs in page.elements))

    def test_unique_ids_and_one_primary_heading_per_page(self):
        for name, page in self.pages.items():
            with self.subTest(page=name):
                duplicates = [key for key, count in Counter(page.ids).items() if count > 1]
                self.assertEqual([], duplicates, 'Duplicate IDs break fragment and ARIA references.')
                self.assertEqual(1, sum(level == 1 for level, _ in page.headings))
                self.assertTrue(all(text.strip() for _, text in page.headings), 'Empty heading.')

    def test_heading_hierarchy_does_not_skip_levels(self):
        for name, page in self.pages.items():
            previous = 0
            for level, text in page.headings:
                with self.subTest(page=name, heading=text):
                    self.assertLessEqual(level, previous + 1, 'Heading hierarchy skips a level.')
                previous = level

    def test_every_local_href_and_src_resolves_in_public_artifact(self):
        for name, page in self.pages.items():
            for tag, attrs in page.elements:
                for attribute in ('href', 'src'):
                    value = attrs.get(attribute)
                    if not value:
                        continue
                    target = local_target(name, value)
                    if target is None:
                        continue
                    file, fragment = target
                    with self.subTest(page=name, tag=tag, attribute=attribute, reference=value):
                        self.assertIn(file, self.public, 'Local reference is absent from the public allowlist.')
                        self.assertTrue((ROOT / file).is_file(), 'Local reference has no source file.')
                        if fragment:
                            self.assertIn(file, self.pages, 'Fragment targets a non-HTML document.')
                            self.assertIn(fragment, self.pages[file].ids, 'Fragment target is missing.')

    def test_aria_and_form_id_references_resolve(self):
        for name, page in self.pages.items():
            for tag, attrs in page.elements:
                for attribute in ('aria-controls', 'aria-labelledby', 'aria-describedby', 'for'):
                    for reference in attrs.get(attribute, '').split():
                        with self.subTest(page=name, tag=tag, attribute=attribute, reference=reference):
                            self.assertIn(reference, page.ids)

    def test_metadata_and_primary_headings_match_each_catalog_project(self):
        canonicals = []
        for project in self.data['projects']:
            route = 'projekty/' + project['slug'] + '/'
            page = self.pages[route + 'index.html']
            expected = ORIGIN + '/' + route
            with self.subTest(project=project['id']):
                self.assertIn(project['name'], page.title)
                self.assertEqual([(1, project['name'])], [item for item in page.headings if item[0] == 1])
                self.assertEqual([project['summary']], page.metadata('description'))
                self.assertEqual([expected], page.links('canonical'))
                self.assertEqual([expected], page.metadata('og:url', 'property'))
                self.assertEqual([project['summary']], page.metadata('og:description', 'property'))
                self.assertEqual([page.title], page.metadata('og:title', 'property'))
                self.assertEqual([ORIGIN + '/og-progresskit.jpg'], page.metadata('og:image', 'property'))
            canonicals += page.links('canonical')
        self.assertEqual(len(canonicals), len(set(canonicals)))

    def test_every_page_has_search_and_social_metadata(self):
        for name, page in self.pages.items():
            with self.subTest(page=name):
                self.assertTrue(page.title.strip())
                self.assertEqual(1, len(page.metadata('description')))
                self.assertTrue(page.metadata('description')[0].strip())
                self.assertEqual(1, len(page.links('canonical')))
                for key in ('og:title', 'og:description', 'og:url', 'og:image'):
                    self.assertEqual(1, len(page.metadata(key, 'property')), key)
        self.assertIn('noindex', self.pages['404.html'].metadata('robots'))

    def test_homepage_links_to_all_cases_and_cases_expose_evidence(self):
        home_links = {attrs.get('href') for tag, attrs in self.pages['index.html'].elements if tag == 'a'}
        for project in self.data['projects']:
            with self.subTest(project=project['id']):
                self.assertIn('projekty/' + project['slug'] + '/', home_links)
                page = self.pages['projekty/' + project['slug'] + '/index.html']
                for source in project['sources']:
                    self.assertIn('source-' + source['id'], page.ids)
                for case in project['cases']:
                    self.assertIn('source-' + case['source'], page.ids)
                for section in ('problem', 'architektura', 'funkcje', 'galeria', 'wyzwania', 'rozwoj', 'dostep', 'zrodla'):
                    self.assertIn(section, page.ids)

    def test_blank_target_links_use_opener_protection(self):
        for name, page in self.pages.items():
            for tag, attrs in page.elements:
                if tag == 'a' and attrs.get('target') == '_blank':
                    with self.subTest(page=name, href=attrs.get('href')):
                        self.assertTrue({'noopener', 'noreferrer'} <= set(attrs.get('rel', '').split()))

    def test_media_dimensions_and_descriptions_match_real_local_assets(self):
        actual = {}
        for name, page in self.pages.items():
            for tag, attrs in page.elements:
                if tag != 'img' or not attrs.get('src'):
                    continue  # Native gallery placeholder has no image until opened.
                with self.subTest(page=name, image=attrs['src']):
                    self.assertIn('alt', attrs)
                    self.assertRegex(attrs.get('width', ''), r'^[1-9][0-9]*$')
                    self.assertRegex(attrs.get('height', ''), r'^[1-9][0-9]*$')
                    target = local_target(name, attrs['src'])
                    self.assertIsNotNone(target, 'Screenshots must be hosted locally.')
                    file, _ = target
                    if file not in actual:
                        actual[file] = image_dimensions(ROOT / file)
                    width, height = actual[file]
                    declared = int(attrs['width']) / int(attrs['height'])
                    self.assertAlmostEqual(width / height, declared, delta=0.002,
                                           msg='Declared dimensions reserve the wrong aspect ratio.')
        for project in self.data['projects']:
            for image in project['gallery']:
                with self.subTest(catalog_image=image['src']):
                    self.assertEqual((image['width'], image['height']), image_dimensions(ROOT / image['src']))

    def test_sitemap_contains_every_public_canonical_case(self):
        tree = ET.fromstring(self.outputs['sitemap.xml'])
        namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [node.text for node in tree.findall('s:url/s:loc', namespace)]
        self.assertEqual(len(urls), len(set(urls)))
        for project in self.data['projects']:
            self.assertIn(ORIGIN + '/projekty/' + project['slug'] + '/', urls)
        for url in urls:
            target = local_target('index.html', url)
            self.assertIsNotNone(target)
            self.assertIn(target[0], self.public)
        self.assertNotIn(ORIGIN + '/404.html', urls)

    def test_public_allowlist_excludes_private_source_and_unreviewed_media(self):
        forbidden = {'docs', 'analytics', 'catalog', 'templates', 'scripts', 'tests',
                     '.git', '.agents', '.codex', '.aws', 'downloads', 'deploy', 'infra'}
        for name in self.public:
            with self.subTest(file=name):
                path = Path(name)
                self.assertFalse(path.is_absolute())
                self.assertNotIn('..', path.parts)
                self.assertFalse(forbidden.intersection(path.parts))
                if name == 'assets/brand/progresskit-core-mark.webm':
                    # Only this recorded public Core is allowed. Private/product
                    # footage keeps the general video ban below; pin the render
                    # so replacing its contents requires an explicit review.
                    self.assertEqual(hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
                                     'ac12d42a65b4c354839dfb305357f40330231de75dd8eda0c1f692c43fa0b733')
                else:
                    self.assertNotIn(path.suffix, {'.sqlite', '.db', '.json', '.log', '.apk', '.zip', '.mp4', '.webm', '.env'})
                self.assertTrue((ROOT / path).is_file())
                self.assertFalse((ROOT / path).is_symlink())
        # Files appearing in assets or a repository directory do not imply review.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'catalog').mkdir()
            (root / 'catalog/projects.json').write_text((ROOT / 'catalog/projects.json').read_text())
            (root / 'catalog/brand.json').write_text((ROOT / 'catalog/brand.json').read_text())
            decoys = ['docs/private-report.txt', 'analytics/private.db',
                      'assets/projects/raw/production-capture.png',
                      'assets/cinematic/user-preview.mp4', 'assets/cinematic/unreviewed.webm',
                      'unreviewed-original.png']
            for name in decoys:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b'synthetic unreviewed fixture')
            with patch.object(STAGER, 'ROOT', root):
                listed = set(STAGER.public_files())
            self.assertTrue(set(decoys).isdisjoint(listed))

    def test_styles_and_svg_materials_have_only_staged_local_dependencies(self):
        for name in self.public:
            if name.endswith('.css'):
                references=re.findall(r'url\(\s*[\'\"]?([^\'\"\)\s]+)',(ROOT/name).read_text())
            elif name.endswith('.svg'):
                tree=ET.fromstring((ROOT/name).read_text())
                references=[value for node in tree.iter() for key,value in node.attrib.items() if key.endswith('href')]
            else:
                continue
            for reference in references:
                if reference.startswith('#'):
                    continue
                with self.subTest(file=name,reference=reference):
                    target=local_target(name,reference)
                    self.assertIsNotNone(target,'Visual materials must not fetch external resources.')
                    self.assertIn(target[0],self.public,'CSS/SVG dependency is missing from release allowlist.')
                    self.assertTrue((ROOT/target[0]).is_file())

    def test_staged_artifact_matches_manifest_and_source_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / 'public'
            included = STAGER.stage(destination)
            staged = {str(path.relative_to(destination)) for path in destination.rglob('*') if path.is_file()}
            self.assertEqual(self.public, set(included))
            self.assertEqual(self.public, staged)
            self.assertTrue(set(self.outputs) <= staged)
            for name in staged:
                with self.subTest(file=name):
                    self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).digest(),
                                     hashlib.sha256((destination / name).read_bytes()).digest())
            with self.assertRaisesRegex(ValueError, 'Destination must not exist'):
                STAGER.stage(destination)

    def test_catalog_text_is_escaped_in_generated_markup_and_metadata(self):
        changed = copy.deepcopy(self.data)
        project = next(item for item in changed['projects'] if item['gallery'] and item['cases'])
        payload = '\"><script id="catalog-xss-probe">window.catalogXss=1</script><img src=x onerror="window.catalogXss=1">&'
        for key in ('name', 'summary', 'problem', 'solution', 'motivation'):
            project[key] = payload
        for key in ('audiences', 'features', 'technologies', 'architecture', 'results', 'planned', 'remaining'):
            project[key] = [payload]
        if 'portfolio' in project:
            project['portfolio']['featureSources'] = [project['portfolio']['featureSources'][0]]
        project['gallery'][0]['alt'] = payload
        project['gallery'][0]['caption'] = payload
        project['sources'][0]['label'] = payload
        for key in ('problem', 'diagnosis', 'rootCause', 'solution', 'verification', 'result'):
            project['cases'][0][key] = payload
        self.assertEqual([], BUILDER.validate_catalog(changed))
        outputs = BUILDER.generated(changed)
        self.assertIn(escape(payload, quote=True), outputs['projekty/' + project['slug'] + '/index.html'])
        for name, markup in outputs.items():
            if not name.endswith('.html'):
                continue
            page = Page(markup)
            with self.subTest(page=name):
                baseline_scripts = [attrs for tag, attrs in self.pages[name].elements if tag == 'script']
                self.assertEqual(baseline_scripts, [attrs for tag, attrs in page.elements if tag == 'script'])
                self.assertNotIn('catalog-xss-probe', page.ids)
                for _, attrs in page.elements:
                    self.assertFalse(any(key.lower().startswith('on') for key in attrs), 'Text escaped into an event handler.')


if __name__ == '__main__':
    unittest.main()
