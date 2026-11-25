"""Product-led exhibits. All status and capability evidence remains in the catalog.

This module owns presentation, reviewed media and the four individual narratives.
It never reads private delivery configuration or accesses application data.
"""
from pathlib import Path
from html import escape
import json

ROOT=Path(__file__).resolve().parents[1]
FEATURED_IDS=frozenset(('taskpet','echo-worlds','vaeloria','progresskit-tax'))

def _data():
    return json.loads((ROOT/'catalog/product-showcases.json').read_text())

def asset_files():
    result=set()
    def walk(value):
        if isinstance(value,dict):
            for child in value.values(): walk(child)
        elif isinstance(value,list):
            for child in value: walk(child)
        elif isinstance(value,str) and value.startswith('assets/projects/'):
            path=Path(value)
            if '..' in path.parts or path.suffix not in ('.webp','.png','.jpg','.mp4'):
                raise ValueError('Unsafe showcase media path')
            if not (ROOT/path).is_file():
                raise ValueError('Missing showcase media: '+value)
            result.add(value)
    walk(_data())
    return sorted(result)

def _e(value):return escape(str(value),quote=True)

def _image(media,prefix,*,eager=False,cls=''):
    return f'<img class="{cls}" src="{prefix}{_e(media["src"])}" width="{int(media["width"])}" height="{int(media["height"])}" alt="{_e(media["alt"])}" loading="{"eager" if eager else "lazy"}" decoding="async" fetchpriority="{"high" if eager else "auto"}">'

def _figure(media,prefix,*,eager=False,cls=''):
    return f'<figure class="exhibit-frame {cls}"><a href="{prefix}{_e(media["src"])}" data-exhibit-expand aria-label="Powiększ: {_e(media["alt"])}">{_image(media,prefix,eager=eager)}</a><figcaption>{_e(media["caption"])}</figcaption></figure>'

def _tech_groups(technologies):
    families=[
        ('Aplikacja i interfejs','▣',('Android','Kotlin','Godot','MAUI','GDScript','Compose','React','Next','C#')),
        ('Usługi i komunikacja','◈',('ASP','API','Core','Signal','FastAPI','.NET')),
        ('Dane i zapis','▤',('SQL','JSON','SQLite','EF','Room')),
        ('Bezpieczeństwo i infrastruktura','⌾',('Identity','MFA','TOTP','ClamAV','Docker','OIDC','KeyStore','Data Protection')),
        ('Testy i oprawa','◇',('xUnit','JUnit','Test','Lint','Shader','MultiMesh','NSIS'))
    ]
    buckets={title:[] for title,_,_ in families}
    for technology in technologies:
        family=next((title for title,_,terms in families if any(term.lower() in technology.lower() for term in terms)),'Aplikacja i interfejs')
        buckets[family].append(technology)
    return '<div class="exhibit-tech">'+''.join(f'<article><span aria-hidden="true">{symbol}</span><h3>{title}</h3><p>{_e(" · ".join(buckets[title]))}</p></article>'for title,symbol,_ in families if buckets[title])+'</div>'

