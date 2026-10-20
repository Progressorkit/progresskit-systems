# V5 — niezależny review orbitalnego showroomu

Data rozpoczęcia: 2026-10-15. Zakres review: renderer showroomu, jego JS/CSS,
istniejące testy i współpraca z pojedynczym hologramem. Koordynator edytuje
renderer/JS, autor CSS posiada arkusz showroomu. Reviewer zmienia wyłącznie
ten dokument; nie zmienia kodu ani testów repozytorium i nie wykonuje operacji
Git/deploymentu. Nie uruchamia alternatywnego Playwright ani innej przeglądarki.

## Odczyt istniejącej walidacji

W `tests/project-showroom.test.cjs` istnieje 10 testów, w
`tests/project-hologram.test.cjs` 14. W tym etapie odczytano ich źródła;
**nie jest to nowe uruchomienie testów ani wynik orbitalnej implementacji**.

| Zakres obecnego testu | Co faktycznie sprawdza | Luka dla nowej orbity |
| --- | --- | --- |
| Showroom `:47–55` | Wrap i unikalne signed offsets dla n=1/3/14 | Brak n=2/4, współrzędnych, projekcji i głębokości |
| Showroom `:57–70` | Wybrana karta centralna przed otwarciem; wait650ms/reduced motion | DOM state i czas, bez renderu transformacji |
| Showroom `:72–94` | Trwały filtr, odwracalny hover, q/UTM i brak mutacji danych | Synthetic SaaS ma 10 pozycji, nie rzeczywiste 4 |
| Showroom `:95–114` | Singleton, swipe/vertical/cancel→click suppression | Singleton jest objęty handlerami, n=2/4 nie |
| Showroom `:116–148` | Gesty, rAF cleanup, ograniczone kroki, wheel i modal lock | Nie dowodzi działania touch-action/capture na urządzeniu |
| Showroom `:150–165` | URL roundtrip/popstate, zamknięcie, zachowanie q/UTM | Bez natywnego browser Back i oceny animacji po przywróceniu |
| Hologram `:132–174` | Bezpieczne URL/media, neutralny brak obrazu, textContent, focus call | Nie dowodzi wyglądu orbity ani mapowania nowych hitboxów |
| Hologram `:176–267` | Escape, cykle reopen, stale timer, fallback focus/modal, backdrop | Zachować kontrakt zdarzeń i właściwy trigger z orbity |
| Hologram `:269–313` | Stary image error, reentrant open, scroll reset nowego projektu | Nie zastępuje wspólnej próby showroom→dialog→showroom |

Istniejący adapter showroomu używa 14 syntetycznych rekordów:
3 mobile + 1 games + 10 saas (`tests/project-showroom.test.cjs:7`).
Rzeczywisty katalog ma 3 mobile, 4 saas, 1 platforms, 1 games, 2 web,
3 technology. Końcowy review powinien objąć oba rzeczywiste singletony,
WWW n=2, mobile/technology n=3, SaaS n=4 oraz komplet n=14.

## Minimalna sensowna walidacja geometrii

Nie wystarczy potwierdzić unikalnych indeksów. Unikalne indeksy mogą otrzymać
identyczne transformacje, wyjść poza powierzchnię albo trafić wszystkie na tył.
Poniższe kontrole dotyczą obserwowalnych inwariantów, bez przepisywania wzoru
implementacji do oczekiwanego wyniku.

1. **Jedna parametryzowana kontrola geometrii** dla n=1/2/3/4/14 i każdego
   aktywnego indeksu: wszystkie zwracane/ustawiane współrzędne, kąty, skale
   i opacity są skończone; skale dodatnie, opacity w [0,1], brak NaN/Infinity.
   Aktywna karta ma pozycję przednią zgodną z kontraktem CSS oraz najwyższą
   czytelną warstwę. Nieaktywne projekty nie zajmują tej samej pozycji 3D.
2. **Periodyczność i osiągalność:** po n krokach wraca ten sam aktywny projekt
   i równoważna geometria. Ruch w obie strony oraz wrap last→first odwiedzają
   każdy ID dokładnie raz na pełen obrót. Żaden projekt nie wymaga klona DOM.
