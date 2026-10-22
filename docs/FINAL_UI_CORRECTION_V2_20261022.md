# ProgressKit Systems — odbiór wizualny V2

Data: 2026-10-22, Europe/Warsaw. Repo: `/home/pawe/Pulpit/Projekty It/ProgressorKit Systems`.
Punkt wyjścia: `c515f3fcd25de29ee3c57bff1b26c777a506cac1`, `main`, czyste drzewo, ahead 2 / behind 3 względem zapisanej referencji origin. Bez pull/reset/rebase, pushu, deploymentu i zmian produkcyjnych.

## Wynik korekty

- Ciemniejsze, zróżnicowane grafitowe aluminium zastąpiło blade srebro. Header, tło, płyty, szczegóły, formularz i stopka mają osobne powierzchnie, światło, szczotkowanie i czerwone akcenty. Zachowano logo i motto.
- Widoczny pierścień i centralny hub usunięto z generowanego DOM. Sześć istniejących plastrów pracuje na prostych prowadnicach z naprzemiennym przesunięciem poziomów. Nie dodano drugiego zestawu projektów.
- Ręczne przejście chowa powierzchnie w prowadnice i wysuwa kolejne moduły; zmiana gniazda odbywa się przy pełnym schowaniu. Nie ma ruchu po okręgu ani ciągłej pętli animowania projektów. Wybór zatrzymuje mechanizm i rozwija rzeczywisty moduł.
- Nazwy mają 22–24 px na głównych ekranach; statusy co najmniej 12 px, akcja 14 px. Większe powierzchnie i czytelniejsza hierarchia zastąpiły miniaturowe sześciokąty.
- Otwarty moduł rozszerza normalny dokument. Zachowano przewijanie strony, fokus, Escape, URL i odświeżenie. Kliknięcie widocznego sąsiada ustawia go jako wybrany projekt, więc dalsze sterowanie działa od właściwego miejsca.
- Duże kafle kategorii zmieniono w zwarte filtry. Usunięto drugi selektor sześciu projektów z sekcji inżynieryjnej; pozostawiono jej nagłówek, wprowadzenie i przejście do analiz. Dane, renderer analiz i wszystkie strony szczegółów pozostają.
- Bezpośrednio za główną ekspozycją jest mapa Tax ↔ Translator ↔ Local AI Agents ↔ Voice Gateway, a osobno Mail i bezpieczny komunikator. Statusy produktów pochodzą z katalogu, koncepcje i relacje oznaczono jako planowane. Żadna integracja nie została przedstawiona jako działająca oferta.
- Usługi, Kontakt, Wydania, wyszukiwanie, filtry, autentyczne galerie, pobieranie APK i backend zachowane.

Katalog nadal zawiera 14 identyfikatorów: glikemia-premium, progresskit-mail, progresskit-translator, vaeloria, progresskit-community (Lud&Pra), progresskit-tax, adivara, gotrans360, ignira (Maria-Salon), obserwator (Marek Zaworski), kan-system, progresskit-systems, progresskit-analytics, progresskit-infrastructure. Katalog, brand, backend i APK są bajtowo zgodne z bazowym commitem.

## Treści i zakres zgody

Mapa używa istniejących zatwierdzonych opisów, zdań roadmapy, danych katalogowych oraz nazw wprost zażądanych w briefie V2. Nie dodano niezatwierdzonego leadu ani nowych obietnic.

Opcjonalny pakiet dokładniejszej redakcji został wysłany do konsultacji, lecz nie otrzymał odpowiedzi podczas tego przebiegu. Nie został zastosowany. Dotyczy także zamiany etykiet „Wstrzymaj/Wznów efekty orbity” na „Wstrzymaj/Wznów efekty mechanizmu” i neutralnej etykiety dostępności. Dotychczasowe określenie orbity w tych etykietach jest znanym otwartym szczegółem treści. Nie oznacza obecności widocznego pierścienia ani orbitalnej animacji w V2.

## Rzeczywiste ekrany i nagrania

[Galeria przed/po, sześć rozwiniętych projektów, desktop/mobile i dwa filmy](evidence/visual-acceptance-v2-20261022/README.md).

Materiały „przed” są rzeczywistymi zrzutami Chromium z bazowego commita, skopiowanymi bajtowo; ich pochodzenie i hashe zapisano w `before/provenance.json`. Materiały „po” wykonano z uruchomionej witryny. Nie stosowano generowania ani retuszu obrazów. Tax nie ma własnej galerii aplikacji; rozwinięty Tax jest prawdziwym ekranem witryny. Historyczne materiały Mail/Translator zachowują swoje podpisy.

Plugin przeglądarki nadal nie miał połączonej instancji. Użyto istniejącego systemowego Chromium 155.0.8059.39 i Playwright, zgodnie z zakresem lokalnego odbioru. Cztery viewporty: 1920×1080, 1440×900, 390×844 i dodatkowo 320×568. To emulacja viewportów/dotyku, nie test fizycznego Androida lub ThinkPada T480s.

