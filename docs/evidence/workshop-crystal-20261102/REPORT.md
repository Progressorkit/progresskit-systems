# Warsztat — final dark crystal glass

**OwnerVisualApproval: OPEN. Bez commita, pushu i publikacji.** Odśwież główny podgląd, aby pobrać aktualne JS/CSS. [Lokalna galeria](http://127.0.0.1:8224/) · [Warsztat](http://127.0.0.1:8201/#technologie).

Zakres tego passu obejmuje wyłącznie materiał i reakcję optyczną sześciu obiektów Warsztatu. Układ, typografia, treści, wszystkie 110 nazw/linków technologii i ich natywne filtrowanie pozostały zachowane. Nie zmieniono innych sekcji, Three.js, katalogu, statusów, analytics ani kodu produktów.

Grubość buduje odsunięty bok z oszlifowaniem szerokości 10–13 px, ciemny wypukły front, cień wewnętrzny i osobne odbicie wewnętrznej krawędzi. Front łapie chłodny refleks z jednej strony i gaśnie po przeciwnej; dolna powierzchnia odbiera bardzo oszczędny burgund. Środek pozostaje ciemny i przejrzysty.

Hover i focus podnoszą kontrast tekstu i włączają dwa małe ogniska pod powierzchnią: srebrno-chłodne oraz burgundowe. Wąski refleks przechodzi po froncie. Podczas ruchu kursora podążają za nim tylko małe światła; ciężka tafla dopiero po 160 ms spokoju osiada w minimalnym tilcie i skali 1.012. Dzięki temu szybkie przechodzenie między obiektami nie animuje ciągle całej grubej powierzchni. Idle ma bardzo wolny, przesunięty w fazie refleks. Podczas przewijania/ruchu refleks chwilowo się zatrzymuje, a priorytet ma interakcja.

Na mobile zachowano grubość i zmniejszono intensywność optyki. Tap w pustą część szkła włącza zasilenie, kolejny je wyłącza; tap linku nadal prowadzi do istniejącego filtra katalogu. Reduced motion i globalna pauza zatrzymują ruch; forced colors i druk pokazują czytelną treść bez optyki. Przejście focus do innej grupy usuwa pozostały tilt poprzedniej.

Zmodyfikowane źródła:

- `assets/technology-field.css` — bevel, front, małe warstwy światła, idle/hover i fallbacki.
- `assets/material-finish.css` — wyłącznie reguły Warsztatu; pozostałe 41 reguł identyczne ze snapshotem.
- `assets/technology-field.mjs` — dekoracyjne warstwy, ograniczona do 24 Hz reakcja świateł, tilt po zatrzymaniu, mobile tap i sprzątanie pracy po pauzie/wyjściu.

Nie ma nowego renderera ani zależności. Grubość i załamanie światła są symulacją warstw CSS ze statycznymi gradientami, a nie fizyczną refrakcją WebGL. Ruch zmienia transform i opacity osobnych małych powierzchni; nie aktualizuje gradientów na każdej klatce. Animują się tylko widoczne obiekty.

| Lokalny Chrome / Intel UHD 620 | Przed passem | Końcowy benchmark |
| --- | --- | --- |
| Hover: mediana zdarzenie → stan DOM, 12 próbek na wariant | 5,9 ms | 6,0 ms |
| Hover: p95 / maksimum w tej małej próbie | 16,4 ms | 26,3 ms |
| Mediana samej obsługi zdarzenia → stan DOM | 0,10 ms | 0,15 ms |
| p95 odstępu klatek: idle, pointer, scroll | 16,7–16,8 ms | 16,7–16,8 ms |
| Przerwy klatek ponad 50 ms w porównanych fazach | 0 | 0 |

Mediana i ciągły ruch są porównywalne z bazą; ogon opóźnień różni się przy małej liczbie próbek. Nie deklaruję gwarantowanych 7–13 ms ani statystycznego braku regresji. Pomiary pochodzą z izolowanego lokalnego Chrome, bez równoczesnego nagrywania; są znacznikami kodu/klatek, nie pomiarem optycznym. Opóźnienie osadzonego podglądu aplikacji pozostaje **UNKNOWN** — połączenie Browser nie było dostępne. Fizyczny telefon: **NOT_RUN**, mobile oznacza emulację 390×844.

Weryfikacja:

- `npm run check`: PASS. Istniejące testy: **100 JavaScript + 124 Python PASS**, bez zmian testów produktu. Python użył oddzielnych syntetycznych baz w `/tmp`.
- QA przeglądarki: **31 PASS / 0 nierozwiązanych FAIL**. Pierwsza próba miała 29 PASS / 2 FAIL dotyczące wyłącznie liczników w druku. Poprawiono specyficzność selektora `@media print`; dwa testy druku ponowiono z wynikiem PASS. Pierwotne wyniki zachowane.
- Rzeczywista geometria/fonty 232 elementów na desktop i mobile oraz 110 href porównane dokładnie ze snapshotem. Focus, tap, natywne filtrowanie, reduced motion, pauza, offscreen, forced colors i dispose sprawdzone w przeglądarce. Bez nowych kontekstów WebGL i bez błędów strony.
- Ochrona zakresu: 12 plików katalogu/analytics, semantyka strony, HEAD i index bez zmian. Delta tego passu to dokładnie trzy wymienione źródła oraz lokalne materiały dowodowe w tym katalogu.

Zrzuty: [idle](workshop-crystal-idle.png), [hover / zasilenie](workshop-crystal-powered.png), [mobile tap](workshop-crystal-mobile-tap.png). Filmy: [desktop 13 s](workshop-crystal-desktop.mp4), [mobile 13 s](workshop-crystal-mobile.mp4). Oba H264, 25 FPS nagrania; pełny decode PASS. FPS nagrania nie jest pomiarem renderowania strony.

Końcowy benchmark, proof i późniejsze fallbacki mają oddzielne hashe. Po benchmarku dodano cleanup focus oraz poprawki reduced motion / print. Po nagraniach zmienił się wyłącznie selektor koloru liczników w `@media print`; wygląd ekranu jest identyczny z proof. Szczegóły: [pomiary](CURRENT-MEASUREMENTS.json), [QA](qa-summary.json), [scope guard](scope-integrity.json), [źródła](source-manifest.json), [proof](final-proof-manifest.json).

Wcześniejsze wolniejsze iteracje są zachowane jako odrzucone w lokalnych wynikach. Galeria prezentuje wyłącznie końcowe trzy zrzuty i dwa filmy. Dalsza ocena materiału należy do właściciela; nie uruchomiono kolejnego redesignu.
