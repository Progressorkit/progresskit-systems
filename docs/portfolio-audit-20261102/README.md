# Audyt portfolio ProgressKit Systems — 2026-11-02

Katalog V2 obejmuje **19 przedsięwzięć, 159 opisanych funkcji, 260 identyfikowalnych źródeł i 101 rekordów weryfikacji**. Zachowano wszystkie 14 dotychczasowych identyfikatorów i dodano pięć pozycji. Rekord weryfikacji może opisywać odczyt kodu, wynik historyczny, test albo niewykonaną bramkę; liczba 101 nie oznacza 101 nowych testów zakończonych PASS.

To raport aktualizacji lokalnego kandydata portfolio. **Końcowy browser QA po ostatnich poprawkach przechodzi:152/152 wizyt case w Chrome/Firefox przy360/390/768/1440px,bez FAIL/BLOCKED. ownerVisualApproval OPEN. Brak zatwierdzenia publikacji, commita i pushu.** Ocena możliwości pokazania projektu w portfolio nie jest zgodą na komercyjne wydanie produktu.

## Zakres i tożsamość źródeł

Źródłem stron jest [catalog/projects.json](../../catalog/projects.json), `schemaVersion: 2`, `asOf: 2026-11-02`. Przeczytano właściwe lokalne checkouty, kod, dokumentację, historię Git dostępną dla danego repozytorium, raporty i istniejące artefakty. Prywatne JSON-y zachowują ścieżki, linie, rewizje, hashe i ograniczenia źródeł. Publiczny katalog używa ogólnych etykiet i opisów zakresu, bez lokalnych ścieżek, danych kont, adresów infrastruktury i szczegółowych ustaleń bezpieczeństwa.

Część checkoutów ma niezacommitowane lub nieśledzone źródła. Sam HEAD nie odtwarza wtedy audytowanego produktu; takie źródła oznaczono jako rewizja **plus lokalne zmiany robocze**, a dokładne bajty wiążą prywatne manifesty/PDB tam, gdzie były dostępne. Pustego katalogu `.git` Notes i braku repozytorium Vault Key nie zastąpiono wymyślonym commitem. Odczyt kodu 02.11 nie przenosi daty ani statusu starych testów na dzisiejszy stan.

Podstawowy audyt nie obejmował nowych logowań do kont użytkowników, odczytu skrzynek, instalacji produktów, zmian produkcyjnych, migracji ani sterowania urządzeniami. Oddzielnie udokumentowano późniejsze lokalne wykonania gotowych bibliotek Mail oraz izolowany start rzeczywistej dokumentacji API Adivara. Ich zakres nie zatwierdza działania całych produktów.

## Rozliczenie katalogu i aliasów

| Klasyfikacja V2 | Liczba | Znaczenie |
|---|---:|---|
| `product` | 10 | Samodzielne produkty na różnych etapach implementacji i odbioru. |
| `realization` | 2 | Konkretne realizacje WWW: Ignira i Obserwator. |
| `historical` | 1 | KAN SYSTEM, zachowany bez niepotwierdzonego zakresu aplikacji. |
| `internal_tool` | 3 | Analytics, Reel Agent i badawczy Vault Key. |
| `infrastructure` | 2 | Zaplecze ProgressKit i integracja Remote. |
| `concept` | 1 | OffGrid; założenia bez potwierdzonej implementacji. |
| **Razem** | **19** | **Nie jest to liczba gotowych produktów komercyjnych.** |

Zachowane identyfikatory: `glikemia-premium`, `progresskit-mail`, `progresskit-translator`, `vaeloria`, `progresskit-community`, `progresskit-tax`, `adivara`, `gotrans360`, `ignira`, `obserwator`, `kan-system`, `progresskit-systems`, `progresskit-analytics`, `progresskit-infrastructure`.

Dodane identyfikatory: `progresskit-notes`, `progresskit-offgrid`, `reel-agent`, `progresskit-remote`, `progresskit-vault-key`. Ostatni jest dodatkowo odnalezionym demonstratorem R&D, a nie produkcyjnym magazynem danych.

