# V5 — wystawa engineering i ikony kategorii: kontrakt niezależnego review

Data: 2026-10-15. Punkt odniesienia przekazany przez koordynatora: `babd14c`.
Nie wykonywano operacji Git, audytu repozytoriów produktów ani deploymentu.
Poniższy stan potwierdzono bezpośrednim odczytem plików lokalnych; hashe na końcu
odróżniają ten odczyt od późniejszej integracji. Zmieniono tylko ten dokument.

## Zakres najnowszej korekty

Sekcja engineering ma być przestrzenną, starannie skomponowaną wystawą problemów
i rozwiązań zamiast obecnej pionowej listy. Sześć bram kategorii otrzymuje spójne
liniowe ikony: telefon, chmura, ludzie, gamepad, glob i serwer. Zmiana nie rozszerza
katalogu, nie wprowadza nowych twierdzeń o produktach i nie zmienia zatwierdzonych
źródeł hero. Końcowy review będzie dotyczył zintegrowanego wyniku, a nie samych
pojedynczych arkuszy CSS.

Właściciel doprecyzował także hero: znak PK ma być lekko większy i wycentrowany
w głównej prawej płycie kamienia, a `PROGRESSKIT SYSTEMS` bardziej kamienny
i dopasowany materiałem do gór. Koordynator zapowiedział zmianę położenia SVG
z `(1660,175)` na `(1600,240)`, szerokości z 235 na 260 (+10,6%) i użycie tej samej
fotografii gór jako dodatkowej warstwy liter. To autoryzowana korekta kompozycji,
przy zachowaniu oryginalnego rastra/kształtu PK oraz ruchu całej sceny razem.
Planowane współrzędne nie są dowodem wizualnego wycentrowania; odbiór nowej
pozycji, materiału i kadrowania pozostaje **OPEN** do rzeczywistego podglądu.

Kolejne autoryzowane sterowanie dodaje duże, subtelne watermarki oryginalnego PK
pod sekcją O mnie/współpracy i w wybranym przejściu. Zakres obejmuje wyłącznie
atmosferę istniejących sekcji, najwyżej dwa akcenty. Nie jest zgodą na nowy znak,
nowe sekcje ani powiększenie wysokości strony. Osobny arkusz
`assets/brand-atmosphere.css` ma zostać dołączony przez koordynatora.

Ostatnie doprecyzowanie dodaje małą, ciemną sylwetkę wędrowca na zboczu sceny.
To dekoracyjny inline SVG we wspólnej scenie, nie nowy produkt ani podmiana
krajobrazu. Efekt ma pozostać drobny, bez autonomicznego chodzenia; dopuszczone
jest minimalne uniesienie i zmiana widoczności od myszy, resetowane przy
reduced motion i opuszczeniu hero. Końcowe dowody tej integracji zapisano poniżej.

Właściciel następnie przeniósł motto „Technologia ma dawać kontrolę — nie na
odwrót.” bezpośrednio pod H1. Oczekiwany materiał to spokojna, czytelna kursywa
manuskryptowa. Autoryzowana implementacja korzysta z lokalnego DejaVu Serif
Italic jako `PK Motto`, bez nowego obrazu i bez zmiany tekstu.

| Kategoria | Etykieta | Ikona | Liczba z katalogu |
| --- | --- | --- | --- |
| mobile | Aplikacje | telefon | 3 |
| saas | SaaS | chmura | 4 |
| platforms | Platformy | ludzie | 1 |
| games | Gry | gamepad | 1 |
| web | Realizacje WWW | glob | 2 |
| technology | Infrastruktura | serwer | 3 |

## Dowody stanu przed integracją

- `catalog/projects.json`: `asOf=2026-10-15`, 14 rekordów, 14 unikalnych identyfikatorów,
  9 wpisów galerii o 9 różnych istniejących ścieżkach. Wszystkie 14 wygenerowanych
  tras `projekty/<slug>/index.html` istnieje. Etap pozostaje `null` dla Ignira,
  Obserwatora i KAN SYSTEM. To bieżący odczyt danych, bez ponownego audytu produktów.
- Parser wynikowego `index.html` wykazał 14 kart showroomu, 14 unikalnych
  `data-project-id` i brak zduplikowanych DOM id. Występuje jeden
  `project-hologram`; osobny `gallery-dialog` obsługuje galerię i nie jest drugim
  hologramem projektu.
