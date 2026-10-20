# V5 — dowody: platforma społecznościowa i systemy SaaS

Data audytu źródeł: **2026-10-15**, strefa Europe/Warsaw. Zakres: odczyt czterech repozytoriów, ich aktualnego kodu, manifestów, historii Git i zapisanych raportów. Dane do połączenia z katalogiem: `/tmp/v5-saas.json` (4 projekty, 6 przypadków inżynieryjnych).

**Wyniki testów produktów w tym dokumencie są historycznymi wynikami zapisanymi w repozytoriach. W sprincie portfolio nie uruchamiano ich ponownie.** Nie uruchamiano aplikacji, baz, migracji, urządzeń Android ani operacji produkcyjnych. Nie zmieniano repozytoriów produktowych. Status publicznej dostępności pozostaje konserwatywny.

## Tożsamość źródeł i stan Git

Wszystkie cztery checkouty znajdują się pod wspólnym katalogiem `Projekty It`; nie używano sąsiednich kopii pod `zipy` ani starszego checkoutu GoTrans360 bez członu `Projekty It`.

| Projekt | Właściwy katalog źródła | Odczytany HEAD | Data HEAD | Stan przed i po audycie |
|---|---|---|---|---|
| Community | `progresskit-community` | `c64296e0dfd67182ec368a00432b4c2ea3b36968` | 2026-10-15 | Zachowane zastane nieśledzone `assets/`, `docs/bootstrap/`, `docs/evidence/` i trzy skrypty inicjalizacji/publikacji |
| Tax | `progresskit-tax` | `d56da266d0d5237d4b8edf6254b08a93ca6ac4db` | 2026-10-11 | Czysty |
| Adivara | `Adivara` | `17bc746dd93f872b62cbd42694d4dfe99f3f72c4` | 2026-08-27 | Czysty |
| GoTrans360 | `GoTrans360/gotransport360` | `27cf7155683fba95ff321334a80839e5a9995d58` | 2026-08-27 | Zachowane zastane usunięcie `CLAUDE.md` |

Pole `updatedAt` katalogu oznacza datę ostatniej potwierdzonej zmiany źródła, a nie datę ponownego testowania funkcjonalności. Dlatego Community ma datę 2026-10-15, pozostałe produkty datę własnego HEAD.

Przeczytano reguły `AGENTS.md` Community, frontendowe Community, Adivara i GoTrans360. W Tax nie znaleziono `AGENTS.md`. Dla Community przeczytano wymagane `docs/ARCHITECTURE.md` i `docs/DOMAIN.md` przed analizą kodu. Ograniczenie Adivara dotyczące trwałego śladu i niezmieniania historycznego verdictu zachowano; nie wykonywano ponownego Security Gate.

## Nazwy i brak duplikatów

- **Lud&Pra / ProgressKit Community:** jedno repozytorium i jeden produkt. `progresskit-community/docs/LUDPRA_V2_REVIEW_2026-10-14.md:1` oraz `docs/PUBLIC_BETA_CLOSURE_2026-10-10.md:1` używają nazwy Lud&Pra, a `docs/ARCHITECTURE.md:1` nazwy ProgressKit Community. Nie powstaje drugi rekord produktu.
- **GoTransport360 / GoTrans360:** zakres dostarczony przez właściciela podaje obie nazwy w sekcji 8 briefu V5 (wiersz 406 załącznika). Kod `GoTrans360/gotransport360/apps/web-dispatcher/src/app/page.tsx:48` i `apps/web-passenger/src/app/page.tsx:16` identyfikuje produkt jako GoTrans360. Rekord ma tę potwierdzoną nazwę; GoTransport360 jest aliasem z briefu, nie drugim systemem. Nazwa Transport360 występuje w nagłówkach dokumentacji i przestrzeni nazw pakietów.

## Community — zakres potwierdzonej implementacji

Rewizja odczytanego kodu: `c64296e0dfd67182ec368a00432b4c2ea3b36968`.

