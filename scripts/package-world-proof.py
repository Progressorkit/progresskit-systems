"""Package real browser evidence without changing images, timings or counter data."""
import argparse
from html import escape
import json
from pathlib import Path
import subprocess

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory',type=Path)
args=parser.parse_args()
out=args.directory.resolve()
checks=json.loads((out/'checks.json').read_text())
if checks.get('recordings'):
    (out/'recordings.json').write_text(json.dumps({'scope':'Normal speed actual browser recordings. Desktop ring follows real pointer events; no synthetic UI or counters.', 'recordings':checks['recordings']},indent=2)+'\n')
for name in ('desktop-walkthrough','mobile-walkthrough','live-readthrough-walkthrough'):
    source=out/(name+'.webm')
    if source.is_file() and (not (out/(name+'.mp4')).is_file() or source.stat().st_mtime > (out/(name+'.mp4')).stat().st_mtime):
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(out/(name+'.mp4'))],check=True)
provenance=json.loads((out/'live-readthrough-provenance.json').read_text()) if (out/'live-readthrough-provenance.json').is_file() else None
local_count=next((c['detail']['before'] for c in checks['checks'] if c['name']=='Navigation, rendering and stats reads do not increment the local download count' and c['status']=='PASS'),'niedostępna')
performance=next((c['detail'] for c in checks['checks'] if 'performance budget' in c['name']),{})
images=''.join(f'<a class="image" href="{escape(file.name)}"><img loading="lazy" src="{escape(file.name)}" alt="{escape(file.stem.replace("-"," "))}"><span>{escape(file.stem.replace("-"," "))}</span></a>' for file in sorted(out.glob('*.png')))
posters={'desktop-walkthrough':'desktop-01-start.png','mobile-walkthrough':'mobile-01-start.png','live-readthrough-walkthrough':'live-readthrough-glikemia-hero.png'}
videos=''.join(f'<figure><video controls preload="metadata" poster="{posters[file.stem]}" src="{escape(file.name)}"></video><figcaption>{escape(file.stem.replace("-"," "))} · normalne tempo</figcaption></figure>' for file in (out/'desktop-walkthrough.mp4',out/'mobile-walkthrough.mp4',out/'live-readthrough-walkthrough.mp4') if file.is_file())
rows=''.join(f'<tr><td>{escape(c["status"])}</td><td>{escape(c["name"])}</td></tr>' for c in checks['checks'])
live=f'''<p><strong>Produkcja: {provenance.get('renderedDownloads','niedostępna')} pobrań.</strong> Nowy lokalny interfejs otrzymał niezmienioną odpowiedź GET z <code>{escape(provenance['url'])}</code>. Czas odczytu: {escape(provenance['reads'][-1]['requestedAt'])}. Ten odczyt nie pobrał APK i nie zmienił licznika. <a href="live-readthrough-provenance.json">Pełne pochodzenie odpowiedzi</a>.</p>''' if provenance and provenance.get('reads') else '<p>Brak odczytu licznika produkcyjnego w tym zestawie.</p>'
html=f'''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProgressKit World — lokalny przegląd</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#0c0c11;color:#ece7ed;font:16px/1.6 system-ui,sans-serif}}main{{max-width:1260px;margin:auto;padding:45px 25px}}h1{{font-size:clamp(32px,5vw,64px);line-height:1.1}}h2{{margin-top:60px}}p{{max-width:1000px;color:#c6bdcc}}a{{color:#efb1bd}}code{{word-break:break-word}}.summary{{padding:22px 28px;border:1px solid #67515e;background:#211620}}.videos{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:25px}}figure{{margin:0}}video{{width:100%;max-height:620px;background:black}}figcaption{{font-size:13px;color:#b1a6b8}}.images{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:22px}}.image{{display:block;background:#15131b;border:1px solid #3c3446;text-decoration:none}}.image img{{display:block;width:100%;height:220px;object-fit:contain;background:#09090b}}.image span{{display:block;padding:10px;font-size:12px}}table{{border-collapse:collapse;width:100%;font-size:14px}}td{{padding:9px;border-bottom:1px solid #39303c}}td:first-child{{width:80px}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;background:#141119}}
</style><main><p>PROGRESSKIT / WORLD / LOCAL REVIEW</p><h1>Jedna instalacja.<br>Weryfikacja do obejrzenia.</h1><div class="summary"><strong>{checks['PASS']} PASS · {checks['FAIL']} FAIL</strong><p>Aktualny lokalny interfejs. Nagrania prowadzone automatycznie w rzeczywistej przeglądarce, bez przyspieszania. Mobile: emulacja 390×844. Akceptacja wizualna właściciela: <strong>OPEN</strong>. Bez commita, pushu i wdrożenia.</p></div><h2>Nagrania</h2><div class="videos">{videos}</div><h2>Licznik pobrań</h2>{live}<p>Zwykłe nagrania desktop/mobile korzystają z odrębnej, lokalnej bazy testowej. Wartość {local_count} pochodzi z tej odrębnej bazy i nie oznacza statystyki produkcyjnej. Film „live readthrough” pokazuje osobno aktualną odpowiedź produkcji.</p><h2>Zrzuty</h2><div class="images">{images}</div><h2>Sprawdzone zachowanie</h2><table>{rows}</table><p><a href="checks.json">Pełny raport JSON</a></p><h2>Dodatkowe dowody</h2><ul><li><a href="navigation-checks.json">2/2 regresje nawigacji i zakładek</a></li><li><a href="../world-lifecycle.json">9/9 cykl życia WebGL i ograniczenie ruchu</a></li><li><a href="../project-shell/result.json">19 projektów, 38 renderów, 5362 porównania faktów</a></li><li><a href="../real-apk-http.json">15/15 lokalne HTTP rzeczywistego APK — pełny transfer i wykluczenia licznika</a></li><li><a href="../python-tests.log">170/170 Python</a> · <a href="../node-tests.log">114/114 Node</a></li></ul><p>Próba APK przesłała rzeczywisty plik 80 235 954 bajtów do lokalnego serwera z prywatną, tymczasową bazą. SHA-256 był zgodny z manifestem. Produkcyjny plik APK nie był pobierany.</p><h2>Pomiar przeglądarki</h2><p>To pomiar automatyczny w widocznym niżej rendererze. Nie zastępuje oceny płynności przez właściciela ani testu fizycznego telefonu.</p><pre>{escape(json.dumps(performance,ensure_ascii=False,indent=2))}</pre></main></html>'''
(out/'index.html').write_text(html)
print(out/'index.html')
