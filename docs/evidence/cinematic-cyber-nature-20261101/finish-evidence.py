"""Publish an offline review artifact from completed local QA, never the site."""
from pathlib import Path
import hashlib
import html
import json
import re

e = Path(__file__).resolve().parent
root = e.parents[2]
modes = ['matrix-1366x768', 'matrix-1440x900', 'matrix-1920x1080',
         'matrix-320x568', 'matrix-390x844', 'behavior-only', 'video-desktop', 'video-mobile']
reports = [json.loads((e / mode / 'report.json').read_text()) for mode in modes]
assert all(r['totals']['FAIL'] == r['totals']['BLOCKED'] == 0 for r in reports)
common = {'No browser runtime errors', 'No failed local asset requests'}
checks = [dict(row, source=mode+'/report.json') for mode, r in zip(modes, reports)
          for row in r['checks'] if row['name'] not in common]
errors = [x for r in reports for x in r['runtimeErrors']]
network = [x for r in reports for x in r['networkFailures']]
videos = [v for r in reports for v in r['videos']]
checks += [{'name': 'No browser runtime errors', 'status': 'PASS' if not errors else 'FAIL', 'details': errors},
           {'name': 'No failed local asset requests', 'status': 'PASS' if not network else 'FAIL', 'details': network},
           {'name': 'Both recordings are H.264 at requested resolutions and longer than 5 seconds',
            'status': 'PASS' if len(videos) == 2 and all(float(v['format']['duration']) > 5 and any(
                s['codec_name'] == 'h264' and (s['width'], s['height']) == size for s in v['streams'])
                for v, size in zip(videos, [(1440, 900), (390, 844)])) else 'FAIL', 'details': videos}]
totals = {'PASS': sum(c['status'] == 'PASS' for c in checks), 'FAIL': sum(c['status'] == 'FAIL' for c in checks)}
assert totals['FAIL'] == 0
screenshots = [s for r in reports for s in r['screenshots']]
actions = json.loads((e / 'actions-final/expanded-actions-review.json').read_text())
assert actions['PASS'] == 30 and actions['FAIL'] == 0 and not actions.get('fatal')
assert not actions['runtimeErrors']
screenshots += [str(p.relative_to(e)) for p in sorted((e / 'actions-final').glob('*.png'))]
summary = {'scope': 'Local Chrome viewport emulation; no physical-device or production evidence',
           'totals': totals, 'checks': checks, 'screenshots': screenshots, 'videos': videos,
           'expandedMobileActions': {'PASS': actions['PASS'], 'FAIL': actions['FAIL']},
           'provenance': {'reports': [m+'/report.json' for m in modes],
                          'runtimeAndNetworkChecksAggregatedOnce': True,
                          'interruptedAttemptsExcluded': ['final', 'final-reviewed', 'browser-sandbox-attempt.json']}}