- Architektura: `docs/ARCHITECTURE.md:19` (Next.js i przepływ przez API), `:46` (.NET i modułowy monolit), `:79` (PostgreSQL i EF Core). Fakty technologiczne dodatkowo potwierdzają `src/web/package.json:13` i pliki projektów .NET. Opis architektury nie jest samodzielnym dowodem działania każdej wymienionej w nim funkcji.
- Widoczność społeczności i model członkostwa: `docs/DOMAIN.md:39` i `:58`; aktualny odczyt discovery używa istniejących granic odczytu w `src/api/Content/DiscoveryEndpoints.cs:38`.
- Wyszukiwanie społeczności/tagów/treści: `src/api/Content/DiscoveryEndpoints.cs:20`, `:42`, `:55` i `:86`; podpięcie endpointu: `src/api/Content/ContentEndpoints.cs:17`.
- Publikacje i komentarze: `src/api/Content/ContentEndpoints.cs:20` oraz `:27`. Agregaty rozmów pochodzą z kodu `:541`–`:579`, a nie ze statycznych liczników.
- Zgłoszenia, decyzje i odwołania: `src/api/Moderation/ModerationEndpoints.cs:15`–`:29`. W publicznym katalogu nie opisuje się szczegółowych granic uprawnień ani sposobów ich testowego obchodzenia.
- Automatyzacja botów istnieje jako kontrolowany mechanizm: `src/api/Automation/BotWelcomeWorker.cs:5`–`:27`. Sam ten kod nie potwierdza autonomicznych botów AI aktywnych na produkcji; nie publikowano takiego twierdzenia.
- Sesje, feed V2 i PL/EN/DE: `docs/LUDPRA_V2_REVIEW_2026-10-14.md:35`–`:68`.

### Przypadek C1 — zbiorcze odkrywanie tematów i rozmów

**Problem:** dotychczasowe listy społeczności, tagów i feed nie dawały jednego odczytu potrzebnego dla nowego discovery.

**Diagnoza / root cause:** `docs/COMMUNITY_DISCOVERY_VALIDATION.md:15`–`:20` opisuje osobne endpointy i komentarze pobierane per post. Była to potrzeba nowego kontraktu, nie udokumentowana awaria produkcji.

**Rozwiązanie:** rozszerzono istniejący moduł Content bez nowego projektu i migracji. Kod `src/api/Content/DiscoveryEndpoints.cs:40`–`:61` łączy metadane i treści; fragmenty pobiera dopiero jawny podgląd (`:86`). Zachowano istniejące granice widoczności i ograniczony zakres odpowiedzi.

**Weryfikacja historyczna:** `docs/COMMUNITY_DISCOVERY_VALIDATION.md:90`–`:92` potwierdza stałą liczbę zapytań dla 1 i 20 społeczności. Pełny gate i ograniczenia mają nowszy ślad w `docs/COMMUNITY_DISCOVERY_CLOSURE_AUDIT.md:68`–`:101`: backend 286 PASS, frontend 154 PASS, fixture browser 170 PASS; osobny zwykły lokalny smoke 24 PASS / 0 FAIL / 5 SKIP. Tych zestawów nie sumuje się jako niezależnych testów funkcji.

**Wynik:** lokalny zakres discovery jest udokumentowany i obecny w odczytanym kodzie. Nie jest to dowód aktualnej produkcji ani fizycznego telefonu.

### Przypadek C2 — rzeczywiste agregaty feedu bez zapytań per karta

**Problem:** nowa prezentacja rozmów potrzebowała liczby odpowiedzi, uczestników i czasu aktywności dla całej strony publikacji.

**Diagnoza / root cause:** kontrakt feedu wymagał rozszerzenia o agregaty. Dokumentacja nie potwierdza wcześniejszego incydentu produkcyjnego ani pomiaru przy ruchu użytkowników.

**Rozwiązanie:** dwa zbiorcze zapytania uzupełniają stronę już dobranych postów; `src/api/Content/ContentEndpoints.cs:538`–`:579`.

