# ProgressKit Mail — preflight komercyjny, 2026-11-02

**Status: pełne wydanie komercyjne wymaga domknięcia konkretnych wersji klientów, dystrybucji i zakresu oferty.** Stan usługi pocztowej przyjęto zgodnie z potwierdzeniem właściciela z 02.11.2026: wysyłka i odbiór działają, porty są odblokowane (OWNER_REPORTED). Wysyłka, konta, IMAP/SMTP i porty nie są przedmiotem dalszego testowania w tym zadaniu. Otwarte pozostają GUI/instalacja/upgrade/restart wskazanych pakietów klientów, platformowe DPAPI/CNG/FCM i unsigned Release, backend provider/DB, bezpieczna dystrybucja oraz kwestie operacyjne i formalne.

## Nowe testy lokalne

Pierwsza próba w sandboxie zatrzymała się przed wykonaniem testów przez odmowę lokalnego IPC VSTest. Dowody pozostają w `sandbox-attempt/`; nie jest to błąd produktu. Zaakceptowane ponowienie wykonało kopie istniejących zestawów Release w prywatnych katalogach tymczasowych/XDG. Nie wykonywano nowego builda, restore, instalacji, logowania na rzeczywiste konto ani migracji bazy.

| Zestaw | PASS | FAIL | Niewykonane |
|---|---:|---:|---:|
| core | 271 | 0 | 14 |
| linux | 106 | 0 | 4 |
| linux-security | 40 | 0 | 1 |
| server-no-db | 190 | 0 | 11 |

Bazowe wykonanie daje 607 PASS / 0 FAIL / 30 niewykonanych. Zachowano oryginalne TRX i ich warunki: 14 testów zaufanego lokalnego TLS, 4 powiadomień D-Bus, 1 natywnego keyringu i 11 PostgreSQL. Oddzielne wykonania poniżej nie zmieniają tych plików ani ich historycznych liczników.

### Oddzielne testy natywne w izolacji

| Scenariusz | PASS | FAIL | Niewykonane |
|---|---:|---:|---:|
| Keyring: zablokowany | 1 | 0 | 0 |
| Keyring: odczyt z nowego procesu | 1 | 0 | 0 |
| Keyring: usługa niedostępna | 1 | 0 | 0 |
| Keyring: odblokowany | 1 | 0 | 0 |
| Powiadomienia: prywatny D-Bus | 4 | 0 | 0 |
| IMAP/SMTP: zaufany TLS na loopback | 14 | 0 | 0 |

To 22 dodatkowe wykonania: 14 testów transportu, 4 powiadomień i jeden test keyringu uruchomiony w czterech trybach. Nie są to cztery różne testy keyringu. Baza PostgreSQL nadal ma 11 niewykonanych testów.

Transport użył istniejącego fixture: efemeryczne CA, certyfikat serwera i CRL oraz zaufanie ograniczone do procesu. Zmieniono wyłącznie uruchomienie testów na istniejącą DLL; nie wyłączano walidacji TLS, weryfikacji unieważnienia ani nie dodawano CA do zaufania systemowego. Keyring pracował w nowej sesji D-Bus, z prywatnym XDG i syntetycznymi danymi; nie użyto keyringu użytkownika. Powiadomienia testowano na prywatnej magistrali bez katalogów aktywacji usług.

## Powiązanie ze źródłami i artefaktami

Sprawdzono 19 plików portable PDB: 372 rekordów dokumentów odpowiadają aktualnym bajtom, 0 rozbieżności. Obejmuje to 233 unikalnych dostępnych plików źródeł. Pięć wirtualnych plików generatorów `.g.cs` nie występuje na dysku i nie otrzymuje statusu zweryfikowanych źródeł. To powiązanie wcześniej zbudowanych DLL ze źródłami, a nie świeży rebuild produktu.