## Wyniki testów

| Zakres | Wynik | Dowód w `evidence/visual-acceptance-v2-20261022/` |
|---|---|---|
| Generator/składnia | PASS: 14 projektów / 23 generowane pliki | `check.log` |
| Python | 111 PASS / 0 FAIL / 0 SKIP | `python-tests.log` |
| Node | 65 PASS / 0 FAIL / 0 SKIP; 33 scenariusze showroomu wliczone | `node-tests.log` |
| Końcowy Chromium | 80 PASS / 0 FAIL; 58 PNG + 2 MP4; 28 wejść UI stabilnych | `browser-accepted/report.json` |
| HTTP, zasoby, odmowy, nagłówki, APK i licznik | 96 PASS / 0 FAIL | `http-review.json` |
| Wewnętrzne href/fragmenty | 856 PASS / 0 FAIL | `internal-links.json` |
| Cztery publiczne adresy zewnętrzne | 4 PASS / 0 FAIL / 0 BLOCKED | `external-links.json` |
| Kontrast computed styles | 21 PASS / 0 FAIL; minimum 5,236:1; linia projektu 7,574:1 przy 14 px | `contrast-review.json` |
| SAST/SCA/secret review | SAST: 44 pliki / 6 reguł / 0 findings; SCA: 18 pakietów / 0 podatności; secret review: 7/7 benign | `security/final-security-summary.json` |
| Fizyczny Android/T480s, Lighthouse, rzeczywisty FPS | NOT RUN | brak takiego dowodu; nie oznaczono PASS |
| Publikacja | BLOCKED: odbiór wizualny właściciela OPEN | nie zmieniono `catalog/brand.json` |

Kontrast policzono z faktycznych kolorów tekstu i stopów gradientów przodków, z uwzględnieniem alfa szczotkowania. Najniższa kontrolowana wartość dotyczy akcji „Odkryj projekt”. To ograniczona kontrola palety rzeczywistej kaskady, bez deklaracji pełnego audytu WCAG lub analizy każdego piksela. Dodatkowy rzeczywisty pomiar 390 px potwierdził jasny kolor i 14 px dla linii projektu (`mobile-status-verification.json` oraz `390-status-after-fix.png`).

Surowy Gitleaks zachował FAIL: 4 trafienia historii + 3 worktree. Wszystkie 7 sprawdzono względem dokładnych blobów/testu lub publicznego podpisu APK: 3 syntetyczne fixtures i 4 publiczne fingerprinty. Nie pozostały nierozpatrzone trafienia, nie wyłączono reguł ani plików. SAST ma sześć jawnych reguł wzorców; nie jest pełną analizą przepływu danych. SCA dotyczy dokładnie 18 lokalnych pakietów Python i aktualnej bazy z 22.10; nie obejmuje obrazów OS/Docker ani zdekompilowanych zależności APK. Sieć skanów była wyłączona, źródeł/inventory nie wysyłano. Szczegóły: `security/REVIEW.md`.

## Problemy wykryte i rozwiązane

1. Pierwszy render ujawnił nakładanie większych płyt: procenty w transformacji liczyły rozstaw względem samego modułu. Pozycjonowanie poziome przeniesiono do `left`, gdzie odniesieniem jest prowadnica. Kolejny render i testy prostokątów potwierdziły oddzielenie powierzchni.
2. Pierwszy pełny GUI wystartował przed wygenerowaniem mapy; pierwszy kontekst 1920 miał poprzedni DOM i poprawnie zgłosił drugi katalog. Zachowano raport 78 PASS / 1 FAIL. Końcowy odbiór wystartował po przebudowie i ma kontrolę hashy wejść przed/po całym przebiegu. Wcześniejszy raport nie jest odbiorem końcowym.
3. Dodatkowy probe HTTP błędnie oczekiwał HEAD 200. Kod ma wyłącznie GET; rzeczywisty kontrakt to HEAD 405, `Allow: GET`, brak body i brak wzrostu licznika. Surowy pierwszy wynik 95 PASS / 1 FAIL zachowano jako `http-review-first.json`. Nie dopisano nowej funkcji backendu i nie zadeklarowano obsługi HEAD pobrań.
4. Pierwsza regresja Python zatrzymała się na TestClient w ograniczonym sandboxie IPC i została przerwana. Do końcowej regresji użyto tego samego lokalnego środowiska z dozwolonym IPC; wszystkie 111 testów rzeczywiście wykonano.
5. Niezależne obejrzenie klatek filmu wykryło słaby kontrast i 10/11 px w linii aktualnego projektu pod filtrami. Stary selektor ID wygrywał z motywem. Dodano właściwy selektor ID z jasnym kolorem i 14 px, rozszerzono próbkę kontrastu o tę linię oraz ponowiono końcowy GUI. Wcześniejszy pełny przebieg miał 80 automatycznych PASS, ale nie wykrył tej wady wizualnej; zachowano go jako `browser-before-status-fix/`, bez promowania do końcowego odbioru wizualnego.
6. Kolejny przebieg po poprawce stracił połączenie przy ostatnim refreshu 320 px: serwer preview zakończył pracę sygnałem TERM. Zachowano `browser-server-interruption/` (74 PASS / 1 FAIL i fatal po utracie kontekstu), bez zaliczania do odbioru. Podgląd uruchomiono ponownie w niezależnej sesji procesu i powtórzono pełny GUI bez zmian źródeł. Przyczyny pierwotnego sygnału nie ustalono.

