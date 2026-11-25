# ProgressKit Systems • odbiór lokalny z 25 listopada 2026

Portfolio zawiera **21 pozycji w sześciu kategoriach, w tym trzy gry**. Każdy projekt ma wejście z mapy i z katalogu. Na produkcji 25 listopada było jeszcze 19 pozycji i jedna gra. Wszystkie zmiany tego sprintu są lokalne. **Odbiór wyglądu przez właściciela jest otwarty** (`ownerVisualApproval: OPEN`).

## Portfolio przed i po

| Stan | Projekty | Gry | Co sprawdzono |
|---|---:|---:|---|
| Produkcja, odczyt 25.11 | 19 | 1 | Publiczny HTML katalogu. Wejścia do TaskPet i ECHO WORLDS zwracały 404. |
| Lokalna wersja przed sprintem | 21 | 3 | TaskPet i Echo miały już własne identyfikatory. OffGrid był sklasyfikowany jako koncepcja, galerie zawierały 11 obrazów. |
| Lokalna wersja po sprincie | 21 | 3 | 24 katalogi źródłowe rozpatrzone wraz z kopiami i składnikami tych samych produktów. Zaktualizowano 21 wpisów, galerie liczą 31 obrazów. |

Rozkład katalogu po audycie to 5 aplikacji, 3 gry, 1 platforma, 4 systemy SaaS, 2 realizacje WWW i 6 technologii. Mapa, liczniki, filtry, etapy i platformy korzystają z tego samego katalogu. Osobny plik prezentacji wiąże materiały z identyfikatorami produktów. OffGrid ma kod i pakiet testowy Androida. Wymiana wiadomości między dwoma fizycznymi telefonami pozostaje niepotwierdzona. Community ma otwarte warunki publicznej bety. KAN SYSTEM i Obserwator zachowują wpisy historyczne z podanym zakresem dowodów. [Pełna lista 21 projektów, rewizji, statusów i materiałów](ECOSYSTEM_AUDIT_20261125.md) · [Katalog źródłowy](../catalog/projects.json).

## Cztery prezentacje

| Produkt | Co widać w prezentacji | Materiał do obejrzenia |
|---|---|---|
| TaskPet | Pokój i rozwój zwierzaka, zadania cykliczne, istniejące alarmy i przypomnienia, widżety, sklep oraz minigra. Źródłem ekranów jest testowa wersja 0.9.3-owner.17 z 24.11. PUBLIC jest wariantem przyszłym. | [Prezentacja](../projekty/taskpet/index.html) · [Pokój na telefonie](evidence/content-visual-20261125/product-browser/taskpet-390-hero.png) |
| ECHO WORLDS | Puzzle First, match-3 z limitem ruchów, atlas oraz wyniki wygranej i porażki. Kod 0.10.0 Alpha obejmuje 600 podstawowych poziomów w sześciu krainach. Prace wstrzymano. Aktualnym kadrom towarzyszy podpisany archiwalny klip. | [Prezentacja](../projekty/echo-worlds/index.html) · [Plansza na telefonie](evidence/content-visual-20261125/product-browser/echo-worlds-390-hero.png) |
| Vaeloria | Las i rozwój obozu, prolog Ziemi, karty, menu i tworzenie EOS. Daty materiałów pozwalają odróżnić późniejsze sceny od archiwalnych ujęć kart i walki. | [Prezentacja](../projekty/vaeloria/index.html) · [Scena na dużym ekranie](evidence/content-visual-20261125/browser-final/vaeloria-living-1366-corrected.png) |
| ProgressKit Tax | Jeden system z backendem, panelem biura WWW i aplikacją Android. Kompozycja łączy panel na danych demonstracyjnych z rzeczywistym ekranem Androida. Osobno opisano MFA, izolację biur, sprawy, dokumenty i zweryfikowany zakres księgowości. | [Prezentacja](../projekty/progresskit-tax/index.html) · [Panel biura i telefon](evidence/content-visual-20261125/product-browser/progresskit-tax-1366-hero.png) |

Na potrzeby zdjęcia Tax zainstalowano istniejący pakiet debug na emulatorze. Kadr z 25.11 pokazuje niezalogowany ekran z pustymi polami. Pakiet pozostał na emulatorze, a poprzednią aplikację przywrócono na pierwszy plan. Schematy projektów bez zweryfikowanych ujęć noszą opisy odpowiadające temu, co faktycznie pokazują. Nowe ilustracje obudowy rdzenia i drona służą scenografii witryny. Interfejsy produktów pochodzą z aplikacji. [Pochodzenie materiałów](evidence/content-visual-20261125/product-media-sources.json) · [Daty i źródła klipów](evidence/content-visual-20261125/gameplay-clips.json).

## Konflikty wizualne i ich usunięcie

