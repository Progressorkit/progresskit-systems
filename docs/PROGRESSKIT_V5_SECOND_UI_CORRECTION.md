# ProgressKit V5 — druga korekta UI i niezależny przegląd

**Aktualizacja nadrzędna:** późniejszy brief
`/home/pawe/.codex/attachments/b21f1fcf-8ba4-4301-878e-aad9198154e3/Wklejony tekst.txt`
zastępuje wariant dużych paneli kategorii centralnym showroomem 360° oraz jednym
dialogiem holograficznym. Starsze ustalenia panelowe niżej są śladem przeglądu
poprzedniego wariantu, nie aktualnym zaleceniem implementacji. Aktualny kontrakt
i nowy odczyt źródeł zapisano w końcowej sekcji tego dokumentu.

**Końcowy odczyt integracji 360°:** wykonany poniżej, razem z dwiema reprodukcjami
P2 i ponownym sprawdzeniem poprawek. Nie zastępuje przeglądarki ani akceptacji
wizualnej. Wpisy „w toku” w części wcześniejszej opisują etap przed tą integracją.

Data: **2026-10-15**. Zakres tej iteracji: odczyt wymagań, bieżącego HTML/CSS/JS
i istniejących testów oraz oględziny trzech obrazów. **Nie zmieniano kodu, testów,
konfiguracji ani assetów. Nie uruchamiano testów ani operacji Git/deploy.**

Źródło nadrzędne:
`/home/pawe/.codex/attachments/ad607f2e-221a-4dc2-a565-127e3d901cbe/Wklejony tekst.txt`.
Właściciel opisuje uwagi po realnym przeglądzie poprzedniego preview. Tego
potwierdzenia nie przedstawiamy jako wykonania przeglądarkowego przez agenta.
Nowy rezultat po drugiej korekcie nadal wymaga osobnego odbioru.

## Zachowany zakres i zmienione wymagania

Zachować katalog, 14 wpisów, 9 rzeczywistych screenshotów, aliasy, case studies,
routing, testy, dystrybucję produktów, backup użytkownika i zakaz publikacji.
Krajobraz gór, księżyca, muru i czerwonego światła pozostaje przyjętym kierunkiem.

Druga korekta zmienia wcześniejszą decyzję o małej sygnaturze PK w prawym dolnym
rogu: oryginalny znak ma teraz być osadzony w ścianie jako element architektury.
Ta nowsza instrukcja ma pierwszeństwo przed starym opisem sygnatury w dokumentacji.
Nie oznacza zgody na narysowanie lub wygenerowanie nowego logo.

Wymagane: **PROGRESSKIT SYSTEMS** w jednym monumentalnym nagłówku, rzeczywista
faktura kamienia/marmuru, większe strefy kategorii, bardziej przestrzenna kompozycja
sekcji, subtelny ruch, lepiej osadzone O mnie/CTA oraz dopracowany kontakt.
Nie wolno wrócić do pełnego gridu produktów na homepage ani usunąć osobnego indeksu.

## Odczytany stan przed implementacją tej korekty

| Obszar | Ustalenie z odczytu | Status dowodu |
| --- | --- | --- |
| Główny nagłówek | `scripts/build-site.py:312` i wygenerowane `index.html:39` zawierają tylko PROGRESSKIT | FINDING: brak SYSTEMS względem nowego wymagania; bez uruchomienia testu |
| Materiał napisu | `assets/site-v5.css:197`–`:216`: gradienty, regularne ukośne pasy i warstwowy cień | Kod potwierdzony; efekt kamienia nie został zaakceptowany przez właściciela |
| Logo | `assets/site-v5.css:231`–`:246`: niezależny element przy prawym dolnym rogu, szerokość 100 px | FINDING: pozycjonowanie sygnatury nie spełnia nowego wymogu integracji ze ścianą |
| Mobile logo | `assets/site-v5.css:399`–`:403`: osobna sygnatura 88 px, tło 70% center | Ryzyko niezależnego ruchu logo względem muru; nowego renderu nie testowano |
| Kategorie | `assets/site-v5.css:292`–`:340`: wysuwany panel pod gridem, karty z małymi obrazami | Mechanizm istnieje; właściciel uznał obecną ekspresję za niewystarczającą |
| Hover i obsługa | `assets/site-v5.js:66`–`:152`: natywne details rozszerzone o wskaźnik, URL, zamknięcie i focus | Nie usuwać istniejących zachowań podczas przebudowy strefy |
| Obecny test hero | `tests/test_owner_correction.py:83`–`:93` wymaga dosłownie starego H1 PROGRESSKIT i klasy sygnatury | Test opisuje poprzednie wymaganie; nie jest kryterium akceptacji nowego hero |
| Pozostałe testy właściciela | `tests/test_owner_correction.py:41`–`:100`: kolejność, katalog, aliasy, linki, jeden brief i bramka publikacji | Zachować zakres ochrony; nowa kompozycja wymaga rozszerzenia wymagań |
| Akceptacja | `catalog/brand.json`: ownerVisualApproval OPEN | Publikacja nadal zabroniona |