- Lud&Pra i ProgressKit Community to jeden produkt; platformy Mail również pozostają jednym produktem.
- GoTransport360 / Transport360 to GoTrans360; Maria-Salon to Ignira; RWR / KAN to KAN SYSTEM.
- Obserwator, nazwa autora i Lejek Sprzedażowy wskazują jedną potwierdzoną realizację. Nie tworzą kilku platform.
- `ProgressKit Reel Agent` i `PROGRESSKIT REEL AGENT` wskazują ten sam checkout przez alias systemu plików.
- `ProgressKit Remote` i `progresskit remote` są **odrębnymi checkoutami jednej inicjatywy**. Ich raporty mają różne daty i zakresy; nie połączono ich w jeden fikcyjny odbiór. Silnik natywnego pulpitu jest upstreamowym Aspia, nie autorskim silnikiem ProgressKit.
- Showroom jest częścią Systems. Analytics i zaplecze nie stają się osobnymi usługami SaaS przez obecność kodu lub konfiguracji.
- P.A. Barczewska pozostaje nierozstrzygniętym tropem. Ograniczony przegląd źródeł nie dał podstaw do dodania realizacji.

## Stan każdego przedsięwzięcia

W kolumnie „Funkcje” podano liczbę pozycji katalogowych, nie liczbę testów ani kompletnych modułów. Każda z 159 pozycji ma niepuste odwołania `featureSources` do istniejących źródeł. Funkcje planowane nie zwiększają tej sumy.