Manifest 195 plików desktopu odpowiada aktualnym plikom. SHA-256 faktycznie wykonanych DLL znajdują się w `fresh-tests.json`, szczegóły PDB w `pdb-source-freshness.json`. Stan Git repo Mail po bazowym wykonaniu nie zmienił się. Manifest desktopu nie obejmuje wszystkich testów i backendu; dlatego nie zastępuje osobnej weryfikacji PDB.

Aktualny plik Android Debug przechodzi `apksigner verify` (v2). Plik `app-release-unsigned.apk` jest faktycznie niepodpisany i nie przechodzi weryfikacji podpisu; jest to oczekiwana cecha kandydata unsigned oraz blokada przedstawiania go jako gotowego podpisanego Release. Instalator Windows i EXE w ZIP nie zawierają certyfikatu Authenticode. DEB ma wersję 1.0.0-10, amd64. Są to oględziny artefaktów, bez instalacji i odbioru ich działania. Artefakty wydania są wcześniejsze od części późniejszych zmian źródeł; nie utożsamiamy ich z dzisiejszymi testowanymi DLL.

## Status platform

| Platforma | Potwierdzone teraz | Nadal do zamknięcia |
|---|---|---|
| Android | Podpis istniejącego Debug: PASS; kandydat Release: unsigned. | Konkretny podpisany i poprawnie skonfigurowany Release, GUI, instalacja/aktualizacja/restart i lifecycle FCM. Stare dowody Debug nie zatwierdzają Release; stan usługi pocztowej przyjęty od właściciela nie wymaga powtórki SMTP w tym zadaniu. |
| Linux | Core, UI/MVVM i security: wyniki powyżej. Izolowany TLS, D-Bus i keyring: PASS. Metadane i hashe DEB/TAR sprawdzone. | GUI, instalacja/upgrade/restart i odtworzenie chronionego stanu dokładnie wskazanej wersji DEB/TAR; zaufana dystrybucja, aktualizacje i wsparcie. Działanie usługi pocztowej przyjęto zgodnie z OWNER_REPORTED; bez nowego konta i powtórki SMTP. |
| Windows | Wspólny Core wykonany na Linux; PE bez Authenticode. | Windows 11: instalacja/upgrade/restart, GUI WPF, DPAPI/CNG i chroniony stan lokalny konkretnego builda; podpis i polityka aktualizacji. Wspólny Core nie stanowi odbioru WPF; nie zleca się dalszych testów usługi pocztowej. |
| Backend/API | 190 PASS z istniejącej DLL; syntetyczne/in-memory API i testy jednostkowe. | 11 testów PostgreSQL niewykonanych; aktualna rewizja wdrożenia, granty/migracje, backup/restore i rzeczywisty provider zmiany hasła pozostają osobnymi bramkami. |
| Hosting poczty | Właściciel 02.11.2026 potwierdził działającą wysyłkę/odbiór i odblokowane porty; ten stan przyjęto jako OWNER_REPORTED. | Zakres operacyjny: backup/restore, monitoring, obsługa incydentów, retencja i SLA oraz powiązanie z konkretnym backendem/providerem. Dalsze testy kont/wysyłki/IMAP/SMTP/portów wyłączono z zadania. |

Historia buildów/urządzeń i precyzyjne zakresy są w `../portfolio-audit-20261102/mobile-mail.json`. Wyników historycznych nie dodano do nowych PASS.

## Stan poczty zgłoszony przez właściciela

02.11.2026 właściciel potwierdził, że wysyłka i odbiór działają oraz wymagane porty są odblokowane. Potwierdzenie przyjęto jako stan usługi (OWNER_REPORTED). Wcześniejszy zakres audytu nie obejmował niezależnej korelacji tych operacji z konkretną rewizją/artefaktem; jest to historyczna granica pochodzenia dowodów. Aktualny stan usługi przyjęto zgodnie z potwierdzeniem właściciela. Zgodnie z poleceniem nie będą wykonywane dalsze testy wysyłki, kont, IMAP/SMTP ani portów. Nie odczytywano credentials ani skrzynek.

