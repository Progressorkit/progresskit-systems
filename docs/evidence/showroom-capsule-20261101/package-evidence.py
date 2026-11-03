from pathlib import Path
from html import escape
import json
import hashlib

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
FINAL=HERE/'final'
featured=[('1440x1050-idle.png','01 · Idle — lewitujący artefakt'),('1440x1050-activated.png','02 · Aktywacja rdzenia — ujawnione soczewki'),('1440x1050-project-hover.png','03 · Hover — relacja z ProgressKit Mail'),('390x844-idle.png','Mobile · Idle'),('390x844-activated.png','Mobile · Tap rdzenia'),('390x844-project-open.png','Mobile · Otwarty projekt')]
def figure(name,label):
    assert (FINAL/name).is_file()
    return f'<figure><a href="final/{escape(name)}"><img loading="lazy" src="final/{escape(name)}" alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>'

gallery='''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ProgressKit — kapsuła showroomu / proof</title><style>*{box-sizing:border-box}body{margin:0;background:#071011;color:#d9e9e5;font:16px/1.6 system-ui,sans-serif}main{max-width:1550px;margin:auto;padding:36px 4vw}h1{font-size:clamp(28px,4vw,56px);line-height:1.1;max-width:24ch}h2{font-size:24px;margin-top:48px}p{max-width:85ch;color:#afc6bf}a{color:#d6f1e6;text-underline-offset:5px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.films{grid-template-columns:2fr 1fr}figure{margin:0;min-width:0;border:1px solid #344948;background:#101b1c}img{display:block;width:100%;max-height:800px;object-fit:contain;object-position:top}video{width:100%;max-height:700px;background:#030809}figcaption{padding:14px}summary{cursor:pointer;padding:20px 0}details{margin-top:24px}:focus-visible{outline:3px solid #d9f3df;outline-offset:4px}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:24px 18px}}</style><main><p>WYŁĄCZNIE SHOWROOM · OWNER VISUAL APPROVAL: OPEN</p><h1>Artefakt ProgressKit. System budzi się.</h1><p>Metal, szkło, logo na osobnej warstwie. Soczewki projektów pojawiają się po aktywacji rdzenia. Katalog, opisy i pozostałe sekcje zachowane.</p><p><a href="http://127.0.0.1:8191/#showroom-track">Otwórz działający showroom ↗</a> · <a href="../../SHOWROOM_CAPSULE_PROOF_20261101.md">Raport zakresu i testów</a></p><h2>Filmy — około 13 sekund każdy</h2><div class="grid films"><figure><video controls preload="metadata" poster="final/1440x1050-idle.png" src="final/desktop-proof.mp4"></video><figcaption>Desktop · 12,96 s · idle, światło, aktywacja, relacja z projektem</figcaption></figure><figure><video controls preload="metadata" poster="final/390x844-idle.png" src="final/mobile-proof.mp4"></video><figcaption>Mobile · 12,80 s · idle, tap rdzenia, otwarcie projektu</figcaption></figure></div><h2>Wymagane stany</h2><div class="grid">'''
gallery+=''.join(figure(*f) for f in featured)+'</div><details><summary>Pozostałe rozdzielczości i kontrola dostępności</summary><div class="grid">'
gallery+=''.join(figure(p.name,p.stem) for p in sorted(FINAL.glob('*.png')) if p.name not in {n for n,_ in featured})
gallery+='</div></details><p>62 sprawdzenia Chrome + 39 testów showroomu: PASS. Mobile jest emulowany. Bez commitu, pushu i wdrożenia. Escape po zamknięciu szczegółów usypia rdzeń.</p></main></html>'
(HERE/'gallery.html').write_text(gallery)
sources=['assets/showroom-capsule.css','assets/showroom-capsule.js','assets/project-showroom.js','scripts/showroom_markup.py','scripts/build-site.py','scripts/stage-public.py','index.html','tests/project-showroom.test.cjs','docs/SHOWROOM_CAPSULE_PROOF_20261101.md']
files=[*(ROOT/p for p in sources),*sorted(FINAL.glob('*')),HERE/'gallery.html',HERE/'scope-check.json']
manifest={str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files if p.is_file()}
(HERE/'manifest.json').write_text(json.dumps({'ownerVisualApproval':'OPEN','files':manifest},indent=2))
print(f'Gallery: {len(list(FINAL.glob("*.png")))} images, 2 films; manifest: {len(manifest)} files')
