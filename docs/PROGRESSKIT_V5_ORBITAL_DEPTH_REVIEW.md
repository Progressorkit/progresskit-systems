# V5 — niezależny review głębi orbitalnego showroomu

Data: 2026-10-15. Reviewer posiada wyłącznie ten dokument. Kod/testy pozostają
w gestii autorów; nie wykonuje się tutaj zmian produktu, operacji Git ani deployu.
Kontrola przeglądarkowa pozostaje OPEN. Nie stosuje się zewnętrznego Playwright
lub alternatywnego narzędzia do obchodzenia niedostępnego Browser.

## Autoryzowany zakres i niezmienne granice

Nowy sprint dodaje perspektywę i rzeczywistą trajektorię sin/cos w ręcznych
przejściach, metaliczne łuki przodu/tyłu i zasłanianie, poruszające się iskry,
jaśniejsze moduły oraz większą konstrukcję z mniejszą pustą przestrzenią.
Miniatury screenshotów znikają z węzłów; oryginalne galerie pozostają w pełnych
hologramach i case studies. W katalogu pozostaje 14 projektów i 9 obrazów.
Filtry, kolejność danych, trasy, dostępność bez JS, hologram, focus i historia
zachowują swój dotychczasowy kontrakt.

Ocena „głębszy”, „jaśniejszy”, „większy” lub „bardziej metaliczny” wymaga renderu.
Samo dodanie właściwości depth/perspective nie stanowi visual PASS ani pomiaru
płynności lub wydajności.

## Ocena zaproponowanego modelu

Propozycja koordynatora:
`depth=cos(theta)`, `p=1/(1-0.24*depth)`,
`x=sin(theta)*p`, `y=cos(theta)*p`, z ciągłą skalą zależną od depth.
Model jest skończony dla całego kąta, ponieważ mianownik mieści się w [0.76,1.24].
Ręczne przejście ma obliczać kartę i jej punkty SVG na każdej klatce przez około
620 ms, a nie interpolować liniowo wyłącznie dwa końcowe x/y.

Własne obliczenie liczbowe dla tego wzoru:

| theta | depth | p | x | y | scale=.55+.30*(depth+1)/2 |
| --- | --- | --- | --- | --- | --- |
| 0° | 1 | 1.315789 | 0 | 1.315789 | .85 |
| 72° | .309017 | 1.080105 | 1.027241 | .333771 | .746353 |
| 90° | 0 | 1 | 1 | 0 | .70 |
| 120° | -.5 | .892857 | .773237 | -.446429 | .625 |
| 144° | -.809017 | .837406 | .492215 | -.677476 | .578647 |
| 180° | -1 | .806452 | 0 | -.806452 | .55 |

### Warunki poprawnej integracji

1. **Nowe granice powierzchni.** Projekcja przekracza ±1. Front y=1.315789,
   tył y=-.806452, a maksymalne |x|≈1.030107. Poprzednia asercja x/y w [-1,1]
   wymaga nowego matematycznego kontraktu, nie usunięcia kontroli granic.
   Przy starym mobilnym radiusY 195, viewporcie 610 i karcie 200×scale .85 nominalny
   dół wyniósłby około 647 px. Nowy CSS musi policzyć promień, środek, wysokość
   i miejsce na focus outline łącznie. To przykład granic, nie wynik renderu.
2. **Jedna perspektywa.** Gdy x/y są już projektowane w JS, nie dokładać tej samej
   głębi ponownie przez CSS translateZ+perspective. Jeśli wybrany zostanie model
   CSS 3D, SVG musi użyć identycznej projekcji końcowej. Karty i przewody mają
   jedną współrzędną źródłową oraz zgodne przesunięcie środka i promienie.
3. **Spójna skala.** Wersja podanego wzoru daje front .85 i tył .55; to nie jest
   dotychczasowy front1. Jeśli skala dodatkowo zawiera p, trzeba jawnie ustalić
   tę wersję i ponownie sprawdzić budżet powierzchni. Przeskoki .76/.58 według
   całkowitej odległości nie wystarczą do ciągłej głębi podczas ruchu.
