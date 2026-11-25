"""Presentation only. Product facts, paths, statuses and images stay in the catalogue."""
from html import escape as e
from pathlib import Path
import json
from math import ceil

ROOT = Path(__file__).resolve().parents[1]
SCENES = {
    'progresskit-mail': ('Korespondencja', 'mail'),
    'progresskit-tax': ('Biuro rachunkowe', 'tax'),
    'glikemia-premium': ('Dziennik na Androida', 'glikemia'),
    'vaeloria': ('Świat gry', 'vaeloria'),
    'taskpet': ('Organizer i zwierzak', 'taskpet'),
}
FEATURED = tuple(SCENES)
REVIEWED = json.loads((ROOT/'catalog/living-media.json').read_text())
CUT_SHEET = json.loads((ROOT/'assets/world/cut-sheet.json').read_text())
EXHIBITS = json.loads((ROOT/'catalog/product-showcases.json').read_text())


def images_for(project):
    identifier = project['id']
    if identifier == 'progresskit-mail':
        return REVIEWED[identifier]['images'] + [project['gallery'][1]]
    if identifier == 'progresskit-tax':
        return [EXHIBITS[identifier]['hero'], EXHIBITS[identifier]['android']]
    if identifier == 'vaeloria':
        return [EXHIBITS[identifier]['hero'], EXHIBITS[identifier]['screens']['cards']]
    if identifier == 'taskpet':
        return [EXHIBITS[identifier]['hero'], EXHIBITS[identifier]['screens']['fruit']]
    return project['gallery'][:2]


# Engravings identify the actual tool when no public screenshot is available.
# A schematic is never labelled as an application screen.
SYMBOLS = {
    'progresskit-offgrid':'M9 3l9 8-12 10 8 8V3L5 12l12 10',
    'progresskit-remote':'M3 4h23v15H3z M11 24h9m-6-5v5 M19 14l10 5-5 2-1 6z',
    'progresskit-notes':'M6 3h17l4 4v22H6z M21 3v6h6 M10 13h11m-11 5h9m-9 5h7',
    'progresskit-vault-key':'M19 5a6 6 0 1 1-3 11l-9 10H3v-5l10-10a6 6 0 0 1 6-6z M20 9h2',
    'progresskit-infrastructure':'M11 3h10v6H11z M16 9v6H6v6m10-6h10v6 M2 21h8v6H2z M22 21h8v6h-8z',
    'progresskit-analytics':'M4 3v24h24 M9 21v-6m6 6v-9m6 9V9 M7 12l7-5 6 2 6-6',
    'gotrans360':'M2 7h17v14H2z M19 11h6l5 6v4H19 M5 24a3 3 0 1 0 6 0 3 3 0 1 0-6 0m16 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    'adivara':'M3 9l13-6 13 6-13 6z M3 16l13 6 13-6 M3 23l13 6 13-6',
    'ignira':'M4 5h24v21H4z M4 11h24 M8 8h1m3 0h1 M9 16h14m-14 5h8',
    'obserwator':'M2 16s6-9 14-9 14 9 14 9-6 9-14 9S2 16 2 16z M12 16a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    'kan-system':'M3 8h18l8 8v11H3z M8 13h9m-9 5h15m-15 4h10',
}


def product_symbol(project):
    path = SYMBOLS.get(project['id'], 'M4 6h24v18H4z M4 11h24 M11 27h10')
    return f'<svg class="product-symbol" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{path}"/></svg>'


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
            kind = 'desktop' if image['width'] > image['height'] else 'phone'
            figures.append(f'<span class="living-device living-device--{kind} living-device--{layer}">'+picture(image, f'living-screen living-screen--{layer}')+'</span>')
        return '<span class="living-media">' + ''.join(figures) + '</span>'
    return ''