- Sekcje z identyfikatorami mają kolejność: `start`, `projekty`, `o-mnie`,
  `wyzwania`, `technologie`, `kontakt`, `brief`. Hologram jest po showroomie,
  przed About. Potwierdza to również konstrukcja `scripts/build-site.py:320–353`.
- Obecna sekcja engineering generuje sześć historii: Mail, Community, Vaeloria,
  Glikemia, Tax, Translator, każdą z pierwszego istniejącego case w katalogu
  (`scripts/build-site.py:340–348`). Wynikowy HTML ma sześć `article.challenge`.
  Wystawa ma zachować te dowody lub jawnie uzasadnić wybór istniejącego podzbioru;
  nie może dopisać sukcesów, metryk lub ilustracji udających produkt.
- Obecne bramy są natywnymi przyciskami z widoczną etykietą, liczbą,
  `data-showroom-category`, `aria-pressed` i `aria-controls=showroom-track`.
  Dekoracyjne glify mają `aria-hidden=true`
  (`scripts/showroom_markup.py:6–9`, `:31–35`). To właśnie glify zastępują ikony.
- W chwili odczytu nie istniały jeszcze `scripts/engineering_exhibit.py`,
  `assets/engineering-exhibit.css` i `assets/engineering-exhibit.js`.
  Ich implementacja i integracja pozostają **OPEN**, nie PASS.
- Oryginalny raster znaku ma SHA-256
  `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`;
  krajobraz hero ma SHA-256
  `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
  `catalog/brand.json` nadal zawiera `ownerVisualApproval=OPEN`.

Nie uruchamiano pełnych suit w tym odczycie. Poniższe nazwy istniejących testów
opisują dostępne regresje, a nie wynik nowego uruchomienia. Wcześniejsze wyniki
z `PROGRESSKIT_V5_SECOND_UI_CORRECTION.md` pozostają historyczne.

## Konkretne kontrole integracji

### Ikony i kontrakt bram

1. Dokładnie sześć właściwych motywów SVG, spójny `viewBox`, grubość linii,
   zakończenia i proporcje. `currentColor` zachowuje stany hover, focus i wyboru;
   ikony nie otrzymują osobnych kolorów dominujących nad paletą strony.
2. Każdy SVG jest dekoracyjny: `aria-hidden=true`, `focusable=false`, bez `tabindex`,
   zbędnego `role=img` i powtarzanych tytułów. Dostępna nazwa nadal pochodzi
   z widocznej etykiety przycisku; nie może zmienić się w nazwę pliku lub samą ikonę.
3. Brak powtarzanych `id`, nierozwiązanych `href` do symboli oraz zewnętrznych
   zasobów. Gdy użyte są definicje SVG, każda referencja musi rozwiązywać się
   w wynikowym HTML. Ikona nie może zwiększać liczby punktów Tab.
4. Zachować wszystkie kategorie, liczniki, atrybuty sterowania, typ przycisku
   i inicjalne `aria-pressed=false`. Bez JS bramy pozostają ukryte, zaś wszystkie
   zwykłe linki projektów są dostępne. Nie dodawać drugiej obsługi kliknięć ikon.
5. Kliknięcie w linię SVG/path musi uruchamiać ten sam filtr co kliknięcie tekstu.
   Przesuwanie kursora między path a etykietą nie może tworzyć dodatkowych zmian
   filtra lub kasować trwałego wyboru.
6. W przeglądarce: rozpoznawalność ikon, kontrast w spoczynku i active/focus,
   forced colors, powiększenie 200/400%, brak obcięcia linii i etykiet oraz
   czytelność przy 320, 390, 768, 1024 i 1440 px — **OPEN**.

### Wystawa engineering

1. Renderer korzysta wyłącznie z `cases` i powiązanych nazw/linków bieżącego
   katalogu. Escape tekstu obejmuje nagłówki, akapity, atrybuty i treść rozwinięcia.
   Nie umieszczać prywatnych ścieżek ze źródłowych audytów w HTML/JSON.
2. Zachować `id=wyzwania`, jeden niepusty H2 i logiczne H3 dla eksponatów.
   Nie tworzyć pustych nagłówków na potrzeby dekoracji. Treść procesu zachowuje
   właściwe etykiety Problem → Diagnoza → Rozwiązanie → Wynik, a link analizy
   prowadzi do istniejącego `projekty/<slug>/#wyzwania`.
