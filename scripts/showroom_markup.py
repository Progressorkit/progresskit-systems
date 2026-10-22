"""Prerender one genuine project collection; JavaScript enhances its scroll row."""
from html import escape
from math import cos, pi, sin
import re


CATEGORIES = {
    'mobile': ('Aplikacje', '<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M13 7h6m-4 18h2"/>'),
    'saas': ('SaaS', '<path d="M9 24h14a6 6 0 0 0 .6-12 8 8 0 0 0-15.2-1.2A6.7 6.7 0 0 0 9 24Z"/><path d="M12 18h8m-6-4h4"/>'),
    'platforms': ('Platformy', '<circle cx="16" cy="9" r="3.5"/><circle cx="7" cy="12" r="2.5"/><circle cx="25" cy="12" r="2.5"/><path d="M10 26v-3a6 6 0 0 1 12 0v3M3 25v-3a4 4 0 0 1 5-3.9M29 25v-3a4 4 0 0 0-5-3.9"/>'),
    'games': ('Gry', '<path d="M10 10h12a4 4 0 0 1 3.9 3.1l2.5 10a3.1 3.1 0 0 1-5.2 2.9L20 23h-8l-3.2 3a3.1 3.1 0 0 1-5.2-2.9l2.5-10A4 4 0 0 1 10 10Z"/><path d="M10 14v6m-3-3h6"/><circle cx="21" cy="16" r=".8"/><circle cx="24" cy="19" r=".8"/>'),
    'web': ('Realizacje WWW', '<circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24M6.5 9h19m-19 14h19"/>'),
    'technology': ('Infrastruktura', '<rect x="5" y="3" width="22" height="7" rx="1.5"/><rect x="5" y="12.5" width="22" height="7" rx="1.5"/><rect x="5" y="22" width="22" height="7" rx="1.5"/><circle cx="9" cy="6.5" r=".7"/><circle cx="9" cy="16" r=".7"/><circle cx="9" cy="25.5" r=".7"/><path d="M14 6.5h9M14 16h9m-9 9.5h9"/>'),
}


