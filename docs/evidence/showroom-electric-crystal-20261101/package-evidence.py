"""Package the completed local proof; all figures/counts come from current evidence.

Run after all three layout batches and both MP4/metadata exports exist. The script
never reads application databases, environment files, browser profiles or credentials.
"""
from pathlib import Path
from html import escape
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FINAL = HERE / 'final'
REPORT = ROOT / 'docs/SHOWROOM_ELECTRIC_CRYSTAL_PROOF_20261101.md'
BATCHES = ['1440,390', '1920,1366', '320,700']
QA_FILES = [
    ('Układ: sześć rozmiarów, geometria i dotyk', 'qa-layout.json'),
    ('Klawiatura, pauza, dostępność i deep link', 'qa-interaction.json'),
    ('Materia desktop: ruch, kolejność i okluzja', 'qa-matter-desktop.json'),
    ('Odmowa WebGL, utrata kontekstu i fallback CSS', 'qa-matter-fallback.json'),
    ('Materia mobile i mniejszy bufor', 'qa-matter-mobile.json'),
    ('Hum i jego cykl życia', 'qa-audio.json'),
    ('Pierwsze włączenie hum w czterech stanach', 'qa-audio-start.json'),
]


def read_json(path):
    if not path.is_file():
        raise RuntimeError(f'Missing completed evidence: {path.relative_to(ROOT)}')
    return json.loads(path.read_text())


def tally(report):
    checks = report.get('checks', [])
    result = {
        'PASS': sum(c.get('status') == 'PASS' for c in checks),
        'FAIL': sum(c.get('status') == 'FAIL' for c in checks),
        'errors': report.get('errors', []),
    }
    if not checks:
        raise RuntimeError('A required QA report contains no checks')
    for key in ('PASS', 'FAIL'):
        if key in report and report[key] != result[key]:
            raise RuntimeError(f'QA {key} count disagrees with its checks')
    return result


def replace_block(document, name, body):
    start, end = f'<!-- GENERATED-{name}:BEGIN -->', f'<!-- GENERATED-{name}:END -->'
    pattern = re.escape(start) + r'.*?' + re.escape(end)
    if len(re.findall(pattern, document, flags=re.S)) != 1:
        raise RuntimeError(f'Missing or duplicate report block: {name}')
    return re.sub(pattern, lambda _: start + '\n' + body.strip() + '\n' + end, document, flags=re.S)


# Common console check is counted once across the three complete layout batches.
parts = [read_json(FINAL / f'qa-layout-{batch}.json') for batch in BATCHES]
for part in parts:
    tally(part)
checks = [c for part in parts for c in part['checks'] if c['name'] != 'no browser or CSP errors']
errors = [error for part in parts for error in part.get('errors', [])]
checks.append({'name': 'no browser or CSP errors', 'status': 'FAIL' if errors else 'PASS', 'details': errors})
layout = {'mode': 'layout', 'batches': BATCHES, 'checks': checks, 'errors': errors}
layout.update(tally(layout))
(FINAL / 'qa-layout.json').write_text(json.dumps(layout, indent=2) + '\n')

reports = [(label, name, read_json(FINAL / name)) for label, name in QA_FILES]
counts = [(label, name, tally(report)) for label, name, report in reports]
browser_pass = sum(result['PASS'] for _, _, result in counts)
browser_fail = sum(result['FAIL'] for _, _, result in counts)
browser_errors = [error for _, _, result in counts for error in result['errors']]

unit_log = (FINAL / 'unit-tests.log').read_text()
unit_log = re.sub(r'\x1b\[[0-9;]*m', '', unit_log)
unit = {}
for key in ('tests', 'pass', 'fail'):
    match = re.search(rf'(?m)^\s*(?:ℹ\s*|#\s*)?{key}\s+(\d+)\s*$', unit_log)
    if not match:
        raise RuntimeError(f'Cannot read unit-test {key} count from the completed log')
    unit[key] = int(match.group(1))

scope = read_json(HERE / 'scope-check.json')
if not (scope['projectArticles'] == 14 and scope['allProjectArticlesByteIdentical'] and scope['outsideShowroomByteIdentical'] and scope.get('htmlByteIdentical') and scope.get('headUnchanged') and not scope.get('unexpectedChanges')):
    raise RuntimeError('Scope verification is not complete or does not preserve the required content')