4. **Wspólne warstwy.** Plan tył zIndex 2–5, przedni łuk zIndex 8 i przód 10–14
   wymaga wspólnego stacking context kart i osobnego przedniego łuku SVG.
   Własny context całego track uwięzi wszystkie jego dzieci po jednej stronie
   łuku, niezależnie od ich zIndex. Dekoracje nie mogą przechwytywać wskaźnika.
5. **Przód/tył z depth, nie indeksu DOM.** Z-order, jasność i klasy front/back
   mają wynikać z bieżącej fazy w tej samej klatce co x/y. Przy przejściu przez
   depth≈0 obowiązuje deterministyczna granica. Stabilna kolejność przy remisie
   nie powinna losowo zasłaniać innego modułu.
6. **Te same statyczne łuki.** Próbkowanie Python i model JS muszą odpowiadać
   sobie w kilku punktach kanonicznych, w tym 0/±90/180°. Skończona próbka SVG
   jest przybliżeniem krzywej; maksymalną różnicę tolerancji trzeba określić.
   Łuk front/back dzielić w tej samej granicy depth co warstwy kart.

## Pięć widocznych pozycji i 14 tożsamości

Dotychczasowe okno używało `slots=min(5,n)` i signed offsets. Należy odróżnić
pięć miejsc konstrukcji od 14 rekordów katalogu. Nie przypisywać wszystkich
14 projektów równocześnie do powtarzających się pięciu kątów z dodatnią opacity.

- Przejście musi interpolować ciągły kąt/fazę. Linear x/y daje prostą cięciwę,
  nawet jeśli oba końce leżą na prawidłowej krzywej.
- W pełnym katalogu signed-offset wrap np. -7→6 dotyczy ukrytego rekordu.
  Interpolacja takiej liczby przez przód spowodowałaby niezamierzony pokaz wielu
  projektów. Ukryte rekordy powinny zostać bezpiecznie przemapowane poza oknem.
- Przy fazie .5 offsety -2.5/+2.5 mają tę samą tylną pozycję theta=±pi.
  Dwa różne ID nie mogą tam jednocześnie dostać dodatniej widoczności i hitboxa.
  Potrzebny deterministyczny wybór/zanik wejścia i wyjścia.
- Testy pośrednich faz 0/.25/.5/.75/1 i last→first/first→last muszą wykrywać
  duplikaty widocznych pozycji i długą drogę 0↔360. Stan docelowy sam tego nie dowodzi.
- Przerwanie ruchem powinno zacząć z rzeczywistej bieżącej fazy, nie z ostatniej
  końcowej pozycji. W przeciwnym razie szybka druga strzałka powoduje teleport.
- Zmiana filtra zmienia n i układ tożsamości. Najprostszy bezpieczny wariant to
  anulowanie poprzedniej trajektorii i ustanowienie nowego layoutu. Daleki
  popstate/Home/End również może snapować, jeśli animowanie po wielu slotach
  byłoby mylące. Osiągalność wszystkich ID musi pozostać prawdziwa.
- n=1 pozostaje stabilnym modułem, n=2 ma prawdziwy przód/tył, a n=3/4 wymagają
  osobnego sprawdzenia warstw i zasłaniania. Nie dodawać pustych placeholderów.

## rAF, pauza i cykl interakcji

Proponowany silnik powinien mieć najwyżej jedną własną oczekującą klatkę ruchu
showroomu. Po dojściu do celu liczba rAF ma wynosić zero. Iskry dekoracyjne nie
uzasadniają niekończącego się JS rAF w stanie spoczynku; mogą mieć własny
kontrolowany mechanizm CSS, podlegający pauzie/reduced/visibility.

| Zdarzenie | Wymagana kontrola |
| --- | --- |
| Szybkie dwa kroki | Jeden silnik, nowy cel od aktualnej fazy, brak starego zakończenia |
| Pointerdown podczas ruchu | Brak rywalizujących pętli interpolation/drag; jawny transfer sterowania |
| Pointercancel/utrata capture | Powrót po krzywej lub snap zgodny z kontraktem, brak click, zero osieroconych rAF |
| Filtr/n w trakcie ruchu | Stara trajektoria nie nadpisuje nowego układu ani URL |
| Hologram w trakcie ruchu | Otwiera właściwy ID po dojściu na przód; dialog blokuje dalszy obrót |
| Reduced motion on | Anulowanie klatki i zaplanowanego otwarcia; spójna końcowa geometria bez animacji |
| Hidden/pagehide | Anulowanie rAF/timerów; brak późniejszego otwarcia starego projektu |
| Visible/pageshow | Zachowanie świadomej pauzy i poprawny stan; bez niespodziewanego replay |
| Popstate/seam | Poprawny filtr/ID i kierunek lub snap; q/UTM/hash zachowane |
| Close | Zwrot fokusu do rzeczywiście aktywnego modułu/fallbacku; bez rAF w tle |

