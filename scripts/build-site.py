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
AUDIT_DATE = date(2026, 10, 23)
STAGES = {'Koncepcja', 'Prototyp', 'W rozwoju', 'Alpha', 'Beta', 'Wersja testowa', 'Finalizacja', 'Dostępny APK', 'Dostępny', 'Utrzymywany', 'Wstrzymany', 'Archiwalny'}
CATEGORIES = {
    'mobile': ('Aplikacje', '▯'), 'saas': ('SaaS', '▦'),
    'platforms': ('Platformy', '◎'), 'games': ('Gry', '◇'),
    'web': ('Realizacje WWW', '↗'), 'technology': ('Infrastruktura', '⌘'),
}
TEXT = ('id', 'slug', 'name', 'summary', 'problem', 'motivation', 'solution', 'availability', 'updatedAt')
LISTS = ('audiences', 'features', 'technologies', 'architecture', 'results', 'planned', 'remaining')
FIELDS = set(TEXT + LISTS + ('category', 'stage', 'gallery', 'videos', 'links', 'repository', 'cases', 'sources', 'coverage'))
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
    if type(data['schemaVersion']) is not int or data['schemaVersion'] != 1:
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
        if not isinstance(p, dict) or set(p) != FIELDS:
            errors.append(f'{tag}: missing or unknown fields: {FIELDS.symmetric_difference(p) if isinstance(p,dict) else "not an object"}')
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
            if not p[key] and not (source_absent and key in ('features', 'technologies', 'architecture')):
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
    return e(p['stage'] or 'Etap do potwierdzenia')


def card(p):
    category = CATEGORIES[p['category']][0]
    search = normalize(' '.join([p['name'],p['summary'],category,*p['technologies']]))
    preview = ''
    if p['gallery']:
        img = p['gallery'][0]
        preview = f'<img class="card-preview" src="{e(img["src"])}" width="{img["width"]}" height="{img["height"]}" alt="{e(img["alt"])}" loading="lazy" decoding="async">'
    return f'''<article class="catalog-card" data-id="{p['id']}" data-category="{p['category']}" data-stage="{e(p['stage'] or '')}" data-search="{e(search)}" data-technologies="{e(json.dumps(p['technologies'],ensure_ascii=False))}">
      <div class="card-top"><span class="card-category">{e(category)}</span><h3>{e(p['name'])}</h3><p>{e(p['summary'])}</p><span class="card-stage">{stage(p)}</span></div>{preview}
      <details class="project-drawer" id="projekt-{p['id']}"><summary aria-controls="drawer-{p['id']}">Odkryj projekt <span class="sr-only">{e(p['name'])}</span></summary>
      <div class="drawer-content" id="drawer-{p['id']}"><h4>Problem</h4><p>{e(p['problem'])}</p><h4>Rozwiązanie</h4><p>{e(p['solution'])}</p><h4>Dla kogo</h4><p>{e(' · '.join(p['audiences']))}</p><h4>Potwierdzony zakres</h4>{items(p['features'][:4])}<h4>Stan i dostęp</h4><p>{e(p['availability'])}</p><p class="tech-line">{e(' / '.join(p['technologies']))}</p><time class="updated" datetime="{p['updatedAt']}">Ostatnie źródło: {p['updatedAt']}</time><a class="cta cta--ghost" href="{project_url(p)}">Pełne case study →</a></div></details></article>'''


def gallery(p, prefix):
    if not p['gallery']:
        return '<p>Galeria zostanie uzupełniona po przeglądzie materiałów z produktu. Obecna prezentacja opiera się na opisanych źródłach.</p>'
    return '<p>Rzeczywiste materiały z produktu. Wybierz obraz, aby go powiększyć. W podglądzie użyj strzałek; Escape zamyka powiększenie.</p><div class="screenshot-grid">' + ''.join(
        f'<figure class="screenshot"><a href="{prefix}{e(img["src"])}" data-gallery-item data-caption="{e(img["caption"])}" aria-label="Powiększ: {e(img["alt"])}"><img src="{prefix}{e(img["src"])}" width="{img["width"]}" height="{img["height"]}" alt="{e(img["alt"])}" loading="lazy" decoding="async"></a><figcaption>{e(img["caption"])}</figcaption></figure>' for img in p['gallery']) + '</div>'


