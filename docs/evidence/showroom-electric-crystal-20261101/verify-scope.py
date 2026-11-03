from pathlib import Path
import hashlib,json,re,subprocess
here=Path(__file__).resolve().parent
root=here.parents[2]
baseline=json.loads((here/'baseline.json').read_text())
changed=[name for name,digest in baseline.items() if not (root/name).is_file() or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest]
allowed={'assets/showroom-capsule.js','assets/showroom-capsule.css','assets/showroom-matter.js'}
before=(here/'index-before.html').read_text();after=(root/'index.html').read_text()
articles=lambda html:re.findall(r'<article\b[^>]*class="[^"]*showroom-card.*?</article>',html,re.S)
section=r'<section\b[^>]*id="projekty".*?</section>'
old,new=articles(before),articles(after)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
report={'baselineSources':len(baseline),'changedExistingSources':changed,'unexpectedChanges':sorted(set(changed)-allowed),'projectArticles':len(new),'allProjectArticlesByteIdentical':old==new,'outsideShowroomByteIdentical':re.sub(section,'SHOWROOM',before,flags=re.S)==re.sub(section,'SHOWROOM',after,flags=re.S),'htmlByteIdentical':before==after,'head':head,'headUnchanged':head=='e19fe9f67f9190420c5ec4662c80d94a5fa92f67'}
(here/'scope-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
assert not report['unexpectedChanges'] and len(new)==14 and old==new and report['outsideShowroomByteIdentical'] and report['headUnchanged']