3. **Symetria i przypadki małych zbiorów:** dla nieparzystych kolekcji sąsiedzi
   po obu stronach nie otrzymują przypadkiem tej samej projekcji/przodu.
   n=2 ma jawny stabilny wariant; n=1 nie dzieli przez zero i nie animuje obrotu.
   Jeśli promień wynika z `1/tan(pi/n)`, trzeba osobno zabezpieczyć n=1/2.
4. **Jeden odczyt kontraktu JS↔CSS:** wszystkie ustawiane właściwości niestandardowe
   są konsumowane przez właściwą transformację, z właściwymi jednostkami.
   Sprawdzić kolejność transformacji, faktyczny z-index/depth oraz reguły
   `backface-visibility`, overflow i pointer events. Jednostka deg/rad lub
   translateZ w złej kolejności może przejść test signed offset.
5. **Jedna kontrola krótkiej zmiany indeksu i centrowania:** przejście sąsiednie,
   także last↔first, nie zleca niezamierzonego prawie pełnego obrotu wskutek
   interpolacji kąta 0↔360. Wybrany nieaktywny projekt dociera do przodu przed
   otwarciem dialogu; wait JS musi pokrywać rzeczywistą zmianę CSS. Reduced motion
   pozwala otworzyć od razu, bez osieroconego timera.
6. **Viewporty i resize:** jeśli geometria zależy od szerokości, nowe rozmiary
   nie zostawiają starych współrzędnych i nie zmieniają aktywnego ID. Kontrola
   czystej funkcji może objąć parametry wąskiego/szerokiego widoku; rzeczywiste
   kadrowanie, perspektywa i brak overflow strony pozostają kontrolą browsera.

To może być mały zestaw: rozszerzenie istniejących pętli o n=2/4, jeden test
inwariantów geometrii i kilka parametrów istniejącego adaptera handlerów.
Nie ma potrzeby tworzenia kopii wzorów, snapshotów całego CSS lub testu każdego
deklarowanego koloru. Reviewer nie dopisuje testów repozytorium.

## Ryzyka filtrowania dla 1/2/3/4/14 projektów

| Rozmiar | Najważniejsze ryzyko | Minimalna kontrola zachowania |
| --- | --- | --- |
| 1 — Gry/Platformy | Nieokreślony promień/kąt, pozorny obrót, swipe otwierający modal | Jedna widoczna karta, kontrolki obrotu disabled, swipe/cancel tłumi click, późniejszy prawidłowy click działa |
| 2 — WWW | Kolaps promienia, druga karta wyłącznie z tyłu/edge-on, niejednoznaczny kierunek | Oba ID osiągalne, prev/next zmienia aktywny, wrap nie klonuje ani nie usuwa drugiego projektu |
| 3 — mobile/technology | Skrajne ±120° chowają oba sąsiednie cele, nierówna głębokość | Trzy stabilne pozycje, każdy projekt osiągalny przez kontrolki/klawiaturę |
| 4 — SaaS | ±90° dają niemal zerową szerokość hitboxa; nienazwany KAN znika | Cztery ID z KAN, poprawna kolejność, null-stage zachowany, tylko aktywny link w Tab |
| 14 — Wszystkie | Duże nakładanie, niewidoczne klikane tyły, zbyt szeroki radius, seam kąta | Wszystkie ID osiągalne, brak powtórzeń, czytelny przód, niewidoczne cele wyłączone, kontrola last↔first |

Zmiana filtra ma ponownie obliczyć geometrię dla nowego n; nie wolno zachować
kątów/radiusu z poprzedniej kategorii ani pustego indeksu spoza nowego zakresu.
Jeżeli wybrany ID należy do nowego filtra, powinien pozostać wybrany zgodnie
z obecnym kontraktem; w przeciwnym przypadku wybór ma jawny prawidłowy fallback.
Powrót do Wszystkich przywraca 14 prawdziwych pozycji.

## Interakcje, które trzeba zachować

- Jeden link/tabstop aktywnego projektu, lokalne ArrowLeft/Right/Home/End,
  Enter/Space na viewport oraz widoczny focus. ArrowUp/Down pozostają przewijaniem
  strony. Zmiana aktywnej karty klawiaturą przenosi focus z poprzedniego linku.
