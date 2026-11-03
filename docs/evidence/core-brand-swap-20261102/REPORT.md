# ProgressKit — zamiana Core i logo

**ownerVisualApproval: OPEN. Bez commita, pushu i publikacji.** [Lokalny podgląd](http://127.0.0.1:8201/#projekty). Odśwież stronę, aby pobrać aktualne pliki.

Duże oryginalne logo ProgressKit znajduje się teraz w centrum showroomu, w miejscu kapsuły. Zachowano jego kliknięcie/tap i focus aktywujący projekty, pozycjonowanie kryształów oraz otwieranie i zamykanie modułów. Wprowadzono jedynie opcjonalną prezentację `corePresentation: "logo"` istniejącej sceny; domyślna kapsuła i jej materiały pozostały dostępne bez zmian.

Obok napisu „ProgressKit Systems” w nagłówku odtwarzana jest mała pętla nagrana z rzeczywistego, obecnego Core Three.js. To zapis renderu tego samego modelu, nie dodatkowy interaktywny renderer. WebM ma **31 271 B, 160×160 px, 15 FPS, 11,267 s, bez audio**. Pełne dekodowanie PASS. Pętla została łagodnie połączona z własnych klatek nagrania. Wymiary i pozycja istniejącego slotu w nagłówku zostały zachowane.

Nagranie zatrzymuje się przy ukryciu karty, ograniczonym ruchu, forced colors, druku i globalnej pauzie. Oryginalny obraz pozostaje fallbackiem przy błędzie lub blokadzie odtwarzania. Nie powstaje nowy kontekst WebGL ani pętla requestAnimationFrame dla nagłówka. Ponawianie przerwanego odtwarzania wymaga zewnętrznej zmiany stanu, aby uniknąć pętli po AbortError.

Zmiana objęła 12 plików źródeł/assetów/testów:

- `assets/showroom-scene.mjs`, `assets/showroom-3d.mjs` — centralne logo i zachowany hit-testing.
- Nowe `assets/brand-core-mark.mjs`, `assets/brand-core-mark.css`, `assets/brand/progresskit-core-mark.webm` — prezentacja w nagłówku.
- `scripts/build-site.py`, `scripts/stage-public.py`, wygenerowany `index.html` — rejestracja tylko na homepage i jawna lista publicznych plików.
- `analytics/preview.py`, `analytics/security_headers.py` — konieczne dopuszczenie odtwarzania własnych mediów tylko na dokumentach `/` i `/index.html` lokalnego podglądu. Dotychczasowe `media-src 'none'` blokowało animację. Domyślna polityka API/analytics jest identyczna bajtowo; metoda obsługująca kolektor jest identyczna w AST. Nie zmieniono zbierania danych, liczników ani baz produkcyjnych.
- `tests/test_site_v5.py`, `tests/test_security_headers.py` — wyjątek wyłącznie dla dokładnej ścieżki i SHA256 tej pętli, dalsze wykluczanie obcych filmów oraz test izolacji CSP do wskazanych dokumentów. Nie rozszerzono publikowania całych folderów ani dowolnych filmów.

Treści, katalog, statusy, linki, inne sekcje i ukończony Warsztat pozostają zachowane. Semantyka strony oraz HEAD/index są niezmienione. Szczegóły: [audyt zakresu](final-scope-audit.json), [hashe źródeł](source-manifest.json).

Surowy guard oznacza dwie celowe zmiany plików nagłówków w `analytics/` jako FAIL, ponieważ pierwotnie chronił wszystkie pliki tego katalogu. Nie zmieniono guardu ani nie ukryto wyniku. Osobny audyt `SCOPED_PASS` potwierdza dokładnie te dwa wymagane wyjątki, identyczną domyślną politykę i kod kolektora oraz brak nieoczekiwanych zmian danych/źródeł.

`npm run check` i `git diff --check`: PASS. Istniejące testy JavaScript: **100 PASS**. Końcowy zestaw Python: **125 PASS**, w tym nowy test izolacji mediów. Pierwszą próbę 123 PASS / 1 FAIL zachowano; powodem był ogólny zakaz filmów przed dodaniem wąskiego wyjątku z przypiętym hashem.

Końcowe QA przeglądarki: **27 unikalnych PASS, 0 nierozwiązanych FAIL**: 19 PASS w końcowej próbie, osobny followup pięciu kontroli oraz trzy wcześniejsze potwierdzone kontrole niezmienionych elementów. Szczegóły i pochodzenie wyników: [QA.json](QA.json). Potwierdzono faktyczne dekodowanie i zamykanie pętli, pauzę/wznowienie, fallbacki, ograniczone ponawianie AbortError, istniejące konteksty main+haze bez nowego WebGL w nagłówku oraz aktywację/otwieranie/zamykanie projektów. Mobilny slot ma rzeczywiste 38×38 px przed i po zmianie. Trzy wcześniejsze nieprawidłowe założenia QA oraz dwa timeouty fixture dziedziczącego reduced motion zachowano i wyjaśniono; nie zmieniano produktu w celu dopasowania do tych założeń.

Zrzuty: [nagłówek desktop](header-desktop.png), [nagłówek mobile](header-mobile.png), [showroom desktop](showroom-logo-desktop-active.png), [showroom mobile](showroom-logo-mobile-active.png). Wcześniejsza przerwana próba z blokadą CSP jest zachowana osobno; nie stanowi końcowego proof. Mobile oznacza emulację, fizyczny telefon NOT_RUN. Opóźnienia osadzonego podglądu aplikacji nie zmierzono.
