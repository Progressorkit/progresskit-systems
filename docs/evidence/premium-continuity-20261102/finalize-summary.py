#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,datetime
OUT=Path(__file__).resolve().parent
load=lambda name:json.loads((OUT/name).read_text())
initial_name='qa-chrome-360-390-768-1440-report.json'
repeat_name='qa-chrome-768-1440-real-keyboard-modality-report.json'
initial=load(initial_name);repeat=load(repeat_name);technology_qa_name='qa-chrome-360-390-768-1440-technology-layer-six-final-report.json';technology_qa=load(technology_qa_name)
checks={};failures=[]
for name,data in [(initial_name,initial),(repeat_name,repeat),(technology_qa_name,technology_qa)]:
    for index,c in enumerate(data['checks']):
        key=(c['scope'],c['name'])
        value={'file':name,'checkIndex':index,**c}
        if c['status']=='FAIL':failures.append(value)
        checks[key]=value
assert all(c['status']=='PASS' for c in checks.values())
for f in failures:
    replacement=checks[(f['scope'],f['name'])]
    f['replacement']={k:replacement[k] for k in ('file','checkIndex','status')}
    f['explanation']='Harness called programmatic focus after actual mouse input. Repeated using a real Tab before focus, establishing keyboard modality. Production code unchanged.'
capture=load('capture-chrome-report.json')
technology_capture_name='technology-chrome-360-390-768-1440-report.json'
technology_capture=load(technology_capture_name)
for artifact in technology_capture['artifacts']:
    entry=next(a for a in capture['artifacts'] if a['file']==artifact['file'])
    entry.clear();entry.update(artifact);entry['provenance']=technology_capture_name
video_name='video-chrome-360-390-768-1440-report.json'
if (OUT/video_name).exists():
    videos=load(video_name)
    originalFreeze=capture.get('originalCaptureSourceFreeze',{'before':capture['sourceBefore'],'after':capture['sourceAfter']})
    capture['originalCaptureSourceFreeze']=originalFreeze
    capture['sourceBefore']=videos['sourceBefore'];capture['sourceAfter']=videos['sourceAfter']
    capture['sourceVersionReconciliation']={'changedAfterInitialCapture':[name for name,value in originalFreeze['after'].items() if videos['sourceAfter'].get(name)!=value],'updatedScreenshot':technology_capture_name,'finalVideos':video_name,'unchangedScreenshotFiles':['01-showroom-crystal-polish.png','02-ecosystem.png','04-contact-console.png','05-footer.png'],'reason':'Only technology-field.css layer6 composition changed; its QA, screenshot and videos were refreshed after root visual review.'}
    assert videos['FAIL']==0 and videos['BLOCKED']==0
    for artifact in videos['artifacts']:
        entry=next(a for a in capture['artifacts'] if a['file']==artifact['file'])
        previous=dict(entry)
        entry.clear();entry.update(artifact);entry['provenance']=video_name
        entry['supersededFirstRecording']={k:previous[k] for k in ('actualInteractionSeconds','sourceFootage') if k in previous}
    capture['finalVideoRecordingReport']=video_name
    (OUT/'capture-chrome-report.json').write_text(json.dumps(capture,indent=2)+'\n')
else:videos=None
result={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'AUTOMATED_CHECKS_PASS_VISUAL_APPROVAL_OPEN','browserChecks':{'PASS':len(checks),'FAIL':0,'BLOCKED':0,'checks':list(checks.values())},'retainedHarnessFailures':failures,'retainedInvalidatedRecording':{'file':'rejected-video-during-css-correction-report.json','status':'REJECTED_SOURCE_CHANGED','reason':'An authorized CSS correction occurred during that earlier recording. Replaced by final frozen-source recordings.'},'sourceVersionReconciliation':capture.get('sourceVersionReconciliation'),'captureChecks':{'PASS':capture['PASS'],'FAIL':capture['FAIL'],'BLOCKED':capture['BLOCKED'],'report':'capture-chrome-report.json'},'finalVideoChecks':{'report':video_name,'PASS':videos['PASS'],'FAIL':videos['FAIL'],'BLOCKED':videos['BLOCKED']} if videos else None,'sourceFreeze':{'before':capture['sourceBefore'],'after':capture['sourceAfter'],'same':capture['sourceBefore']==capture['sourceAfter']},'preservedSurfaces':load('preserved-surfaces.json'),'scopeGuard':load('scope-integrity.json'),'artifacts':capture['artifacts'],'performance':initial['performance'],'limitations':['Physical mobile NOT_RUN; viewport and touch emulation only.','No Firefox performance claim from this pass; previous low headless Firefox sample is not reclassified.','One short local Chrome UHD620 sample, not a comparative historical benchmark.','No audio enabled, form/mail submission, external requests, commit, push or publication.','Five proof PNG only; private diagnostics are not additional requested final views.'],'ownerVisualApproval':'OPEN'}
for artifact in result['artifacts']:
    assert hashlib.sha256((OUT/artifact['file']).read_bytes()).hexdigest()==artifact['sha256'],artifact['file']
(OUT/'qa-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'browserPASS':len(checks),'retainedHarnessFAIL':len(failures),'finalFAIL':0,'artifacts':len(result['artifacts']),'sourceStable':result['sourceFreeze']['same']}))
