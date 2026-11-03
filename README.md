# ProgressKit Systems

Centralna strona ekosystemu ProgressKit: własne produkty, rozwijane systemy, infrastruktura i usługi inżynierskie.

## Live

[https://progresskit.pl/](https://progresskit.pl/)

Zmiany z 02.11.2026 są lokalnym kandydatem do odbioru; nie zostały opublikowane. ownerVisualApproval pozostaje OPEN.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Three.js/WebGL2 — lokalne moduły i licencja MIT
- Python — generator katalogu i HTML
- FastAPI — opcjonalny lokalny podgląd, dystrybucja APK i własna analityka

Witryna ma generowane statycznie HTML i progresywne interakcje JavaScript. Showroom korzysta z lokalnej zależności Three.js; nie wymaga CDN. Generator katalogu i case studies używa standardowej biblioteki Python.

## V5 — katalog i statyczne case studies

Wersja V5 zachowuje shell i identyfikację V4 oraz korektę kompozycji właściciela.
Homepage zawiera sześć bram filtrujących wspólny showroom 360° i pojedynczy hologram projektu; pełne wyszukiwanie jest pod `/projekty/`. Jeden katalog
`catalog/projects.json` generuje stronę główną, 19 case studies, metadane i sitemap.
Katalog nie wymaga backendu. Scena przestrzenna używa lokalnych modułów Three.js/WebGL2, z fallbackiem i reduced motion. Bez JavaScript prawdziwe linki projektów pozostają w przewijanej kolekcji; ekspozycja przestrzenna, hover, filtry i hologram wymagają JS.
Publikację blokuje `scripts/check-publication.py` do czasu akceptacji kompozycji przez właściciela.

```sh
npm run build
npm run check
npm test
python3 -m unittest discover -s tests -p 'test_catalog_validation.py'
python3 -m unittest discover -s tests -p 'test_site_v5.py'
python3 scripts/package-release.py /tmp/progresskit-v5-release
```

Testy HTTP/API wymagają osobnego środowiska z `analytics/requirements.txt` i `httpx`:
`python -m unittest discover -s tests -v`. Podgląd: `PK_PYTHON=/ścieżka/do/venv/bin/python sh scripts/preview.sh`. Opcjonalny `PK_PREVIEW_PORT` pozwala wybrać port (domyślnie 8092).
Nie serwować całego repozytorium przez `python -m http.server`; wydanie ma jawną
listę publicznych plików i nie zawiera dokumentacji, źródeł backendu ani surowych galerii.

Aktualne materiały 02.11.2026: [audyt portfolio V2](docs/portfolio-audit-20261102/README.md), [kontrakt danych](docs/portfolio-audit-20261102/schema-v2.md), [końcowe QA](docs/final-website-qa-20261102/README.md), [film marki](marketing/brand-launch-2026-11-02/README.md), [preflight Mail](docs/mail-commercial-preflight-20261102/README.md).

V2 rozdziela funkcje, stan każdej platformy, dystrybucję i produkcję. 159 funkcji ma odwołania do źródeł; 101 rekordów weryfikacji zachowuje własne daty i zakres. Pięć dodanych tożsamości obejmuje Notes, OffGrid, Reel Agent, Remote i Vault Key; koncepcja i demonstrator nie są przedstawiane jako gotowe produkty komercyjne. `catalog/operator.json` zasila lokalną informację o operatorze; surowy plik, dokumentacja i materiały reklamowe pozostają poza publiczną allowlistą.

Starsze checkpointy: [raport wizualny](docs/PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md), [ręczny odbiór](docs/PROGRESSKIT_V5_VISUAL_ACCEPTANCE.md).

Dokumentacja: [architektura](docs/PROGRESSKIT_V5_ARCHITECTURE.md),
[inwentaryzacja](docs/PROGRESSKIT_V5_PROJECT_INVENTORY.md),
[raport](docs/PROGRESSKIT_V5_MASTER_REPORT.md),
[testy](docs/PROGRESSKIT_V5_TEST_REPORT.md),
[publikacja i rollback](docs/PROGRESSKIT_V5_DEPLOYMENT.md).

## Kontakt

- E-mail: `pawel@progresskit.pl`
- [TikTok — @progresskit](https://www.tiktok.com/@progresskit)

## Glikemia Premium — produkt i dystrybucja Android

Strona produktu: `/glikemia-premium/`. Pobranie APK, trwały licznik i moderowane
opinie wymagają istniejącego backendu FastAPI za Caddy. Sam GitHub Pages obsługuje
wyłącznie część statyczną; nie uruchomi API.

Instrukcja podglądu, wdrożenia, moderacji i weryfikacji:
[docs/GLIKEMIA_DISTRIBUTION.md](docs/GLIKEMIA_DISTRIBUTION.md).

## ProgressKit Mail i wspólny shell

Zachowany adres `/progresskit-mail/` prowadzi do prezentacji z tego samego katalogu
co `/projekty/progresskit-mail/`. Galeria pokazuje przejrzane, zanonimizowane ekrany.
Shell V4 rozwinięto w kierunku grafitu, srebra i delikatnej czerwieni; oryginalny
miedziany PK pochodzi z pliku wskazanego przez właściciela. Historia V4: [VISUAL_AUDIT](docs/VISUAL_AUDIT.md).
