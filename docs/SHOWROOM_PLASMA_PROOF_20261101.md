# Showroom — rdzeń zasila projekty

**Lokalny proof. Owner visual approval: OPEN. Bez commitu, pushu i wdrożenia.**

[Podgląd showroomu](http://127.0.0.1:8191/#showroom-track) · [Galeria, stany i dwa filmy](evidence/showroom-plasma-20261101/gallery.html)

## Zmiana

Stałe połączenia SVG zastąpiono przezroczystym Canvasem. Wyładowanie ma nieregularny biało-niebieski rdzeń, cyjanową koronę i cienkie boczne rozgałęzienia. Nie ma stałego przewodu ani animacji przesuwającej kreskę po ścieżce.

Aktywacja rdzenia kolejno zasila widoczne projekty. Każdy przechodzi przez oczekiwanie, wyładowanie, lokalny błysk na krawędzi i materializację szkła. Impuls dociera nominalnie po 125 ms, soczewka zaczyna się ujawniać po 185 ms. Desktop rozsuwa początki wyładowań o 115 ms. Są to czasy planowane; rzeczywiste pomiary przeglądarki zapisano w `final/qa-plasma.json`.

Hover i fokus wyróżniają jeden projekt, przygaszają pozostałe i uruchamiają krótszy, słabszy impuls. Podczas utrzymanego wskazania wyładowania powracają w nieregularnych odstępach 2,6–4,3 s. Między nimi Canvas jest pusty. Kliknięcie, Enter lub tap projektu dostarcza energię przed otwarciem istniejących szczegółów; opóźnienie wynosi 215 ms i można je anulować Escape lub nawigacją.

Kolor energii jest chłodny, biało-niebieski. Zachowano metal, szkło, oryginalny znak, kierunkowe światło i cień kapsuły. Czerwony akcent w komorze pozostaje minimalny.

## Wydajność i dostępność

- Wyładowania używają kilku zaplanowanych kroków, bez własnej pętli RAF. W spoczynku Canvas nie rysuje. Końcowy pomiar hover wykazał m.in. przerwę 2534,5 ms bez rysowania.
- Pauza, otwarty projekt, wyjście poza widok i ukrycie strony zatrzymują oczekujące efekty. Ujawnienie treści nie jest uzależnione od ukończenia animacji.
- `prefers-reduced-motion` otrzymuje statyczny, delikatny świetlny impuls i natychmiast dostępne projekty. Klawiatura nie czeka na pojawienie się tekstu pod fokusem.
- Mobile ma jeden aktywny projekt, mniejszą liczbę segmentów i rozgałęzień oraz DPR Canvasu ograniczony do 1. Desktop: maksymalnie 1,5.
- Brak kontekstu Canvas nie blokuje treści. Dotychczasowy wariant bez JavaScript, adresy projektów, filtry, fokus i zdarzenia analytics pozostają dostępne.

## Zakres

W tym etapie zmieniono tylko sześć istniejących plików:

| Plik | Zmiana |
| --- | --- |
| `assets/showroom-capsule.js` | Krótkie wyładowania, rozgałęzienia, kolejność ujawniania, statyczny impuls, wygaszanie pracy |
| `assets/showroom-capsule.css` | Usunięcie connectorów, odsłanianie każdej soczewki po dotarciu energii, refleks szkła |
| `assets/project-showroom.js` | Ograniczone i anulowalne oczekiwanie na energię przed otwarciem szczegółów |
| `scripts/showroom_markup.py` | Dekoracyjny Canvas zamiast sześciu ścieżek SVG |
| `index.html` | Wynik generatora |
| `tests/project-showroom.test.cjs` | Trzy scenariusze dostarczenia energii, anulowania i ograniczenia opóźnienia |

Dodatkowo powstał ten raport i katalog dowodów. Zachowano wcześniejsze niezatwierdzone zmiany. Z 206 istniejących źródeł 200 pozostało identycznych. Wszystkie 14 artykułów projektów oraz HTML poza showroomem są identyczne bajtowo względem początku tego etapu. Katalog, analytics, pozostałe sekcje i testy niezwiązane z showroomem nie zostały zmienione. [Kontrola zakresu](evidence/showroom-plasma-20261101/scope-check.json).

## Weryfikacja

| Sprawdzenie | Końcowy wynik |
| --- | --- |
| Testy kontrolera showroomu | 42 PASS / 0 FAIL |
| Chrome: sześć rozmiarów i układ | 45 PASS / 0 FAIL |
| Chrome: klawiatura, pauza, dostępność, fallback i deep link | 17 PASS / 0 FAIL |
| Chrome: kolejność energii, przerwy w rysowaniu, reduced motion i brak Canvas | 25 PASS / 0 FAIL |
| Błędy JavaScript/CSP w końcowym QA | 0 |
| Generator / `npm run check` / składnia JS / whitespace | PASS — 14 projektów, 23 wygenerowane pliki |
| Publiczny staging | PASS — 73 pliki |
| Galeria i odtwarzanie materiałów | PASS — 25 obrazów, oba filmy odtwarzają się bez błędów |

Rozmiary: 1920×1080, 1440×1050, 1366×768, 700×900, 390×844, 320×568. Mobile jest emulowany w Chrome; nie jest to test fizycznego telefonu.

Pierwsza długa sesja układu zakończyła się przerwaniem połączenia z Chrome. Końcowe sesje wykonano w trzech krótszych partiach. Dwa początkowe pomiary krótkiego hover były zależne od czasu zapisu screenshotu; końcowy test mierzy bezpośrednio czas wywołań renderera. Historyczne wyniki zachowano osobno, poza końcowym zestawieniem.

## Proof

- [Idle](evidence/showroom-plasma-20261101/final/1440x1050-idle.png)
- [Impuls przed materializacją](evidence/showroom-plasma-20261101/final/1440x1050-plasma-arrival.png)
- [Po aktywacji rdzenia](evidence/showroom-plasma-20261101/final/1440x1050-activated.png)
- [Hover projektu](evidence/showroom-plasma-20261101/final/1440x1050-project-hover-plasma.png)
- [Statyczny impuls reduced motion](evidence/showroom-plasma-20261101/final/1440x1050-reduced-static-impulse.png)
- [Film desktop — 12,96 s](evidence/showroom-plasma-20261101/final/desktop-proof.mp4)
- [Film mobile — 13,00 s](evidence/showroom-plasma-20261101/final/mobile-proof.mp4)

Następny krok: ocena właściciela w działającym showroomie; ewentualna korekta intensywności i rytmu wyładowań w ramach tej sekcji. Stan wizualnej akceptacji pozostaje OPEN.
