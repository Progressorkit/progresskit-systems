# ProgressKit Systems

Centralna strona ekosystemu ProgressKit: własne produkty, rozwijane systemy, infrastruktura i usługi inżynierskie.

## Live

[https://progressorkit.github.io/progresskit-systems/](https://progressorkit.github.io/progresskit-systems/)

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- semantyczny, pionowy landing page z sekcjami/anchorami
- GitHub Pages dla części statycznej

Strona nie wymaga frameworka ani procesu budowania frontendowego.

## Kontakt

- E-mail: `pawel@progresskit.pl`
- TikTok: `@progresskit`

## Glikemia Premium — produkt i dystrybucja Android

Strona produktu: `/glikemia-premium/`.

Pobranie APK prowadzi przez backendową ścieżkę `/download/glikemia-premium`. Licznik jest zwiększany dopiero po zakończeniu pełnej odpowiedzi HTTP 200; HEAD, wykrywalny prefetch/prerender, Range/resume, błędy transferu i ucięte odpowiedzi nie są naliczane.

Pobranie APK, trwały licznik i moderowane opinie wymagają istniejącego backendu FastAPI za Caddy. Sam GitHub Pages obsługuje wyłącznie część statyczną; nie uruchomi API.

Instrukcja podglądu, wdrożenia, moderacji i weryfikacji:
[docs/GLIKEMIA_DISTRIBUTION.md](docs/GLIKEMIA_DISTRIBUTION.md).


## ProgressKit Mail

Strona produktu: `/progresskit-mail/`. Pokazuje realne ekrany klienta Android oraz aktualny podział na działającą infrastrukturę i elementy nadal rozwijane.

## System wizualny

Strona główna i podstrony produktów używają wspólnego grafitowo-stalowego shellu ProgressKit z czerwonym sygnałem marki. Kolory produktów są wyłącznie lokalnymi akcentami: Glikemia zachowuje subtelny niebiesko-turkusowy motyw, a ProgressKit Mail czerwony. Szczegóły: [docs/VISUAL_AUDIT.md](docs/VISUAL_AUDIT.md).
