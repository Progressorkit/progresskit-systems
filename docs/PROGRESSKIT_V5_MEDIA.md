# ProgressKit V5 — media, pochodzenie i prywatność

Stan z 2026-10-15: katalog zawiera **9 rzeczywistych obrazów w 5 projektach**, bez filmów. Dwa obrazy Glikemii były już w checkoutcie; siedem wybrano z istniejących źródeł produktu lub historii V4. Nie wygenerowano nowych ekranów ani grafik zastępujących dowód działania. Ta lista dotyczy galerii V5 portfolio; nie należy jej utożsamiać z odrębną dziewięcioobrazową galerią strony Vaelorii.

Oddzielny zasób marki to krajobraz hero z konkretnego źródła wskazanego przez
właściciela. Późniejsza wyraźna instrukcja dopuściła usunięcie wtopionego UI przy
użyciu edycji obrazu. Ta autoryzowana edycja dekoracyjnego tła nie zmienia pochodzenia
dziewięciu screenshotów produktów i nie jest nowym ekranem produktu.

Źródło zestawienia importu: `/tmp/v5-media-provenance.json`. Poniżej utrwalono jego istotne dane, gdyż plik w /tmp nie jest trwałym repozytoryjnym rejestrem. Każdy obraz obejrzano w całości. Teraz odczytano wymiary, rozmiary, hashe oraz brak tagów EXIF; nie przeprowadzano ponownie sesji fizycznych widocznych na screenshotach.

## Materiały ujęte w kandydacie

Ścieżki w tabeli są względne do repozytorium portfolio.

| Projekt / plik | Wymiary | Bajty | Pochodzenie i obowiązkowa granica podpisu |
| --- | --- | ---: | --- |
| Glikemia — `assets/projects/glikemia/product-measurement.webp` | 648×1440 | 49 308 | Istniejący screenshot pustego formularza; brak pomiarów i notatki użytkownika |
| Glikemia — `assets/projects/glikemia/product-language.webp` | 648×1440 | 53 726 | Istniejący ekran wyboru języka, bez danych użytkownika |
| Community — `assets/projects/progresskit-community/community-desktop.webp` | 1440×1000 | 436 464 | Lokalne QA 14.10.2026 na danych syntetycznych; nie dowód wdrożenia |
| Community — `assets/projects/progresskit-community/community-mobile.webp` | 390×844 | 108 532 | Lokalne QA 14.10.2026 w mobilnym viewporcie przeglądarki; nie fizyczny telefon |
| Vaeloria — `assets/projects/vaeloria/earth-exploration.webp` | 1080×2400 | 379 354 | Historyczny fizyczny Redmi, trasa Earth 3D; materiał diagnostyczny o potwierdzonej równoważności renderowania, oprawa prototypowa |
| Vaeloria — `assets/projects/vaeloria/tactical-battle.webp` | 1080×2400 | 241 266 | Historyczny fizyczny Redmi, rzeczywisty tutorial z Irią BOT; nie rozgrywka PvP |
| Translator — `assets/projects/progresskit-translator/translator-start.webp` | 1080×2400 | 653 132 | Rzeczywisty ekran Redmi w wersji 0.2.0; nie obraz potwierdzający cały stan 0.2.2, separację TWS ani odsłuch |
| Mail — `assets/projects/mail/mail-splash.webp` | 688×1536 | 19 958 | Materiał V4, ekran startowy bez danych skrzynki |
| Mail — `assets/projects/mail/mail-delete-redacted.webp` | 688×1536 | 24 150 | Materiał V4; oryginalnie zamazane tło korespondencji i czytelny dialog potwierdzenia usunięcia |

Łączny rozmiar tych dziewięciu plików: **1 965 890 bajtów**. WebP zachowuje podane pełne wymiary. Obrazy karty i galerii korzystają z tych samych zasobów; nie deklarujemy osobnej wygenerowanej serii małych miniatur.

Wszystkie dziewięć obrazów ma **0 tagów EXIF** według PIL. Informacje odczytane z kontenera WebP ograniczały się do kluczy loop/background. Brak EXIF nie zastępuje przeglądu widocznej treści; dlatego wykonano obie kontrole.

## Trwałe odciski plików galerii

