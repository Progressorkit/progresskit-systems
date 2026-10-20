# ProgressKit V5 — final visual sprint (lokalny kandydat)

Data: 2026-10-15. Źródłem nadrzędnym jest najnowszy brief właściciela `b21f1fcf-8ba4-4301-878e-aad9198154e3/Wklejony tekst.txt`. Zastępuje on projektowanie osobnych paneli kategorii wspólną ekspozycją 360° i pojedynczym hologramem. Katalog, podstrony i zakres dowodów pozostają zachowane.

**Akceptacja wizualna: OPEN. Deployment: NOT DEPLOYED. Push: NOT RUN.**

## HERO i materiał

Jeden semantyczny nagłówek H1 brzmi **PROGRESSKIT SYSTEMS**, złożony w dwa wiersze. Lokalny DejaVu Serif Condensed Bold zapewnia stałą geometrię liter; plik fontu jest niezmieniony, licencja znajduje się w `assets/brand/monument-font-license.txt`. Jasnoszary kamień powstaje z kodowej tekstury SVG: nieregularnego ziarna, ciemnych żyłek, jasnych krawędzi spękań i warstwy subtelnych czerwonych odbić. Oddzielna warstwa krawędzi nadaje bryle głębię. To implementacja materiału, a jej realizm podlega odbiorowi właściciela.

Pejzaż i dokładny oryginalny PNG PK są osadzone w jednej scenie SVG 1983×793. Pozycja znaku jest określona na płaszczyźnie prawego muru, a cała sylwetka otrzymuje wspólne przekształcenie perspektywy. Filtr z kanału alpha oryginału tworzy kamienną powierzchnię, wewnętrzny cień i krawędź odbijającą czerwone światło. Zachowuje geometrię oryginału; nie dodano nowego monogramu ani prostokątnej plakietki. Plik źródłowy nie jest zmieniony.

- Oryginał PK SHA-256: `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
- Pejzaż SHA-256: `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
- Pochodzenie oczyszczonego pejzażu pozostaje opisane w `PROGRESSKIT_V5_HERO_ASSET.md`.

Reakcja na mysz przesuwa całą scenę maksymalnie o 5px/3px, dzięki czemu relief nie odrywa się od muru. Światło reaguje łagodnie; dodano wejście napisu i odsłonięcie reliefu. Brak migotania i glitch. Ruch jest wyłączany przez reduced motion, ukrycie karty i wyjście HERO poza widok.

## Ekspozycja i dane

Wspólna rolka zastępuje wcześniejsze osobne panele kategorii. Osobny katalog `/projekty/`, wyszukiwarka, galerie i pełne case studies pozostają funkcjonalnie niezależne.

Rozliczenie inwentarza pozostaje aktualne: **17 pozycji − 2 scalenia tożsamości − 1 brak źródeł = 14 wpisów**. Szczegóły i źródła: `PROGRESSKIT_V5_PROJECT_INVENTORY.md`. Nie powtarzano pełnego audytu produktów i nie dopisano fikcyjnych trzech projektów.

Kategorie liczone z katalogu: Aplikacje 3, SaaS 4 (w tym KAN SYSTEM), Platformy 1, Gry 1, WWW 2, Infrastruktura 3. Dziewięć zatwierdzonych screenshotów pozostaje niezmienionych. Brak obrazu produktu oznacza prezentację typograficzną, nie ilustrację udającą screenshot.

## Rolka360 i hologram

Ekspozycja ma pojedynczy element DOM na projekt. CSS transformuje centrum i bocznych sąsiadów po zakrzywionym torze; przejście ostatni→pierwszy używa indeksów kołowych bez klonów. Obsługa obejmuje przyciski, klawiaturę, przeciąganie, swipe i poziomy wheel. Zwykły pionowy scroll należy do strony. Bezwładność jest ograniczona, a przesunięcie od 12px tłumi przypadkowy click, również w kategorii z jednym projektem. Sterowanie jest ręczne; nie dodano autoplay.

Sześć metalicznych bram pokazuje chwilowy podgląd na hover. Opuszczenie przywraca zapisany filtr i centrum; klik utrwala kategorię bez przeładowania strony. Wszystkie projekty przywraca pełną kolekcję. URL zachowuje kategorię/projekt, parametry kampanii i ścieżkę; popstate odtwarza widok.

