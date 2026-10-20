# ProgressKit V5 — wystawa, ikony i korekty HERO

Historyczny checkpoint `b6ac3f8`. Następna zbiorcza korekta, nowe motto oraz aktualny
preview i wyniki: [ORBITAL_SHOWROOM_REPORT](PROGRESSKIT_V5_ORBITAL_SHOWROOM_REPORT.md).

Data: 2026-10-15. Kontynuacja lokalnego kandydata `babd14c`.
**Implementacja lokalna: gotowa. Odbiór wizualny: OPEN. Push i deployment: NOT RUN.**

## Zmiany do oceny

- „Wyzwania inżynieryjne” mają listwę sześciu przypadków i jedną dużą ekspozycję
  wybranej analizy. Tytuł, numer, metaliczne podziały i stonowana czerwień budują
  hierarchię; cztery fazy procesu mają osobne pola. Szczegóły przyczyny,
  weryfikacji i źródła są rozwijane. Wszystkie 24 opisy pochodzą bez zmian
  z katalogu. Bez JS dostępne są natywne rozwinięcia sześciu analiz.
- Kategorie odzyskały spójne liniowe SVG: telefon, chmura, ludzie, gamepad,
  glob i serwer. Ikona, nazwa i rzeczywista liczba projektów pozostają częścią
  dotychczasowego przycisku filtra. Nie dodano emoji ani zewnętrznej biblioteki.
- PK w murze powiększono z 235 do 260 jednostek i przesunięto do środka głównej
  płyty. Relief nadal korzysta z alfy oryginalnego PNG. Litery H1 próbkują tę samą
  fotografię skał co scena; drobne ziarno i poszczerbienie uzupełniają materiał.
- Dwa ogromne, ciemne reliefy oryginalnego PK wypełniają istniejące dolne pola:
  pod „O mnie / współpraca” oraz w przejściu technologie–kontakt. Maski nie zmieniają
  wysokości sekcji, nie przechwytują wskaźnika i mają opacity 0,035 / 0,028.
  Są poza głównymi akapitami; do 1100px i w druku pozostają wyłączone.
- Mała, ciemna sylwetka wędrowca na zboczu wzmacnia skalę muru. Zmiana pozycji
  myszy unosi ją maksymalnie o 1,2 jednostki sceny, bez autonomicznego chodzenia.
  Reduced motion wyłącza ruch. Pejzaż, relief i postać poruszają się razem.
- Motto **„Technologia ma dawać kontrolę — nie na odwrót.”** pozostało identyczne.
  Jest bezpośrednim następnikiem H1 w tej samej grupie, wyrównanym do lewej krawędzi
  tytułu. Lokalny, niezmieniony **DejaVu Serif Italic** (`PK Motto`) daje klasyczną
  kursywę o charakterze książkowego manuskryptu. Pergaminowy `#d8cdbb`, rozmiar
  20–26px (18px na małym ekranie), interlinia 1,65 i odstęp 20–30px utrzymują
  podporządkowanie H1. Motto zawija się w normalnym przepływie, zamiast wisieć
  przy dolnej krawędzi HERO. Druk używa czerni bez cienia; forced colors — CanvasText.
  Font zawiera wszystkie znaki cytatu, w tym polskie litery i pauzę. Nie dodano
  skryptu pisma odręcznego, ozdobnych inicjałów ani zmiany treści.

## Zachowane mechaniki i weryfikacja

Nie zmieniono kodu JS showroomu 360° ani hologramu, tras katalogu, danych 14 projektów
i 9 obrazów galerii. Osobny handler wystawy nie ingeruje w ich URL, gesty lub cykl
dialogu. Wskazany review problem przechwytywania strzałek usunięto: wystawa obsługuje
tylko strzałki właściwe dla aktualnej orientacji.

- **118 PASS / 0 FAIL / 0 SKIP**: 82 Python po ostatniej zmianie HTML/fontu
  oraz 36 Node dla niezmienionych mechanik.
- Osobno **13 PASS / 0 FAIL** na rzeczywistych handlerach wystawy w syntetycznym DOM.
  Nie jest to test renderu, czytnika ekranu ani rzeczywistego fokusu przeglądarki.
- **107 PASS / 0 FAIL** lokalnych kontroli HTTP: zgodność bajtów 57 plików publicznych,
  katalog i canonical redirects oraz 404 dla prywatnych źródeł.
- Generator: 14 rekordów, 23 aktualne pliki; kontrola składni JS, CSS i SVG przeszła.
  Motto ma jedną instancję, bezpośrednio po jedynym H1; font jest lokalny i objęty
  istniejącą licencją DejaVu.
- Bramka publikacji odrzuca `ownerVisualApproval: OPEN` zgodnie z założeniem.

Dowody tej iteracji: `docs/evidence/progresskit-v5/exhibit-icons-*`.
Niezależny odczyt i jego granice: [EXHIBIT_ICONS_REPORT](PROGRESSKIT_V5_EXHIBIT_ICONS_REPORT.md).
Wcześniejsze raporty opisują wcześniejsze checkpointy; ich liczby HTTP i plików
nie zastępują wyników powyżej.

## Preview i granice potwierdzenia

**http://127.0.0.1:8093/** — lokalny serwer z izolowaną bazą w `/tmp` i publiczną
allowlistą. Dotychczasowy port 8092 pozostawiono bez zmian. Preview nie jest wdrożeniem.

Browser zwrócił `No browser is available`, a discovery pustą listę. Nie wykonano
zrzutów końcowego renderu ani Lighthouse. Czytelność w rzeczywistym kadrze,
położenie reliefu i wędrowca, natężenie watermarków oraz gesty/fokus wymagają
oceny właściciela w preview. Źródła i testy nie otrzymują etykiety visual PASS.
Lista odbioru: [VISUAL_ACCEPTANCE](PROGRESSKIT_V5_VISUAL_ACCEPTANCE.md).

Lokalny checkpoint powstaje wyłącznie w kontynuowanym worktree
`/tmp/progresskit-v5-review`, na `codex/progresskit-v5-20261015`.
Root IDE zachowuje zmiany i zastane pliki użytkownika. Publiczna paczka tej iteracji:
`/tmp/progresskit-v5-exhibit-icons-release/progresskit-v5-public.tar.gz`;
`release.json` obok niej podaje ostateczny HEAD, SHA-256 i czystość kandydata.