def case_detail(c):
    labels = [('problem','Wyzwanie'),('diagnosis','Analiza'),('rootCause','Przyczyna'),('solution','Decyzja i poprawka'),('verification','Weryfikacja'),('result','Wynik'),('source','Źródło')]
    return '<article class="engineering-case"><dl>'+''.join(f'<dt>{label}</dt><dd>{e(c[key])}</dd>' for key,label in labels)+'</dl></article>'


def full_case(p, prefix='../../'):
    def section(id_,title,body):
        return f'<section class="case-section" id="{id_}"><h2>{title}</h2>{body}</section>'
    out = f'''<header class="case-hero"><div class="shell"><p class="breadcrumb"><a href="{prefix}#projekty">← Eksplorator projektów</a> / {e(CATEGORIES[p['category']][0])}</p><span class="section-kicker">{e(CATEGORIES[p['category']][0])}</span><h1>{e(p['name'])}</h1><p class="section-copy">{e(p['summary'])}</p><div class="status-row"><span class="status-chip">{stage(p)}</span><time class="status-chip" datetime="{p['updatedAt']}">Źródła: {p['updatedAt']}</time></div><nav class="case-index" aria-label="W tej prezentacji"><a href="#problem">Problem</a><a href="#architektura">Architektura</a><a href="#funkcje">Funkcje</a><a href="#galeria">Galeria</a><a href="#wyzwania">Wyzwania</a><a href="#rozwoj">Rozwój</a><a href="#dostep">Dostęp</a></nav></div></header><div class="shell case-content">'''
    out += section('problem','Od potrzeby do produktu',f'<h3>Dla kogo</h3>{items(p["audiences"])}<h3>Problem</h3><p>{e(p["problem"])}</p><h3>Dlaczego powstał</h3><p>{e(p["motivation"])}</p><h3>Rozwiązanie</h3><p>{e(p["solution"])}</p>')
    out += section('architektura','Architektura i technologie','<ul class="architecture">'+''.join(f'<li>{e(x)}</li>' for x in p['architecture'])+'</ul><p class="tech-line">'+e(' / '.join(p['technologies']))+'</p>')
    out += section('funkcje','Potwierdzony zakres',items(p['features'])+'<h3>Wyniki i granice weryfikacji</h3>'+items(p['results']))
    out += section('galeria','Materiały z produktu',gallery(p,prefix))
    if p['cases']:
        out += section('wyzwania','Wyzwania i rozwiązania',''.join(case_detail(c) for c in p['cases']))
    else:
        out += section('wyzwania','Wyzwania inżynieryjne','<p>Brak wystarczających źródeł do opisania potwierdzonego incydentu i jego rozwiązania.</p>')
    out += section('rozwoj','Aktualny etap i dalsza droga',f'<p><strong>{stage(p)}</strong> · {e(p["availability"])}</p><h3>Do potwierdzenia lub ukończenia</h3>{items(p["remaining"])}<h3>Planowane kierunki</h3>'+ (items(p['planned']) if p['planned'] else '<p>Brak potwierdzonego publicznego planu kolejnych funkcji.</p>'))
    links = ''.join(f'<p><a href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])} ↗</a></p>' for link in p['links']+p['videos'])
    if p['repository']:
        links += f'<p><a href="{e(p["repository"])}" target="_blank" rel="noopener noreferrer">Publiczne repozytorium ↗</a></p>'
    # Existing product route retained; release CTA lives behind its separate operational gate.
    if p['id'] == 'glikemia-premium':
        links += f'<p><a href="{prefix}glikemia-premium/">Strona aplikacji i dystrybucji →</a></p>'
    out += section('dostep','Dostęp do projektu',f'<p>{e(p["availability"])}</p>'+links+f'<p><a href="mailto:pawel@progresskit.pl?subject={p["slug"]}">Zapytaj o projekt →</a></p>')
    sources = ''.join(f'<li id="source-{e(s["id"])}"><strong>{e(s["label"])}</strong> · {e(s["kind"])} · <code>{e(s["revision"])}</code><br>{e(s["scope"])}</li>' for s in p['sources'])
    out += section('zrodla','Podstawa prezentacji',f'<p>Zakres ustalono na podstawie kodu i materiałów wymienionych poniżej. Wyniki historycznych testów zachowują datę oraz zakres; nie oznaczają ponownego testu ani potwierdzenia produkcji.</p><ul class="source-list">{sources}</ul>')
    return out+'</div>'


