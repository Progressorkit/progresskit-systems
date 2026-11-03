#!/usr/bin/env python3
"""Read-only source/semantic guard for the authorized visual pass; writes only this evidence folder."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, subprocess, sys, datetime

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda:source.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8','surrogateescape')
class Semantics(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.stack=[];self.text=[];self.links=[];self.controls=[];self.ids=[];self.project_data=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs); hidden=any(x[1] for x in self.stack) or tag in ('script','style','svg') or a.get('aria-hidden')=='true'
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append((tag,hidden))
        if a.get('id'):self.ids.append(a['id'])
        if tag=='a':self.links.append({k:a.get(k) for k in ('href','target','rel','download','aria-label') if k in a})
        if tag in ('form','input','textarea','select','option','button'):
            keep=('id','name','type','value','action','method','placeholder','required','pattern','min','max','aria-label','aria-controls','aria-expanded','disabled')
            self.controls.append({'tag':tag,**{k:a.get(k) for k in keep if k in a}})
        data={k:v for k,v in a.items() if k.startswith('data-project') or k in ('data-id','data-source','data-status','data-stage')}
        if data:self.project_data.append(data)
    def handle_endtag(self,tag):
        for index in range(len(self.stack)-1,-1,-1):
            if self.stack[index][0]==tag:self.stack=self.stack[:index];break
    def handle_data(self,data):
        if any(x[1] for x in self.stack):return
        value=' '.join(data.split())
        if value:self.text.append(value)
    def snapshot(self):return {k:getattr(self,k) for k in ('text','links','controls','ids','project_data')}
def semantics():
    parser=Semantics();parser.feed((ROOT/'index.html').read_text());return parser.snapshot()
def protected():
    files=list((ROOT/'catalog').glob('*.json'))
    files.extend(p for p in (ROOT/'analytics').rglob('*') if p.is_file() and '__pycache__' not in p.parts and not p.suffix in ('.pyc','.pyo'))
    return {str(p.relative_to(ROOT)):digest(p) for p in sorted(files)}
def tree_snapshot():
    raw=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all'],cwd=ROOT)
    paths=[]
    for item in raw.decode('utf-8','surrogateescape').split('\0'):
        if not item:continue
        name=item[3:]
        if name.startswith('docs/evidence/luxury-world-20261102/'):continue
        path=ROOT/name
        if path.is_file():paths.append((name,digest(path)))
    return {'head':git('rev-parse','HEAD').strip(),'index':digest(ROOT/'.git/index'),'statusShort':git('status','--short'),'diffStat':git('diff','--stat'),'dirtyFileHashes':dict(paths)}
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
if len(sys.argv)<2:raise SystemExit('snapshot or verify required')
if sys.argv[1]=='snapshot':
    target=OUT/'baseline.json'
    if target.exists():raise SystemExit('Refusing to overwrite visual-pass baseline')
    result={'capturedAt':now(),'protectedFiles':protected(),'homepageSemantics':semantics(),'git':tree_snapshot(),'ownerVisualApproval':'OPEN'}
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'baseline':str(target),'protected':len(result['protectedFiles']),'dirty':len(result['git']['dirtyFileHashes']),'semanticTextNodes':len(result['homepageSemantics']['text'])}))
elif sys.argv[1]=='verify':
    baseline=json.loads((OUT/'baseline.json').read_text());actual=protected();before=baseline['protectedFiles']
    changed=[p for p in before.keys()|actual.keys() if before.get(p)!=actual.get(p)]
    semantic=semantics();expected=baseline['homepageSemantics'];semantic_changes={k:{'before':expected[k],'after':semantic[k]} for k in expected if expected[k]!=semantic[k]}
    result={'checkedAt':now(),'protectedCount':len(actual),'protectedChanges':changed,'semanticChanges':semantic_changes,'headUnchanged':git('rev-parse','HEAD').strip()==baseline['git']['head'],'indexUnchanged':digest(ROOT/'.git/index')==baseline['git']['index'],'ownerVisualApproval':'OPEN'}
    baseline_dirty=baseline['git']['dirtyFileHashes'];current_dirty=tree_snapshot()['dirtyFileHashes']
    result['visualPassDelta']={'modifiedExistingDirtyFiles':[p for p,h in baseline_dirty.items() if p in current_dirty and current_dirty[p]!=h],
        'removedExistingDirtyFiles':[p for p in baseline_dirty if not (ROOT/p).is_file()],
        'newlyDirtyOrNewFiles':[p for p in current_dirty if p not in baseline_dirty]}
    result['status']='PASS' if not changed and not semantic_changes and result['headUnchanged'] and result['indexUnchanged'] else 'FAIL'
    (OUT/'scope-integrity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='semanticChanges'},ensure_ascii=False));print('semanticChangedKeys',list(semantic_changes))
    if result['status']!='PASS':sys.exit(1)
else:raise SystemExit('unknown mode')
