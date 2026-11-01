"""Compare this sprint against the preserved dirty working tree, not HEAD."""
from pathlib import Path
import difflib, hashlib, json, re, subprocess
root=Path.cwd();out=Path(__file__).parent
baseline=Path('/tmp/progresskit-mechanical-v5-20261023/baseline')
original=json.loads((out/'baseline.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
changed=[];diff=[]
for item in original['baselineFiles']:
 p=Path(item['path']);now=sha(root/p)
 if now!=item['sha256']:
  changed.append({'path':str(p),'before':item['sha256'],'after':now})
  diff.extend(difflib.unified_diff((baseline/p).read_text().splitlines(True),(root/p).read_text().splitlines(True),fromfile='pre-sprint/'+str(p),tofile='current/'+str(p)))
(out/'source-review.diff').write_text(''.join(diff))
def section(html,id_):
 start=re.search(r'<section\b[^>]*\bid="'+re.escape(id_)+r'"[^>]*>',html)
 if not start:raise ValueError(id_)
 depth=0
 for match in re.finditer(r'</?section\b[^>]*>',html[start.start():]):
  depth+=-1 if match.group().startswith('</') else 1
  if depth==0:return html[start.start():start.start()+match.end()]
 raise ValueError('Unclosed section '+id_)
before=(baseline/'index.html').read_text();after=(root/'index.html').read_text()
checks={}
for name in ['catalog/projects.json','catalog/brand.json']:
 checks[name+' byte identical']=sha(root/name)==sha(baseline/name)
for id_ in ['start','o-mnie','uslugi','wyzwania','technologie','kontakt','brief','ekosystem','wydania']:
 checks[id_+' markup identical']=section(before,id_)==section(after,id_)
checks['footer markup identical']=re.search(r'<footer\b.*?</footer>',before,re.S).group()==re.search(r'<footer\b.*?</footer>',after,re.S).group()
assets={
 'assets/brand/red-aluminium-reconstruction.jpg':'7d02194a428b04daac24bc3a41f9c27528398f41221e741c99e78370b45024b1',
 'assets/brand/footer-forest-mountains-reconstruction.png':'120b46801c5ba98bc777e9d9b0b7e700268815e64b7fffa0dfe327e55f52bdb0'}
for file,expected in assets.items():checks[file+' approved reconstruction unchanged']=sha(root/file)==expected
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
checks['HEAD unchanged no commit']=head==original['head']
checks['index unchanged no staging']=subprocess.check_output(['git','diff','--cached','--name-status'],text=True)==original['index']
checks['12 intended source files']=len(changed)==12
result={'baseline':'pre-sprint dirty working tree','head':head,'changedFiles':changed,'checks':checks,'PASS':sum(checks.values()),'FAIL':sum(not v for v in checks.values())}
(out/'scope-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'PASS':result['PASS'],'FAIL':result['FAIL'],'changedFiles':len(changed)}))
raise SystemExit(bool(result['FAIL']))
