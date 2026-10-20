# ProgressKit V5 — ręczny odbiór lokalnego preview

Stan: **NOT RUN przez agenta / OPEN do odbioru właściciela**. Narzędzie Browser nie udostępnia połączonej przeglądarki. Poniższa lista nie oznacza zaliczonych kontroli.

## Uruchomienie

W katalogu projektu:

```sh
PK_PYTHON=/tmp/progresskit-v5-venv/bin/python sh scripts/preview.sh
```

Standardowy adres: `http://127.0.0.1:8092/`. Podgląd udostępnia wyłącznie publiczną allowlistę; źródła, katalog JSON, dokumentacja i surowe materiały mają zwracać404. `localhost` dotyczy komputera uruchamiającego serwer. Nie jest adresem telefonu ani wdrożeniem w internecie.

Aktywny podgląd korekty głębi: **http://127.0.0.1:8095/**.
Można go wznowić, dodając `PK_PREVIEW_PORT=8095` przed powyższą komendą.
Własne wcześniejsze podglądy8093/8094 zostały zatrzymane.

## Kompozycja

Sprawdź320,390,768,1024,1440 i1920px oraz powiększenie200%:

1. H1 zawiera PROGRESSKIT SYSTEMS. Oba wiersze są czytelne; kamienne ziarno i żyłki nie zlewają liter. Napis nie wyjeżdża poza ekran.
2. PK ma dokładny kształt oryginału, perspektywę muru i efekt zagłębienia. Nie wygląda jak oddzielny badge. Przy ruchu kursora i zmianie szerokości pozostaje w tym samym miejscu ściany.
3. Góry, łuk księżyca i mur pozostają rozpoznawalne. Czerwone światło jest spokojne i nie obniża czytelności.
4. Bezpośrednio pod HERO są sześć metalicznych kategorii i jedna przestrzenna ekspozycja. Niżej O mnie/współpraca, analizy, warsztat i jeden brief. Nie ma sekcji Wybrane projekty ani drugiego pełnego gridu.
5. Motto brzmi „Technologia ma dawać kontrolę. Nie na odwrót.”, ma spokojną kursywę i znajduje się bezpośrednio pod H1. Na mobile oraz przy 200% zawija się czytelnie, bez kolizji z tytułem i CTA; wydruk jest czarny na białym tle.
6. Mały wędrowiec pozostaje detalem zbocza, a dwa watermarki PK w dolnych polach sekcji nie utrudniają czytania. Do 1100px watermarki są wyłączone.
7. Sześć kategorii ma zgodne liniowe ikony i rzeczywiste liczby. Wystawa analiz pokazuje jeden wybrany przypadek; klawiatura działa zgodnie z orientacją listwy, a bez JS wszystkie analizy da się rozwinąć.
8. Projekty tworzą przestrzenny metaliczny mechanizm widoczny także na pauzie. Tył jest mniejszy i częściowo zasłonięty przez konstrukcję, przód jaśniejszy i większy. Moduły mają kategorię/nazwę/etap, a screenshot pozostaje w hologramie. Sprawdź czytelność wszystkich warstw na tabletach i telefonach.
9. Linie podążają za modułami podczas obrotu i przeciągania; iskry rzeczywiście przesuwają się po nich. Kontrolka pauzy orbity zatrzymuje energię, a pauza sceny ruch wędrowca i światła. Reduced motion ma pierwszeństwo; pauza przetrwa filtry, hologram i powrót karty.
10. Wszystkie50 technologii pozostaje dostępnych w6 grupach; linki prowadzą do właściwego filtra. Nie ma drugiej karuzeli, pustych grup ani powtórzeń. Sprawdź nawigację klawiaturą i druk.
11. Przy szybkich strzałkach fokus pozostaje na widocznym module. Anulowany drag wraca łukiem; opuszczenie showroomu nie otwiera opóźnionego hologramu. H1 pozostaje ostre podczas ruchu pejzażu, bez deformacji i rozmywania liter.

## Rolka i filtry

1. W stanie początkowym liczba wynika z katalogu:14. Obróć cały cykl i sprawdź, że każdy projekt pojawia się raz, również przy przejściu ostatni→pierwszy.
2. Użyj poprzedni/następny, ArrowLeft/ArrowRight, Home/End oraz Enter. Zmiana centrum nie może zgubić fokusu.
3. Przeciągnij myszą oraz wykonaj swipe na ekranie dotykowym. Puść wskaźnik poza ekspozycją; kolejny zwykły ruch nie może kontynuować starego drag.
4. Przeciągnięcie nie otwiera projektu. Klik otwiera wybrany produkt, również gdy wcześniej był z boku.
5. Zwykły pionowy scroll działa dla strony. Gest poziomy/Shift+wheel obraca ekspozycję i nie wywołuje gwałtownych skoków.
6. Kliknij wszystkie kategorie: Aplikacje 3, SaaS 4, Platformy 1, Gry 1, WWW 2, Infrastruktura 3. Dla pojedynczego projektu strzałki powinny być nieaktywne. Wszystkie projekty przywraca14.
7. Hover jest chwilowym podglądem; klik utrwala filtr. Sprawdź, że opuszczenie bramy nie usuwa klikniętego filtra i nie ukrywa elementu, który ma fokus.
8. Odśwież URL z `kategoria`/`projekt`, sprawdź Back/Forward i zachowanie parametrów kampanii. Bez JavaScript wszystkie prawdziwe linki do projektów pozostają dostępne w przewijanej kolekcji.

## Hologram

1. Klik projektu zatrzymuje sterowanie rolką, centruje obiekt i odsłania panel. Pozostałe projekty przygasają. W panelu jest prawdziwy screenshot z podpisem albo neutralna typografia.
2. Nazwa, problem, etap i technologie odpowiadają katalogowi. Zobacz cały projekt prowadzi do istniejącego case study.
3. Tab porusza się w natywnym dialogu. Escape, Zamknij i klik rzeczywistego tła zamykają panel; nie zamyka go klik wewnątrz ani drag kończący się poza panelem.
4. Zamknięcie odwraca wejście i zwraca fokus do aktywnego projektu. Szybkie zamknij→otwórz nie może zamknąć nowego panelu starym timerem.
5. Zmiana stanu przez historię nie może pozostawić zablokowanej rolki ani nadpisać przywracanego projektu.

## Dostępność i dalsze funkcje

1. Włącz systemowe prefers-reduced-motion. Nie ma automatycznej animacji/paralaksy; filtry, obrót ręczny i panel pozostają funkcjonalne.
2. Przejdź klawiaturą przez reveal. Treści z fokusem są od razu widoczne. Wyłączenie JS lub observera nie ukrywa strony.
3. Rozwiń inżynieryjną historię i sprawdź Problem→Diagnoza→Rozwiązanie→Wynik oraz link do pełnej analizy.
4. Sprawdź linki technologii, wyszukiwanie w /projekty/, galerie, menu i istniejące strony Glikemii/Mail.
5. Wypełnij sześć pól briefu, pobierzTXT, otwórz druk/PDF i e-mail. Nic nie jest automatycznie wysyłane ani utrwalane w localStorage.
6. Sprawdź konsolę i brak404 dla publicznych zasobów, kontrast, czytelność oraz płynność na słabszym laptopie i fizycznym telefonie.

Akceptację kompozycji zapisz oddzielnie od wyników testów automatycznych. Nie zmieniaj ownerVisualApproval na APPROVED bez wyraźnej decyzji właściciela. Nie wykonano push ani deploymentu.