def explorer_section(data):
    projects=data['projects']
    counts=Counter(p['category'] for p in projects)
    cats=''.join(f'<button class="category" type="button" data-filter-category="{key}" aria-pressed="false"><span class="category__icon" aria-hidden="true">{icon}</span><span class="category__label">{label}</span><span class="category__count">{counts[key]:02d}</span></button>' for key,(label,icon) in CATEGORIES.items() if counts[key])
    technologies=sorted({t for p in projects for t in p['technologies']},key=str.casefold)
    stages=sorted({p['stage'] for p in projects if p['stage']})
    options=lambda values:''.join(f'<option value="{e(v)}">{e(v)}</option>' for v in values)
    return f'''<section class="section" id="projekty"><div class="shell"><div class="catalog-intro"><span class="section-kicker">KATALOG PROJEKTÓW</span><h2 class="section-title">Znajdź projekt.</h2><p class="section-copy">Wyszukaj nazwę lub technologię, porównaj etap rozwoju i poznaj zakres potwierdzony w źródłach.</p></div><noscript><p class="empty-state">Wszystkie projekty i szczegóły są dostępne poniżej. Wyszukiwanie oraz filtry wymagają JavaScript.</p></noscript><div class="category-grid" data-js-only hidden>{cats}</div><form class="catalog-tools" id="catalog-filters" role="search" aria-label="Wyszukaj projekt" data-js-only hidden><label for="project-search">Szukaj w ekosystemie<input id="project-search" name="q" type="search" maxlength="160" placeholder="Nazwa, zastosowanie lub technologia" autocomplete="off"></label><label for="technology-filter">Technologia<select id="technology-filter" name="technologia"><option value="">Wszystkie technologie</option>{options(technologies)}</select></label><label for="stage-filter">Etap produktu<select id="stage-filter" name="etap"><option value="">Wszystkie etapy</option>{options(stages)}<option value="unverified">Etap do potwierdzenia</option></select></label><button class="plain-button" type="reset">Wszystkie projekty ↺</button></form><div class="catalog-feedback"><p id="catalog-results" role="status" aria-live="polite" aria-atomic="true">{len(projects)} projektów i elementów zaplecza</p><a href="#rozwoj">Stan prac ↓</a></div><p class="empty-state" id="catalog-empty" hidden>Brak projektów dla tych kryteriów. Zmień wyszukiwanie lub wybierz „Wszystkie projekty”.</p><div class="catalog-grid">{''.join(card(p) for p in projects)}</div><p class="updated">Przegląd katalogu: {e(data['asOf'])}. Etap i dostępność opisano osobno.</p></div></section>'''


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
    brief='<div class="shell"><section class="brief world-surface" id="brief" data-reveal><header class="brief__heading"><div><span class="section-kicker">PIERWSZY KROK</span><h3>Opisz swój projekt</h3></div><p>Wypełnij brief, zapisz go do pliku lub wydrukuj do PDF i prześlij e-mailem. Pola działają lokalnie w tej karcie przeglądarki.</p></header><div class="brief-grid">'
    for id_,label in [('problem','Jaki problem ma rozwiązać system?'),('users','Kto będzie z niego korzystać?'),('processes','Jakie procesy lub funkcje powinien obsługiwać?'),('integrations','Czy wymaga integracji z istniejącymi usługami?'),('budget','Orientacyjny budżet'),('deadline','Oczekiwany termin')]:
        brief+=f'<label for="brief-{id_}">{label}<textarea id="brief-{id_}" rows="4" maxlength="6000"></textarea></label>'
    return brief+'</div><div class="hero__actions brief__actions"><button class="cta cta--ghost" type="button" data-download-brief>Pobierz brief .txt ↓</button><button class="cta cta--ghost" type="button" data-print>Drukuj / zapisz PDF</button><a class="cta cta--primary" href="mailto:pawel@progresskit.pl?subject=Nowy%20projekt%20ProgressKit">WYŚLIJ PROJEKT</a></div><p data-brief-status role="status"></p></section></div>'


