# Mechanical Showroom V5 — dowody lokalnego odbioru

[Raport sprintu](../../MECHANICAL_SHOWROOM_V5_20261023.md) · [Podgląd lokalny](http://127.0.0.1:8130/index.html)

Końcowy odbiór Chrome: **94 PASS / 0 FAIL**, 77 screenshotów, dwa nagrania. [Zbiorcza weryfikacja](final-verification.json) i [sumy plików](manifest.json). Fizyczny Android: **BLOCKED**.

## Końcowe screenshoty

Wszystkie obrazy pochodzą z rzeczywistego Chrome. Telefon oznacza emulowany viewport i wejście dotykowe; nie wykonano testu na fizycznym Androidzie.

| Widok | Plik |
|---|---|
| HERO 1440 × 900 | [1440-first.png](browser/1440-first.png) |
| Mechanizm podczas obrotu | [1440-rotation.png](browser/1440-rotation.png) |
| Rozwinięta Glikemia Premium | [1440-glikemia-premium-expanded.png](browser/1440-glikemia-premium-expanded.png) |
| Rozwinięty Tax | [1440-progresskit-tax-expanded.png](browser/1440-progresskit-tax-expanded.png) |
| Rozwinięty Translator | [1440-progresskit-translator-expanded.png](browser/1440-progresskit-translator-expanded.png) |
| Mapa ekosystemu — sześć ról | [1440-ecosystem-map.png](browser/1440-ecosystem-map.png) |
| Pełna stopka z rekonstrukcją lasu i gór | [1440-footer-full.png](browser/1440-footer-full.png) |
| HERO 390 × 844 | [390-first.png](browser/390-first.png) |
| Mobilna Glikemia — początek | [390-glikemia-premium-expanded.png](browser/390-glikemia-premium-expanded.png) |
| Mobilna Glikemia — CTA po przewinięciu | [390-glikemia-premium-actions-after-scroll.png](browser/390-glikemia-premium-actions-after-scroll.png) |
| Mobilny ekosystem | [390-ecosystem-map.png](browser/390-ecosystem-map.png) |
| Mobilna pełna stopka | [390-footer-full.png](browser/390-footer-full.png) |
| Kontrola 700 px | [700-breakpoint.png](700-breakpoint.png) |
| Kontrola 1101 px | [1101-breakpoint.png](1101-breakpoint.png) |

## Nagrania

- [Desktop: obrót, wybór, wysunięcie, przewijanie i zamknięcie](browser/desktop-mechanism.mp4).
- [Mobile: nawigacja i rozwinięty moduł](browser/mobile-interaction.mp4).

Nagrania są z rzeczywistej sesji Chrome. Zapis CDP zbiera klatki i koduje je jako 12 fps; czas odtwarzania nie jest pomiarem płynności ani rzeczywistego FPS urządzenia.

## Testy i weryfikacja

- [Raport przeglądarki](browser/report.json), [log](browser.log), [polecenia i wyniki](../../MECHANICAL_SHOWROOM_V5_20261023.md).
- [Dodatkowe wejście dotykowe, klawiatura, filtr i wyszukiwanie](input-review.json).
- [Osiem dodatkowych szerokości, statusy i sterowanie](breakpoint-review.json).
- [Generator i składnia JS](build-check.log), [JavaScript](node-tests.log), [Python](python-tests.log).
- [HTTP, SHA-256 APK i lokalny licznik](http-check.json), [linki wewnętrzne](internal-links.json).
- [Porównanie ze stanem sprzed sprintu](scope-verification.json), [diff wyłącznie tego sprintu](source-review.diff).
- [Alokacje DOM przed/po](allocation-diagnostic.json), [pierwszy pomiar zimny](allocation-diagnostic-cold.json).
- [Sprzęt i ograniczenia testu Androida](hardware.json).

## Zachowane wcześniejsze obserwacje tego sprintu

`baseline.json`, `cascade-before.json` i `before-*-hero.png` opisują zastany układ. `browser-initial-bounding-box.log` zawiera przerwany test używający dawnej prostokątnej obwiedni; końcowa kontrola kolizji sprawdza sześciokątne powierzchnie metodą osi rozdzielających. Nie dopuszczono nakładania rzeczywistych powierzchni.

`browser-before-responsive-fix/` to pełny, spójny odbiór 94 PASS / 0 FAIL przed korektą dodatkowych breakpointów. Zrzuty `700-breakpoint-before-responsive-fix.png` i `1101-breakpoint-before-responsive-fix.png` pokazują znalezione wizualnie problemy. Rozszerzono test o faktyczną wysokość treści statusu i położenie sterowania. Końcowym zestawem jest katalog **`browser/`** oraz aktualny `breakpoint-review.json`.

Historyczny wynik V3 (+1 węzeł CDP) pozostaje w swoim pierwotnym katalogu. Niniejszy raport nie zmienia go na PASS; opis ograniczeń i nowy pomiar 100 cykli znajdują się w raporcie sprintu.

Uwaga dotycząca archiwalnego raportu linków V3: [zapis omyłkowego nadpisania jednego artefaktu](historical-report-note.json). Końcowy raport linków V5 znajduje się w tym katalogu.