| Obserwacja przed zmianą | Zmiana i jej weryfikacja |
|---|---|
| Pierwsze położenie znaku wyznaczał CSS, a moduł sceny po starcie wyliczał je ponownie w innym układzie współrzędnych. Na krótkim ekranie zakres znaku, graweru i przycisku konkurował o miejsce. | CSS dostarcza te same współrzędne modułowi animacji. W teście zimnego startu 320 × 568 px znak, napis, główny przycisk i trzy statystyki w całości zmieściły się w pierwszym widoku. |
| W połowie przejścia zarówno hero, jak i mapa miały krycie około 50%. Stały GUIDE zajmował miejsce również nad kolejnymi scenami. | Kolejny tekst pojawia się po wygaszeniu poprzedniego. Ukryte sceny nie przejmują fokusu. Polski asystent ma postać drona w nawigacji. Rozwinięty panel zajmuje miejsce w układzie i udostępnia objaśnienie projektu, technologii lub funkcji. |
| Tło i nośniki projektów miały podobną głębię. W mapie dominowały numery, a większość nośników nie miała podglądu. | Znak ma optyczną obudowę, grawer, podświetlenie od żaru i iskry. Przewijanie zmienia wzajemne położenie architektury, obramowania, obiektu i przedniego planu. Kryształy pokazują rozpoznawalny kadr lub indywidualny symbol projektu, z wejściem do prezentacji. |
| Osobne reguły dla widoku głównego, menu i podstron utrwalały różne przyciski, cienie i matowe tła. | Wspólne zmienne szkła, obrzeża, cienia i podświetlenia obsługują nawigację, przyciski, formularze i panel pilota Mail. Kontrolki reagują na zbliżenie kursora i wciśnięcie. Działają też dotykiem i klawiaturą. |
| Przy przejściu z ECHO pod adres `/#projekty` na filmie pojawiał się przez chwilę poprzedzający mapę ekran startowy. Chrome rozpoznawał cel fragmentu dopiero po załadowaniu dokumentu. | Strona rozpoznaje wejście na mapę przed pierwszym renderem i udostępnia natywne odnośniki do projektów w czasie ładowania sceny. Osobny test zatrzymał moduł na telefonicznych i desktopowych szerokościach, a potem potwierdził trafienie w kryształ po odblokowaniu modułu. [Kontrola wejścia bezpośredniego](evidence/content-visual-20261125/fragment-first-render.json) |
| Podpisy rozbudowanych scen Tax i Vaelorii zajmowały miejsce przeznaczone na kadr lub przycisk. | Wymiary nośnika wynikają z miejsca między tekstem i podpisem. Ponowny pomiar obu scen na ośmiu szerokościach dał 16/16 poprawnych układów. |

Zachowano skrypt istniejących filtrów, menu i wywołań API. Za aktywne sceny odpowiada jedna oś przewijania. Historyczne implementacje, które nie trafiają do paczki publicznej, nie uczestniczą w renderowaniu strony. [Pomiar przed zmianą](evidence/content-visual-20261125/before.json) · [Układ Tax i Vaelorii po poprawce](evidence/content-visual-20261125/browser-final/caption-layout-delta.json).

## Materiał do odbioru

[Film z normalnego użytkowania](evidence/content-visual-20261125/normal-use-desktop.mp4) trwa 20,56 s. Pokazuje aktywację rdzenia, wybór Tax i Vaelorii, wybór krainy ECHO WORLDS, pełną prezentację TaskPet, asystenta i powrót do mapy. Nagranie pochodzi z jednej sesji Chrome na Intel UHD 620, w rozdzielczości 1366 × 768 px. [Przebieg nagrania](evidence/content-visual-20261125/normal-use-desktop.json) · [Weryfikacja 514 klatek i SHA-256](evidence/content-visual-20261125/film-integrity.json).

| Widok | Przed zmianą, w przejściu hero → mapa | Po zmianie, początek | Po aktywacji |
|---|---|---|---|
| Desktop 1366 × 768 | [Przejście](evidence/content-visual-20261125/before-1366.png) | [Pierwszy ekran](evidence/content-visual-20261125/after-1366.png) | [Mapa](evidence/content-visual-20261125/browser-final/home-1366-map.png) |
| Mobile | [Przejście, 320 × 568](evidence/content-visual-20261125/before-320.png) | [Pierwszy ekran, 320 × 568](evidence/content-visual-20261125/after-320.png) | [Mapa, 320 × 720](evidence/content-visual-20261125/browser-final/home-320-map.png) |

[Asystent na telefonie](evidence/content-visual-20261125/browser-final/drone-390.png) · [Menu na telefonie](evidence/content-visual-20261125/browser-final/menu-390.png) · [Licznik Glikemii w pierwszym widoku](evidence/content-visual-20261125/browser-final/glikemia-mobile-counter.png).

## Regresja i wydajność