| Projekt / klasa / funkcje | Platformy i potwierdzony zakres | Aktualna bramka |
|---|---|---|
| **Glikemia Premium** — product, 9 | Android / MAUI: lokalny dziennik SQLite, historia, filtry, wykres, jednostki, PDF i przypomnienia. Istnieje podpisany APK 1.0; źródłowy plik i lokalna kopia dystrybucyjna mają tę samą sumę SHA-256. | Historyczne testy i dostępny APK nie zamykają końcowego mobile Release Gate, nowej instalacji/aktualizacji, backupu ani dystrybucji Play. Brak backendu danych zdrowotnych. |
| **ProgressKit Mail** — product, 14 | Android Kotlin/Room/Keystore, Linux Avalonia, Windows WPF, wspólny Core/MailKit oraz backend .NET/PostgreSQL. IMAP/SMTP, MIME, foldery, szkice, załączniki i zabezpieczenia mają różne zakresy odbioru na platformach. | Świeże testy bibliotek i izolowanych usług opisano niżej. Linux wymaga GUI i instalacji/upgrade; WPF wymaga Windows 11; Android wymaga podpisanego Release i odbioru fizycznego. Gmail OAuth i operacyjna zmiana hasła nie są zatwierdzone. Pełne wydanie komercyjne NOT RELEASE APPROVED. |
| **ProgressKit Translator** — product, 8 | Android Kotlin/Compose: ASR, lokalny przekład ML Kit, TTS/PCM, historia i kontrolowany foreground service. Istnieje lokalny Debug 0.2.2 z historyczną aktualizacją Redmi bez kasowania danych. | Pełny przepływ offline PL–DE, fizyczne słuchawki/stereo, opóźnienia i cykl życia audio pozostają otwarte. Dostępny model rozpoznawania lub emulator nie dowodzi pełnego fizycznego E2E. |
| **Vaeloria** — product, 14 | Godot/.NET: grywalna eksploracja 3D, rzeczywisty silnik walki turowej, 10 rywali AI / 6 strategii, 3 wędrujących NPC, turniej z 8 AI i 25 kamiennych kryształów. Desktop Linux, preview Android/Windows i osobne WWW/API. | Istnieją historyczne testy domeny, Godota i fizycznego Androida, przypisane do konkretnych artefaktów. Nowy APK nie dziedziczy odbioru starego; Windows pozostaje bez fizycznego odbioru. Finalna gra, publiczne PvP i pełna bramka wydajności nie są zatwierdzone. |
| **ProgressKit Community / Lud&Pra** — product, 12 | Responsywne WWW Next/React oraz .NET/PostgreSQL: społeczności, dołączanie/zaproszenia, publikacje, komentarze, media, wyszukiwanie i moderacja z odwołaniami. Historyczne raporty backend/frontend/browser mają jawne zakresy. | Ostatni raport pozostawia publiczną betę BLOCKED. Odbiór organizacyjny, publikacja dokumentów i aktualny zdalny runtime są otwarte. Wskazanie danych operatora do lokalnego kandydata nie zatwierdza bety. |
| **ProgressKit Tax** — product, 18 | .NET API, WWW i Android: organizacje/uprawnienia, sprawy i workflow, dokumenty, plan kont, dziennik, korekty/storno, KPiR/ryczałt, raporty i zamknięcia okresów. | Historyczne pełne i celowane testy są osobnymi seriami; pojedynczy udany retry nie zastępuje powtórzenia pełnego zestawu. Otwarty gate bezpieczeństwa, odbiór księgowy, produkcja i Android Release. Integracji urzędowego składania KSeF/JPK nie przedstawiono jako działającej. |
| **Adivara** — product, 9 | Backend .NET/EF/PostgreSQL: organizacje, role, dostęp opiekunów/rodziny i centralny zakres dostępu do pacjenta. Rzeczywista dokumentacja Swagger/OpenAPI uruchomiona lokalnie z istniejącej DLL bez DB i kont. | GET 200 dokumentacji nie jest odbiorem operacyjnego API. Brakuje kompletnego interfejsu użytkowego, ponownego gate backendu i potwierdzonej produkcji. WWW/Android/iOS pozostają bez kompletnej implementacji klienta. |
| **GoTrans360** — product, 6 | Lokalny fundament MVP: WWW dyspozytora/pasażera, API, heurystyka planowania tras i adapter routingu. Historycznie przechodziły wybrane buildy/typechecki/testy. | Całościowy build i integracja front–API miały luki; E2E nie wykonano. Formularza nie uznano za zamkniętą rezerwację, a demonstracyjnych map za produkcyjne GPS/płatności. Wdrożenie niepotwierdzone. |
| **Ignira** — realization, 5 | Statyczna witryna salonu HTML/CSS/JS: oferta, rzeczywista galeria, lokalne przygotowanie/kopiowanie wiadomości i linki kontaktowe. Nowy `node --check` potwierdza składnię JS. | Bieżący publiczny runtime i konfiguracja odbiorcy wiadomości pozostają do potwierdzenia. Formularz nie jest backendowym systemem rezerwacji. |
| **Obserwator** — realization, 3 | Jeden serwis autorski HTML/CSS/JS z archiwum, podstronami i odsyłaczami do materiałów/formularzy. Aktualny zdalny HEAD źródeł odczytano niezależnie. | GitHub HEAD potwierdza kod, nie działanie zewnętrznych formularzy, zakupu ani aktualnego wdrożenia. Nie ma podstaw do deklaracji osobnej platformy czy mierzalnej skuteczności lejka. |
| **KAN SYSTEM** — historical, 0 | Potwierdzona historyczna tożsamość i zmiana nazwy z RWR. Brak odnalezionego zakresu kodu aplikacji wystarczającego do opisania funkcji lub technologii. | Zachowany jako realizacja historyczna. Kod, build, testy i aktualny runtime wymagają źródeł. Usunięto nieudokumentowane wyniki procentowe; brak sztucznej galerii. |
| **ProgressKit Systems** — product, 15 | Statycznie generowane portfolio V2, filtry, case studies, Three.js/WebGL2 showroom z kryształami, fallback HTML, lifecycle/reduced motion, Usługi, Proces i brief do TXT/mailto. WWW desktop/mobile. | Bieżący kandydat wymaga końcowej regresji Chrome/Firefox i odbioru wizualnego po ostatnich poprawkach. Historyczne FPS i stare screeny nie są nowym pomiarem. Brak zgody na publikację. |
| **ProgressKit Analytics** — internal_tool, 11 | Własny backend FastAPI/SQLite, ograniczone zdarzenia, DNT, agregacja, licznik zakończonych pobrań i moderowane opinie/panel operatora. | Aktualnego produkcyjnego przepływu i retencji nie odebrano. Licznik pobrań nie oznacza liczby użytkowników ani instalacji. Nie jest to potwierdzony komercyjny SaaS. |
| **Zaplecze ProgressKit** — infrastructure, 8 | Lokalne przygotowanie artefaktów, jawny allowlist stagingu, manifesty SHA-256, procedury wydania, CI z bramką właściciela oraz instrukcje backupu/rollbacku. | Istnienie konfiguracji i runbooka nie dowodzi nowego wdrożenia, działającego monitoringu ani wykonanego restore. W tym audycie nie wykonywano operacji serwerowych. |
| **ProgressKit Notes** — product, 8 | Desktop .NET/Avalonia: historia i kursy, import/eksport TXT, kod rejestrowania WASAPI z pauzą/segmentami/odzyskiem, adaptery lokalnego Whisper/llama i procedury pakowania. Linux służył testom komponentów, celem produktu jest Windows. | Późniejszy historyczny Rebuild z 30.10 ma 0 błędów i 22 ostrzeżenia CA1416; zastępuje starszą informację o blokadzie builda. Nie zastępuje odbioru Windows GUI/WASAPI, modeli/inferencji ani gotowego ZIP/EXE. Starszego „32 testy” nie przedstawiono jako aktualnego łącznego wyniku. |
| **ProgressKit OffGrid** — concept, 0 | Założenia komunikacji offline, bez potwierdzonego kodu, prototypu, APK ani próby fizycznej w zbadanych źródłach. | Bluetooth/Wi-Fi Direct, mesh, store-and-forward, szyfrowanie, PTT i SOS są planami. Można pokazać koncepcję z jawną etykietą; nie można demonstrować gotowych funkcji. |
| **ProgressKit Reel Agent** — internal_tool, 8 | Lokalny pipeline Python/FastAPI/SQLite, Ollama/Qwen, walidacja planu, Piper, napisy i FFmpeg. Istnieje raport prawdziwego E2E oraz plik 15 s / 1080×1920 / 30 FPS, którego metadane i hash sprawdzono. | Ponowna inspekcja pliku nie jest nowym E2E. Prawa komercyjne użytego głosu Piper pozostają niewyjaśnione: publikacja tego filmu/audio BLOCKED. Brak publicznej usługi generatora. |
| **ProgressKit Remote** — infrastructure, 7 | Integracja natywnego upstream Aspia: próbne pakiety klienta/Hosta, konfiguracja, ograniczenia polityk i historyczne Router/Relay. Linux, Windows i zaplecze serwerowe mają osobne dowody. | Testy polityk i syntetycznego helpera nie dowodzą sterowania pulpitem. Zmodyfikowany Host Windows i rzeczywiste E2E Windows↔Linux nieodebrane; gotowy bezpieczny pakiet użytkownika BLOCKED. |
| **ProgressKit Vault Key** — internal_tool, 4 | Badawczy demonstrator Android Kotlin/Keystore/BiometricPrompt oraz klient Linux Python/OpenSSL. Istnieje Debug APK i kod podpisywania/weryfikacji challenge-response. | Brak odnalezionego fizycznego odbioru biometrii i scenariuszy negatywnych. Developerskie ADB nie jest zaufanym parowaniem. Brak podstaw do przedstawiania tego jako produkcyjnego Vault, transportu Bluetooth lub odblokowywania dokumentów. |

