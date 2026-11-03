"""Encode the single requested clip and expose six focused section screenshots."""
import json
import pathlib
import subprocess

out=pathlib.Path(__file__).parent/'final'
report=json.loads((out/'capture.json').read_text())
r=report['recording']
video=out/'desktop.mp4'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(max(0,r['readyOffset']-.25)),'-i',r['raw'],'-an','-vf','fps=25,setpts=PTS-STARTPTS','-frames:v','375','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height,nb_frames,r_frame_rate:format=duration','-of','json',str(video)]))
if float(probe['format']['duration'])!=15:raise RuntimeError('Expected a full 15 s clip; capture needs more closing margin.')
(out/'video.json').write_text(json.dumps(probe,indent=2))
figures=[('services-idle','Services — idle'),('services-hover','Services — hover'),('process','Process'),('transition','Przejście Services → Process'),('mobile-services','Mobile Services — emulacja 390 × 844'),('mobile-process','Mobile Process — emulacja 390 × 844')]
cards=''.join(f'<figure><a href="{name}.png"><img loading="lazy" src="{name}.png" alt="{label}"></a><figcaption>{label}</figcaption></figure>' for name,label in figures)
page='''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>ProgressKit — Services / Process</title><style>body{margin:0;background:#060a0e;color:#dae5ec;font:16px/1.6 system-ui}main{max-width:1300px;margin:auto;padding:28px}h1{font-size:30px}a{color:#b4d9ef}img{max-width:100%;height:auto}video{width:100%;max-height:760px;background:#020407}figure{margin:0}figcaption{padding:8px 0 24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}@media(max-width:700px){.grid{display:block}}</style><main><h1>Services / Process — pierwszy proof</h1><p>ownerVisualApproval: <strong>OPEN</strong>. Lokalnie, bez commita i pushu.</p><p><a href="http://127.0.0.1:8191/#uslugi">Otwórz interaktywną stronę</a> · <a href="capture.json">Testy, stan scrollu i zakres ujęć</a></p><figure><video controls preload="metadata" poster="services-idle.png" src="desktop.mp4"></video><figcaption>Desktop · 15 s · Services idle → hover → scroll transition → Process. Natywne nagranie przeglądarki, kodowanie 25 FPS.</figcaption></figure>'''
page+=f'<p>Kontrole w tym przebiegu: {report["PASS"]} PASS, {report["FAIL"]} FAIL. Mobilka została sprawdzona przez emulację viewportu i dotyku, nie na fizycznym telefonie. Screenshoty obejmują sekcje; pełne wymiary i informację o ewentualnym przycięciu zapisano w raporcie.</p>'
page+='<div class="grid">'+cards+'</div><p>Zakres: Services, Process i ich przejście. Showroom pozostaje bazą 3D. Ocena estetyki pozostaje po stronie ownera.</p></main></html>'
(out/'index.html').write_text(page)
print(json.dumps(probe,indent=2))
