# Odbiór Visual Correction V3 — 2026-10-23

Podgląd lokalny: **http://127.0.0.1:8110/**. Baza Git: `78319345bcf6822d304b5de758aae0297a4ca812`. [Raport zmian i plików](../../VISUAL_CORRECTION_V3_20261023.md).

## Końcowe wyniki

| Kontrola | Wynik | Dowód |
| --- | --- | --- |
| Generator, allowlista i składnia JS | PASS: 14 projektów / 23 generowane pliki | [check.log](check.log) |
| Python, w tym istniejące testy backendu i preview | 115 PASS / 0 FAIL / 0 SKIP | [python-tests.log](python-tests.log) |
| JavaScript | 69 PASS / 0 FAIL / 0 SKIP | [node-tests.log](node-tests.log) |
| Pełny rzeczywisty Chromium | 93 PASS / 0 FAIL, błędy JS i zasobów: 0 | [browser/report.json](browser/report.json), [run.log](browser/run.log) |
| Niezależny probe mapy | 75 PASS / 0 FAIL, także 1000 px | [map-probe/report.json](map-probe/report.json) |
| Publiczne pliki i APK/licznik w osobnej bazie | 69 PASS / 0 FAIL | [http-check.json](http-check.json) |
| Linki wewnętrzne i fragmenty | 856 PASS / 0 FAIL | [internal-links.json](internal-links.json) |
| Zachowanie zatwierdzonych treści | PASS: brak nowego copy, usunięte tylko trzy dekoracyjne ↔ | [copy-preservation.json](copy-preservation.json) |
| Wizualna kontrola wymaganych kadrów | PASS lokalny | [visual-review.json](visual-review.json) |
| SAST | 49 plików / 6 reguł / 0 findings / 0 errors | [security/REVIEW.md](security/REVIEW.md) |
| SCA lokalnego środowiska | 18 pakietów / 0 advisories, ważna DB | [security/offline-sca-summary.json](security/offline-sca-summary.json) |
| Sekrety | raw FAIL 4 history + 3 worktree; reviewed 7/7 benign, 0 nierozpatrzonych | [security/REVIEW.md](security/REVIEW.md) |

Pełny GUI obejmuje 1920×1080, 1440×900, 390×844 i 320×568; wszystkie 14 projektów rozwinięto i zamknięto na każdej szerokości. Sprawdzono sześć wyborów mapy, statusy, naturalny scroll, fokus, Enter/Spację, strzałki/Home/End, Escape, odświeżanie, menu dotykowe, fallback bez JS, lokalny brief, negatywny tekst wyszukiwania, pauzę, reduced motion oraz offscreen. 32 wejściowe pliki UI pozostały identyczne przed i po całym przebiegu.

## Sześć wymaganych screenshotów

- [Hero desktop](browser/1440-first.png).
- [Cały ekosystem desktop](browser/1440-ecosystem-map.png).
- [Rozwinięty Tax](browser/1440-progresskit-tax-expanded.png).
- [Rozwinięty Translator](browser/1440-progresskit-translator-expanded.png).
- [Hero mobile](browser/390-first.png).
- [Ekosystem mobile](browser/390-ecosystem-map.png).

Końcowy katalog `browser/` zawiera **68 PNG i 2 MP4**: [mechanizm desktop](browser/desktop-mechanism.mp4), [interakcje mobile](browser/mobile-interaction.mp4). Kadry są pojedynczymi viewportami, po naturalnym przewinięciu i 800 ms na zakończenie przejść. Nie ukrywano sticky nawigacji, nie zmieniano DOM ani treści do screenshotów. Wszystkie sześć wymaganych końcowych obrazów otwarto i oceniono wizualnie; dodatkowo sprawdzono 320 px oraz wybór Translatora na mobile.

## Ruch i pamięć

Rzeczywisty pomiar potwierdził animowane światło hero i zmianę światła po ruchu wskaźnika. Pauza zatrzymuje także wskaźnik. Mapa animuje najwyżej dwie planowane ścieżki. Przy kontakcie nie pozostają uruchomione nieskończone animacje; powrót przywraca ruch. [Weryfikacja gate hero](lifecycle-review/progresskit-v3-hero-gate-20261023.json).

