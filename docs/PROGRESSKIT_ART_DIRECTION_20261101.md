# ProgressKit Systems — art direction, 1 listopada 2026

Stan: lokalny kandydat do odbioru wizualnego. **Bez commita, pushu i wdrożenia.**

[Galeria screenshotów i nagrań](evidence/art-direction-20261101/index.html) · [zbiorcze wyniki QA](evidence/art-direction-20261101/qa-summary.json) · [manifest 90 plików z SHA-256](evidence/art-direction-20261101/final-artifacts-manifest.json) · [audyt zachowania treści i danych](evidence/art-direction-20261101/content-scope-audit.json)

## Zmiana prezentacji

Strona ma jedną ciemną przestrzeń zamiast kolejnych jasnych powierzchni: grafit, czarne szkło, szczotkowane metaliczne krawędzie i ograniczone światło. Chłodny niebieski opisuje technologię, czerwień pozostaje akcentem energii i głównej akcji. Materiał tworzą gradienty, delikatna faktura, refleksy, cienie i lekkie pseudo-elementy. Wykorzystano istniejące robocze rekonstrukcje natury: pliki źródłowe pozostały niezmienione, a CSS wygasza panoramę i łączy ją z tłem. Materiały te nie są odzyskanymi oryginałami.

1. **Atmosfera i hero:** monumentalny napis, zachowany komunikat, oryginalny znak PK z chłodną powierzchnią i czerwonym światłem za nim; głęboka przestrzeń i stonowana natura.
2. **Projekty:** zachowany kontroler showroomu i 14 tożsamości z katalogu. Zmieniono materiał modułów i rozwiniętych paneli na ciemne szkło z metalową obudową. Pięć projektów korzysta z przejrzanych galerii; dziewięć pozostałych ma grawerowaną identyfikację opartą na rzeczywistej nazwie, kategorii i technologiach. Nie wygenerowano fikcyjnych ekranów aplikacji.
3. **Usługi:** dwa duże obszary zamiast ośmiu osobnych ramek: „Dla Ciebie / małego biznesu” i „Dla firmy / systemu”. Wszystkie osiem wcześniejszych kompetencji i linki technologii pozostały. Pierwszy obszar jawnie wskazuje „Strony · sklepy · aplikacje”.
4. **Ekosystem:** zróżnicowane węzły na różnych poziomach, subtelne unoszenie i przepływ połączeń. Hover i focus podświetlają bezpośrednie relacje, a pozostałe węzły lekko przygasają. Treść nadal odróżnia produkty od planowanych połączeń.
5. **Proces:** nowa ciągła linia Pomysł → Projekt → Budowa → Testy → Security → Wdrożenie. Scroll aktywuje kolejne stanowiska; nie przechwytuje przewijania i nie przypina strony.
6. **O mnie:** większa typografia, ciemna przestrzeń, oryginalny znak jako dyskretny relief i otwarta kompozycja współpracy. Zachowano wcześniejsze akapity.
7. **Kontakt i footer:** jedna szklano-metalowa kompozycja kontaktu i briefu, czytelne pola i focus, publiczny adres `pawel@progresskit.pl`, akcja **WYŚLIJ PROJEKT**, niemal czarny las/góry i delikatna mgła. Brief nadal działa lokalnie; eksport tworzy plik, druk otwiera funkcję przeglądarki, a akcja e-mail otwiera program pocztowy. Nie dodano automatycznej wysyłki formularza.

## Co reaguje na użytkownika

| Tryb | Zachowanie |
| --- | --- |
| Idle | Powolna mgła i światło hero, delikatny oddech aktywnego modułu, refleksy usług, unoszenie węzłów i ograniczone impulsy ekosystemu. Efekty poza widokiem i w ukrytej karcie są zatrzymywane. |
| Hover / focus | Refleks pod kursorem, mały tilt powierzchni do około ±1,2°, zmiana światła i wyróżnienie relacji ekosystemu. Dotyk nie uruchamia desktopowego tilt. |
| Scroll | Stanowiska linii procesu aktywują się w kolejności, a widoczne rozdziały otrzymują światło. Treść kontaktu i briefu pozostaje stale czytelna zamiast zależeć od fade-in. |
| Kontrola ruchu | Istniejące przyciski pauzy sterują wspólnym ruchem; `prefers-reduced-motion` daje spokojny, statyczny widok i pokazuje cały proces. |

Na telefonie kompozycja jest osobna: mniejsze czerwone halo i spokojniejsze CTA, ograniczone efekty, brak tilt i blur usług, pojedyncza kolumna, większa czytelność modułu i pionowa linia procesu. Kompaktowy ekosystem ma najwyżej jeden aktywny przepływ. Dodano warianty forced colors i druku.

## Zachowanie danych i funkcji

