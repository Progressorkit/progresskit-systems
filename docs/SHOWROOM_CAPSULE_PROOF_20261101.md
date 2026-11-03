# ProgressKit — kapsuła showroomu

**Lokalny proof do oceny. `ownerVisualApproval: OPEN`. Bez commitu, pushu i wdrożenia.**

[Podgląd showroomu](http://127.0.0.1:8191/#showroom-track) · [Galeria i dwa filmy](evidence/showroom-capsule-20261101/gallery.html)

## Efekt

W centrum lewituje warstwowa kapsuła: metalowy korpus, komora energii, wypukła tafla, oryginalny znak PK na osobnym poziomie, przednia krawędź szkła, dwa przestrzenne żebra i metalowe zaciski. Światło i warstwy reagują na kursor z tłumioną bezwładnością. Cień przesuwa się w przeciwną stronę; pod obiektem pozostaje delikatne odbicie.

Stan idle pokazuje tylko ślady soczewek i połączeń. Hover, fokus klawiatury lub kliknięcie/tap rdzenia ujawniają istniejące projekty w kolejnych warstwach. Wskazanie projektu rozświetla przypisane połączenie, uruchamia impuls i lekko przygasza pozostałe. Po aktywacji kolekcja pozostaje otwarta, także podczas przejścia z rdzenia do projektu. Escape po zamknięciu szczegółów usypia ekspozycję i przywraca fokus rdzenia.

Zamknięte projekty mają organiczny kształt szklanych soczewek, grubość obrzeża, wewnętrzne odbicia i światło zależne od kursora. Otwarty projekt zachowuje dotychczasową treść i przebieg czytania. Wszystkie 14 projektów pozostaje dostępnych przez istniejącą nawigację i filtry; na desktopie widać do sześciu obiektów jednocześnie, na telefonie jeden aktywny projekt.

„4D” jest tu kierunkiem wizualnym: wielowarstwowe 3D CSS, parallax, reakcja światła i cienia. Refrakcja jest optycznym przybliżeniem za pomocą przesuniętej warstwy krajobrazu i refleksów, bez ray tracingu lub WebGL.

## Ruch i dostępność

- Jeden nowy odbiornik `pointermove` dla całego showroomu, bez osobnych pętli na warstwę. Obliczenia zatrzymują się po wygaszeniu bezwładności, najpóźniej 900 ms od ostatniego ruchu kursora.
- Pauza, ograniczony ruch, wyjście poza widok i otwarty projekt zatrzymują efekty kapsuły. Udostępnienie treści nie zależy od animacji.
- W uśpieniu projekty są `inert`, poza kolejnością Tab i oznaczone jako ukryte dla technologii asystujących. Po obudzeniu steruje nimi istniejący kontroler. Przycisk rdzenia ma `aria-expanded` i `aria-controls`.
- Na telefonie nie ma śledzenia kursora, tylnego żebra, ruchu całej kapsuły, animowanego refleksu ani rozmycia soczewek. Zostaje spokojne światło komory oraz aktywacja dotykiem.
- Bez JavaScript pozostają oryginalne odnośniki i treści projektów; nie pojawia się niedziałający przycisk rdzenia.

## Zakres kodu

- Nowe `assets/showroom-capsule.css` i `assets/showroom-capsule.js`: wyłącznie prezentacja showroomu, stan aktywacji, światło i połączenia.
- `scripts/showroom_markup.py`: centralny obiekt i sześć połączeń; istniejące artykuły projektów zachowane.
- `assets/project-showroom.js`: bramka uśpienia/aktywacji, dostępność projektów i przekazywanie bieżącej geometrii. Selekcja, filtrowanie, otwieranie i adresy pozostają w dotychczasowym kontrolerze.
- `scripts/build-site.py`, wygenerowany `index.html`: podłączenie nowych plików tylko na stronie głównej.
- `scripts/stage-public.py`: jawne dodanie dwóch zasobów do allowlisty; lokalny staging obejmuje 73 pliki.
- `tests/project-showroom.test.cjs`: trzy dodatkowe scenariusze aktywacji. Nie zmieniono testów niezwiązanych z showroomem.

Zachowano wcześniejsze niezatwierdzone zmiany. Porównanie z początkiem tego zadania: spośród 202 istniejących źródeł zmieniło się sześć wymienionych plików; 196 pozostało identycznych. Wszystkie 14 artykułów projektu w HTML jest identyczne bajtowo. Strona poza showroomem jest identyczna po pominięciu odnośników do dwóch nowych zasobów. Katalog, analytics, pozostałe sekcje i wcześniejszy prototyp living-object nie zostały zmienione.

## Weryfikacja

| Sprawdzenie | Wynik |
| --- | --- |
| Testy kontrolera showroomu | **39 PASS / 0 FAIL** |
| Chrome: układ, aktywacja, dotyk, relacje | **45 PASS / 0 FAIL** |
| Chrome: klawiatura, światło, wygaszanie RAF, pauza, dostępność, link bezpośredni | **17 PASS / 0 FAIL** |
| Błędy JavaScript/CSP w końcowym QA | **0** |
| Generator i `npm run check` | **PASS**, 14 projektów / 23 pliki |
| Składnia nowego JS, publiczny staging, `git diff --check` | **PASS** |
| Fizyczny telefon, Safari, Firefox, benchmark FPS | **NOT RUN** |
| Owner visual approval | **OPEN** |

Chrome: 1440×1050, 1920×1080, 1366×768, 390×844, 320×568, 700×900. Mobile jest emulowany. Przeglądarka w aplikacji była niedostępna; użyto lokalnego Chrome z osobnym profilem testowym.

W pierwszej kontroli trybu wysokiego kontrastu wykryto ukryty podpis aktywnego przycisku; poprawiono specyficzność reguły CSS. Końcowe wyniki obejmują poprawkę. Testów spoza showroomu nie modyfikowano ani nie włączano do podanej liczby.

## Materiały do oceny

- [Idle](evidence/showroom-capsule-20261101/final/1440x1050-idle.png)
- [Po aktywacji rdzenia](evidence/showroom-capsule-20261101/final/1440x1050-activated.png)
- [Hover projektu](evidence/showroom-capsule-20261101/final/1440x1050-project-hover.png)
- [Film desktop](evidence/showroom-capsule-20261101/final/desktop-proof.mp4) · [film mobile](evidence/showroom-capsule-20261101/final/mobile-proof.mp4)
- [Wyniki układu](evidence/showroom-capsule-20261101/final/qa-layout.json) · [interakcje](evidence/showroom-capsule-20261101/final/qa-interaction.json) · [kontrola zakresu](evidence/showroom-capsule-20261101/scope-check.json)

Następny krok zależy od oceny wizualnej właściciela. Ten etap nie rozszerza języka kapsuły na inne sekcje.
