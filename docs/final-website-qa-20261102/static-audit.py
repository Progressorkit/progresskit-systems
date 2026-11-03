"""Read-only generated-source, SEO and publication-boundary audit; no network or DB access."""
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(__file__).parent/'static'
OUT.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'checks':[],'pages':[],'references':[],'externalLinks':[],'contentProvenance':[],'privacyOperatorGate':{'status':'NOT_VERIFIED_OPERATOR_FACTS_REQUIRED','note':'Technical notice and contact do not prove legal/business identity, legal basis, retention or all-layer logging. Owner facts and separate legal review are required.'},'publicDeployment':'NOT_VERIFIED','ownerVisualApproval':'OPEN'}
def check(name,ok,details=None):report['checks'].append({'name':name,'status':'PASS' if ok else 'FAIL','details':details})
def norm(value):return re.sub(r'\s+',' ',str(value)).strip()
def strict_date(value):
 try:
  parsed=date.fromisoformat(value)
  return parsed if parsed.isoformat()==value else None
 except (ValueError,TypeError):return None
class Page(HTMLParser):
 def __init__(self):super().__init__();self.meta={};self.links=[];self.references=[];self.ids=[];self.h1=0;self.lang=None;self.title='';self.in_title=False;self.text=[];self.tags=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  self.tags.append((tag,a))
  if tag=='html':self.lang=a.get('lang')
  if tag=='h1':self.h1+=1
  if a.get('id'):self.ids.append(a['id'])
  if tag=='title':self.in_title=True
  if tag=='meta':self.meta.setdefault(a.get('name') or a.get('property'),[]).append(a.get('content',''))
  if tag=='link':
   if a.get('rel')=='canonical':self.meta.setdefault('canonical',[]).append(a.get('href',''))
   if a.get('rel') in ['stylesheet','icon','preload'] and a.get('href'):self.references.append({'kind':'asset','value':a['href']})
  if tag in ['script','img','video','source','audio'] and a.get('src'):self.references.append({'kind':'asset','value':a['src']})
  if tag=='a' and a.get('href'):self.links.append(a['href'])
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
 def handle_data(self,data):
  self.text.append(data)
  if self.in_title:self.title+=data