| Plik | SHA-256 |
| --- | --- |
| `glikemia/product-measurement.webp` | `710f95be5c4ad7f729020b666119d2c73492ec0227c95eae2e95a229404f0a58` |
| `glikemia/product-language.webp` | `cfe78f53657a8d7d254f59febd12bfefcb4499ebff0f4946df1f6e9a1d91712c` |
| `progresskit-community/community-desktop.webp` | `c5be155a8136796954f4339cbbdd602b85d2ff5f93d5db7d06f92773c1d04b9c` |
| `progresskit-community/community-mobile.webp` | `05b969cfdeee4cf7306d198b2795ae508bab7dcc89bf988023167c1474e36462` |
| `vaeloria/earth-exploration.webp` | `8ac36043d9d0e66dec147b2aa974c5149ab4850a5df1e3938cd6d8fb58e29894` |
| `vaeloria/tactical-battle.webp` | `0e51c68bdecf5d89ae62e5e418343f566d62539a56707a0f72b8a49a791dc187` |
| `progresskit-translator/translator-start.webp` | `d990cd8390b3f873f4d5fddb2d93fa65b247863560117d91c22aca0c775aae78` |
| `mail/mail-splash.webp` | `5d27885a07a088746087e821c9f70e798a9e96427f87d050c4fe5bd81929c5a1` |
| `mail/mail-delete-redacted.webp` | `e06c9fa6cedebd5d3268be0c871f95bd300a36ccba066cba61649b186a6fb261` |

W tej tabeli skrócono wspólny prefiks `assets/projects/`. Wszystkie siedem hashy importowanych plików zgadza się z manifestem /tmp. Dwa pliki Vaelorii i dwa pliki Mail są kopiami bajtowo zgodnymi ze wskazanym źródłem WebP. Community i Translator przekonwertowano z PNG, więc hash pliku źródłowego i docelowego celowo jest różny.

## Źródła oryginalne i ograniczenia dowodowe

Wszystkie poniższe ścieżki produktów są względem wspólnego katalogu `/home/pawe/Pulpit/Projekty It/`; służą wewnętrznemu audytowi i nie trafiają do katalogu publicznych metadanych.

**Glikemia:** obecne assety portfolio, obejrzane niezależnie w pierwszej części audytu. Pusty formularz ma wartości początkowe 0 oraz puste pole notatki; ekran języka nie zawiera danych zdrowotnych. Dokumentacja: `docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md:137`–`:149`. Nie przypisano im nieznanej daty wykonania ani nowego wyniku fizycznego QA.

**Community:** `progresskit-community/docs/evidence/community-discovery/desktop.png` oraz `mobile.png`. Źródłowy kod audytowano na `c64296e0`; katalog dowodów był zastanym materiałem lokalnym i nie był śledzony tym commitem. Nie przedstawiamy więc hashy PNG jako plików niezmiennego commita. Ich obecne SHA-256:

- desktop PNG: `cd95bf96f469cf062bf303b5451bca349008977379312bf395f07a40c8d287d3`, 639 552 bajty;
- mobile PNG: `6de26eaf882c8ba980afe66844eda09c0c0684278d87d11eadd01158e9fe6c7e`, 150 985 bajtów.

Dokumentację pochodzenia wskazuje `docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md:159`–`:165`, odsyłając do produktowych `docs/COMMUNITY_DISCOVERY_VALIDATION.md:123`–`:147` oraz `docs/COMMUNITY_DISCOVERY_CLOSURE_AUDIT.md:128`–`:145`. Widzoczne społeczności są syntetyczne; brak nazw kont, adresów e-mail i chrome przeglądarki. Statyczny obraz mobilnego viewportu nie stanowi fizycznego testu telefonu.

**Vaeloria:** kopie z `Vaeloria/builds/public-preview/site/assets/04-earth-exploration.webp` i `07-tactical-battle.webp`. Źródła właściwych capture'ów i ich daty są w `Vaeloria/deploy/preview/public-gallery.json:97`–`:120` oraz `:172`–`:195`:

- Earth: 13.10.2026, 08:36:17 UTC; produkcyjna trasa eksploracji i klasyfikacja DIAGNOSTIC_RENDERING_EQUIVALENT. Oryginalny PNG ma hash `4f5c5fb518dd01ac5f71e5d237bab5e55f19e7350566fcd2d34639a7a81f5df2`.
- Tutorial battle: 13.10.2026, 08:31:44 UTC; produkcyjna trasa tutorialu i EXACT_ORIGINAL_APK_PAYLOAD_EQUIVALENT. Oryginalny PNG ma hash `b0d7023e1d644ab6bf9ca4786ae12a28d3631e93c8113498f4d09cb150b2368e`.

`Vaeloria/docs/VAELORIA_PUBLIC_WEBSITE_RELEASE.md:49`–`:68` wyjaśnia rozdzielenie capture'ów z pierwotnego i diagnostycznego APK oraz brak przenoszenia między nimi statusu fizycznego QA. Nowszych assetów EOS nie podstawiono pod stare zrzuty. Nie użyto konceptów lub referencyjnych makiet. Te materiały pokazują grę w konkretnej historycznej wersji; nie potwierdzają dzisiejszego stanu wdrożenia ani pełnego odbioru aktualnego kodu.