## Wydajność i integralność

Końcowa próba CDP w spoczynku: 1,004086 s, TaskDuration 0,000660 s, ScriptDuration 0 s. Zimny DOM: 1 dokument / 1872 węzły / 121 listenerów. Po pierwszym cyklu i rozgrzewce: 1 / 1932 / 134; po kolejnych 10 cyklach dokładnie 1 / 1932 / 134. Nie zaobserwowano powtarzalnego wzrostu; jednorazowego kosztu pierwszego użycia nie przypisano arbitralnie narzędziu. Nagrania: 172 rzeczywiste klatki desktop i 86 telefonu, oba kodowania PASS. Dane źródłowe: `browser-accepted/report.json`.

Ruch ręczny używa ograniczonej liczby klatek przez 620 ms, animacja otwarcia trwa 300 ms, a wskaźnik prowadnicy ma pojedynczy cykl 650 ms. W spoczynku nowy mechanizm nie uruchamia pętli `requestAnimationFrame`. Zachowano usypianie poza viewportem, przy ukryciu strony oraz `prefers-reduced-motion`. `will-change` płyt jest aktywne podczas ruchu; nowe materiały nie dodają warstw rozmycia ani pętli efektów.

Pomiary pochodzą z lokalnego headless Chromium na współdzielonym hoście i HTTP loopback. Nie są pomiarem FPS/GPU ani fizycznego telefonu. Krótka stabilność liczników DOM nie dowodzi wielogodzinnego braku wycieków.

APK: 80 235 954 B, SHA-256 `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`. Świeża kontrola ZIP CRC i podpisu v2/v3 PASS. Lokalne pełne pobranie zwiększa testowy licznik dokładnie raz; Range i nieobsługiwany HEAD go nie zwiększają.

## Podgląd i otwarte kwestie

**http://127.0.0.1:8100/** — odrębny podgląd V2, tylko loopback, własna testowa baza `/tmp/progresskit-ui-v2-20261022/product.db`.

Lokalny commit obejmuje ten raport, źródła i dowody; jego SHA zapisuje `release.json` paczki `.local/visual-acceptance-v2-20261022-release/`. Paczka zawiera tylko jawnie dozwolone pliki publiczne, bez backendu, bazy, sekretów i APK. Integralność każdej pozycji jest w `files.json` oraz `SHA256SUMS`.

Publikacja pozostaje BLOCKED do wizualnej decyzji właściciela oraz operacyjnej weryfikacji hostingu/nagłówków/TLS, rzeczywistych obrazów wdrożeniowych i konfiguracji analityki. Te kwestie pozostały poza lokalnym sprintem UI. Nie synchronizowano rozbieżnej gałęzi z origin.

## Lista zmienionych plików

- `404.html`
- `assets/project-mechanism.css`
- `assets/project-showroom.js`
- `assets/visual-acceptance.css`
- `docs/FINAL_UI_CORRECTION_V2_20261022.md`
- `index.html`
- `progresskit-mail/index.html`
- `projekty/adivara/index.html`
- `projekty/glikemia-premium/index.html`
- `projekty/gotrans360/index.html`
- `projekty/ignira/index.html`
- `projekty/index.html`
- `projekty/kan-system/index.html`
- `projekty/obserwator/index.html`
- `projekty/progresskit-analytics/index.html`
- `projekty/progresskit-community/index.html`
- `projekty/progresskit-infrastructure/index.html`
- `projekty/progresskit-mail/index.html`
- `projekty/progresskit-systems/index.html`
- `projekty/progresskit-tax/index.html`
- `projekty/progresskit-translator/index.html`
- `projekty/vaeloria/index.html`
- `prywatnosc/index.html`
- `scripts/build-site.py`
- `scripts/delivery_markup.py`
- `scripts/qa-final-website.cjs`
- `scripts/showroom_markup.py`
- `scripts/stage-public.py`
- `tests/project-showroom.test.cjs`
- `tests/test_delivery_sections.py`
- `tests/test_homepage_composition.py`

Pełna lista wszystkich źródeł, generowanych stron i artefaktów z rozmiarami i SHA-256 jest w `evidence/visual-acceptance-v2-20261022/delivery-manifest.json`. Manifest wyklucza własne bajty, aby uniknąć cyklicznego hashowania.
