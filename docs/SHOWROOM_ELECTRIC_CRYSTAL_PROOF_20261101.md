# Showroom — elektryczna materia i fasetowane kryształy

**Lokalny proof do oceny. `ownerVisualApproval: OPEN`. Bez commitu, pushu i wdrożenia.**

[Podgląd showroomu](http://127.0.0.1:8191/#showroom-track) · [Galeria z filmami i zbliżeniami](evidence/showroom-electric-crystal-20261101/gallery.html)

## Co zmieniono

Warstwę czerwonej chmury zastępuje sfera z cienkimi rozgałęzionymi filamentami. Renderer rysuje zakrzywione pasma energii w jednym Canvasie za metalicznym ProgressKit Core. Filamenty zmieniają położenie, długość i jasność; ich grupy reagują na lokalną uwagę kursora oraz położenie aktywnego projektu. Głęboka czerwień pochodzi z tyłu, a oryginalny znak pozostaje chłodny i metaliczny.

Projekty mają geometryczne kontury, osobne warstwy faset, ostre refleksy i optyczną grubość brzegu. Materializacja przebiega etapami: refleks, kontur, refrakcja i treść. Hover zmienia światło faset zależnie od lokalnego położenia kursora; wybrany obiekt nieznacznie wychodzi do przodu, a pozostałe przygasają. Fokus klawiatury natychmiast udostępnia treść.

Zachowano katalog, opisy, otwieranie szczegółów, nawigację i analytics. Niższe sekcje nie są częścią tego passu. Ich przebudowa pozostaje kolejnym etapem po akceptacji showroomu.

## Technika i kompromisy

- Jeden lokalny Canvas WebGL: sfera oraz grupowane pasma filamentów, bez dużego silnika 3D i bez setek elementów DOM.
- Mobile ma mniejszy bufor oraz mniej filamentów. Limity konfiguracji wynoszą 24 Hz na desktopie i 15 Hz w wariancie kompaktowym; nie są deklaracją zmierzonego FPS. Rozdzielczość może się obniżać przy wolniejszym renderowaniu. Pauza, wyjście poza widoczny showroom, ukrycie karty oraz czytanie szczegółów projektu zatrzymują pętlę rysowania.
- Reduced motion zachowuje statyczną materię i natychmiast ujawnia projekty. Odmowa WebGL lub utrata kontekstu korzysta z lżejszej wersji CSS. Fallback ma mniejszą szczegółowość niż pole GPU.
- Szkło projektów jest zbudowane z warstw CSS. Refrakcja i dyspersja są przybliżeniem optycznym, bez fizycznego śledzenia promieni. Testy potwierdzają działanie i zakres; jakość wizualna pozostaje do oceny właściciela.

<!-- GENERATED-RENDER-METRICS:BEGIN -->
Końcowy przebieg QA używał buforów 900×900 px na desktopie i 600×600 px na mobile. Zarejestrowano 208 wywołań rysowania desktopu w obserwacji idle trwającej co najmniej 6.2 s oraz 190 wywołań mobile w obserwacji obejmującej minimum 6 s. Renderer zgłasza 1080 filamentów desktop i 432 mobile. Wywołania rysowania obejmują kilka przejść GPU na klatkę; nie są licznikiem FPS. Zmianę wzoru potwierdzają także różne próbki pikseli framebufferu zapisane w raportach.
<!-- GENERATED-RENDER-METRICS:END -->

## Hum

Pozostaje domyślnie wyłączony. Uruchamia go wyłącznie przycisk **„Włącz hum”**, który po włączeniu staje się przyciskiem wyciszenia. Fundament wynosi 54 Hz; ciche harmoniczne znajdują się wyżej. Aktywacja i relacja z projektem lekko zmieniają poziom oraz rezonans już włączonego dźwięku.

Pauza, opuszczenie showroomu, ukrycie strony i otwarcie szczegółów wyciszają oraz zawieszają audio. Reduced motion wyłącza opcję; powrót do zwykłego ruchu nie włącza jej automatycznie. Bez Web Audio przycisk pozostaje ukryty. Filmy dowodowe nie zawierają ścieżki audio. Test sygnału nie zastępuje odsłuchu na fizycznych głośnikach.

## Pliki i zakres

| Plik | Zmiana |
| --- | --- |
| `assets/showroom-matter.js` | Sfera elektrycznej materii, rozgałęzione filamenty i kierowanie grup do projektu |
| `assets/showroom-capsule.js` | Sterowanie etapami materializacji, położeniem celu i lokalnym światłem kryształu |
| `assets/showroom-capsule.css` | Fasety, optyczna grubość, refleksy, scenariusz mobile i fallback |
| `docs/evidence/showroom-electric-crystal-20261101/` | Nowe testy przeglądarkowe, nagrania, obrazy i manifest |

<!-- GENERATED-SCOPE:BEGIN -->
Zachowano wszystkie 14 artykułów projektów bajtowo. HTML poza showroomem jest identyczny z początkiem tego passu. Porównano 210 istniejących źródeł: zmieniono 3, pozostałe są identyczne. Cały HTML pozostał identyczny. HEAD `e19fe9f67f9190420c5ec4662c80d94a5fa92f67` nie zmienił się. Wcześniejsze niezatwierdzone zmiany pozostają w katalogu roboczym. [Kontrola zakresu](evidence/showroom-electric-crystal-20261101/scope-check.json).
<!-- GENERATED-SCOPE:END -->

## Weryfikacja

<!-- GENERATED-QA:BEGIN -->
| Sprawdzenie | Końcowy wynik |
| --- | --- |
| Istniejące testy showroomu | 42 PASS / 0 FAIL |
| Chrome — Układ: sześć rozmiarów, geometria i dotyk | 45 PASS / 0 FAIL |
| Chrome — Klawiatura, pauza, dostępność i deep link | 19 PASS / 0 FAIL |
| Chrome — Materia desktop: ruch, kolejność i okluzja | 29 PASS / 0 FAIL |
| Chrome — Odmowa WebGL, utrata kontekstu i fallback CSS | 20 PASS / 0 FAIL |
| Chrome — Materia mobile i mniejszy bufor | 15 PASS / 0 FAIL |
| Chrome — Hum i jego cykl życia | 19 PASS / 0 FAIL |
| Chrome — Pierwsze włączenie hum w czterech stanach | 5 PASS / 0 FAIL |
| Razem sprawdzenia Chrome | 152 PASS / 0 FAIL |
| Błędy JavaScript/CSP w raportach końcowych | 0 |
| Publiczny staging | PASS — 74 pliki, trzy zasoby showroomu identyczne bajtowo |
| Generator / `npm run check` | PASS — 14 projektów, 23 wygenerowane pliki |

Źródła wyników: [qa-layout.json](evidence/showroom-electric-crystal-20261101/final/qa-layout.json) · [qa-interaction.json](evidence/showroom-electric-crystal-20261101/final/qa-interaction.json) · [qa-matter-desktop.json](evidence/showroom-electric-crystal-20261101/final/qa-matter-desktop.json) · [qa-matter-fallback.json](evidence/showroom-electric-crystal-20261101/final/qa-matter-fallback.json) · [qa-matter-mobile.json](evidence/showroom-electric-crystal-20261101/final/qa-matter-mobile.json) · [qa-audio.json](evidence/showroom-electric-crystal-20261101/final/qa-audio.json) · [qa-audio-start.json](evidence/showroom-electric-crystal-20261101/final/qa-audio-start.json)
<!-- GENERATED-QA:END -->

Rozmiary QA: 1920×1080, 1440×1050, 1366×768, 700×900, 390×844 i 320×568. Mobile jest emulowany w Chrome; fizyczny telefon nie jest objęty tym dowodem. Zestawienie liczy istniejące testy showroomu i wskazane raporty przeglądarkowe. Ewentualne wcześniejsze diagnostyki nie są doliczane do końcowych wyników.

Pierwszy przebieg mobile ujawnił odziedziczoną regułę `animation:none!important`, która blokowała animację konturu. Dodano lokalny wyjątek tylko dla aktywnej materializacji przy zwykłym ruchu; powtórzony test mobile zakończył się 15 PASS / 0 FAIL. Reduced motion i pauza nadal zatrzymują ruch. [Zachowany wynik diagnostyczny](evidence/showroom-electric-crystal-20261101/diagnostics/mobile-contour-suppressed/qa-matter-mobile.json).

Pierwsze sprawdzenie hum odczytało zawieszony kontekst i zerowy sygnał po pierwszym włączeniu. Przyczyna tego pojedynczego wyniku nie została potwierdzona. Powtórzony pełny test audio dał 19 PASS / 0 FAIL. Dodatkowo cztery świeże strony sprawdziły pierwszy klik w idle, podczas materializacji, w pierwotnym scenariuszu późnego hover i po pełnym ujawnieniu kolekcji: we wszystkich kontekst działał już przy tym samym progu 800 ms. Asercji nie poluzowano. [Pierwsza diagnostyka](evidence/showroom-electric-crystal-20261101/diagnostics/audio-first-opt-in/qa-audio.json) · [Ukierunkowane powtórzenie](evidence/showroom-electric-crystal-20261101/final/qa-audio-start.json).

## Proof do odbioru

- [Idle](evidence/showroom-electric-crystal-20261101/final/matter-desktop-idle-start.png) · [po minimum 6 sekundach](evidence/showroom-electric-crystal-20261101/final/matter-desktop-idle-after-6s.png)
- [Aktywacja rdzenia](evidence/showroom-electric-crystal-20261101/final/matter-desktop-core-pressure.png) · [materializacja kryształów](evidence/showroom-electric-crystal-20261101/final/showroom-activated.png)
- [Hover aktywnego projektu](evidence/showroom-electric-crystal-20261101/final/matter-desktop-project-hover.png)
- [Zbliżenie rdzenia](evidence/showroom-electric-crystal-20261101/final/core-closeup.png) · [zbliżenie kryształu](evidence/showroom-electric-crystal-20261101/final/crystal-closeup.png)

<!-- GENERATED-VIDEOS:BEGIN -->
- [Desktop — 15,00 s](evidence/showroom-electric-crystal-20261101/final/desktop-proof.mp4)
- [Mobile — 15,00 s](evidence/showroom-electric-crystal-20261101/final/mobile-proof.mp4)
<!-- GENERATED-VIDEOS:END -->

Akceptacja art direction pozostaje **OPEN**. Następny krok to ocena właściciela: struktury elektrycznej kuli, gęstości i charakteru filamentów, materializacji oraz faset szkła. Dalsze sekcje czekają na ten odbiór.