def production_section():
    return (ROOT/'templates/production-line.html').read_text()


def technology_section(projects):
    # Count each technology once per project, preserving the catalog filter values.
    counts = Counter(technology for project in projects for technology in set(project['technologies']))
    technologies = sorted(counts, key=str.casefold)
    assigned = set()
    groups = []
    for identifier, label, members in TECHNOLOGY_GROUPS:
        if assigned.intersection(members):
            raise ValueError('Technology groups must not overlap.')
        assigned.update(members)
        selected = [technology for technology in technologies if technology in members]
        if selected:
            groups.append((identifier, label, selected))
    # A newly cataloged technology remains visible until its group is reviewed.
    unassigned = [technology for technology in technologies if technology not in assigned]
    if unassigned:
        groups.append(('other', 'Inne', unassigned))
    sections = []
    for identifier, label, members in groups:
        chips = ''.join(
            f'<a class="technology-chip" href="projekty/?technologia={quote(technology, safe="")}">{e(technology)} <span>{counts[technology]}</span></a>'
            for technology in members
        )
        sections.append(f'<section class="technology-group" aria-labelledby="technology-group-{identifier}"><h3 class="technology-group__title" id="technology-group-{identifier}">{e(label)}</h3><div class="technology-chips">{chips}</div></section>')
    return '<section class="section technology-section" id="technologie"><div class="shell" data-reveal><span class="section-kicker">TECHNOLOGIE W PROJEKTACH</span><h2 class="section-title">Warsztat.</h2><p class="section-copy">Wybierz technologię, aby zobaczyć projekty, w których została wykorzystana.</p><div class="technology-groups">'+''.join(sections)+'</div><p class="catalog-link"><a href="projekty/#rozwoj">Sprawdź aktualny stan rozwoju produktów →</a></p></div></section>'


def homepage(data):
    projects=data['projects']
    brand=json.loads((ROOT/'catalog/brand.json').read_text())
    art='present' if brand['heroBackground'] else 'missing'
    scene=(ROOT/'templates/hero-scene.svg').read_text().replace('@@LANDSCAPE@@',e(brand['heroBackground'] or '')) if brand['heroBackground'] else ''
    out=f'''<section id="start" class="hero hero--landscape hero--monument hero--world" data-hero-layout="world" data-hero-art="{art}">{scene}<div class="hero__insignia" aria-hidden="true"><img src="assets/brand/progressorkit-stamp.png" width="440" height="440" alt=""></div><div class="hero__stone-title"><p class="hero__discipline">Aplikacje · systemy · gry</p><h1 class="stone-word" aria-label="PROGRESSKIT SYSTEMS"><span class="stone-line" data-stone="PROGRESSKIT" aria-hidden="true">PROGRESSKIT</span> <span class="stone-line stone-line--systems" data-stone="SYSTEMS" aria-hidden="true">SYSTEMS</span></h1><p class="hero__motto">Technologia ma dawać kontrolę. Nie na odwrót.</p><div class="hero__actions hero__commercial-actions"><a class="cta cta--primary" href="#kontakt">Kontakt</a><a class="cta cta--ghost" href="#uslugi">Usługi</a><a class="cta cta--text" href="glikemia-premium/">Pobierz Glikemia Premium</a></div></div><a class="hero__explore" href="#projekty"><span>Poznaj ekosystem</span><span aria-hidden="true">↓</span></a><button class="hero__motion-toggle" data-hero-motion-toggle type="button" aria-pressed="false">Wstrzymaj ruch sceny</button></section>'''
    spec=importlib.util.spec_from_file_location('showroom_markup',ROOT/'scripts/showroom_markup.py')
    showroom=importlib.util.module_from_spec(spec);spec.loader.exec_module(showroom)
    out+=showroom.render_showroom(projects)
    public_projects=[{
        'id':p['id'],'name':p['name'],'category':p['category'],
        'categoryLabel':CATEGORIES[p['category']][0], 'summary':p['summary'],
        'problem':p['problem'],'stage':p['stage'] or 'Etap do potwierdzenia',
        'technologies':p['technologies'],'gallery':p['gallery'],'url':project_url(p),
    } for p in projects]
    serialized=json.dumps(public_projects,ensure_ascii=False,separators=(',',':')).replace('&','\\u0026').replace('<','\\u003c').replace('>','\\u003e')
    out+='<script type="application/json" id="showroom-data">'+serialized+'</script>'
    out+=(ROOT/'templates/project-hologram.html').read_text()
    spec=importlib.util.spec_from_file_location('delivery_markup',ROOT/'scripts/delivery_markup.py')
    delivery=importlib.util.module_from_spec(spec);spec.loader.exec_module(delivery)
    about_services,contact=(ROOT/'templates/about-contact.html').read_text().split('<!-- CONTACT -->')
    about,services=about_services.split('<!-- SERVICES -->')
    out+=services
    out+=delivery.render_delivery(projects)
    out+=production_section()
    out+=about
    out+=delivery.render_case_studies()
    out+=technology_section(projects)
    return out+contact+brief_section()