def render_featured(project,prefix='../../'):
    """Return None for ordinary catalog entries; preserve the shared site shell."""
    id_=project['id']
    if id_ not in FEATURED_IDS:return None
    data=_data()[id_]
    status=project.get('portfolio',{}).get('functionalStatus') or project['stage']
    hero=_figure(data['hero'],prefix,eager=True,cls='exhibit-main-screen')
    if data['heroKind']=='system':
        android=data.get('android')
        if android and (ROOT/android['src']).is_file():
            hero+=_figure(android,prefix,eager=True,cls='exhibit-android-screen')
    facts=''.join(f'<li><strong>{_e(item["value"])}</strong><span>{_e(item["label"])}</span></li>'for item in data['facts'])
    title='<br>'.join(_e(line) for line in data['headline'].split('\n'))
    extra=data.get('extraLink')
    extra_link=f'<a class="world-control" href="{prefix}{_e(extra["href"])}">{_e(extra["label"])}</a>'if extra else ''
    out=f'''<article class="product-showcase project-world" data-showcase="{_e(id_)}" data-project-id="{_e(id_)}">
      <header class="exhibit-hero shell project-world-hero" id="problem"><div class="exhibit-heading"><a class="exhibit-back" href="{prefix}#projekty">Wróć do ekosystemu</a><p class="eyebrow">{_e(data['eyebrow'])}</p><h1 class="exhibit-product-name">{_e(project['name'])}</h1><p class="exhibit-headline">{title}</p><p class="exhibit-lead">{_e(data['lead'])}</p><p>{_e(data['intro'])}</p><p class="exhibit-status">{_e(status)}</p><div class="exhibit-actions"><a class="world-control world-control--primary" href="#funkcje">Poznaj produkt</a>{extra_link}</div><ul class="exhibit-facts">{facts}</ul></div><div class="exhibit-device-stage exhibit-device-stage--{_e(data['heroKind'])}">{hero}<div class="exhibit-device-base" aria-hidden="true"></div></div></header>
      <nav class="exhibit-rail shell" data-project-chapters aria-label="Prezentacja produktu"><a href="#funkcje">Jak działa</a><a href="#galeria">Rzeczywiste ekrany</a><a href="#architektura">Technologia</a><a href="#dostep">Dostępność</a><details class="exhibit-rail-more"><summary>Zakres i dowody</summary><div><a href="#problem">Idea produktu</a><a href="#platformy">Platformy</a><a href="#weryfikacja">Weryfikacja</a><a href="#wyzwania">Wyzwania</a><a href="#rozwoj">Dalszy rozwój</a><a href="#zrodla">Źródła</a></div></details></nav>
      <section class="exhibit-workflow shell" id="funkcje" aria-labelledby="exhibit-flow-title"><div><p class="eyebrow">Od pierwszego kroku</p><h2 id="exhibit-flow-title">Jeden spójny przebieg.</h2></div><ol>{''.join('<li><span aria-hidden="true"></span>'+_e(label)+'</li>'for label in data['workflow'])}</ol></section>'''
    for i,chapter in enumerate(data['chapters']):
        if not chapter.get('media'):continue
        out+=f'<section class="exhibit-story shell {"exhibit-story--reverse" if i%2 else ""}"><div class="exhibit-story-copy"><p class="eyebrow">{_e(project["name"])}</p><h2>{_e(chapter["title"])}</h2><p>{_e(chapter["text"])}</p></div>{_figure(chapter["media"],prefix)}</section>'
    screenshots=list(data['screens'].values())
    if data.get('android') and (ROOT/data['android']['src']).is_file():screenshots.append(data['android'])
    out+='<section class="exhibit-gallery-section shell" id="galeria"><span class="exhibit-anchor" id="screenshots" aria-hidden="true"></span><p class="eyebrow">Bez fikcyjnego interfejsu</p><h2>Rzeczywisty produkt. Z bliska.</h2><p>Wybierz ekran, aby obejrzeć go w pełnym rozmiarze. Każdy materiał zachowuje opis środowiska i daty.</p><div class="exhibit-gallery">'+''.join(_figure(media,prefix) for media in screenshots)+'</div></section>'
    video=data.get('video')
    if video and (ROOT/video['src']).is_file():
        out+=f'<section class="exhibit-motion shell"><div><p class="eyebrow">Nagranie aplikacji</p><h2>Tak wygląda rozgrywka.</h2><p>{_e(video["caption"])}</p></div><video controls playsinline preload="none" poster="{prefix}{_e(video["poster"])}" width="432" height="960"><source src="{prefix}{_e(video["src"])}" type="video/mp4">Nagranie można <a href="{prefix}{_e(video["src"])}">otworzyć osobno</a>.</video></section>'
    portfolio=project.get('portfolio',{})
    platform_notes='<h3>Platformy i dostępność</h3>'+''.join('<article><h4>'+_e(platform['name'])+'</h4><p>'+_e(platform['implementation'])+'</p><p>'+_e(platform['verification'])+'</p><p>'+_e(platform['distribution'])+'</p><p>'+_e(platform['limits'])+'</p></article>'for platform in portfolio.get('platforms',[]))
    verification_notes='<h3>Weryfikacja z datą i środowiskiem</h3><ul>'+''.join('<li><strong>'+_e(record['status'])+' · '+_e(record.get('date') or 'Data historyczna')+'</strong><p>'+_e(record['scope'])+'</p><p>'+_e(record['environment'])+'</p><p>'+_e(record['result'])+'</p><a href="#source-'+_e(record['source'])+'">Źródło wyniku</a></li>'for record in portfolio.get('verification',[]))+'</ul>'
    narrative='<h3>Opis projektu</h3><p>'+_e(project['summary'])+'</p><h3>Problem i rozwiązanie</h3><p>'+_e(project['problem'])+'</p><p>'+_e(project['solution'])+'</p><p>'+_e(project['motivation'])+'</p>'
    cases=''.join('<article class="exhibit-case"><h3>'+_e(case['problem'])+'</h3><dl>'+''.join('<dt>'+label+'</dt><dd>'+_e(case[key])+'</dd>' for key,label in [('diagnosis','Diagnoza'),('rootCause','Przyczyna'),('solution','Rozwiązanie'),('verification','Weryfikacja'),('result','Wynik')])+'</dl><a href="#source-'+_e(case['source'])+'">Źródło analizy</a></article>'for case in project['cases'])
    out+=f'<section class="exhibit-architecture shell" id="architektura"><span class="exhibit-anchor" id="platformy" aria-hidden="true"></span><p class="eyebrow">Pod powierzchnią</p><h2>Technologia ma tu swoje zadanie.</h2>{_tech_groups(project["technologies"])}<span class="exhibit-anchor" id="wyzwania" aria-hidden="true"></span><details class="exhibit-evidence" id="weryfikacja"><summary>Potwierdzony zakres, źródła i ograniczenia</summary>{narrative}{platform_notes}{verification_notes}<h3>Funkcje w katalogu</h3><ul>'+''.join('<li>'+_e(feature)+'</li>'for feature in project['features'])+'</ul><h3>Architektura</h3><ul>'+''.join('<li>'+_e(item)+'</li>'for item in project['architecture'])+'</ul><h3>Zakres weryfikacji</h3><ul>'+''.join('<li>'+_e(item)+'</li>'for item in project['results'])+'</ul>'+cases+'<h3 id="zrodla">Źródła katalogu</h3><ul>'+''.join('<li id="source-'+_e(source['id'])+'"><strong>'+_e(source['label'])+'</strong><p>'+_e(source['scope'])+'</p></li>'for source in project['sources'])+'</ul></details></section>'
    out+=f'<section class="exhibit-availability shell" id="dostep"><p class="eyebrow">Aktualny stan / {_e(project["updatedAt"])}</p><h2>{_e(project["name"])}</h2><p class="exhibit-boundary">{_e(data["boundary"])}</p><p>{_e(project["availability"])}</p><details id="rozwoj"><summary>Co pozostaje do ukończenia</summary><ul>'+''.join('<li>'+_e(item)+'</li>'for item in project['remaining'])+'</ul></details><div class="exhibit-actions"><a class="world-control world-control--primary" href="mailto:pawel@progresskit.pl">Porozmawiajmy o projekcie</a><a class="world-control" href="'+prefix+'projekty/">Wszystkie projekty</a></div></section>'
    out+='''<dialog class="exhibit-lightbox" aria-labelledby="exhibit-image-caption"><button type="button" class="world-control" data-exhibit-close aria-label="Zamknij powiększony ekran">Zamknij</button><figure><img alt="" width="1440" height="1000"><figcaption id="exhibit-image-caption"></figcaption></figure></dialog></article>'''
    return out
