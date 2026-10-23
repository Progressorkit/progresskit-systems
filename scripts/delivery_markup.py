"""Render the approved ecosystem map and release-channel explanation.

The map references existing catalogue entries. Roadmap concepts are explanatory
content, never additional catalogue products or enabled integrations.
"""
from html import escape
import re


ECOSYSTEM = (
    ("progresskit-tax", "tax", "ProgressKit Tax", "Obsługa biura."),
    ("progresskit-translator", "translator", "ProgressKit Translator", "Niezależny moduł językowy offline-first."),
    ("progresskit-mail", "mail", "ProgressKit Mail", "Komunikacja e-mail. Połączenie z głównym przepływem — planowane."),
)
CHANNELS = (
    ("Beta", "rozwiązania testowe"),
    ("Stable", "rozwiązania zweryfikowane"),
    ("Commercial", "dostępność komercyjna, niezależna od statusu wydania"),
)
ECOSYSTEM_CONNECTIONS = (
    ('tax', 'translator'),
    ('translator', 'agents'),
    ('agents', 'voice'),
    ('tax', 'mail'),
    ('mail', 'messenger'),
)


def render_case_studies():
    """Keep the existing anchor and introduction without a second project browser."""
    return (
        '<section class="section delivery-case-studies home-chapter" id="wyzwania" '
        'aria-labelledby="engineering-exhibit-title"><div class="shell">'
        '<header class="delivery-heading"><h2 class="section-title" id="engineering-exhibit-title">'
        'Wyzwania inżynieryjne.</h2></header>'
        '<p class="section-copy">Wybrane problemy z rozwoju produktów. Pełne analizy, decyzje i granice '
        'weryfikacji opisano w case studies.</p>'
        '<a href="projekty/">Case studies projektów →</a>'
        '</div></section>'
    )