Dotychczasowa pauza energii zatrzymuje dekorację, a ręczna nawigacja pozostaje
dostępna. Nowe zachowanie należy nazwać jasno; jeśli pauza obejmie także ręczną
animację, nawigacja powinna snapować do celu, a nie przestać działać.
Reduced motion zawsze wyłącza ruch, niezależnie od ręcznego wznowienia.

## Minimalne dowody końcowe

1. Czysty model: skończoność, granice projekcji, ciągłość skali/głębi, symetria,
   front/back i punkty pośrednie dla n=1/2/3/4/14. Odwrócenie perspektywy powinno
   dawać punkt sin/cos; nie utrzymywać starego równania x²+y²=1 po projekcji.
2. Wspólny model: numeryczne porównanie próbek Python SVG z JS, odpowiednie
   warstwy i bieżące końcówki przewodów/iskier w trakcie rAF, nie tylko po 620 ms.
3. Rzeczywiste handlery: interrupted move, reverse, cancel, filtr, reduced,
   hidden i history seam; po ukończeniu/anulowaniu zero własnych klatek.
4. Renderer: 14 pojedynczych tożsamości bez screenshot img w węzłach, dane galerii
   pozostają w hologramie; jeden dialog, linki bez JS, brak podwójnych DOM id.
5. Końcowe testy/build/staging/HTTP przypisane wykonującemu je koordynatorowi.
   Wcześniejsze 130 PASS i HTTP 107 nie są wynikiem nowego sprintu.
6. Osobno OPEN: render, prawdziwe zasłanianie i jasność, ruch iskier, kadrowanie,
   czytnik ekranu/focus/touch, wydajność, Lighthouse i akceptacja właściciela.

## Odczyt zmiany ostrości H1

Na prośbę autora odczytano `assets/hero-monument.css` i `templates/hero-scene.svg`.
H1/title/stone-line nie mają już transformacji, perspektywy lub filtra liter;
nie ma wiszącego URL do usuniętego `stone-letter-cut`. Cienie liter mają blur 0,
a pseudo-element używa całkowitego inset zamiast transformacji. Tekstowy
fallback, lokalne fonty, motto w przepływie, print i forced colors pozostają.
XML zachowuje oryginalny PK 260 i jego osobny wall-contact-relief. Nie znaleziono
potwierdzonej regresji w tym wstępnym odczycie; faktyczna ostrość/marmur są OPEN.

## Ślad początku sprintu

| Plik | SHA-256 |
| --- | --- |
| `assets/project-showroom.js` | `9c79e9f89ba18d121aeee1c759f6726bff54516980c0847a37fe1c4dcc4b35ba` |
| `assets/project-showroom.css` | `d87a84bc8c77f532b8726bdc5a34d40250b998d3d9237348914c212d1cf6ab7b` |
| `scripts/showroom_markup.py` | `2365ef959a504c808a5d06a6cee9eb650d4203084670b528c87a1e23f13be45b` |
| `tests/project-showroom.test.cjs` | `a87b04609d959928522e7a55cb2008fee518386af611e1373ae9394b6fda73a5` |
| `assets/project-hologram.js` | `52b7c883bc0c2bcd54cc50c66870edd61014009f028901db97a4b547993d89ae` |
| `catalog/projects.json` | `2d96a6b5fec190c2da32b28aa3a1ba2f3b491066664ce0620a9d7c70bf3da07d` |

## Stan przed pierwszą integracją — zapis historyczny

Model przeanalizowany matematycznie, ryzyka przekazane autorom. Implementacja
głębi, nowa geometria SVG/CSS, runtime handlery i końcowe wyniki testów:
**OPEN — oczekiwana gotowość źródeł**. Ten dokument nie zatwierdza wdrożenia.

## Pierwszy odczyt gotowych źródeł i znalezione regresje

