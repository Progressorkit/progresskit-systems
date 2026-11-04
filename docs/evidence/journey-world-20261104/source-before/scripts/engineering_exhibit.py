"""Render an evidence-backed engineering exhibit from existing catalogue cases."""
from html import escape
import re


SELECTION = (
    ("progresskit-mail", "Czytelna treść wiadomości"),
    ("progresskit-community", "Kontekst odkrywania społeczności"),
    ("vaeloria", "Aktualizacje aktywnego ambientu"),
    ("glikemia-premium", "Deterministyczna kolejność historii"),
    ("progresskit-tax", "Precyzja kwot wejściowych"),
    ("progresskit-translator", "Wybór lokalnego ASR i TTS"),
)
PHASES = (
    ("problem", "Problem"),
    ("diagnosis", "Diagnoza"),
    ("solution", "Rozwiązanie"),
    ("result", "Wynik"),
)


def render_engineering_exhibit(projects):
    """Return a complete section; native disclosures are the no-JavaScript view."""
    if not isinstance(projects, list):
        raise ValueError("Engineering exhibit requires catalogue projects.")
    by_id = {}
    for project in projects:
        if not isinstance(project, dict) or not isinstance(project.get("id"), str):
            raise ValueError("Invalid catalogue project.")
        if project["id"] in by_id:
            raise ValueError("Duplicate catalogue identity.")
        by_id[project["id"]] = project

    selected = []
    for identifier, title in SELECTION:
        project = by_id.get(identifier)
        if not project or not project.get("cases"):
            continue
        slug = project.get("slug")
        name = project.get("name")
        case = project["cases"][0]
        if (not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug)
                or not isinstance(name, str) or not name.strip() or not isinstance(case, dict)):
            raise ValueError("Invalid engineering case identity.")
        for field in ("problem", "diagnosis", "rootCause", "solution", "verification", "result", "source"):
            if not isinstance(case.get(field), str) or not case[field].strip():
                raise ValueError("Engineering case is missing source-backed content.")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", case["source"]):
            raise ValueError("Invalid public engineering source reference.")
        selected.append((project, case, title))
    if not selected:
        return ""

    def e(value):
        return escape(value, quote=True)

    controls = []
    exhibits = []
    for index, (project, case, title) in enumerate(selected, 1):
        identifier = project["id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
            raise ValueError("Invalid engineering identifier.")
        name = e(project["name"])
        panel_id = "engineering-panel-" + identifier
        control_id = "engineering-select-" + identifier
        number = f"{index:02d}"
        source = next(item for item in project["sources"] if item["id"] == case["source"])
        source_url = f'projekty/{project["slug"]}/#source-{case["source"]}'
        controls.append(
            f'<button type="button" class="engineering-selector" id="{control_id}" '
            f'data-engineering-select="{identifier}" aria-controls="{panel_id}">'
            f'<span class="engineering-selector__number" aria-hidden="true">{number}</span>'
            f'<span class="engineering-selector__name">{name}</span>'
            '<span class="engineering-selector__arrow" aria-hidden="true">↗</span></button>'
        )
        process = "".join(
            f'<li class="engineering-phase"><span class="engineering-phase__number" aria-hidden="true">{step:02d}</span>'
            f'<h4>{label}</h4><p>{e(case[field])}</p></li>'
            for step, (field, label) in enumerate(PHASES, 1)
        )
        opened = " open" if index == 1 else ""
        exhibits.append(
            f'<div class="engineering-presentation" id="{panel_id}" data-engineering-case="{identifier}">'
            '<details class="engineering-case-display" data-engineering-disclosure '
            f'name="engineering-exhibit-cases"{opened}>'
            '<summary class="engineering-case-display__summary">'
            f'<span aria-hidden="true">{number}</span><span>{name}</span>'
            '<span class="engineering-case-display__toggle" aria-hidden="true">+</span></summary>'
            '<div class="engineering-case-display__body">'
            '<header class="engineering-case-display__heading">'
            f'<span class="engineering-case-display__index" aria-hidden="true">{number}</span>'
            f'<span class="section-kicker">{name}</span><h3>{e(title)}</h3></header>'
            f'<ol class="engineering-process" aria-label="Przebieg analizy">{process}</ol>'
            '<div class="engineering-case-display__footer">'
            '<details class="engineering-analysis" data-engineering-analysis>'
            '<summary>Pełna analiza i weryfikacja <span aria-hidden="true">+</span></summary>'
            '<dl>'
            f'<dt>Przyczyna</dt><dd>{e(case["rootCause"])}</dd>'
            f'<dt>Weryfikacja</dt><dd>{e(case["verification"])}</dd>'
            f'<dt>Źródło</dt><dd><a href="{e(source_url)}">{e(source["label"])}</a></dd>'
            '</dl></details>'
            f'<a class="engineering-case-link" href="projekty/{e(project["slug"])}/#wyzwania">'
            f'Zobacz pełne case study <span class="sr-only">{name}</span><span aria-hidden="true">→</span></a>'
            '</div></div></details></div>'
        )
    return (
        '<section class="section engineering-section engineering-exhibit" id="wyzwania" '
        'data-engineering-exhibit aria-labelledby="engineering-exhibit-title"><div class="shell">'
        '<header class="engineering-exhibit__intro" data-reveal><div><span class="section-kicker">JAK PRACUJĘ</span>'
        '<h2 class="section-title" id="engineering-exhibit-title">Wyzwania inżynieryjne.</h2></div>'
        '<p class="section-copy">Wybrane problemy z rozwoju produktów. Pełne analizy, decyzje i granice '
        'weryfikacji opisano w case studies.</p></header>'
        '<div class="engineering-exhibit__stage">'
        '<div class="engineering-selectors" data-engineering-controls hidden aria-label="Wybierz analizę projektu">'
        + "".join(controls) + '</div><div class="engineering-exhibit__presentations">'
        + "".join(exhibits) + '</div></div></div></section>'
    )