Wskazane numery wierszy dotyczą stanu odczytanego przed implementacją drugiej
korekty. Testów nie uruchamiano w tym podzadaniu, dlatego nie podano ich PASS/FAIL.

## Oryginalny copper stamp: co naprawdę zawiera plik

Obejrzano `assets/brand/progressorkit-stamp.png`, oczyszczony krajobraz
`assets/brand/hero-landscape-v5.webp` i pierwotną pełną makietę właściciela.

Plik logo jest bajtowo zgodny z `/home/pawe/Pulpit/logopkpod.png`:

- 1254×1254 RGBA;
- SHA-256 `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`;
- wszystkie cztery skrajne piksele mają alpha 0;
- **1 030 682 z 1 572 516 pikseli** jest całkowicie przezroczystych;
- kanał alpha obejmuje zakres 0–255; widoczne są oryginalne stalowe i miedziane fragmenty.

Logo nie ma wypalonej prostokątnej tabliczki wymagającej usunięcia.
Efekt „doklejonej plakietki” wynika z niezależnego rozmiaru, pozycji i braku
wspólnej perspektywy z murem. Nie ma potrzeby wycinać tła, retuszować kształtu
ani zlecać ponownego wygenerowania znaku.

## Zalecane osadzenie dokładnego oryginału w murze

1. **Wspólna płaszczyzna sceny.** Krajobraz i znak muszą korzystać z tego samego
   układu współrzędnych 1983×793 oraz jednego przekształcenia kadru. Wspólna
   warstwa SVG z zachowaniem oryginalnych rastrów przez `image href` albo wspólny
   kontener sceny CSS pozwala osadzić logo w konkretnej części muru. Sama zmiana
   wartości right/bottom na procenty viewportu nie wiąże go z teksturą ściany.
2. **Dokładny obraz jako wierzchnia warstwa.** Użyć istniejącego PNG przez src/href,
   bez przerysowania, zamiany monogramu, koloryzowania lub generowania nowego logo.
   Hash pliku pozostaje niezmieniony. Możliwa jest projekcja całego obrazu na
   płaszczyznę muru; nie należy deformować osobno liter lub miedzianego łuku.
3. **Bez prostokątnej plakietki.** Kontener znaku nie ma własnego tła, obramowania,
   zaokrąglonego panelu, paddingu tworzącego tablicę ani prostokątnego box-shadow.
   Przezroczystość oryginału ujawnia istniejącą teksturę ściany wokół znaku.
4. **Kontakt z materiałem, nie nowy rysunek.** Delikatny cień kontaktowy i cienka
   krawędź reliefu mogą wynikać z dokładnej sylwetki alpha tego samego PNG, za
   oryginałem. Wierzchnie IMG pozostaje czytelne, bez filtra zmieniającego barwy.
   Ograniczyć efekt do otoczenia konturu: szeroka poświata ponownie zrobiłaby badge.
   Ostateczny stopień „wykucia” musi ocenić właściciel — nie deklarować go z samego CSS.
5. **Perspektywa odpowiada murowi.** Wybrać dobrze widoczną płaszczyznę po prawej
   i dopasować transformację całego znaku do jej spoin/krawędzi. Współrzędne
   i kąty są parametrami do obejrzenia w realnym preview, nie potwierdzonymi
   wartościami wynikającymi z tego audytu.
6. **Mobile zachowuje miejsce w świecie.** Przy zmianie kadrowania przesuwa się
   wspólna scena. Dla wąskiego ekranu trzeba wybrać kadr pokazujący docelowy mur
   wraz ze znakiem, zamiast odrywać logo od muru i ponownie przykleić do narożnika.
   Obecne cover/70% center może wyciąć fragment ściany; wymaga to nowej kontroli.