Wybór bocznego projektu najpierw centruje go (620ms), następnie otwiera projekcję (650ms; natychmiast przy reduced motion). Pojedynczy natywny dialog przygasza i blokuje rolkę, pokazuje rzeczywisty screenshot z podpisem albo typografię, nazwę, opis, problem, etap, technologie i CTA do pełnego case study. Dane trafiają do DOM jako textContent; URL są ograniczone do lokalnych materiałów i tras katalogu. Escape, przycisk i świadomy klik tła zamykają panel z odwróceniem animacji i zwrotem fokusu. Nowy projekt zaczyna od góry, a poprzednie timery nie zamykają nowej projekcji.

## Dalsze sekcje

O mnie i współpraca tworzą asymetryczną kompozycję z większą typografią, metalicznym podziałem i czytelnym CTA. Potwierdzone historie inżynieryjne są prezentowane jako numerowane analizy z natywnym rozwinięciem Problem → Diagnoza → Rozwiązanie → Wynik. Technologie prowadzą do rzeczywistych filtrów katalogu. Kontakt i pojedynczy brief otrzymały kompozycję z większym odstępem i mocną strefą akcji. Zapis TXT, druk/PDF i e-mail zachowują lokalny przepływ danych.

Reveal on scroll działa wyłącznie jako ulepszenie: bez JavaScript i IntersectionObserver treść pozostaje widoczna. Fokus odsłania interaktywną treść; reduced motion i druk wyłączają ukrywanie i ruch.

## QA i odbiór

**118 PASS / 0 FAIL / 0 SKIP** (82 Python + 36 Node) oraz osobno **102 PASS / 0 FAIL** lokalnych kontroli HTTP. Generator sprawdził23 pliki/20 HTML; publiczny artefakt zawiera53 pliki. Pełne logi i manifest wyników znajdują się w `docs/evidence/progresskit-v5/final-visual-*`. Kontrola składni JavaScript, parser czterech CSS i XML dwóch SVG przeszły. Niezależny review wykrył i potwierdził poprawki pojedynczego swipe→click oraz pozycji przewinięcia dialogu; mają testy regresji. Odczyt źródeł i testy stanu nie są dowodem renderu, gestów ani płynności na fizycznym telefonie.

Połączenie Browser nie jest dostępne: wybór dla lokalnego URL zwrócił `No browser is available`, a wspierana diagnostyka discovery zwróciła pustą listę. Nie wykonano zrzutów finalnego renderu, pomiaru Lighthouse ani testów klawiatury/gestów w rzeczywistej przeglądarce. Nie oznaczamy ich jako PASS.

Do ręcznego odbioru pozostają: kadr320/390/768/1024/1440/1920, wygląd marmuru i reliefu, natężenie światła, czytelność, płynność rolki, drag/swipe/wheel bez blokowania przewijania strony, filtre3/4/1/1/2/3, Escape/fokus w hologramie, reduced motion i użyteczność briefu.

Nie uruchamiać publikacji przed wyraźną akceptacją właściciela. `ownerVisualApproval` nadal ma wartość OPEN, a bramka CI ją egzekwuje.

## Lokalny kandydat i preview

Kontynuowana gałąź: `codex/progresskit-v5-20261015`, worktree `/tmp/progresskit-v5-review`, po wcześniejszych commitach `cca27e0` i `f7fce8f`. Ostateczny HEAD oraz stan źródeł są zapisane w `release.json` obok paczki `/tmp/progresskit-v5-final-visual-release/progresskit-v5-public.tar.gz`. Nie przełączano ani nie resetowano głównego folderu użytkownika; zastany cinematic pozostaje poza wydaniem. Nie przenosić wstecz starszych lokalnych `.gitignore`/requirements na zaktualizowaną bazę gałęzi.

Nowe preview: **http://127.0.0.1:8093/**. Poprzedni serwer 8092 jest pozostawiony bez zmian. Nowy proces ma osobną bazę `/tmp/progresskit-final-visual-preview/product.db`; nie zapisuje danych produkcyjnych. Instrukcja i wszystkie nierozstrzygnięte kontrole: `PROGRESSKIT_V5_VISUAL_ACCEPTANCE.md`.
