# Warsztat — płynność, szkło i czas reakcji

**OwnerVisualApproval: OPEN. Bez commita, pushu i publikacji.** Odśwież podgląd, aby wczytać zmienione pliki JS/CSS.

Przyczyną potwierdzoną kontrolowanym profilem były duże gradienty przemalowywane przy każdym ruchu kursora i scrollu. Dziedziczone zmienne powodowały przeliczanie stylów także 110 linków technologii; transformację dodatkowo opóźniało przejście 0,8 s. Wcześniejszy pomiar FPS samego Core nie obejmował tego scenariusza.

Usunąłem aktualizowanie gradientów podczas interakcji i scrolla. Pozostał ograniczony do 24 Hz ruch przez niedziedziczoną właściwość transform, z buforowanym pomiarem panelu i krótszym przejściem 0,22 s. Atmosfera nie przelicza już masek przy każdym przejściu kursora między nazwą a licznikiem.

Szkło ma rzeczywiście transparentny środek zamiast nieprzezroczystej warstwy pod spodem. Dwie odsunięte, wycięte krawędzie dają grubość i wewnętrzne odbicie. Refleksy są statyczne, a szerokie rozmyte cienie usunięte. Bez dodatkowego renderera i bez kosztownego blur na wszystkich taflach.

| Pomiar lokalnego Chrome / UHD620 | Wynik po zmianie |
| --- | --- |
| Od znacznika zdarzenia hover do aktywacji DOM Warsztatu |7,3–12,9ms|
| Od znacznika zdarzenia do następnej klatki silnika Core |32,6–35,8ms; wcześniej55,2–69,6ms|
| Zimny start renderera Core |około3,3–3,6s; poprawy startupu nie deklaruję|
| p95 odstępu rAF podczas ruchu i scrolla,6 faz w2 próbach |16,7–16,8ms; zero przerw ponad50ms|
| Łączny koszt przeliczania stylów podczas scrolla |5,5–5,7ms; wcześniej237–400ms|
| UpdateLayoutTree w porównywalnym trace |906→172ms|

To pomiary tej samej lokalnej strony w izolowanym Chrome, z zamrożonym baseline i rozdzielonym nagrywaniem. Nowy proces/kontekst nie czyści cache systemu plików i sterownika. Są to znaczniki kodu/klatek, a nie optyczny pomiar wyświetlacza. **Opóźnienie zewnętrznej ramki podglądu aplikacji: UNKNOWN** — Browser w aplikacji nie udostępnił połączenia. Nie przypisuję lokalnych wyników bezpośrednio hostowi podglądu.

Zmieniły się wyłącznie 4 pliki: `assets/technology-field.css`, `assets/material-finish.css` (tylko Warsztat), `assets/technology-field.mjs`, `assets/luxury-world.mjs` (zbędne invalidacje pointer). Bez zmian layoutu, treści, nazw/linków technologii, katalogu, statusów i analytics. Wszystkie 232 rzeczywiste prostokąty i fonty desktop są identyczne ze stanem sprzed zmiany. Pierwotne odchylenie 1 px w sumie zaokrąglanych offsetParent zachowano w raporcie; dokładne getBoundingClientRect potwierdziło brak zmiany położenia.

Build/check PASS; istniejące testy 100 JavaScript i 124 Python PASS. Wąskie QA potwierdziło transparentny środek i raster sześciu pustych obrzeży, mobile 390 / desktop 1440, wszystkie 110 linków, focus, pauzę, reduced motion, usypianie i brak pracy animacji Warsztatu podczas scrolla. 26 badanych punktów tekstu ma alpha haze równą 0.

Dowody: [profil przed/po](interaction-comparison.json), [czasy reakcji i startu](latency-and-visuals.json), [pierwotne QA](functional-qa.json), [dokładna geometria](functional-layout-subpixels.json), [ochrona danych](scope-integrity.json), [manifest](source-and-proof-manifest.json).

[Desktop](workshop-desktop.png) · [Mobile](workshop-mobile.png) · [Film reakcji — 13 s, H264/25FPS](workshop-reaction-desktop.mp4). Mobile oznacza emulację; fizyczny telefon NOT_RUN.