def crystal_preview(identifier, product_face):
    # The atlas contains lossless-alpha views rendered from the actual WebGL
    # solids. Each active DOM link still supplies its original image to WebGL.
    tiles = CUT_SHEET['tiles']
    if identifier not in tiles:
        return f'<span class="crystal-face">{product_face}</span>'
    index = tiles.index(identifier)
    width, height = CUT_SHEET['tileWidth'], CUT_SHEET['tileHeight']
    columns = CUT_SHEET['columns']
    x, y = (index % columns) * width, (index // columns) * height
    return (f'<svg class="crystal-render" viewBox="{x} {y} {width} {height}" aria-hidden="true">'
            f'<image href="assets/world/cut-sheet.webp" width="{columns*width}" height="{CUT_SHEET["rows"]*height}"/></svg>'
            f'<span class="crystal-face" hidden>{product_face}</span>')


def render(projects, stage, project_url):
    order = {identifier: i for i, identifier in enumerate((*FEATURED, 'echo-worlds'))}
    ordered = sorted(projects, key=lambda p: order.get(p['id'], len(order)))
    nodes, articles = [], []
    for index, project in enumerate(ordered):
        identifier = e(project['id'])
        tone = SCENES.get(project['id'], ('', 'other'))[1]
        name = project['name'].removeprefix('ProgressKit ')
        previews = images_for(project) if project['id'] in FEATURED else project['gallery']
        image = previews[0] if previews else None
        if image:
            preview = picture(image, 'crystal-image')
        else:
            # Products without a reviewed screen show a factual technology engraving.
            preview = '<span class="crystal-inscription">' + product_symbol(project) + '</span>'
        href = project['id']+'/' if project['id'] in ('echo-worlds','taskpet') else project_url(project)
        nodes.append(f'''<a class="artifact-card living-node" href="{href}" data-project-id="{identifier}" data-node-index="{index}" data-tone="{tone}" aria-label="Poznaj {e(project['name'])}" title="{e(project['summary'])}">
          <span class="living-crystal" aria-hidden="true">{crystal_preview(identifier, preview)}</span>
          <span class="living-node__name">{e(name)}</span>{media(project)}</a>''')
        if project['id'] not in FEATURED:
            continue
        label, _ = SCENES[project['id']]
        reviewed_images = images_for(project)
        provenance = 'Tax WWW z danymi DEMO oraz natywny ekran logowania Android z polem MFA.' if project['id']=='progresskit-tax' else reviewed_images[0]['caption']
        still = '<figure class="living-still">'+picture(reviewed_images[0], 'living-still__image')+'</figure>' if reviewed_images else ''
        articles.append(f'''<article class="living-chapter" data-living-project="{identifier}" data-tone="{tone}" aria-labelledby="living-title-{identifier}">
          <div class="living-chapter__copy"><span class="eyebrow">{e(label)}</span><h2 id="living-title-{identifier}">{e(project['name']).replace('ProgressKit ', '<span>ProgressKit</span> ')}</h2>
          <span class="living-stage-label">{e(project['stage'] or 'Etap do potwierdzenia')}</span><p>{e(project['summary'].split('. ', 1)[0].rstrip('.') + '.')}</p>
          <div class="living-tech">{''.join(f'<span>{e(t)}</span>' for t in project['technologies'][:3])}</div>
          <div class="living-chapter__actions"><a class="world-control world-control--primary" href="{project_url(project)}">Pełna prezentacja <span aria-hidden="true">↗</span></a><a href="#projekty" data-return-map>Wróć do mapy ↑</a></div></div>
          {still}<p class="living-provenance">{e(provenance)}</p></article>''')
    markers = ''
    content = (ROOT/'templates/hero-installation.html').read_text()
    forest=EXHIBITS['vaeloria']['screens']['intro']
    content=content.replace('@@LIVING_BACKDROP@@', f'<img class="living-backdrop" src="{e(forest["src"])}" width="{forest["width"]}" height="{forest["height"]}" alt="" aria-hidden="true" loading="lazy" decoding="async">')
    for i, identifier in enumerate(FEATURED):
        articles[i] = f'<span id="scena-{identifier}" class="living-marker" data-stop="{2.8+i*1.2:.1f}"></span>' + articles[i]
    for key, value in {'HOUSING':e(json.loads((ROOT/'catalog/brand.json').read_text())['heroBackground'] or 'assets/brand/optical-core.webp'),'NODES': ''.join(nodes), 'CHAPTERS': ''.join(articles), 'MARKERS': markers, 'COUNT': str(len(projects)), 'GAMES': str(sum(p['category']=='games' for p in projects)), 'GROUPS': str(ceil(len(projects)/6)), 'CATEGORIES': str(len({p['category'] for p in projects}))}.items():
        content = content.replace('@@LIVING_'+key+'@@', value)
    return content
