# ProgressKit V3 — zatwierdzone grafiki i faktyczne stany projektów

23.10.2026, Europe/Warsaw. Istniejąca strona, baza i HEAD `9322e4e4b35be58517fbf7073c8015673770ef43`. Podgląd: **http://127.0.0.1:8111/**. Zmiany zapisane w plikach, bez stagingu, commita, pusha i deploymentu.

## Stany projektów

| Projekt | Obecna etykieta | Podstawa i granice |
| --- | --- | --- |
| ProgressKit Mail | **Wersja testowa** | Istnieją Android IMAP/SMTP, lokalny podpisany APK i zapisane dowody SMTP do Gmail MX oraz online Debug FCM na Xiaomi. Nie przedstawiamy go ogólnie jako projektu dopiero „W rozwoju”. Publicznego linku APK Mail nie potwierdzono. |
| Lud&Pra / ProgressKit Community | **Finalizacja** | Główne funkcje są zaimplementowane i lokalnie przetestowane; zgodnie z informacją właściciela produkt jest blisko ukończenia. Pozostają bramki najnowszego wydania/publicznej bety. Wcześniejsza publiczna instancja ma historyczny zapis inicjalizacji. |
| Glikemia Premium | **Dostępny APK** | Android APK 1.0 jest udostępniony bezpośrednio przez ProgressKit. Publikacja Google Play oraz Stable/Commercial to odrębne, niepotwierdzone statusy. |

Stany są spójne w kartach hero, rozwiniętych modułach, filtrach katalogu, case studies, legacy Mail i stronie produktu Glikemia. Mapa pokazuje Mail jako wersję testową; status samego produktu nie zmienia planowanych integracji w działające. Zachowano pozostałe 11 rekordów i wszystkie historyczne case studies. [Audyt kodu, artefaktów i źródeł z rozdzieleniem deklaracji właściciela i historycznych testów](evidence/status-and-assets-v3-20261023/project-status-audit.md).

Nie uruchamiano nowych testów produktów Mail/Community/Glikemia, usług pocztowych, FCM ani urządzeń. Historyczne wyniki tych produktów mają datę i zakres; świeże testy poniżej dotyczą strony i izolowanego lokalnego pobierania APK.

## Zgodność wizualna

**IMPLEMENTED — lokalnie obejrzane desktop/mobile; ostateczny odbiór wyglądu właściciela pozostaje OPEN.** Zachowano zastane korekty neutralnego szczotkowanego aluminium, grafitu, mechanicznej głębi i czerwonych refleksów. Nie zmieniano koncepcji ani geometrii hero/mapy. Czerwone aluminium z zatwierdzonej paczki zasila tło istniejącego mechanizmu i mapy, a panorama lasu i gór znajduje się nad treścią stopki, także na stronie Glikemii.

Są to **zatwierdzone rekonstrukcje**, nie odzyskane oryginały. Użytkownik po informacji o pochodzeniu odpowiedział: „Zatwierdzam użycie obu rekonstrukcji”. Oba pliki skopiowano z ZIP bez zmiany bajtów; CRC i SHA-256 PASS. Nie generowano zamienników. [Pochodzenie, hashe i zakres akceptacji](evidence/status-and-assets-v3-20261023/asset-provenance.md).

Stopka zachowuje dotychczasowe linki. Panorama jest dekoracją, ma wariant mobile i znika w druku oraz forced-colors. Przy 320 px poprawiono zawijanie długich identyfikatorów źródeł i układ nagłówka strony Glikemii, aby dokument nie wychodził poza ekran i pełna stopka mieściła się w kadrze. Nie ukrywano linków w celu uzyskania zrzutów.

Wcześniejszy [raport korekty materiałów](MATERIAL_CORRECTION_V3_20261023.md) pozostaje zapisem wcześniejszego etapu, kiedy stopka była bez zmian i brakowało zgody na rekonstrukcje. Obecny raport opisuje późniejszy stan po akceptacji i aktualizacji katalogu.

## Wyniki testów funkcjonalnych

**PARTIAL:** główne przepływy przechodzą; jedna kontrola licznika pamięci Chrome pozostaje niezaliczona w pełnym przebiegu. Nie jest to deklaracja pełnego PASS.