## Bezpieczeństwo i ograniczenia

Istniejący skrypt `infra/scripts/check-secrets.sh` wykonano ponownie: PASS. To skan regex/źródeł respektujący reguły ignorowania `rg`, bez pełnego skanu historii i bez deklaracji pełnego SAST. Spis zależności zawiera 64 współrzędne NuGet z istniejących lock/assets i 27 bezpośrednich Maven z katalogu wersji. Po sporządzeniu inwentarza wykonano świeże zapytanie OSV: 91 zapytań, 91 odpowiedzi, 0 dopasowań advisory (2026-11-02; `fresh-advisory-query.json`). Wysłano wyłącznie nazwy i wersje pakietów, bez źródeł i danych kont. To częściowa ocena konkretnego inwentarza, bez deklaracji pełnego SCA PASS: pełny graf przechodni Androida i biblioteki systemowe nie zostały w ten sposób ocenione.

Świeży SAST wykonano narzędziem Semgrep Community Edition 1.183.0 (OSS), lokalnie i offline, na 258 kopiach plików kodu/markup. Skonfigurowano 581 reguł security z oficjalnego repozytorium Semgrep/community; scanner raportuje 548 faktycznie wykonanych. Wynik: 14 findings (13 ERROR, 1 INFO), 26 ostrzeżeń PartialParsing (25 plików C#, 1 shell), exit 1 przy --error/--strict. Status: PARTIAL_EXECUTED_WITH_FINDINGS_AND_PARSER_LIMITS; bez pełnego SAST PASS. Nie wyciszano reguł ani findings.

Triage statyczny: 11 ostrzeżeń subprocess dotyczy owner/build/QA tooling z argv-listami i bez shell=True; zachowano granicę zaufania do lokalnych narzędzi/argumentów, bez potwierdzonego zdalnego command injection. Dwa wskazania XML dotyczą parsowania lokalnych metadanych NuGet podczas pakowania i pozostają OPEN_PACKAGING_HARDENING_REVIEW. INFO GCM wskazuje odczyt IV podczas deszyfracji; szyfrowanie otrzymuje IV od providera i wymaga randomized encryption, więc to wskazanie nie dowodzi ponownego użycia nonce. Ograniczenia parsera i intrafile CE uniemożliwiają deklarację pełnego pokrycia C# i cross-file. Pełny sanitized wynik: fresh-sast.json.

Skan korzystał z niezmienionych vendor rules w /tmp, z metrics OFF, version check OFF, bez tokenów i z prywatnym settings/cache/config. Nie wysyłano źródeł. .env, appsettings, google-services, klucze, DB, logi i artefakty nie były kopiowane; wszystkie 258 hashów źródeł po skanie pozostają zgodne. Surowy output ze snippetami pozostał wyłącznie w /tmp; raport zawiera rule ID, ścieżki i linie, bez snippetów/metavariables. Nie wykonywano żadnego helpera projektu ani testów kont/usług/portów.

Nie zaobserwowano istniejącego lokalnego serwera ADB; nie uruchamiano nowego demona ani nie generowano kluczy hosta. Nie było izolowanego Xvfb; nie użyto osobistego ekranu/profilu. GUI Linux, fizyczny Android i natywny Windows pozostają NOT RUN. Test keyringu w izolacji nie jest odbiorem keyringu osobistej sesji pulpitu.

W aktualnym kodzie API `server/src/ProgressKit.Mail.Api/Program.cs:120–122` nadal rejestrowane są `UnavailableMailboxPasswordChangeProvider`, `UnavailableDistributedPasswordChangeThrottle` i `UnavailablePasswordChangeAvailability`. Nie należy oferować operacyjnej zmiany hasła na podstawie samej obecności endpointu. Gmail OAuth wymaga odrębnie poprawnej konfiguracji klienta/zgód i rzeczywistego odbioru; nie jest potwierdzony przez ten audyt.

## Proponowany zakres pierwszej oferty

Propozycją jest ograniczony, wspierany pilotaż konkretnego, wskazanego numerem wersji i hashem klienta Linux. Warunki dotyczą jego GUI, instalacji/upgrade/restartu, chronionego stanu lokalnego, bezpiecznej dystrybucji, aktualizacji, wsparcia i formalnego zakresu oferty. Stan usługi pocztowej przyjęto od właściciela; oferta nie jest warunkowana powtórką ogólnego SMTP ani utworzeniem nowego konta w tym zadaniu. To propozycja warunkowa, bez zatwierdzenia publikacji dzisiaj. Należy jawnie określić wspieranych dostawców i platformy oraz nie obiecywać nieodebranego WPF, Gmail OAuth ani hostingu/SLA. Osobne kwestie hostingu to backup/restore, monitoring, retencja, incydenty i odpowiedzialność.

### Pytania formalne przed ofertą

Poniższe źródła urzędowe służą jako lista zagadnień do przeglądu, bez certyfikacji zgodności prawnej. DATA_SOURCE_FOUND: istniejący lokalny dokument legal Lud&Pra zawiera nazwę operatora, adres i kontakt; `published=false`. Właściciel wskazał te same dane do lokalnego użycia. Aktualność danych, finalna publikacja i właściwy zakres jurysdykcji DE pozostają oddzielnym odbiorem; nie wywodzimy z tego rejestracji ani zgodności prawnej. Wartości adresowe nie są kopiowane do tego raportu.

- Kto formalnie sprzedaje/świadczy usługę i jakie dane identyfikacyjne, adres oraz kontakt trzeba podać? [UOKiK — prawo do informacji](https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/), [Biznes.gov.pl — sprzedaż przez Internet](https://biznes.gov.pl/pl/portal/00146).
- Kto jest administratorem danych, jakie są cele/podstawy, okres lub kryteria retencji oraz właściwe prawa użytkownika? [UODO — okres retencji](https://uodo.gov.pl/pl/676/4260), [UODO — obowiązek informacyjny](https://uodo.gov.pl/pl/493/2254).
- Jakie są licencja produktu, uprawnienia do dystrybucji, warunki rozliczeń/reklamacji oraz zakres wsparcia? Dostępne `THIRD-PARTY-NOTICES` nie stanowią licencji produktu ani pełnego przeglądu praw do komercjalizacji.

## Pliki dowodowe

- `fresh-tests.json`, `tests/`: nowe wykonania wcześniej zbudowanych DLL.
- `fresh-native-tests.json`, `native-tests/`: osobne testy izolowanego transportu i usług natywnych.
- `pdb-source-freshness.json`: hashe dokumentów kompilacji i zakres brakujących generatorów.
- `artifact-inspection.json`, `android-signatures.json`: rozmiary, SHA-256, metadane i podpisy istniejących paczek.
- `secret-scan.json`: nowy wynik istniejącego skanu regex, bez wypisywania zawartości sekretów.
- `fresh-sast.json`: świeży Semgrep CE, sanitized findings/triage i ograniczenia parsera; `sast-source-snapshot.json`, `sast-vendor-rules.json`, `sast-availability.json`: zakres, hashe, vendor rules i dostępność narzędzia.
- `dependency-inventory.json`: pierwotny inwentarz 91 współrzędnych; `fresh-advisory-query.json`: osobne późniejsze zapytanie OSV związane SHA-256 z tym inwentarzem.
- `device-availability.json`: granice dostępnego środowiska.
- `operator-source-observation.json`: obecność pól istniejącego dokumentu operatora, bez kopiowania wartości prywatnych.
- `readiness-matrix.json`: ustrukturyzowane statusy, bramki i warunkowy zakres oferty.

**Bez zmian produkcyjnych, prawdziwej korespondencji/kont, osobistego keyringu/profilu, instalacji sudo i migracji backendu. Bez zmian źródeł repo Mail.**