def explorer_page(data):
    content='<header class="case-hero"><div class="shell"><p class="breadcrumb"><a href="./#projekty">← Kategorie na stronie głównej</a></p><span class="section-kicker">PROGRESSKIT</span><h1>Eksplorator projektów</h1><p class="section-copy">Katalog produktów, realizacji i zaplecza technicznego.</p></div></header>'+explorer_section(data)+development_section(data['projects'])
    # This page is one directory below the homepage. Keep generated card links and assets relative.
    content=content.replace('href="projekty/','href="').replace('src="assets/','src="../assets/').replace('href="./#projekty"','href="../#projekty"')
    return content

PRIVACY = '''<article class="shell privacy"><span class="section-kicker">PROGRESSKIT SYSTEMS</span><h1>Prywatność witryny</h1><p>Informacja o działaniu tej wersji witryny, przegląd: 15 października 2026 r. Kontakt w sprawach danych: <a href="mailto:pawel@progresskit.pl">pawel@progresskit.pl</a>.</p><h2>Oglądanie katalogu</h2><p>Wyszukiwanie i filtry działają w Twojej przeglądarce. Wybrane filtry mogą znajdować się w adresie strony, aby można było go udostępnić. Treść wyszukiwania nie jest dołączana do zdarzeń analitycznych.</p><h2>Własna analityka</h2><p>Na domenie progresskit.pl witryna wysyła do własnego endpointu rodzaj zdarzenia (otwarcie strony lub projektu, kontakt, link zewnętrzny), ścieżkę strony bez zapytania i fragmentu, domenę strony odsyłającej i poprawne oznaczenia kampanii UTM. Kod analityki nie używa cookies, localStorage, identyfikatora urządzenia ani zewnętrznych trackerów. Nie wysyła treści briefu ani wyszukiwania.</p><p>Baza zdarzeń nie ma pól na IP i User-Agent. Serwer i pośrednie warstwy sieci mogą prowadzić osobne dzienniki techniczne; ich konfiguracja wymaga sprawdzenia przez operatora. W dostępnej konfiguracji backendu nie ustalono automatycznej retencji zdarzeń. Te kwestie pozostają do potwierdzenia przed wdrożeniem. Ta informacja nie zastępuje polityk prywatności poszczególnych aplikacji.</p><h2>Brief i kontakt</h2><p>Pola briefu pozostają w otwartej karcie. Pobranie tworzy lokalny plik tekstowy. Drukowanie korzysta z funkcji przeglądarki, a przycisk e-mail otwiera Twój program pocztowy. Witryna nie wysyła wypełnionego briefu automatycznie.</p><h2>Glikemia Premium</h2><p>Strona dystrybucji ma osobną informację o liczniku pobrań, opiniach i moderacji przy formularzu. Opinie są publiczne dopiero po moderacji. Nie wpisuj w nie danych zdrowotnych.</p><h2>Linki zewnętrzne</h2><p>Serwisy otwierane przez linki prowadzą własne zasady przetwarzania danych. Materiały galerii są serwowane lokalnie; witryna nie osadza zewnętrznych odtwarzaczy.</p></article>'''


