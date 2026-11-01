# ProgressKit Systems — living object / proof of direction

**Status: lokalny prototyp do oceny. `ownerVisualApproval: OPEN`.**

Podgląd: <http://127.0.0.1:8194/proof-of-direction/>. Istniejący podgląd strony pozostaje pod <http://127.0.0.1:8191/>.

[Galeria zrzutów i filmów](evidence/living-object-proof-20261101/gallery.html) · [film desktop, 40 s](evidence/living-object-proof-20261101/final/desktop-proof.mp4) · [film mobile, 26 s](evidence/living-object-proof-20261101/final/mobile-proof.mp4)

## Trzy elementy

1. **Hero:** zawieszony znak PK, cięta płyta z kierunkową fakturą aluminium, zagłębienie, gruba krawędź szkła, wewnętrzny cień i warstwa krajobrazu pod soczewką. Refleks podąża za kursorem, cień odchodzi w przeciwną stronę. Mgła i światło pod powierzchnią mają osobne, wolne przebiegi.
2. **Glikemia Premium:** kaseta z uchwytami montażowymi, drobnymi zamkami, śrubami i dwoma osłonami chowającymi się w obudowie. Przycisk uruchamia osłony, impuls po krawędzi i rzeczywisty ekran aplikacji pod szkłem. Ponowne użycie odwraca mechanizm. Na telefonie opis ujawnia się pod urządzeniem, bez przesuwania samej kasety.
3. **Przejście do ekosystemu:** wspólny krajobraz, konstrukcyjny grzbiet, zakrzywiony przewód, szklano-metalowy węzeł i dwa przyłącza produktów. Aktywacja uzbraja pojedynczy impuls widoczny po dojściu do przewodu. Połączenia są opisane jako planowane.

Nie rozszerzono tego języka na pozostałe projekty ani na główną stronę. Wszystkie nowe źródła są w [prototypes/living-object](../prototypes/living-object/). Publiczny staging nadal obejmuje 71 plików i nie zawiera prototypu.

## Materiał, ruch i fakty

- Szczotkowanie jest deterministycznym SVG z drobnymi włóknami; nakładają się na nie refleksy i kierunkowe partie światła. SVG ma 56 004 B, CSS 33 090 B, JS 7 605 B przed kompresją.
- Szkło używa obrzeża, kilku cieni wewnętrznych, przesuniętej warstwy krajobrazu i refleksu. To optyczne przybliżenie w CSS, bez fizycznej symulacji refrakcji.
- Jeden `pointermove` obsługuje materiał. Tłumiona reakcja wygasa najpóźniej po 650 ms od ostatniego ruchu; po uspokojeniu nie ma ciągłej pętli JavaScript. Obrót kasety jest ograniczony do 0,24°. Animacje idle działają tylko w dominującej widocznej scenie.
- Pauza, `prefers-reduced-motion`, opuszczenie strony i zmiana widoczności zatrzymują ruch. Mobile ma spokojniejszy wariant, bez śledzenia kursora, z mniejszą liczbą warstw animowanych i ograniczonym rozmyciem.
- Oryginalny znak, istniejący krajobraz, prawdziwy zrzut aplikacji i dane `catalog/projects.json` zostały zachowane. Nie dodano liczników użytkowników ani deklaracji gotowych integracji. Ekran w kasecie jest prezentacją zrzutu; działające odnośniki prowadzą do istniejącej strony produktu i pobrania APK.
- Bez JavaScript ekran, opis i linki pozostają dostępne. Klawiatura otwiera moduł, przechodzi do linków i zamyka go przez Escape z przywróceniem fokusu.

## Weryfikacja

| Sprawdzenie | Wynik |
| --- | --- |
| Chrome: układ, otwarcie dotykiem/myszą, orientacja | **34 PASS / 0 FAIL** |
| Chrome: światło, cień, wygaszanie pętli, osłony, pauza, ograniczony ruch | **25 PASS / 0 FAIL** |
| Chrome: klawiatura, wysoki kontrast, druk, brak JS | **13 PASS / 0 FAIL** |
| Testy serwera: allowlista, prywatne ścieżki, CSP, katalog i generowanie | **8 PASS / 0 FAIL** |
| `npm run check` | **PASS**, 14 projektów, 23 wygenerowane pliki |
| Generator prototypu, składnia JS, `git diff --check` | **PASS** |
| Istniejące źródła względem początku zadania | **189 / 189 identycznych SHA-256** |
| Błędy JS/CSP i żądania zewnętrzne podczas końcowego QA | **0** |
| Urządzenie fizyczne, Safari, Firefox, produkcja | **NOT RUN** |
| Ocena wizualna właściciela | **OPEN** |

Rozdzielczości: 1366×768, 1440×900, 1920×1080, 320×568, 390×844; oba warianty mobilne również po zmianie orientacji. To emulacja Chrome, nie dowód z telefonu. Nagrania pochodzą z rzeczywistego działania lokalnej przeglądarki: desktop 1440×1000 / 40,24 s, mobile 390×960 / 25,72 s, H.264, 25 kl./s. Nie wykonywano benchmarku wydajności na słabszym urządzeniu.

W pierwszym przeglądzie usunięto 404 favicony. Pierwszy test CSP miał błędne oczekiwanie `default-src 'self'`; zachowano istniejącą, bardziej restrykcyjną politykę `default-src 'none'` i dodano sprawdzenie zgodności z główną stroną. Dwa wstępne sprawdzenia zmiany preferencji ruchu odczytywały stan po 50 ms, zanim Chrome dostarczył zdarzenie; diagnostyka potwierdziła późniejsze dostarczenie. Końcowy test czeka na to zdarzenie maksymalnie 1 s, nadal wymagając zatrzymanego ruchu i zakończonego otwierania. Nie zmieniano tych zachowań produktu, aby ominąć test.

Wbudowana przeglądarka narzędzia była niedostępna. Kontrolę przeprowadzono w lokalnym Chrome uruchomionym przez Playwright z odrębnym profilem, bez korzystania z prywatnej sesji użytkownika.

## Dowody i zakres

- [Wyniki układu](evidence/living-object-proof-20261101/final/qa-layout.json), [ruchu](evidence/living-object-proof-20261101/final/qa-motion.json), [dostępności](evidence/living-object-proof-20261101/final/qa-accessibility.json).
- [Testy serwera](evidence/living-object-proof-20261101/python-tests.log), [kontrola źródeł](evidence/living-object-proof-20261101/source-scope.json), [metadane filmów](evidence/living-object-proof-20261101/final/video-metadata.json).
- [Manifest końcowych artefaktów](evidence/living-object-proof-20261101/manifest.json). Foldery `phase1` i `phase2` są wcześniejszymi przeglądami; galeria wskazuje końcowe materiały z `final`.
- Repozytorium miało wcześniejsze niezatwierdzone zmiany. Bieżący etap dodaje jedynie prototyp i jego dokumentację/dowody. Nie wykonano commitu, pushu ani wdrożenia. HEAD pozostał `64e63f66231f494624feabd6ce2f38cc283d044a`.

Następny etap to ocena tych trzech elementów przez właściciela. Rozszerzenie na resztę strony nastąpi dopiero po jego visual approval, zgodnie z zakresem zlecenia.
