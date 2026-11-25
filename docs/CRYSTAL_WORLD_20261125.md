# ProgressKit Systems • odbiór warstwy wizualnej

**25 listopada 2026. Wersja lokalna. `ownerVisualApproval: OPEN`.**

| Materiał | Co można ocenić |
|---|---|
| [Desktop • 25,04 s](evidence/crystal-world-20261125/desktop-navigation.mp4) | Aktywacja rdzenia, załamanie obrazu w kryształach, wejścia do Tax, Vaelorii, ECHO WORLDS i TaskPet, asystent oraz powroty. |
| [Mobile i licznik Glikemii • 35,84 s](evidence/crystal-world-20261125/mobile-navigation-counter.mp4) | Menu, gesty, mapa, wejście do projektu i pobranie rzeczywistego APK na lokalnym podglądzie. Na klatce 18,2 s licznik pokazuje 0, a na klatce 34,8 s pokazuje 1. |
| [Nieruchomy hero • 18,60 s](evidence/crystal-world-20261125/hero-idle.mp4) | Z tego 14,174 s zmierzono bez zdarzeń wejścia. W dwóch kolejnych przedziałach porównano także piksele widocznego dymu i otworu pieca poza napisem, znakiem i przyciskiem. |

Filmy przeszły pełne dekodowanie H.264. Dla każdego nagrania zweryfikowano sumę pliku oraz zgodność 21 składników strony z bieżącym katalogiem roboczym. [Klatki i metryki nagrań](evidence/crystal-world-20261125/RECORDINGS.md).

## Co się zmieniło

W poprzedniej mapie projekt zajmował płaski sześciokąt HTML nad płytkim walcem WebGL. Obok działały druciany rdzeń, połączenia liniowe i osobny kontur SVG. Te elementy usunięto z aktywnego szablonu i renderera. Każdy z 21 projektów ma teraz własny zamknięty szlif. Górna płaszczyzna, boczny pas i dolne fasety mają osobne normalne oraz mierzalną grubość. Shader załamuje obraz tej samej hali, w której znajduje się obiekt, i pokazuje przypisany projektowi oryginalny ekran lub symbol. Dla środowisk bez WebGL przygotowano jeden atlas renderów tych samych brył. [Geometria i shader w testach](evidence/crystal-world-20261125/crystal-scene-regression.json).

Przewijanie prowadzi kamerę przez halę. Daleka architektura, bliska krawędź skały i rdzeń przesuwają się w różnych proporcjach. Dym, rozżarzone cząstki i odbicia pieca mają własny czas animacji. Atmosfera zatrzymuje się poza widokiem i po wstrzymaniu ruchu. Szklane kontrolki korzystają z jednego zestawu materiałów. Refleks i iskry reagują na odległość kursora, a wciśnięcie przesuwa kontrolkę o 2 px. Do tabliczki pod oryginalnym znakiem użyto renderu graweru z zagłębionymi ściankami liter. [Pochodzenie scenografii i zasobów](evidence/crystal-world-20261125/art-direction.md) · [Testy kontrolek](evidence/crystal-world-20261125/controls/material-controls-summary.json).

Usunięto jednoczesne wyświetlanie ekranów dwóch produktów w środku przejścia. W 84 próbkach czterech sąsiednich przejść widoczny był najwyżej jeden produkt. Tekst i widoczny ekran zawsze należały do tego samego projektu. Bezpośredni wybór odległego projektu pomija pośrednie prezentacje, a zwykłe przewijanie zachowuje pełną drogę kamery. [Pomiary przejść, geometrii i obsługi](evidence/crystal-world-20261125/scene-regression.json).

## Licznik Glikemii

Nagranie mobilne pokazuje prawdziwą kontrolkę, zwykły link do APK i ponowne otwarcie danych po transferze. Izolowany backend zwrócił pełne **80 235 954 B**, po czym zapisał dokładnie jedno pobranie. SHA-256 pliku wyniósł `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`. [Stan 0](evidence/crystal-world-20261125/mobile-counter-before.png) · [Stan 1](evidence/crystal-world-20261125/mobile-counter-after.png) · [Metryka transferu](evidence/crystal-world-20261125/mobile-navigation-counter.json).