def orbital_field():
    """Static metal shares the six-slice controller's k=.12 projection."""
    def point(angle, radius=1, drop=0):
        perspective = 1 / (1 - .12 * cos(angle))
        return (500 + 500 * radius * sin(angle) * perspective,
                250 + 250 * radius * cos(angle) * perspective + drop)

    def samples(start, end, radius=1, drop=0):
        count = max(1, round(abs(end - start) / (pi / 60)))
        return [point(start + (end - start) * i / count, radius, drop) for i in range(count + 1)]

    def path(points, closed=False):
        return 'M' + ' L'.join(f'{x:.3f} {y:.3f}' for x, y in points) + (' Z' if closed else '')

    def ribbon(start, end):
        return path(samples(start, end, 1.065) + samples(end, start, .94), True)

    def wall(start, end):
        return path(samples(start, end, 1.065) + samples(end, start, 1.065, 34), True)

    def material(prefix):
        return (f'<defs><linearGradient id="{prefix}-face" x1="0" y1="0" x2=".12" y2="1">'
                '<stop stop-color="#646c70"/><stop offset=".25" stop-color="#a2aaad"/>'
                '<stop offset=".48" stop-color="#c5cbcc"/><stop offset=".6" stop-color="#717a7e"/>'
                '<stop offset="1" stop-color="#353c40"/></linearGradient>'
                f'<linearGradient id="{prefix}-edge" x1="0" y1="0" x2="0" y2="1">'
                '<stop stop-color="#747d82"/><stop offset=".2" stop-color="#343b3f"/>'
                '<stop offset=".8" stop-color="#171b1e"/><stop offset="1" stop-color="#747b7c"/>'
                '</linearGradient></defs>')

    back_start, back_end = pi / 2, 3 * pi / 2
    front_start, front_end = -pi / 2, pi / 2
    struts = ''.join(
        f'<path class="showroom-orbit__strut" d="{path([point(i*pi/12, .79), point(i*pi/12, 1.065)])}"/>'
        for i in range(24)
    )
    seams = ''.join(
        f'<path class="showroom-orbit__seam" d="{path([point(i*pi/30, .94), point(i*pi/30, 1.065)])}"/>'
        for i in range(-15, 16)
    )
    nodes = ''.join(
        f'<g class="showroom-orbit__node" data-orbit-node="{offset}" style="display:none">'
        '<line class="showroom-orbit__link" x1="500" y1="250" x2="500" y2="250"/>'
        '<circle class="showroom-orbit__terminal" cx="500" cy="250" r="5"/>'
        '<circle class="showroom-orbit__pulse" cx="500" cy="250" r="12"/>'
        '<circle class="showroom-orbit__spark" cx="500" cy="250" r="2.5"/>'
        '</g>' for offset in range(-3, 3)
    )
    return (
        '<svg class="showroom-orbit" viewBox="0 0 1000 500" preserveAspectRatio="none" '
        'aria-hidden="true" focusable="false">'
        + material('showroom-back')
        + f'<path class="showroom-orbit__side showroom-orbit__side--rear" d="{wall(back_start, back_end)}" fill="url(#showroom-back-edge)"/>'
        + f'<path class="showroom-orbit__ribbon showroom-orbit__ribbon--rear" d="{ribbon(back_start, back_end)}" fill="url(#showroom-back-face)"/>'
        + f'<path class="showroom-orbit__ring showroom-orbit__ring--inner" d="{path(samples(-pi, pi, .79))}"/>'
        + struts
        + f'<path class="showroom-orbit__ring showroom-orbit__ring--energy" d="{path(samples(-pi, pi, 1.015))}"/>'
        + nodes + '</svg>'
        '<svg class="showroom-orbit-front" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
        + material('showroom-front')
        + f'<path class="showroom-orbit__retainer" d="{path(samples(back_start, back_end, 1, 86))}"/>'
        + f'<path class="showroom-orbit__side" d="{wall(front_start, front_end)}" fill="url(#showroom-front-edge)"/>'
        + f'<path class="showroom-orbit__ribbon" d="{ribbon(front_start, front_end)}" fill="url(#showroom-front-face)"/>'
        + seams
        + f'<path class="showroom-orbit__rim" d="{path(samples(front_start, front_end, 1.065))}"/>'
        + f'<path class="showroom-orbit__ring showroom-orbit__ring--energy" d="{path(samples(front_start, front_end, 1.015))}"/>'
        + '</svg>'
        '<div class="showroom-core" aria-hidden="true"><img src="assets/brand/progressorkit-stamp.png" width="84" height="84" alt=""><span>PROGRESSKIT</span>'
        '<span>EKOSYSTEM</span><i></i></div>'
    )