- Hover bramy jest odwracalnym podglądem; click utrwala filtr. Pointerleave
  nie kasuje trwałego wyboru. Hover nie ukrywa linku skupionego klawiaturą.
- Przy zmianie n, filtra lub geometrii stare timer/rAF/drag nie mogą po czasie
  otworzyć poprzedniego projektu. Aktywny modal zamraża kontrolki i gesty.
- Drag pozostawia pionowy scroll i pinch zoom; przechwycenie wskaźnika zaczyna
  się dopiero po rozpoznaniu poziomego zamiaru. Swipe, pointercancel i utrata
  capture tłumią późniejszy compatibility click. Dokumentowy pointerup sprząta
  gest zakończony poza viewportem.
- Wheel ignoruje zwykłe pionowe/ukośne przewijanie. Obrót i inercja są ograniczone;
  pojedynczy szybki gest nie powoduje niekontrolowanego wielokrotnego obrotu.
- Dalszy click po centrowaniu otwiera właściwy ID dokładnie raz. Ctrl/Cmd/middle
  click zachowuje natywny link. Gdy showModal/brak JS, case study nadal jest dostępne.
- Dialog zwraca focus do właściwego, istniejącego i interaktywnego triggera lub
  viewportu. Nie może wrócić do ukrytego tyłu po filtrze, resize lub pełnym obrocie.
- Close pozostawia filtr, usuwa tylko parametr projektu i zachowuje q/UTM/hash
  oraz ścieżkę wdrożenia. Popstate może zmienić kategorię i zamknąć/otworzyć projekt.
- Bez JS lista wszystkich zwykłych linków pozostaje dostępna. Żaden nowy core,
  ring lub holograficzna dekoracja nie przechwytuje kliknięć. Nowe dekoracje są
  poza drzewem dostępności i nie powielają nazwy projektu.

Obecne JS realizuje większość powyższego kontraktu w `render/move/requestOpen`
(`assets/project-showroom.js:102–174`), obsłudze bram (`:179–205`), gestów/wheel
(`:226–291`) oraz zdarzeń hologramu/visibility (`:292–308`). Nowa geometria
powinna zachować te inwarianty, a nie tylko stare nazwy klas.

## Dane i granice sprintu

Bez ponownego audytu produktów odczytano bieżący katalog: **14 projektów,
9 obrazów galerii**, kategorie 3/4/1/1/2/3, etapy `null` dla Ignira, Obserwatora
i KAN. Zmiana showroomu nie upoważnia do dodania ilustracji udających screenshoty,
nowych metryk ani zmiany zakresów produktów.

Zachować jeden project-hologram, zero zduplikowanych ID, adresy case studies,
pełny katalog i historię pod `/projekty/`, kolejność pozostałych sekcji oraz
oryginalne źródła hero. Aktualizację generated HTML/allowlisty i ich spójność
sprawdza się niezależnie od testu czystej geometrii.

## Ślad odczytu przed orbitalną integracją

Pliki mogły być już równolegle edytowane przez autorów; to ślad konkretnego
odczytu, nie nowy commit ani deklaracja całego czystego baseline.

| Plik | SHA-256 |
| --- | --- |
| `assets/project-showroom.js` | `3d588a14c72faa84e9dd5551a627d9ae096a3d0a0ba534396782b46a00fa6a76` |
| `scripts/showroom_markup.py` | `84e7dc690ca2cc54db4317150075fd9060368bb9b8ae6882986af07c26796034` |
| `assets/project-showroom.css` | `2564e44122116db2c63c84bcb94efaacd39ac4315e0db713570290c700b3a028` |
| `assets/project-hologram.js` | `b78d4ddc6483d238f64e72ee2d0daaf9254091e135acfdec3377d4af06be2f08` |
| `tests/project-showroom.test.cjs` | `34b5c5ef0800a45b2d1671acbfaefa9ac41d9bc39f54a875f7f0d6386657634e` |
| `tests/project-hologram.test.cjs` | `169ec71151ee41af8a2c6d997aace27ec35790378d5c6341970c8c35989f2f78` |
| `catalog/projects.json` | `992e8c5330d946e4b0bd99316ea67548c04e3568ade04071e347dfdedb134487` |