## Nowe dowody Mail i ich granice

Pełne źródło: [preflight komercyjny Mail](../mail-commercial-preflight-20261102/README.md). Istniejące biblioteki Release wykonano 02.11 w izolowanych katalogach, bez nowego rebuilda/restore, instalacji, migracji ani prawdziwego konta. Powiązanie PDB obejmuje 372 zgodne rekordy dokumentów / 233 unikalne dostępne pliki; pięć wirtualnych plików generatorów nie było dostępnych na dysku. Artefakty dystrybucji są wcześniejsze od części zmian źródeł i nie są utożsamiane z wykonanymi DLL.

| Wykonany zestaw | PASS | FAIL | Niewykonane |
|---|---:|---:|---:|
| Core | 271 | 0 | 14 |
| Linux | 106 | 0 | 4 |
| Linux security | 40 | 0 | 1 |
| Server bez PostgreSQL | 190 | 0 | 11 |
| **Razem dla tych czterech uruchomień** | **607** | **0** | **30** |

Oddzielnie wykonano **22 izolowane scenariusze natywne PASS**: 14 transportu TLS, 4 powiadomień na prywatnym D-Bus oraz jeden test keyringu w czterech trybach. Częściowo pokrywają one kategorie niewykonane w tabeli. Nie należy reklamować tego jako „629 różnych testów” ani zmieniać pierwotnych liczników TRX. 11 prób PostgreSQL pozostaje niewykonanych. Prywatny keyring i zaufanie CA ograniczone do procesu nie są odbiorem osobistej sesji pulpitu ani prawdziwego serwera poczty.

Świeże [zapytanie OSV](../mail-commercial-preflight-20261102/fresh-advisory-query.json) objęło **91 nazw i wersji pakietów, 91 odpowiedzi i 0 dopasowanych advisory**. Inwentarz to 64 współrzędne NuGet i 27 bezpośrednich deklaracji Maven; nie obejmuje całego przechodniego grafu Androida ani bibliotek systemowych. Nie jest to pełny SCA PASS ani zapewnienie braku podatności. Oddzielny ponowiony istniejący skan regex sekretów ma PASS w swoim zakresie, bez pełnego skanu historii/SAST.

