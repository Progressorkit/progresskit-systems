"""Encode the single native recording and build the requested four-item proof gallery."""
import json
import pathlib
import statistics
import subprocess

out = pathlib.Path(__file__).parent / 'final'
r = json.loads((out / 'recording-metrics.json').read_text())
trim = max(0, r['readyOffset'] - .25)
video = out / 'desktop.mp4'
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(trim),
    '-i', r['raw'], '-an', '-vf', 'fps=25,setpts=PTS-STARTPTS', '-frames:v', '375',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', str(video),
], check=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_entries',
    'stream=codec_name,width,height,nb_frames,r_frame_rate:format=duration', '-of', 'json', str(video),
]))
if float(probe['format']['duration']) != 15:
    raise RuntimeError('Expected a full 15-second native clip; record a longer closing margin.')
frames = [f for f in r['frames'] if f['t'] <= r['frames'][0]['t'] + 15000]
windows = [sum(frames[0]['t'] + i * 1000 <= f['t'] < frames[0]['t'] + (i + 1) * 1000 for f in frames)
           for i in range(int((frames[-1]['t'] - frames[0]['t']) // 1000))]
gpu = [f['gpuFrameMs'] for f in frames if f['gpuFrameMs'] is not None]
record = {
    'renderer': r['metrics']['renderer'], 'video': probe, 'videoTrimStartSeconds': trim,
    'renderFpsActiveMean': (len(frames) - 1) * 1000 / (frames[-1]['t'] - frames[0]['t']),
    'renderFpsOneSecondMin': min(windows), 'renderFpsOneSecondMax': max(windows),
    'cpuSubmissionMedianMs': statistics.median(f['cpuFrameMs'] for f in frames),
    'gpuQueryLatestMedianMs': statistics.median(gpu) if gpu else None,
    'DPR': sorted(set(f['dpr'] for f in frames)),
    'drawCallsRange': [min(f['drawCalls'] for f in frames), max(f['drawCalls'] for f in frames)],
    'trianglesRange': [min(f['triangles'] for f in frames), max(f['triangles'] for f in frames)],
    'errors': r['errors'],
}
(out / 'performance.json').write_text(json.dumps(record, indent=2))
normal = json.loads((out / 'normal-performance.json').read_text())
figures = [('core-idle', 'Core idle — natywny wycinek po ponad 6 s'),
           ('core-active', 'Core aktywny — natywny wycinek'),
           ('crystal', 'Jeden kryształ po materializacji')]
cards = ''.join(f'<figure><a href="{name}.png"><img loading="lazy" src="{name}.png" alt="{label}"></a><figcaption>{label}</figcaption></figure>' for name, label in figures)
page = '''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>ProgressKit Core — final art pass</title><style>body{margin:0;background:#05080b;color:#d9e5ed;font:16px/1.6 system-ui}main{max-width:1200px;margin:auto;padding:28px}h1{font-size:28px}a{color:#b9dcf1}video{width:100%;max-height:740px;background:#020305}img{max-width:100%;height:auto}figure{margin:0}figcaption{padding:8px 0 24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}code{color:#c9dce7}@media(max-width:650px){.grid{display:block}}</style><main><h1>ProgressKit Core — final art pass</h1><p>ownerVisualApproval: <strong>OPEN</strong>. Bez commita i pushu.</p><p><a href="http://127.0.0.1:8191/#showroom-track">Interaktywny showroom</a> · <a href="normal-performance.json">Pomiar bez nagrywania</a> · <a href="performance.json">Pomiar podczas filmu</a> · <a href="qa.json">Testy showroomu</a></p><figure><video controls preload="metadata" poster="core-idle.png" src="desktop.mp4"></video><figcaption>Desktop · 15 s · idle → aktywacja → hover. Natywne nagranie przeglądarki, kodowanie 25 FPS.</figcaption></figure>'''
page += f'<p><strong>Bez nagrywania: {normal["averageFps"]:.1f} FPS średnio</strong> ({normal["oneSecondMin"]}–{normal["oneSecondMax"]} w pełnych oknach 1 s). Poprzednia baza: {normal["baselineAverageFps"]:.1f} FPS. Pomiar po {normal["warmupSeconds"]} s rozgrzewki, ta sama sekwencja idle → aktywacja → hover.</p>'
gpu_label=f'{record["gpuQueryLatestMedianMs"]:.2f} ms' if record['gpuQueryLatestMedianMs'] is not None else 'niedostępny'
page += f'<p>Podczas nagrywania: <strong>{record["renderFpsActiveMean"]:.1f} FPS</strong> średnio. {record["renderer"]}. Draw calls {record["drawCallsRange"]}; trójkąty {record["trianglesRange"]}. CPU mediana {record["cpuSubmissionMedianMs"]:.2f} ms; GPU mediana {gpu_label}.</p>'
page += '<p>CPU oznacza obsługę i zlecanie renderu w JS. GPU to ostatnie dostępne asynchroniczne zapytania EXT_disjoint_timer_query_webgl2. FPS filmu i FPS renderowanej sceny są odrębnymi pomiarami. Adaptacyjny DPR może zmniejszać ostrość. Hum 54 Hz pozostaje domyślnie wyłączony.</p><div class="grid">' + cards + '</div><p>Zakres proofu: trzy ujęcia i jeden film. Ocena estetyki pozostaje po stronie ownera.</p></main></html>'
(out / 'index.html').write_text(page)
print(json.dumps(record, indent=2))