## Stan przed integracją — zapis historyczny

- Odczyt istniejących testów/JS i bieżącego katalogu: **VERIFIED — źródła**.
- Orbitalna geometria i zintegrowane handlery: **OPEN — oczekiwana integracja**.
- Nowe pełne uruchomienie testów/HTTP przez reviewera: **NOT RUN**.
- Render, kadrowanie, realny focus/touch, płynność, odbiór orbitalnej kompozycji:
  **OPEN — Browser był niedostępny; bez obejścia przez zewnętrzny Playwright**.
- Akceptacja właściciela: **OPEN**. Produkcyjne opublikowanie zmian: **NOT DEPLOYED**.

Końcowy niezależny werdykt zostanie dopisany po sygnale gotowości implementacji.
Nie przypisywać orbitalnemu kodowi wcześniejszych wyników testów lub wizualnego PASS.

## Rozszerzenie autoryzowanego zakresu podczas sprintu

Koordynator przekazał dodatkowy zbiorczy brief: dopracowanie motta z kropką,
oczyszczenie tekstów, materiał marmuru, wędrowiec i jawna pauza sceny, pogrupowany
warsztat technologii, osobna pauza energii showroomu oraz wizualne powiązanie
hologramu z orbitą. Końcowy review obejmie również te zintegrowane zmiany.
Sam opis zamierzenia nie jest dowodem ich wdrożenia.

Nowe kontrolki pauzy powinny mieć widoczną nazwę, prawdziwy stan dostępności
i działać klawiaturą. Świadoma pauza nie może samoczynnie znikać po opuszczeniu
viewportu, powrocie karty, otwarciu/zamknięciu dialogu lub zmianie reduced motion.
Dekoracyjne powiązanie hologramu nie może przechwytywać kliknięć, powielać dialogu,
zmieniać bezpiecznych URL ani łamać zwrotu fokusu. Grupy technologii mają wynikać
z rzeczywistych technologies w katalogu i zachować linki do filtrowanej wyszukiwarki;
nie tworzą nowych potwierdzonych kompetencji lub statystyk użycia.

## Odczyt pierwszej orbitalnej integracji — nie końcowy werdykt

### Geometria i nowe testy

W odczytanym `ProjectShowroom.orbit` pięć pozycji wystawy korzysta ze wspólnych
sin/cos; dla n<5 rozstaw wynika z faktycznego n, a singleton ma x=y=0.
To orbitalne okno maksymalnie pięciu widocznych modułów, **nie 14 modułów
równocześnie na pierścieniu**. Pozostałe rekordy mają jeden własny DOM node
i są osiągalne przez obrót. Nie wymagać unikalnych współrzędnych niewidocznych
slotów; ich inert/ARIA/pointer state musi wykluczać interakcję.

Nowe testy rozszerzają istniejące wrap/offset o n=2/4 i dodają dwie sensowne
kontrole: skończone/unikalne widoczne punkty elipsy dla każdego aktywnego indeksu
oraz rzeczywisty katalog i wszystkie filtry wraz z przewodami, ruchem, open/close
i URL. W chwili odczytu źródła showroomu zawierają 12 testów, hologramu nadal 14.
Poprzednich 10 przypadków nie usunięto. Pełny końcowy wynik suit jest oczekiwany
po integracji rozszerzonego briefu; nie deklarować z góry liczby 120 PASS.

CSS skaluje SVG z `preserveAspectRatio=none` do 2×radiusX/2×radiusY i wspólnego
środka 50%/50%. Współrzędne SVG (500+500x,250+250y) są zatem zgodne z docelowym
środkiem karty; brak translateZ eliminuje osobny rozjazd perspektywiczny środka.
Kąt jest ograniczony do ±10°, a n=1 ma wyłączone węzły. Nie znaleziono problemu
skończoności lub docelowego mapowania z tych źródeł. Ocena kompozycji pozostaje OPEN.

