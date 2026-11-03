from pathlib import Path
import json,hashlib,subprocess,datetime
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
load=lambda n:json.loads((OUT/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
qa=load('qa-report.json');capture=load('capture-report.json');baseline=load('baseline-report.json')
assert qa['FAIL']==0 and capture['FAIL']==0
checks=[]
for artifact in capture['artifacts']:
    file=OUT/artifact['file'];assert sha(file)==artifact['sha256']
    checks.append({'name':'Artifact SHA256 '+artifact['file'],'status':'PASS'})
    if file.suffix=='.mp4':
        raw=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=nb_frames,width,height,codec_name,avg_frame_rate','-of','json',str(file)],capture_output=True,text=True)
        assert raw.returncode==0,raw.stderr
        probe=json.loads(raw.stdout);duration=float(probe['format']['duration']);device=file.name.split('-')[0]
        decode=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-threads','2','-i',str(file),'-f','null','-'],capture_output=True,text=True)
        assert decode.returncode==0,decode.stderr
        checks.append({'name':'Full MP4 decode '+file.name,'status':'PASS','probe':probe})
        (OUT/'diagnostics').mkdir(exist_ok=True)
        for label,at in [('first',.1),('last',max(.1,duration-.25))]:
            target=OUT/'diagnostics'/(device+'-video-'+label+'.png')
            frame=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(at),'-i',str(file),'-frames:v','1','-threads','2',str(target)],capture_output=True,text=True)
            assert frame.returncode==0,frame.stderr
        artifact.update({'durationSeconds':duration,'frames':int(probe['streams'][0]['nb_frames']),'fps':25,'fullyDecoded':'PASS','validationFrames':['diagnostics/'+device+'-video-first.png','diagnostics/'+device+'-video-last.png']})
manifest=load('source-manifest.json')
for file,want in manifest['files'].items():
    assert sha(ROOT/file)==want,file
    checks.append({'name':'Root source-manifest SHA256 '+file,'status':'PASS'})
for script in ['scope-guard.py','preserved-surfaces.py']:
    subprocess.run(['python3',str(OUT/script),*(['verify'] if script=='scope-guard.py' else [])],check=True,cwd=ROOT,capture_output=True,text=True)
alpha=[c for c in qa['checks'] if c['name'].startswith('Actual haze alpha')]
layout=[c for c in qa['checks'] if c['name'].startswith('Exact normal-flow')]
retained=[{'file':'sanity-initial-missing-heading-mask-report.json','classification':'REAL_PRODUCT_TEXT_MASK_GAP','finding':'Ecosystem H3 Niezależna komunikacja had alpha6/255 at its text center.','resolution':'Protected .delivery-independent > h3; repeated actual alpha0 in final four-width QA.'},{'files':['core-initial-proxy-assumption-report.json','core-selected-only-proxy-report.json'],'classification':'REAL_PRODUCT_FILTER_SEMANTICS_BUG','finding':'.is-active is only the selected item, not all six projected Canvas titles. A six-title proxy expectation exposed the product mask filter excluding five visible titles.','resolution':'Product filter now skips only .is-orbit-hidden; final QA samples every materialized phase ID and Core label with actual alpha0.'}]
result={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'AUTOMATED_CHECKS_PASS_VISUAL_APPROVAL_OPEN','browserChecks':{'PASS':qa['PASS'],'FAIL':qa['FAIL'],'BLOCKED':qa['BLOCKED'],'report':'qa-report.json','checks':qa['checks']},'baseline':{'report':'baseline-report.json','layoutFile':'layout-baseline.json','geometryTargetsPerViewport':224,'widths':[360,390,768,1440],'webGLContexts':3,'checks':layout},'textProtection':{'actualFramebufferChecks':len(alpha),'allTextSamplesAlphaZero':all(all(p['alpha']==0 for p in c['details']['samples']) for c in alpha),'reports':alpha},'captureChecks':{'PASS':capture['PASS'],'FAIL':capture['FAIL'],'report':'capture-report.json'},'artifacts':capture['artifacts'],'finalVerification':{'PASS':len(checks),'FAIL':0,'checks':checks},'retainedResolvedFindings':retained,'reviewFinding':{'classification':'STALE_VIEWPORT_MASKS_DURING_SCROLL','resolution':'Overlay is hidden on mask invalidation and shown only after drawing fresh masks; synchronous invalidation plus actual post-draw alpha0 verified in final QA.'},'sourceVersionReconciliation':{'finalCapture':capture['sourceAfter'],'frozenDuringQA':qa['sourceBefore']==qa['sourceAfter'],'frozenDuringCapture':capture['sourceBefore']==capture['sourceAfter'],'reusedThreePNGs':'Hero/Technology/Contact are from approved quick capture; later edits only narrowed Core label masks in the distant showroom section. Their original bytes and provenance remain recorded.'},'scopeGuard':load('scope-integrity.json'),'preservedSurfaces':load('preserved-surfaces.json'),'performance':{'before':baseline['performance'],'after':qa['performance'],'interpretation':'Short same-host observations, not a stable historical comparison or a device-wide guarantee.'},'limitations':['Physical mobile NOT_RUN; viewport and touch emulation only.','No account, Mail, form-send, external requests, commit, push or publication.','Owner visual approval remains OPEN.','Footer and Hero start/end frame inspection required by reviewer; frames saved in diagnostics.'],'ownerVisualApproval':'OPEN'}
(OUT/'qa-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(OUT/'final-verification.json').write_text(json.dumps(result['finalVerification'],indent=2)+'\n')
print(json.dumps({'QA':qa['PASS'],'capture':capture['PASS'],'artifactFiles':len(capture['artifacts']),'hashAndDecodeChecks':len(checks),'videos':[{k:a[k] for k in ['file','durationSeconds','frames']} for a in capture['artifacts'] if a['file'].endswith('.mp4')]}))
