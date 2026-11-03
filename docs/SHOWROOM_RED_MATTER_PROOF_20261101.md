# Showroom — artefakt przed żywą czerwoną materią

**Lokalny proof do oceny. `ownerVisualApproval: OPEN`. Bez commitu, pushu i wdrożenia.**

[Podgląd showroomu](http://127.0.0.1:8191/#showroom-track) · [Galeria stanów i filmów](evidence/showroom-red-matter-20261101/gallery.html)

## Kierunek i warstwy

Usunięto niebieskie pioruny, zygzakowate łuki i liniowe transfery pomiędzy rdzeniem a projektami. Zastępuje je jeden obszar proceduralnej czerwonej materii za kapsułą. Kapsuła, aluminium i oryginalne metaliczne logo pozostają z przodu; nie dodano czerwonej warstwy na znak.

Materia ma asymetryczne skupiska, ciemne zagłębienia i małe jaśniejsze fragmenty wewnętrzne. Jej kształt oraz gęstość zmieniają się w czasie. Paleta przechodzi od bardzo ciemnego burgundu do karmazynu. Zasłanianie przez przedni obiekt i głębia wewnątrz materii mają wspierać odczucie osobnych warstw przestrzeni. Jakość filmowa pozostaje przedmiotem oceny właściciela; wyników technicznych nie traktujemy jako akceptacji wizualnej.

Kursor wpływa na lokalne zagęszczenie i kierunek głębszych warstw, refleksy szkła oraz cień kapsuły. Aktywacja rdzenia uruchamia zagęszczenie i rozchodzące się poruszenie wewnątrz materii, po czym ujawniają się soczewki projektów. Hover podkreśla wybrany projekt światłem pochodzącym od rdzenia, bez rysowania połączenia.

Soczewki zachowują dotychczasowe treści. Mają ciemniejsze środki, chłodne refleksy, grubość obrzeża i delikatne czerwone światło od dołu. Niewielkie różnice kąta, głębokości i oświetlenia ograniczają wrażenie sześciu identycznych modułów. Otwarte szczegóły i układ mobile pozostają czytelne.

## Rozwiązanie techniczne i ograniczenia

- WebGL działa wyłącznie na jednym małym Canvasie za centralnym obiektem. Shader integruje gęstość, absorpcję i światło przez objętość: 20 próbek na desktopie, 12 w wariancie kompaktowym. Korzysta z generowanej tekstury szumu, bez zewnętrznych zasobów lub silnika całej sceny.
- Bufor ma limit 400×460 px na desktopie i 220×260 px na mobile, z zachowaniem proporcji dostępnego obszaru. Harmonogram ogranicza odświeżanie do 18 Hz lub 9 Hz. Są to limity konfiguracji, nie obietnica osiągniętego FPS.
- Kapsuła i soczewki nadal korzystają z warstw CSS. Refrakcja szkła jest przybliżeniem optycznym; nie dodano fizycznego renderera szkła ani całej sceny 3D.
- Odmowa WebGL lub utrata kontekstu uruchamia animowany fallback CSS. Na mobile jest uproszczony, ale pozostaje żywy. Fallback ma mniejszą szczegółowość i głębię niż shader.
- Reduced motion zachowuje statyczną materię i natychmiast dostępne treści. Pauza efektów, ukrycie strony, wyjście poza showroom i czytanie otwartego projektu zatrzymują rysowanie. Fokus klawiatury nie czeka na zakończenie materializacji.

<!-- GENERATED-RENDER-METRICS:BEGIN -->
Końcowy przebieg QA używał buforów 400×389 px na desktopie i 220×208 px na mobile. Zarejestrowano 28 wywołań rysowania desktopu w obserwacji idle trwającej co najmniej 5.1 s oraz 48 wywołań mobile w obserwacji obejmującej minimum 5 s. To liczniki konkretnego przebiegu Chrome, a nie potwierdzenie osiągania limitów 18/9 FPS. Zmianę wzoru potwierdzają także różne próbki pikseli framebufferu zapisane w raportach.
<!-- GENERATED-RENDER-METRICS:END -->

## Hum

Pozostawiono opcjonalny niski rezonans rdzenia. Dźwięk uruchamia wyłącznie przycisk **„Włącz hum”**; wejście na stronę, hover lub samo obudzenie kapsuły nie włączają audio. Przycisk umożliwia łatwe wyciszenie, a aktywacja rdzenia może delikatnie zwiększyć intensywność już włączonego hum.

Pauza, otwarcie szczegółów, ukrycie strony i wyjście poza showroom wyciszają oraz zawieszają audio. Reduced motion wyłącza opcję dźwięku; ponowne włączenie zwykłego ruchu nie uruchamia go automatycznie. Bez odpowiedniego API opcjonalny przycisk pozostaje ukryty. Filmy dowodowe są bez ścieżki audio; hum można sprawdzić w działającym podglądzie.

## Zakres plików

| Plik | Zmiana |
| --- | --- |
| `assets/showroom-matter.js` | Nowy renderer objętości, wygenerowany szum, obsługa pauzy i utraty kontekstu |
| `assets/showroom-capsule.js` | Usunięcie wyładowań, integracja materii, sekwencja ujawniania i zachowanie hum |
| `assets/showroom-capsule.css` | Materia za obiektem, okluzja kapsuły, materiały soczewek i animowany fallback |
| `scripts/showroom_markup.py` | Jeden Canvas za kapsułą i warstwy fallbacku |
| `scripts/build-site.py` | Podłączenie renderera przed kontrolerem kapsuły, tylko na stronie głównej |
| `scripts/stage-public.py` | Jawne dopuszczenie nowego zasobu do publicznego zestawu |
| `index.html` | Wynik generatora |

Zachowano wcześniejsze niezatwierdzone zmiany. Spośród 208 istniejących źródeł zmieniono sześć; 202 pozostały identyczne. Dodano jeden nowy zasób runtime: `assets/showroom-matter.js`. Wszystkie 14 artykułów projektów jest identyczne bajtowo. Poza showroomem HTML zmienia się wyłącznie o znacznik ładowania nowego skryptu. Główny kontroler projektów, katalog, analytics oraz testy niezwiązane z showroomem nie zostały zmienione. [Kontrola zakresu](evidence/showroom-red-matter-20261101/scope-check.json).

## Weryfikacja

<!-- GENERATED-QA:BEGIN -->
| Sprawdzenie | Końcowy wynik |
| --- | --- |
| Istniejące testy showroomu | 42 PASS / 0 FAIL |
| Chrome — Układ: sześć rozmiarów, geometria i dotyk | 45 PASS / 0 FAIL |
| Chrome — Klawiatura, pauza, dostępność i deep link | 17 PASS / 0 FAIL |
| Chrome — Materia desktop: ruch, kolejność i okluzja | 24 PASS / 0 FAIL |
| Chrome — Odmowa WebGL, utrata kontekstu i fallback CSS | 14 PASS / 0 FAIL |
| Chrome — Materia mobile i mniejszy bufor | 13 PASS / 0 FAIL |
| Chrome — Hum i jego cykl życia | 19 PASS / 0 FAIL |
| Razem sprawdzenia Chrome | 132 PASS / 0 FAIL |
| Błędy JavaScript/CSP w raportach końcowych | 0 |
| Generator / `npm run check` | PASS — 14 projektów, 23 wygenerowane pliki |

Źródła wyników: [qa-layout.json](evidence/showroom-red-matter-20261101/final/qa-layout.json) · [qa-interaction.json](evidence/showroom-red-matter-20261101/final/qa-interaction.json) · [qa-matter-desktop.json](evidence/showroom-red-matter-20261101/final/qa-matter-desktop.json) · [qa-matter-fallback.json](evidence/showroom-red-matter-20261101/final/qa-matter-fallback.json) · [qa-matter-mobile.json](evidence/showroom-red-matter-20261101/final/qa-matter-mobile.json) · [qa-audio.json](evidence/showroom-red-matter-20261101/final/qa-audio.json)
<!-- GENERATED-QA:END -->

Zakres obejmuje sześć rozmiarów: 1920×1080, 1440×1050, 1366×768, 700×900, 390×844 i 320×568. Mobile jest emulowany w Chrome, bez potwierdzenia na fizycznym telefonie. Testy audio sprawdzają stan silnika i sygnał, nie ocenę odsłuchu na fizycznych głośnikach.

W początkowym sprawdzeniu reduced motion odczyt wykonany po sztywnych 500 ms nie potwierdził jeszcze stanu pauzy. Końcowy test czeka do 3 s na zgodność preferencji systemowej i stanu kontrolera, zachowując osobne sprawdzenie braku dalszego rysowania. Wcześniejszy wynik pozostał w katalogu `diagnostics`; nie jest wliczany do końcowego zestawienia. Zestawienie obejmuje wymienione testy kontrolera i raporty przeglądarki; nie sumuje dodatkowych, samodzielnych testów renderera.

## Materiały do odbioru

- [Idle — początek obserwacji](evidence/showroom-red-matter-20261101/final/matter-desktop-idle-start.png)
- [Idle — po minimum 5 sekundach](evidence/showroom-red-matter-20261101/final/matter-desktop-idle-after-5s.png)
- [Aktywacja i zagęszczenie materii](evidence/showroom-red-matter-20261101/final/matter-desktop-core-pressure.png)
- [Zmaterializowane projekty](evidence/showroom-red-matter-20261101/final/matter-desktop-activated.png)
- [Hover projektu](evidence/showroom-red-matter-20261101/final/matter-desktop-project-hover.png)
- [Mobile — początek](evidence/showroom-red-matter-20261101/final/matter-mobile-idle-start.png) · [po minimum 5 sekundach](evidence/showroom-red-matter-20261101/final/matter-mobile-idle-after-5s.png)
- [Fallback CSS](evidence/showroom-red-matter-20261101/final/matter-css-fallback-idle.png) · [fallback mobile](evidence/showroom-red-matter-20261101/final/matter-mobile-css-fallback.png)

<!-- GENERATED-VIDEOS:BEGIN -->
- [Desktop — 13,96 s](evidence/showroom-red-matter-20261101/final/desktop-proof.mp4)
- [Mobile — 14,00 s](evidence/showroom-red-matter-20261101/final/mobile-proof.mp4)
<!-- GENERATED-VIDEOS:END -->

Nagrania zaczynają się od sześciu sekund idle. Następnie pokazują aktywację, materializację i hover projektu na desktopie lub otwarcie dotykiem na mobile. Następny krok to ocena właściciela: relacji przód–tył, odcienia i struktury materii, tempa ruchu oraz odbić szkła. `ownerVisualApproval` pozostaje **OPEN**.