Niezależnie wywołano rzeczywiste handlery przez istniejący adapter w pamięci,
bez zapisów do testów: wszystkie siedem filtrów (Wszystkie + sześć kategorii),
pełna pętla w obie strony — **56 kroków**, każde ID osiągalne, powrót do tego samego
ID, jeden aktywny tabstop i jeden aria-visible projekt. Dodatkowa sekwencja
neighbor click → filtr Gry → odczekanie 1000 ms nie otworzyła starego projektu.
To dowód stanu handlerów, nie test dotyku/renderu/fokusu przeglądarkowego.

### ORB-01 — przewody tracą kontakt z modułami podczas ruchu: ZGŁOSZONE

`assets/project-showroom.js:149–153` ustawia końcówki SVG natychmiast, podczas gdy
CSS interpoluje transformację karty przez 620 ms (`assets/project-showroom.css:47`).
Przy każdym kroku przewód trafia więc do celu przed modułem. Podczas drag karta
dostaje dodatkowe `--showroom-drag`, którego końcówki SVG nie uwzględniają.
Niezależny odczyt handlerów odtworzył offset **-82,5 px** przy niezmienionym x2 SVG.

Koordynator przyjął zgłoszenie i zapowiedział `is-orbit-moving` oraz wyciszenie
przewodów/terminali na czas drag i centrowania. To zmniejsza mylący efekt
odłączonych połączeń bez dodawania drugiej pętli animacji. **Naprawa i sprzątanie
jej timera na tym etapie pozostawały OPEN**; ówczesne testy docelowej
geometrii same nie dowodzą zgodności przewodów w czasie interpolacji.

## Końcowy review rozszerzonej integracji

Odczytano gotowy renderer, showroom JS/CSS, zmiany hologramu, hero JS/CSS,
scenę/material SVG, grupowanie technologii, zintegrowany HTML i nowe testy.
Nie zmieniano produktu ani testów repozytorium. Weryfikacje handlerów uruchamiano
w pamięci na rzeczywistych plikach produkcyjnych, z małymi adapterami DOM.

### ORB-01 — ZAMKNIĘTE w źródłach i kontrolerze

`settleWires()` (`assets/project-showroom.js:107–111`) ukrywa połączenia na czas
650 ms przy zmianie układu oraz zakończeniu wizualnego poziomego drag.
`stopGesture():324–332` wywołuje je także przy pointercancel i zerowej zmianie
indeksu. CSS `:63` wygasza całą grupę węzła podczas `is-orbit-moving/is-dragging`,
więc przewód, terminal i iskra nie udają połączenia z przemieszczającym się modułem.
Po settle wracają do wspólnego docelowego punktu. Reduced motion/hidden czyszczą
timer i klasę; nie powstaje nowa ciągła pętla JS.

Niezależne handlery potwierdziły obecność klasy przez 649 ms, usunięcie po
650 ms i tę samą ochronę po anulowanym poziomym drag. Pierwszy wariant naprawy
pomijał powrót bez zmiany indeksu; ten przypadek zgłoszono i końcowy kod go obejmuje.
W repo jest regresja powtarzanego kroku i cancel z kontrolą 649/650 ms.
Rzeczywista interpolacja i efekt wyciszenia pozostają kontrolą wizualną OPEN.

### Pozostałe ustalenia końcowe

- Geometria zachowuje skończone, różne **widoczne** pozycje dla n=1/2/3/4/14,
  singleton bez obrotu i maksymalnie pięć modułów na powierzchni. Obrót w obie
  strony przechodzi przez wszystkie prawdziwe ID, bez klonów. Kąty pozostają
  ±10°, a moduły mają wspólne radii i środek z SVG. Projekcyjny lift aktywnej karty
  jest dodatkowym niewielkim efektem prezentacji, nie zmianą katalogu.
  Końcowy mobilny radiusY wynosi 195 px przy viewporcie 610 px i aktywnej karcie 200 px;
  zwiększa to nominalny odstęp pionowy od sąsiada 82×0,76. Kontrolka pauzy ma
  osobny wiersz do 700 px. To odczyt geometrii CSS, nie pomiar ekranu.