stage = read_json(FINAL / 'stage-check.json')
if stage.get('publicFiles') != 74 or len(stage.get('showroomAssets', [])) != 3 or not all(
        asset.get('stagedByteIdentical') and asset.get('sha256') == hashlib.sha256((ROOT / asset['file']).read_bytes()).hexdigest()
        for asset in stage.get('showroomAssets', [])):
    raise RuntimeError('Staged assets do not match the current three showroom sources')

metadata = read_json(FINAL / 'video-metadata.json')
videos = {}
for name, label in [('desktop', 'Desktop'), ('mobile', 'Mobile')]:
    record = metadata[name]
    duration = float(record.get('format', {}).get('duration', record.get('duration', 0)))
    video = FINAL / f'{name}-proof.mp4'
    if not video.is_file() or not video.stat().st_size or abs(duration - 15) > .06:
        raise RuntimeError(f'{label} proof must be a finished 15 second MP4')
    recording = read_json(FINAL / f'{name}-recording.json')
    idle = recording.get('idleProof', {})
    if idle.get('seconds', 0) < 6 or idle.get('draws', 0) < 10 or not idle.get('coreDormant') or idle.get('renderer') != 'webgl' or recording.get('errors'):
        raise RuntimeError(f'{label} recording does not prove at least six seconds of live, dormant WebGL idle')
    videos[name] = {'label': label, 'duration': duration, 'text': f'{duration:.2f}'.replace('.', ','), 'idle': idle}

# Reject incomplete/failed final verification before emitting a PASS-labelled gallery.
if browser_fail or browser_errors or unit['fail'] or unit['tests'] != unit['pass']:
    raise RuntimeError('Final QA contains failures/errors; keep the proof pending and inspect reports')

qa_rows = ['| Sprawdzenie | Końcowy wynik |', '| --- | --- |',
           f"| Istniejące testy showroomu | {unit['pass']} PASS / {unit['fail']} FAIL |"]
qa_rows += [f"| Chrome — {label} | {result['PASS']} PASS / {result['FAIL']} FAIL |" for label, _, result in counts]
qa_rows += [f'| Razem sprawdzenia Chrome | {browser_pass} PASS / {browser_fail} FAIL |',
            f'| Błędy JavaScript/CSP w raportach końcowych | {len(browser_errors)} |',
            f"| Publiczny staging | PASS — {stage['publicFiles']} pliki, trzy zasoby showroomu identyczne bajtowo |"]
build_log = (FINAL / 'build-check.log').read_text()
build = re.search(r'PASS:\s*(\d+) catalog entries;\s*(\d+) generated files verified', build_log)
if build:
    qa_rows += [f'| Generator / `npm run check` | PASS — {build[1]} projektów, {build[2]} wygenerowane pliki |']
qa_rows += ['', 'Źródła wyników: ' + ' · '.join(
    f'[{name}](evidence/showroom-electric-crystal-20261101/final/{name})' for _, name, _ in reports)]

by_name = {name: report for _, name, report in reports}
desktop_idle = next(c.get('details', {}) for c in by_name['qa-matter-desktop.json']['checks']
                    if c['name'] == 'Matter continues drawing throughout at least six seconds of idle')
mobile_idle = next(c.get('details', {}) for c in by_name['qa-matter-mobile.json']['checks']
                   if c['name'] == 'Mobile matter evolves across six seconds of idle')
buffers = next(c.get('details', {}) for c in by_name['qa-matter-mobile.json']['checks']
               if c['name'] == 'Mobile uses a smaller render buffer than desktop')
db, mb = buffers['desktop'], buffers['mobile']
render_text = (
    f"Końcowy przebieg QA używał buforów {db['width']}×{db['height']} px na desktopie i "
    f"{mb['width']}×{mb['height']} px na mobile. Zarejestrowano {desktop_idle['draws']} wywołań rysowania "
    f"desktopu w obserwacji idle trwającej co najmniej {desktop_idle.get('elapsedMs', 6200) / 1000:g} s "
    f"oraz {mobile_idle['draws']} wywołań mobile w obserwacji obejmującej minimum 6 s. "
    f"Renderer zgłasza {db['filaments']} filamentów desktop i {mb['filaments']} mobile. "
    'Wywołania rysowania obejmują kilka przejść GPU na klatkę; nie są licznikiem FPS. '
    'Zmianę wzoru potwierdzają także różne próbki pikseli framebufferu zapisane w raportach.'
)
video_text = '\n'.join(
    f"- [{video['label']} — {video['text']} s](evidence/showroom-electric-crystal-20261101/final/{name}-proof.mp4)"
    for name, video in videos.items()
)
document = REPORT.read_text()
document = replace_block(document, 'QA', '\n'.join(qa_rows))
document = replace_block(document, 'RENDER-METRICS', render_text)
document = replace_block(document, 'VIDEOS', video_text)
scope_text = ('Zachowano wszystkie 14 artykułów projektów bajtowo. HTML poza showroomem jest identyczny z początkiem tego passu. '
              f"Porównano {scope['baselineSources']} istniejących źródeł: zmieniono {len(scope['changedExistingSources'])}, pozostałe są identyczne. "
              f"Cały HTML pozostał identyczny. HEAD `{scope['head']}` nie zmienił się. "
              'Wcześniejsze niezatwierdzone zmiany pozostają w katalogu roboczym. '
              '[Kontrola zakresu](evidence/showroom-electric-crystal-20261101/scope-check.json).')
