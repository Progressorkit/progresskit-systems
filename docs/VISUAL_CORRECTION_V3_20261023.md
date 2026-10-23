# ProgressKit Systems — Visual Correction V3

Data: 2026-10-23, Europe/Warsaw. Baza: `78319345bcf6822d304b5de758aae0297a4ca812`, początkowo czysty checkout `main`. Podgląd: **http://127.0.0.1:8110/**. Praca lokalna, bez pushu i deploymentu.

## Efekt i zachowane funkcje

Istniejący pierwszy ekran otrzymał ciemniejszy grafit, kierunkowe światło reagujące na wskaźnik, srebrne liternictwo, czerwony akcent i wyraźniejsze aluminiowe prowadnice. Subtelny sygnał przemieszcza się po prowadnicy; refleks wybranej płyty oraz dekoracyjne mocowania pracują powoli. Powierzchnie przycisków pozostają nieruchome. Jedna istniejąca pauza zatrzymuje hero, mechanizm i mapę. Poza ekranem i przy ograniczeniu animacji efekty zatrzymują się. Na małych urządzeniach i przy oszczędzaniu danych liczba dekoracyjnych animacji jest ograniczona.

Ekosystem jest połączonym schematem sześciu węzłów z pięcioma planowanymi ścieżkami. Kliknięcie lub Enter/Spacja pokazuje istniejący zatwierdzony opis w centralnym panelu desktopu, a na telefonie bezpośrednio przy wybranym węźle. Strzałki, Home/End i Escape obsługują fokus oraz wybór. Bez JavaScriptu wszystkie sześć opisów i trzy linki projektowe pozostają dostępne. Różne obramowania rozróżniają rozwój, prototyp i plan. Ruch obejmuje najwyżej dwie ścieżki wybranego modułu.

Statusy pozostają zgodne z katalogiem: Tax/Mail „W rozwoju”, Translator „Prototyp”, Local AI Agents/Voice Gateway/Bezpieczny komunikator „Planowane”. Wszystkie połączenia są planowane; interfejs nie deklaruje działających integracji. Zachowano zatwierdzone teksty V2, motto, 14 projektów i rozwijane moduły, APK, liczniki oraz Usługi, Kontakt, O mnie i Wydania. Sekcje otrzymały osobne płaszczyzny światła i cienia oraz wyraźniejsze akcenty.

## Pliki

- `assets/interface-life.css`, `assets/interface-life.js`: materiały, ograniczony ruch i wspólny stan pauzy.
- `assets/hero-space.js`: istniejąca obsługa wskaźnika respektuje globalną pauzę i anuluje oczekującą klatkę.
- `assets/ecosystem-system.css`, `assets/ecosystem-system.js`: schemat, wybór ról, połączenia i układ mobilny.
- `scripts/delivery_markup.py`: dostępny HTML mapy, statusy, pięć ścieżek SVG i fallback bez JS.
- `scripts/build-site.py`, `scripts/stage-public.py`, `package.json`, `index.html`: dołączenie czterech lokalnych assetów, publiczna allowlista i kontrola składni.
- `tests/hero-space.test.cjs`, `tests/interface-life.test.cjs`, `tests/test_delivery_sections.py`: regresja pauzy, budżetu efektów, stanów i bezpiecznego markup.
- `scripts/qa-final-website.cjs`: rzeczywiste sprawdzenie mapy, klawiatury, ruchu, pamięci i nowych kadrów.
- Ten raport oraz `docs/evidence/visual-correction-v3-20261023/`: dowody i manifest lokalnego zapisu.

Katalog, backend, zależności i APK pozostały bez zmian. W `package.json` zmieniono wyłącznie polecenie kontroli składni.

## Screenshoty

Pojedyncze rzeczywiste viewporty Chromium po naturalnym przewinięciu; bez składania strony, ukrywania nagłówka lub podmiany treści.

