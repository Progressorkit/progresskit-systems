from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOME = (ROOT / 'index.html').read_text(encoding='utf-8')
V4 = (ROOT / 'index.html').read_text(encoding='utf-8')
PRODUCT = (ROOT / 'glikemia-premium' / 'index.html').read_text(encoding='utf-8')
MAIL = (ROOT / 'progresskit-mail' / 'index.html').read_text(encoding='utf-8')
GLIKEMIA_CSS = (ROOT / 'glikemia-premium' / 'product.css').read_text(encoding='utf-8')
MAIL_CSS = (ROOT / 'progresskit-mail' / 'mail.css').read_text(encoding='utf-8')
SHELL_CSS = (ROOT / 'assets' / 'progresskit-product-shell.css').read_text(encoding='utf-8')


def test_v4_is_production_index():
    assert HOME == V4


def test_glikemia_home_cta_uses_counted_backend_route():
    assert 'href="/download/glikemia-premium"' in HOME
    assert 'link-btn--download' in HOME
    assert 'href="downloads/glikemia-premium.apk"' not in HOME
    assert 'href="/downloads/glikemia-premium.apk"' not in HOME


def test_v4_project_inventory_and_branding():
    for marker in ('ProgressKit Mail', 'Adivara', 'GoTransport360', 'Obserwator', 'KAN SYSTEM'):
        assert marker in HOME
    assert 'TECHNOLOGIA MA DAWAĆ KONTROLĘ — NIE NA ODWRÓT.' in HOME
    assert 'TikTok // @progresskit' in HOME
    assert 'facebook.com' not in HOME.lower()


def test_mail_has_dedicated_real_product_page():
    assert 'href="progresskit-mail/"' in HOME
    assert 'mail-inbox-google.webp' in HOME
    for marker in (
        'mail-inbox-google.webp', 'mail-menu.webp', 'mail-account.webp',
        'mail-security.webp', 'mail-splash.webp', 'mail-delete-redacted.webp'
    ):
        assert marker in MAIL
        assert (ROOT / 'assets' / 'projects' / 'mail' / marker).exists()
    assert 'realne wiadomości' in MAIL.lower()
    assert 'treść wiadomości w tle została zamazana' in MAIL.lower()


def test_product_pages_share_progresskit_shell():
    assert "@import url('../assets/progresskit-product-shell.css')" in GLIKEMIA_CSS
    assert "@import url('../assets/progresskit-product-shell.css')" in MAIL_CSS
    assert '--pk-signal:#ef1b2d' in SHELL_CSS
    assert '--product-accent:#79a9c5' in GLIKEMIA_CSS
    assert '--product-accent:#ef4352' in MAIL_CSS
    for page in (PRODUCT, MAIL):
        assert 'ProgressKit Systems' in page
        assert 'progressorkit-stamp.png' in page
        assert 'class="pk-header"' in page
        assert 'class="pk-footer"' in page


def test_product_counter_copy_matches_backend_semantics():
    assert 'Liczba zakończonych pełnych pobrań APK.' in PRODUCT
    assert 'Wznowienia/Range' in PRODUCT
    assert 'prefetch' in PRODUCT
