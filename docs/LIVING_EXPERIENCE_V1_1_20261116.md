**ProgressKit Systems — Living Experience V1.1**
Lokalna implementacja i weryfikacja: 16.11.2026.

V1.1 przebudowuje kompozycję i scenografię istniejącej osi przewijania. Oryginalny znak, metalowa konstrukcja, duże ekrany produktów i ilustracja świata gry tworzą kolejne przestrzenie. **Regresja: 323 PASS / 0 FAIL**. Oględziny wizualne wykonano osobno; wynik testów nie jest oceną artystyczną. Akceptacja właściciela V1.1: **OPEN**.

[Galeria z filmami i 68 dużymi kadrami](evidence/living-experience-v11-20261116/browser/index.html) · [Film desktop](evidence/living-experience-v11-20261116/video/1440-journey.mp4) · [Film mobile](evidence/living-experience-v11-20261116/video/390-journey.mp4)

**Widoczna zmiana**

Oryginalny znak w kadrze 1440×900 ma szerokość **747 px**, wobec **396 px** w V1. Zachowano oryginalny plik marki. Trzy plany — tylna konstrukcja, znak i przednie elementy — reagują z różną amplitudą na wskaźnik. Światło i geometryczna rama nadają głębię bez nowego silnika 3D.

Znak zmniejsza się i przemieszcza do środka sieci. Ten sam węzeł mapy rośnie, przemieszcza się i otwiera ekran przez zmieniającą się maskę. Ta sama rama SVG zmienia sylwetkę, rozmiar i orientację między produktami; ekrany obracają się i mijają w przestrzeni. Próbki przewijania są odwracalne, a zatrzymanie w połowie transformacji nie uruchamia autonomicznej animacji.

| Scena | Kompozycja i źródło |
|---|---|
| Mail | Duży rzeczywisty ekran klienta Linux z istniejącego pilota, z danymi syntetycznymi i oznaczeniem testu bez sieci pocztowej. Przed nim zatwierdzony, zredagowany ekran Android. |
| Tax | Dwie duże warstwy autentycznych ekranów dokumentów i workflow z bazy DEMO, 25.10.2026. Jaśniejsze, ciepłe otoczenie. Podpis wskazuje sprawę w weryfikacji i odrębny odbiór reguł księgowych. |
| Glikemia | Duży telefon z prawdziwym formularzem bez danych użytkownika, drugi ekran wyboru języka i srebrna konstrukcja w tle. |
| Vaeloria | Pełnoekranowa oryginalna ilustracja wprowadzenia gry; na pierwszym planie rzeczywiste ekrany prototypu Earth i tutorialu BOT. Ilustracja jest jawnie odróżniona od renderu rozgrywki. |
| Remote | Nowy schemat urządzeń Klient → Router / Relay → Host, własna konstrukcja CSS/SVG i siatka połączeń. Widoczny opis „Schemat architektury”; brak udawanej aktywnej sesji. |

Nowe rastrowe pliki mają łącznie **609,360 B**. Przeprowadzono wyłącznie kodowanie istniejących materiałów do WebP, bez retuszu lub dorabiania interfejsów. [Pochodzenie i hashe](evidence/living-experience-v11-20261116/asset-provenance.json). Materiały prezentacyjne mają osobny manifest `catalog/living-media.json`; fakty o 19 projektach nadal pochodzą z niezmienionego `catalog/projects.json`. Zachowano istniejące galerie produktów i ich ograniczenia prywatności.

Obwiednie obrazów/schematu w Chrome 1440×900:

| Produkt | Szerokość względem kadru | Wysokość względem kadru |
|---|---:|---:|
| mail | 58.2% | 60.0% |
| tax | 60.3% | 73.5% |
| glikemia | 49.1% | 72.7% |
| vaeloria | 46.2% | 61.3% |
| remote | 60.3% | 67.2% |

To wymiary obwiedni, nie procent wypełnionych pikseli ani ocena jakości. [Porównanie wymiarów z V1](evidence/living-experience-v11-20261116/visual-scale-comparison.json).

**Weryfikacja wizualna i filmy**

Sprawdzono otwarcie, pięć głównych prezentacji, mapę, kadr zbiorczy, finał i stany pośrednie. Oględziny objęły duże kadry oraz plansze wszystkich pięciu rozdzielczości: 1920×1080, 1440×900, 768×1024, 390×844 i 320×568. Poprawiono wykryte przycięcia ekranów, opóźnione ładowanie obrazu Vaelorii, mieszanie tekstów w przejściach oraz podpisy na małych telefonach. Dla przejść zapisano osobne duże PNG: `morph`, `node-unfold`, `carrier-turn`, `world-entry`.

Nagrania pochodzą z rzeczywistej strony w Chrome sterowanej przez Playwright. Obejmują wszystkie sceny, zatrzymania w trakcie transformacji i odwrócenie ostatniego przejścia. Zachowano surowe WebM oraz MP4 H.264 bez interpolacji ruchu.

| Film | Czas | Klatki | Rozmiar | Weryfikacja |
|---|---:|---:|---:|---|
| Desktop 1440×900 | 38,36 s | 959 | 12 507 478 B | Pełne dekodowanie + odtworzenie do końca w Chrome: PASS |
| Mobile 390×844 | 38,60 s | 965 | 5 044 930 B | Pełne dekodowanie + odtworzenie do końca w Chrome: PASS |