[Audyt źródłowy: 20 PASS / 0 FAIL](evidence/art-direction-20261101/content-scope-audit.json) potwierdza zachowanie katalogu, stanu marki, oryginalnych assetów PK, trackera i kontrolera showroomu bajt w bajt względem `64e63f6`. Wszystkie wcześniejsze teksty i linki sekcji o mnie/usług/kontaktu pozostały. Jedyną usuniętą etykietą z homepage jest zatwierdzona do zastąpienia akcja „Napisz e-mail ↗”. Surowe galerie Mail pozostają poza publiczną listą plików.

Nowe widoczne etykiety dotyczą wymaganych obszarów usług, procesu i jego nawigacji, zakresu usług oraz istniejących danych produktów. Pełny katalog, podstrony, wyszukiwanie, filtry, gesty, obsługa klawiatury, lokalny brief i analytics są zachowane.

## Zakres diffu

**30 zmodyfikowanych plików śledzonych:** 3 skrypty JavaScript, 3 pliki generatora/stagingu, 2 szablony, 2 pliki testów i 20 wygenerowanych dokumentów HTML. Dodatkowo powstały **3 nowe pliki źródłowe** (dwa CSS i szablon procesu) oraz ten raport i materiał dowodowy.

- Nowe warstwy prezentacji: `assets/world-atmosphere.css`, `assets/world-sections.css` oraz `templates/production-line.html`.
- Układ i generowanie: `scripts/build-site.py`, `scripts/showroom_markup.py`, `templates/about-contact.html`, `templates/glikemia-distribution.html` i odtworzone przez generator dokumenty HTML.
- Ruch: `assets/hero-space.js`, `assets/interface-life.js`, `assets/ecosystem-system.js`; testy regresji hero i wspólnego kontrolera ruchu.
- Publikowany zakres: `scripts/stage-public.py` dopuszcza dwie nowe warstwy CSS. Katalog, logo, tracker i kontroler showroomu nie są przepisane.
- Raporty, screenshoty i filmy pozostają materiałem odbioru w `docs/evidence/art-direction-20261101/`, poza publicznym stagingiem witryny.

## Weryfikacja

| Kontrola | Wynik | Dowód |
| --- | --- | --- |
| Python, pełny unittest | **118 PASS / 0 FAIL / 0 SKIP** | [podsumowanie](evidence/art-direction-20261101/tests/python-unittest-summary.json), [log](evidence/art-direction-20261101/tests/python-unittest.log) |
| Node/CJS, wszystkie przypadki | **88 PASS / 0 FAIL / 0 SKIP** | [podsumowanie](evidence/art-direction-20261101/tests/node-summary.json) |
| Build / check | **PASS** — 14 wpisów katalogu, 23 pliki | [npm check](evidence/art-direction-20261101/tests/npm-check.log) |
| Linki i fragmenty | **913 PASS / 0 FAIL** | [raport](evidence/art-direction-20261101/internal-links.json) |
| Staging | **PASS** — 70 publicznych plików | świeży katalog `/tmp/progresskit-art-direction-public-20261101-reviewed` |
| Finalny przegląd Chrome | **157 PASS / 0 FAIL / 0 BLOCKED** | [raport i pochodzenie wyników](evidence/art-direction-20261101/final-fixed/report.json) |
| Czytelność zwiniętych modułów mobile | **28 PASS / 0 FAIL** | [14 projektów × 2 szerokości](evidence/art-direction-20261101/final-card-readability/report.json) |
| Trafienie w CTA rozwiniętych modułów i pauza | **30 PASS / 0 FAIL** | [rzeczywiste hit-testy CTA](evidence/art-direction-20261101/final-fixed/expanded-actions-review.json) |
| Relacje ekosystemu | **6 PASS / 0 FAIL** | [hover, focus, dotyk](evidence/art-direction-20261101/final-ecosystem/ecosystem-review.json) |
| Szerokość dokumentu w macierzy | **5 PASS / 0 FAIL** | [preflight pięciu viewportów](evidence/art-direction-20261101/final-fixed/viewport-preflight.json) |
| Niezmienność źródeł podczas końcowego QA | **188 plików / 0 zmian** | [zamrożenie źródeł](evidence/art-direction-20261101/source-freeze-verification.json) |
| Publikacja | **BLOCKED**, kod 1 — `ownerVisualApproval: OPEN` | `scripts/check-publication.py`; stan nie został obchodzony |

Macierz końcowego przeglądu: desktop **1366×768, 1440×900, 1920×1080**, mobile **320×568, 390×844**. Zakres obejmuje pierwszy ekran, zwinięte/rozwinięte projekty, usługi, ekosystem, proces, o mnie, kontakt/brief i footer; dodatkowo orientację, klawiaturę, dotyk, reduced motion, forced colors, druk i działanie bez JavaScript. To lokalna emulacja Chrome, bez deklaracji testu fizycznego telefonu ani produkcji. Galeria zawiera **76 końcowych screenshotów (63 z głównej macierzy i 13 uzupełnień) oraz dwa świeże nagrania** z rzeczywistych plików `final-fixed/`. Działa również offline po otwarciu `index.html` jako pliku — ma osadzony manifest, bez zależności od uruchomionego preview.