Odczytano nowy silnik `relative/orbit/paintGeometry/arrangeGeometry`, renderer
metalowej konstrukcji, CSS modułów i iskier oraz testy trajektorii/lifecycle.
Źródła realizują wspólną kamerę k=.24, skalę `.76*p`, fazę nieograniczoną
modulo indeksów i smoothstep w czasie 620 ms. Nowe testy sensownie sprawdzają
krzywą pośrednią, nie tylko końcowe punkty. Nie przypisywano im wyników
poprzedniego sprintu.

### DEPTH-01 — odroczony hologram otwierał się po wyjściu z viewportu

W pierwszym odczycie callback IO kończył phase, lecz nie anulował openTimer.
Rzeczywiste handlery w adapterze: neighbor click → intersect(false) → tick650
dały `opened:[project-1]`, `inView:false`. Koordynator dodał cancelOpen,
stopGesture, finishPhase i cleanup timera ruchu.

**ZAMKNIĘTE w handlerach:** niezależne powtórzenie po poprawce dało zero otwarć
i zero klatek; powrót intersect(true) oraz kolejne 1000 ms nie otworzyły dialogu.
Dodano trwałą regresję. Nie jest to test fizycznego przewijania strony.

### DEPTH-02 — timer mógł wyprzedzić ostatnią klatkę przed otwarciem

W pierwszym odczycie dispatch sprawdzał tylko zgodność active ID. W sekwencji
bez pośredniej klatki, click neighbor → jeden tick650, zdarzenie open wychodziło
z y=.333771 zamiast front y=1.315789. Adapter mierzył pozycję przed notify
hologram-open, więc późniejszy snap kontrolera modala nie maskował błędu.
Koordynator dodał finishPhase bezpośrednio przed emit open.

**ZAMKNIĘTE w handlerach:** niezależne powtórzenie tej samej sekwencji potwierdziło
front pose 1.315789 już w chwili open event. Dodano trwałą regresję dropped frames.

### DEPTH-03 — fizyczny drag przesuwał karty bez przewodów

Pierwsza implementacja nowej orbity nadal dodawała `--showroom-drag` wyłącznie
do kart; końcówki SVG pochodziły z displayPhase. Nowy CSS pokazywał węzły podczas
drag przy opacity .18, więc wróciło widoczne rozłączenie punktów. Koordynator
przyjął zgłoszenie i wdraża wspólną fazę także dla gestu zamiast liniowej
translacji kart. Na tym etapie pozostawało OPEN do odczytu poprawki.

**ZAMKNIĘTE po końcowej poprawce:** pointermove wylicza tymczasową displayPhase
i wywołuje wspólne paintGeometry kart/przewodów. Niezależny adapter potwierdził
zgodność wszystkich widocznych endpointów podczas gestu; cancel zachowuje indeks
i wraca po krzywej, z zerem oczekujących klatek po 620 ms. Nie korzysta z liniowej
translacji całego zestawu jako modelu drag.

### DEPTH-04 — szybka klawiatura mogła zostawić focus w aria-hidden karcie

Trzy ArrowRight bez klatki dają nowy target poza widocznym oknem, mimo że każdy
pojedynczy delta ma wartość1. W pierwszym odczycie wybrana karta otrzymywała
inert=true/opacity0, lecz aria-hidden=false/tabIndex0; move próbował ją fokusować.
Adapter uzupełniony o zasadę nieprzyjmowania fokusu przez inert odtworzył:
`selected=project-3`, `selectedInert=true`, `focused=project-2`,
`focusedAriaHidden=true`. To dowód stanu i wywołania focus w adapterze,
nie użycie rzeczywistej przeglądarki.

Zgłoszono ograniczenie łącznego dystansu targetPhase-displayPhase lub bezpieczny
fallback/odroczenie focus. Na tym etapie pozostawało OPEN do odczytu poprawki.

**ZAMKNIĘTE po końcowej poprawce:** limit uwzględnia także łączny dystans
targetPhase-displayPhase; nadmiernie odległy cel snapuje. Tab i aria zależą
również od shown. Niezależne powtórzenie trzech szybkich ArrowRight potwierdziło
wybraną kartę widoczną, inert=false, aria-hidden=false i focus call do jej linku.

### DEPTH-05 — nowe żądanie mogło uruchomić rAF już poza viewportem