| Kontrola bieżącej strony | Wynik |
| --- | --- |
| Generator i składnia JS | PASS — 14 projektów, 23 zgodne pliki wynikowe |
| Python, w tym istniejący backend i preview | **118 PASS / 0 FAIL / 0 SKIP** |
| Node | **71 PASS / 0 FAIL / 0 SKIP** |
| Pełny lokalny Chrome: mechanizm, projekty, mapa i dostępność | **92 PASS / 1 FAIL** — licznik węzłów CDP po cyklach wyboru i resize |
| Rzeczywiste stany, filtry, obrazy, stopki, forced-colors/print na 1440/390/320 px | **46 PASS / 0 FAIL**, błędów runtime/zasobów: 0 |
| HTTP i pobieranie/licznik | **71 PASS / 0 FAIL** — 67 publicznych plików zgodnych bajtowo oraz cztery scenariusze APK |
| Linki wewnętrzne | **856 PASS / 0 FAIL** na 20 publicznych stronach HTML |

Pełna kontrola Chrome obejmuje 1920×1080, 1440×900, 390×844 i 320×568, wszystkie 14 projektów, sześć ról mapy, pięć planowanych połączeń, klawiaturę, Escape, naturalny scroll, menu, wybór po odświeżeniu, fallback bez JS, lokalny brief, reduced motion, pauzę i zatrzymanie efektów poza ekranem. 32 wejścia UI mają identyczne hashe przed i po kompletnym przebiegu; konsola i zasoby: 0 błędów. Oba nagrania interakcji powstały poprawnie. Nie oznaczamy całego przebiegu jako PASS: po 30 wyborach ról i dwóch zmianach szerokości CDP wykazał 2025→2026 węzłów, przy niezmienionych 172 listenerach i jednym dokumencie. Osobna [diagnoza pamięci](evidence/status-and-assets-v3-20261023/memory-diagnostic.json) zachowuje ten FAIL: trzy niezależne sesje, łącznie 12 bloków po 30 wyborów i dwa resize, nie przekroczyły rozgrzanej bazy 2018 węzłów (obserwowano 2017–2018), a dokument i listenery pozostały stałe. Snapshoty żywego DOM i pseudoelementów również miały stałe liczby. Odczyty diagnostyczne różnią się od całego harnessu; przyczyny pierwotnego +1 nie ustalono. Status: **UNRESOLVED_MEASUREMENT**, bez osłabienia asercji i bez deklaracji naprawy wycieku.

HTTP używa wyłącznie loopback i syntetycznej bazy `/tmp/progresskit-material-v3-20261023/product.db`. Końcowy pełny GET pobrał 80 235 954 B, SHA-256 `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`, zwiększając lokalny licznik dokładnie **2→3**. HEAD, prefetch i Range nie zwiększają licznika. Poprzedni przebieg 1→2 zachowano w osobnych dowodach; nie zerowano bazy. To kontrola lokalnego pobierania, bez deklaracji produkcyjnej liczby pobrań lub instalacji telefonu.

Pierwszy pełny Python miał 117 PASS / 1 FAIL przez nieaktualne oczekiwanie starego opisu Mail. Test zaktualizowano do zatwierdzonego stanu, zachowując kontrole ochrony galerii oraz granic dowodów i dostępności APK. Pierwsza kontrola stanów/grafik miała 42 PASS / 4 FAIL: błędne oczekiwanie etykiety bez prefiksu „ANDROID //” oraz niepełny widok stopki. Dodanie oczekiwania po przewinięciu nie usunęło problemu: kolejna kontrola miała 44 PASS / 2 FAIL i ujawniła rzeczywisty overflow 320 px. Po poprawkach końcowa kontrola ma 46 PASS; przy kontroli overflow porównuje szerokość dokumentu do `clientWidth`, aby mobilne powiększenie layout viewport nie maskowało problemu. Zachowano początkowe logi/JSON. Pełny przebieg Chrome sprzed ostatniej poprawki CSS przerwano i uruchomiono od początku.

## Zrzuty do odbioru