Właściciel 02.11 potwierdził działającą wysyłkę/odbiór i zakończył dalsze testy kont, IMAP/SMTP i portów. Pochodzenie to **OWNER_REPORTED**, bez nowego niezależnego PASS, odczytu credentials lub korelacji wdrożonej wersji przez ten audyt. Polecenie wstrzymania dalszych testów pozostaje wiążące. Hosting poczty, wsparcie/SLA, backup/restore, dystrybucja i formalny zakres oferty wymagają osobnego odbioru; nie wynikają z testów klienta.

## Co można rzetelnie prezentować

Treść wszystkich 19 pozycji nadaje się do przeglądu właściciela w roli zgodnej z klasyfikacją: działający zakres kodu, prototyp, konkretna realizacja, narzędzie wewnętrzne, infrastruktura, koncepcja albo historia. Żadnego produktu nie podniesiono zbiorczo do produkcyjnego PASS. Podstrona, technologia w repozytorium i istniejący pakiet są odrębnymi rodzajami dowodu.

- Glikemia, Mail, Translator, Vaeloria, Community, Tax i Notes mają konkretny zakres implementacji do pokazania z ograniczeniami platform. Materiały muszą przejść osobną ocenę prywatności i odpowiadać rzeczywistemu artefaktowi.
- Adivara może być przedstawiona przez prawdziwe API i widok dokumentacji, wyraźnie tak podpisany. Nie ma zgody na udawanie gotowego operacyjnego panelu opieki.
- GoTrans360 należy prezentować jako fundament MVP. Ignira i Obserwator jako konkretne realizacje WWW, bez niepotwierdzonych wyników biznesowych i gwarancji aktualnego publicznego działania.
- Systems, Analytics, zaplecze, Reel Agent, Remote i Vault Key można pokazać zgodnie z ich faktyczną rolą oraz gate. Lokalny MP4 Reel z niezweryfikowanymi prawami do głosu pozostaje poza publikacją.
- OffGrid wymaga implementacji i dowodów, zanim otrzyma funkcje lub ekran produktu. KAN wymaga źródeł, zanim otrzyma aktualny zakres techniczny. Obie pozycje zachowują pustą listę funkcji.

Zachowano istniejące bezpieczne URL-e i galerie; nie dodano fikcyjnych ekranów ani cudzych materiałów jako dowodu produktu. Galeria WWW Mail nie jest automatycznie zgodą na użycie jej w reklamie. Prawa do reklamowego użycia autentycznego gameplayu Vaelorii właściciel potwierdził 02.11; to odrębna zgoda od otwartych praw do głosu Piper. Dane zdrowotne, pacjentów, klientów, korespondencja i dane kont nie mogą pojawiać się w materiałach.

## Walidacja i prace pozostałe

[Schema V2](schema-v2.md) rozdziela `functionalStatus`, `distributionStatus` i `productionStatus`, a dla każdej platformy implementację, weryfikację, dystrybucję i ograniczenia. Każdy wynik ma własną datę, rewizję, środowisko, zakres oraz status PASS / FAIL / BLOCKED / NOT RUN. Nieznana data pozostaje `null` wyłącznie dla wyniku historycznego. Data przeglądu 02.11 nie jest datą wykonania wszystkich testów.

[Niezależny przegląd V2](independent-v2-review.md) sprawdził m.in. escapowanie, granice typów i staging; 160 celowanych mutacji nie wywołało nieobsłużonego wyjątku. Nie jest to pełny security gate ani browser QA. Zgłoszone korekty dotyczące identyfikacji dirty source Mail, prywatności opisów Tax, nieznanego licznika Vaelorii i redakcji zostały uwzględnione w aktualnym odczycie katalogu. Przegląd odnosi się do własnego zapisanego snapshotu; nie zastępuje odbioru późniejszego buildu.

Istnieją zapisane końcowe wyniki testów Python i Node oraz [statycznego QA](../final-website-qa-20261102/static-final/report.json). Wcześniejsze nieudane próby zachowano w [historii walidacji](validation-attempts.json). **Końcowa macierz Chrome/Firefox przechodzi152/152 wizyt na stabilnych65 plikach źródeł**. Zweryfikowano responsywność,interakcje,reduced motion i WebGL fallback. [Końcowy raport i screenshoty](../final-website-qa-20261102/README.md) zachowują osobno automatyczny PASS i otwarty odbiór wizualny właściciela.