| Wymagany widok | Plik |
| --- | --- |
| Hero desktop | [1440-first.png](evidence/visual-correction-v3-20261023/browser/1440-first.png) |
| Cała mapa ekosystemu desktop | [1440-ecosystem-map.png](evidence/visual-correction-v3-20261023/browser/1440-ecosystem-map.png) |
| Rozwinięty Tax | [1440-progresskit-tax-expanded.png](evidence/visual-correction-v3-20261023/browser/1440-progresskit-tax-expanded.png) |
| Rozwinięty Translator | [1440-progresskit-translator-expanded.png](evidence/visual-correction-v3-20261023/browser/1440-progresskit-translator-expanded.png) |
| Hero mobile | [390-first.png](evidence/visual-correction-v3-20261023/browser/390-first.png) |
| Ekosystem mobile | [390-ecosystem-map.png](evidence/visual-correction-v3-20261023/browser/390-ecosystem-map.png) |

Pozostałe kadry pokazują m.in. wybór Translatora i gałąź komunikacji na telefonie. [Nagranie desktop](evidence/visual-correction-v3-20261023/browser/desktop-mechanism.mp4) i [mobile](evidence/visual-correction-v3-20261023/browser/mobile-interaction.mp4) zachowują rzeczywisty przebieg interakcji.

## Kontrole

Końcowa regresja: **115 Python PASS, 69 JavaScript PASS, 93 GUI PASS / 0 FAIL**. Generator: 14 projektów / 23 pliki PASS. Kontrola HTTP: 69 PASS, w tym 65 plików zgodnych bajtowo z repo, strict CSP oraz pobieranie APK z licznikiem w osobnej bazie testowej. Linki wewnętrzne: 856 PASS / 0 FAIL. Niezależny probe samej mapy: 75 PASS / 0 FAIL.

Końcowe wyniki, polecenia i ograniczenia są zapisane w [indeksie dowodów](evidence/visual-correction-v3-20261023/README.md) oraz surowych raportach. Pełny odbiór obejmuje cztery viewporty: 1920×1080, 1440×900, 390×844 i 320×568; niezależny probe mapy sprawdza także szerokość 1000 px.

Pierwszy odbiór ujawnił niestabilny hitbox unoszonych płyt; ruch przeniesiono na dekoracyjne mocowania i pełny odbiór ponowiono. Osobny probe wykrył overflow poświaty hero na tablecie, który usunięto. Zachowano także pierwszy wynik skryptu HTTP z błędem rozpoznawania wielkości liter nagłówków; poprawiono skrypt odczytu, bez zmiany polityki CSP. Starsze wyniki pozostają jawnie oznaczone i nie są traktowane jako końcowy PASS.

Kolejny odbiór wykrył animację sticky hero za nieprzezroczystymi sekcjami; istniejący observer ogranicza teraz jej działanie do pierwszego obszaru strony na desktopie. Pomiar pamięci rozdziela zimny stan, pierwszy wybór wszystkich sześciu ról i dwa układy oraz kolejne 30 wyborów. Wzrost pierwszego użycia zidentyfikowano jako leniwe obiekty `Attr` tworzone przy odczycie atrybutów przez Chromium/Playwright; live DOM pozostaje stałe. Trzy niezależne kolejne bloki zachowały dokładnie te same liczniki; końcowy pełny test także spełnił ścisłe `<=` bez tolerancji. [Dowody cyklu życia](evidence/visual-correction-v3-20261023/lifecycle-review/summary.json).

To odbiór lokalny w Chromium z emulacją viewportów, bez dowodu fizycznego telefonu, pomiaru FPS na urządzeniu lub działania produkcji. Właścicielski status wizualnej akceptacji publikacji nadal `OPEN`; lokalny commit jest zapisem kandydata do oceny. Paczka `.local/visual-correction-v3-20261023-release/` zapisuje finalny SHA commita i hashe 65 plików publicznych. Niczego nie wysłano ani nie wdrożono.