To rekomendacja implementacyjna, nie wykonany retusz ani zatwierdzony render.
Źródłowy krajobraz i logo pozostają oddzielnymi oryginalnymi assetami. Nie potrzeba
generowania kompozytu ze zmienionym znakiem.

## Kamienny nagłówek PROGRESSKIT SYSTEMS

Jedno semantyczne H1 powinno mieć pełną treść PROGRESSKIT SYSTEMS. Dopuszczalne są
dwie celowo ułożone linie z dwoma spanami, ale nie dwa niezależne nagłówki ani
powtórzony tekst czytany wielokrotnie przez czytnik ekranu. Wąski ekran wymaga
kontrolowanego łamania; przeniesienie obecnego nowrap na pełną nazwę grozi overflow.

Zamiast polegać wyłącznie na regularnych pasach i dużym cieniu należy użyć
nieregularnej, rzeczywistej faktury kamienia z zaakceptowanego materiału
(np. odpowiednio ustawiony fragment istniejącej ściany w background-clip:text).
Zachować żywy tekst i prosty czytelny fallback. Płytki kontaktowy cień, ograniczone
krawędzie oraz małe czerwone odbicie mogą nadać głębię bez wyglądu plastikowej
ekstruzji. Nie umieszczać kolejnego logo wewnątrz napisu. Efekt faktury, czytelność
i ciężar pozostają przedmiotem oględzin, nie warunkiem możliwym do zaliczenia testem stringa.

## Kategorie i sekcje niżej: kontrakt bez utraty funkcji

Duża strefa ma wyraźnie zmieniać kompozycję sekcji. Rozważyć układ bramy/kategorie
i obszerną scenę projektów obok lub pod nimi, zamiast lekkiego dropdownu pod rzędem.
Prezentacja ma wykorzystywać prawdziwe obrazy z katalogu, nazwę, zastosowanie,
etap i przejście do case study. Projekty bez obrazu nie dostają makiety zastępczej.

Zachować jeden otwarty obszar, bezpieczne przejście kursora, kliknięcie poza,
Escape, powrót fokusu, tap i natywną obsługę bez JavaScript. Ruch nie może zmieniać
hitboxu podczas dojścia do linku. Rozmiar i ruch nie mogą wypychać zamknięcia poza ekran.

Sekcje O mnie, wyzwania, technologie oraz kontakt mają różny rytm i głębię.
Reveal-on-scroll może być jednorazowy i subtelny; treść ma być domyślnie widoczna
bez JavaScript, w reduced motion i po awarii obserwatora. Nie wprowadzać animacyjnej
biblioteki dla samych przejść. Zachować mocne CTA, jeden lokalny brief, działające
linki i brak fikcyjnych kompetencji.

## Plan odbioru przez finalnego reviewera

| Kontrola | Metoda po implementacji | Obecny stan |
| --- | --- | --- |
| Pełny tytuł | Odczyt tekstu jednego H1 i screen desktop/mobile | NOT RUN po korekcie |
| Materiał napisu | Oględziny realnego preview: nieregularna faktura, głębia, czytelność, brak plastiku | OPEN |
| Oryginalność PK | Porównanie SHA PNG i src/href użytego w scenie | Przed korektą zgodne; po korekcie NOT RUN |
| Osadzenie PK | Screen dużego i małego ekranu: znak na tej samej płaszczyźnie muru, bez tabliczki i oderwania przy cropie | OPEN |
| Krajobraz | Porównanie z zaakceptowanym źródłem i obecnym oczyszczonym tłem | Oględziny plików wykonane; nowy render OPEN |
| Kategorie i dane | Wszystkie 6 stref, dokładnie 14 wpisów, brak duplikatów, prawdziwe galerie i routing | NOT RUN po korekcie |
| Interakcje | Desktop hover/pointer bridge, mobile tap, Tab/Enter/Escape/ArrowDown, focus, URL/back | NOT RUN po korekcie |
| Ruch i czytelność | Reduced motion, no-JS, brak layout jump i poziomego scrolla, treść po błędzie JS | NOT RUN po korekcie |
| Kontakt/CTA | Rzeczywiste linki i pojedynczy syntetyczny brief TXT/druk | NOT RUN po korekcie |
| Testy techniczne | Najpierw wymagania nowej korekty, następnie odpowiedni zestaw regresyjny | NOT RUN w tym przeglądzie |
| Publikacja | Stan OPEN nadal blokuje produkcję; bez deploy | OPEN / NIE WYKONYWAĆ |
| Akceptacja kompozycji | Właściciel ocenia konkretny nowy preview | OPEN |