3. Cała treść i linki są dostępne bez JS, również przy błędzie inicjalizacji.
   Bazowy styl nie może ustawiać `opacity:0`, `display:none` lub `inert` na całej
   wystawie przed pomyślnym uruchomieniem. Klasa enhancement jest lokalna dla sekcji.
4. Jeśli wystawa ma wybór aktywnego eksponatu: widoczny stan, czytelna dostępna
   nazwa kontrolek, stabilny focus i zgodność `aria-expanded/selected` z treścią.
   Nie ukrywać skupionego elementu podczas hover, obrotu, resize lub zmiany widoku.
   Nie wprowadzać zagnieżdżonych button/link ani role=tab bez pełnego modelu tabs.
5. Kontrolki mają `type=button`, działają Enter/Space i otrzymują widoczny focus.
   Klawisze kierunkowe dotyczą tylko wystawy, nie inputów briefu, showroomu
   ani otwartego hologramu. Otwarcie analizy zachowuje natywne Ctrl/Cmd/middle click.
6. Wskaźnik i dotyk: dekoracje mają `pointer-events:none`; hover nie jest jedyną
   drogą dostępu. Pionowy scroll strony działa w każdym obszarze wystawy.
   Jeśli pojawi się drag, gest jest odróżniany od click i anulowanie nie otwiera linku.
7. Ruch nie wprowadza autoplay. Efekty śledzące kursor używają najwyżej jednego
   oczekującego rAF; opuszczenie sekcji, ukrycie karty i reduced motion resetują
   stan. Żaden efekt nie zmienia położenia skupionego CTA ani treści w trakcie czytania.
8. Arkusz nowej wystawy jest ograniczony do jej selektorów. Sprawdzić konflikt
   z `home-atmosphere.css`, zwłaszcza starymi `.engineering-list`, `.challenge-grid`,
   `.challenge` i `.challenge-process`. Stary układ nie może ponownie wymuszać
   pionowej listy lub ścinać nowej powierzchni.
9. W przeglądarce: kompozycja desktop/mobile, rozwinięcie procesu, czytelność
   całych tekstów, brak poziomego overflow strony i pustych przestrzeni,
   reduced motion, tryb bez JS i druk — **OPEN**.

### Showroom, hologram i hero: regresje poza nowymi plikami

| Obszar | Konkretna sekwencja do sprawdzenia | Oczekiwane zachowanie |
| --- | --- | --- |
| Filtr | Hover SaaS → odejście → klik SaaS → odejście | Podgląd przywraca poprzedni stan, klik pozostawia 4 SaaS; nie usuwa KAN |
| Klawiatura | Tab do karty → hover innej bramy → Arrow/Home/End | Skupiona karta nie znika przez hover; sterowanie pozostaje lokalne |
| Małe kolekcje | Gry n=1, Platformy n=1, WWW n=2, mobile n=3, SaaS n=4 | Brak klonów; prawidłowa pozycja i przyciski; brak pustego obrotu singletona |
| Gest | Swipe n=1 lub n=14 → compatibility click; pointercancel; pionowy scroll | Brak przypadkowego hologramu; gest pionowy należy do strony |
| Wheel | Pionowy/ukośny wheel, następnie intencjonalny poziomy | Scroll strony działa; poziomy wheel przesuwa ekspozycję w sposób ograniczony |
| Otwieranie | Sąsiednia karta → zmiana filtra/visibility przed 650 ms | Anulowane otwarcie nie otwiera nieaktualnego projektu |
| Dialog | Otwórz → przewiń → zamknij → inny projekt | Nowa prezentacja zaczyna od scrollTop 0; focus wraca do właściwej karty/fallbacku |
| Dialog | Escape, szybkie zamknięcie/ponowne otwarcie, reduced motion w trakcie | Brak stale timerów i fokusu za modalem; tylko jeden aktywny hologram |
| URL | `?q=...&utm_source=...&kategoria=saas&projekt=...` → ruch/close/popstate | Zachowane q/UTM i ścieżka; stan kategorii/projektu spójny z URL |
| Fallback | Brak JS lub showModal, Ctrl/Cmd/middle click | Prawdziwa trasa case study pozostaje dostępna |
| Hero | Fine pointer → leave → hidden → reduced motion | Cała scena przesuwa się razem i resetuje; brak osobnego ruchu znaku |
| Hero | Bez JS, 320/390/768/1050/1051/1440 px | Nagłówek i CTA widoczne, logo osadzone w murze, brak niezamierzonego kadrowania |

