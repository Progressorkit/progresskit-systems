# Gotowość lokalnego materiału — 02.11.2026

**10/10 klipów istnieje; 30/30 sekund zmontowane.** Finalny podgląd: `preview/brand-v1.mp4`, 2 301 029 B, SHA-256 `6c0121c4d352909a98fee802be9c8979ccb6892b16320f812505a8d6361703e5`.

PASS techniczny: każdy klip ma 90 klatek / 3.000 s, a preview 900 klatek / 30.000 s. Wszystkie są H.264, 1080×1920, 30 FPS, bez audio. ffprobe i pełne dekodowanie mają PASS. Aktualne hashe 10 klipów, preview oraz 14 wybranych źródeł zgadzają się z manifestem. To kontrola integralności, nie automatyczna akceptacja obrazu.

Ręczny zakres wizualny jest już potwierdzony dla 02/03/05/06/07/08/10: nazwa produktu, główna treść/akcja i kadrowanie na 360×640. Nie deklaruje się pełnej czytelności wszystkich drobnych etykiet UI. Vaeloria: obejrzano wszystkie 90 klatek rzeczywistego gameplayu; właściciel potwierdził prawa reklamowe 02.11.2026.

Root potwierdził ręcznie finalne telefoniczne kadry 01/04/09: **PRIMARY_LABELS_READABLE / SECONDARY_DETAIL_SMALL**, bez zaobserwowanych danych osobowych. Podpis 09 „Scheduler sceny · 5 PASS / 0 FAIL” jest czytelny i wynika z rzeczywistego zakresowego TAP. Drobne endpointy, kod i pozostały tekst TAP pozostają małe; nie nadano pełnego PASS czytelności drugorzędnych szczegółów. Klatki `frames/01-1.5-phone-final.png`, `frames/04-1.5-phone-final.png`, `frames/09-1.5-phone-final.png` oraz ich hashe odświeżono z finalnych eksportów. Cały montaż pozostaje do artystycznego odbioru właściciela.

Autentyczność 01/04/09 ma konkretne źródła w `live-captures.json`. 01: rzeczywisty renderer Three.js/WebGL2, lokalny katalog 19 pozycji. 04: GET dokumentacji rzeczywistego API Adivara, bez DB/kont, jawnie podpisany jako dokumentacja; bez zastępczego interfejsu. 09: oryginalne linie kodu i verbatim zakresowy TAP z konkretnymi hashami (`09-code-source.json`); prezentacja kodu nie jest interfejsem produktu.

Dokładne prostokąty są w `crop-review.json`. Pełne zrzuty Mail/Tax z adresami i rekordami nie są wynikami filmu. Wybrane fragmenty UI nie zostały przerobione. Nie dodano fikcyjnych elementów aplikacji. Dźwięk, głosy Piper i referencyjne filmy są wykluczone.

Bieżące dowody: `all-clips-validation.json`, `preview-validation.json`, `final-kit-integrity.json`, `readiness.json` i `../manifest.json`. Historyczny etap 7/10 pozostaje w `clips-validation.json` i `final-local-source-check.json`; pierwsza kompozycja Tax w `attempts/03-button-only-v1.mp4` nie jest aktualnym klipem 03.

OPEN: owner visual approval oraz końcowe browser QA strony. NOT RUN: zatwierdzenie publicznego wdrożenia. Produkcja bez zmian; bez commita, pushu, publikacji i deploya. Ten pakiet pozostaje prywatnym materiałem do odbioru.
