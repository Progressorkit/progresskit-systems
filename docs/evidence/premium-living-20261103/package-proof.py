from pathlib import Path
import json,hashlib,subprocess
p=Path(__file__).resolve().parent;root=p.parents[2]
reports=['QA-checks.json','interaction-checks.json','world-checks.json','controls-checks.json','page-controls-checks.json','gallery-checks.json']
checks=[]
for name in reports:
 f=p/name
 if f.exists():
  d=json.loads(f.read_text());checks.extend([dict(c,report=name) for c in d['checks']])
passed=sum(x['status']=='PASS' for x in checks);failed=sum(x['status']=='FAIL' for x in checks)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();before=(p/'HEAD-before.txt').read_text().strip()
(p/'HEAD-after.txt').write_text(head+'\n')
(p/'git-after.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=root,text=True))
files=(p/'changed-files.txt').read_text().splitlines()
hashes={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}
(p/'source-final-hashes.json').write_text(json.dumps(hashes,indent=2))
perf=json.loads((p/'performance-after.json').read_text());preservation=json.loads((p/'preservation.json').read_text())
qa={'ownerVisualApproval':'OPEN','scope':'Local visual premium living pass; no commit/push/publication','browser':{'PASS':passed,'FAIL':failed,'checks':checks},'javascriptTests':{'PASS':100,'FAIL':0,'report':'unit-tests.json'},'pythonTests':{'PASS':37,'FAIL':0,'executed':['test_site_v5.py:18','test_homepage_composition.py:4','test_delivery_sections.py:15']},'build':'PASS: 19 catalog entries, 28 generated files; local vendor and JavaScript syntax checks','stage':'PASS: 113 files; /tmp/progresskit-premium-living-20261103; no publication','diffCheck':'PASS','contentPreservation':preservation,'HEAD':head,'HEADunchanged':head==before,'mobile':'Chrome touch emulation; physical device NOT_RUN','visualReview':'Screenshots inspected; owner acceptance OPEN','performance':{'file':'performance-after.json','sample':'5 seconds per section; 1440x900; recording disabled; local Intel UHD620','rafMedianMs':[round(x['rafMedian'],1) for x in perf['sections']],'rafP95Ms':[round(x['rafP95'],1) for x in perf['sections']],'showroomFPS':round(next(x for x in perf['sections'] if x['id']=='projekty')['scene']['fps'],1)},'videos':json.loads((p/'videos.json').read_text())}
(p/'QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
text=f'''PREMIUM LIVING PASS — LOKALNY ODBIÓR — 2026-11-03
ownerVisualApproval: OPEN
Preview: http://127.0.0.1:8213/
Proof: http://127.0.0.1:8213/proof/

ZMIANY
Desktop: wolny oddech światła, ruch mgły, refleksy na podłodze, różne prędkości planów i reakcja metalu na kursor. Jedna istniejąca atmosfera, bez nowego renderera. Nowe efekty tylko od 1000 px i z precyzyjnym wskaźnikiem.
Przyciski: wspólny arkusz materiału szkła, srebrna krawędź, ciemny korpus i czerwony wariant główny, objętość i odbicie. CTA, filtry, akcje usług/kontaktu, pauza, nawigacja i kontrolki pomocnicze mają te same reguły stanów.
Typografia: główne CTA 16 px desktop / 15 px mobile, pobieranie 14 px, kontrolki pomocnicze 12–13 px. Weight 600, większy padding; minimum 44 px wysokości.
Hover/focus: refleks pod kursorem, uniesienie 2 px, wciśnięcie 2 px, czytelny focus 2 px z odstępem 5 px. Obsługa klawiatury i natywnego kliknięcia zachowana. Nowy moduł nie ma pętli bezczynności.
Mobile: zachowana wcześniejsza atmosfera; przyciski hero rozłożone bez kolizji, pobieranie w pełnym wierszu, filtry bez łamania pojedynczych słów.

WERYFIKACJA
Browser: {passed} PASS / {failed} FAIL. Szczegóły QA.json.
JavaScript: 100 PASS / 0 FAIL.
Python: 37 PASS / 0 FAIL.
Build/check: PASS; 19 projektów, 28 wygenerowanych plików.
Lokalny staging: 113 plików, PASS. git diff --check: PASS.
Rozmiary: 320, 390, 768, 1024, 1366, 1440 px. Reduced motion, forced colors, pauza, klawiatura, cykl życia, fallback WebGL i brak JS sprawdzone.
Dokładna treść body 23 zmienionych wygenerowanych stron zachowana. 10 chronionych plików katalogu, analytics i logiki projektów zachowanych (hash).
HEAD niezmieniony: {head}

WYDAJNOŚĆ
Chrome 155, lokalny Intel UHD620, 1440×900, bez nagrywania, próbki po 5 sekund.
Mediana odstępu rAF: 16,7 ms; P95: 16,8–33,3 ms. Aktywny showroom: około 53 FPS. To lokalny pomiar, nie gwarancja FPS na innych urządzeniach.
Pauza zatrzymuje schedulery; showroom poza ekranem śpi, globalna atmosfera pozostaje aktywna. Dane przed/po: performance-before.json / performance-after.json.
Pierwsza próba pomiaru miała P95 hero 50 ms; po wydzieleniu ruchomego światła do kompozycji wynik 33,3 ms. Pierwszy wynik zachowany w performance-first-pass.json.

PROOF
8 aktualnych screenów w galerii + 2 bazowe sprzed zmian.
Desktop MP4: 53,28 s, 1440×900. Mobile MP4: 31,76 s, 390×844. H.264, 25 klatek/s nagrania.
Screen pełnego hero mobile: 390×920. Pozostałe mobile: 390×844.
Mobile jest emulacją dotyku w Chrome. Fizyczny telefon: NOT_RUN.
Wstępny test podstron błędnie zakładał obecność CTA na stronach case study. Poprawiony probe sprawdza istniejące menu/kontakt i nie zmienia produktu; pierwszy raport zachowany.

PLIKI TEGO ZADANIA
7 plików źródłowych + 23 wygenerowane HTML; pełna lista changed-files.txt.
Porównanie zakresu odnosi się do snapshotu aktualnego local state na początku zadania, nie do HEAD z wcześniejszymi zmianami.
Dowody i skrypty: docs/evidence/premium-living-20261103/.
Bez commita, pushu i publikacji. Odbiór wizualny właściciela pozostaje otwarty.
'''
(p/'ODBIOR.txt').write_text(text)
include=[f for f in p.iterdir() if f.is_file() and f.suffix in ['.png','.mp4','.json','.txt','.html'] and f.name!='SHA256SUMS.txt']
(p/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.name}\n' for f in sorted(include)))
print('QA browser',passed,failed,'HEAD unchanged',head==before,'source files',len(files))