Istniejące punkty odniesienia w kodzie: showroom `:88–100` (URL/podgląd),
`:102–142` (inert/focus), `:144–174` (opóźnione otwarcie/historia), `:179–205`
(bramy), `:226–308` (gesty/wheel/hologram/visibility); hologram `:104–110`
(focus/scroll), `:154–231` (cykl otwarcia/zamknięcia); hero `:12–49` (reset/rAF).
Istniejące testy handlerów: `tests/project-showroom.test.cjs` oraz
`tests/project-hologram.test.cjs`. Nie dowodzą fizycznego gestu lub renderu CSS.

### Subtelne watermarki PK

1. Najwyżej dwa pseudo-elementy/warstwy w ustalonych sekcjach: O mnie/współpraca
   i wybrane przejście. Maska korzysta z dokładnej alfy
   `assets/brand/progressorkit-stamp.png`, o SHA-256 podanym wyżej. Nie dodawać
   nowej geometrii, obrysu, liter, prostokątnego tła ani odmiany logo.
2. Ciemny kolor i widoczność rzędu 2–4%, ze znakiem umieszczonym poza głównymi
   akapitami. To deklaracja intencji materiału; rzeczywista czytelność oraz
   subtelność wymagają oceny w przeglądarce i pozostają **OPEN**.
3. Dekoracja jest pozycjonowana poza przepływem, ma `pointer-events:none`
   i nie zwiększa wysokości sekcji. Nie nakładać `overflow:hidden` na kontener
   w sposób obcinający focus outline, rozwijaną treść lub CTA.
4. Arkusz nie zmienia tekstów, breakpointów treści, paddingów ani routingu.
   Sprawdzić layering/isolation, by znak nie zasłaniał linków, tekstu lub modala
   i nie wprowadzał nowego poziomego overflow strony.
5. Na mobile wariant uproszczony lub ukryty. W print i forced colors akcenty
   są wyłączone. Dekoracja nie jest osobnym punktem Tab ani dostępnym obrazem
   wymagającym odczytu przez czytnik ekranu.
6. Potwierdzić obecność arkusza w wygenerowanej homepage i allowliście publicznego
   artefaktu oraz poprawne rozwiązanie względnego URL maski względem CSS.
   Sam plik w repo nie potwierdza integracji lub wyświetlenia.

### Dane, kolejność, routing i publiczny artefakt

- Zachować zbiór 14 identyfikatorów i ich kolejność w bazowym showroomie/JSON.
  Katalog pozostaje 14/9, a null-stage nie zmienia się w Alpha/Beta.
- Zachować kolejność sekcji oraz pojedynczy brief, kontakty i About z CTA.
  Pełny katalog, wyszukiwarka i historia rozwoju pozostają pod `projekty/`.
- Pełne case studies zachowują źródła i zakresy weryfikacji; stary adres
  `progresskit-mail/`, dystrybucja Glikemii oraz `prywatnosc/` nadal działają.
- Nowe CSS/JS muszą trafić do homepage przez generator i do jawnej allowlisty
  `scripts/stage-public.py:13–30`; aktualizacja pliku w repo nie jest dowodem
  obecności w artefakcie. Nie udostępniać rendererów Python, dokumentacji audytu,
  repozytoriów lub całego katalogu assets.
- Kontrole istnieją w `tests/test_owner_correction.py:36–82` (order/14/linki),
  `tests/test_site_v5.py:149–202` (generator/trasy/ID/ARIA), `:239–248` (źródła),
  `:259–296` (media/sitemap/allowlista) i `tests/test_preview_v5.py:21–49`
  (staging/HTTP/404). Wyniki przyszłego uruchomienia należy wpisać po zakończeniu.

## Stan dowodów i bramki