**Translator:** `ProgressKitTranslator-v0.1/docs/evidence/redmi-start-v0.2.png`, źródłowy SHA-256 `3be0a5230c446e7144c73add64720d0bc5d7737da2ec75161040b4f6615d72b1`, 1 055 091 bajtów. Raport historycznego Sprint 02: `docs/SPRINT_02_REPORT.md:47`–`:56`, `:128`. Podpis jawnie mówi o UI 0.2.0, podczas gdy wpis katalogu opisuje bieżące źródła 0.2.2. Nie ma rozpoznanej rozmowy ani historii tekstów w widocznym kadrze. Przełącznik Stereo jest elementem UI, nie dowodem poprawnego routingu słuchawek.

**Mail:** dwa pliki pobrano z istniejącego drzewa `origin/main` portfolio: `assets/projects/mail/mail-splash.webp` i `mail-delete-redacted.webp`. Przy weryfikacji `origin/main` wskazywał `a36969be91c0f969842a6bb3ed164729d4b09168` z 11.09.2026; nie jest to data wykonania screenshotów. Oba hashe źródeł Git są identyczne z docelowymi hashami powyżej. Pierwszy pokazuje branding. Drugi ma już w źródle zamazane tło; w całym obejrzanym kadrze nie jest czytelna treść poczty, dane nadawcy lub adres skrzynki. Zostawiono wyłącznie dialog produktu i zanonimizowane otoczenie. Sam tekst dialogu nie potwierdza, że operację usunięcia teraz wykonano.

## Tło hero i oryginalne logo marki

Właściciel wskazał plik
`/home/pawe/Pobrane/a_dark_cinematic_high_end_ux_ui_website_landing.png`
i upoważnił do wyodrębnienia istniejącego krajobrazu oraz usunięcia wtopionego UI.
Źródło ma 1024×1536 px, 2 062 911 B, SHA-256
`d0bdf4566efcce79dd43d6ab7f5c156be66047ea2fd023cf310d283989478a5a`.
Pełna makieta nie jest publikowana i nie jest screenshotem funkcji produktu.

Jedno wywołanie wbudowanego imagegen w trybie edycji istniejącego obrazu usunęło
napisy, CTA i wtopione litery muru; odtworzyło zasłonięte fragmenty krajobrazu.
Źródło pozostało niezmienione. Wynik nie jest identycznym pikselowo cropem:
rekonstrukcja może zmieniać drobne szczegóły tekstur. Nie generowano nowego PK,
napisu PROGRESSKIT ani alternatywnej koncepcji krajobrazu.

Zasób `assets/brand/hero-landscape-v5.webp` ma **1983×793 px**, **201 050 B**,
SHA-256 `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
Obejrzano wynik PNG i zoptymalizowany WebP; raport edycji opisuje zachowane góry,
księżyc, mur i czerwone światło oraz brak wtopionego UI. Dokładny prompt, hash PNG,
parametry konwersji i ograniczenia są w [PROGRESSKIT_V5_HERO_ASSET.md](PROGRESSKIT_V5_HERO_ASSET.md).
Ten plik jest tłem marki poza licznikiem 9 obrazów galerii i poza ich łącznym rozmiarem.

W hero użyto oryginalnego miedzianego logo
`assets/brand/progressorkit-stamp.png`, zgodnie z doprecyzowaniem właściciela.
Jest bajtowo identyczne z `/home/pawe/Pulpit/logopkpod.png`: **1254×1254 RGBA**,
**1 202 603 B**, SHA-256
`b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
Plik oryginału i jego geometria są niezmienione. Najnowsze HERO renderuje z jego kanału alpha kamienny relief z cieniem wewnętrznym i czerwonym odbiciem w jednej scenie z murem. Nawigacja zachowuje oryginalny PNG. Szczegóły: `PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md`.

`catalog/brand.json` wskazuje krajobraz, `heroSourceStatus: REVIEWED_EDIT` oraz
`ownerVisualApproval: OPEN`; `assets/hero.css` jest generowane. Źródło nie jest już
brakujące. Oględziny pojedynczego pliku nie są testem kadrowania strony ani akceptacją
właściciela. Przeglądarka i końcowa kompozycja nadal **OPEN**; niczego nie opublikowano.

## Zachowany materiał użytkownika i wykluczenia

Oryginalny plik użytkownika `assets/projects/vaeloria/vaeloria-cover.png` pozostaje w working tree. Nie usuwano go, nie nadpisywano i nie włączono do galerii rozgrywki. Rozmiar **2 349 058 bajtów**, 1920×1080, SHA-256:

`726f9a9261e9db134d8f4cca05398beaae1dff4a6a258061372467b84ec3b2cc`

