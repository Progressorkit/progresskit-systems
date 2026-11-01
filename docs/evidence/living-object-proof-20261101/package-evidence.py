"""Build a portable, private evidence gallery and SHA-256 manifest."""
from pathlib import Path
from html import escape
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FINAL = HERE / 'final'
featured = [
    ('1440x900-hero.png', '01 · Hero — aluminium, szkło, krajobraz'),
    ('1440x900-whole-module.png', '02 · Glikemia — cały otwarty moduł'),
    ('1440x900-connection.png', '03 · Przewód i fragment ekosystemu'),
    ('light-left.png', 'Światło z lewej / cień w prawo'),
    ('light-right.png', 'Światło z prawej / cień w lewo'),
    ('device-half-open.png', 'Osłony podczas otwierania'),
    ('390x844-hero.png', 'Mobile · Hero'),
    ('390x844-whole-module.png', 'Mobile · Moduł z opisem poniżej'),
    ('390x844-connection.png', 'Mobile · Przejście do ekosystemu'),
]

def figure(name, label):
    assert (FINAL / name).is_file(), name
    return f'<figure><a href="final/{escape(name)}"><img src="final/{escape(name)}" loading="lazy" alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>'

extra = [(p.name, p.stem) for p in sorted(FINAL.glob('*.png')) if p.name not in {n for n, _ in featured}]
gallery = '''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ProgressKit — proof of direction / dowody</title>
<style>*{box-sizing:border-box}body{margin:0;background:#081011;color:#d7e4e2;font:16px/1.6 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:36px 4vw}h1{font-size:clamp(28px,4vw,58px);line-height:1.1;max-width:24ch}h2{font-size:24px;margin-top:50px}p{max-width:82ch;color:#a8bcba}a{color:#d9f2e9;text-underline-offset:4px}video{width:100%;max-height:75vh;background:#020505}figure{margin:0;min-width:0;background:#101a1c;border:1px solid #294041}figure img{display:block;width:100%;height:auto;max-height:850px;object-fit:contain;object-position:top;background:#030707}figcaption{padding:14px 18px;color:#adc5c0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.films{grid-template-columns:2fr 1fr}details{margin-top:40px}summary{cursor:pointer;padding:18px 0}:focus-visible{outline:3px solid #d2f6e8;outline-offset:4px}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:25px 18px}figure img{max-height:700px}}</style>
<main><p>LOKALNY PROOF OF DIRECTION · 01—03 · OWNER VISUAL APPROVAL: OPEN</p><h1>Materiał. Mechanika. Jedna przestrzeń.</h1><p>Hero, jeden moduł Glikemii i fragment przejścia do ekosystemu. Oryginalna marka i prawdziwy ekran produktu. Zrzuty oraz filmy z lokalnego Chrome; mobile jest emulowany.</p><p><a href="http://127.0.0.1:8194/proof-of-direction/">Otwórz działający prototyp ↗</a> · <a href="../../PROGRESSKIT_LIVING_OBJECT_PROOF_20261101.md">Raport i zakres</a></p>
<h2>Ruch i interakcja</h2><div class="grid films"><figure><video controls preload="metadata" poster="final/1440x900-hero.png" src="final/desktop-proof.mp4"></video><figcaption>Desktop · 40 s · 1440×1000 · światło, cień, osłony, przewód</figcaption></figure><figure><video controls preload="metadata" poster="final/390x844-hero.png" src="final/mobile-proof.mp4"></video><figcaption>Mobile · 26 s · 390×960 · spokojniejszy ruch i otwieranie dotykiem</figcaption></figure></div>
<h2>Trzy elementy i detale materiału</h2><div class="grid">'''
gallery += ''.join(figure(*entry) for entry in featured)
gallery += '</div><details><summary>Pozostałe rozdzielczości, stany i dostępność</summary><div class="grid">'
gallery += ''.join(figure(*entry) for entry in extra)
gallery += '</div></details><p>72 sprawdzenia Chrome + 8 testów serwera: PASS. Istniejące 189 plików źródłowych: bez zmian bajtowych. Nie wykonano commitu, pushu ani wdrożenia.</p></main></html>'
(HERE / 'gallery.html').write_text(gallery)
files = [*sorted((ROOT/'prototypes/living-object').glob('*')), *sorted(FINAL.glob('*')), HERE/'gallery.html', ROOT/'docs/PROGRESSKIT_LIVING_OBJECT_PROOF_20261101.md']
manifest = {str(p.relative_to(ROOT)): {'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files if p.is_file()}
(HERE / 'manifest.json').write_text(json.dumps({'ownerVisualApproval':'OPEN','files':manifest},indent=2))
print(f'Gallery: {len(featured)+len(extra)} screenshots, 2 films; manifest: {len(manifest)} files')