Stan inView był lokalny w callbacku IO. Po intersect(false) nowy ArrowRight
z pozostawionym focusem ponownie rozpoczynał ruch, bez kolejnej zmiany
IntersectionObserver. Adapter potwierdził `inView:false`, `pendingFrames:1`.
Zgłoszono trwały stan widoczności i snap zamiast animacji poza viewportem.
Na tym etapie pozostawało OPEN; to kontrola pracy kontrolera, nie pomiar wydajności.

**ZAMKNIĘTE po końcowej poprawce:** trwały orbitInView kieruje offscreen requests
do snap. Niezależny adapter po intersect(false) i nowym kroku wykazał zero rAF
oraz zero timerów; świadoma pauza energii pozostała po powrocie do widoku.

## Końcowy niezależny odczyt

Odczytano gotowy JS, renderer, CSS konstrukcji, H1 CSS/SVG i wynikową homepage.
Wykonano własne kontrolowane reprodukcje handlerów oraz porównanie numeryczne;
nie zmieniano plików produktu/testów i nie wykonywano operacji Git/deployu.

### Potwierdzone właściwości kontrolera i modelu

- Wspólne paintGeometry wyznacza bieżące x/y, skalę, światło, opacity i zIndex
  kart oraz ich przewody z displayPhase. `.76*p` daje scale1 na przodzie;
  wyjściowe x/y są już projektowane. CSS nie dodaje kolejnego translateZ/perspective.
  Przejście 620 ms interpoluje fazę przez smoothstep, nie liniową cięciwę ekranu.
- Fractional phase i edge fade między abs(relative)=2..2.5 nie ujawniają
  dwóch rekordów w tym samym tylnym miejscu seam. Maksymalnie pięć modułów ma
  dodatnią widoczność; przy dokładnej połowie może pozostać cztery. Ukryty wrap
  14 tożsamości nie animuje się przez przód jako fałszywy dodatkowy moduł.
- Track nie ma transformacji, opacity, zIndex lub preserve-3d tworzącego
  osobny context. Tylne karty mają zIndex 2–5, rdzeń 7, przedni SVG 8, przednie
  karty 10–16. To poprawny źródłowy układ warstw dla zasłaniania; jego faktyczny
  render pozostaje OPEN. Uniform module dimensions ograniczają skoki rozmiaru
  przy zmianie aktywnego indeksu.
- Próbki Python SVG porównano z **rzeczywistym eksportowanym orbit() JS**:
  przedni rim 61 i tylny retainer 61 punktów, maksymalne błędy odpowiednio
  **0.0004971 / 0.0004944 jednostki SVG**. Odpowiadają zapisowi współrzędnych
  do trzech miejsc po przecinku. Porównanie dotyczy próbek, nie jakości
  przybliżenia między nimi lub pomiaru pikseli.
- Iskry mają animację transformacji po aktualnym wektorze hub→punkt,
  a nie samą zmianę opacity. JS utrzymuje bazę cx=500/cy=250 oraz aktualne
  `--spark-x/--spark-y`; CSS odczytuje te same wektory. Pauza energii,
  reduced motion, offscreen, hidden i hologram sterują dekoracyjną animacją.
- Niezależne adaptery ponownie odtworzyły wszystkie pięć przypadków DEPTH-01..05
  opisanych wyżej. Dodatkowo siedem rzeczywistych filtrów i **56 kroków w obie
  strony** odwiedziły wszystkie właściwe ID i wróciły do początkowego; po każdym
  ukończonym ruchu showroom miał zero oczekujących rAF.
- Snapshot geometrii JS przy aktywnej pauzie i braku nawigacji pozostał identyczny
  po symulowanych 5000 ms, z zerem rAF. Pauza energii zachowuje dotychczasowe
  znaczenie: zatrzymuje dekorację, pozostawiając ręczną nawigację. Nie jest
  deklaracją zatrzymania dowolnego świadomie zleconego przejścia ręcznego.
- Ukrycie karty po ruchu i zleceniu otwarcia sprząta rAF/timery i nie otwiera
  dialogu po czasie. Filtr/historia snapują do nowego prawidłowego layoutu;
  przerwany krótki krok korzysta z bieżącej fazy. History URL i bezpieczne
  mechanizmy hologramu pozostają w dotychczasowym kontrakcie.