Istniejący test dosłownego H1 należy zmienić dopiero w ramach implementacji nowego
wymagania: najpierw wykazać, że pełna nazwa nie jest jeszcze spełniona, następnie
sprawdzić nową treść i zachowane inwarianty. Nie oznaczać starego zielonego testu
jako dowodu zgodności z nową korektą. Testy automatyczne nie zastąpią oceny reliefu,
kamienia, energii sekcji ani akceptacji właściciela.

Werdykt tego przeglądu: **wymagania i konkretne różnice zidentyfikowane; implementacja
oraz finalny odbiór nowego preview pozostają do wykonania**. Bez nowego PASS UI.

## Aktualizacja po integracji R2 i nowym briefie showroomu 360°

W kolejnym odczycie sprawdzono zintegrowane źródła R2: `templates/hero-scene.svg`,
`assets/hero-monument.css`, `assets/brand/stone-material.svg`,
`assets/category-worlds.css`, `assets/home-atmosphere.css`, istniejący JavaScript,
generator i zmieniony test właściciela. Nie edytowano kodu/testów ani nie wykonywano
ich przebiegów w tym przeglądzie. Następnie nadszedł nadrzędny brief 360°;
showroom oraz hologram wymagają jeszcze osobnego przeglądu po ich integracji.

| Odczyt R2 | Ustalony fakt | Granica |
| --- | --- | --- |
| Nagłówek | Generator ma jedno H1 z nazwą dostępną PROGRESSKIT SYSTEMS i dwiema liniami tekstu | Stary brak SYSTEMS usunięto w kodzie; wygląd i nazwa w realnym czytniku nadal wymagają odbioru |
| Dokładny PK | `templates/hero-scene.svg:23`–`:24` odwołuje się do tego samego PNG, we wspólnym viewBox 1983×793, z projekcją całego obrazu | Brak nowej geometrii PK; źródłowy hash pozostaje b41bda6…; relief w renderze OPEN |
| Relief | Filtr SVG wyprowadza cień i krawędź z SourceAlpha, następnie dodaje SourceGraphic | Nie jest nowym logo; opacity 0.82 i wspólne przyciemnienie sceny wpływają na rezultat wizualny |
| Materiał | Stone SVG wykorzystuje proceduralne ziarno, linie pęknięć i displacement | To materiał proceduralny, nie fotografia marmuru; nie nazywać go zatwierdzonym realistycznym kamieniem bez oględzin |
| Font | Lokalny plik fontu i licencja są w publicznym allowliście; brak zewnętrznego pobierania fontu | Diagnostyczny pomiar metryk wskazywał zmieszczenie tytułu 320–1920 px, ale nie jest dowodem layoutu przeglądarki |
| Współrzędne | Obraz krajobrazu i logo poruszają się w tej samej scenie SVG; mobile skaluje całą scenę | Kadrowanie na breakpointach, w szczególności 1050/1051 i 600 px, wymaga rzeczywistych screenshotów |
| Reveal | Treść jest widoczna domyślnie; observer uruchamia pending, focus odsłania treść, catch/reduced motion odsłania całość | Brak potwierdzenia animacji w przeglądarce; nie przyznano PASS UI |
| Duże panele | Istnieje wariant w normalnym przepływie z pinningiem i 180 ms zamknięciem hover | **Zastąpiony** przez najnowsze filtrowanie showroomu; nie rozwijać kolejnego dropdownu |

Nie znaleziono potwierdzonego źródłowo błędu blokującego dotychczasowe SVG hero.
To wąski wynik przeglądu kodu, nie pełny brak błędów i nie akceptacja wizualna.
Oględziny generowanych plików obrazów i metryki fontu nie zastępują browser QA.

### Aktualne rozliczenie 17 vs 14

Nie powtarzano discovery. Istniejący inwentarz
`PROGRESSKIT_V5_PROJECT_INVENTORY.md:9`–`:31` rozlicza wszystkie 17 pozycji:
**17 − 2 scalenia − 1 brak źródeł = 14 wpisów**. Scalenia to #10/#11
Lejek/Marek/Obserwator oraz #12/#14 RWR/KAN SYSTEM; #13 P.A. Barczewska nie ma
odnalezionego źródła w dostępnym zakresie. Nie dopisuje się trzech fikcyjnych produktów.