catalog=json.loads((ROOT/'catalog/projects.json').read_text());projects=catalog['projects'];ids=[p['id'] for p in projects];slugs=[p['slug'] for p in projects]
report['catalog']={'schemaVersion':catalog.get('schemaVersion'),'asOf':catalog.get('asOf'),'count':len(projects),'ids':ids,'sha256':hashlib.sha256((ROOT/'catalog/projects.json').read_bytes()).hexdigest()}
check('Final portfolio metadata schema is V2',catalog.get('schemaVersion')==2)
if os.environ.get('PK_QA_EXPECTED_COUNT'):check('Explicit expected catalog count',len(projects)==int(os.environ['PK_QA_EXPECTED_COUNT']),{'expected':int(os.environ['PK_QA_EXPECTED_COUNT']),'actual':len(projects)})
as_of=strict_date(catalog.get('asOf'));check('Dynamic catalog review date is valid and not future',bool(as_of and as_of<=date.today()),{'asOf':catalog.get('asOf'),'auditToday':date.today().isoformat()})
check('Dynamic catalog identities and safe slugs',bool(projects) and len(ids)==len(set(ids)) and len(slugs)==len(set(slugs)) and all(re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',s) for s in slugs),{'count':len(ids),'ids':ids})
if not report['checks'][-1]['status']=='PASS':raise ValueError('Unsafe or duplicate project identities')
routes={'/':'index.html','/projekty/':'projekty/index.html','/glikemia-premium/':'glikemia-premium/index.html','/prywatnosc/':'prywatnosc/index.html','/progresskit-mail/':'progresskit-mail/index.html',**{f'/projekty/{p["slug"]}/':f'projekty/{p["slug"]}/index.html' for p in projects}}
parsers={}
for route,file in routes.items():
 path=ROOT/file;check('Generated route exists '+route,path.is_file(),file)
 if not path.is_file():continue
 source=path.read_text();page=Page();page.feed(source);parsers[route]=page
 text=norm(' '.join(page.text))
 canonical='/projekty/progresskit-mail/' if route=='/progresskit-mail/' else route
 expected='https://progresskit.pl'+canonical
 checks={'lang':bool(page.lang and page.lang.lower().startswith('pl')),'oneH1':page.h1==1,'title':bool(page.title.strip()),'description':len(page.meta.get('description',[]))==1 and bool(page.meta['description'][0].strip()),'canonical':page.meta.get('canonical')==[expected],'social':all(len(page.meta.get(k,[]))==1 and bool(page.meta[k][0].strip()) for k in ['og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image']),'socialUrl':page.meta.get('og:url')==[expected],'uniqueIds':len(page.ids)==len(set(page.ids))}
 check('SEO/metadata/IDs '+route,all(checks.values()),checks)
 leaks=[]
 for num,line in enumerate(source.splitlines(),1):
  if re.search(r'/home/|/srv/|/tmp/|localhost|127\.0\.0\.1|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?:api[_-]?key|password)\s*[=:]\s*[\w-]{20,}',line,re.I):leaks.append(num)
 check('No private-location/secret-like public markup '+route,not leaks,{'file':file,'flaggedLines':leaks,'note':'Pattern check only; no universal secret/PII guarantee.'})
 project=next((p for p in projects if route==f'/projekty/{p["slug"]}/'),None)
 if project:
  updated=strict_date(project.get('updatedAt'));meta=project.get('portfolio',{});source_ids={s['id'] for s in project['sources']}
  check('Source dates remain explicit '+project['id'],bool(updated and as_of and updated<=as_of and updated<=date.today()) and any(tag=='time' and attrs.get('datetime')==project['updatedAt'] for tag,attrs in page.tags),{'updatedAt':project['updatedAt'],'asOf':catalog['asOf']})
  check('V2 platform/evidence section anchors '+project['id'],all(anchor in page.ids and '#'+anchor in page.links for anchor in ['platformy','weryfikacja']))
  expected_platforms=meta.get('platforms',[]);platform_count=sum(tag=='article' and 'platform-status' in attrs.get('class','').split() for tag,attrs in page.tags)
  expected_readiness=[meta.get(k,'') for k in ['functionalStatus','distributionStatus','productionStatus']]
  expected_readiness += [v for platform in expected_platforms for v in platform.values()]
  check('Platform/readiness facts rendered '+project['id'],bool(expected_platforms) and platform_count==len(expected_platforms) and all(value and norm(value) in text for value in expected_readiness),{'platforms':len(expected_platforms),'rendered':platform_count})
  refs=meta.get('featureSources',[])
  check('Every feature has known rendered evidence '+project['id'],len(refs)==len(project['features']) and all(references and all(r in source_ids and '#source-'+r in page.links for r in references) for references in refs),{'features':len(project['features']),'evidenceGroups':len(refs)})
  records=meta.get('verification',[]);rendered_records=sum('verification-record' in attrs.get('class','').split() for _,attrs in page.tags)
  valid_records=bool(records) and rendered_records==len(records)
  for record in records:
   observed=strict_date(record.get('date'))
   valid_records &= record.get('status') in ['PASS','FAIL','BLOCKED','NOT RUN'] and record.get('source') in source_ids and '#source-'+record.get('source','') in page.links
   valid_records &= all(record.get(key) and norm(record[key]) in text for key in ['revision','environment','scope','status','result'])
   valid_records &= (record.get('date') is None and record.get('historical') is True) or bool(observed and updated and observed<=updated and observed<=date.today())
  check('Verification dates/provenance preserved '+project['id'],bool(valid_records),{'records':len(records),'rendered':rendered_records,'note':'Rendered historical PASS is not a new execution result.'})
  report['contentProvenance'].append({'id':project['id'],'classification':meta.get('classification'),'sourceDate':project.get('updatedAt'),'featureCount':len(project['features']),'platformCount':len(expected_platforms),'verification':records,'note':'Source presentation audit only; no sibling product tests executed.'})
 for ref in page.references:report['references'].append({'page':route,**ref})
 for href in page.links:
  parsed=urlsplit(urljoin('https://progresskit.pl'+route,href))
  if parsed.scheme in ['mailto','tel']:continue
  if parsed.scheme in ['http','https'] and parsed.netloc!='progresskit.pl':report['externalLinks'].append({'page':route,'url':href,'status':'NOT_VERIFIED_EXTERNAL'});continue
  if not parsed.path or parsed.path==route:
   if parsed.fragment:check('Fragment '+route+'#'+parsed.fragment,parsed.fragment in page.ids)
  else:report['references'].append({'page':route,'kind':'link','value':href})
 report['pages'].append({'route':route,'file':file,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'title':page.title})
explorer=parsers.get('/projekty/')
if explorer:
 classifications={p.get('portfolio',{}).get('classification') for p in projects}-{None,''}
 kind_select=any(tag=='select' and attrs.get('id')=='classification-filter' and attrs.get('name')=='typ' for tag,attrs in explorer.tags)
 rendered_kinds={attrs.get('value') for tag,attrs in explorer.tags if tag=='option'}
 rendered_cards=[attrs.get('data-id') for tag,attrs in explorer.tags if 'catalog-card' in attrs.get('class','').split()]
 check('Classification filter and every dynamic catalog identity prerendered',kind_select and classifications<=rendered_kinds and rendered_cards==ids,{'kinds':sorted(classifications),'count':len(rendered_cards)})
operator_path=ROOT/'catalog/operator.json'
if operator_path.is_file():
 operator=json.loads(operator_path.read_text());privacy=parsers.get('/prywatnosc/');privacy_text=norm(' '.join(privacy.text)) if privacy else ''
 valid_operator=isinstance(operator,dict) and set(operator)=={'name','address','contact'} and all(isinstance(value,str) and value.strip() for value in operator.values())
 check('Local operator source is present and rendered on privacy page',valid_operator and bool(privacy and 'operator' in privacy.ids) and all(norm(value) in privacy_text for value in operator.values()),{'fields':sorted(operator),'source':'catalog/operator.json','note':'Values not repeated in QA logs; publication/legal review remains separate.'})
 report['operatorSource']={'status':'SOURCE_PRESENT_LOCAL','source':'catalog/operator.json','sha256':hashlib.sha256(operator_path.read_bytes()).hexdigest(),'fields':sorted(operator),'publicationReview':'OPEN','independentBusinessRegistrationVerification':'NOT_RUN'}
 report['privacyOperatorGate']={'status':'SOURCE_PRESENT_LOCAL_PUBLICATION_REVIEW_OPEN','note':'Name/address/contact now exist in local reviewed source and privacy markup. Completeness/applicability, legal bases, retention, processors and actual logging remain separate owner/legal gates; no legal compliance verdict.'}
else:
 check('Local operator source exists',False,'catalog/operator.json missing')
for ref in report['references']:
 if ref['kind']=='link':
  parsed=urlsplit(urljoin('https://progresskit.pl'+ref['page'],ref['value']))
  if parsed.fragment and parsed.path in parsers:check('Cross-page fragment '+parsed.path+'#'+parsed.fragment,parsed.fragment in parsers[parsed.path].ids)
try:
 tree=ET.fromstring((ROOT/'sitemap.xml').read_text());locs=[e.text for e in tree.iter() if e.tag.endswith('loc')];expected={'https://progresskit.pl'+r for r in routes if r!='/progresskit-mail/'}
 check('Sitemap contains all primary routes',expected<=set(locs),{'expected':len(expected),'actual':len(locs),'missing':sorted(expected-set(locs))})
 check('Sitemap excludes private/API/download routes',all(not re.search(r'/_(?:analytics)|/(?:api|download|downloads|docs|scripts|catalog)/',u) for u in locs))
except Exception as exc:check('Sitemap parse',False,str(exc))
robots=(ROOT/'robots.txt').read_text();check('Robots declares sitemap and API boundaries','Sitemap: https://progresskit.pl/sitemap.xml' in robots and all('Disallow: '+p in robots for p in ['/_analytics/','/api/','/download/','/downloads/']))
brand=json.loads((ROOT/'catalog/brand.json').read_text());report['ownerVisualApproval']=brand.get('ownerVisualApproval');report['publicationGate']='OPEN_BLOCKS_RELEASE' if brand.get('ownerVisualApproval')!='APPROVED' else 'OWNER_APPROVED_OTHER_GATES_STILL_REQUIRED'
spec=importlib.util.spec_from_file_location('qa_stage_source',ROOT/'scripts/stage-public.py');stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage);public=stage.public_files();report['publicFileCount']=len(public)
private=[p for p in public if p.startswith(('docs/','scripts/','tests/','catalog/','templates/','analytics/','.git/')) or re.search(r'\.db(?:-|$)|(?:^|/)\.env|\.(?:pem|key)$',p)]
check('Public allowlist excludes source/runtime/private files',not private,private)
check('Every allowlisted file exists',all((ROOT/p).is_file() for p in public),[p for p in public if not (ROOT/p).is_file()])
# Resolve CSS resources without loading external URLs.
for file in public:
 if file.endswith('.css'):
  for value in re.findall(r'url\(\s*[\"\']?([^\"\')\s]+)',(ROOT/file).read_text()):
   if not value.startswith(('data:','blob:','#')):report['references'].append({'page':'/'+file,'kind':'asset','value':value})
report['PASS']=sum(c['status']=='PASS' for c in report['checks']);report['FAIL']=sum(c['status']=='FAIL' for c in report['checks']);report['status']='STATIC_CHECKS_PASS_RELEASE_GATES_OPEN' if not report['FAIL'] else 'FAIL';report['releaseReady']=False;report['finishedAt']=datetime.now(timezone.utc).isoformat()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print({'status':report['status'],'PASS':report['PASS'],'FAIL':report['FAIL'],'catalogCount':len(ids),'publicFiles':len(public)})
if report['FAIL']:raise SystemExit(1)