Odtwarzanie kontrolne odbyło się z prędkością 4×; służyło sprawdzeniu kompletności plików. Ocenę sekwencji uzupełniają 26 klatek wyciągniętych z filmów w oryginalnym rozmiarze. Format zapisu **25 fps nie jest pomiarem wydajności witryny**. [Metadane i SHA-256](evidence/living-experience-v11-20261116/video/videos.json) · [Odtwarzanie Chrome](evidence/living-experience-v11-20261116/video/playback.json).

**Regresja i wydajność**

| Kontrola | PASS | FAIL | Dowód |
|---|---:|---:|---|
| Pełny Python / unittest | 176 | 0 | [python.log](evidence/living-experience-v11-20261116/python.log) |
| Pełny Node, włącznie ze starszym showroomem | 121 | 0 | [node.log](evidence/living-experience-v11-20261116/node.log) |
| Chrome / 26 grup scenariuszy | 26 | 0 | [checks.json](evidence/living-experience-v11-20261116/browser/checks.json) |
| Build, generator, składnia JS i lokalny vendor | PASS | 0 | [build.log](evidence/living-experience-v11-20261116/build.log), [check.log](evidence/living-experience-v11-20261116/check.log) |
| Staging jawnej paczki publicznej | 65 plików | 0 | [security-preservation.json](evidence/living-experience-v11-20261116/security-preservation.json) |

Nie usunięto dotychczasowych testów. Uzupełniono fixture allowlisty o manifest mediów i zmieniono oczekiwanie dwóch schematów na jeden schemat Remote oraz autentyczne ekrany Tax. Dodano test geometrii wspólnej ramy i kontrole jej ciągłości, paralaksy, wielkości produktów, gotowości obrazów oraz braku kolizji podpisów.

Przeglądarka sprawdziła 19 pozycji w czterech grupach mapy, wszystkie pełne trasy projektów, filtry katalogu, panele i galerię, głębokie linki, historię, Enter/Space/Escape i fokus, menu mobilne, Guide, dotyk emulowany, ograniczony ruch, brak JS, wymuszone kolory, brak Canvas, zawieszenie poza ekranem i cykl życia strony. Zdarzenia `pagehide/pageshow` były symulowane. **0 wyjątków JS, 0 naruszeń CSP, 0 żądań zewnętrznych.** Jedyną dopuszczoną odpowiedzią 503 był istniejący, nieskonfigurowany lokalnie token formularza zapytań; nie wysyłano formularzy ani nie pobierano APK.

Świeży pomiar: **ThinkPad T480s**, Chrome/ANGLE wskazuje **Intel UHD Graphics 620**, 1440×900, DPR 1, 3.537 s, **160 próbek rAF**. Mediana: **16.7 ms**, P95: **50.0 ms**, próbek powyżej 50 ms: **1**. Wywołania renderera sceny: 157. W bezruchu przez 1100 ms: **0 dodatkowych klatek**. Jest to krótki lokalny pomiar; występują wolniejsze klatki, więc nie deklaruję stałych 60 FPS. W kolejnych przejściach roboczych P95 zmieniało się między około 33 a 50 ms; powyżej podano ostatni wynik, nie najlepszy.

Optymalizacja obejmuje stały raster ramy skalowany transformacją, ograniczenie zmian jej ścieżki, warstwy koloru składane przez opacity, przygotowanie obrazów przed wejściem sceny oraz brak pętli rysującej w spoczynku. Zależności i lockfile pozostały niezmienione. Fizyczne przeglądarki telefonów i produkcja: **NOT TESTED**.

**Stan plików**

HEAD nadal **899580c**. Indeks Git jest pusty. Nie wykonano commitu, pushu ani deployu. Hashami sprawdzono zachowanie katalogu, marki, dotychczasowych publicznych obrazów i stron produktów, pilota Mail, prywatności, sitemap, generatora oraz plików zależności. Nie zniknął żaden wcześniejszy plik/katalog nieśledzony. Pierwsza sesja łącząca regresję i nagranie została przerwana zamknięciem Chrome; do odbioru służą wyłącznie końcowe katalogi `browser/` i `video/`, których ponowne kontrole przeszły.

Zmiany V1.1 względem zapisanej V1 (repozytorium przed sprintem zawierało już wcześniejsze zmiany):

- `assets/living-experience.css`
- `assets/living-experience.mjs`
- `index.html`
- `scripts/living_markup.py`
- `scripts/stage-public.py`
- `scripts/verify-living-experience.cjs`
- `templates/hero-installation.html`
- `tests/living-experience.test.cjs`
- `tests/test_living_experience.py`
- `tests/test_site_v5.py`
- `catalog/living-media.json`
- `assets/living/tax-documents.webp`
- `assets/living/tax-workflow.webp`
- `assets/living/vaeloria-world-entry.webp`

Dodatkowo ten raport i lokalne artefakty w `docs/evidence/living-experience-v11-20261116/`. Baseline, hashe i różnica sprzed V1.1 są zachowane obok dowodów.

Uruchomienie podglądu z katalogu repozytorium:

```bash
PK_PYTHON=.venv/bin/python PK_PREVIEW_PORT=8236 sh scripts/preview.sh
```

Podgląd działa wtedy pod `http://127.0.0.1:8236`. Serwery użyte przez QA zostały zakończone przez skrypty.