Showroom domyślnie otrzymuje wszystkie 14 rekordów z katalogu. Kategorie:
3 mobile, **4 saas z KAN SYSTEM**, 1 platforms, 1 games, 2 web, 3 technology.
Przykładowa trzyproduktowa lista SaaS w briefie nie usuwa potwierdzonego KAN.
Produkt bez obrazu otrzymuje neutralną prezentację typograficzną, a `stage:null`
zachowuje komunikat o niepotwierdzonym etapie.

### Kontrakt nowego showroomu i hologramu

Kategorie stają się sześcioma bramami filtra centralnej rolki. Hover może
tymczasowo podglądać/wyróżniać zakres; kliknięcie ustawia trwały filtr.
Wyjście kursorem nie może kasować filtra ustawionego kliknięciem. Widoczny
powrót do wszystkich projektów przywraca całą dostępną kolekcję z danych.
Nie zostają równolegle stary dropdown i nowa rolka.

Rolka ma sterowanie przyciskami, klawiaturą, przeciąganiem, gestem dotyku i
kontrolowanym przewijaniem. Przeciągnięcie musi wyłączyć późniejszy przypadkowy
click otwierający projekt. Gest poziomy nie powinien blokować zwykłego pionowego
scrolla telefonu. Małe zestawy 1, 2, 3 i 4 projektów oraz komplet 14 wymagają
sprawdzenia bez dublowania semantycznych projektów i bez dzielenia przez zero.

Autoodtwarzanie jest opcjonalne, bardzo wolne i ma widoczną pauzę. Zatrzymuje się
po interakcji, hover/focus, otwarciu hologramu, ukryciu karty i przy reduced motion.
Wyjście kursora lub zamknięcie dialogu nie może samoczynnie cofać świadomej pauzy.
Ruch w tle nie może zmieniać celu skupionego linku.

Wybrany projekt otwiera **jeden** dialog holograficzny, oparty na tym samym
katalogu. Pokazuje prawdziwy obraz lub typografię, nazwę, opis, problem, etap,
technologie i link do pełnego case study. Nie kopiuje całej podstrony do modala.
Zamknięcie przez przycisk/Escape i ewentualne tło zwraca focus do właściwego
elementu rolki lub sensownego fallbacku, jeżeli filtr usunął jego wyzwalacz.
Autoplay i obsługa klawiszy rolki pozostają wstrzymane podczas dialogu.

Bez JS wszystkie produkty i case studies nadal muszą mieć dostępne zwykłe linki;
brak wsparcia dialog.showModal nie może odcinać dostępu. Dialog nie może przechwytywać
linków z Ctrl/Cmd, środkowym przyciskiem lub klawiaturową alternatywą otwarcia w karcie.

### Nowe efekty hero: inwarianty review

Subtelna paralaksa przesuwa **cały SVG sceny**. Nie wolno animować położenia logo
niezależnie od muru. Ruch powinien być ograniczony, obsługiwany przez najwyżej
jedno oczekujące requestAnimationFrame i wyłączony dla dotyku/reduced motion.
Po opuszczeniu hero lub ukryciu karty scena wraca do stabilnego stanu; nie pozostają
niekończące się timery i zlecenia klatek. Nie przesuwać hitboxów interaktywnych CTA.

Wejście napisu, odsłonięcie PK i światło mogą być subtelne; warstwy światła muszą
mieć pointer-events:none. Bez JS i reduced motion treść, logo i linki nie pozostają
przezroczyste. Bezpośredni podgląd reliefu, faktury, kroju i kadrowania pozostaje
obowiązkowy. Żadna animacja nie zmienia oryginalnego pliku logo ani jego geometrii.

### Punkty szczególnie podatne na regresje integracji

- Usunąć/wyłączyć stare handlery categoryBrowser szukające category-panel/close,
  jeżeli ten sam selektor zostaje użyty przez nowe bramy. Nieprawidłowe założenie
  o obecności starego panelu może zakończyć JS wyjątkiem i zablokować resztę strony.
- Otwieranie hologramu nie może propagować gestu drag jako zwykłego kliknięcia;
  przy anulowaniu pointercapture stan ma wrócić do bezpiecznej pozycji.
- Klawisze strzałek rolki nie mogą obsługiwać aktywnego input/textarea/select,
  modala ani przechwytywać pionowego scrolla bez jawnego zamiaru interakcji z rolką.
