from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,importlib.util
root=Path.cwd();spec=importlib.util.spec_from_file_location('stage',root/'scripts/stage-public.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);allowed=set(m.public_files())
class P(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.links=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id'in d:self.ids.add(d['id'])
  if tag=='a' and 'href'in d:self.links.append(d['href'])
parsed={}
for name in allowed:
 if name.endswith('.html'):
  p=P();p.feed((root/name).read_text());parsed[name]=p
rows=[]
for name,p in parsed.items():
 for href in p.links:
  u=urlsplit(href)
  if u.scheme or u.netloc:continue
  if u.path.startswith(('/download/','/downloads/','/api/')):continue
  target=(root/unquote(u.path.lstrip('/')) if u.path.startswith('/') else (root/name).parent/unquote(u.path)) if u.path else root/name
  target=target.resolve()
  if target.is_dir():target=target/'index.html'
  safe=target.is_relative_to(root);rel=str(target.relative_to(root)) if safe else str(target)
  ok=safe and rel in allowed and (not u.fragment or rel in parsed and unquote(u.fragment) in parsed[rel].ids)
  rows.append({'page':name,'href':href,'target':rel,'status':'PASS' if ok else 'FAIL'})
report={'PASS':sum(x['status']=='PASS' for x in rows),'FAIL':sum(x['status']=='FAIL' for x in rows),'checks':rows};Path('docs/evidence/final-website-20261022/internal-links.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print({k:report[k] for k in ['PASS','FAIL']});print([x for x in rows if x['status']=='FAIL'][:10]);raise SystemExit(report['FAIL']>0)
