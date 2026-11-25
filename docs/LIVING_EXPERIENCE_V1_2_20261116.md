# Living Experience V1.2 — 2026-11-16

Wdrożono lokalnie hierarchię bieli, czerwonych akcji i ciemnych paneli. Zachowano sceny, kolejność, transformacje, materiały produktowe i nawigację V1.1.

[Galeria przed / po, wszystkich scen i stanów interakcji](evidence/living-experience-v12-20261116/browser/index.html)

## Zmiany

- Nagłówki `#f7f9fc`, treść `#d1d8e2`, podpisy `#aebdcd`; jedno akcentowane słowo w hero.
- Główne CTA: czerwone, nieprzezroczyste wypełnienie `#96263b`. Oddzielne hover, active, pressed i widoczny obrys focus-visible.
- Sterowanie pomocnicze: neutralna powierzchnia `#26333e` z krawędzią. Podkreślone linki powrotu, przewijania i maila.
- Aktywny heksagon: podwójny czerwony obrys, podkreślona nazwa i czerwone połączenie. Etykiety i grubości linii dają dodatkowy sygnał poza kolorem.
- Guide: nieprzezroczysty panel, cienka czerwona górna krawędź, odrębny stan otwarcia. Ramy istniejących ekranów: drobne czerwone linie poza obrazami aplikacji.
- Podpisy pochodzenia mediów na jednolitym ciemnym tle. Na małych ekranach font zwiększony o 1 px; kontroler nadal dopasowuje dostępne miejsce.
- Forced-colors: systemowa paleta, usunięte dekoracyjne tło Vaelorii, czytelna ikona menu. Przyciski korzystające z systemowej palety nie otrzymują białych podkładów pod tekstem zaznaczenia.

## Wyniki końcowe

| Kontrola | Wynik |
|---|---|
| Build i kontrola generatora | PASS — 19 projektów, 27 plików |
| JavaScript | 121/121 PASS |
| Python | 176/176 PASS |
| Lokalny Chrome | 29/29 grup PASS, 0 FAIL |
| Geometria scen | 13 pozycji × 5 rozdzielczości; brak wyjścia poza viewport i kolizji tekstu z ekranami |
| Interakcje | Hover, focus, wciśnięcie, stan wybrany, Enter/Space/Escape, historia, Guide, menu i dotyk PASS |
| Dostępność | Reduced-motion, brak JS i forced-colors PASS; kolory systemowe dodatkowo obejrzane na obrazie |
| Zasoby | 0 wyjątków JS, 0 naruszeń CSP, 0 żądań zewnętrznych; niekonfigurowany token formularza 503 jest oczekiwany |
| Paczka publiczna | 65 plików z istniejącej listy; zgodność hashy PASS |

Rozdzielczości: 1920×1080, 1440×900, 768×1024, 390×844, 320×568. Zapisano 78 zrzutów. Fizycznego telefonu nie testowano; mobile/touch są emulowane. Nie wysyłano formularzy ani nie pobierano APK.

## Kontrast

Pomiary z computed styles rzeczywistych widocznych elementów, bez gradientów pod etykietą: CTA 7,55:1, hover 6,27:1, wciśnięcie 10,71:1, aktywny rdzeń 10,15:1, sterowanie neutralne 12,25:1, podpisy ekranów 13,30:1. Systemowy Highlight zawiera alpha; jego kontrast zmierzono po złożeniu z systemowym Canvas. Wszystkie te próbki przekraczają przyjęty próg 4,5:1.

Nagłówki i treści na złożonych tłach oceniono wizualnie w kadrach. Wynik nie jest automatycznym certyfikatem dostępności całej strony. Własny przegląd wykrył podkłady zasłaniające tekst w forced-colors mimo poprawnych computed colors; poprawkę sprawdzono ponownie na zrzucie.

## Ruch i wydajność

Plik kontrolera `assets/living-experience.mjs` pozostał identyczny bajtowo. `world-scene.mjs` zmienia wyłącznie barwę i grubość aktywnego połączenia. Nie dodano animacji ani zależności.

Lokalny ThinkPad T480s; Chrome headless, ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6), DPR 1. Pomiar przewijania 3.549 s: 151 próbek, mediana 16.7 ms, P95 50.0 ms, 4 próbek ponad 50 ms. To pomiar tej sesji, nie deklaracja stałych 60 FPS. Po zatrzymaniu 0 dodatkowych klatek sceny; lifecycle, reduced-motion i tryb statyczny przechodzą kontrolę.

## Zachowanie istniejącej pracy

Porównanie z baseline V1.2: 5018 plików identycznych; brak usunięć i nieoczekiwanych zmian. Katalog, kontroler, manifest mediów, oryginalne obrazy i wcześniejsza praca Mail/pilot pozostają zachowane. Zmieniło się tylko sześć istniejących plików: CSS Living, kolor aktywnego połączenia, szablon hero, generator opisów, wynikowy index i skrypt QA.

HEAD `899580c`. Staging: 0 plików. Bez commitu, pushu i deployu. Właściciel nie zatwierdzał jeszcze wyglądu V1.2.

Dowody: [browser/checks.json](evidence/living-experience-v12-20261116/browser/checks.json), [preservation.json](evidence/living-experience-v12-20261116/preservation.json), logi build/check/Python/Node i historyczne przebiegi w katalogu dowodów. Wcześniejsze nieudane przebiegi zachowano; wynik końcowy znajduje się w `browser/checks.json`.