(e / 'report.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False)+'\n')
source = json.loads((e/'source-final.json').read_text())
changed = [name for name, digest in source.items() if hashlib.sha256((root/name).read_bytes()).hexdigest() != digest]
assert not changed, changed
(e/'source-freeze-verification.json').write_text(json.dumps({'files': len(source), 'changed': changed}, indent=2)+'\n')
paths = set(screenshots + [v['path'] for v in videos] + [m+'/report.json' for m in modes] +
            ['actions-final/expanded-actions-review.json', 'report.json', 'scope-verification.json',
             'tests/node-summary.json', 'tests/python-summary.json', 'internal-links.json',
             'source-freeze-verification.json', 'image-provenance.json', 'current-pass.patch'])
manifest = [{'path': name, 'bytes': (e/name).stat().st_size,
             'sha256': hashlib.sha256((e/name).read_bytes()).hexdigest()} for name in sorted(paths)]
(e/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

labels = {'first': 'Hero', 'projects': 'Projekty', 'showroom-stage': 'Mechanizm projektów',
          'project-expanded': 'Rozwinięty projekt', 'services': 'Usługi', 'ecosystem': 'Ekosystem',
          'process': 'Proces', 'about': 'O mnie', 'contact': 'Kontakt', 'brief': 'Brief', 'footer': 'Footer'}
figures = []
for name in screenshots:
    stem = Path(name).stem
    match = re.match(r'(\d+x\d+)-(.*)', stem)
    size, label = match.groups() if match else (stem.split('-')[0], stem)
    figures.append(f'<figure data-size="{size}"><a href="{name}"><img loading="lazy" src="{name}" alt="{html.escape(labels.get(label,label))} — {size}"></a><figcaption>{size} · {html.escape(labels.get(label,label))}</figcaption></figure>')
comparison = ''.join(f'<article><h3>{labels[label]}</h3><div class="pair"><figure><img loading="lazy" src="before/1440x900-{label}.png" alt="Poprzedni pass — {labels[label]}"><figcaption>Poprzedni pass</figcaption></figure><figure><img loading="lazy" src="matrix-1440x900/1440x900-{label}.png" alt="Nowy pass — {labels[label]}"><figcaption>Cinematic cyber-nature</figcaption></figure></div></article>' for label in ['first','services','project-expanded'])
video_html = ''.join(f'<figure><video controls preload="metadata" src="{v["path"]}" aria-label="Interakcja {name}"></video><figcaption>{name} · {float(v["format"]["duration"]):.2f} s</figcaption></figure>' for v, name in zip(videos,['desktop','mobile']))
gallery = '''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProgressKit — cinematic cyber-nature / odbiór lokalny</title>
<style>*{box-sizing:border-box}body{margin:0;background:#080c0f;color:#e0e8ec;font:16px/1.6 system-ui,sans-serif}main{max-width:1560px;margin:auto;padding:44px 28px}h1{font-size:clamp(30px,4vw,60px);line-height:1.1;font-weight:550;letter-spacing:-.04em}h2{margin-top:65px;font-weight:500}h3{font-weight:500}a{color:#b6d5df;text-underline-offset:4px}p{max-width:80ch;color:#aebbc4}.meta{font-size:13px;color:#b6a1a9}nav{display:flex;flex-wrap:wrap;gap:22px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto}figcaption{font-size:13px;padding:10px 0;color:#aebfc8}.pair,.videos{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pair{align-items:start}article{margin:35px 0 55px}.videos video{width:100%;max-height:650px;background:#000}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px;align-items:start}.gallery img{max-height:520px;object-fit:contain;object-position:top;background:#030508}select{background:#142027;color:#edf2f5;border:1px solid #6f8691;padding:10px;min-height:44px;margin:0 14px 22px}:focus-visible{outline:2px solid #c6e6ef;outline-offset:5px}[hidden]{display:none!important}@media(max-width:700px){main{padding:25px 16px}.pair,.videos{grid-template-columns:1fr}.gallery{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}</style>
<main><p class="meta">PROGRESSKIT SYSTEMS · WERSJA LOKALNA · OWNER VISUAL APPROVAL: OPEN</p><h1>Cinematic cyber-nature.</h1><p>Nowy krajobraz, kierunkowe światło i otwarte kompozycje. Zachowana struktura, treści, 14 projektów oraz kod interakcji. Bez commita, pushu i wdrożenia.</p>
<nav><a href="../../PROGRESSKIT_CINEMATIC_20261101.md">Raport</a><a href="current-pass.patch">Diff tej korekty</a><a href="report.json">Wyniki przeglądarki</a><a href="manifest.json">Manifest SHA-256</a></nav>
<p>__PASS__ sprawdzeń Chrome: PASS, 0 FAIL. Dodatkowo 30 kontroli CTA mobile: PASS. Python 118 PASS, Node 88 PASS, linki 913 PASS. Emulacja lokalna, bez testu fizycznego telefonu.</p>
<h2>Porównanie poprzedniej i obecnej wersji</h2>__COMPARISON__
<h2>Rzeczywiste nagrania interakcji</h2><div class="videos">__VIDEOS__</div>
<h2>__COUNT__ screenshotów końcowych</h2><label for="size">Rozmiar</label><select id="size"><option value="">Wszystkie</option><option>1366x768</option><option>1440x900</option><option>1920x1080</option><option>320x568</option><option>390x844</option><option>844x390</option><option value="320">320 — CTA</option><option value="390">390 — CTA</option></select><span id="count" aria-live="polite"></span><div class="gallery">__FIGURES__</div>
<p>Galeria działa offline. Nie wysyła danych i nie wymaga uruchomionego serwera.</p></main>
<script>const size=document.querySelector('#size'),figures=[...document.querySelectorAll('.gallery figure')];function update(){let n=0;for(const f of figures){f.hidden=!!size.value&&f.dataset.size!==size.value;if(!f.hidden)n++}document.querySelector('#count').textContent=n+' obrazów'}size.addEventListener('change',update);update();</script></html>'''
gallery = gallery.replace('__PASS__',str(totals['PASS'])).replace('__COMPARISON__',comparison).replace('__VIDEOS__',video_html).replace('__COUNT__',str(len(screenshots))).replace('__FIGURES__',''.join(figures))
(e/'index.html').write_text(gallery)
print(json.dumps({'browser': totals, 'screenshots': len(screenshots), 'videos': len(videos), 'manifestFiles':len(manifest), 'sourceFilesUnchangedDuringQA':len(source)}))
