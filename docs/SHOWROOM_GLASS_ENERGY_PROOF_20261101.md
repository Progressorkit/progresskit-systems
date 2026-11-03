# Showroom — szkło, stała energia i opcjonalny hum

**Lokalna wersja do oceny. Owner visual approval: OPEN. Bez commitu, pushu i wdrożenia.**

[Podgląd](http://127.0.0.1:8191/#showroom-track) · [Galeria wymaganych stanów i filmów](evidence/showroom-glass-20261101/gallery.html)

## Co zmieniono

Pełną szarą osłonę za logo zastąpiono przezroczystą komorą. Usunięto przyciemnioną teksturę krajobrazu z jej wnętrza, zwężono metalowe zaciski i żebra, dodano chłodne krawędzie o kilku poziomach głębi. Logo pozostało oryginalne; jest jaśniejsze i wyraźniej oddzielone od tła. Refleksy, światło wewnętrzne i cień reagują na kursor.

W idle wokół kapsuły stale pracują większe, rozgałęzione łuki biało-cyjanowej energii. Ich pozycja zmienia się po obwodzie, a jasność spokojnie faluje. Hover/fokus zwiększa napięcie wokół rdzenia i wzmacnia transfer do konkretnego projektu. Dotarcie impulsu rozświetla również szkło projektu. Zachowano kolejność: energia, błysk, materializacja soczewki.

Soczewki projektów mają bardziej przejrzyste wypełnienie, jaśniejsze krawędzie, połysk i wewnętrzne odbicia. Wskazany projekt rozjaśnia się, lekko podnosi i dostaje poświatę. Treści projektów pozostają bez zmian.

## Hum — dodany, wyłącznie po świadomym włączeniu

Przycisk **„Włącz hum”** znajduje się w prawym górnym rogu showroomu. Dopiero jego kliknięcie, tap lub aktywacja klawiaturą tworzy silnik audio. Samo wejście, hover, fokus projektu lub aktywacja rdzenia nie włączają dźwięku. Po włączeniu ten sam przycisk pozwala wyłączyć hum jednym ruchem.

Dźwięk jest generowany lokalnie przez Web Audio: cichy niski ton 54 Hz z delikatnymi harmonicznymi, filtrem i łagodnym narastaniem. Aktywny projekt nieznacznie podnosi intensywność. Nie ma plików audio do pobrania ani dodatkowych usług sieciowych.

Pauza efektów, otwarcie projektu, ukrycie strony i wyjście poza showroom wyciszają oraz zawieszają audio. Powrót może wznowić hum tylko po wcześniejszym ręcznym włączeniu. `prefers-reduced-motion` wyłącza hum i jego przełącznik; powrót do zwykłego ruchu nie uruchamia go ponownie. Bez Web Audio opcjonalny przycisk pozostaje ukryty. Preferencja dźwięku nie jest zapisywana — przeładowanie strony wraca do ciszy.

## Kompromisy techniczne

- Szkło to kompozycja warstw CSS: przezroczystość, grubość krawędzi, przesunięte refleksy i parallax. Refrakcja jest optycznym przybliżeniem, bez fizycznego ray tracingu i bez dodawania WebGL.
- Stała energia ma osobny mały Canvas wokół kapsuły. Odświeża się najwyżej około 10 razy/s na desktopie i 6 razy/s w wariancie kompaktowym. Duży Canvas pomiędzy projektami pracuje tylko podczas transferu. Pomiar desktopu: 10 odświeżeń powłoki i 0 odświeżeń pola projektów w sekundę idle.
- W reduced motion pozostają statyczne łuki i statyczny impuls. Poza widokiem rysowanie całkowicie ustaje. Animacje CSS respektują istniejącą pauzę showroomu.
- Mobile zachowuje uproszczone warstwy, dwa łuki zamiast trzech, niższą rozdzielczość Canvasu i jeden czytelny aktywny projekt.
- Sygnał audio zmierzono w przeglądarce (RMS około 0,009 pełnej skali). Nie oceniano odsłuchu na fizycznych głośnikach ani fizycznego telefonu; mobile to emulacja Chrome.

## Pliki i zachowany zakres

| Plik | Zmiana w tym etapie |
| --- | --- |
| `assets/showroom-capsule.css` | Przezroczysty korpus, chłodne krawędzie, jaśniejsze soczewki, reakcja na zasilanie i przełącznik hum |
| `assets/showroom-capsule.js` | Stałe łuki wokół rdzenia, mocniejszy transfer, opcjonalny hum i zarządzanie ich aktywnością |
| `scripts/showroom_markup.py` | Mały Canvas wokół kapsuły i dostępny przełącznik hum |
| `index.html` | Wynik generatora |

Dodatkowo powstał ten raport i katalog dowodów. Kontroler `project-showroom.js`, katalog, analytics i testy pozostały identyczne względem początku tego etapu. Zachowano wszystkie wcześniejsze niezatwierdzone zmiany. Z 207 istniejących źródeł zmieniono cztery; 203 pozostały identyczne. Wszystkie 14 artykułów projektów oraz HTML poza showroomem są identyczne bajtowo. [Kontrola zakresu](evidence/showroom-glass-20261101/scope-check.json).

## Weryfikacja

| Sprawdzenie | Wynik |
| --- | --- |
| Istniejące testy showroomu | 42 PASS / 0 FAIL |
| Chrome — sześć rozmiarów, geometria, aktywacja, dotyk | 45 PASS / 0 FAIL |
| Chrome — klawiatura, pauza, reduced motion, forced colors, fallback, deep link | 17 PASS / 0 FAIL |
| Chrome — stała energia, limity odświeżania, audio i jego cykl życia | 27 PASS / 0 FAIL |
| Błędy JavaScript/CSP | 0 |
| Generator / `npm run check` / składnia kapsuły / whitespace | PASS — 14 projektów, 23 generowane pliki |
| Publiczny staging | PASS — 73 pliki |

Rozmiary: 1920×1080, 1440×1050, 1366×768, 700×900, 390×844, 320×568. Sprawdzenie audio obejmuje brak autoplay, jawne włączenie, rzeczywisty sygnał, subtelne podniesienie poziomu, wyciszenie, szybkie przełączenia, pauzę, wyjście poza widok, reduced motion, mobile i brak API.

## Do oceny wizualnej

- [Idle — szkło i stała energia](evidence/showroom-glass-20261101/final/1440x1050-idle.png)
- [Aktywowany rdzeń](evidence/showroom-glass-20261101/final/1440x1050-activated.png)
- [Hover projektu](evidence/showroom-glass-20261101/final/1440x1050-project-hover.png)
- [Hover z ręcznie włączonym hum](evidence/showroom-glass-20261101/final/1440x1050-hover-hum-enabled.png)
- [Mobile](evidence/showroom-glass-20261101/final/390x844-activated.png)
- [Film desktop](evidence/showroom-glass-20261101/final/desktop-proof.mp4) · [film mobile](evidence/showroom-glass-20261101/final/mobile-proof.mp4)

Filmy są zapisem wizualnym bez ścieżki dźwiękowej. Hum można sprawdzić w działającym lokalnym podglądzie. Kolejny krok: ocena właściciela, ewentualnie dostrojenie intensywności szkła, energii i głośności w tej sekcji.
