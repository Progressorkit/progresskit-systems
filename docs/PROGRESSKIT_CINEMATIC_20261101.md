# ProgressKit Systems — cinematic cyber-nature

Lokalna korekta po uwadze właściciela, że poprzedni pass był zbyt płaski i dashboardowy. **Bez commita, pushu i wdrożenia. `ownerVisualApproval: OPEN`.**

[Porównanie przed / po, galeria i filmy](evidence/cinematic-cyber-nature-20261101/index.html) · [diff wyłącznie tej korekty](evidence/cinematic-cyber-nature-20261101/current-pass.patch) · [wyniki przeglądarki](evidence/cinematic-cyber-nature-20261101/report.json) · [manifest SHA-256](evidence/cinematic-cyber-nature-20261101/manifest.json)

## Kierunek i wykonane zmiany

Większy kontrast między oświetlonym przedmiotem a otoczeniem, wyraźny pierwszy plan i dalsze plany krajobrazu, więcej otwartej przestrzeni. Ciemne szkło i metal pozostały, ale zmniejszono liczbę pełnych obudów, ramek i jednolicie niebieskich powierzchni.

- **Hero:** nowa skalna dolina z lasem, mgłą i kierunkowym światłem. Oryginalny znak PK jest osobną warstwą z głębokim cieniem i ograniczoną czerwoną poświatą za nim. Usunięto dekoracyjną obręcz. Zmieniono proporcje i światło typografii, zachowując dokładne słowa i wszystkie akcje.
- **Projekty:** ciemniejszy mechanizm, przygaszone fragmenty koła, mocniejszy cień i selektywne odbicia na metalu. Kategorie mają lżejszą formę zakładek. Rozwinięty produkt nie ma już osobnej obramowanej karty wewnątrz obudowy, ramki wokół screenshotu ani pełnych pudełek technologii. Oryginalna geometria karuzeli, wszystkie 14 projektów, ich treści, statusy i linki pozostały.
- **Usługi:** otwarte, przesunięte względem siebie obszary z dużą typografią i numeracją. Tło krajobrazu i ukośne półprzezroczyste płaszczyzny nadają głębię; dekoracje korzystają z istniejących elementów HTML.
- **Ekosystem:** zredukowano prostokątne obudowy węzłów, usunięto siatkę podłogi i masywne krawędzie. Pozostały punkty światła, relacje oraz przygaszanie niepowiązanych elementów po hover/focus. Informacja, że integracje są planem, pozostaje bez zmian.
- **Proces, o mnie, kontakt:** szersze marginesy na desktopie, ciemniejsze przejścia między sekcjami, czytelniejszy relief PK. Brief ma wygaszające się szkło bez pełnej ramy; pola i focus pozostają czytelne. Adres `pawel@progresskit.pl` i akcja „WYŚLIJ PROJEKT” są zachowane.
- **Footer:** ten sam krajobraz przechodzi w niemal czarny las i góry przez maskę, bez prostokątnej granicy grafiki.

## Ruch i telefon

Zachowano wspólny kontroler ruchu, pauzę, obsługę widoczności i `prefers-reduced-motion`. W idle porusza się powoli krajobraz hero, pracują refleksy, koło i węzły. Hover steruje istniejącym małym tilt i refleksami, a scroll aktywuje etapy procesu. Nie dodano pętli JavaScript ani bibliotek animacji.

Telefon korzysta z innego kadru krajobrazu, mniejszego logo, spokojnego burgundowego CTA i pionowych układów. Nie uruchamia desktopowego tilt. Kontrola obejmuje również orientację, dotyk, forced colors, druk i wersję bez JavaScript.

## Zachowanie struktury i treści

[Porównanie źródeł z początkiem tej korekty](evidence/cinematic-cyber-nature-20261101/scope-verification.json) potwierdza **185 kontrolowanych plików bez zmian**. HTML, szablony, katalog, oryginalne logo, ekrany produktów i cały JavaScript — w tym analytics — są identyczne bajtowo. Generator odtworzył te same dokumenty. Poprzednie niezatwierdzone zmiany w checkout zostały zachowane.

Zmiany tej korekty obejmują:

1. `assets/world-atmosphere.css`;
2. `assets/world-sections.css`;
3. `scripts/stage-public.py` — dopuszczenie jednego nowego assetu;
4. nowy [krajobraz WebP](../assets/brand/cinematic-valley-v1.webp), **89 932 B**.

Diff tekstowy tej korekty: **137 dodanych / 122 usunięte linie**. Dodatkowo zapisano ten raport i dowody. [Podsumowanie diffu](evidence/cinematic-cyber-nature-20261101/diff-summary.json).

