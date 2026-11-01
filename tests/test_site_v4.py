"""V4 compatibility contracts retained by V5 (stdlib unittest, seven checks).

The origin/main predecessor contained six pytest functions. Its HOME == V4
check compared one file with itself; this replacement verifies the actual V4
CSS and brand bytes. The six prior intentions remain, with a seventh explicit
check for both supported legacy product URLs and their public staging.

Intentional V5 changes: the counted APK CTA lives on the retained distribution
page instead of every ecosystem card; Mail uses the common V5 shell; its two
reviewed V4 screenshots replace raw inbox/account images under the owner's
privacy requirement. Counter copy still describes completed full transfers,
with resume/Range and detectable prefetch excluded. Runtime counter behavior
is exercised separately by test_product.py; these are site compatibility tests.
"""
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import unittest
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class Markup(HTMLParser):
    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.text = []
        self.feed(content)
        self.close()

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, value):
        self.text.append(value)

    def references(self, tag, attribute):
        return [attrs[attribute] for element, attrs in self.elements
                if element == tag and attrs.get(attribute)]


class SiteV4CompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.home = (ROOT / 'index.html').read_text()
        cls.product = (ROOT / 'glikemia-premium/index.html').read_text()
        cls.mail = (ROOT / 'progresskit-mail/index.html').read_text()
        cls.pages = {name: Markup(value) for name, value in
                     [('home', cls.home), ('product', cls.product), ('mail', cls.mail)]}
        cls.catalog = json.loads((ROOT / 'catalog/projects.json').read_text())['projects']
        spec = importlib.util.spec_from_file_location('v4_compat_public_stager', ROOT / 'scripts/stage-public.py')
        stager = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(stager)
        cls.public_files = set(stager.public_files())

    def test_v4_style_and_brand_assets_are_actually_preserved(self):
        # Frozen from origin/main V4; the inline CSS was compared before extraction.
        expected = {
            'assets/brand/progressorkit-primary.png': '29875e2751973261055c4d75c436b17db0cab413b53f996f5c476ae447cf6532',
            'assets/brand/progressorkit-stamp.png': 'b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3',
        }
        for name, digest in expected.items():
            with self.subTest(asset=name):
                self.assertEqual(digest, hashlib.sha256((ROOT / name).read_bytes()).hexdigest())
                self.assertIn(name, self.public_files)
        # Owner selected the original copper desktop variant for all visible brand signatures.
        self.assertIn('assets/brand/progressorkit-stamp.png', self.pages['home'].references('img', 'src'))
        retained_css = (ROOT / 'assets/site-v4.css').read_text().strip()
        self.assertEqual('e3831e7e735b90303ecbdd8524e02ebc82ada52d513ec7de4b19c74371385f9a',
                         hashlib.sha256(retained_css.encode()).hexdigest())
        styles = self.pages['home'].references('link', 'href')
        self.assertIn('assets/site-v4.css', styles)
        self.assertIn('assets/site-v5.css', styles)
        self.assertLess(styles.index('assets/site-v4.css'), styles.index('assets/site-v5.css'))

    def test_glikemia_distribution_cta_keeps_counted_backend_route(self):
        home_links = self.pages['home'].references('a', 'href')
        self.assertIn('glikemia-premium/', home_links)
        product_links = self.pages['product'].references('a', 'href')
        self.assertIn('/download/glikemia-premium', product_links)
        for name, page in self.pages.items():
            with self.subTest(page=name):
                for reference in page.references('a', 'href'):
                    path = urlsplit(reference).path
                    self.assertFalse(path.endswith('.apk'), 'A raw APK link bypasses the counted distribution route.')
                    if path.startswith('/download/'):
                        self.assertEqual('/download/glikemia-premium', path)
        backend = (ROOT / 'analytics/product.py').read_text()
        self.assertIn("@router.get('/download/glikemia-premium')", backend)
        self.assertIn("@router.get('/downloads/glikemia-premium.apk')", backend)
        caddy = (ROOT / 'analytics/deploy/Caddyfile.snippet').read_text()
        self.assertIn('handle /progresskit-mail/*', caddy)
        self.assertIn('redir /progresskit-mail /progresskit-mail/ 308', caddy)

    def test_v4_inventory_and_brand_message_remain_discoverable(self):
        expected = {'progresskit-mail': 'ProgressKit Mail', 'adivara': 'Adivara',
                    'gotrans360': 'GoTrans360', 'obserwator': 'Obserwator', 'kan-system': 'KAN SYSTEM'}
        records = {project['id']: project for project in self.catalog}
        case_links = set(self.pages['home'].references('a', 'href'))
        for identifier, name in expected.items():
            with self.subTest(project=identifier):
                self.assertIn('projekty/' + identifier + '/', case_links)
                self.assertIn(name, records[identifier]['name'])
                self.assertIn(name, self.home)
        words = re.sub(r'\W+', ' ', ' '.join(self.pages['home'].text)).upper()
        self.assertIn('TECHNOLOGIA MA DAWAĆ KONTROLĘ NIE NA ODWRÓT', words)
        self.assertIn('TikTok: @progresskit', self.home)
        self.assertNotIn('facebook.com', self.home.lower())

    def test_mail_keeps_genuine_reviewed_gallery_without_raw_correspondence(self):
        self.assertIn('progresskit-mail/', self.pages['home'].references('a', 'href'))
        expected = {
            'assets/projects/mail/mail-splash.webp': '5d27885a07a088746087e821c9f70e798a9e96427f87d050c4fe5bd81929c5a1',
            'assets/projects/mail/mail-delete-redacted.webp': 'e06c9fa6cedebd5d3268be0c871f95bd300a36ccba066cba61649b186a6fb261',
        }
        project = next(item for item in self.catalog if item['id'] == 'progresskit-mail')
        self.assertEqual(set(expected), {image['src'] for image in project['gallery']})
        displayed = {urlsplit(urljoin('https://progresskit.pl/progresskit-mail/', source)).path.lstrip('/')
                     for source in self.pages['mail'].references('img', 'src')}
        for name, digest in expected.items():
            with self.subTest(screenshot=name):
                self.assertEqual(digest, hashlib.sha256((ROOT / name).read_bytes()).hexdigest())
                self.assertIn(name, displayed)
                self.assertIn(name, self.public_files)
        for raw in ('mail-inbox-google.webp', 'mail-menu.webp', 'mail-account.webp', 'mail-security.webp'):
            with self.subTest(excluded=raw):
                self.assertNotIn(raw, self.home)
                self.assertNotIn(raw, self.mail)
                self.assertFalse(any(Path(name).name == raw for name in self.public_files))
        captions = ' '.join(image['caption'] for image in project['gallery']).lower()
        self.assertIn('rzeczywisty ekran', captions)
        self.assertIn('zamazane', captions)
        self.assertIn('Wersja testowa', self.mail)
        self.assertIn('bez ponowienia w audycie z 23.10.2026', self.mail)
        self.assertIn('publicznego linku pobrania Mail nie potwierdzono', self.mail)

    def test_product_pages_share_brand_navigation_and_contact(self):
        shell = (ROOT / 'assets/progresskit-product-shell.css').read_text()
        product_css = (ROOT / 'glikemia-premium/product.css').read_text()
        site_css = (ROOT / 'assets/site-v5.css').read_text()
        self.assertIn("@import url('../assets/progresskit-product-shell.css')", product_css)
        self.assertIn('--pk-signal:#ef1b2d', shell)
        self.assertIn('--product-accent:#79a9c5', product_css)
        mail_accent = re.search(r'\.catalog-card\[data-id="progresskit-mail"\]\s*\{[^}]*--product-accent:(#[0-9a-fA-F]{6})', site_css)
        self.assertIsNotNone(mail_accent, 'Mail lost its product accent.')
        red, green, blue = (int(mail_accent.group(1)[i:i + 2], 16) for i in (1, 3, 5))
        self.assertGreater(red, green)
        self.assertGreater(red, blue)
        for name in ('product', 'mail'):
            page = self.pages[name]
            with self.subTest(page=name):
                self.assertIn('progresskit systems', ' '.join(page.text).lower())
                self.assertTrue(any(Path(urlsplit(src).path).name == 'progressorkit-stamp.png'
                                    for src in page.references('img', 'src')))
                self.assertTrue(any(tag == 'header' for tag, _ in page.elements))
                self.assertTrue(any(tag == 'footer' for tag, _ in page.elements))
                self.assertIn('mailto:pawel@progresskit.pl', page.references('a', 'href'))
        self.assertIn('../assets/site-v4.css', self.pages['mail'].references('link', 'href'))
        self.assertIn('../assets/site-v5.css', self.pages['mail'].references('link', 'href'))

    def test_counter_copy_and_reader_keep_completed_full_transfer_semantics(self):
        for phrase in ('Liczba zakończonych pełnych pobrań APK.', 'Wznowienia/Range', 'prefetch',
                       'nie jest liczba unikalnych użytkowników ani instalacji'):
            self.assertIn(phrase, self.product)
        counters = [attrs for _, attrs in self.pages['product'].elements if 'data-download-count' in attrs]
        self.assertGreaterEqual(len(counters), 1)
        reader = (ROOT / 'glikemia-premium/product.js').read_text()
        self.assertIn("getJSON('/api/glikemia/downloads')", reader)
        self.assertIn('Number.isSafeInteger(data.downloads)', reader)
        self.assertIn("credentials: 'omit'", reader)
        self.assertIn('Licznik pobrań chwilowo niedostępny', reader)

    def test_legacy_product_urls_stay_public_with_correct_canonical_targets(self):
        expected = {
            'glikemia-premium/index.html': ('product', 'https://progresskit.pl/glikemia-premium/'),
            'progresskit-mail/index.html': ('mail', 'https://progresskit.pl/projekty/progresskit-mail/'),
        }
        for name, (key, canonical) in expected.items():
            with self.subTest(legacy_route=name):
                self.assertTrue((ROOT / name).is_file())
                self.assertIn(name, self.public_files)
                actual = [attrs.get('href') for tag, attrs in self.pages[key].elements
                          if tag == 'link' and attrs.get('rel') == 'canonical']
                self.assertEqual([canonical], actual)
        self.assertIn('projekty/progresskit-mail/index.html', self.public_files)
        self.assertTrue((ROOT / 'projekty/progresskit-mail/index.html').is_file())


if __name__ == '__main__':
    unittest.main()