def render_delivery(projects):
    """Return progressively enhanced sections without altering catalogue data."""
    if not isinstance(projects, list):
        raise ValueError("Delivery sections require catalogue projects.")
    by_id = {}
    for project in projects:
        if not isinstance(project, dict) or not isinstance(project.get("id"), str):
            raise ValueError("Invalid catalogue project.")
        if project["id"] in by_id:
            raise ValueError("Duplicate catalogue identity.")
        by_id[project["id"]] = project

    products = {}
    for identifier, role, label, description in ECOSYSTEM:
        project = by_id.get(identifier)
        if project is None:
            raise ValueError("Ecosystem project is absent from the catalogue.")
        slug = project.get("slug")
        name = project.get("name")
        if (not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug != identifier
                or not isinstance(name, str) or not name.strip()):
            raise ValueError("Invalid ecosystem project identity.")
        product_stage = project.get('stage') or 'Etap do potwierdzenia'
        if not isinstance(product_stage, str):
            raise ValueError("Invalid ecosystem project stage.")
        products[identifier] = {
            'role': role, 'label': label, 'description': description, 'stage': product_stage,
            'link':
            f'<a class="delivery-project-link" href="projekty/{slug}/">Zobacz cały projekt '
            f'<span class="sr-only">{escape(name)}</span><span aria-hidden="true">→</span></a>',
        }

    # Six roles are not a second catalogue. Their details and project links stay
    # visible without JavaScript; enhancement moves the same detail into the
    # desktop console instead of duplicating links or accessible identities.
    concepts = {
        'local-ai-agents': ('agents', 'Local AI Agents', 'Lokalni agenci AI.'),
        'voice-gateway': ('voice', 'Voice Gateway', 'Integracje telefoniczne.'),
        'secure-messenger': ('messenger', 'Bezpieczny komunikator',
                             'Osobny kierunek rozwoju. Połączenie z ekosystemem — planowane.'),
    }

    def render_node(identifier, tag, heading_tag, classes, relationship=False):
        product = products.get(identifier)
        node, label, description = (
            (product['role'], product['label'], product['description']) if product else concepts[identifier]
        )
        status = product['stage'] if product else 'Planowane'
        stage = {'W rozwoju': 'development', 'Prototyp': 'prototype', 'Planowane': 'planned'}.get(
            status, 'unconfirmed'
        )
        attribute = 'data-ecosystem-project' if product else 'data-ecosystem-concept'
        branch_attributes = (
            f' data-integration-status="planned" aria-labelledby="ecosystem-{node}-label"'
        ) if tag == 'section' else ''
        heading_id = f' id="ecosystem-{node}-label"' if tag == 'section' else ''
        connector = (
            '<span class="delivery-flow__relationship" data-integration-status="planned">'
            'Planowane połączenie</span>'
        ) if relationship else ''
        return (
            f'<{tag} class="{classes} ecosystem-node" {attribute}="{identifier}" '
            f'data-ecosystem-node="{node}" data-ecosystem-stage="{stage}"{branch_attributes}>'
            f'<{heading_tag} class="delivery-flow__heading ecosystem-node__heading"{heading_id}>'
            f'<button class="ecosystem-node__trigger" type="button" data-ecosystem-select="{node}" '
            f'id="ecosystem-trigger-{node}" aria-controls="ecosystem-role-{node}" '
            f'aria-expanded="true" aria-labelledby="ecosystem-name-{node}" '
            f'aria-describedby="ecosystem-status-{node}">'
            f'<span class="ecosystem-node__name" id="ecosystem-name-{node}">{escape(label)}</span>'
            f'<span class="delivery-state" id="ecosystem-status-{node}">{escape(status)}</span>'
            f'</button></{heading_tag}>'
            f'<div class="ecosystem-node__detail" id="ecosystem-role-{node}" '
            f'role="region" aria-labelledby="ecosystem-name-{node}">'
            f'<p class="delivery-flow__description">{escape(description)}</p>'
            + (product['link'] if product else '') + '</div>' + connector + f'</{tag}>'
        )

    # Product stages come from the reviewed catalogue. Every connecting edge is
    # explicitly planned; concepts do not acquire a project route or release.
    flow = ''.join(
        render_node(identifier, 'li', 'h3', 'delivery-flow__node', identifier != 'voice-gateway')
        for identifier in ('progresskit-tax', 'progresskit-translator', 'local-ai-agents', 'voice-gateway')
    )
    independent = (
        '<aside class="delivery-independent" aria-labelledby="ecosystem-communication-title">'
        '<h3 id="ecosystem-communication-title">Niezależna komunikacja</h3>'
        '<div class="delivery-independent__branches">'
        + render_node('progresskit-mail', 'section', 'h4', 'delivery-branch')
        + render_node('secure-messenger', 'section', 'h4', 'delivery-branch')
        + '</div></aside>'
    )
    wires = (
        '<svg class="ecosystem-wires" data-ecosystem-wires aria-hidden="true" focusable="false" '
        'viewBox="0 0 1000 600" preserveAspectRatio="none">'
        + ''.join(
            f'<path data-ecosystem-edge="{source}-{target}" data-from="{source}" '
            f'data-to="{target}" data-integration-status="planned"></path>'
            for source, target in ECOSYSTEM_CONNECTIONS
        ) + '</svg>'
    )
    ecosystem = (
        '<section class="section delivery-section delivery-ecosystem home-chapter" id="ekosystem" '
        'data-ecosystem-system aria-labelledby="ecosystem-title" aria-describedby="ecosystem-roadmap-note">'
        '<div class="shell"><header class="delivery-heading">'
        '<h2 class="section-title" id="ecosystem-title">Ekosystem ProgressKit</h2>'
        '</header><p class="delivery-map-intro">Plan współpracy modułów. Połączenia poniżej są roadmapą, nie potwierdzeniem działających integracji.</p>'
        '<div class="delivery-map delivery-map--flow ecosystem-system" data-ecosystem-map>'
        + wires + '<ol class="delivery-flow" aria-label="Ekosystem ProgressKit">' + flow + '</ol>'
        + independent + '<div class="ecosystem-console" id="ecosystem-console" '
        'data-ecosystem-console aria-live="polite" aria-atomic="true" hidden></div></div>'
        + '<div class="delivery-roadmap" id="ecosystem-roadmap-note">'
        '<p>Nie potwierdzono działających integracji między tymi modułami. Planowane połączenia nie stanowią dostępnej oferty.</p></div>'
        '</div></section>'
    )
    channels = ''.join(
        f'<article class="delivery-channel"><h3>{escape(name)} <span>— {escape(description)}</span></h3></article>'
        for name, description in CHANNELS
    )
    releases = (
        '<section class="section delivery-section home-chapter" id="wydania" aria-labelledby="releases-title">'
        '<div class="shell"><header class="delivery-heading">'
        '<h2 class="section-title" id="releases-title">Wydania i dostępność</h2>'
        '</header><div class="delivery-channels">' + channels + '</div>'
        '<p class="delivery-release-note">W tym katalogu nie potwierdzono wydań Stable ani dostępności komercyjnej.</p>'
        '</div></section>'
    )
    return ecosystem + releases