Przed publikacją pozostają:

1. Odbiór właściciela po zamkniętym lokalnym QA; dokładne źródła i85-plikowy artefakt są wskazane w raporcie końcowym.
2. Owner visual approval; utrzymanie otwartych gate produktów i praw do poszczególnych mediów.
3. Weryfikacja publicznych adresów, których runtime nie był dostępny z obecnego środowiska; świeży odczyt GitHub HEAD nie zamyka tej bramki.
4. Finalny odbiór danych operatora, jurysdykcji, celów/podstaw przetwarzania, retencji, praw użytkownika i zakresu oferty. Właściciel wskazał istniejące dane Lud&Pra do użycia w **lokalnym kandydacie**; nie wywodzi się z tego rejestracji, zgodności prawnej ani zgody na publikację. Prywatne dane adresowe pozostają poza tym raportem.
5. Osobne czynności publikacyjne dopiero w późniejszym autoryzowanym kroku. Ten audyt nie obejmuje commita, pushu ani wdrożenia.

## Mapa prywatnych dowodów i propozycji

| Plik | Zakres |
|---|---|
| [mobile-mail.json](mobile-mail.json) | Glikemia, Mail i Translator: kod, platformy, historyczne urządzenia/buildy i ograniczenia. Późniejszy preflight Mail jest osobnym świeżym źródłem. |
| [saas-platforms.json](saas-platforms.json) | Community, Tax i Adivara: funkcje, architektura, raporty i gate. |
| [discovery.json](discovery.json) | Notes, OffGrid, Reel, Remote, dodatkowy Vault Key, rozliczenie kandydatów i aliasów. |
| [vaeloria.json](vaeloria.json) | Mechaniki potwierdzone kodem, liczby AI/kryształów, platformy i historyczne serie testów. |
| [systems-internal.json](systems-internal.json) | Systems, Analytics i infrastruktura; konfiguracja oddzielona od produkcji. |
| [web-historical.json](web-historical.json) | GoTrans360, Ignira, Obserwator i KAN; źródła WWW oraz granice historii. |
| [adivara-docs-only-runtime.json](adivara-docs-only-runtime.json) | Izolowany start dokumentacji realnego API, bez DB/kont i bez deklaracji działającego panelu. |
| [adivara-pdb-source-freshness.json](adivara-pdb-source-freshness.json) | Powiązanie gotowej biblioteki z dostępnymi źródłami, bez udawania rebuilda. |
| [content-proposals.json](content-proposals.json) | Pierwotne „obecny tekst → propozycja → powód”, prywatne wskazania źródeł i snapshot wejściowych 14 rekordów. |
| [final-content-proposals.json](final-content-proposals.json) | Końcowe porównanie treści i klasyfikacji dla 19 pozycji. |
| [projects-v2-draft.json](projects-v2-draft.json) | Zachowany draft do review: 19 pozycji / 159 funkcji / **96** weryfikacji. Nie jest już źródłem finalnych liczników. |
| [schema-v2.md](schema-v2.md) | Reguły modelu, dat, źródeł, platform i publicznej redakcji. |
| [independent-v2-review.json](independent-v2-review.json) | Timestamp, hashe przeglądanego snapshotu i zakres niezależnej sondy. |
| [git-before.txt](git-before.txt), [worktree-before.json](worktree-before.json) | Stan i wybrane hashe zastanej pracy; wcześniejsze zmiany nie stają się automatycznie autorstwem audytu. |
| [Mail — świeży preflight](../mail-commercial-preflight-20261102/README.md) | 607 PASS / 30 niewykonanych, oddzielne 22 natywne wykonania, PDB, paczki, podpisy, częściowy OSV i gotowość oferty. |
| [formal-gates.json](../final-website-qa-20261102/formal-gates.json), [operator-proposal.json](../final-website-qa-20261102/operator-proposal.json) | Otwarte fakty formalne i lokalne źródło danych operatora, bez automatycznej publikacji. |

Finalny katalog ma **101**, a nie 96 rekordów weryfikacji: później dodano pięć świeżych wpisów Mail. W całym katalogu nadal pozostaje 19 tożsamości i 159 funkcji. Raporty audytu i materiały marketingowe są prywatnymi artefaktami pracy, wyłączonymi z publicznego stagingu WWW przez jawną listę dopuszczonych plików.