**Weryfikacja historyczna:** `docs/LUDPRA_V2_REVIEW_2026-10-14.md:53`–`:58`: regresja trzech SQL dla strony 100 postów i pomijanie nieopublikowanych komentarzy w metrykach. `:70`–`:80` dokumentuje 241 backend, 90 frontend i 116 browser PASS dla tamtego checkpointu. Rewizja raportu sprawdzona przez `git log -- ...`: `aad44687c87e6b1243fe22db8facec260eb00913`, 2026-10-14. To wcześniejsze zestawy niż późniejsze discovery; nie dodaje się ich do jego sum.

**Wynik:** informacje pochodzą z danych aplikacji. Nie publikowano wskaźników aktywnej społeczności ani wydajności produkcyjnej.

### Granica gotowości Community

`docs/PUBLIC_BETA_CLOSURE_2026-10-10.md:3`–`:7` to historyczny stan z 10 października, nie aktualny odczyt produkcji. Nowszy `docs/SPRINT_P0_EMAIL_AUTH_2026-10-14.md:119` opisuje osobny kontrolowany external E2E, natomiast `:79` odróżnia production preflight od wdrożenia. Nie wywodzono aktualnego stanu produkcji ze starego raportu ani obecności nieśledzonych skryptów bootstrapu. Publiczny katalog mówi wprost, że aktualnego wdrożenia nie zweryfikowano. Nie ujawnia szczegółów organizacyjnych, hostów, ustawień poczty ani kont.

## ProgressKit Tax — zakres potwierdzonej implementacji

Rewizja: `d56da266d0d5237d4b8edf6254b08a93ca6ac4db`.

- Aktualny zakres checkpointu: `README.md:3`–`:27`; odczytano również rzeczywiste pliki API.
- Rejestry i wersje reguł: `docs/SPRINT_04B_REPORT.md:15`–`:46`, mapowanie API `src/backend/Modules/Accounting/Register2026Endpoints.cs:12`–`:28`.
- Korekty przez storno i wpis zastępczy w transakcji: `src/backend/Modules/Accounting/Register2026CorrectionEndpoints.cs:23`–`:43` oraz `:51`–`:71`.
- Historia decyzji i aktualny status dowodu: `src/backend/Modules/Accounting/Register2026ReviewEndpoints.cs:10`–`:21` i `:49`–`:64`. Techniczne Implemented/Tested są odrębne od akceptacji eksperta.
- Technologie: `src/backend/ProgressKit.Tax.Api.csproj:3`, `:11`–`:19`; `src/web/package.json:19`; `android/app/build.gradle.kts:3`–`:5` i `:31`–`:50`.
- Portal i dokumenty: `src/backend/Modules/Portal/PortalEndpoints.cs`, `src/backend/Modules/Documents/DocumentEndpoints.cs`, `ClamAvScanner.cs`; wynik fizycznej kontroli opisano w raporcie, a nie ponownie wykonywano.

### Przypadek T1 — zachowanie precyzji kwoty wejściowej

**Problem / diagnoza:** zapis liczbowy z nadmiarem cyfr mógł zostać zaokrąglony przez konwersję decimal przed właściwą walidacją. `docs/SPRINT_04B_REPORT.md:196`–`:201` zapisuje porównanie zachowania przed i po poprawce.

**Root cause:** kontrola sparsowanego wyniku nie zachowywała całej informacji o oryginalnym zapisie.

**Rozwiązanie:** kontrola oryginalnego tokenu przed parsowaniem, zwykły zapis bez wykładnika i maksymalnie dwie cyfry ułamka; `src/backend/Modules/Accounting/RegisterAmountConverter.cs:13`–`:30`, `:32`–`:48`.

**Weryfikacja historyczna:** zapisany test porównawczy i 14 ukierunkowanych testów obejmujących także integralność, rollback i migracje (`docs/SPRINT_04B_REPORT.md:198`–`:201`). Liczba 14 jest podzbiorem gate 04B, nie dodatkowym zestawem do dodania do 896.

**Wynik:** nadmierna precyzja jest odrzucana; publiczny opis nie przedstawia tego jako akceptacji prawnej obliczeń podatkowych.