| Zakres | Wynik | Dowód |
|---|---|---|
| Generator, JavaScript i backend | Budowa i zgodność wygenerowanych plików PASS. Python 177/177, Node 124/124. | [Python](evidence/content-visual-20261125/regression-python.log) · [Node](evidence/content-visual-20261125/regression-node.log) |
| Przeglądarka, główne ścieżki | 30/30 grup po naprawach. Przebieg początkowy wykazał dwa problemy. Zachowano pierwotny wynik i oddzielną powtórkę. | [Raport QA przeglądarki](evidence/content-visual-20261125/BROWSER_QA.md) · [Macierz końcowa](evidence/content-visual-20261125/browser-final/checks.json) · [Ponowna weryfikacja](evidence/content-visual-20261125/browser-final-delta/checks.json) |
| Przewijanie i dostępność | 30/30. Sprawdzono również odnośniki na mapie przy wstrzymanym module. Osiem szerokości × 14 pozycji, dotyk, klawiatura, historia, powrót, kontrast, ograniczony ruch, wymuszone kolory, brak JS/WebGL i wstrzymanie renderowania. Najniższy zmierzony kontrast badanych zwykłych etykiet wyniósł 6,09:1. | [Wyniki scen](evidence/content-visual-20261125/living-regression.json) |
| Cztery prezentacje | 43/43. Wejścia, obrazy, galerie, fokus, historia i odnośniki do obu interaktywnych prezentacji gier. | [Wyniki prezentacji](evidence/content-visual-20261125/product-browser/checks.json) |
| Przegląd paczki publicznej | 160/160 plików zgodnych ze źródłami, 29 HTML, 2302 odwołań i kotwic, 94 obrazy zbadane pod kątem metadanych. Formularze i opinie sprawdzone na odizolowanej bazie. | [Lista kontroli i SHA-256 manifestu](evidence/content-visual-20261125/public-stage-audit.json) |

Szerokości testowe wynosiły **320, 360, 390, 412, 768, 1024, 1366 i 1920 px**. Przy zimnym starcie Chrome z opóźnieniem 140 ms, limitem 192 000 B/s i trzykrotnym spowolnieniem CPU odnotowano LCP 0,916 s i CLS 0,031 dla 320 × 568 oraz LCP 3,232 s i CLS 0,006 dla 1366 × 768. WebGL w obu przypadkach czekał na aktywację. Są to dwa pomiary laboratoryjne. [Zimny render i geometria](evidence/content-visual-20261125/cold-render.json).

Na fizycznym ThinkPadzie T480s Chrome użył Intel UHD 620 przez ANGLE/Mesa. W sześciu sekundach aktywnego przewijania mediana odstępu między klatkami wyniosła **33,3 ms**, 95. percentyl **66,8 ms**, a 30 ze 172 próbek przekroczyło 50 ms. W ciągu 800 ms bezczynności WebGL wykonał zero dodatkowych rysowań. Najcięższe przejścia na tym sprzęcie nadal mogą zauważalnie zwalniać. **Fizyczny telefon — BLOCKED**. Dostępny przez ADB był tylko emulator. [Pomiar Intel UHD 620](evidence/content-visual-20261125/thinkpad-renderer.json) · [Dostępność sprzętu](evidence/content-visual-20261125/physical-availability.json).

## Glikemia Premium

Produkcja pokazywała **90 pobrań i 0 zatwierdzonych opinii**. Dwa publiczne żądania zakresowe HTTP 206 zwróciły wszystkie **80 235 954 bajty** APK. SHA-256 złożonej odpowiedzi jest identyczny z lokalnym plikiem: `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`. Licznik po odczycie ponownie wynosił **90**. Manifest pakietu podaje **1.0, build 1, minSdk 24**, a podpis przeszedł weryfikację v2 i v3. [Integralność pobrania](evidence/content-visual-20261125/production-glikemia-apk.json) · [Metadane i podpis APK](evidence/content-visual-20261125/glikemia-artifact-metadata.json).

Pełne pobranie HTTP 200 z włączoną kompresją ujawniło błąd lokalnego licznika. Po poprawce zakończony transfer dodaje jedno pobranie na izolowanej bazie. Kontrole obejmują też przerwane i częściowe transfery, równoległość, zgłaszanie i moderację opinii. Zwykły zliczany transfer, zapisy opinii i formularzy oraz wysyłka poczty na produkcji pozostały poza testem. [Mechanizm i wyniki kontroli Glikemii](evidence/content-visual-20261125/GLIKEMIA_AND_PRODUCTION_BASELINE.md).

## Odtworzenie lokalne

Z katalogu głównego repozytorium można uruchomić podgląd z lokalnym backendem:

```sh
PK_PYTHON=.venv/bin/python bash scripts/preview.sh
```

Strona startowa to `http://127.0.0.1:8092/`, a katalog jest pod `/projekty/`. Serwer udostępnia wyłącznie dozwolone ścieżki. Pliki dowodowe w tym raporcie można otworzyć bez uruchamiania serwera.

Zastany lokalny HEAD to `b0a19cdc2536f7599b18060343613d71fee47279`. Zmiany sprintu pozostawiono w katalogu roboczym. Bez commita, pushu i wdrożenia.