| Kontrola | Stan w tym raporcie |
| --- | --- |
| Odczyt katalogu 14/9, istniejących tras i źródeł hero | VERIFIED — lokalny odczyt plików |
| Odczyt wynikowego HTML, order, 14 unikalnych kart, brak powtórzonych DOM id | VERIFIED — parser, bez renderu przeglądarki |
| Nowe ikony: źródła SVG i kontrakt renderera | VERIFIED — oddzielny odczyt poniżej; render przeglądarki OPEN |
| Nowa wystawa: renderer / JS / CSS | VERIFIED — odczyt integracji, parser oraz 13 kontroli handlerów poniżej |
| Nowa wystawa: realny render / dostępność w browserze | OPEN |
| Watermarki PK: maks. dwa / oryginalna maska / pozycjonowanie | VERIFIED w źródłach; odbiór i rzeczywisty layout OPEN |
| Motto po H1 / lokalny italic / flow i print override | VERIFIED — DOM, CSS, hash/font metadata; render OPEN |
| Pełne uruchomienie testów / staging / HTTP | Wyniki koordynatora opisano poniżej; bez ponownego uruchomienia pełnych suit przez reviewera |
| Browser: render, interakcje, gesty, powiększenie, klawiatura | OPEN — wspierana sesja niepotwierdzona |
| Lighthouse / płynność / odbiór artystyczny | OPEN |
| Akceptacja właściciela | OPEN |
| Produkcyjne opublikowanie tych zmian | NOT DEPLOYED |

Koordynator ponowił diagnostykę wspieranego Browser: `getForUrl` ponownie zwrócił
błąd, a lista narzędzi pozostała pusta. Jest to ograniczenie dostępu do sesji,
nie wynik testu nowego UI. Nie uruchamiano alternatywnej przeglądarki.

## Ślad odczytanego baseline

| Plik | SHA-256 |
| --- | --- |
| `catalog/projects.json` | `992e8c5330d946e4b0bd99316ea67548c04e3568ade04071e347dfdedb134487` |
| `scripts/build-site.py` | `75cafdbea1be9a3b01d1b8e5d6dd9c3466ae5f0c42f684f54bba6eef53a88d9c` |
| `scripts/showroom_markup.py` | `53caf60f047fa18e85cf0c608f9b0a9eaf9a54dfedc2a93a1dffce4d690e85b6` |
| `assets/project-showroom.js` | `3d588a14c72faa84e9dd5551a627d9ae096a3d0a0ba534396782b46a00fa6a76` |
| `assets/project-hologram.js` | `b78d4ddc6483d238f64e72ee2d0daaf9254091e135acfdec3377d4af06be2f08` |
| `assets/hero-space.js` | `03a53bffaf703891f893250ce8ff0f5e19fa98fe1e18f23df73e78f21c05eddd` |
| `assets/project-showroom.css` | `7e174972722e27047aca05cac15f8b63580908b25c6dafa998d089715ea932f3` |
| `assets/project-hologram.css` | `61eed580369f1c3f6fe834009e72d0d2dd06c1afe884be9c6f4de3c26b21174b` |
| `templates/hero-scene.svg` | `7fa04cf899bfa07f7ba1ffc327036143a2df520f1f2fc4e8299c65b3de32fef0` |

## Niezależny odczyt gotowych źródeł ikon

Po zapisie baseline autor przekazał gotowe `scripts/showroom_markup.py` oraz
`assets/project-showroom.css`. Renderer wywołano w pamięci na aktualnym katalogu;
nie zapisywano HTML i nie zmieniano kodu/testów. Każdy fragment SVG odczytał parser
XML. Wynik: sześć SVG z `viewBox=0 0 32 32`, `stroke=currentColor`,
`stroke-width=1.5`, `aria-hidden=true`, `focusable=false`, bez dodatkowego id,
tabindex, title lub href. Sześć bram zachowuje `type=button`, swoje kategorie,
`aria-controls=showroom-track` oraz inicjalne `aria-pressed=false`. Wynik renderera
nadal zawiera 14 kart o 14 unikalnych identyfikatorach i nie powtarza DOM id.

W źródłach widać właściwe motywy: telefon/chmura/ludzie/gamepad/glob/serwer
(`scripts/showroom_markup.py:6–12`), SVG dekoracyjne i natywne etykiety (`:38`).
CSS wyłącza pointer events SVG, zachowuje focus bram, przewiduje rozmiary
48/44/42 px oraz forced colors (`assets/project-showroom.css:30–37`, `:66–110`).
Nie znaleziono potwierdzonego błędu w tym zakresie źródeł. Wygląd, kontrast,
rozpoznawalność i zachowanie wskaźnika w zintegrowanym renderze pozostają **OPEN**.