Hash jest zgodny z odczytem preflight przed zmianami, potwierdzonym w sesji koordynującej sprint, oraz ponownym odczytem obecnego pliku. Snapshot pierwotnego indeksu i patch użytkownika zachowano w `/tmp/progresskit-v5-before/`. Filmowy/ilustracyjny kadr wprowadzenia nie jest screenshotem eksploracji, areny ani dowodem docelowej jakości gry. Jawna lista publikowanych plików w `scripts/stage-public.py:11`–`:25` nie dodaje całego katalogu assets; ten PNG nie trafia do kandydata publicznego.

Pozostałe niewłączone materiały:

- Historia i raporty Glikemii: nie publikujemy wartości zdrowotnych bez jednoznacznego potwierdzenia syntetycznego pochodzenia każdego widocznego rekordu. Istniejące pliki pozostawiono.
- GoTrans360: stare obrazy mają chrome przeglądarki/lokalne adresy i elementy sugerujące rezerwację lub tracking szerszy niż potwierdzony prototyp. Powód selekcji: `docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md:165`.
- KAN/RWR i Obserwator: obecne okładki zawierają chrome, lokalne adresy lub tekst związany z kontem; nie włączono do nowej galerii. `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:100`–`:105`.
- Tax: istnieją materiały QA, ale wymagają osobnej selekcji bez danych klientów.
- Adivara, Ignira i zaplecze: nie dodano zastępczych wygenerowanych interfejsów.

Brak galerii jest jawnym ograniczeniem prezentacji, a nie dowodem braku implementacji. Wstępne raporty agentów opisujące puste galerie Mail/Translator/Community/Vaelorii dokumentują etap przed późniejszą selekcją; ten rejestr i bieżący katalog zawierają stan po selekcji.

## Zasady utrzymania galerii

1. Wybierz istniejący prawdziwy ekran i zapisz źródło, datę, rewizję/wersję oraz środowisko. Gdy capture jest historyczny lub pochodzi z fixture, napisz to w podpisie.
2. Obejrzyj cały kadr, także status bar, tło dialogu, adres przeglądarki i notyfikacje. Usuń materiał z selekcji, jeżeli prywatne dane są czytelne lub pochodzenie niejasne. Nie pobieraj danych użytkowników w celu „zrobienia lepszego screenshotu”.
3. Przy konwersji zachowaj pełny użyteczny interfejs i proporcje. Zapisz osobno hash źródła i wynikowego pliku. Nie zastępuj brakujących ekranów mockupem wyglądającym jak działająca funkcja.
4. Dodaj plik i rekord `{src, alt, caption, width, height}` do `gallery` właściwego wpisu. Alt opisuje widoczny ekran; podpis wskazuje wersję i ograniczenia. Nie deklaruj wyniku testu dźwięku, sieci lub bezpieczeństwa z samego obrazu.
5. Waliduj ścieżkę i rzeczywiste wymiary; przebuduj generowane strony i wykonaj kontrolę podglądu. Publikuj przez istniejącą listę dozwolonych plików, nie przez kopiowanie całego repozytorium lub assets.
6. Uzupełnij ten rejestr wraz z recenzją nowego materiału. Nie wysyłaj do publicznego artefaktu lokalnych manifestów QA, surowych logów lub niniejszej dokumentacji wewnętrznej.

Generator ustawia rzeczywiste wymiary, alt, caption, `loading=lazy` i `decoding=async` w `scripts/build-site.py:225`–`:236`. Mechanizm galerii korzysta ze zwykłych linków z powiększeniem, a JavaScript rozszerza je o dialog i sterowanie strzałkami/focusem: `assets/site-v5.js:253`–`:282`. To opis kodu; wyniki rzeczywistych testów przeglądarkowych należą do osobnego raportu testów.

## Kontrole wykonane przy redakcji

- Zgodność listy 9 zasobów z odczytanym katalogiem, istnienie plików, ich wymiary i rozmiary: sprawdzone.
- Hashe 7 importów względem manifestu /tmp, hashe 2 Glikemii oraz źródłowe kopie Mail/Vaelorii: sprawdzone.
- Wszystkie 9 obrazów obejrzane; brak czytelnych prywatnych danych w dopuszczonych kadrach. EXIF: 0/9 obrazów zawiera tagi.
- Oryginalny PNG użytkownika zachowany, hash zgodny; wykluczenie z galerii i jawnego stagingu sprawdzone.
- Wskazany przez właściciela oryginał krajobrazu i finalny WebP sprawdzono po hashach, wymiarach i rozmiarach; oryginalne miedziane PK jest bajtowo zgodne ze wskazanym źródłem. Oględziny edycji zapisano w osobnym raporcie HERO_ASSET; akceptacja finalnej kompozycji pozostaje OPEN.
- Nowe uruchomienia aplikacji, fizyczne QA, odsłuch i wdrożenie: **NOT RUN w ramach redakcji mediów**. Pochodzenie historycznych sesji zapisano bez przenoszenia ich statusów na bieżący produkt.
