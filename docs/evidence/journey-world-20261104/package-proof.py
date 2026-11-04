from pathlib import Path
import json,hashlib,subprocess,re
p=Path(__file__).resolve().parent;root=p.parents[2]
reports=['QA-checks.json','interaction-checks.json','world-checks.json','controls-checks.json','journey-checks.json','gallery-checks.json']
checks=[]
for name in reports:
 if (p/name).exists():checks.extend(dict(c,report=name) for c in json.loads((p/name).read_text())['checks'])
passed=sum(c['status']=='PASS' for c in checks);failed=sum(c['status']=='FAIL' for c in checks)
unit=json.loads((p/'unit-tests.json').read_text());python=[]
for name in ['test_site_v5.py','test_homepage_composition.py','test_delivery_sections.py']:
 text=(p/(name+'.log')).read_text();python.append({'file':name,'PASS':int(re.search(r'Ran (\d+) tests',text).group(1)) if '\nOK' in text else 0,'status':'PASS' if '\nOK' in text else 'FAIL'})
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();(p/'HEAD-after.txt').write_text(head+'\n');(p/'git-after.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=root,text=True))
files=(p/'changed-files.txt').read_text().splitlines();(p/'source-final-hashes.json').write_text(json.dumps({f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files},indent=2))
videos=[]
for name in ['desktop','mobile']:
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(p/(name+'.mp4'))],text=True))
 videos.append({'video':name,**data})