document = replace_block(document, 'SCOPE', scope_text)
REPORT.write_text(document)

featured = [
    ('core-closeup.png', 'Zbliżenie · Metaliczny rdzeń i filamenty'),
    ('crystal-closeup.png', 'Zbliżenie · Fasety aktywnego kryształu'),
    ('matter-desktop-idle-start.png', '01 · Idle — początek obserwacji'),
    ('matter-desktop-idle-after-6s.png', '02 · Idle — wzór po minimum 6 sekundach'),
    ('matter-desktop-core-pressure.png', '03 · Aktywacja — rozszerzenie pola za rdzeniem'),
    ('showroom-activated.png', '04 · Kryształy po zakończeniu materializacji'),
    ('matter-desktop-project-hover.png', '05 · Hover — filamenty i światło faset'),
    ('matter-mobile-idle-start.png', 'Mobile · Początek idle'),
    ('matter-mobile-idle-after-6s.png', 'Mobile · Materia nadal żyje po 6 sekundach'),
    ('390x844-activated.png', 'Mobile · Kryształ po aktywacji dotykiem'),
    ('matter-css-fallback-idle.png', 'Fallback CSS · WebGL niedostępny'),
    ('matter-mobile-css-fallback.png', 'Fallback CSS · Ruch również na mobile'),
    ('matter-desktop-reduced-static.png', 'Reduced motion · Statyczna materia'),
    ('matter-hover-hum-enabled.png', 'Opcjonalny hum · Ręczne włączenie'),
]


def figure(name, label):
    if not (FINAL / name).is_file():
        raise RuntimeError(f'Missing required proof image: {name}')
    return (f'<figure><a href="final/{escape(name)}"><img loading="lazy" src="final/{escape(name)}" '
            f'alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>')


def film(name):
    video = videos[name]
    poster = 'matter-desktop-idle-start.png' if name == 'desktop' else 'matter-mobile-idle-start.png'
    scenario = 'idle, aktywacja, materializacja, hover' if name == 'desktop' else 'idle, aktywacja i otwarcie dotykiem'
    return (f'<figure><video controls preload="metadata" poster="final/{poster}" src="final/{name}-proof.mp4"></video>'
            f"<figcaption>{video['label']} · {video['text']} s · {scenario} · bez audio</figcaption></figure>")