| Źródło ikon odczytane po baseline | SHA-256 |
| --- | --- |
| `scripts/showroom_markup.py` | `3dbb0d359e4c62174959e1c07bc797fe915c7cd8ba80529a5b89199c11730b6d` |
| `assets/project-showroom.css` | `2564e44122116db2c63c84bcb94efaacd39ac4315e0db713570290c700b3a028` |

## Końcowy niezależny review po integracji

Odczytano gotowe renderer/JS/CSS wystawy, źródła ikon, watermarki, scenę SVG,
efekty hero i powiązania generatora oraz allowlisty. Ponownie odczytano wynikowy
`index.html` i strony wskazywanych źródeł. Nie zmieniano kodu/testów w repozytorium,
nie wykonywano operacji Git, nie publikowano strony i nie uruchamiano alternatywnej
przeglądarki. Jedyny dodatkowy adapter znajduje się w `/tmp`.

### EXH-01 — strzałki przechwytywane niezależnie od orientacji: ZAMKNIĘTE

W pierwszym odczycie `assets/engineering-exhibit.js:61–68` akceptował wszystkie
cztery strzałki i wykonywał `preventDefault` przy obu orientacjach. Dla poziomego
tablist na mobile oznaczało to zmianę analizy po ArrowUp/Down zamiast pozostawienia
pionowego przewijania strony. Koordynator poprawił dobór klawiszy według
`horizontal.matches`: poziomo Left/Right, pionowo Up/Down, zawsze Home/End.

Poprawkę zweryfikowano na rzeczywistym pliku produkcyjnym, bez kopiowania jego
logiki do testu. Adapter `/tmp/v5-exhibit-handler-review.cjs` uruchamia ten JS
w syntetycznym DOM. Wynik: **13 kontroli PASS, 0 FAIL**, obejmujących:

- pozostawienie natywnych defaultów Up/Down poziomo i Left/Right pionowo;
- właściwe strzałki, wrap, Home/End, fokus wybranego taba i modyfikatory klawiszy;
- kliknięcie → dokładnie jeden aktywny/otwarty panel i jeden tab z tabindex=0;
- Escape → zamknięcie zagnieżdżonej analizy i focus jej summary;
- kolejny Escape → focus aktywnego taba; brak reakcji ukrytego panelu;
- zmianę orientacji bez zmiany analizy, następnie właściwe nowe strzałki;
- reduced motion oraz role/powiązania tablist, tab i tabpanel.

SHA-256 badanego JS:
`6c5ba9fbb449df46e04ad44fc502cc372a1f120c7acff40e6b33690646311688`.
Jest to dowód wykonania handlerów i wywołań focus w adapterze; nie potwierdza
realnej nawigacji czytnika ekranu, przewijania ani fokusu w przeglądarce.

### Potwierdzone właściwości gotowej wystawy

- W zintegrowanym HTML jest sześć prezentacji: Mail, Community, Vaeloria,
  Glikemia, Tax, Translator. Parser porównał wszystkie 24 opisy faz z odpowiednimi
  polami `cases[0]`: treść jest zgodna, kolejność Problem/Diagnoza/Rozwiązanie/Wynik
  zachowana. Widoczne krótkie tytuły nie zastępują opisów źródłowych.
- Każda z sześciu analiz linkuje etykietą `source.label` do istniejącego
  `#source-<id>` na właściwym case study. Sprawdzono istnienie każdego fragmentu
  oraz `#wyzwania`; nie wyświetla się surowy identyfikator jako nazwa źródła.
- Role tabs są nakładane na przyciski i oddzielne div-panel wrappers, nie na
  natywne details. Każdy panel ma własne `aria-labelledby`, selektor
  `aria-controls`, a listwa posiada etykietę i aktualizowaną orientację.
- Bazowy HTML zachowuje sześć natywnych disclosures, pierwszy otwarty; kontrolki
  JS są ukryte. CSS ukrywa summary paneli dopiero pod lokalnym `.is-enhanced`,
  dodanym po sprawdzeniu wymaganych elementów. Bez JS treść i case links
  są osiągalne przez native summary. Rzeczywisty render no-JS pozostaje OPEN.
- Nowy układ nie korzysta z `.engineering-list`/`.challenge-grid`/`.challenge`,
  więc stare selektory pionowej listy nie trafiają w prezentacje. Nowy arkusz
  jest ładowany po `home-atmosphere.css`; własne elementy mają oddzielne selektory.