### Przypadek T2 — pełne metadane korekty ewidencji

**Problem / diagnoza:** nowa kontrola integralności nie porównywała opisu storna z wymaganym źródłem. `docs/SPRINT_04B_REPORT.md:196`–`:201`.

**Root cause:** niepełny zestaw porównywanych metadanych nowego formatu.

**Rozwiązanie:** addytywna migracja kontroli, bez przepisywania już zastosowanej historii; `docs/SPRINT_04B_REPORT.md:138`–`:149`. Atomowy zapis korekty jest potwierdzony aktualnym kodem endpointów.

**Weryfikacja historyczna:** testy integralności i rollbacku, aktualizacja 5→6→7 oraz niezależna kontrola CSV/PDF; `docs/SPRINT_04B_REPORT.md:148`–`:160`, `:169`–`:201`. Raport jawnie zachowuje także wcześniejsze nieudane próby, których nie oznacza się jako PASS.

**Wynik:** zapisany lokalny checkpoint potwierdza spójność oryginału, storna i zamiennika. Nie deklaruje zatwierdzonego urzędowego sprawozdania ani wdrożenia.

### Granice wyników i zgodności Tax

`docs/SPRINT_04B_REPORT.md:48`–`:80`: **896 unikalnych PASS / 0 FAIL / 0 SKIP**, w tym 666 xUnit, 154 Vitest, 17 Chrome rejestrów, 7 Chrome odbioru dokumentów, 9 JVM, 23 fizycznego Androida, 12 Python provisioning i 8 Python runnera. To zapisane wykonania z 2026-10-11, nie nowy wynik tego sprintu. W audycie portfolio nie sprawdzano urządzenia ani artefaktów APK.

`docs/SPRINT_04B_REPORT.md:42`–`:46` oraz `:218`–`:233` rozdzielają kontrakty integracji od aktywnego generowania/wysyłki. KSeF/JPK, kwalifikacja podatkowa i niezależna akceptacja księgowa pozostają osobnym zakresem. Nie odwzorowywano starej tabeli `ACCOUNTING_COMPLIANCE_STATUS.md` jako bieżącego stanu pełnych rejestrów, gdyż starszy opis jest częściowo zastąpiony raportem 04B.

Nie publikowano szczegółów otwartych kontroli bezpieczeństwa, zależności, kont lub konfiguracji. Publicznie wystarcza informacja o otwartym odbiorze produkcyjnym i merytorycznym.

## Adivara — zakres potwierdzonej implementacji

Rewizja: `17bc746dd93f872b62cbd42694d4dfe99f3f72c4`.

- Jest to fundament backendu, nie kompletna aplikacja operacyjna. Obecność encji Assignment, Patient i Caregiver nie oznacza działających publicznych ekranów ani pełnego CRUD.
- Tożsamość i organizacje: `src/Adivara.API/Controllers/AuthController.cs`, `MeController.cs`, `src/Adivara.Application/Companies/GetMyCompaniesQuery.cs`.
- Powiązanie personelu: `src/Adivara.Domain/Entities/CompanyMembership.cs:82` oraz `:104` i `src/Adivara.API/Controllers/CompanyMembershipCaregiversController.cs`.
- Przyznawanie i cofanie dostępu rodziny: `src/Adivara.API/Controllers/FamilyMemberAccessController.cs:13`–`:69`; centralny zakres: `src/Adivara.Application/FamilyMemberAccess/PatientAccessScope.cs:13`–`:66`.
- Technologie: `src/Adivara.API/Adivara.API.csproj:4`, `:11`–`:13`; `src/Adivara.Infrastructure/Adivara.Infrastructure.csproj:9`–`:15`.

### Przypadek A1 — wspólna granica autoryzowanego dostępu

**Problem / diagnoza:** architektura wymagała wspólnej kontroli list i pojedynczych zasobów, ograniczającej zależność od implementacji każdego nowego endpointu.

**Root cause:** rozproszone stosowanie reguł dostępu. Publiczny opis nie zawiera szczegółów potencjalnych obejść ani otwartych findings.