Tło powstało przez wbudowany **ImageGen**, następnie zostało wyłącznie zakodowane do WebP. Nie jest fotografią rzeczywistej lokalizacji ani ekranem produktu. Pełny prompt, ścieżka źródła i sposób kodowania są w [proweniencji obrazu](evidence/cinematic-cyber-nature-20261101/image-provenance.json). Nowe tło nadal wymaga oceny właściciela.

## Weryfikacja bieżącej wersji

| Kontrola | Wynik |
| --- | --- |
| Python — istniejący pełny zestaw | **118 PASS / 0 FAIL / 0 ERROR / 0 SKIP** |
| Node/CJS — przypadki raportowane indywidualnie | **88 PASS / 0 FAIL / 0 SKIP** |
| `npm test`, build, check i whitespace | **PASS** |
| Generator | **14 projektów / 23 pliki** |
| Linki i fragmenty | **913 PASS / 0 FAIL** |
| Staging | **71 plików**, zgodnych bajtowo ze źródłami |
| Przegląd Chrome | **158 PASS / 0 FAIL** |
| Dodatkowe hit-testy CTA mobile i otwieranie przy pauzie | **30 PASS / 0 FAIL** |
| Galeria offline — obrazy, filmy, filtry, widok 320 px | **9 PASS / 0 FAIL** |
| Niezmienność źródeł podczas końcowych kontroli | **189 plików / 0 zmian** |
| Publikacja | **BLOCKED**, kod 1: `Owner visual approval is OPEN.` |

Dowody: [Python](evidence/cinematic-cyber-nature-20261101/tests/python-summary.json), [Node](evidence/cinematic-cyber-nature-20261101/tests/node-summary.json), [linki](evidence/cinematic-cyber-nature-20261101/internal-links.json), [CTA wszystkich projektów](evidence/cinematic-cyber-nature-20261101/actions-final/expanded-actions-review.json), [niezmienność źródeł](evidence/cinematic-cyber-nature-20261101/source-freeze-verification.json).

Macierz: **1366×768, 1440×900, 1920×1080, 320×568, 390×844**, dodatkowo obrót telefonu do 844×390. Każdy rozmiar obejmuje hero, projekty zwinięte i rozwinięte, usługi, ekosystem, proces, o mnie, kontakt/brief i footer. Nie wykryto poziomego overflow. To emulacja lokalnego Chrome, nie dowód z fizycznego telefonu ani produkcji.

Galeria zawiera **69 końcowych screenshotów**, porównanie z poprzednią wersją i nowe natywne nagrania H.264: [desktop](evidence/cinematic-cyber-nature-20261101/video-desktop/desktop-interaction.mp4), [mobile](evidence/cinematic-cyber-nature-20261101/video-mobile/mobile-interaction.mp4). Wynik zbiorczy agreguje pięć ukończonych macierzy, osobny przebieg interakcji i dwa nagrania; powtarzające się kontrole błędów runtime/sieci liczone są tylko raz.

Filmy mają odpowiednio **13,64 s / 1440×900** i **13,72 s / 390×844**. [Przegląd galerii offline](evidence/cinematic-cyber-nature-20261101/gallery-verification.json) potwierdził załadowanie 75 obrazów (69 końcowych oraz sześć w porównaniach), obu filmów, działanie filtrów i brak żądań zewnętrznych. Wszystkie 88 pozycji manifestu przeszły końcową kontrolę SHA-256.

## Przebiegi wstępne i granice odbioru

Połączenie Browser było niedostępne. Użyto lokalnego Chrome z osobnym profilem testowym po dozwolonym uruchomieniu poza sandboxem. Długie procesy QA zostały przerwane kodem 143; przyczyny zewnętrznego sygnału nie ustalono. Końcowy przegląd wykonano w krótszych, ukończonych przebiegach. Wstępna próba hover wysyłała ruch kursora przed aktualizacją widoczności sekcji. Narzędzie QA czeka teraz na faktyczny stan widoczności i potwierdza trafienie kursora; reguły produktu pozostały bez zmian. [Rejestr prób](evidence/cinematic-cyber-nature-20261101/qa-attempts.json).

Do odbioru wizualnego pozostaje nowa kompozycja desktop/mobile, krajobraz, ilość światła i charakter materiałów. Techniczne PASS nie oznacza akceptacji estetycznej. `ownerVisualApproval` pozostaje **OPEN**, `HEAD` to `64e63f66231f494624feabd6ce2f38cc283d044a`, indeks Git jest pusty. Własny preview jest zatrzymywany po każdym przebiegu; galeria działa offline.
