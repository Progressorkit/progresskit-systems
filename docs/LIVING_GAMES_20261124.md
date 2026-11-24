# ProgressKit Living + ECHO WORLDS + TaskPet — lokalny wynik 2026-11-24

Rozszerzono istniejącą instalację i generator. Podgląd: http://127.0.0.1:8246/ oraz /echo-worlds/ i /taskpet/. Brak pushu, deployu i publikacji społecznościowej.

## Wynik

- PASS: generator21 projektów/31 plików; zachowane wszystkie wcześniejsze projekty i case studies. Dwa nowe węzły prowadzą do własnych prezentacji, bez duplikatów katalogu.
- PASS: prawdziwa geometria WebGL/Three.js w istniejącej mapie, wczytywana po aktywacji rdzenia lub rozpoczęciu eksploracji. DOM i linki działają bez WebGL. Scena nie ma bezczynnej pętli renderowania.
- PASS: sześć portali z nazwami rzeczywistych krain i autentycznymi planszami; demonstracja zamiany sąsiadów, połączeń i kaskad.
- PASS: pokój3D, ograniczony obrót, zbliżenie, trzy warianty oświetlenia, wyposażenie w pamięci strony, wybór sześciu oryginalnych pupili, reakcja radości i oddychanie; pokaz zadanie→jednorazowa nagroda→rozwój.
- PASS:176/176 Python i124/124 Node. Chromium30/30 grup; dodatkowo15/15 dla strony głównej (5 rozmiarów×normalny/bezJS/reduced-motion). Brak wyjątkówJS, naruszeńCSP i nieoczekiwanych zasobówHTTP. Testy dotyku używają rzeczywistych zdarzeńCDP, nie samego ustawienia scrollY.
- PASS: Screenshoty1920×1080,1366×768,800×1280,390×844,360×720. Rzeczywiste screenshoty systemowego Firefoxa390×844 dla trzech tras. Interaktywne sterowanie systemowym Firefoxem: BLOCKED, brak obsługi protokołu Playwright w tym binarium. Fizyczny Android dla strony: NOT TESTED.
- PASS: Lighthouse mobile z rzeczywistą lokalną kompresjąHTTP: Systems98/97,LCP1.979s; ECHO99/100,LCP2.043s; TaskPet100/100,LCP1.762s. Kolejność wyników: Performance/Accessibility. To pomiar tej maszyny i lokalnego serwera, nie wynik produkcji.
- PASS: materiałyPL/EN, oryginalne screenshoty/ilustracje, miniatury, OpenGraph i zestawienia sześciu krain/gatunków; cztery filmyH.264 po20s, poziomo1920×1080 i pionowo1080×1920. Filmy są podpisanymi prezentacjami slajdów, nie nagraniem ciągłej rozgrywki. Interaktywna kaskada jest osobno oznaczoną demonstracją przeglądarkową.
- PASS: jawna lista publiczna zawiera wyłącznie przejrzane zasoby. Brak APK, tokenów, plikówportaluOWNER, baz i prywatnych konfiguracji. Nie dodano endpointu zakupów ani połączenia pokazów z zapisami aplikacji.

## Granice dowodów i treści

ECHO WORLDS: kod0.10.0 Alpha, HEAD04523d2,600 definicji kampanii,60 lokacji i6 krain. Nie deklarujemy publikacjiGooglePlay. Screenshoty są istniejącymi renderamiGodot/Linux; nie są nowym testem telefonu.

Aktualny katalog TaskPet zawiera smoka,pajączka,kotka,pieska,papugę i małpkę. Brief wymienia inną szóstkę; użyto faktycznych oryginalnych postaci, bez wymyślania liska/królika. Pupil jest prezentacją2.5D portretu, nie modelem ani rigem3D. Źródła nie mają osobnych póz mrugania i głowy; nie deklarujemy takich nowych zasobów. Historyczne ekrany organizera są podpisane jako historyczne i nie dowodzą nowego dolnego paska aplikacji. Dostępność płatnościGooglePlay nie została potwierdzona.

## Ochrona wcześniejszej pracy

Punkt początkowy repozytorium: e2f3f8c81efcc6ac74cf506d16864626c0598858. Przed zmianami zachowano lokalny diffbinarny, stanGit i hashe w `.local/living-20261124-baseline/`. Nie użyto reset/stash/clean. Wcześniejsze poprawki Mail/pilot/privacy pozostają w roboczym katalogu. Lokalny commit tej realizacji ma oddzielnie przygotowane wersje plików nakładających się na wcześniejszą pracę; nie przejmuje wcześniejszego wdrożenia pilotażu. Generator tego commitu sprawdzono w odizolowanym katalogu.

Paczka robocza odwzorowuje aktualny katalog wraz z zachowaną wcześniej wersją Mail. Zawartość i SHA są jawne w manifeście. Przed realnym wdrożeniem operator porównuje cały manifest z produkcją.

## Wdrożenie i rollback — bez wykonania

Paczka: `.local/living-games-release-final-20261124/progresskit-v5-public.tar.gz`, obok `files.json`,`SHA256SUMS`,`release.json`. Nie zawiera repozytorium, dowodówQA ani prywatnej dystrybucji.

Historyczny `/srv/progresskit/apps/progresskit-portfolio` nie istnieje na tym hoście. Kopia aktualnej produkcji, odczyt realnegoCaddy i rollback produkcyjny są BLOCKED bez dostępu/autoryzacji; lokalnyHEAD nie zastępuje kopii produkcji.

Przed autoryzowanym deployem: skopiować aktualny katalog produkcji do osobnego wersjonowanego katalogu; zachować jego manifest i poprzedni cel symlinku; rozpakować wyłącznie przejrzaną paczkę do nowego katalogu; zachować istniejące API, analitykę, liczniki i trasy usług. W istniejącym serwerzeCaddy potrzebna jest standardowa kompresja`encode zstd gzip` oraz dopuszczenie`media-src 'self'` wyłącznie na obu nowych publicznych prezentacjach. Pełnego nieodczytanegoCaddy nie zastępujemy przykładowym plikiem.

Kontrola po deployu: trzy trasy200, canonical/OG/sitemap,6 portali i6 pupili, fallbacky, brak404/CSP, poprawneMIMEvideo, zakaz prywatnych źródeł iOWNER. Nie testować licznika przez zbędne pobraniaAPK. W razie regresji: przywrócić poprzedni katalog/symlink i jego konfigurację, następnie te same kontroleHTTP. Nie dotykać Mail/Tax/baz.

Dowody: `docs/evidence/living-games-20261124/` — manifesty źródeł i praw, raportyLighthouse, wynikiPython/Node, screenshotyChromium/Firefox, pierwsze nieudane pomiary oraz końcowe wyniki. AutomatyczneQA nie zastępuje oceny wyglądu przez właściciela.