### Dane, renderer i hero

Parser końcowego HTML potwierdził **14 kart o 14 unikalnych project-id**, zero
duplikatów DOM id i jeden project-hologram. **W kartach jest zero img screenshotów.**
Oryginalny mały obraz PK rdzenia jest dekoracją marki. Serializowane dane nadal
mają 14 rekordów i **9 obrazów galerii**, dokładnie zgodnych z bieżącym katalogiem;
pozostają dostępne pełnym hologramom i case studies. Kod hologramu ma ten sam hash.

Kolejność sekcji pozostaje start → projekty → o-mnie → wyzwania → technologie →
kontakt → brief. Stany null, technologie i linki nie są wymyślane przez nowy model.
Oryginalny PK PNG i krajobraz zachowały swoje hashe. H1 pozostaje statycznym
tekstem bez filtra liter/perspektywy/rotacji i blur cieni, z materiałem, fallbackiem,
lokalnymi fontami oraz zachowanym motto. Ostrość, czytelność i jakość marmuru są OPEN.

### Zakończone wyniki przekazane przez koordynatora

Koordynator zgłosił **84 Python PASS** po ostatniej regeneracji, po której
renderer/HTML/Python nie zmieniły się, oraz **54 Node PASS** po końcowych
poprawkach gestu, fokusu i IO: razem **138 PASS**. Końcowe HTTP na porcie 8095:
**107 PASS / 0 FAIL**, **57 plików publicznych**, zapis `depth-local-http.json`.
Zgłosił także npm check PASS i parsery dwóch CSS oraz trzech SVG/XML PASS.
Wyników tych nie przedstawia się jako pełnego rerunu wykonanego przez reviewera.

Własne dowody runtime powyżej dotyczą stanu handlerów i kontrolowanego schedulera,
nie natywnego focus trap, prawdziwego gestu, grafiki przeglądarki lub szybkości.
Nie mierzono FPS, kosztu rAF/GPU, pamięci, czasu klatki ani Lighthouse.

### Ślad końcowego odczytu

| Plik | SHA-256 |
| --- | --- |
| `assets/project-showroom.js` | `a26d1c7c315321828da33da9297554cc4cec72ce989a3d4fdeaff6c9a1a81e20` |
| `assets/project-showroom.css` | `9682342dc9bbcddd4a537daee5060ac5ccbb787a28edb063c3ec354e197672b6` |
| `scripts/showroom_markup.py` | `a48220bbec73a20858a784496427b724e9a9f645615e5b579e4075fae7c2d260` |
| `tests/project-showroom.test.cjs` | `534aee52f3ba5e01a31cdc6d3d37cee522dffdd009fff509d0badc00aa2bfe3e` |
| `assets/project-hologram.js` | `52b7c883bc0c2bcd54cc50c66870edd61014009f028901db97a4b547993d89ae` |
| `assets/hero-monument.css` | `afa94949b02f488477c17f78256101325c8f4719bb9eeefce5eba617d0754a52` |
| `templates/hero-scene.svg` | `693b2dc879873163051d19d13a5f34ae702dd7af34dafb224a6d1f67e81f1cc0` |
| `catalog/projects.json` | `2d96a6b5fec190c2da32b28aa3a1ba2f3b491066664ce0620a9d7c70bf3da07d` |
| `index.html` | `b34901f685b7a72f6099c9e28fa82e75cd7229003ba7a8582d172c5d1b4d263f` |

PK PNG: `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
Krajobraz: `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.

**Werdykt źródłowy:** pięć wykrytych regresji zostało poprawionych i niezależnie
ponowionych. Nie znaleziono kolejnego potwierdzonego blokera w odczytanym zakresie.
Dokumentacja i dowody są gotowe do lokalnego checkpointu.

**Nadal OPEN:** faktyczne zasłanianie, rozmiary i kadrowanie na breakpointach,
jasność i czytelność modułów, widoczność ruchu iskier, ostrość H1/marmur,
native focus/touch/czytnik ekranu, wydajność i akceptacja właściciela.
Browser ponownie zwracał getForUrl error i pustą listę narzędzi. Nie obchodzono
tej granicy. `ownerVisualApproval=OPEN`, **NOT DEPLOYED**, bez visual PASS.
