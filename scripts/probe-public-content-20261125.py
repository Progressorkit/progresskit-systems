"""Read-only public comparison: no JS, redirects, APK, form tokens or POSTs."""
from __future__ import annotations
import hashlib,json,re,time,urllib.request,urllib.error
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence/content-visual-20261125'
ORIGIN='https://progresskit.pl'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):return None

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.title='';self.canonical=None;self.ids=[];self.cards=[];self.links=[];self.chunks=[];self.in_title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='title':self.in_title=True
        if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
        if a.get('data-project-id'):self.ids.append(a['data-project-id'])
        if 'catalog-card' in a.get('class','').split():self.cards.append({k:a.get(k) for k in ['data-id','data-category','data-stage']})
        if tag=='a' and a.get('href'):self.links.append(a['href'])
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
    def handle_data(self,data):
        if self.in_title:self.title+=data
        self.chunks.append(data)


def sha(data):return hashlib.sha256(data).hexdigest()

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    catalog_bytes=(ROOT/'catalog/projects.json').read_bytes();catalog=json.loads(catalog_bytes)
    report={'origin':ORIGIN,'started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'scope':'Raw GET only; no JS/browser execution, redirects, download routes, review-token, analytics POST or form submissions. No production writes.','requests':[],'pages':{},'assets':{},'localCatalogSha256':sha(catalog_bytes),'localCatalogAsOf':catalog['asOf'],'localProjectCount':len(catalog['projects']),'localProjects':[{k:p[k] for k in ['id','name','category','stage','updatedAt']} for p in catalog['projects']]}
    local_ids=[p['id'] for p in catalog['projects']]
    page_paths=['/','/projekty/','/glikemia-premium/','/taskpet/','/echo-worlds/']+['/projekty/'+p['slug']+'/' for p in catalog['projects']]
    static_paths=['/sitemap.xml','/robots.txt','/glikemia-premium/product.js','/assets/product-downloads.mjs','/assets/site-v5.js']
    allowed=set(page_paths+static_paths+['/api/glikemia/downloads','/api/glikemia/reviews'])
    opener=urllib.request.build_opener(NoRedirect())
    def fetch(route):
        assert route in allowed,'Route outside reviewed GET allowlist'
        assert not any(x in route for x in ['.apk','/download/','/downloads/','review-token','/_analytics','taskpet-owner','.private'])
        req=urllib.request.Request(ORIGIN+route,headers={'User-Agent':'ProgressKit-ReadOnly-Audit/2026-11-25','DNT':'1','Accept-Encoding':'identity'},method='GET')
        started=time.monotonic()
        try:
            with opener.open(req,timeout=25) as response:status=response.status;headers=dict(response.headers);body=response.read(4_000_001)
            assert len(body)<=4_000_000,'Unexpected oversized response'
            result={'path':route,'status':status,'bytes':len(body),'sha256':sha(body),'seconds':round(time.monotonic()-started,3),'headers':{k:headers.get(k) for k in ['Content-Type','Content-Length','Cache-Control','Content-Security-Policy','X-Robots-Tag','ETag','Last-Modified'] if headers.get(k)}}
        except urllib.error.HTTPError as error:
            body=error.read(4_000_000);result={'path':route,'status':error.code,'bytes':len(body),'sha256':sha(body),'seconds':round(time.monotonic()-started,3)}
        except Exception as error:
            body=b'';result={'path':route,'status':'BLOCKED','errorType':type(error).__name__,'seconds':round(time.monotonic()-started,3)}
        report['requests'].append(result);print(route,result['status'],flush=True);return result,body
    before,body=fetch('/api/glikemia/downloads')
    try:report['counterBefore']=json.loads(body)
    except Exception:report['counterBefore']=None
    for route in page_paths:
        result,body=fetch(route);text=body.decode('utf-8','replace');parsed=Page();parsed.feed(text)
        local=ROOT/('index.html' if route=='/' else route.lstrip('/')+'index.html')
        item={**result,'title':parsed.title.strip(),'canonical':parsed.canonical,'projectIds':list(dict.fromkeys(parsed.ids)),'cards':parsed.cards,'sameBytesAsLocal':local.is_file() and sha(local.read_bytes())==sha(body),'privateRouteLeak':bool(re.search(r'/taskpet-owner(?:/|\?)|\.private/',text))}
        if route=='/glikemia-premium/':
            flat=' '.join(parsed.chunks);meta=re.search(r'Wersja\s+([0-9][\w.\-]*)',flat)
            item['declaredVersion']=meta.group(1) if meta else None;item['downloadRoutes']=sorted({x for x in parsed.links if '/download/glikemia-premium' in x or '/downloads/glikemia-premium.apk' in x});item['hasCounterPlaceholder']='data-download-count' in text;item['hasReviewForm']='id="review-form"' in text;item['hasDeclaredLocalSha256']=json.loads((ROOT/'downloads/glikemia-premium.json').read_text())['sha256'] in text
        report['pages'][route]=item
        if route in ['/','/projekty/','/glikemia-premium/']:(OUT/('production-'+('home' if route=='/' else route.strip('/'))+'-baseline.html')).write_bytes(body)
    for route in static_paths:
        result,body=fetch(route);local=ROOT/route.lstrip('/');report['assets'][route]={**result,'sameBytesAsLocal':local.is_file() and sha(local.read_bytes())==sha(body)}
        if route=='/sitemap.xml':
            urls=re.findall(r'<loc>(.*?)</loc>',body.decode('utf-8','replace'));report['productionSitemapPaths']=[urlsplit(x).path for x in urls];report['productionSitemapCount']=len(urls)
        if route=='/glikemia-premium/product.js':report['productionReviewTokenAutoFetchPresent']='prepareForm();' in body.decode('utf-8','replace') and 'review-token' in body.decode('utf-8','replace')
    reviews,body=fetch('/api/glikemia/reviews')
    try:
        rows=json.loads(body)['reviews'];ratings={str(i):sum(x.get('rating')==i for x in rows) for i in range(1,6)};report['reviews']={'status':reviews['status'],'publishedCount':len(rows),'ratings':ratings,'returnedFields':sorted({k for x in rows for k in x}),'commentAndNicknameContentStored':False}
    except Exception:report['reviews']={'status':reviews['status'],'schema':'unavailable'}
    after,body=fetch('/api/glikemia/downloads')
    try:report['counterAfter']=json.loads(body)
    except Exception:report['counterAfter']=None
    report['counterUnchangedDuringProbe']=report['counterBefore'] is not None and report['counterBefore']==report['counterAfter']
    cards=report['pages'].get('/projekty/',{}).get('cards',[]);prod_ids=[x['data-id'] for x in cards]
    report['productionProjectCount']=len(prod_ids);report['productionIds']=prod_ids;report['localOnlyIds']=sorted(set(local_ids)-set(prod_ids));report['productionOnlyIds']=sorted(set(prod_ids)-set(local_ids))
    release=json.loads((ROOT/'downloads/glikemia-premium.json').read_text());apk=ROOT/'downloads/glikemia-premium.apk';report['localGlikemiaRelease']=release
    if apk.is_file():report['localGlikemiaArtifact']={'bytes':apk.stat().st_size,'sha256':sha(apk.read_bytes()),'matchesReleaseMetadata':apk.stat().st_size==release['bytes'] and sha(apk.read_bytes())==release['sha256']}
    report['productionApkTransfer']='NOT RUN: preserving production statistics; no HEAD/GET/Range to any APK route. Local backend source alone does not prove deployed counting semantics.'
    report['productionReviewSubmission']='NOT RUN: no DB writes; avoided even GET review-token because it writes form_tokens.'
    report['finished']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());report['requestCount']=len(report['requests']);report['mutatingRequestsIssued']=0
    (OUT/'production-baseline.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:report.get(k) for k in ['localProjectCount','productionProjectCount','localOnlyIds','counterBefore','counterAfter','counterUnchangedDuringProbe','reviews','requestCount']},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