- Nie znaleziono wspólnych handlerów sterujących wystawą i showroomem/hologramem.
  Wystawa nie zmienia URL, nie obsługuje wheel/drag/hover-selection i nie ma
  autoplay ani własnych timerów ruchu. Obsługa klawiszy jest lokalna.

### Potwierdzone korekty hero i atmosfery

- Oryginalny PNG PK pozostał niezmieniony: SHA-256
  `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
  W SVG obraz ma 260×260 i położenie
  `translate(1600 240) matrix(1 -0.16 0 1 0 0)` (`templates/hero-scene.svg:38–39`).
  Geometryczny środek tego pola wypada około (1730,349), lecz wizualne osadzenie
  na kamieniu wymaga odbioru. Logo nadal czerpie geometrię z alfy oryginału,
  z wcześniej opisaną zmianą materiału przez filtr reliefu.
- Litery korzystają z istniejącego `--approved-hero-image` wraz z ziarnem
  `stone-material.svg`, klipowaniem tekstu i filtrem `stone-letter-cut`
  (`assets/hero-monument.css:76–109`, `templates/hero-scene.svg:5–8`). Źródło
  krajobrazu jest to samo; poziom „kamienności” i dopasowanie do gór nie otrzymują
  oceny PASS bez renderu. Fallback koloru oraz print/forced colors są obecne.
- Sylwetka ma osobne dekoracyjne `g.hero__climber[aria-hidden=true]` na
  `translate(1396 580)`; jej rysunek ma około 26 jednostek wysokości w źródłowym
  viewBox (`templates/hero-scene.svg:42–52`). JS zmienia maksymalnie 1,2 px
  uniesienia wewnętrznej grupy i opacity 0,60–0,72, wyłącznie od fine pointer.
  Nie ma animacji autonomicznego chodzenia. Reset usuwa oba parametry razem
  z parametrami sceny (`assets/hero-space.js:12–21`, `:23–45`). Reduced motion
  wyłącza transformację sylwetki. Skala postaci na ekranie i kontakt ze zboczem
  pozostają OPEN.
- `brand-atmosphere.css` nakłada dokładnie dwa akcenty na `.about-v5::after`
  i `.technology-section::after`, z maską oryginalnego PNG, opacity 0,035/0,028,
  pozycjonowaniem absolute i `pointer-events:none`. Wysokości warstw mieszczą się
  w istniejącym dolnym paddingu; arkusz nie zmienia paddingu, treści ani wysokości
  sekcji. Obie sekcje mają już isolation/position z wcześniejszego arkusza.
- Watermarki są wyłączone do 1100 px oraz w print/forced colors. Maski mają lokalny
  URL poprawny względem katalogu assets i clip-path na samych dekoracjach.
  Źródłowy układ nie sugeruje zwiększenia scroll height; subtelność i rzeczywisty
  brak kolizji nadal wymagają kontroli wizualnej.

### Dane, order i integracja

Ponowny parser potwierdził katalog **14 projektów / 9 obrazów galerii**, niezmieniony hash
JSON i brak zduplikowanych DOM id w całej homepage. Kolejność pozostaje
`start → projekty → o-mnie → wyzwania → technologie → kontakt → brief`.
Sześć ikon nadal obsługuje ten sam showroom; jego JS i JS hologramu nie są
zastępowane logiką wystawy. Nowe arkusze i JS są podłączone do homepage przez
generator oraz ujęte w jawnej allowliście publicznej.

Koordynator przekazał zakończony wynik **82 Python + 36 Node = 118 PASS,
0 FAIL, 0 SKIP**, oraz **107 HTTP PASS, 0 FAIL** dla świeżego preview.
Python uruchomiono ponownie po korekcie motta; wynik Node pochodzi z ostatniego
przebiegu dla niezmienionego JS. Bieżąca allowlista zawiera **57 plików**;
niezależny odczyt `public_files()` potwierdził tę liczbę i obecność fontu/licencji.
Nie uruchamiano tych pełnych zestawów ponownie w tym niezależnym review.
Do powyższych liczb nie doliczać 13 tymczasowych kontroli jako testów repozytorium.

### Motto pod H1 — końcowy odczyt korekty

Parser bieżącego `index.html` potwierdził dokładnie jedno `p.hero__motto`,
o niezmienionym tekście, jako bezpośrednio następny element po H1 wewnątrz
`hero__stone-title`. Kolejność dzieci to eyebrow → H1 → motto.

`assets/hero-monument.css:118–133` nadpisuje starsze absolute/bottom z
`site-v5.css`: `position:static`, `inset:auto`, `width:auto` i górny margin
20–30 px umieszczają akapit w przepływie po nagłówku. Współczynnik linii wynosi
1,65, font 20–26 px; do 600 px dochodzi 18 px i max-width 28ch (`:160–167`).
Reguły dla 1050/600/360 px nie przywracają dolnego pozycjonowania motta.
Samo motto nie ma transformacji, a fallback to Georgia/serif. To kontrola
reguł i ich kolejności; rzeczywiste zawijanie i kolizje na viewportach są OPEN.

Plik `assets/brand/motto-serif-italic.ttf` (346544 B) jest byte-identyczny z
systemowym `DejaVuSerif-Italic.ttf`, SHA-256
`1d7476da447f9455a47c41adfd6ac2b1fc1b65e660f3ea4bf36128506c7e094c`.
Odczyt `fc-query` rozpoznał DejaVu Serif / Italic i wykazał pokrycie wszystkich
znaków motta, w tym polskich liter oraz pauzy. Font i istniejąca licencja DejaVu
są w allowliście. Deklaracja font-face używa italic 400 oraz font-display:swap.

**MOT-01 — kolor motta w druku: ZAMKNIĘTE w źródłach.** Reviewer zgłosił,
że własny jasny kolor i text-shadow utrzymywały się po zmianie tła wydruku
na białe. Koordynator dodał lokalne `color:#000; text-shadow:none`
w `@media print` (`assets/hero-monument.css:190`); końcowy odczyt potwierdził
ten override. Forced colors także jawnie ustawia CanvasText i usuwa cień.
Nie wykonano podglądu ani fizycznego wydruku.

