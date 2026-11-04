from pathlib import Path
import subprocess,json,hashlib
out=Path(__file__).resolve().parent;root=out.parents[2]
recording=json.loads((out/'walkthrough-progress.json').read_text())
assert len(recording)==2 and all(x['exit']==0 for x in recording)
metadata={}
for name in ['desktop','mobile']:
 with (out/('encode-'+name+'.log')).open('w') as log:
  subprocess.run(['ffmpeg','-hide_banner','-nostdin','-y','-i',str(out/(name+'.webm')),'-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2',str(out/(name+'.mp4'))],stdout=log,stderr=log,check=True)
 metadata[name]=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out/(name+'.mp4'))],text=True))
(out/'video-metadata.json').write_text(json.dumps(metadata,indent=2))
minutes=lambda name:f"{int(float(metadata[name]['format']['duration']))//60}:{int(float(metadata[name]['format']['duration']))%60:02d}"
(out/'ODBIOR.txt').write_text(f'''WORLD CONTINUITY — lokalny proof 2026-11-03
Strona: http://127.0.0.1:8211/
Galeria: http://127.0.0.1:8211/proof/

Usunięto niezależne tła sekcji i nieprzezroczyste tło WebGL. Jedna globalna komnata, jedno oświetlenie, wspólny canvas i stała pula atmosfery. Szkło zachowuje ciemny materiał po usunięciu białego fallbacku transmisji Three r187.

6 kadrów wejścia + 22 kadry graniczne (11 desktop, 11 mobile).
Desktop: {minutes('desktop')}, 1440x900. Mobile: {minutes('mobile')}, 390x844, emulacja dotykowa Chrome.
Nagrania bez montażu i przyspieszania. Desktop wolniejszy niż wcześniejsze 2:24; z postojami na granicach i powrotem Technologie → Ekosystem.

30 kontroli przeglądarkowych PASS / 0 FAIL.
100 testów JavaScript PASS / 0 FAIL.
37 testów Python PASS / 0 FAIL.
Build/check PASS. Staging lokalny: 111 plików, bez publikacji.
10 chronionych plików katalogu/analytics/kontrolerów bez zmian. Oryginalne logo bez zmian. HEAD bez zmian.

Zmiany tej korekty: 8 plików źródłowych (changed-files.txt). Istniejąca praca i wcześniejsze proofy zachowane.
Diagnoza: DIAGNOZA.txt. Dowody CSS/WebGL: audit-before.json, audit-after.json, world-checks.json.
Wyniki wydajności: performance-before.json i performance-after.json; pomiar bez nagrywania.

ownerVisualApproval: OPEN.
Fizyczny telefon: NOT_RUN. Emulacja nie stanowi odbioru na urządzeniu.
Bez commita. Bez pushu. Bez publikacji.
''')
subprocess.run(['python3',str(out/'build-proof.py')],check=True)
# Integrity is checked after capture, so the owner reviews the captured source.
for f,sha in json.loads((out/'source-final-hashes.json').read_text()).items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==sha,f
for f,sha in json.loads((out/'protected-hashes.json').read_text()).items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==sha,f
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True)==(out/'HEAD-before.txt').read_text()
subprocess.run(['git','diff','--check'],cwd=root,check=True)
files=[f for f in out.iterdir() if f.is_file() and f.suffix in {'.png','.mp4','.json','.txt','.html'} and f.name!='SHA256SUMS.txt']
(out/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.name+'\n' for f in sorted(files)))
print('Packaged',len(files),'artifacts; desktop',minutes('desktop'),'mobile',minutes('mobile'),flush=True)
