# Final Material / Depth / Atmosphere Pass — 02.11.2026

**OwnerVisualApproval: OPEN. Bez commita, pushu i publikacji.** Zmiany dotyczą wyłącznie materiałów, cieni, refleksów i istniejącej atmosfery.

[Strona lokalna](http://127.0.0.1:8201/) · [4 ujęcia i 2 filmy](http://127.0.0.1:8220/).

- **Głębia:** różne kierunki i miękkość cienia dla logo, instrumentów Services, soczewek Ecosystem, warstw technologii i zakotwiczonej konsoli. Czerń przechodzi miejscami w bardzo ciemny burgund.
- **Gloss:** punktowe odbicia szkła, precyzyjniejsze krawędzie aluminium i grazing light korzystające z istniejących zmiennych kursora/scrolla. Ciemne powierzchnie zachowują ciemny środek.
- **Tło:** warstwy grafitu, czerni i żaru uzupełniają zatwierdzone materiały. Bez fotografii ani zmiany bazowych tokenów palety.
- **Haze:** ten sam dekoracyjny canvas obsługuje przezroczysty, powoli deformowany szum. Dwie przestrzenie głębi reagują na scroll; czerwone i chłodne światło oraz aktywność Core lekko zmieniają jego oświetlenie.
- **Czytelność:** maksymalnie 20 buforowanych masek omija teksty i kontrolki, w tym tytuły projektów renderowane w Canvas. Po unieważnieniu masek stary obraz jest chwilowo ukrywany, do narysowania aktualnego. Przy szybkim scrollu atmosfera może na moment znikać.

Budżety tej samej warstwy atmosferycznej:

| Tryb | Maksymalna szerokość bufora | Limit FPS |
| --- | --- | --- |
| Desktop |384 px|15|
| Mobile |192 px|12|
| Przy showroomie/Services, desktop |192 px|5|
| Przy showroomie/Services, mobile |128 px|4|

Nie dodano renderera, kontekstu WebGL, tekstur ani postprocessingu. Shader używa 3 oktaw szumu; DOM mierzy po zdarzeniach i zmianach geometrii, bez skanowania na każdej klatce idle. Mobile ma znacznie słabszy haze i prostsze cienie. Reduced motion/global pause zatrzymują czas; forced colors i print ukrywają dekorację. Obsłużone ukrycie karty, utrata/odzyskanie kontekstu i BFcache.

Delta tego passu obejmuje 5 plików:

- Nowy `assets/material-finish.css` — lokalne materiały/cienie i kompozycja istniejącego canvasa.
- `assets/luxury-world.mjs` — haze, maski i budżety istniejącej warstwy.
- `scripts/build-site.py`, `scripts/stage-public.py` — dołączenie jednego arkusza.
- Wygenerowany `index.html` — jedyna różnica w HTML to link do nowego arkusza.

Bez zmian treści, katalogu/statusów, analytics i kodu produktów. Renderery i kontrolery showroomu/Services/Process oraz geometria obiektów pozostają identyczne bajtowo. [Snapshot i ochrona danych](scope-integrity.json), [ochrona istniejących powierzchni/scen](preserved-surfaces.json), [manifest źródeł](source-manifest.json).

Build/check PASS; istniejące testy Python **124 PASS** i JavaScript **100 PASS**. Końcowe QA przeglądarkowe: **77/77 PASS**, bez nierozwiązanych FAIL/BLOCKED. Układ, fonty i wysokość dokumentu są identyczne dla 224 sprawdzanych elementów na szerokościach 360/390/768/1440. Liczba kontekstów WebGL pozostaje równa 3. Sprawdzane teksty i tytuły Canvas mają alpha 0 w rzeczywistym framebuffer haze; w idle warstwa zmienia obraz bez nowych pomiarów DOM. Pauza, reduced motion, forced colors, fallback i odzyskanie kontekstu: PASS. Szczegóły: [qa-summary.json](qa-summary.json).

Krótka kontrolna próbka showroomu na UHD 620: **48,49 FPS** po passie wobec **46,43 FPS** przed nim; obie miały 53 drawcalls i 18232 trójkąty. Próbki trwają około 2,2 s i zależą od warunków hosta — nie stanowią twierdzenia o poprawie wydajności ani gwarancji dla innych urządzeń.

Wczesne testy wykryły brak maski podpisu „Niezależna komunikacja” i błędne utożsamienie jednego selected projektu z sześcioma widocznymi. Oba problemy poprawiono w kodzie; pierwotne wyniki zachowano w dowodach. Osobny test sprawdza ukrywanie nieaktualnych masek podczas scrolla.

Końcowy proof jest kompaktowy: [Hero](01-hero-material.png), [Core](02-core-atmosphere.png), [Technologies](03-technology-gloss.png), [Contact](04-contact-depth.png), [film desktop — 35,08 s](desktop-full-scroll.mp4), [film mobile — 33,00 s](mobile-full-scroll.mp4). Nagrania H264/25 FPS, tempo 1×, bez audio; pełne dekodowanie oraz kadry początkowe i końcowe sprawdzone. Mobile jest emulacją viewportu i dotyku, fizyczny telefon NOT_RUN.

Ocena wizualna pozostaje po stronie właściciela. **OwnerVisualApproval: OPEN.**
