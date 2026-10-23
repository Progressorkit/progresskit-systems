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
    """Return two static, accessible sections without altering catalogue data."""
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

    # Product stages come from the reviewed catalogue. Every connecting edge is
    # explicitly planned; concepts do not acquire a project route or release.
    flow = []
    for identifier in ('progresskit-tax', 'progresskit-translator', 'local-ai-agents', 'voice-gateway'):
        product = products.get(identifier)
        label = product['label'] if product else {'local-ai-agents': 'Local AI Agents', 'voice-gateway': 'Voice Gateway'}[identifier]
        description = product['description'] if product else {'local-ai-agents': 'Lokalni agenci AI.', 'voice-gateway': 'Integracje telefoniczne.'}[identifier]
        status = product['stage'] if product else 'Planowane'
        attribute = 'data-ecosystem-project' if product else 'data-ecosystem-concept'
        connector = (
            '<span class="delivery-flow__connector" aria-hidden="true">↔</span>'
            '<span class="delivery-flow__relationship" data-integration-status="planned">Planowane połączenie</span>'
        ) if identifier != 'voice-gateway' else ''
        flow.append(
            f'<li class="delivery-flow__node" {attribute}="{identifier}">'
            f'<p class="delivery-state">{escape(status)}</p>'
            f'<h3 class="delivery-flow__heading">{escape(label)}</h3>'
            f'<p class="delivery-flow__description">{escape(description)}</p>'
            + (product['link'] if product else '') + connector + '</li>'
        )

    mail = products['progresskit-mail']
    independent = (
        '<aside class="delivery-independent" aria-labelledby="ecosystem-communication-title">'
        '<h3 id="ecosystem-communication-title">Niezależna komunikacja</h3>'
        '<div class="delivery-independent__branches">'
        '<section class="delivery-branch" data-ecosystem-project="progresskit-mail" '
        'data-integration-status="planned" aria-labelledby="ecosystem-mail-label">'
        f'<p class="delivery-state">{escape(mail["stage"])}</p>'
        f'<h4 class="delivery-flow__heading" id="ecosystem-mail-label">{escape(mail["label"])}</h4>'
        f'<p class="delivery-flow__description">{escape(mail["description"])}</p>'
        + mail['link'] + '</section>'
        '<section class="delivery-branch" data-ecosystem-concept="secure-messenger" '
        'data-integration-status="planned" aria-labelledby="ecosystem-messenger-label">'
        '<p class="delivery-state">Planowane</p>'
        '<h4 class="delivery-flow__heading" id="ecosystem-messenger-label">Bezpieczny komunikator</h4>'
        '<p class="delivery-flow__description">Osobny kierunek rozwoju. Połączenie z ekosystemem — planowane.</p>'
        '</section></div></aside>'
    )
    ecosystem = (
        '<section class="section delivery-section delivery-ecosystem home-chapter" id="ekosystem" '
        'aria-labelledby="ecosystem-title" aria-describedby="ecosystem-roadmap-note">'
        '<div class="shell"><header class="delivery-heading">'
        '<h2 class="section-title" id="ecosystem-title">Ekosystem ProgressKit</h2>'
        '</header><p class="delivery-map-intro">Plan współpracy modułów. Połączenia poniżej są roadmapą, nie potwierdzeniem działających integracji.</p>'
        '<div class="delivery-map delivery-map--flow"><ol class="delivery-flow" '
        'aria-label="Ekosystem ProgressKit">' + ''.join(flow) + '</ol></div>' + independent +
        '<div class="delivery-roadmap" id="ecosystem-roadmap-note">'
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
