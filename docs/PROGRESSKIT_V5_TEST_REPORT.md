# ProgressKit V5 — raport wykonanych testów

Data: 2026-10-15. Zakres końcowy obejmuje pilną korektę właściciela,
odnaleziony pejzaż oraz oryginalny miedziany PK. Wynik sprintu: PARTIAL.

## Najnowsza regresja — showroom 360° i hologram

**118 PASS / 0 FAIL / 0 SKIP**:82 Python,12 dotychczasowych Node,10 showroom i14 hologram. Testy Node obejmują matematykę/stany oraz rzeczywiste handlery na małym syntetycznym DOM; nie są testami renderu przeglądarki. Pełna regresja została ponowiona po poprawkach swipe→click przy jednym projekcie, resetu przewinięcia dialogu i kolejności centrowanie→otwarcie.

Osobno **102 PASS / 0 FAIL** lokalnych kontroli HTTP nowego preview `http://127.0.0.1:8093/`:53 publiczne pliki, routingi, przekierowania i odmowy dostępu do prywatnych ścieżek. Nie zatrzymywano poprzedniego serwera 8092. Zatwierdzony katalog14/galerie9 mają niezmienione dane. Generator23/HTML20, składnia5plikówJS,4arkuszeCSS bez błędów parsera,2plikiSVG poprawne XML.

Polecenia: `python -m unittest discover -s tests -v`, `node --test --test-reporter=spec tests/*.test.cjs`, `npm run check`, `python3 /tmp/progresskit-v5-final-visual-http-check.py`.

Trwałe wyniki: `evidence/progresskit-v5/final-visual-test-summary.json`, `final-visual-python-tests.txt`, `final-visual-node-tests.txt`, `final-visual-local-http.json`, `final-visual-size-budget.json`. Pierwszy przebieg przed poprawką placeholdera miał81PASS i1FAIL (pustyH2); finalny ma82PASS. Nie osłabiano tej kontroli.

Browser discovery zwróciło brak przeglądarki. Wygląd, realny fokus/touch, Lighthouse i pełna dostępność pozostają NOT RUN/OPEN. Instrukcja: [VISUAL_ACCEPTANCE](PROGRESSKIT_V5_VISUAL_ACCEPTANCE.md).

## Pierwszy etap sprintu — historyczne wyniki przed showroom 360°

| Zestaw | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| Walidacja katalogu, negatywne dane, daty, URL, źródła i symlinki | 31 | 0 | 0 |
| HTML, metadane, odwołania, obrazy, escaping i publiczny staging | 15 | 0 | 0 |
| Kompatybilność V4, oryginalne logo i stare adresy produktów | 7 | 0 | 0 |
| Układ właściciela, 6 kategorii, brak duplikacji, brief, bramka publikacji | 7 | 0 | 0 |
| HTTP TestClient lokalnego podglądu i granica plików publicznych | 5 | 0 | 0 |
| Dystrybucja APK, integralność, moderacja, limity i przerwane transfery | 13 | 0 | 0 |
| Analityka na syntetycznej bazie lokalnej | 3 | 0 | 0 |
| **Python razem** | **81** | **0** | **0** |
| Node: wyszukiwanie PL, łączenie filtrów, URL, panele, hover/touch/klawiatura | **12** | **0** | **0** |
| **Łącznie testy** | **93** | **0** | **0** |

Wykonano `python -m unittest discover -s tests -v` w osobnym środowisku `/tmp`
oraz `node --test --test-reporter=spec tests/catalog-filters.test.cjs`.
Logi końcowe: `/tmp/progresskit-v5-candidate-python-tests.log`, `/tmp/progresskit-v5-candidate-node-tests.log`.
Wersje bibliotek: `evidence/progresskit-v5/requirements-tested.txt`.

Testy API wymagają IPC/threads poza ograniczeniem sandboxa. Pierwsza próba pod
ograniczeniem utknęła; do raportu zaliczono ukończone uruchomienie po dozwolonym
ponowieniu. Zależności pobrano wyłącznie do tymczasowego venv. Obecna Starlette
emituje ostrzeżenie o przyszłej zmianie klienta httpx; nie ukryto go ani nie
zmieniano produkcyjnych zależności w celu zaliczenia testów.

