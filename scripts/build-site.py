"""Validate the reviewed catalog and prerender a buildless V5 site (stdlib only)."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
from html import escape
import importlib.util
import json
from pathlib import Path
import re
import sys
import unicodedata
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
AUDIT_DATE = date.today()  # Reject future evidence; no frozen historical review ceiling.
STAGES = {'Koncepcja', 'Prototyp', 'W rozwoju', 'Alpha', 'Beta', 'Wersja testowa', 'Finalizacja', 'Dostępny APK', 'Dostępny', 'Utrzymywany', 'Wstrzymany', 'Archiwalny'}
CATEGORIES = {
    'mobile': ('Aplikacje', '▯'), 'saas': ('SaaS', '▦'),
    'platforms': ('Platformy', '◎'), 'games': ('Gry', '◇'),
    'web': ('Realizacje WWW', '↗'), 'technology': ('Technologie', '⌘'),
}
TEXT = ('id', 'slug', 'name', 'summary', 'problem', 'motivation', 'solution', 'availability', 'updatedAt')
LISTS = ('audiences', 'features', 'technologies', 'architecture', 'results', 'planned', 'remaining')
FIELDS = set(TEXT + LISTS + ('category', 'stage', 'gallery', 'videos', 'links', 'repository', 'cases', 'sources', 'coverage'))
PORTFOLIO_FIELDS = {'classification','aliases','functionalStatus','distributionStatus','productionStatus','platforms','verification','featureSources'}
CLASSIFICATIONS = {'product':'Produkt','realization':'Realizacja WWW','internal_tool':'Narzędzie wewnętrzne','infrastructure':'Infrastruktura','concept':'Koncepcja / R&D','historical':'Realizacja historyczna'}
CASE_FIELDS = ('problem', 'diagnosis', 'rootCause', 'solution', 'verification', 'result', 'source')
TECHNOLOGY_GROUPS = (
    ('clients', 'Klienci i interfejsy', {
        '.NET MAUI', 'Android', 'AudioTrack', 'CSS', 'Godot 4.6', 'HTML',
        'Jetpack Compose', 'Leaflet', 'Microcharts', 'Next.js',
        'OpenGL Compatibility', 'React', 'SkiaSharp', 'SpeechRecognizer',
        'TextToSpeech', 'WorkManager',
    }),
    ('backend', 'Backend i komunikacja', {
        'ASP.NET Core', 'ASP.NET Core Identity',
        'Eclipse Angus Mail', 'FastAPI', 'Firebase Cloud Messaging', 'Node.js',
        'SignalR',
    }),
    ('data', 'Dane i bezpieczeństwo', {
        'Android Keystore', 'Entity Framework Core', 'JSON', 'JWT', 'PostGIS',
        'PostgreSQL', 'Prisma', 'Room', 'SQLite',
    }),
    ('infrastructure', 'Infrastruktura i wdrożenia', {
        'Caddy', 'ClamAV', 'Docker', 'GitHub Actions', 'Linux',
    }),
    ('tooling', 'Języki i narzędzia', {
        '.NET', '.NET 10', 'C#', 'JavaScript', 'Kotlin', 'pnpm', 'Python', 'Turborepo',
        'TypeScript', 'xUnit',
    }),
    ('processing', 'Przetwarzanie treści', {'jsoup', 'ML Kit Translation', 'WebP'}),
)


def e(value):
    return escape(str(value), quote=True)


def normalize(value):
    # Match the same Polish diacritic folding used by the browser filter.
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower().replace('ł', 'l')) if not unicodedata.combining(c))


def validate_catalog(data):
    from ipaddress import ip_address

    errors = []

    def strict_date(value):
        if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', value):
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    def public_url(value):
        if not isinstance(value, str) or re.search(r'[\x00-\x20\x7f\\]', value):
            return False
        try:
            url = urlsplit(value)
            host = url.hostname
            port = url.port
            if url.scheme != 'https' or not host or url.username is not None or url.password is not None:
                return False
            host = host.encode('idna').decode('ascii').lower().rstrip('.')
        except (ValueError, UnicodeError):
            return False
        if port is not None and not 1 <= port <= 65535:
            return False
        try:
            address = ip_address(host)
        except ValueError:
            # Numeric and single-label host spellings can address loopback in browsers.
            if '.' not in host or host.rsplit('.', 1)[1].isdigit():
                return False
            if host.endswith(('.local', '.internal', '.localhost', '.invalid', '.test')):
                return False
            if not all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in host.split('.')):
                return False
        else:
            if not address.is_global or address.is_multicast:
                return False
        return True

    if not isinstance(data, dict) or set(data) != {'schemaVersion', 'asOf', 'projects'}:
        return ['Catalog root must contain schemaVersion, asOf, projects.']
    if type(data['schemaVersion']) is not int or data['schemaVersion'] not in (1, 2):
        errors.append('Unsupported schemaVersion.')
    as_of = strict_date(data['asOf'])
    if as_of is None:
        return errors + ['Invalid asOf date.']
    if as_of > AUDIT_DATE:
        errors.append('asOf exceeds the configured audit date.')
    if not isinstance(data['projects'], list) or not data['projects']:
        return errors + ['projects must be a nonempty array.']
    seen = set()
    for i, p in enumerate(data['projects']):
        tag = f'projects[{i}]'
        expected = FIELDS | ({'portfolio'} if data['schemaVersion'] == 2 else set())
        if not isinstance(p, dict) or set(p) != expected:
            errors.append(f'{tag}: missing or unknown fields: {expected.symmetric_difference(p) if isinstance(p,dict) else "not an object"}')
            continue
        for key in TEXT:
            if not isinstance(p[key], str) or not p[key].strip():
                errors.append(f'{tag}: {key} must be nonempty text.')
        if not all(isinstance(p[k], str) for k in TEXT):
            continue
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', p['id']) or p['slug'] != p['id']:
            errors.append(f'{tag}: invalid id/slug.')
        if p['id'] in seen:
            errors.append(f'{tag}: duplicate id.')
        seen.add(p['id'])
        if not isinstance(p['category'], str) or p['category'] not in CATEGORIES:
            errors.append(f'{tag}: invalid category.')
        if not isinstance(p['coverage'], str) or p['coverage'] not in {'verified', 'partial'}:
            errors.append(f'{tag}: invalid coverage.')
        source_absent = p['stage'] is None and p['coverage'] == 'partial'
        portfolio = p.get('portfolio') if isinstance(p.get('portfolio'), dict) else {}
        descriptive_only = portfolio.get('classification') in ('concept', 'historical')
        if not source_absent and (not isinstance(p['stage'], str) or p['stage'] not in STAGES):
            errors.append(f'{tag}: invalid or unevidenced stage.')
        updated_at = strict_date(p['updatedAt'])
        if updated_at is None:
            errors.append(f'{tag}: invalid date.')
        elif updated_at > as_of:
            errors.append(f'{tag}: evidence date exceeds catalog review date.')
        for key in LISTS:
            if not isinstance(p[key], list) or any(not isinstance(x, str) or not x.strip() for x in p[key]):
                errors.append(f'{tag}: {key} must be an array of text.')
        for key in ('audiences', 'features', 'technologies', 'architecture'):
            if not p[key] and not ((source_absent or descriptive_only) and key in ('features', 'technologies', 'architecture')):
                errors.append(f'{tag}: {key} is required.')
        source_ids = []
        if not isinstance(p['sources'], list) or not p['sources']:
            errors.append(f'{tag}: evidence sources required.')
        else:
            for source in p['sources']:
                if not isinstance(source, dict) or set(source) != {'id', 'label', 'kind', 'revision', 'scope'} or any(not isinstance(x,str) or not x.strip() for x in source.values()):
                    errors.append(f'{tag}: invalid source record.')
                else:
                    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', source['id']):
                        errors.append(f'{tag}: invalid source id.')
                    else:
                        source_ids.append(source['id'])
            if len(set(source_ids)) != len(source_ids):
                errors.append(f'{tag}: duplicate source ids.')
        if data['schemaVersion'] == 2:
            meta = p.get('portfolio')
            if not isinstance(meta, dict) or set(meta) != PORTFOLIO_FIELDS:
                errors.append(f'{tag}: invalid portfolio metadata fields.')
            else:
                if not isinstance(meta['classification'], str) or meta['classification'] not in CLASSIFICATIONS:
                    errors.append(f'{tag}: invalid portfolio classification.')
                if not isinstance(meta['aliases'], list) or any(not isinstance(a,str) or not a.strip() for a in meta['aliases']):
                    errors.append(f'{tag}: invalid aliases.')
                for field in ('functionalStatus','distributionStatus','productionStatus'):
                    if not isinstance(meta[field],str) or not meta[field].strip():
                        errors.append(f'{tag}: {field} is required.')
                if isinstance(meta['functionalStatus'],str) and len(meta['functionalStatus'])>48:
                    errors.append(f'{tag}: functional label must remain readable in the showroom.')
                platform_fields={'name','implementation','verification','distribution','limits'}
                if not isinstance(meta['platforms'],list) or not meta['platforms']:
                    errors.append(f'{tag}: platform status required.')
                else:
                    for platform in meta['platforms']:
                        if not isinstance(platform,dict) or set(platform)!=platform_fields or any(not isinstance(v,str) or not v.strip() for v in platform.values()):
                            errors.append(f'{tag}: incomplete platform status.')
                feature_sources=meta['featureSources']
                if not isinstance(feature_sources,list) or not isinstance(p['features'],list) or len(feature_sources)!=len(p['features']):
                    errors.append(f'{tag}: each feature requires evidence.')
                else:
                    for references in feature_sources:
                        if not isinstance(references,list) or not references or any(not isinstance(r,str) or r not in source_ids for r in references):
                            errors.append(f'{tag}: unknown feature evidence.')
                evidence_fields={'date','revision','environment','scope','status','result','source','historical'}
                if not isinstance(meta['verification'],list) or not meta['verification']:
                    errors.append(f'{tag}: verification record required.')
                else:
                    for evidence in meta['verification']:
                        if not isinstance(evidence,dict) or set(evidence)!=evidence_fields:
                            errors.append(f'{tag}: invalid verification fields.');continue
                        if type(evidence['historical']) is not bool or evidence['status'] not in ('PASS','FAIL','BLOCKED','NOT RUN'):
                            errors.append(f'{tag}: invalid verification status.')
                        if any(not isinstance(evidence[k],str) or not evidence[k].strip() for k in ('revision','environment','scope','result','source')):
                            errors.append(f'{tag}: verification scope and provenance are required.')
                        if evidence['source'] not in source_ids:
                            errors.append(f'{tag}: unknown verification source.')
                        observed=strict_date(evidence['date'])
                        if evidence['date'] is None:
                            if evidence['historical'] is not True:
                                errors.append(f'{tag}: current verification requires a date.')
                        elif observed is None or updated_at is None or observed > updated_at:
                            errors.append(f'{tag}: invalid or future verification date.')

        if not isinstance(p['cases'], list):
            errors.append(f'{tag}: cases must be an array.')
        else:
            for case in p['cases']:
                if not isinstance(case, dict) or set(case) != set(CASE_FIELDS) or any(not isinstance(x,str) or not x.strip() for x in case.values()):
                    errors.append(f'{tag}: incomplete engineering case.')
                elif case['source'] not in source_ids:
                    errors.append(f'{tag}: engineering case references an unknown source.')
        if not isinstance(p['gallery'], list):
            errors.append(f'{tag}: gallery must be an array.')
        else:
            for img in p['gallery']:
                if not isinstance(img,dict) or set(img) != {'src','alt','caption','width','height'}:
                    errors.append(f'{tag}: invalid gallery record.')
                    continue
                safe_asset = False
                if isinstance(img['src'], str) and re.fullmatch(r'assets/projects/[a-z0-9][a-z0-9-]*(?:/[a-z0-9][a-z0-9-]*)*\.(webp|png|jpg)', img['src']):
                    try:
                        asset = ROOT / img['src']
                        safe_asset = asset.resolve().is_relative_to(ROOT.resolve() / 'assets/projects') and asset.is_file()
                    except (OSError, ValueError, RuntimeError):
                        safe_asset = False
                if not safe_asset:
                    errors.append(f'{tag}: missing or unsafe gallery asset.')
                if any(not isinstance(img[k],str) or not img[k].strip() for k in ('alt','caption')):
                    errors.append(f'{tag}: image descriptions required.')
                if any(type(img[k]) is not int or img[k] < 1 for k in ('width','height')):
                    errors.append(f'{tag}: invalid image dimensions.')
        # No embeds or invented video affordances. Only reviewed HTTPS links.
        if not isinstance(p['videos'],list):
            errors.append(f'{tag}: videos must be an array.')
        for key in ('links','videos'):
            if not isinstance(p[key],list):
                errors.append(f'{tag}: invalid {key}.')
                continue
            for link in p[key]:
                if not isinstance(link,dict) or set(link) != {'label','url'} or not all(isinstance(x,str) and x.strip() for x in link.values()):
                    errors.append(f'{tag}: invalid {key} record.')
                    continue
                if not public_url(link['url']):
                    errors.append(f'{tag}: unsafe external URL.')
        if p['repository'] is not None:
            repository = p['repository']
            valid_repository = False
            if public_url(repository):
                url = urlsplit(repository)
                valid_repository = (url.netloc == 'github.com' and not url.query and not url.fragment
                                    and re.fullmatch(r'/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?', url.path) is not None)
            if not valid_repository:
                errors.append(f'{tag}: repository requires a verified public HTTPS GitHub URL.')
        try:
            public = json.dumps(p,ensure_ascii=False)
        except (TypeError, ValueError):
            errors.append(f'{tag}: public data must be JSON serializable.')
            continue
        if re.search(r'/home/|/srv/|/tmp/|localhost|127\.0\.0\.1|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?:api[_-]?key|password|token)\s*[=:]\s*[\w-]{16,}',public,re.I):
            errors.append(f'{tag}: private location or secret-like value in public copy.')
    return errors


def read_catalog():
    data = json.loads((ROOT/'catalog/projects.json').read_text())
    errors = validate_catalog(data)
    if errors:
        raise ValueError('\n'.join(errors))
    return data


def items(values):
    return ('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in values) + '</ul>') if values else '<p>Zakres nie został potwierdzony w dostępnych źródłach.</p>'


def project_url(p, prefix=''):
    return f'{prefix}projekty/{p["slug"]}/'


def stage(p):
    return e(p.get('portfolio',{}).get('functionalStatus') or p['stage'] or 'Etap do potwierdzenia')


def card(p):
    category = CATEGORIES[p['category']][0]
    meta = p.get('portfolio', {})
    classification = meta.get('classification', '')
    kind = CLASSIFICATIONS.get(classification, category)
    search = normalize(' '.join([p['name'],p['summary'],category,kind,*meta.get('aliases',[]),*p['features'],*p['technologies']]))
    preview = ''
    if p['gallery']:
        img = p['gallery'][0]
        preview = f'<img class="card-preview" src="{e(img["src"])}" width="{img["width"]}" height="{img["height"]}" alt="{e(img["alt"])}" loading="lazy" decoding="async">'
    return f'''<article class="catalog-card" data-id="{p['id']}" data-category="{p['category']}" data-classification="{e(classification)}" data-stage="{e(p['stage'] or '')}" data-search="{e(search)}" data-technologies="{e(json.dumps(p['technologies'],ensure_ascii=False))}">
      <div class="card-top"><span class="card-category">{e(category)} · {e(kind)}</span><h3>{e(p['name'])}</h3><p>{e(p['summary'])}</p><span class="card-stage">{stage(p)}</span></div>{preview}
      <details class="project-drawer" id="projekt-{p['id']}"><summary aria-controls="drawer-{p['id']}">Odkryj projekt <span class="sr-only">{e(p['name'])}</span></summary>
      <div class="drawer-content" id="drawer-{p['id']}"><h4>Problem</h4><p>{e(p['problem'])}</p><h4>Rozwiązanie</h4><p>{e(p['solution'])}</p><h4>Dla kogo</h4><p>{e(' · '.join(p['audiences']))}</p><h4>Potwierdzony zakres</h4>{items(p['features'][:4])}<h4>Stan i dostęp</h4><p>{e(p['availability'])}</p><p class="tech-line">{e(' / '.join(p['technologies']))}</p><time class="updated" datetime="{p['updatedAt']}">Przegląd źródeł: {p['updatedAt']}</time><a class="cta cta--ghost" href="{project_url(p)}">Pełne case study →</a></div></details></article>'''


def gallery(p, prefix):
    if not p['gallery']:
        return '<p>Galeria zostanie uzupełniona po przeglądzie materiałów z produktu. Obecna prezentacja opiera się na opisanych źródłach.</p>'
    return '<p>Rzeczywiste materiały z produktu. Wybierz obraz, aby go powiększyć. W podglądzie użyj strzałek; Escape zamyka powiększenie.</p><div class="screenshot-grid">' + ''.join(
        f'<figure class="screenshot"><a href="{prefix}{e(img["src"])}" data-gallery-item data-caption="{e(img["caption"])}" aria-label="Powiększ: {e(img["alt"])}"><img src="{prefix}{e(img["src"])}" width="{img["width"]}" height="{img["height"]}" alt="{e(img["alt"])}" loading="lazy" decoding="async"></a><figcaption>{e(img["caption"])}</figcaption></figure>' for img in p['gallery']) + '</div>'


def case_detail(c):
    labels = [('problem','Wyzwanie'),('diagnosis','Analiza'),('rootCause','Przyczyna'),('solution','Decyzja i poprawka'),('verification','Weryfikacja'),('result','Wynik'),('source','Źródło')]
    return '<article class="engineering-case"><dl>'+''.join(f'<dt>{label}</dt><dd>{e(c[key])}</dd>' for key,label in labels)+'</dl></article>'


def portfolio_readiness(p):
    meta = p.get('portfolio')
    if not meta:
        return ''
    platforms = ''.join('<article class="platform-status"><h3>'+e(x['name'])+'</h3><dl>'+''.join(
        f'<dt>{label}</dt><dd>{e(x[key])}</dd>' for key,label in (
            ('implementation','Implementacja'),('verification','Weryfikacja'),
            ('distribution','Dystrybucja'),('limits','Otwarte kwestie'))
    )+'</dl></article>' for x in meta['platforms'])
    return '<p class="portfolio-kind">'+e(CLASSIFICATIONS[meta['classification']])+'</p><dl class="readiness-summary">'+''.join(
        f'<dt>{label}</dt><dd>{e(value)}</dd>' for label,value in (
            ('Zakres funkcjonalny',meta['functionalStatus']),
            ('Dystrybucja',meta['distributionStatus']),('Produkcja',meta['productionStatus']))
    )+'</dl><div class="platform-status-grid">'+platforms+'</div>'


def portfolio_verification(p):
    meta = p.get('portfolio')
    if not meta:
        return ''
    checks = []
    for x in meta['verification']:
        when = f'<time datetime="{e(x["date"])}">{e(x["date"])}</time>' if x['date'] else 'Data wykonania nieustalona'
        age = 'Wynik historyczny' if x['historical'] else 'Przegląd bieżący'
        checks.append(f'<li class="verification-record"><p><strong>{e(x["status"])}</strong> · {when} · {age}</p><h3>{e(x["scope"])}</h3><p>{e(x["result"])}</p><p class="verification-context">Środowisko: {e(x["environment"])}<br>Rewizja: <code>{e(x["revision"])}</code> · <a href="#source-{e(x["source"])}">Źródło</a></p></li>')
    return '<p>Każdy wynik dotyczy wskazanego zakresu i środowiska. Odczyt kodu potwierdza implementację; nie zastępuje uruchomienia produktu.</p><ul class="verification-list">'+''.join(checks)+'</ul>'


def evidenced_features(p):
    references = p.get('portfolio',{}).get('featureSources',[])
    if not p['features']:
        return '<p>Brak potwierdzonych funkcji implementacji. Udokumentowany cel i plan opisano poniżej.</p>'
    return '<ul>'+''.join('<li>'+e(text)+(' <span class="feature-sources">'+ ' '.join(
        f'<a href="#source-{e(source)}" aria-label="Źródło funkcji {index+1}">[{n+1}]</a>' for n,source in enumerate(references[index]))+'</span>' if index<len(references) else '')+'</li>' for index,text in enumerate(p['features']))+'</ul>'


def project_release():
    """Release labels come from the shipped APK manifest, never a second copy."""
    release=json.loads((ROOT/'downloads/glikemia-premium.json').read_text())
    release['size']=f'{release["bytes"]/1_000_000:.2f}'.replace('.',',')+' MB'
    return release


def project_download_console(prefix, *, detailed=False):
    release=project_release()
    details=''
    if detailed:
        details=f'''<details class="project-file-details"><summary>Suma SHA-256 i szczegóły pliku</summary><p>APK podpisany cyfrowo i dystrybuowany bezpośrednio przez ProgressKit.</p><dl><dt>Wersja</dt><dd>{e(release['version'])} ({release['versionCode']})</dd><dt>Rozmiar</dt><dd>{release['bytes']:,} bajtów</dd><dt>Android</dt><dd>7.0 lub nowszy · minSdk {release['minSdk']}</dd></dl><p>SHA-256 pliku APK</p><code class="checksum">{e(release['sha256'])}</code><div class="project-file-qr"><img src="{prefix}assets/projects/glikemia/product-qr.png" width="100" height="100" alt="Kod QR do strony Glikemia Premium na progresskit.pl" loading="lazy"><p>Otwórz tę stronę na telefonie.<br>Zeskanuj aparatem telefonu z Androidem. Kod prowadzi wyłącznie do progresskit.pl.</p></div></details>'''
    return f'''<div class="project-download-console" data-download-console><div class="project-download-action"><a class="world-control world-control--primary" data-proximity data-download-apk href="/download/glikemia-premium"><span aria-hidden="true">↓</span> POBIERZ APK <span aria-hidden="true">↗</span></a><p class="project-release-meta">Wersja {e(release['version'])} <span>·</span> Android 7.0+ <span>·</span> {e(release['size'])}</p></div><div class="project-download-metric"><span class="project-eyebrow">POBRANIA</span><span data-download-count aria-live="polite">Licznik pobrań: ładowanie…</span><small>Zakończone pełne pobrania APK</small></div><details class="project-counter-details"><summary>Co oznacza licznik?</summary><p>Liczba zakończonych pełnych pobrań APK. Wznowienia/Range i wykrywalny prefetch nie są naliczane; to nie jest liczba unikalnych użytkowników ani instalacji.</p></details>{details}</div>'''


def project_artifact(p, prefix):
    """A physical display uses only reviewed source media; no fabricated app UI."""
    if p['gallery']:
        img=p['gallery'][0]
        portrait=img['height']>img['width']*1.3
        kind='phone' if portrait else 'display'
        secondary=''
        if p['id']=='glikemia-premium' and len(p['gallery'])>1:
            other=p['gallery'][1]
            secondary=f'<div class="project-artifact__secondary" aria-hidden="true"><img src="{prefix}{e(other["src"])}" width="{other["width"]}" height="{other["height"]}" alt="" decoding="async"></div>'
        return f'''<figure class="project-artifact project-artifact--{kind}" data-proximity data-project-artifact><div class="project-artifact__orbit" aria-hidden="true"></div><div class="project-artifact__plinth" aria-hidden="true"></div>{secondary}<a class="project-artifact__screen" href="#galeria" aria-label="Zobacz rzeczywiste ekrany: {e(p['name'])}"><img src="{prefix}{e(img['src'])}" width="{img['width']}" height="{img['height']}" alt="{e(img['alt'])}" fetchpriority="high" decoding="async"></a><figcaption><span aria-hidden="true">●</span> RZECZYWISTY EKRAN PRODUKTU <span aria-hidden="true">/ 01</span></figcaption></figure>'''
    return f'''<figure class="project-artifact project-artifact--core" data-proximity data-project-artifact><div class="project-artifact__orbit" aria-hidden="true"></div><div class="project-artifact__plinth" aria-hidden="true"></div><div class="project-artifact__crystal" aria-hidden="true"><span>{e(CATEGORIES[p['category']][1])}</span><i></i><i></i></div><figcaption>{e(CATEGORIES[p['category']][0]).upper()} <span aria-hidden="true">/ {e(p['id']).upper()}</span></figcaption></figure>'''


def full_case(p, prefix='../../', distribution=False):
    is_glikemia=p['id']=='glikemia-premium'
    chapter_number=0
    def section(id_,title,body,eyebrow='POZNAJ PROJEKT'):
        nonlocal chapter_number
        chapter_number+=1
        return f'<section class="project-chapter case-section" id="{id_}" aria-labelledby="chapter-{id_}"><header class="project-chapter-heading"><span class="project-chapter-number" aria-hidden="true">{chapter_number:02d}</span><div><p class="project-eyebrow">{eyebrow}</p><h2 id="chapter-{id_}">{title}</h2></div></header><div class="project-chapter-body">{body}</div></section>'
    nav=[('problem','Idea'),('architektura','Architektura'),('funkcje','Funkcje'),('galeria','Ekrany')]
    if p.get('portfolio'):
        nav += [('platformy','Platformy'),('weryfikacja','Dowody')]
    nav += [('wyzwania','Wyzwania'),('rozwoj','Rozwój'),('dostep','Pobierz' if is_glikemia else 'Dostęp')]
    if distribution:
        nav += [('installation','Instalacja'),('feedback','Opinie')]
    title='Glikemia <em>Premium</em>' if is_glikemia else e(p['name'])
    lead='Twój dziennik. Twoje dane.' if is_glikemia else e(p['summary'])
    subtitle='Zapisuj pomiary, przeglądaj historię i przygotuj raport PDF. Dane dziennika pozostają lokalnie na Twoim telefonie.' if is_glikemia else e(p['problem'])
    facts=[('Android','Aplikacja mobilna'),('Offline','Dane na urządzeniu'),('PDF','Historia i wykresy')] if is_glikemia else [(e(t),'') for t in p['technologies'][:4]]
    fact_markup=''.join(f'<li><strong>{title_}</strong><span>{description}</span></li>' for title_,description in facts)
    actions=project_download_console(prefix) if is_glikemia else f'<div class="project-hero-actions"><a class="world-control world-control--primary" data-proximity href="#problem">WEJDŹ W PROJEKT <span aria-hidden="true">↓</span></a><a class="world-control" data-proximity href="#dostep">Dostęp i kontakt</a></div>'
    guide='Dane pozostają lokalnie na urządzeniu. Licznik pobrań i opinie należą do strony, nie do chmury pomiarów.' if is_glikemia else 'Poznaj zakres produktu, materiały i opisane dowody. Każdy wynik zachowuje swój kontekst i datę.'
    out=f'''<article class="project-world" data-project-id="{e(p['id'])}"><header class="project-world-hero"><div class="project-hero-wayfinding"><a href="{prefix}#projekty" class="project-return" data-proximity>← EKOSYSTEM</a><span>PROGRESSKIT / {e(CATEGORIES[p['category']][0]).upper()}</span><span class="project-location" aria-hidden="true">PROJECT CHAMBER / 01</span></div><div class="project-hero-stage"><div class="project-hero-copy"><p class="project-eyebrow"><span class="project-status-light" aria-hidden="true"></span>{e(p['stage'] or stage(p))}</p><h1 class="project-title">{title}</h1><p class="project-hero-value">{lead}</p><p class="project-hero-description">{subtitle}</p><ul class="project-product-facts" aria-label="Najważniejsze informacje">{fact_markup}</ul>{actions}</div>{project_artifact(p,prefix)}</div><div class="project-hero-footer"><span class="project-guide-note"><span aria-hidden="true">◇</span> {guide}</span><a href="#problem">ODKRYJ WIĘCEJ <span aria-hidden="true">↓</span></a></div></header><nav class="project-chapter-rail" data-project-chapters aria-label="W tej prezentacji">{''.join(f'<a href="#{id_}" data-proximity><span>{i+1:02d}</span>{label}</a>' for i,(id_,label) in enumerate(nav))}</nav><div class="project-story">'''
    out+=section('problem','Od potrzeby do produktu.',f'<div class="project-story-pair"><article class="project-glass-plate"><span class="project-eyebrow">POTRZEBA</span><h3>Problem</h3><p>{e(p["problem"])}</p><h3>Dla kogo</h3>{items(p["audiences"])}</article><article class="project-glass-plate project-glass-plate--lit"><span class="project-eyebrow">ODPOWIEDŹ</span><h3>Rozwiązanie</h3><p>{e(p["solution"])}</p><h3>Dlaczego powstał</h3><p>{e(p["motivation"])}</p></article></div>','IDEA / ZASTOSOWANIE')
    architecture=''.join(f'<li><span class="project-flow-index" aria-hidden="true">{i+1:02d}</span><p>{e(value)}</p></li>' for i,value in enumerate(p['architecture']))
    tech=''.join(f'<li>{e(t)}</li>' for t in p['technologies'])
    out+=section('architektura','Technologia pod powierzchnią.',f'<ol class="project-architecture-flow">{architecture}</ol><ul class="project-technology-tags" aria-label="Technologie projektu">{tech}</ul>','ARCHITEKTURA / POŁĄCZENIA')
    out+=section('funkcje','Zaprojektowane do działania.',f'<div class="project-feature-grid">{evidenced_features(p)}</div><details class="project-disclosure"><summary>Wyniki i granice weryfikacji</summary>{items(p["results"])}</details>','FUNKCJE / POTWIERDZONY ZAKRES')
    out+=section('galeria','Zajrzyj do środka.',('<span id="screenshots" class="project-anchor" aria-hidden="true"></span>' if distribution else '')+gallery(p,prefix),'PRAWDZIWE EKRANY / BEZ MAKIET')
    if p.get('portfolio'):
        out+=section('platformy','Produkt, platformy, dostępność.',portfolio_readiness(p),'STAN PRODUKTU')
        out+=section('weryfikacja','Dowody z kontekstem.',portfolio_verification(p),'WERYFIKACJA / DATY / ŚRODOWISKA')
    challenges=''.join(f'<details class="project-disclosure"><summary>{e(c["problem"])}</summary>{case_detail(c)}</details>' for c in p['cases']) if p['cases'] else '<p>Brak wystarczających źródeł do opisania potwierdzonego incydentu i jego rozwiązania.</p>'
    out+=section('wyzwania','Decyzje, które robią różnicę.',challenges,'WYZWANIA INŻYNIERYJNE')
    out+=section('rozwoj','Następne kroki.',f'<p class="project-current-stage"><strong>{stage(p)}</strong> · {e(p["availability"])}</p><div class="project-story-pair"><article class="project-glass-plate"><h3>Do potwierdzenia lub ukończenia</h3>{items(p["remaining"])}</article><article class="project-glass-plate"><h3>Planowane kierunki</h3>'+ (items(p['planned']) if p['planned'] else '<p>Brak potwierdzonego publicznego planu kolejnych funkcji.</p>')+'</article></div>','ROZWÓJ / OTWARTE KIERUNKI')
    links=''.join(f'<a class="world-control" data-proximity href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])} ↗</a>' for link in p['links']+p['videos'])
    if p['repository']:
        links+=f'<a class="world-control" data-proximity href="{e(p["repository"])}" target="_blank" rel="noopener noreferrer">Publiczne repozytorium ↗</a>'
    if is_glikemia:
        links+=f'<a class="world-control" data-proximity href="{prefix}glikemia-premium/">Strona aplikacji i dystrybucji →</a><a class="world-control" data-proximity href="{prefix}glikemia-premium/#feedback">Opinie użytkowników →</a>'
        download_details=f'<div id="download-details">{project_download_console(prefix,detailed=True)}</div><p>Android · Bezpłatnie · Bez konta · Bez reklam</p><p>Aplikacja jest cyfrowym dziennikiem glikemii i nie zastępuje profesjonalnej porady medycznej.</p><p><a href="https://progressorkit.github.io/GlikemiaPremium-Privacy/" target="_blank" rel="noopener noreferrer">Polityka prywatności aplikacji ↗</a></p>'
    else:
        download_details=''
    out+=section('dostep','Gotowy na Twoim urządzeniu.' if is_glikemia else 'Poznaj projekt bliżej.',download_details+f'<details class="project-disclosure"><summary>Etap i zakres dostępności</summary><p>{e(p["availability"])}</p><p>{e(p["summary"])}</p></details><div class="project-access-links">'+links+f'<a class="world-control" data-proximity href="mailto:pawel@progresskit.pl?subject={p["slug"]}">Zapytaj o projekt →</a></div>','DYSTRYBUCJA / KONTAKT')
    if distribution:
        out+=(ROOT/'templates/glikemia-distribution.html').read_text().replace('@@ROOT@@',prefix)
    sources=''.join(f'<li id="source-{e(s["id"])}"><strong>{e(s["label"])}</strong> · {e(s["kind"])} · <code>{e(s["revision"])}</code><br>{e(s["scope"])}</li>' for s in p['sources'])
    out+=section('zrodla','Podstawa prezentacji.',f'<p>Zakres ustalono na podstawie kodu i materiałów wymienionych poniżej. Wyniki historycznych testów zachowują datę oraz zakres; nie oznaczają ponownego testu ani potwierdzenia produkcji.</p><details class="project-disclosure" data-project-sources><summary>Źródła i rewizje ({len(p["sources"])})</summary><ul class="source-list">{sources}</ul></details><time class="project-source-date" datetime="{p["updatedAt"]}">Przegląd źródeł: {p["updatedAt"]}</time>','TRANSPARENTNOŚĆ')
    return out+'</div></article>'


def explorer_section(data):
    projects=data['projects']
    counts=Counter(p['category'] for p in projects)
    cats=''.join(f'<button class="category" type="button" data-filter-category="{key}" aria-pressed="false"><span class="category__icon" aria-hidden="true">{icon}</span><span class="category__label">{label}</span><span class="category__count">{counts[key]:02d}</span></button>' for key,(label,icon) in CATEGORIES.items() if counts[key])
    technologies=sorted({t for p in projects for t in p['technologies']},key=str.casefold)
    stages=sorted({p['stage'] for p in projects if p['stage']})
    options=lambda values:''.join(f'<option value="{e(v)}">{e(v)}</option>' for v in values)
    kinds=''.join(f'<option value="{key}">{label}</option>' for key,label in CLASSIFICATIONS.items() if any(p.get('portfolio',{}).get('classification')==key for p in projects))
    return f'''<section class="section" id="projekty"><div class="shell"><div class="catalog-intro"><span class="section-kicker">KATALOG PROJEKTÓW</span><h2 class="section-title">Znajdź projekt.</h2><p class="section-copy">Wyszukaj nazwę lub technologię, porównaj etap rozwoju i poznaj zakres potwierdzony w źródłach.</p></div><noscript><p class="empty-state">Wszystkie projekty i szczegóły są dostępne poniżej. Wyszukiwanie oraz filtry wymagają JavaScript.</p></noscript><div class="category-grid" data-js-only hidden>{cats}</div><form class="catalog-tools" id="catalog-filters" role="search" aria-label="Wyszukaj projekt" data-js-only hidden><label for="project-search">Szukaj w ekosystemie<input id="project-search" name="q" type="search" maxlength="160" placeholder="Nazwa, zastosowanie lub technologia" autocomplete="off"></label><label for="technology-filter">Technologia<select id="technology-filter" name="technologia"><option value="">Wszystkie technologie</option>{options(technologies)}</select></label><label for="classification-filter">Rodzaj<select id="classification-filter" name="typ"><option value="">Wszystkie rodzaje</option>{kinds}</select></label><label for="stage-filter">Etap rozwoju<select id="stage-filter" name="etap"><option value="">Wszystkie etapy</option>{options(stages)}<option value="unverified">Etap do potwierdzenia</option></select></label><button class="plain-button" type="reset">Wszystkie projekty ↺</button></form><div class="catalog-feedback"><p id="catalog-results" role="status" aria-live="polite" aria-atomic="true">{len(projects)} projektów i elementów zaplecza</p><a href="#rozwoj">Stan prac ↓</a></div><p class="empty-state" id="catalog-empty" hidden>Brak projektów dla tych kryteriów. Zmień wyszukiwanie lub wybierz „Wszystkie projekty”.</p><div class="catalog-grid">{''.join(card(p) for p in projects)}</div><p class="updated">Przegląd katalogu: {e(data['asOf'])}. Etap i dostępność opisano osobno.</p></div></section>'''


def development_section(projects):
    progress=''.join(f'<article class="development-item"><time class="section-kicker" datetime="{p["updatedAt"]}">{p["updatedAt"]}</time><h3>{e(p["name"])}</h3><span class="card-stage">{stage(p)}</span><p>{e(p["availability"])}</p><p><a href="{project_url(p)}#rozwoj">Zakres i kolejne kroki →</a></p></article>' for p in sorted(projects,key=lambda p:p['updatedAt'],reverse=True))
    return f'<section class="section" id="rozwoj"><div class="shell"><span class="section-kicker">ROZWÓJ I AKTUALNOŚĆ</span><h2 class="section-title">Stan prac.</h2><p class="section-copy">Daty odnoszą się do sprawdzonych źródeł. Wynik lokalnego testu nie potwierdza aktualnego wdrożenia.</p><div class="development-grid">{progress}</div></div></section>'


def category_windows(projects):
    descriptions={
        'mobile':('Narzędzia pod ręką.', 'Pomiary, poczta i tłumaczenia. Poznaj aplikacje, ich rzeczywisty zakres i kierunek rozwoju.'),
        'saas':('Procesy nabierają struktury.', 'Podatki, opieka, transport i obsługa biznesu. Systemy zbudowane wokół konkretnych procesów.'),
        'platforms':('Miejsce dla społeczności.', 'Ludzie, treści i zasady dostępu. Zajrzyj do architektury platformy ProgressKit Community.'),
        'games':('Świat do odkrycia.', 'Vaeloria: eksploracja, taktyka i rozwój świata gry. Zobacz autentyczne materiały z publicznego preview.'),
        'web':('Obecność z charakterem.', 'Serwisy usługowe i autorskie. Każda realizacja ma własny kontekst, treść i odbiorców.'),
        'technology':('To, co pracuje pod powierzchnią.', 'Witryna, własna analityka i infrastruktura. Poznaj zaplecze oraz granice jego weryfikacji.'),
    }
    slots=[]
    for key,(label,icon) in CATEGORIES.items():
        members=[p for p in projects if p['category']==key]
        if not members:
            continue
        cards=[]
        for index,p in enumerate(members,1):
            preview=f'<span class="category-project__index" aria-hidden="true">{index:02d}</span>'
            if p['gallery']:
                img=p['gallery'][0]
                preview=f'<figure class="category-project__media"><img class="category-project__image" src="{e(img["src"])}" width="{img["width"]}" height="{img["height"]}" alt="{e(img["alt"])}" loading="lazy" decoding="async"><figcaption>{e(img["caption"])}</figcaption></figure>'
            technologies='<ul class="category-project__tech" aria-label="Technologie">'+''.join(f'<li>{e(t)}</li>' for t in p['technologies'][:4])+'</ul>' if p['technologies'] else ''
            cards.append(f'<article class="category-project" data-id="{p["id"]}" data-category="{key}">{preview}<div class="category-project__body"><h4>{e(p["name"])}</h4><p>{e(p["summary"])}</p><span class="card-stage">{stage(p)}</span>{technologies}<a class="category-project__link" href="{project_url(p)}">Poznaj projekt <span class="sr-only">{e(p["name"])}</span> →</a></div></article>')
        headline,description=descriptions[key]
        slots.append(f'''<details class="category-slot" name="project-categories" data-category="{key}"><summary class="category" data-category-toggle="{key}" aria-controls="category-panel-{key}"><span class="category__icon" aria-hidden="true">{icon}</span><span class="category__label">{label}</span><span class="category__count" aria-label="Liczba projektów: {len(members)}">{len(members):02d}</span></summary><section class="category-panel" id="category-panel-{key}" aria-labelledby="category-heading-{key}"><header class="category-panel__head"><div class="category-panel__intro"><span class="category-panel__eyebrow section-kicker">{e(headline)}</span><h3 id="category-heading-{key}">{label}</h3><p class="category-panel__description">{e(description)}</p></div><button class="plain-button" type="button" data-category-close aria-label="Zamknij kategorię {label}" data-js-only hidden>Zamknij ×</button></header><div class="category-projects">{''.join(cards)}</div><footer class="category-panel__footer"><a href="projekty/?kategoria={key}">Wyszukaj w tej kategorii →</a></footer></section></details>''')
    idle='<div class="category-browser__idle"><div class="category-browser__architecture" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="category-browser__invitation"><span class="section-kicker">EKOSYSTEM PROGRESSKIT</span><p class="category-browser__headline">Sześć wejść.<br>Wiele perspektyw.</p><p>Wybierz obszar i poznaj projekty od środka.</p><span class="category-browser__hint">Najedź kursorem lub otwórz wybraną kategorię.</span></div></div>'
    return '<section class="section categories-section" id="projekty"><div class="shell"><h2 class="sr-only">Kategorie projektów</h2><div class="category-browser" aria-label="Kategorie projektów"><div class="category-grid">'+''.join(slots)+idle+'</div></div><p class="catalog-link"><a href="projekty/">Wyszukaj projekt lub technologię →</a></p></div></section>'


def brief_section():
    brief='''<div class="shell"><section class="brief world-surface" id="brief" data-reveal><header class="brief__heading"><div><span class="section-kicker">PIERWSZY KROK</span><h3>Opisz swój projekt</h3></div><p>Wyślij opis projektu bezpośrednio do ProgressKit. Potwierdzenie z numerem zgłoszenia pojawi się po jego zapisaniu. Możesz także pobrać TXT lub zapisać PDF.</p></header>
<form data-project-inquiry action="/api/project-inquiries" method="post" aria-describedby="inquiry-privacy inquiry-required">
<fieldset class="brief-contact"><legend>Dane kontaktowe</legend><p id="inquiry-required">Wymagane: dane kontaktowe, e-mail, typ klienta i opis problemu. Telefon i pozostałe odpowiedzi są opcjonalne.</p><div class="brief-contact-grid">
<label for="brief-contact-name">Imię i nazwisko lub nazwa firmy<input data-inquiry-field id="brief-contact-name" name="contact_name" autocomplete="name" minlength="2" maxlength="160" required></label>
<label for="brief-email">Adres e-mail do kontaktu<input data-inquiry-field id="brief-email" name="email" type="email" autocomplete="email" maxlength="254" required></label>
<label for="brief-client-type">Typ klienta<select data-inquiry-field id="brief-client-type" name="client_type" required><option value="">Wybierz typ klienta</option><option value="company">Firma</option><option value="private">Osoba prywatna</option><option value="cooperation">Współpraca</option></select></label>
<label for="brief-phone">Telefon (opcjonalnie)<input data-inquiry-field id="brief-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div></fieldset><div class="brief-grid">'''
    for id_,label in [('problem','Jaki problem ma rozwiązać system?'),('users','Kto będzie z niego korzystać?'),('processes','Jakie procesy lub funkcje powinien obsługiwać?'),('integrations','Czy wymaga integracji z istniejącymi usługami?'),('budget','Orientacyjny budżet'),('deadline','Oczekiwany termin')]:
        required=' required minlength="10"' if id_=='problem' else ''
        brief+=f'<label for="brief-{id_}">{label}<textarea data-inquiry-field id="brief-{id_}" name="{id_}" rows="4" maxlength="6000"{required}></textarea></label>'
    return brief+'''</div><div class="inquiry-trap" aria-hidden="true"><label for="brief-website">Pozostaw puste<input id="brief-website" name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="inquiry-privacy" id="inquiry-privacy">Administratorem danych jest Paweł Rzepczyk, ProgressKit. Dane wykorzystujemy do odpowiedzi na zapytanie i ustalenia współpracy. Bez marketingu. Zgłoszenia przechowujemy do 180 dni, następnie usuwamy w cyklu dobowym. Nie wpisuj haseł, sekretów ani danych szczególnie chronionych. <a href="prywatnosc/#zgloszenia">Zasady przetwarzania danych i Twoje prawa</a>.</p>
<div class="hero__actions brief__actions"><button class="cta cta--primary" type="submit" data-submit-inquiry disabled>Wyślij projekt</button><button class="cta cta--ghost" type="button" data-download-brief>Pobierz brief .txt ↓</button><button class="cta cta--ghost" type="button" data-print>Drukuj / zapisz PDF</button><button class="cta cta--ghost" type="button" data-refresh-inquiry hidden>Ponów połączenie</button><button class="cta cta--ghost" type="button" data-new-inquiry hidden>Wyczyść i rozpocznij nowe zgłoszenie</button></div>
<p data-inquiry-status role="status" aria-live="polite" aria-atomic="true" tabindex="-1">Ładowanie bezpiecznej wysyłki…</p><p data-brief-status role="status" aria-live="polite"></p><div data-brief-print class="brief-print"></div><noscript>Wysyłanie wymaga JavaScript. Bez niego formularz nie wysyła danych. Możesz skontaktować się z ProgressKit pod adresem pawel@progresskit.pl.</noscript></form></section></div>'''


def production_section():
    return (ROOT/'templates/production-line.html').read_text()


def technology_section(projects):
    # Count each technology once per project, preserving the catalog filter values.
    counts = Counter(technology for project in projects for technology in set(project['technologies']))
    technologies = sorted(counts, key=str.casefold)
    patterns = (
        ('security', 'Security', r'keystore|identity|biometric|JWT|OAuth|OpenSSL|CNG|DPAPI|Secret Service|ClamAV|EC P-256|SHA-256'),
        ('mobile', 'Mobile', r'Android|Kotlin|Jetpack|WorkManager|Foreground|Firebase|SharedPreferences|LocalNotification|MAUI|Microcharts'),
        ('data', 'Data / DB', r'SQL|Sqlite|SQLite|PostGIS|Prisma|Entity Framework|EFCore|Room|JSON|CSV'),
        ('media', 'AI / Media', r'Whisper|whisper|llama|Qwen|Piper|Ollama|ONNX|ML Kit|Audio|WASAPI|Speech|TextToSpeech|FFmpeg'),
        ('frontend', 'Frontend', r'HTML|CSS|React|Next\.js|Canvas|Three\.js|WebGL|SkiaSharp|Avalonia|WPF|Qt|Godot|GL Compatibility|Jinja2'),
        ('backend', 'Backend', r'ASP\.NET|FastAPI|ASGI|Node\.js|SignalR|MailKit|MimeKit|SMTP|Eclipse|Domain/Application|^\.NET'),
        ('infra', 'Infrastructure', r'Linux|Docker|Caddy|Aspia|GitHub Pages'),
        ('tools', 'Tools / Delivery', r'^C#|^C\+\+|JavaScript|TypeScript|Python|Bash|PowerShell|GitHub Actions|NSIS|ADB|GDScript|xUnit|Testcontainers|Turborepo|pnpm|Pydantic'),
    )
    buckets = {key: [] for key, _, _ in patterns}
    other = []
    for technology in technologies:
        category = next((key for key, _, pattern in patterns if re.search(pattern, technology, re.I)), None)
        (buckets[category] if category else other).append(technology)
    order = ['backend', 'frontend', 'mobile', 'data', 'infra', 'security', 'media', 'tools']
    labels = {key: label for key, label, _ in patterns}
    labels.update(frontend='Web', data='Data', tools='Delivery')
    groups = [(key, labels[key], buckets[key]) for key in order if buckets[key]]
    if other:
        groups.append(('other', 'Inne', other))
    sections = []
    for identifier, label, members in groups:
        icons = {
            'backend': '<rect x="4" y="3" width="24" height="10" rx="2"/><rect x="4" y="19" width="24" height="10" rx="2"/><path d="M8 8h2m4 0h10M8 24h2m4 0h10M16 13v6"/>',
            'frontend': '<path d="M11 7 3 16l8 9m10-18 8 9-8 9M19 3l-6 26"/>',
            'mobile': '<rect x="8" y="2" width="16" height="28" rx="3"/><path d="M13 6h6m-5 20h4"/>',
            'data': '<ellipse cx="16" cy="7" rx="12" ry="5"/><path d="M4 7v18c0 7 24 7 24 0V7M4 16c0 7 24 7 24 0"/>',
            'infra': '<path d="M16 3v8M5 26v-8h22v8M16 18v8"/><rect x="11" y="2" width="10" height="9"/><path d="M2 26h6m5 0h6m5 0h6"/>',
            'security': '<path d="m16 2 12 5v9c0 7-12 14-12 14S4 23 4 16V7Z"/><path d="m10 16 4 4 8-9"/>',
            'media': '<circle cx="16" cy="16" r="11"/><path d="M16 1v5m0 20v5M1 16h5m20 0h5m-19-5 10 5-10 5Z"/>',
            'tools': '<path d="m7 4 7 7-4 4-7-7c-3 8 4 13 10 10l12 12 5-5-12-12c3-6-2-13-11-9Z"/>',
        }
        icon = f'<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1">{icons.get(identifier, icons["tools"])}</svg>'
        chips = ''.join(
            f'<a class="technology-chip" href="projekty/?technologia={quote(technology, safe="")}"><i class="technology-glyph" aria-hidden="true">{icon}</i><span class="technology-name">{e(technology)}</span><span class="technology-count">{counts[technology]}</span></a>'
            for technology in members
        )
        sample = ' · '.join(members[:3])
        sections.append(f'<details class="technology-group" name="technology-category" data-technology-family="{identifier}"><summary><span class="technology-sigil" aria-hidden="true">{icon}</span><span class="technology-group__title" id="technology-group-{identifier}">{e(label)}</span><span class="technology-preview">{e(sample)}</span><span class="technology-discover">{len(members):02d} technologii <b aria-hidden="true">+</b></span></summary><div class="technology-chips">{chips}</div></details>')
    return '<section class="section technology-section" id="technologie"><div class="shell" data-reveal><span class="section-kicker">TECHNOLOGIE W PROJEKTACH</span><h2 class="section-title">Warsztat.</h2><p class="section-copy">Wybierz technologię, aby zobaczyć projekty, w których została wykorzystana.</p><div class="technology-groups">'+''.join(sections)+'</div><p class="catalog-link"><a href="projekty/#rozwoj">Sprawdź aktualny stan rozwoju produktów →</a></p></div></section>'


def homepage(data):
    projects=data['projects']
    spec=importlib.util.spec_from_file_location('living_markup',ROOT/'scripts/living_markup.py')
    living=importlib.util.module_from_spec(spec);spec.loader.exec_module(living)
    out=living.render(projects, stage, project_url)
    spec=importlib.util.spec_from_file_location('delivery_markup',ROOT/'scripts/delivery_markup.py')
    delivery=importlib.util.module_from_spec(spec);spec.loader.exec_module(delivery)
    about_services,contact=(ROOT/'templates/about-contact.html').read_text().split('<!-- CONTACT -->')
    about,services=about_services.split('<!-- SERVICES -->')
    out+='<div class="world-zone" data-world-zone="engineering">'+services+production_section()+delivery.render_case_studies()+technology_section(projects)+'</div>'
    out+='<div class="world-zone" data-world-zone="ecosystem">'+delivery.render_delivery(projects)+about+'</div>'
    return out+'<div class="world-zone installation-console" data-world-zone="contact">'+contact+brief_section()+'</div>'


def explorer_page(data):
    content='<header class="case-hero"><div class="shell"><p class="breadcrumb"><a href="./#projekty">← Kategorie na stronie głównej</a></p><span class="section-kicker">PROGRESSKIT</span><h1>Eksplorator projektów</h1><p class="section-copy">Katalog produktów, realizacji i zaplecza technicznego.</p></div></header>'+explorer_section(data)+development_section(data['projects'])
    # This page is one directory below the homepage. Keep generated card links and assets relative.
    content=content.replace('href="projekty/','href="').replace('src="assets/','src="../assets/').replace('href="./#projekty"','href="../#projekty"')
    return content

PRIVACY = '''<article class="shell privacy"><span class="section-kicker">PROGRESSKIT SYSTEMS</span><h1>Prywatność witryny</h1><p>Informacja o działaniu tej wersji witryny, przegląd: 5 listopada 2026 r. Kontakt w sprawach danych: <a href="mailto:pawel@progresskit.pl">pawel@progresskit.pl</a>.</p>@@OPERATOR@@<h2>Oglądanie katalogu</h2><p>Wyszukiwanie i filtry działają w Twojej przeglądarce. Wybrane filtry mogą znajdować się w adresie strony, aby można było go udostępnić. Treść wyszukiwania nie jest dołączana do zdarzeń analitycznych.</p><h2>Własna analityka</h2><p>Na domenie progresskit.pl witryna wysyła do własnego endpointu rodzaj zdarzenia (otwarcie strony lub projektu, kontakt, link zewnętrzny), ścieżkę strony bez zapytania i fragmentu, domenę strony odsyłającej i poprawne oznaczenia kampanii UTM. Kod analityki nie używa cookies, localStorage, identyfikatora urządzenia ani zewnętrznych trackerów. Nie wysyła treści briefu ani wyszukiwania.</p><p>Baza zdarzeń nie ma pól na IP i User-Agent. Serwer i pośrednie warstwy sieci mogą prowadzić osobne dzienniki techniczne; ich konfiguracja wymaga sprawdzenia przez operatora. W dostępnej konfiguracji backendu nie ustalono automatycznej retencji zdarzeń. Te kwestie pozostają do potwierdzenia przed wdrożeniem. Ta informacja nie zastępuje polityk prywatności poszczególnych aplikacji.</p><h2 id="zgloszenia">Zgłoszenia projektów i kontakt</h2><p>Przycisk „Wyślij projekt” przekazuje dane przez szyfrowane połączenie HTTPS do własnego backendu ProgressKit. Potwierdzenie „Zgłoszenie przyjęte”, numer i data pojawiają się wyłącznie po trwałym zapisaniu zgłoszenia. Awaria powiadomienia e-mail nie usuwa zapisu; powiadomienia mają osobną kolejkę ponowień. Formularz nie uruchamia programu pocztowego. Odrębne linki z adresem e-mail nadal mogą otworzyć Twój program pocztowy.</p><p>Administratorem jest operator wskazany powyżej. Przetwarzamy imię i nazwisko lub nazwę firmy, adres e-mail, typ klienta, opis problemu, opcjonalny telefon i pozostałe odpowiedzi, numer zgłoszenia, datę i status. Wymagane pola służą odpowiedzi na zapytanie i przygotowaniu współpracy; bez nich nie można przyjąć zgłoszenia. Podstawą są działania na Twoje żądanie przed zawarciem umowy (art. 6 ust. 1 lit. b RODO), a przy kontakcie przedstawiciela firmy lub propozycji współpracy — uzasadniony interes w prowadzeniu korespondencji (art. 6 ust. 1 lit. f). Nie używamy tych danych do marketingu, profilowania ani zautomatyzowanych decyzji.</p><p>Dostęp do pełnych zgłoszeń ma wyłącznie upoważniony operator przez prywatny odczyt. Powiadomienie na skrzynkę operatora zawiera tylko numer, datę, typ i status, bez danych kontaktowych i opisu. Dane mogą technicznie przetwarzać dostawcy hostingu i poczty na zlecenie operatora; ich zakres i zasady ewentualnego transferu poza EOG wymagają potwierdzenia przez operatora przed uruchomieniem. Nie publikujemy zgłoszeń.</p><p>Zgłoszenia są przechowywane do 180 dni od przyjęcia; wygasłe rekordy są niedostępne w prywatnym API i następnie usuwane w cyklu dobowym wraz z kolejką powiadomień. Skróty HMAC adresu sieciowego i adresu e-mail używane do limitów znikają po wygaśnięciu krótkich okien ograniczeń, nie później niż przy dobowym czyszczeniu. Nie zapisujemy surowego IP ani User-Agent w zgłoszeniach. Token formularza wygasa po 30 minutach. Kopie zapasowe i dzienniki infrastruktury mają osobny cykl retencji; operator musi zatwierdzić i wdrożyć ich ograniczony okres przed uruchomieniem formularza.</p><p>Masz prawo żądać dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, a gdy ma zastosowanie — przenoszenia danych i sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie. Kontakt: <a href="mailto:pawel@progresskit.pl">pawel@progresskit.pl</a>. Możesz wnieść skargę do właściwego organu nadzorczego, w szczególności w państwie zwykłego pobytu, miejsca pracy lub domniemanego naruszenia (art. 77 RODO). Nie wpisuj haseł, kluczy dostępowych ani danych szczególnie chronionych.</p><p>Przed wysłaniem pola pozostają tylko w otwartej karcie; nie zapisujemy ich w cookies ani localStorage. TXT i PDF to lokalne eksporty, które same nie wysyłają zgłoszenia i nie są potwierdzeniem przyjęcia. Po błędzie treść pozostaje w tej karcie. Po utracie odpowiedzi ponowienie tej samej próby korzysta z zabezpieczenia przed duplikatem.</p><h2>Glikemia Premium</h2><p>Strona dystrybucji ma osobną informację o liczniku pobrań, opiniach i moderacji przy formularzu. Opinie są publiczne dopiero po moderacji. Nie wpisuj w nie danych zdrowotnych.</p><h2>Linki zewnętrzne</h2><p>Serwisy otwierane przez linki prowadzą własne zasady przetwarzania danych. Materiały galerii są serwowane lokalnie; witryna nie osadza zewnętrznych odtwarzaczy.</p></article>'''



def privacy_page():
    operator = json.loads((ROOT/'catalog/operator.json').read_text())
    if not isinstance(operator, dict) or set(operator) != {'name','address','contact'} or any(not isinstance(v,str) or not v.strip() for v in operator.values()):
        raise ValueError('Operator requires reviewed name, address and contact.')
    if not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',operator['contact']):
        raise ValueError('Invalid operator contact.')
    block = f'<h2 id="operator">Operator witryny</h2><p>{e(operator["name"])}<br>{e(operator["address"])}<br>Kontakt: <a href="mailto:{e(operator["contact"])}">{e(operator["contact"])}</a>.</p>'
    return PRIVACY.replace('@@OPERATOR@@',block)


def render(content, title, description, path, prefix):
    template=(ROOT/'templates/site.html').read_text()
    home=not path and not prefix
    product_page=(path.startswith('projekty/') and path!='projekty/') or path in ('progresskit-mail/','glikemia-premium/')
    nav=''.join(f'<a href="{prefix}#{id_}" data-proximity>{label}</a>' for id_,label in [('projekty','Projekty'),('uslugi','Usługi'),('proces','Proces'),('wyzwania','Wyzwania'),('technologie','Technologie'),('o-mnie','O mnie'),('ekosystem','Ekosystem'),('wydania','Wydania'),('kontakt','Kontakt')])
    styles=['world'] + (['living-experience'] if home else []) + (['project-world'] if product_page else [])
    scripts=['world.mjs'] + (['living-experience.mjs','client-inquiry.mjs'] if home else []) + (['project-world.mjs'] if product_page else [])
    if path in ('projekty/glikemia-premium/','glikemia-premium/'):
        scripts.append('product-downloads.mjs')
    page_styles='\n  '.join(f'<link rel="stylesheet" href="{prefix}assets/{name}.css">' for name in styles)
    page_scripts='\n  '.join(f'<script type="module" src="{prefix}assets/{name}"></script>' for name in scripts)
    if path=='glikemia-premium/':
        page_scripts+=f'\n  <script src="{prefix}glikemia-premium/product.js" defer></script>'
    slots={'TITLE':e(title),'DESCRIPTION':e(description),'CANONICAL':'https://progresskit.pl/'+path,'ROOT':prefix,'NAV':nav,'CONTENT':content,'PAGE_STYLES':page_styles,'PAGE_SCRIPTS':page_scripts,'BODY_CLASS':'progresskit-world'+(' world-home' if home else ' project-world-page' if product_page else ' world-catalog')}
    for name,value in slots.items():
        template=template.replace('@@'+name+'@@',value)
    if '@@' in template:
        raise ValueError('Unfilled template slot.')
    return template


def generated(data):
    outputs={'index.html':render(homepage(data),'ProgressKit Systems: aplikacje, systemy i gry','Ekosystem ProgressKit: aplikacje Android, SaaS, platformy, gry i realizacje WWW. Problemy, rozwiązania i stan produktów potwierdzony w źródłach.','','')}
    outputs['projekty/index.html']=render(explorer_page(data),'Eksplorator projektów | ProgressKit Systems','Wyszukaj aplikacje, SaaS, platformy, gry i realizacje ProgressKit według kategorii, technologii i etapu.','projekty/','../')
    brand=json.loads((ROOT/'catalog/brand.json').read_text())
    if set(brand)!={'heroBackground','heroSourceStatus','ownerVisualApproval'}:
        raise ValueError('Invalid brand configuration.')
    background=brand['heroBackground']
    if background is not None:
        if not isinstance(background,str) or not re.fullmatch(r'assets/brand/[a-z0-9-]+\.(webp|jpg|png)',background) or not (ROOT/background).is_file():
            raise ValueError('Approved hero background must be an existing local brand asset.')
    for p in data['projects']:
        path=project_url(p)
        outputs[path+'index.html']=render(full_case(p),p['name']+': projekt i case study | ProgressKit',p['summary'],path,'../../')
    # Existing V4 Mail URL stays valid and uses the same catalog and renderer.
    mail=next(p for p in data['projects'] if p['id']=='progresskit-mail')
    outputs['progresskit-mail/index.html']=render(full_case(mail,'../'),mail['name']+': projekt | ProgressKit',mail['summary'],'projekty/'+mail['slug']+'/','../')
    outputs['prywatnosc/index.html']=render(privacy_page(),'Prywatność i operator | ProgressKit Systems','Informacja o prywatności katalogu, analityce i zgłoszeniach projektów ProgressKit Systems.','prywatnosc/','../')
    glikemia=next(p for p in data['projects'] if p['id']=='glikemia-premium')
    outputs['glikemia-premium/index.html']=render(full_case(glikemia,'../',distribution=True),'Glikemia Premium: prywatny dziennik glikemii na Android | ProgressKit',glikemia['summary'],'glikemia-premium/','../')
    outputs['404.html']=render('<section class="shell privacy"><h1>Nie znaleziono strony.</h1><p><a href="/">Wróć do ProgressKit →</a></p></section>','Nie znaleziono strony | ProgressKit','Ta strona nie istnieje.','','/').replace('<meta name="description"','<meta name="robots" content="noindex">\n<meta name="description"')
    urls=['','projekty/','glikemia-premium/','prywatnosc/']+[project_url(p) for p in data['projects']]
    outputs['sitemap.xml']='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>https://progresskit.pl/{url}</loc></url>\n' for url in urls)+'</urlset>\n'
    outputs['robots.txt']='User-agent: *\nAllow: /\nDisallow: /_analytics/\nDisallow: /api/\nDisallow: /download/\nDisallow: /downloads/\nSitemap: https://progresskit.pl/sitemap.xml\n'
    return outputs


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Validate data and fail on stale generated files without writing.')
    args=parser.parse_args()
    try:
        data=read_catalog()
        outputs=generated(data)
    except (ValueError,TypeError,KeyError) as exc:
        print(f'Catalog validation FAILED:\n{exc}',file=sys.stderr)
        return 1
    stale=[]
    for name,content in outputs.items():
        path=ROOT/name
        if args.check:
            if not path.is_file() or path.read_text()!=content:
                stale.append(name)
        else:
            path.parent.mkdir(exist_ok=True,parents=True)
            path.write_text(content)
    if stale:
        print('Stale generated files: '+', '.join(stale),file=sys.stderr)
        return 1
    print(f'PASS: {len(data["projects"])} catalog entries; {len(outputs)} generated files {"verified" if args.check else "written"}.')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