Końcowy pełny pomiar mapy: cold 1979 węzłów / 172 listenerów, po pierwszych sześciu rolach i dwóch układach 2025/172; po następnych 30 wyborach i dwóch zmianach układu **2025/172**, dokumentów 1. Asercja `<=` pozostała ścisła. Niezależna izolacja potwierdziła, że pierwszy koszt wynika z leniwego tworzenia natywnych `Attr` przez odczyty atrybutów w Chromium/Playwright; live DOM nie rośnie. Trzy kolejne niezależne bloki pozostały identyczne. [Metoda, raw odczyty i hashe heap snapshotów](lifecycle-review/summary.json); heap snapshoty pozostawiono w `/tmp`, nie stanowią plików publicznej paczki.

Osobny pomiar rozwijania projektów po jednym warmup i dziesięciu cyklach: 2007→2007 węzłów, 159→159 listenerów, 1 dokument. Próbka CDP nie jest pomiarem FPS ani wydajności fizycznego telefonu.

## Historia wykrytych problemów

- `browser-first-moving-faces/`: przerwany pierwszy przebieg ujawnił trudne trafienie w unoszoną płytę. Animację przeniesiono na dekoracyjne mocowania.
- `browser-before-lifecycle-fix/`: zachowany pełny wynik 91 PASS / 2 FAIL. Naprawiono hero działające pod nieprzezroczystymi sekcjami. Koszt pierwszego użycia atrybutów oddzielono od dalszego wzrostu, potwierdzając przyczynę heap snapshotem i niezależnymi seriami.
- `map-probe/report-first-raw-fail.json`: wcześniejszy overflow hero przy 1000 px naprawiono; końcowy probe czeka na rzeczywistą zmianę media zamiast arbitralnych 90 ms.
- `http-check-first-header-case.json`: pierwszy skrypt tracił niewrażliwość nazw nagłówków na wielkość liter przez konwersję do `dict`. Poprawiono odczyt nagłówków, bez zmiany CSP lub asercji bezpieczeństwa.
- `security/pre-hitbox-fix-scans/` i `security/pre-sticky-visibility-fix/`: skany wcześniejszych wersji zachowano. Finalne hashe i skany źródeł odnoszą się do poprawionej wersji.

## Odtworzenie i zakres

Z repo: `PK_PREVIEW_PORT=8110 PK_PRODUCT_DB=/tmp/progresskit-v3-20261023/product.db PK_PYTHON=/tmp/progresskit-final-20261022/venv/bin/python scripts/preview.sh`. Serwer wiąże wyłącznie `127.0.0.1`. Następnie `npm run check`, `node --test --experimental-test-isolation=none --test-reporter=tap tests/*.test.cjs`, `/tmp/progresskit-final-20261022/venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`, `node scripts/qa-final-website.cjs http://127.0.0.1:8110/ /tmp/progresskit-v3-review`.

W tym środowisku Chrome i testy IPC wymagają wykonania poza ograniczeniem sandboxa; browser plugin zwrócił pustą listę przeglądarek, więc użyto lokalnego Playwright/Chromium 155.0.8059.39. Brak nowych zależności, uploadów źródeł, dostępu produkcyjnego, pushu i deploymentu. SCA dotyczy lokalnego środowiska Python; nie przypisano mu skanu APK lub produkcyjnego obrazu.

`publication-gate.log` zachowuje oczekiwany status **BLOCKED: owner visual approval OPEN**, odrębny od lokalnego PASS kandydata. Właścicielska akceptacja wyglądu i fizyczne urządzenia pozostają niepotwierdzone. Manifest `delivery-manifest.json` wiąże rozmiarem i SHA-256 dokładny zakres lokalnego commita, z wyłączeniem samego manifestu. Paczka w `.local/visual-correction-v3-20261023-release/` po commicie zawiera jego SHA i 65 publicznych plików, bez dowodów, katalogu `.git`, surowego backendu i APK.