gallery = '''<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ProgressKit — elektryczna materia i kryształy / showroom proof</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b0b10;color:#e8e5e8;font:16px/1.65 system-ui,sans-serif}main{max-width:1560px;margin:auto;padding:38px 4vw}h1{font-size:clamp(30px,4.6vw,64px);line-height:1.08;max-width:23ch;letter-spacing:-.035em}h2{font-size:24px;margin:46px 0 20px}p{max-width:90ch;color:#c5bfc7}a{color:#efc5ca;text-underline-offset:5px}.eyebrow{font:11px/1.7 ui-monospace,monospace;letter-spacing:.14em;color:#c4939d}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.films{grid-template-columns:2fr 1fr}figure{margin:0;min-width:0;border:1px solid #3f3038;background:#111017;border-radius:10px;overflow:hidden}img{display:block;width:100%;max-height:800px;object-fit:contain;object-position:top}video{display:block;width:100%;max-height:740px;background:#05070b}figcaption{padding:13px 16px;color:#d5cbd0;font-size:14px}details{margin-top:30px}summary{cursor:pointer;padding:18px 0;color:#e4c9ce}:focus-visible{outline:3px solid #e9b6be;outline-offset:5px}.note{padding:18px 20px;border-left:2px solid #7f3949;background:#3818232b}.facts{font-size:14px;color:#beb9c5}@media(max-width:800px){main{padding:24px 18px}.grid{grid-template-columns:1fr}h1{max-width:19ch}}</style></head><body><main>
<p class="eyebrow">WYŁĄCZNIE SHOWROOM · OWNER VISUAL APPROVAL: OPEN</p><h1>Rdzeń przed kulą elektrycznej materii.</h1>
<p>Metaliczne logo, szkło i aluminium z przodu. Za kapsułą: karmazynowa sfera i setki cienkich rozgałęzionych filamentów. Projekty ujawniają się jako fasetowane kryształy.</p>
<p class="note">To proof do oceny relacji przód–tył, struktury materii i ruchu. Wyniki testów potwierdzają działanie; nie stanowią akceptacji jakości filmowej.</p>
<p><a href="http://127.0.0.1:8191/#showroom-track">Otwórz działający showroom ↗</a> · <a href="../../SHOWROOM_ELECTRIC_CRYSTAL_PROOF_20261101.md">Raport zakresu, ograniczeń i testów</a></p>
<h2>Ruch — najpierw sześć sekund idle</h2><p>Potem aktywacja rdzenia, rozszerzenie pola filamentów i materializacja kryształów. Filmy są bez ścieżki dźwiękowej. Hum pozostaje domyślnie wyłączony; uruchamia go wyłącznie przycisk „Włącz hum” w showroomie.</p><div class="grid films">'''
gallery += film('desktop') + film('mobile') + '</div><h2>Stany do porównania</h2><div class="grid">'
gallery += ''.join(figure(name, label) for name, label in featured) + '</div>'
gallery += '<details><summary>Pozostałe rozdzielczości, warunki awaryjne i dostępność</summary><div class="grid">'
featured_names = {name for name, _ in featured}
gallery += ''.join(figure(p.name, p.stem) for p in sorted(FINAL.glob('*.png')) if p.name not in featured_names)
gallery += '</div></details>'
gallery += (f'<p class="facts">{browser_pass} sprawdzeń Chrome: PASS; {unit["pass"]} testy showroomu: PASS. '
            f'Bufor desktop {db["width"]}×{db["height"]} px, mobile {mb["width"]}×{mb["height"]} px. '
            'Mobile jest emulowany. Liczby wywołań rysowania GPU nie są deklaracją zmierzonego FPS. '
            'Bez commitu, pushu i wdrożenia.</p></main></body></html>')
(HERE / 'gallery.html').write_text(gallery)

summary = {'ownerVisualApproval': 'OPEN', 'browser': {'PASS': browser_pass, 'FAIL': browser_fail, 'errors': browser_errors},
           'unitTests': unit, 'videos': videos, 'scope': scope, 'stage': stage, 'countedQA': [name for _, name, _ in reports]}
(HERE / 'verification-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')

# Explicit source list and current local proof files only; historical diagnostics are excluded.
sources = [
    'assets/showroom-matter.js', 'assets/showroom-capsule.js', 'assets/showroom-capsule.css',
    'index.html',
    'docs/SHOWROOM_ELECTRIC_CRYSTAL_PROOF_20261101.md',
]
files = [ROOT / name for name in sources]
files += [p for p in sorted(FINAL.iterdir()) if p.is_file() and p.suffix in {'.png', '.mp4', '.webm', '.json', '.log'}]
files += [HERE / name for name in ['gallery.html', 'scope-check.json', 'verification-summary.json',
                                  'package-evidence.py', 'matter-qa.cjs', 'browser-qa.cjs', 'audio-qa.cjs', 'record.cjs', 'proof-qa.cjs', 'audio-start-qa.cjs', 'visual.cjs', 'verify-scope.py', 'export-video.py']]
manifest = {}
for file in files:
    if not file.is_file() or file.is_symlink() or not file.resolve().is_relative_to(ROOT):
        raise RuntimeError(f'Missing or unsafe proof file: {file.name}')
    manifest[str(file.relative_to(ROOT))] = {'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
(HERE / 'manifest.json').write_text(json.dumps({'ownerVisualApproval': 'OPEN', 'files': manifest}, indent=2) + '\n')
print(f'Gallery: {len(list(FINAL.glob("*.png")))} images, 2 films; browser: {browser_pass} PASS/{browser_fail} FAIL; unit: {unit["pass"]} PASS/{unit["fail"]} FAIL; hashes: {len(manifest)}')