### Ślad końcowego odczytu

| Plik | SHA-256 |
| --- | --- |
| `scripts/engineering_exhibit.py` | `10c981448bd97ae7c9e5ae5cc175732fdc1cfcc25175b80fe132a25f08864dde` |
| `assets/engineering-exhibit.css` | `442ce6bfddfabac59af88ffc4afb4f3af689a6fd4cb90fcb325d21d3a5fead6a` |
| `assets/engineering-exhibit.js` | `6c5ba9fbb449df46e04ad44fc502cc372a1f120c7acff40e6b33690646311688` |
| `assets/brand-atmosphere.css` | `fbcd495c6b79af160a023c73e1e07c94e5d5c54f2da7acadfe06a269c0195b5d` |
| `assets/hero-space.js` | `633a2ad9690f0da9210e309d7aaebc407ceb719feca362be22aaaf83e4c86466` |
| `assets/hero-monument.css` | `1240409d0a0d68b4710ed2dbdc9d271c0a3704ab46fdae10366e8553498b46e5` |
| `templates/hero-scene.svg` | `a2944ebc08f22ceeaba3579e7b1ca6790092f1f81cc1ee8488f8fa7e64ba739d` |
| `scripts/build-site.py` | `142b39e5f7097df13a6e51948bb6649b3965bb9619b30ddf78e1cdc73e062215` |
| `scripts/stage-public.py` | `2e210d82118e1a69655e169ff2f6254d54494f233214e61e91f6fc758966051e` |
| `assets/brand/motto-serif-italic.ttf` | `1d7476da447f9455a47c41adfd6ac2b1fc1b65e660f3ea4bf36128506c7e094c` |
| `index.html` | `cb5046deba684f34addb3993bd85e293a433a35a928a0f9b9cc01806b897fa42` |

**Werdykt źródłowy:** zgłoszoną regresję strzałek poprawiono i zweryfikowano
na rzeczywistych handlerach; poprawiono także kolor motta w CSS wydruku.
Nie znaleziono kolejnego potwierdzonego błędu
blokującego w odczytanym zakresie. To nie jest deklaracja pełnej zgodności
wizualnej, dostępności w czytniku ekranu lub braku wszystkich regresji.

**Nadal OPEN:** rzeczywisty render wystawy i ikon, kadrowanie/breakpointy,
czytelność materiału liter, watermarków i kursywy motta, położenie PK i sylwetki, realne
gesty/klawiatura/focus, wydajność/Lighthouse oraz odbiór właściciela.
`ownerVisualApproval` pozostaje OPEN. **Status produkcyjny: NOT DEPLOYED.**