Stary test przerwania transferu poprawiono po odtworzeniu różnicy ASGI 2.3/2.4.
Zachowano wymaganie OSError i brak incrementu; dodano osobny wcześniejszy disconnect.
Naprawiono też izolację konfiguracji bazy przy imporcie produktu przez kilka suites.
Szczegóły: `PROGRESSKIT_V5_ENGINEERING_CASES.md`. Kod backendu dystrybucji bez zmian.

## Pozostałe wykonane kontrole

- Generator: **14 wpisów**, **23 pliki wynikowe**, w tym **20 dokumentów HTML**.
- Statyczna kontrola **837 lokalnych href/src** oraz kotwic, aria-controls i etykiet.
- Jawny artefakt: **43 pliki**; brak docs, katalogu JSON, backendu, baz i surowych mediów.
- Osobne rzeczywiste połączenia TCP HTTP: **70 PASS / 0 FAIL**, włącznie z kontrolowanymi
  odpowiedziami 404. To test HTTP, nie przeglądarkowy. Dowód: `evidence/progresskit-v5/local-http.json`.
- `node --check` obu skryptów frontendowych, `compileall`, `git diff --check`: PASS.
- **9** rzeczywistych screenshotów produktów: obejrzane pod kątem danych i pochodzenia.
- Pejzaż marki: autoryzowana edycja źródłowej makiety, oględziny pliku; nie screenshot produktu.
- Oryginalny PK: hash zgodny z miedzianym `logopkpod.png` właściciela. Plik oryginału bez zmian; najnowsze HERO nadaje mu materiał reliefu przez SVG, bez nowej geometrii.
- Wybrane pary kontrastu policzono ze stałych kolorów CSS. Nie jest to audyt renderowanej strony.
- Bramka publikacji zwraca **BLOCKED** przy `ownerVisualApproval:OPEN`. To oczekiwane działanie.

Rozmiary, gzip i zakres artefaktu zapisano w `evidence/progresskit-v5/size-budget.json`.
Są to rozmiary plików, nie pomiary LCP/INP/CLS. Brak bibliotek JavaScript runtime.

## Publiczne odczyty istniejącej produkcji

Strona główna V4, strony Glikemii i Mail, API licznika oraz strona preview Vaelorii
odpowiedziały HTTPS 200. `/summary` i `/health` odpowiedziały 404.
GET `/_analytics/event` zwrócił 404; konfiguracja przewiduje wyłącznie POST, więc
nie wyciągnięto z tego wniosku o niesprawności ani o poprawnym zapisie zdarzenia.
Nie wysyłano testowych zdarzeń lub opinii na produkcję.

Publiczny APK: Range 0–31 → 206, typ Android package, Content-Range pełnego pliku
80 235 954 B, sygnatura ZIP, licznik bez zmiany. Nie pobierano pełnego pakietu,
nie porównano jego publicznego SHA i nie instalowano go na urządzeniu.
Dowody: `public-http.json`, `public-apk-range.json` w katalogu evidence.
Wyniki dotyczą zastanej produkcji, **nie V5**.

## NOT RUN / OPEN

| Kontrola | Stan i powód |
| --- | --- |
| Render desktop/tablet/mobile, brak overflow i finalny kadr hero | OPEN — runtime przeglądarki nie udostępnił żadnej przeglądarki |
| Rzeczywiste hover, tap, menu, focus, Escape, galerie i pobieranie briefu | NOT RUN w przeglądarce; testy struktury/logiki nie zastępują tego dowodu |
| Reduced motion w renderze oraz czytnik ekranu | NOT RUN |
| Pełna zgodność WCAG 2.2 AA | Niepotwierdzona |
| Lighthouse i field Core Web Vitals | NOT RUN |
| Testy aplikacji produktowych i fizycznych urządzeń | Nie ponawiano; ich liczby w case studies są jawnie historyczne |
| Pełny Caddyfile, backup/restore, VPS i wdrożenie V5 | NOT RUN; produkcji nie zmieniano |
| Akceptacja końcowej kompozycji przez właściciela | OPEN — źródło i zgoda na edycję nie są akceptacją układu strony |

Brak pełnego dowodu braku regresji poza wykonanym zakresem. Nie zadeklarowano
gotowości produkcyjnej ani zatwierdzenia wyglądu.