**Rozwiązanie:** centralny zakres zapytań i deklaratywna polityka zasobów; `src/Adivara.Application/FamilyMemberAccess/PatientAccessScope.cs:13`–`:66`, `src/Adivara.API/MultiTenancy/RequirePatientAccessAttribute.cs:11`, `PatientAccessAuthorization.cs:23`.

**Weryfikacja historyczna:** `docs/security/sec-001-remediation.md:128`–`:186` zawiera traceability testów, `:208`–`:217` zapisuje **203 PASS / 0 FAIL / 0 SKIP** (91 API, 67 domena, 45 infrastruktura), build bez ostrzeżeń i błędów. Nie wykonywano nowego testu ani gate.

**Wynik i ograniczenie:** lokalnie udokumentowana poprawka zakresu dostępu. `docs/security/README.md:14`–`:15` i `docs/security/sec-001-remediation.md:10`–`:11` zachowują historyczny wynik Gate i status oczekujący na pełny ponowny odbiór. Publiczny katalog nie nazywa całego systemu gotowym lub bezpiecznym produkcyjnie.

## GoTrans360 — zakres potwierdzonej implementacji

Rewizja: `27cf7155683fba95ff321334a80839e5a9995d58`.

- Aktualna dokumentacja architektury jest dokładniejsza niż promocyjny README: `docs/ARCHITECTURE.md:19`–`:29`, `:31`–`:50`, `:54`–`:88`.
- Rzeczywisty kod API tras i floty: `apps/api-core/src/index.ts:134`, `:140`, `:296`, `:380` oraz dispatch `:521`.
- Smart Match: `apps/web-dispatcher/src/lib/vrp.ts:1`–`:3` jawnie opisuje demonstracyjne wejście, `:52`–`:94` zawiera Haversine i wybór dopasowania, `:98`–`:122` buduje propozycje.
- Portal pasażera ma istniejący interfejs i stan formularza; przycisk `apps/web-passenger/src/app/page.tsx:77`–`:82` wywołuje lokalny alert. To nie dowodzi wyszukania dostępnego przejazdu ani rezerwacji.
- Mapa to demonstracyjne znaczniki, nie telemetria: `docs/ARCHITECTURE.md:64`–`:71`.
- Technologie potwierdzono manifestami `apps/web-dispatcher/package.json`, `apps/api-core/package.json`, strukturą workspace i schematem Prisma. Sam istniejący adapter routingu nie dowodzi wdrożonego silnika optymalizacji dróg.

### Przypadek G1 — empiryczna granica twierdzeń o prototypie

**Problem:** wartości ekranu wymagały sprawdzenia, zanim mogłyby służyć jako dowód możliwości lub skali produktu.

**Diagnoza / root cause:** część kart ma stałe wartości demonstracyjne; `docs/benchmarks/PORTFOLIO_CLAIMS_VALIDATION.md:17`–`:29`. Sam udany odczyt danych syntetycznych nie potwierdza znaczenia etykiety ani statystyki biznesowej.

**Rozwiązanie:** inwentarz twierdzeń, kontrolowany dataset, niezależne odczyty bazy/API i porównanie wyników logiki. To rozwiązanie problemu wiarygodności dowodów, a nie twierdzenie o naprawie całego produktu.

**Weryfikacja historyczna:** `docs/benchmarks/PORTFOLIO_CLAIMS_VALIDATION.md:31`–`:76` opisuje metodę i izolację; `:7`–`:8` potwierdza odczyt 12 567 testowych tras, `:390`–`:412` potwierdza dwie demonstracyjne propozycje w trzech przebiegach. Testowy schemat został usunięty po badaniu. W audycie portfolio nie wykonywano nowych odczytów bazy i nie używano żadnego connection stringa.

**Wynik:** możliwy jest uczciwy opis zakresu prototypu. Nie publikowano liczby przewiezionych klientów, zrealizowanych usług, zadowolenia, pracy 24/7 ani wyników finansowych. Wyniki benchmarku nie są takim dowodem.

### Granica jakości i dostępności GoTrans360