- Terminale odnoszą się do zajętych slotów. Iskra jest ustawiana na 60% odcinka
  od rdzenia do prawdziwego punktu, z tym samym x/y (`JS:163–172`), a nie do
  wymyślonego projektu. Singleton wyłącza węzły. Dekoracje są aria-hidden,
  focusable=false/pointer-events:none i nie dodają punktów Tab.
- Ręczna pauza energii orbity przetrwała w adapterze ruch, otwarcie/zamknięcie
  hologramu, hidden/visible i reduced motion on/off. Kontrolka ma widoczny tekst,
  aria-pressed oraz disabled przy preferencji ograniczonego ruchu. CSS dodatkowo
  pauzuje dekoracje poza viewportem, przy ukrytej karcie, drag i otwartym dialogu.
  Projekty nie obracają się samoczynnie.
- Hologram pozostaje jednym natywnym dialogiem. Nowy origin projekcji pochodzi
  z rect wyzwalacza i jest ograniczony do bezpiecznych granic; brak rect przywraca
  50%/100%. Osobny adapter potwierdził wyliczenie, clamp, fallback oraz zachowane
  focus calls po open/close. Rozszerzenie nie zastępuje istniejących mechanizmów
  tokenów cyklu, safe URL, Escape, scroll reset ani zwrotu fokusu.
- Kontroler sceny zachowuje osobne `userPaused`. Niezależny adapter potwierdził,
  że pauza przetrwała zmianę widoczności/viewportu/reduced motion oraz pageshow;
  wznowienie jest jawne. Pause i pagehide sprzątają rAF/parametry, a seria ruchów
  myszy pozostawia najwyżej jedną oczekującą klatkę. Dotyk nie uruchamia paralaksy.
- Motto ma dokładną treść „Technologia ma dawać kontrolę. Nie na odwrót.”,
  pozostaje bezpośrednio pod H1 i używa wcześniej zweryfikowanego lokalnego italic.
  PK nadal jest obrazem 260×260 w tej samej scenie i w tych samych współrzędnych
  płyty; hashe oryginalnego PNG i zaakceptowanego do review krajobrazu nie zmieniły się.
- Materiał liter ma proceduralne mineralne ziarno i rozgałęzione żyłki SVG,
  ze zmniejszonym połyskiem; to zmiana renderowania, nie nowy krajobraz. Wędrowiec
  otrzymał autoryzowany bardzo mały uphill travel: 64 s, do 2,6 jednostki źródłowej,
  z resetem podczas przezroczystości. Cień podąża z zewnętrzną grupą. Pauza sceny,
  offscreen/hidden i reduced motion ograniczają ten efekt. Wiarygodność materiału,
  kontakt postaci ze zboczem i percepcja ruchu pozostają OPEN.
- Wygenerowany warsztat ma **sześć grup i 50 unikalnych technologii**. Parser
  potwierdził dokładną równość nazw i parametrów `technologia` ze zbiorem katalogu,
  brak powtórzeń oraz licznik równy liczbie projektów używających danej nazwy.
  Nowa technologia ma fallback Inne; grupy nie zmieniają oryginalnych filtrów.
- W 20 publicznych HTML niezależny odczyt nie znalazł starego sloganu
  `BUILD // CONTROL // FREEDOM` ani spaced —/–. Zachowane zakresy liczbowe
  i nazwy nie są automatycznie traktowane jako zbędne przerywniki.
- Parser końcowej homepage potwierdził **14 kart o 14 unikalnych ID**, katalog
  14/9 obrazów, trzy niepotwierdzone etapy null, jeden project-hologram i zero
  duplikatów DOM id. Order pozostaje start → projekty → o-mnie → wyzwania →
  technologie → kontakt → brief. Po jednej kontrolce pauzy hero i orbity.

### Wyniki koordynatora i granice niezależnego review

Koordynator przekazał zakończony wynik **84 Python PASS + 46 Node PASS = 130 PASS**
oraz **107 HTTP PASS / 0 FAIL**, preview na porcie 8094, **57 plików publicznych**.
Ostatnia liczba została również odczytana niezależnie z allowlisty. W Node są
obecnie 14 showroom + 15 hologram + 5 hero + 12 catalog; Python obejmuje dwie nowe
regresje grupowania technologii. Nie wykonano ponownie tych pełnych zestawów
przez reviewera i nie doliczano kontroli adapterów do wyniku 130.