Publiczny endpoint licznika zwrócił **90** o **15:19:17** i ponownie **90** o **15:45:34**, czasu Europe/Warsaw. Oba odczyty pochodzą z wcześniejszej próby tego samego dnia. Podczas nagrywania końcowego filmu użyto wyłącznie lokalnej bazy. [Odczyt przed](evidence/crystal-world-20261125/production-counter-before.json) · [Odczyt po](evidence/crystal-world-20261125/production-counter-after.json).

## Regresja i zachowanie bazy

| Zakres | Wynik |
|---|---|
| Zaakceptowana zawartość | **89/89** plików ma ten sam SHA-256 co przed sprintem. Obejmuje to katalog 21 projektów i 3 gier, definicje prezentacji, materiały produktowe i wygenerowane strony produktów. [Porównanie](evidence/crystal-world-20261125/portfolio-preservation.json) |
| Generator i logika | **177/177** testów Python i **124/124** testów Node. [Python](evidence/crystal-world-20261125/regression-python.log) · [Node](evidence/crystal-world-20261125/regression-node.log) |
| Sceny i interakcje | **30/30** grup na szerokościach od 320 do 1920 px, w tym skróty, historia, fokus, ograniczony ruch i scenariusze utraty WebGL. [Regresja](evidence/crystal-world-20261125/scene-regression.json) |
| Bryły i materiały | **21/21** zamkniętych geometrii, 1680 trójkątów łącznie. Osobny zestaw **12/12** prób WebGL sprawdził m.in. tekstury, zmianę grup i piksele po odzyskaniu kontekstu. |
| Wspólne szkło | **21/21** prób kontrolek, **38/38** prób pilota Mail i **6/6** prób na scalonej scenie. [Raport](evidence/crystal-world-20261125/controls/material-controls-summary.json) |
| Paczka lokalna | **167** dozwolonych plików, w tym 29 HTML. Porównano zawartość z plikami źródłowymi. [Kontrola paczki](evidence/crystal-world-20261125/staging.json) |

Na ThinkPadzie T480s z Intel UHD 620, przy 1366 × 768 px, sześć sekund przewijania dało 304 pomiary odstępu między klatkami. Mediana wyniosła 16,7 ms, a 95. percentyl 33,4 ms. Cztery odstępy przekroczyły 50 ms. W ciągu następnych 800 ms bez przewijania warstwa atmosfery odświeżyła się 16 razy, a geometria WebGL nie wymagała kolejnego rysowania. [Pomiar na Intel UHD 620](evidence/crystal-world-20261125/thinkpad-renderer.json).

## Android

Film mobilny pochodzi z Chrome z emulacją dotyku przy 390 × 844 px. Dodatkowo natywny Chrome 133 na emulatorze Androida przy 360 × 678 px przeszedł dotykiem z mapy do Tax i z powrotem. Pierwsza klatka z tej próby pokazała same etykiety. W oddzielnej sesji oba shadery przeszły kompilację i linkowanie, a sześć wywołań renderera dało widoczne bryły w obrazie końcowym. Dokładna przyczyna pierwszej klatki pozostaje nieustalona. [Mapa na Androidzie](evidence/crystal-world-20261125/android-emulator-map.png) · [Próba dotykowa](evidence/crystal-world-20261125/android-emulator.json) · [Pomiary renderera](evidence/crystal-world-20261125/android-gl-probe.json).

Podczas osobnej próby Chrome faktycznie utracił kontekst WebGL. Przeglądarka wyświetliła wtedy biały prostokąt nad mapą. Po poprawce końcowy arkusz stylów ukrywa uszkodzone płótno. Na zrzucie widać halę i sześć renderów z atlasu przypisanych do tych samych odnośników. [Widok po utracie WebGL](evidence/crystal-world-20261125/android-emulator-fallback.png) · [Pomiar sześciu widocznych kryształów](evidence/crystal-world-20261125/android-context-fallback.json).

Podgląd można uruchomić z katalogu repozytorium poleceniem `PK_PYTHON=.venv/bin/python bash scripts/preview.sh` i otworzyć `http://127.0.0.1:8092/`.

**Telefon fizyczny — BLOCKED.** Przez ADB dostępny był tylko emulator. Odbiór wyglądu należy do właściciela. Zmiany pozostają lokalne, bez commita, pushu i wdrożenia.