- Przy zmianie filtra podczas focusu nie ukryć aktywnego elementu bez sensownego
  zwrotu fokusu. Po powrocie do wszystkich projektów nie odtwarzać starego modala.
- Zestawy 1 i 2 wpisów wymagają oddzielnej kontroli: brak wrażenia pustego obrotu,
  poprawny stan przycisków oraz brak automatycznego ruchu bez sensownej zmiany.

### Stan przy przyjęciu najnowszego briefu — zapis historyczny

Na tym etapie implementacja showroomu, pojedynczego hologramu i efektów hero
była w toku. Końcowy odczyt gotowych plików opisano w następnej sekcji.
Próby browser tool kończyły się getForUrl error / pustą listą narzędzi po
troubleshootingu; nie odtworzono nowego UI w przeglądarce. Testy Python uruchamia
koordynator i to jego pełny zakończony raport określi wyniki — nie częściowy stdout.

**Wówczas showroom, hologram, gesty, finalne kadrowanie, Lighthouse i odbiór
właściciela pozostawały OPEN / NOT RUN.** Nie wykonano push ani produkcyjnego
deploymentu; bramka akceptacji właściciela pozostaje wiążąca.

## Końcowy niezależny przegląd zintegrowanego kodu 360°

Sprawdzono źródła showroomu i hologramu JS/CSS, `hero-space.js`,
`hero-monument.css`, scenę SVG, renderer showroomu, integrację generatora,
serializowane dane i wynikowy HTML. Nie uruchamiano przeglądarki inną drogą.
Nie zmieniano kodu ani testów. Testy pełnego zestawu uruchamia i raportuje
koordynator; tutaj wykonano tylko opisane niżej odczyty i ukierunkowane reprodukcje
handlerów z istniejącymi adapterami syntetycznego DOM.

### Dwa znalezione P2 i ich zamknięcie

**R360-01 — swipe przy jednym projekcie otwierał hologram.** Przed poprawką
`assets/project-showroom.js:224` kończył pointerdown dla `items.length < 2`.
Uniemożliwiało to zapis dx/dy i ustawienie ochrony przed późniejszym compatibility
click. Reprodukcja rzeczywistych handlerów: filtr Gry → pointerdown (200,10) →
pointermove (20,11) → pointerup → click na karcie. Wynik przed poprawką:
`opened:[project-3]`, pozycja 1/1. To potwierdzenie stanu JS w syntetycznym DOM,
nie test fizycznego gestu telefonu.

Poprawkę wdrożył właściciel komponentu: pointerdown rejestruje gest także dla n=1,
natomiast pointermove wyłącza samą projekcję i obrót (`:223`–`:249`). Powtórzenie
tej samej reprodukcji przez niezależnego reviewera dało `opened:[]`, pozycja 1/1.
Istniejący test singletona rozszerzono o click po swipe/cancel i późniejszy
prawidłowy click. **ZAMKNIĘTE w zakresie źródeł i reprodukcji handlerów**;
fizyczny touch pozostaje OPEN.

**R360-02 — nowy projekt dziedziczył scroll poprzedniego hologramu.** Wspólna
powierzchnia `overflow:auto` była zachowywana, a `render` nie zerował scrollTop.
Reprodukcja: otwórz A → ustaw scrollTop 600 → zamknij → otwórz B. Przed poprawką
B miał fazę open i nadal scrollTop 600; może to ominąć tytuł i górny materiał
nowego projektu. Toolbar jest sticky, a focus używa preventScroll, więc sam
focus przycisku zamknięcia nie jest celowym resetem prezentacji.

Poprawkę wdrożył właściciel hologramu: `assets/project-hologram.js:108`–`:110`
zeruje scroller przy renderowaniu, przed wejściem fokusu. Ta sama reprodukcja
po poprawce dała B/open, scrollTop 0. Dodano regresję w
`tests/project-hologram.test.cjs:297`–`:313`, obejmującą ponowne otwarcie oraz
zmianę projektu w otwartym dialogu. **ZAMKNIĘTE w zakresie źródeł i adaptera DOM**;
rzeczywisty scroll dialogu na urządzeniu pozostaje OPEN.

### Pozostałe fakty potwierdzone podczas review

- Wygenerowany HTML ma **14 kart, 14 unikalnych project-id, 14 rekordów JSON,
  jeden dialog hologramu i zero zduplikowanych DOM id**. Brak klonów kart.
  Normalizacja hologramu zachowuje wszystkie 14 tożsamości.
