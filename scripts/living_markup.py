"""Presentation only. Product facts, paths, statuses and images stay in the catalogue."""
from html import escape as e
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
FEATURED = ('progresskit-mail', 'progresskit-tax', 'glikemia-premium', 'vaeloria', 'progresskit-remote')
SCENES = {
    'progresskit-mail': ('01', 'Korespondencja', 'mail', [1, 0]),
    'progresskit-tax': ('02', 'Obieg informacji', 'tax', []),
    'glikemia-premium': ('03', 'Codzienna perspektywa', 'glikemia', [0, 1]),
    'vaeloria': ('04', 'Inny wymiar', 'vaeloria', [0, 1]),
    'progresskit-remote': ('05', 'Połączenia', 'remote', []),
}
REVIEWED = json.loads((ROOT/'catalog/living-media.json').read_text())


def images_for(project):
    identifier = project['id']
    if identifier == 'progresskit-mail':
        return REVIEWED[identifier]['images'] + [project['gallery'][1]]
    if identifier == 'progresskit-tax':
        return REVIEWED[identifier]['images']
    return [project['gallery'][i] for i in SCENES[identifier][3]]


def picture(image, classes):
    return f'<img class="{classes}" src="{e(image["src"])}" width="{image["width"]}" height="{image["height"]}" alt="{e(image["alt"])}" loading="lazy" decoding="async">'


def media(project):
    config = SCENES.get(project['id'])
    if not config:
        return ''
    images = images_for(project)
    if images:
        figures = []
        for layer, image in enumerate(images):
            kind = 'desktop' if project['id']=='progresskit-mail' and layer==0 else 'document' if project['id']=='progresskit-tax' else 'phone'
            figures.append(f'<span class="living-device living-device--{kind} living-device--{layer}">'+picture(image, f'living-screen living-screen--{layer}')+'</span>')
        return '<span class="living-media">' + ''.join(figures) + '</span>'
    labels = (('Klient','Windows / Linux'), ('Router / Relay','Infrastruktura'), ('Host','Ograniczony dostęp'))
    return '''<span class="living-media living-diagram" aria-label="Schemat pojęciowy, nie ekran aplikacji"><svg class="living-circuit" viewBox="0 0 600 400" aria-hidden="true"><path d="M130 100H300V205H465V300"/><circle cx="300" cy="205" r="12"/></svg>''' + ''.join(f'<span class="living-endpoint living-endpoint--{i}"><i aria-hidden="true">{i+1:02d}</i><strong>{e(label)}</strong><small>{e(detail)}</small><b aria-hidden="true">{("↗","⇄","↙")[i]}</b></span>' for i, (label, detail) in enumerate(labels)) + '<em>Schemat architektury</em></span>'


def render(projects, stage, project_url):
    ordered = sorted(projects, key=lambda p: FEATURED.index(p['id']) if p['id'] in FEATURED else 5 + projects.index(p))
    nodes, articles = [], []
    for index, project in enumerate(ordered):
        identifier = e(project['id'])
        tone = SCENES.get(project['id'], ('', '', 'other', []))[2]
        name = project['name'].removeprefix('ProgressKit ')
        nodes.append(f'''<a class="artifact-card living-node" href="{project_url(project)}" data-project-id="{identifier}" data-node-index="{index}" data-tone="{tone}" aria-label="Poznaj {e(project['name'])}">
          <span class="living-hex" aria-hidden="true"><svg viewBox="0 0 160 180"><path d="M80 3 157 47 157 133 80 177 3 133 3 47Z"/><path d="M80 12 149 52 149 128 80 168 11 128 11 52Z"/></svg><b>{index+1:02d}</b></span>
          <span class="living-node__name">{e(name)}</span>{media(project)}</a>''')
        if project['id'] not in FEATURED:
            continue
        number, label, _, images = SCENES[project['id']]
        reviewed_images = images_for(project)
        provenance = REVIEWED.get(project['id'], {}).get('backdrop', {}).get('caption') or (reviewed_images[0]['caption'] if reviewed_images else 'Schemat pojęciowy na podstawie opisu projektu. Nie jest ekranem aplikacji ani telemetrią.')
        still = '<figure class="living-still">'+picture(reviewed_images[0], 'living-still__image')+'</figure>' if reviewed_images else ''
        articles.append(f'''<article class="living-chapter" data-living-project="{identifier}" data-tone="{tone}" aria-labelledby="living-title-{identifier}">
          <div class="living-chapter__copy"><span class="eyebrow">{number} / {e(label)}</span><h2 id="living-title-{identifier}">{e(project['name']).replace('ProgressKit ', '<span>ProgressKit</span> ')}</h2>
          <span class="living-stage-label">{e(project['stage'] or 'Etap do potwierdzenia')} · {stage(project)}</span><p>{e(project['summary'])}</p>
          <div class="living-tech">{''.join(f'<span>{e(t)}</span>' for t in project['technologies'][:3])}</div>
          <div class="living-chapter__actions"><a class="world-control world-control--primary" href="{project_url(project)}">Pełna prezentacja <span aria-hidden="true">↗</span></a><a href="#projekty" data-return-map>Wróć do mapy ↑</a></div></div>
          {still}<p class="living-provenance">{e(provenance)}</p></article>''')
    markers = ''
    content = (ROOT/'templates/hero-installation.html').read_text()
    forest=REVIEWED['vaeloria']['backdrop']
    content=content.replace('@@LIVING_BACKDROP@@', f'<img class="living-backdrop" src="{e(forest["src"])}" width="{forest["width"]}" height="{forest["height"]}" alt="" aria-hidden="true" loading="lazy" decoding="async">')
    for i, identifier in enumerate(FEATURED):
        articles[i] = f'<span id="scena-{identifier}" class="living-marker" data-stop="{2.8+i*1.2:.1f}"></span>' + articles[i]
    for key, value in {'NODES': ''.join(nodes), 'CHAPTERS': ''.join(articles), 'MARKERS': markers, 'COUNT': str(len(projects))}.items():
        content = content.replace('@@LIVING_'+key+'@@', value)
    return content