def render_showroom(projects):
    """Return accessible HTML from the already-reviewed catalog, without clones."""
    if not isinstance(projects, list) or not projects:
        raise ValueError('Showroom requires a nonempty reviewed project list.')
    seen = set()
    for project in projects:
        if not isinstance(project, dict):
            raise ValueError('Invalid showroom project.')
        identifier = project.get('id')
        if (not isinstance(identifier, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', identifier)
                or project.get('slug') != identifier or identifier in seen
                or not isinstance(project.get('category'), str) or project['category'] not in CATEGORIES
                or not isinstance(project.get('name'), str) or not project['name'].strip()):
            raise ValueError('Invalid or duplicate showroom identity.')
        seen.add(identifier)
    def e(value):
        return escape(str(value), quote=True)
    gates = []
    for category, (label, icon) in CATEGORIES.items():
        count = sum(project['category'] == category for project in projects)
        if not count:
            continue
        gates.append(f'''<button class="showroom-gate" type="button" data-showroom-category="{category}" aria-pressed="false" aria-controls="showroom-track"><span class="showroom-gate__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{icon}</svg></span><span class="showroom-gate__label">{label}</span><span class="showroom-gate__count" aria-label="Liczba projektów: {count}">{count:02d}</span></button>''')
    cards = []
    for index, project in enumerate(projects):
        identifier = project['id']
        category = project['category']
        label = CATEGORIES[category][0]
        stage = project.get('stage') or 'Etap do potwierdzenia'
        # Project images stay in the catalog for the hologram and case study.
        # A structural module uses a small category icon and a real list index.
        media = (f'<div class="showroom-card__badge" aria-hidden="true">'
                 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
                 + CATEGORIES[category][1] + f'</svg><span>{index + 1:02d}</span></div>')
        gallery = project.get('gallery') or []
        image = gallery[0] if gallery else None
        picture = (f'<figure class="project-slice__media"><img src="{e(image["src"])}" width="{image["width"]}" height="{image["height"]}" alt="{e(image["alt"])}" loading="lazy" decoding="async"><figcaption>{e(image["caption"])}</figcaption></figure>') if image else ''
        problem = f'<p>{e(project["problem"])}</p>' if project.get('problem') else ''
        technologies = ''.join(f'<li>{e(technology)}</li>' for technology in project.get('technologies', []))
        download = '<a class="cta cta--ghost" href="/download/glikemia-premium">Pobierz Glikemia Premium</a>' if identifier == 'glikemia-premium' else ''
        cards.append(f'''<article class="showroom-card" data-project-id="{identifier}" data-category="{category}" role="group" aria-roledescription="slajd" aria-label="{e(project['name'])} · {index + 1} z {len(projects)}"><div class="project-slice"><a class="showroom-card__open" data-showroom-open="{identifier}" href="projekty/{identifier}/" aria-label="Odkryj projekt: {e(project['name'])}" aria-expanded="false" aria-controls="slice-panel-{identifier}"><span class="showroom-card__category">{label}</span>{media}<div class="showroom-card__caption"><h3>{e(project['name'])}</h3><span class="showroom-card__stage">{e(stage)}</span><span class="showroom-card__action">Odkryj projekt <span aria-hidden="true">↗</span></span></div></a><div class="project-slice__panel" id="slice-panel-{identifier}" data-slice-panel hidden><button class="project-slice__close" type="button" data-slice-close>Zamknij ×</button><div class="project-slice__body">{picture}<div class="project-slice__copy"><p>{e(project.get('summary', ''))}</p>{problem}<ul class="project-slice__technologies">{technologies}</ul></div></div><div class="project-slice__actions"><a class="cta cta--primary" href="projekty/{identifier}/">Zobacz cały projekt <span aria-hidden="true">→</span></a>{download}<a class="cta cta--ghost" href="#kontakt">Kontakt</a></div></div></div></article>''')
    return f'''<section class="project-showroom section" id="projekty" data-showroom data-showroom-slices aria-labelledby="showroom-title"><div class="shell"><header class="showroom-heading"><div><span class="section-kicker">EKOSYSTEM PROGRESSKIT</span><h2 class="section-title" id="showroom-title">System połączonych światów.</h2></div><p>{len(projects)} projektów w jednym ekosystemie. Wybierz projekt, aby rozwinąć moduł.</p></header><div class="showroom-gates" data-showroom-enhancement hidden aria-label="Filtruj ekspozycję według kategorii">{''.join(gates)}</div><div class="showroom-filterbar" data-showroom-enhancement hidden><button type="button" class="showroom-all" data-showroom-category="" aria-pressed="true" aria-controls="showroom-track">Wszystkie projekty <span>{len(projects)}</span></button><p id="showroom-status" role="status" aria-live="polite" aria-atomic="true">Kolekcja: {len(projects)} projektów.</p></div><div class="showroom-viewport" data-showroom-viewport tabindex="0" role="region" aria-roledescription="karuzela" aria-label="Orbitalna ekspozycja projektów" aria-describedby="showroom-instructions">{orbital_field()}<div class="showroom-track" id="showroom-track">{''.join(cards)}</div></div><nav class="showroom-controls" data-showroom-enhancement hidden aria-label="Sterowanie ekspozycją"><button type="button" id="showroom-previous" data-showroom-step="-1" aria-controls="showroom-track" aria-label="Poprzedni projekt">←</button><span data-showroom-position aria-hidden="true">1 / {len(projects)}</span><button type="button" id="showroom-next" data-showroom-step="1" aria-controls="showroom-track" aria-label="Następny projekt">→</button><button class="showroom-motion-toggle" type="button" data-showroom-motion-toggle aria-pressed="false">Wstrzymaj efekty orbity</button></nav><p class="showroom-instructions" id="showroom-instructions">Wybierz projekt, aby rozwinąć moduł. Szczegóły przewijają się razem ze stroną.</p><p class="showroom-catalog-link"><a href="projekty/">Wyszukaj projekt lub technologię w pełnym katalogu →</a></p></div></section>'''
