# Korekta materiałów V3 — dowody lokalne

Baza i HEAD: `9322e4e4b35be58517fbf7073c8015673770ef43`. Data: 2026-10-23, Europe/Warsaw. Podgląd: **http://127.0.0.1:8111/**. [Raport](../../MATERIAL_CORRECTION_V3_20261023.md).

## Zgodność wizualna

**PARTIAL**: materiały istniejącego interfejsu poprawiono i obejrzano lokalnie. Dokładne oryginały czerwonego aluminium i krajobrazu stopki pozostają **NOT_IDENTIFIED**. Dwie odnalezione makiety to wyłącznie referencje wizualne. Stopka nie była zmieniana. [Audyt pochodzenia](asset-provenance.md), [dane i SHA](asset-provenance.json).

Kadry: [HERO](browser/1440-first.png), [mapa](browser/1440-ecosystem-map.png), [Tax](browser/1440-progresskit-tax-expanded.png), [Translator](browser/1440-progresskit-translator-expanded.png), [pełna stopka](1440-footer.png), [mobile HERO](browser/390-first.png), [mobile mapa](browser/390-ecosystem-map.png), [mobile pełna stopka](390-footer.png).

`browser/` zawiera 68 PNG i dwa MP4 z pełnego odbioru. Cztery dodatkowe kadry stopki są w tym katalogu: 1920, 1440, 390 i 320 px. Wszystkie wymagane typy kadrów otwarto i oceniono wizualnie. Nie ukrywano elementów, nie wstawiano fikcyjnych treści i nie składano screenshotów.

## Funkcjonalność

- [check.log](check.log): generator i składnia PASS, 14 projektów / 23 generowane pliki.
- [python-tests.log](python-tests.log): 115 PASS / 0 FAIL / 0 SKIP.
- [node-tests.log](node-tests.log): 69 PASS / 0 FAIL / 0 SKIP.
- [browser/report.json](browser/report.json): 93 PASS / 0 FAIL, błędy JS i zasobów: 0; cztery viewporty 1920×1080, 1440×900, 390×844, 320×568.
- [footer-review.json](footer-review.json): 9 PASS / 0 FAIL; na każdej szerokości pełna stopka mieści się w rzeczywistym kadrze oraz ma identyczny HTML i obliczone materiały jak `9322e4e`.
- [http-check.json](http-check.json): 69 PASS / 0 FAIL; wszystkie 65 zasobów lokalnego podglądu zgodne bajtowo, CSP, Range/HEAD/prefetch bez inkrementacji, pełny poprawny APK zwiększa licznik testowy dokładnie o jeden.

W osobnej stronie porównawczej do testu stopki podmieniono wyłącznie odpowiedzi dwóch CSS na dokładne bajty z `git show 9322e4e`; HTML/JS pozostają te same. Wszystkie screenshoty wynikowe pochodzą z rzeczywistej bieżącej strony bez podmiany CSS. Porównanie nie jest deklaracją przywrócenia krajobrazu stopki.

32 wejściowe pliki UI mają te same hashe przed i po pełnym GUI. Katalog, JS, szablony, HTML, zależności, APK i backend pozostają bajtowo zgodne z bazą. Kontrole źródeł i materiałów są zapisane w `preservation-review.json`, `final-verification.json` i `manifest.json`; ostatni manifest wyłącza sam siebie.

## Odtworzenie

Podgląd: `PK_PREVIEW_PORT=8111 PK_PRODUCT_DB=/tmp/progresskit-material-v3-20261023/product.db PK_PYTHON=/tmp/progresskit-final-20261022/venv/bin/python sh scripts/preview.sh`.

Polecenia: `npm run check`; `node --test --experimental-test-isolation=none --test-reporter=tap tests/*.test.cjs`; `/tmp/progresskit-final-20261022/venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`; `node scripts/qa-final-website.cjs http://127.0.0.1:8111/ /tmp/progresskit-material-review`; `node docs/evidence/material-correction-v3-20261023/footer-review.cjs`; `python3 docs/evidence/material-correction-v3-20261023/http-check.py`.

Browser plugin zwrócił pustą listę dostępnych przeglądarek. Użyto lokalnego Playwright/Chromium; Chrome i testy IPC wymagają w tym środowisku wykonania poza ograniczeniami sandboxa. Port i baza są lokalne, bez produkcji. Nowych testów fizycznych urządzeń, SCA lub pełnego audytu bezpieczeństwa nie wykonywano dla korekty samych materiałów CSS.

Zmiany pozostają niezacommitowane i niestage’owane. Bez pusha, pakowania wydania, deploymentu i nowych rasterów.