Raport główny jawnie łączy **75 poprawnych sprawdzeń desktopu** z poprzedniego przebiegu i **82 świeże sprawdzenia mobile/zachowania po ostatniej poprawce**. Ostatnia zmiana dotyczyła wyłącznie dwóch selektorów kart dla szerokości do 700/360 px; nie obejmuje trzech sprawdzonych desktopów. Pochodzenie i zachowane nieudane próby są zapisane w `provenance` raportu. Dodatkowe kontrole 28/30/6/5 pozostają osobnymi zestawami, bez sumowania ich jako nowych przypadków głównego przebiegu.

Oba filmy powstały po końcowej poprawce mobile. [Weryfikacja kodeka i klatek](evidence/art-direction-20261101/final-fixed/video-verification.json) oraz [niezależna kontrola rozmiarów/SHA-256](evidence/art-direction-20261101/final-fixed/video-independent-verification.json) potwierdzają:

| Film | Rozdzielczość | Czas | Klatki | Plik |
| --- | --- | --- | --- | --- |
| Desktop | 1440×900 | 17,08 s | 427 | [H.264 / yuv420p, 1 183 924 B](evidence/art-direction-20261101/final-fixed/desktop-interaction.mp4) |
| Mobile | 390×844 | 14,68 s | 367 | [H.264 / yuv420p, 1 058 053 B](evidence/art-direction-20261101/final-fixed/mobile-interaction.mp4) |

Samą galerię sprawdzono niezależnie w Chrome z adresem `file://`: **76 obrazów, dwa działające natywne filmy**, poprawne filtry i ich reset, brak błędów JavaScript oraz **0 żądań zewnętrznych**. To kontrola artefaktu odbioru, odrębna od macierzy witryny.

## Problemy wykryte i poprawione w trakcie

- Pierwsze uruchomienie Chrome ograniczały uprawnienia sandboxa. Ponowiono dozwolone uruchomienie lokalnej przeglądarki.
- Nowy stylesheet początkowo zwracał 404, ponieważ działający preview miał starą listę publicznych tras. Restart własnego preview załadował aktualną listę.
- Stary reveal zostawiał pusty kontakt/brief. Treść tych sekcji jest teraz stale widoczna; ruch dotyczy materiału i światła.
- Wstępny przegląd wykrył rzeczywisty poziomy overflow desktopu. Przyczyną była dekoracyjna podłoga ekosystemu z nałożoną perspektywą. Zastąpiono ją ograniczoną projekcją 2D; nie maskowano problemu globalnym ukrywaniem overflow. Końcowy preflight potwierdził zgodność szerokości dokumentu z viewportem we wszystkich pięciu rozmiarach. [Zachowany wstępny raport](evidence/art-direction-20261101/final-preliminary-overflow/preliminary-interrupted.json).

- Dodatkowy rzeczywisty problem mobile: reguły położenia aktywnego modułu obejmowały również rozwinięty panel i powodowały nakładanie się obszaru akcji. Ograniczono te reguły do `.is-active:not(.is-slice-expanded)`, przywracając rozwinięty moduł do normalnego przepływu. Końcowe rzeczywiste hit-testy CTA dla wszystkich 14 projektów na 320/390 px oraz próby otwarcia przy pauzie dały **30 PASS / 0 FAIL**. Ponowiono także orientację i oba nagrania po poprawce.

Osobno poprawiono synchronizację narzędzi QA: oczekiwanie na obserwowalny stan procesu zamiast stałego opóźnienia oraz przewijanie i rzeczywiste współrzędne kliknięcia pływającego węzła zamiast oczekiwania na jego nieruchomość. Zachowano rzeczywisty ruch strony. Do kodowania filmów wskazano dostępny systemowy FFmpeg. Są to korekty narzędzi dowodowych, a nie dodatkowe zmiany funkcji witryny.

Wstępne, przerwane i etapowe materiały zachowują swój zakres; nie są przedstawiane jako finalny PASS.

## Odbiór właściciela i Git

Do akceptacji pozostaje cała nowa kompozycja: proporcje hero/projektów, materiał modułów, ilość światła, usługi, przestrzeń ekosystemu, linia procesu, kontakt i czarny krajobraz na desktopie oraz telefonie. Testy techniczne nie zamykają tej bramki.

`ownerVisualApproval` pozostaje **OPEN**. `HEAD` pozostaje `64e63f66231f494624feabd6ce2f38cc283d044a`; zmiany są lokalne i nie zostały automatycznie dodane do indeksu, skomitowane ani wypchnięte. Pełny diff i wynik `git diff --stat` pozostają dostępne w checkout.