def render(content, title, description, path, prefix):
    template=(ROOT/'templates/site.html').read_text()
    nav=''.join(f'<a href="{prefix}#{id_}">{label}</a>' for id_,label in [('projekty','Projekty'),('uslugi','Usługi'),('proces','Proces'),('wyzwania','Wyzwania'),('technologie','Technologie'),('o-mnie','O mnie'),('ekosystem','Ekosystem'),('wydania','Wydania'),('kontakt','Kontakt')])
    page_styles=''
    if not path and not prefix:
        page_styles='\n  '.join(f'<link rel="stylesheet" href="assets/{name}.css">' for name in ('hero-monument','project-showroom','project-hologram','home-atmosphere','engineering-exhibit','brand-atmosphere','project-slices','delivery'))
        page_styles+='\n  <link rel="preload" href="assets/brand/monument-serif-bold.ttf" as="font" type="font/ttf" crossorigin>'
    page_styles+=('\n  ' if page_styles else '')+f'<link rel="stylesheet" href="{prefix}assets/visual-acceptance.css">'
    if not path and not prefix:
        page_styles+='\n  '+'\n  '.join(f'<link rel="stylesheet" href="assets/{name}.css">' for name in ('interface-life','ecosystem-system','owner-finish','project-mechanism'))
    page_styles+='\n  '+f'<link rel="stylesheet" href="{prefix}assets/world-atmosphere.css">'
    if not path and not prefix:
        page_styles+='\n  <link rel="stylesheet" href="assets/world-sections.css">'
    page_scripts='\n  '.join(f'<script src="assets/{name}.js" defer></script>' for name in ('hero-space','project-hologram','project-showroom','interface-life','ecosystem-system')) if not path and not prefix else ''
    if not page_styles:
        template=template.replace('  @@PAGE_STYLES@@\n','')
    if not page_scripts:
        template=template.replace('  @@PAGE_SCRIPTS@@\n','')
    slots={'TITLE':e(title),'DESCRIPTION':e(description),'CANONICAL':'https://progresskit.pl/'+path,'ROOT':prefix,'NAV':nav,'CONTENT':content,'PAGE_STYLES':page_styles,'PAGE_SCRIPTS':page_scripts}
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
        outputs['assets/hero.css']=f':root {{ --approved-hero-image: url("../{background}"); }}\n'
    else:
        outputs['assets/hero.css']='/* Approved mountain/moon/wall source missing. No substitute landscape. Owner visual approval OPEN. */\n'
    for p in data['projects']:
        path=project_url(p)
        outputs[path+'index.html']=render(full_case(p),p['name']+': projekt i case study | ProgressKit',p['summary'],path,'../../')
    # Existing V4 Mail URL stays valid and uses the same catalog and renderer.
    mail=next(p for p in data['projects'] if p['id']=='progresskit-mail')
    outputs['progresskit-mail/index.html']=render(full_case(mail,'../'),mail['name']+': projekt | ProgressKit',mail['summary'],'projekty/'+mail['slug']+'/','../')
    outputs['prywatnosc/index.html']=render(PRIVACY,'Prywatność witryny | ProgressKit Systems','Informacja o prywatności katalogu, własnej analityce i lokalnym briefie ProgressKit Systems.','prywatnosc/','../')
    glikemia=next(p for p in data['projects'] if p['id']=='glikemia-premium')
    distribution=(ROOT/'templates/glikemia-distribution.html').read_text()
    for key,value in {'DESCRIPTION':e(glikemia['summary']),'STAGE':stage(glikemia),'AVAILABILITY':e(glikemia['availability']),'FEATURES':''.join(f'<article class="card"><p>{e(feature)}</p></article>' for feature in glikemia['features'])}.items():
        distribution=distribution.replace('@@'+key+'@@',value)
    outputs['glikemia-premium/index.html']=distribution
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
