"""Render the approved ecosystem map and release-channel explanation.

The map references existing catalogue entries. Roadmap concepts are explanatory
content, never additional catalogue products or enabled integrations.
"""
from html import escape
import re


ECOSYSTEM = (
    ("progresskit-tax", "tax", "Tax — obsługa biura"),
    ("progresskit-translator", "translator", "Translator — niezależny moduł językowy offline-first"),
    ("progresskit-mail", "mail", "Mail — komunikacja e-mail"),
)
CHANNELS = (
    ("Beta", "rozwiązania testowe"),
    ("Stable", "rozwiązania zweryfikowane"),
    ("Commercial", "dostępność komercyjna, niezależna od statusu wydania"),
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

    nodes = []
    for identifier, role, label in ECOSYSTEM:
        project = by_id.get(identifier)
        if project is None:
            raise ValueError("Ecosystem project is absent from the catalogue.")
        slug = project.get("slug")
        name = project.get("name")
        if (not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug)
                or not isinstance(name, str) or not name.strip()):
            raise ValueError("Invalid ecosystem project identity.")
        nodes.append(
            f'<article class="delivery-node delivery-node--{role}" data-ecosystem-project="{identifier}">'
            '<p class="delivery-state">W rozwoju</p>'
            f'<h3>{escape(label)}</h3>'
            f'<a class="delivery-project-link" href="projekty/{slug}/">Zobacz cały projekt '
            f'<span class="sr-only">{escape(name)}</span><span aria-hidden="true">→</span></a>'
            '</article>'
        )

    ecosystem = (
        '<section class="section delivery-section home-chapter" id="ekosystem" aria-labelledby="ecosystem-title">'
        '<div class="shell"><header class="delivery-heading">'
        '<h2 class="section-title" id="ecosystem-title">Ekosystem ProgressKit</h2>'
        '</header><div class="delivery-map">' + ''.join(nodes) + '</div>'
        '<div class="delivery-roadmap"><p>Roadmapa: bezpieczny komunikator, lokalni agenci AI, integracje telefoniczne.</p>'
        '<p>Planowane połączenia między produktami; nie stanowią dostępnej oferty.</p></div>'
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