| Widok | Plik |
| --- | --- |
| HERO desktop | [1440-first.png](evidence/status-and-assets-v3-20261023/browser/1440-first.png) |
| Mapa ekosystemu desktop | [1440-ecosystem-map.png](evidence/status-and-assets-v3-20261023/browser/1440-ecosystem-map.png) |
| Rozwinięty Tax | [1440-progresskit-tax-expanded.png](evidence/status-and-assets-v3-20261023/browser/1440-progresskit-tax-expanded.png) |
| Rozwinięty Translator | [1440-progresskit-translator-expanded.png](evidence/status-and-assets-v3-20261023/browser/1440-progresskit-translator-expanded.png) |
| Rozwinięty Mail | [1440-progresskit-mail-expanded.png](evidence/status-and-assets-v3-20261023/browser/1440-progresskit-mail-expanded.png) |
| Wybrany Mail na mapie | [1440-mail-ecosystem.png](evidence/status-and-assets-v3-20261023/1440-mail-ecosystem.png) |
| Pełna stopka desktop | [1440-home-footer.png](evidence/status-and-assets-v3-20261023/1440-home-footer.png) |
| HERO mobile | [390-first.png](evidence/status-and-assets-v3-20261023/browser/390-first.png) |
| Mapa mobile | [390-ecosystem-map.png](evidence/status-and-assets-v3-20261023/browser/390-ecosystem-map.png) |
| Pełna stopka mobile | [390-home-footer.png](evidence/status-and-assets-v3-20261023/390-home-footer.png) |
| Stopka Glikemii, 320 px | [320-glikemia-footer.png](evidence/status-and-assets-v3-20261023/320-glikemia-footer.png) |

Łącznie **80 PNG i dwa MP4**. Kadry rzeczywistego viewportu po przewinięciu, bez składania i podmiany treści. Mobile to emulacja w lokalnym Chrome, bez nowego odbioru fizycznego urządzenia lub produkcji.

## Zmienione pliki i granice

- `assets/interface-life.css`, `assets/ecosystem-system.css`: zachowane korekty aluminium/grafitu/czerwieni, dodana zaakceptowana tekstura i styl wersji testowej.
- `assets/visual-acceptance.css`, `assets/progresskit-product-shell.css`: dekoracyjna panorama stopki i małe poprawki zawijania przy 320 px.
- `assets/brand/red-aluminium-reconstruction.jpg`, `assets/brand/footer-forest-mountains-reconstruction.png`: dokładne kopie zatwierdzonych plików.
- `catalog/projects.json`: faktyczne stany i opisy dojrzałości trzech projektów, źródła i daty audytu; pozostałe 11 bez zmian.
- `scripts/build-site.py`, `scripts/delivery_markup.py`, `assets/project-hologram.js`, `assets/ecosystem-system.js`: dopuszczenie nowych stanów i spójny etap Mail na mapie.
- `scripts/stage-public.py`: wyłącznie dwa zatwierdzone obrazy dodane do whitelist; razem 67 plików.
- `index.html`, `projekty/index.html`, `progresskit-mail/index.html`, `glikemia-premium/index.html`, `projekty/glikemia-premium/index.html`, `projekty/progresskit-mail/index.html`, `projekty/progresskit-community/index.html`: odtworzone istniejącym generatorem.
- `tests/project-hologram.test.cjs`, `tests/test_catalog_validation.py`, `tests/test_delivery_sections.py`, `tests/test_site_v4.py`, `scripts/qa-final-website.cjs`: poprawne oczekiwania nowych stanów i zachowanie granic danych.
- Dokumentacja bieżąca oraz zastane dowody korekty materiałów: pełna lista plików i hashe w indeksie dowodów.

Wszystkie 14 projektów, APK Glikemia, liczniki, rozwijane moduły, nawigacja, Usługi, Kontakt, O mnie i Wydania zachowano. Nie dodano zależności ani fikcyjnego linku APK Mail. Sekcja Wydania i `ownerVisualApproval: OPEN` pozostają bez zmian. Źródła sąsiednich produktów były wyłącznie odczytywane. [Niezależny przegląd zakresu](evidence/status-and-assets-v3-20261023/final-scope-review.md). [Indeks dowodów i odtworzenie testów](evidence/status-and-assets-v3-20261023/README.md).