(p/'videos.json').write_text(json.dumps(videos,indent=2))
perf=json.loads((p/'performance-after.json').read_text());comparison=json.loads((p/'performance-compare.json').read_text());preserved=json.loads((p/'preservation.json').read_text())
fps=next(s['scene']['fps'] for s in perf['sections'] if s['id']=='projekty')
summary=f"Intel UHD 620, 1440×900: showroom {fps:.1f} FPS w końcowej próbce. Porównanie A/B: nowa atmosfera {comparison[0]['scene']['fps']:.1f}, wcześniejsza {comparison[1]['scene']['fps']:.1f} FPS. Pierwsza próba: 36 FPS; zachowana w performance-first.json."
qa={'ownerVisualApproval':'OPEN','scope':'Local living world pass; no commit/push/publication','browser':{'PASS':passed,'FAIL':failed,'checks':checks},'javascriptTests':{'PASS':sum(t['PASS'] for t in unit),'FAIL':sum(t['FAIL'] for t in unit),'exitCodes':[t['exit'] for t in unit]},'pythonTests':{'PASS':sum(t['PASS'] for t in python),'reports':python},'build':'PASS: local vendor, syntax and 28 generated files / 19 catalog entries','stage':'115 public files; local /tmp only','diffCheck':'PASS','preservation':preserved,'HEAD':head,'HEADunchanged':head==(p/'HEAD-before.txt').read_text().strip(),'changedFiles':files,'mobile':'Chrome touch emulation; physical device NOT_RUN','performance':{'summary':summary,'final':perf,'comparison':comparison,'firstMeasurement':'performance-first.json','ambientPool':116,'mobileAmbientPool':64,'proximityPool':24,'mobileProximityMax':8},'videos':videos,'capture':json.loads((p/'capture.json').read_text()),'testHarnessCorrections':['First controls probe counted intentionally protruding socket casing as text overflow. Final probe checks actual label and count rectangles and whole-word wrapping.','First filter probe used the HTML hidden attribute. Existing carousel uses is-orbit-hidden. Product catalog/filter logic was not changed.']}
(p/'QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
duration={v['video']:float(v['format']['duration']) for v in videos}
text=f'''PROGRESSKIT SYSTEMS — LIVING WORLD — 2026-11-04
ownerVisualApproval: OPEN
Preview: http://127.0.0.1:8214/
Proof: http://127.0.0.1:8214/proof/

ZMIANY
Jeden ciągły świat z dwunastoma punktami kamery/światła. Różne kadry i głębia, cieplejszy Core, mechaniczne boki Process, przewody Ecosystem, boczne obudowy laboratorium i spokojniejszy Contact. Bez osobnych tapet sekcji.
Desktop: wyraźniejsza mgła, powolne odbicia podłogi, oddech czerwieni i metaliczne refleksy. Ta sama pula 116 cząstek i istniejący canvas. Mobile: 64 cząstki, 38% ruchu kamery, bez nowych desktopowych konstrukcji.
Core: zachowane geometria, skala, logo i relief. Korekty obejmują atmosferę za Core i szybszy oddech jego istniejącego refleksu.
Projekty: sześć różnych szlifów, różna liczba faset, grubość i głębokość; wspólny ciemny materiał. Większy tytuł/opis/CTA, zawijanie tekstu wewnątrz kryształów.
Selektory: szklany front, wydrążona metalowa oprawa, wspólna szyna; aktywny element wychodzi do przodu. Impuls zmiany kategorii trwa 280 ms.
Process: sześć istniejących etapów podłączonych do fizycznej szyny; pakiet światła podąża po jej krzywej. Stan nadal wyznacza istniejący kontroler scrolla.
Usługi: odstęp i wygaszanie całego opuszczanego obiektu przed wejściem do Process; powrót przy scrollowaniu wstecz.
Kontakt/brief: dwie optyczne tafle na metalowych prowadnicach, zagłębione natywne pola, zachowane działanie lokalnego eksportu.
Kontrolki i mikrotypografia: wspólny materiał obejmuje również Poznaj Core; większe etykiety kategorii, technologii, statusów, nawigacji i podpowiedzi. Focus oraz pressed zachowane.
Proximity: Core, kryształy, selektory i CTA korzystają z jednej puli maks. 24 iskier, 8 na mobile. Mocniejszy krótki łuk przy zbliżeniu; brak ciągłego glitchu.

KONTROLA
Browser: {passed} PASS / {failed} FAIL.
JavaScript: {qa['javascriptTests']['PASS']} PASS / {qa['javascriptTests']['FAIL']} FAIL.
Python: {qa['pythonTests']['PASS']} PASS.
Build/check, staging 115 public files, git diff --check: PASS.
Viewporty: 320, 390, 768, 1024, 1366, 1440. Pauza, reduced motion, forced colors, klawiatura, fallback WebGL, brak JS, lifecycle, formularz i natywne filtry sprawdzone.
Treść body homepage identyczna ze snapshotem wejściowym. 13 chronionych plików katalogu/analytics/logiki oraz brand/Core zachowanych bajt w bajt. HEAD niezmieniony: {head}.
Pierwsze próby testów miały dwa błędne założenia harnessu: oprawa selektora traktowana jako obcięcie tekstu i hidden zamiast istniejącego is-orbit-hidden. Pierwsze raporty zachowane; poprawiono probe, nie logikę produktu.

WYDAJNOŚĆ
{summary}
Pomiar bez nagrywania; próbki po 5 sekund w sekcjach oraz 10 sekund na wariant w porównaniu A/B. Wyniki zależą od bieżącego obciążenia lokalnego komputera; nie są gwarancją FPS. P95 i mediana dostępne w QA.json. Pauza zatrzymuje schedulery, showroom poza ekranem śpi.

PROOF
Desktop: {duration['desktop']:.2f} s, 1440×900. Mobile: {duration['mobile']:.2f} s, 390×844. MP4/H.264, 25 klatek/s pliku — odrębnie od pomiaru renderera.
Desktop ma postoje 5,5 s w sześciu wymaganych strefach, następnie ruch kursora. Strzałka w nagraniu jest nakładką dowodową śledzącą rzeczywisty pointer; nie zmienia produktu.
Mobile: emulacja Chrome, fizyczny telefon NOT_RUN.
12 screenów w galerii, dodatkowe kadry i para idle przed/po w katalogu dowodów.

PLIKI TEGO PASSU (porównanie do aktualnego local state na wejściu)
'''+ '\n'.join(files)+'''

Skrypty i proof: docs/evidence/journey-world-20261104/.
Bez commita, pushu i publikacji. Odbiór wizualny właściciela pozostaje OPEN.
'''
(p/'ODBIOR.txt').write_text(text)
include=[f for f in p.iterdir() if f.is_file() and f.suffix in ['.png','.mp4','.json','.txt','.html'] and f.name!='SHA256SUMS.txt']
(p/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.name}\n' for f in sorted(include)))
print('Browser',passed,failed,'HEAD unchanged',qa['HEADunchanged'],'videos',duration)