Niezależny dowód runtime dotyczy opisanych handlerów, stanów, wywołań focus,
timerów i parametrów stylu w syntetycznym DOM. Nie dowodzi faktycznej geometrii
renderu, zachowania urządzenia dotykowego, focus trap czy czytnika ekranu.
Browser ponownie pozostawał niedostępny (`getForUrl` error, lista narzędzi pusta).
Nie obchodzono tej granicy przez zewnętrzny Playwright.

### Ślad końcowego stanu źródeł

| Plik | SHA-256 |
| --- | --- |
| `assets/project-showroom.js` | `9c79e9f89ba18d121aeee1c759f6726bff54516980c0847a37fe1c4dcc4b35ba` |
| `assets/project-showroom.css` | `d87a84bc8c77f532b8726bdc5a34d40250b998d3d9237348914c212d1cf6ab7b` |
| `scripts/showroom_markup.py` | `2365ef959a504c808a5d06a6cee9eb650d4203084670b528c87a1e23f13be45b` |
| `assets/project-hologram.js` | `52b7c883bc0c2bcd54cc50c66870edd61014009f028901db97a4b547993d89ae` |
| `assets/project-hologram.css` | `df270a2fa52e0d1bc540bd9294e477afd12c1a513323565413910f2657cf6e16` |
| `assets/hero-space.js` | `97ca07c30ea17aeed64f879a66ea0111f434b1a32052ea9d8526f79d8c55299b` |
| `assets/hero-monument.css` | `a7d5d35c673b1638cdd34fca4bf177d97dfe589bb8d90057a2b68804eb8f7f5e` |
| `assets/brand/stone-material.svg` | `f3d99545fc29a467f2f55decd89f71bfcc52dd33c1c156f33827103ce74ea938` |
| `templates/hero-scene.svg` | `55fd5f93f1c5aefd8537716be692f21f46a7f8c1c8bb999aa7b757cb959f9783` |
| `scripts/build-site.py` | `4dc1423bbd25855d76d7b3dfe3fc271499066841cbd998ec6ebd37c5f62dcc38` |
| `catalog/projects.json` | `2d96a6b5fec190c2da32b28aa3a1ba2f3b491066664ce0620a9d7c70bf3da07d` |
| `templates/site.html` | `4b631993b64ac58ae4e9ca8d1e7566574c6d78862bdf1d182484ae9aa008b314` |
| `templates/about-contact.html` | `9c33086ad3c3afd9ca6f571b00688401e945110d9138a2532f15d7db61599a1e` |
| `assets/home-atmosphere.css` | `4860e2fee1fd65baa5287f5857b25bea673182948012f4d5df87033c1e70cb70` |
| `tests/project-showroom.test.cjs` | `a87b04609d959928522e7a55cb2008fee518386af611e1373ae9394b6fda73a5` |
| `tests/project-hologram.test.cjs` | `d46d552680c9f36779bd3eb9ebe43cb5d0c7b44aecc52a478096a3e3bea74f13` |
| `tests/hero-space.test.cjs` | `196753a9eccfa68300c852b5c385da7f33d44b3814d4e9560e363b4570b285a4` |
| `index.html` | `fbb73894985d834e8c6eab5de10d9036b8b3524f265abb2ec08ca560a8e824d6` |

Oryginał PK: `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
Krajobraz: `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.

**Werdykt źródłowy:** ORB-01 zamknięte, włącznie z anulowanym drag.
Nie znaleziono kolejnego potwierdzonego blokera w odczytanym rozszerzonym zakresie.
Źródła i dowody są gotowe do lokalnego checkpointu.

**Nadal OPEN:** wygląd i kadrowanie orbity, czytelność modułów na breakpointach,
percepcja iskier/energii, materiał marmuru i ruch wędrowca, realne focus/touch,
wydajność/Lighthouse oraz akceptacja właściciela. W konfiguracji
`ownerVisualApproval=OPEN`. **NOT DEPLOYED**; werdykt review nie zatwierdza
produkcji i nie jest visual PASS.