- Kategorie wynikają z danych: mobile 3, saas 4, platforms 1, games 1, web 2,
  technology 3. Ignira, Obserwator i KAN pozostają bez zgadywanego etapu.
- Zwykłe linki case studies istnieją w renderze przed JS. Bramy i sterowanie są
  ujawniane dopiero po inicjalizacji; bez JS kolekcja pozostaje poziomą listą
  autentycznych linków. Brak showModal ma jawny fallback na prawdziwy URL projektu.
- Hover jest podglądem stanu, kliknięcie utrwala filtr, a pointerleave odtwarza
  poprzedni podgląd bez kasowania utrwalonego filtra. Hover nie ukrywa aktualnie
  skupionego linku. URL zachowuje niezwiązane query i kampanie; ruch wykorzystuje
  replaceState, a odczyt popstate odtwarza żądany stan. Sam odczyt kodu nie jest
  testem przycisku Wstecz w rzeczywistej przeglądarce.
- Rolka nie ma autoplay ani jego timerów; model ruchu jest ręczny. Zestaw n=1
  wyłącza przyciski obrotu. Poziomy gest jest rozpoznawany przed pointer capture,
  pionowy scroll ma pozostać natywny. Faktyczne zachowanie touch-action i panningu
  jest nadal do sprawdzenia w przeglądarce.
- Showroom i hologram komunikują otwarcie/zamknięcie, zamrażają obrót i anulują
  oczekujące gesty/otwarcia. Dialog korzysta z textContent i kontrolowanych lokalnych
  URL, tokenów cyklu, natywnego Escape oraz zwrotu fokusu po odmrożeniu rolki.
- `hero-space.js` przesuwa cały SVG, nie logo osobno. Używa najwyżej jednego
  oczekującego requestAnimationFrame i resetuje ruch po pointerleave, hidden,
  pagehide oraz zmianie reduced motion. Pętla światła jest uzależniona od widoczności.
- Scena SVG nadal odwołuje się do oryginalnego PNG. Niezależnie odczytany SHA-256:
  `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
  Filtr materiału wyprowadza z SourceAlpha kamień, cień i krawędź oraz domieszkę
  oryginalnej barwy; geometria znaku pochodzi wyłącznie z tego rastra. To świadoma
  zmiana renderowania reliefu, nie zachowanie nieprzefiltrowanego koloru na ścianie.
  Identyfikacja nawigacji nadal używa oryginalnego znaku.

### Rewizje plików odczytanych po poprawkach

Ponieważ review nie wykonuje operacji Git, ślad konkretnego stanu stanowią hashe:

| Plik | SHA-256 |
| --- | --- |
| `assets/project-showroom.js` | `6462b119061cbb473ac1816d9b2eb96a56351a1a740d4fe8cfffe6c3ab4e600a` |
| `assets/project-hologram.js` | `b78d4ddc6483d238f64e72ee2d0daaf9254091e135acfdec3377d4af06be2f08` |
| `assets/hero-space.js` | `03a53bffaf703891f893250ce8ff0f5e19fa98fe1e18f23df73e78f21c05eddd` |
| `templates/hero-scene.svg` | `7fa04cf899bfa07f7ba1ffc327036143a2df520f1f2fc4e8299c65b3de32fef0` |
| `assets/hero-monument.css` | `90b3e966ec0ff4bbc6019c58a7d1dc673816f85ef6624914fd6e4e3c06ef1dd2` |
| `scripts/showroom_markup.py` | `53caf60f047fa18e85cf0c608f9b0a9eaf9a54dfedc2a93a1dffce4d690e85b6` |

### Werdykt review

**Dwa wykryte P2 poprawiono i ponownie odtworzono właściwy wynik w adapterach
handlerów. Nie znaleziono kolejnego potwierdzonego błędu blokującego w odczytanym
zakresie.** Nie jest to deklaracja pełnej zgodności, braku wszystkich regresji
ani sukcesu wizualnego.

**OPEN:** render/kadrowanie na breakpointach, odbiór reliefu i marmuru, prawdziwe
gesty/klawiatura/focus w browserze, płynność i wydajność, Lighthouse oraz akceptacja
właściciela. `ownerVisualApproval` nadal OPEN. Status produkcyjny: NOT DEPLOYED.
Nie oznaczono żadnej niewykonanej kontroli przeglądarkowej jako PASS.