`docs/QA_LOG.md:18`–`:40` zapisuje stare buildy i wąski smoke, a `:42`–`:59` ograniczenia tego wyniku. Nie prezentowano dwóch testów smoke jako kompletnej regresji, nie uznano builda za odbiór produktu. `docs/ARCHITECTURE.md:85`–`:88` rozdziela planowane rezerwacje, przesyłki, płatności i tracking. Brak zewnętrznego CTA rezerwacji w nowym rekordzie jest celowy.

## Galerie, filmy, linki i publiczne repozytoria

W tych czterech rekordach `gallery`, `videos` i `links` są puste, a `repository` ma `null`.

- Community ma rzeczywiste lokalne screenshoty fixture i zwykłego lokalnego widoku (`docs/COMMUNITY_DISCOVERY_VALIDATION.md:123`–`:147`, `docs/COMMUNITY_DISCOVERY_CLOSURE_AUDIT.md:128`–`:145`), jednak nie znajdują się w istniejących publicznych zasobach portfolio. Obejrzano `docs/evidence/community-discovery/desktop.png` (1440×1000) i `mobile.png` (390×844): nie zawierają chrome przeglądarki, adresów, e-maili ani PII; pokazują wyłącznie syntetyczne społeczności tematyczne. Są kandydatami do osobnego dodania z podpisem „Lokalne QA na danych syntetycznych, 14.10.2026; nie produkcja”. Nie kopiowano samodzielnie zasobów poza przydzielonym zakresem plików.
- Tax ma dowody Android/Chrome, lecz wymagają osobnej selekcji materiałów syntetycznych przed publiczną galerią. Nie kopiowano danych klientów ani surowych raportów produktu.
- Adivara nie ma potwierdzonych materiałów publicznego UI; nie tworzono zastępczych ekranów.
- Obejrzano trzy istniejące obrazy portfolio GoTrans360: `assets/projects/gotrans360/gotrans360-carrier-onboarding.png`, `gotrans360-platform-capabilities.png`, `gotrans360-passenger-portal.png`. Wszystkie obejmują chrome przeglądarki i lokalny adres; pozostałe dwa dodatkowo sugerują działającą rezerwację/GPS lub aktywny backend. Obraz onboarding ma również marketingowy opis VIES, którego ten audyt nie potwierdza. Nie uznano tych elementów za dowód działania i nie dodano ich do katalogowej galerii. Nie usuwano istniejących plików.
- Nie potwierdzano publicznego dostępu repozytoriów ani bieżącego działania stron produktów; sam remote Git lub link zapisany w README nie wystarcza. Puste CTA nie deklarują awarii tych stron, tylko brak bieżącego potwierdzenia.

## Weryfikacja wykonana w tym zadaniu

- Odczyt źródeł, reguł, HEAD i statusów czterech właściwych checkoutów: wykonany.
- Powtórny odczyt statusów: brak zmian w repozytoriach produktowych względem snapshotu audytu.
- Wizualny przegląd trzech istniejących screenshotów GoTrans360 i dwóch lokalnych screenshotów Community: wykonany.
- Walidacja struktury fragmentu katalogu: **4/4 rekordy PASS**, 6 kompletnych przypadków, unikalne identyfikatory, daty, statusy, rewizje i odwołania do źródeł; wykonana skryptem Python po zapisaniu JSON. Sprawdzono także brak lokalnych ścieżek i konfiguracji w publicznych metadanych źródeł.
- Testy produktów, testy urządzeń, produkcyjny smoke, publiczne repozytoria i linki: **NOT RUN** w tym audycie; nie przypisuje się im nowego PASS.
- Nie wykonano commit, push, migracji ani wdrożenia.

Publiczne `sources` zawierają wyłącznie etykiety, rewizje i zakres dowodu, bez lokalnych ścieżek, logów, sekretów i wewnętrznych szczegółów ograniczeń. Wszystkie cztery rekordy mają `coverage: partial`, ponieważ audyt źródeł nie zastępuje nowego odbioru produktu ani kompletnej publicznej galerii.
