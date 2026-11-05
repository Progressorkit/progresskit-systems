# Client inquiries — lokalny kandydat wdrożenia

**Status: przygotowane lokalnie; production deployment: NOT STARTED; owner approval: OPEN.** Nie wykonano komend na VPS, restartów Docker/Caddy, zmiany uprawnień istniejących danych ani wysyłki do prawdziwej skrzynki. Poniższe czynności produkcyjne wymagają zatwierdzenia właściciela.

## Konkretny zakres kandydata

- `analytics/deploy/inquiries.compose.yaml`: nakładka na istniejący analytics, ten sam obraz i trwałe `/data/product.db`; osobny proces `python inquiry_worker.py`. Bez nowego backendu/bazy/silnika. `ports: !reset []` usuwa odziedziczone host ports z analytics; worker również nie publikuje portów.
- Ten sam użytkownik i grupa danych są wybierani przez operatora, przez wymagane `PK_INQUIRIES_UID` i `PK_INQUIRIES_GID`. Nie zakładamy, że istniejący owner ma UID1000. Zmiana istniejącego ownera wymaga osobnej zgody; preferujemy dopasowanie procesu do właściciela danych.
- HMAC i private-read token są osobnymi plikami; SMTP password jest montowany wyłącznie do workera. Ścieżki plików i istniejącego wolumenu wymagają jawnego podania. Sekretów nie wpisuje się w YAML, repo, JavaScript ani publiczny build.
- `analytics/deploy/inquiries.Caddyfile.snippet`: wyłącznie GET dokładnego `/api/project-inquiries/token` i POST dokładnego `/api/project-inquiries`; pozostałe ścieżki/metody oraz całe `/internal` mają404. Brak szerokiego `/api/*` proxy. Metadata access-log tych ścieżek jest wyłączona. App działa z `--no-access-log`.
- `scripts/inquiry-preflight.py`: kontrola bez zapisu i sieci, bez importowania app/inquiries. Sprawdza konfigurację, prywatność plików, TLS, sekrety, exact proxy IP i opcjonalnie sam schemat przez SQLite `mode=ro&immutable=1`. Nigdy nie zwraca danych kontaktowych, ścieżek lub sekretów. **CONFIG_PASS nie jest zgodą na wdrożenie ani dowodem dostarczenia SMTP.**

Nakładka korzysta z mechanizmu `!reset`; wymagany współczesny Docker Compose. Przed użyciem operator waliduje efektywną konfigurację i obsługę tej składni. Reguły merge: [oficjalna dokumentacja Docker](https://docs.docker.com/reference/compose-file/merge/). Caddy `log_skip` wymaga wersji co najmniej2.8. Lokalne `docker compose config` przeszło bez łączenia z demonem: odziedziczone publiczne ports usunięte, wspólny obraz i osobny worker oraz SMTP secret tylko workera potwierdzone. Caddy 2.11.8 pobrano wyłącznie do /tmp z oficjalnego API: pełny lokalny site (istniejący+nowy snippet) przeszedł adapt/validate, a proxy fixture 25/25 kontroli. Nowy snippet ma bounded outer handle i wewnętrzny literal route: istniejący site-level fallback nie przejmuje token/POST. Produkcyjny pełny Caddyfile nadal wymaga adapt/validate przed zatwierdzonym reload. Dowody i hash binarki: proxy/results.json oraz proxy/caddy-binary.json; dokumentacja [Caddy CLI](https://caddyserver.com/docs/command-line). Nie uruchamiano kontenerów ani produkcji.

## Wymagane wartości i uprawnienia

Na hoście operator ustala:

```
PK_INQUIRIES_BUILD_CONTEXT=<absolutny katalog przygotowanego analytics source>
PK_INQUIRIES_IMAGE_TAG=<zatwierdzony identyfikator kandydata>
PK_INQUIRIES_DATA_DIR=<dokładnie obecny trwały katalog analytics>
PK_PRODUCT_DB=<ten katalog>/product.db
PK_INQUIRIES_UID=<obecny autoryzowany owner danych>
PK_INQUIRIES_GID=<obecna autoryzowana grupa danych>
PK_PUBLIC_ORIGIN=https://progresskit.pl
PK_INQUIRIES_TRUSTED_PROXY_IPS=<wyłącznie dokładne zatwierdzone IP Caddy, bez *>
PK_INQUIRIES_RETENTION_DAYS=180
PK_INQUIRIES_HMAC_SECRET_FILE=<prywatny plik HMAC>
PK_INQUIRIES_READ_TOKEN_FILE=<inny prywatny plik bearer>
PK_INQUIRIES_SMTP_HOST=<zatwierdzony serwer>
PK_INQUIRIES_SMTP_PORT=<587 lub465 zgodnie z dostawcą>
PK_INQUIRIES_SMTP_MODE=<starttls lub ssl>
PK_INQUIRIES_SMTP_USERNAME=<konto zatwierdzone przez właściciela>
PK_INQUIRIES_SMTP_PASSWORD_FILE=<prywatny plik hasła>
PK_INQUIRIES_SMTP_FROM=<dozwolony nadawca; domyślnie notifications@progresskit.pl>
```

HMAC i read token: co najmniej32 znaki losowego ASCII, różne wartości, maksymalnie512; pliki0600 w katalogu0700, odczytywalne przez wybrany UID/GID. Hasło SMTP nie może być puste. Compose secret bind mounts mogą zachować host ownership: samo zadeklarowanie secret nie naprawia praw dostępu. Uvicorn ufa tylko jawnym adresom proxy; nie wolno ustawić `*` ani ufać dowolnemu nagłówkowi X-Forwarded-For. Adres Caddy musi pozostawać zgodny z faktyczną konfiguracją sieci; nie zgadujemy jego adresu.

`product.db`, ewentualne `-wal`, `-shm`, `-journal`, snapshoty i kopie muszą być prywatne: pliki0600, katalog danych0700, autoryzowany owner. Backend odmawia nowych zapytań503, prywatny odczyt404, worker nie wysyła SMTP, gdy główny plik/sidecar jest symlinkiem, nie jest zwykłym plikiem lub ma group/world bits. **Aplikacja nie wykonuje chmod istniejącej bazy.** Istniejące analytics/product pozostają dostępne. Nowa baza i nowy katalog są tworzone0600/0700.

Preflight jest przeznaczony do uruchomienia na hoście z powyższymi host paths i właściwą tożsamością. Kontrola ownership jest konserwatywna: owner UID/GID muszą pasować. Przed migracją:

```sh
python3 scripts/inquiry-preflight.py --before-migration
```

Po migracji i kontrolowanym checkpoint:

```sh
python3 scripts/inquiry-preflight.py
```

Tryb before-migration nigdy nie zgłasza `configuration_ready`. Pełny tryb wymaga wszystkich czterech tabel i potrzebnych kolumn; brak schematu nie jest PASS. Niepusty WAL blokuje odczyt schematu w immutable snapshot, aby nie uznać nieaktualnej kopii za poprawną. Preflight nie robi checkpoint ani naprawy — tę operację wykonuje zatwierdzony worker/migracja podczas krótkiego okna kontroli.

## Kolejność działań po uzyskaniu zgody

1. Właściciel zatwierdza dokładny diff, ścieżki istniejącego Compose/Caddy, wybrany UID/GID, sieć proxy, dane SMTP i polityki retencji. Operator potwierdza, że publiczny katalog nie obejmuje DB/secrets/backupów. Bez tego nie przyjmujemy danych klientów.
2. Operator przygotowuje bezpieczną kopię istniejącego trwałego wolumenu i plan jej ograniczonej retencji. Potwierdza owner/mode istniejących danych; ewentualna naprawa praw to osobna, zatwierdzona czynność, nie działanie aplikacji/preflight.
3. Z chronionych plików dostarcza odrębne sekrety. Uruchamia host preflight before-migration. Sekrety nie trafiają do logów ani artefaktów odbioru.
4. Lokalnie/offline waliduje złożony Compose z istniejącymi plikami i nową nakładką; efektywny wynik nie może zawierać publicznych portów backendu/workera ani zmienionego wolumenu danych. Następnie waliduje cały istniejący Caddyfile ze wstawionym snippetem przed file_server/fallback. To nie jest zgoda na `up` lub reload.
5. Dopiero po zatwierdzeniu operator buduje obraz, uruchamia backend oraz worker na tym samym istniejącym wolumenie. Addytywny schemat tworzy istniejący serwis; worker `--purge-only` może wykonać kontrolowany checkpoint/retencję. Żadnych drop/restore/reset danych.
6. Pełny read-only preflight musi przejść. Sprawdza się publiczne404 dla `/internal` i niedozwolonych metod, brak logów PII, origin/CSRF, oraz durable receipt w uzgodnionym oznaczonym teście. Wysyłka do produkcyjnego SMTP i potwierdzenie odbioru na `pawel@progresskit.pl` wymagają osobnej zgody; lokalny sink nie stanowi dowodu dostarczenia do tej skrzynki.
7. **Backend i worker przed statycznym formularzem.** Po odbiorze backendu operator przełącza statyczną stronę. Potwierdza mobile/desktop, exportTXT/PDF, zachowanie treści po błędzie i brak mailto. Sukces w UI wolno pokazać tylko po201 z utrwalonego zapisu.
8. Monitoruje kolejkę i retencję. Dopiero komplet wyników + zgoda właściciela pozwalają oznaczyć deployment jako wykonany. Ten dokument nie wykonuje żadnego z powyższych kroków.

## Odczyt prywatny i przyszły Control

Dostępne są wyłącznie `/internal/project-inquiries` (limit1–100, paginacja `before_at`/`before_id`) i `/internal/project-inquiries/{uuid}`. Bez odrębnego Bearera poprawnej długości i prywatnego storage jest404. Odpowiedzi mają no-store; publiczne proxy zawsze blokuje tę przestrzeń.

Przyszły Control odczyta token wyłącznie po stronie serwera z `PK_INQUIRIES_READ_TOKEN_FILE`, z kontrolowanej wewnętrznej sieci/usługi. Nie wolno wklejać tokena w JS, query string, link, nagranie ani statyczną stronę. Zdalny operator używa zatwierdzonego prywatnego kanału/tunelu; nie dodajemy teraz publicznego route, panelu ani całego Control. Prywatny klient renderuje opis jako zwykły tekst.

## Worker, alerty i retencja

Worker posiada trwałe leases120s, retry od30s do6h, stable Message-ID. SMTP ma zweryfikowany CA/hostname oraz STARTTLS/SSL bez plaintext fallback. Awaria powiadomienia nie usuwa zapisanego zgłoszenia. Semantyka SMTP jest **at-least-once**; po awarii tuż po odebraniu wiadomości może pojawić się duplikat z tym samym Message-ID.

W produkcji wymagane są uzgodnione alerty (propozycja do zatwierdzenia): brak procesu/restart loop — krytyczny; najstarszy pending/sending ponad5min — warning, ponad30min — krytyczny; lease po terminie lub powtarzalny `smtp_configuration` — krytyczny; błędy storage/retencji — krytyczny. Sam Docker RUNNING nie dowodzi postępu; nie zaimplementowano osobnego publicznego heartbeat. Prywatny monitoring odczytuje wyłącznie agregaty kolejki, nie nazwiska/adresy/opisy. Przykład zapytania agregującego po zatwierdzeniu dostępu:

```sql
SELECT COUNT(*) AS pending_count, MIN(created_at) AS oldest_pending_at,
       MAX(attempts) AS most_attempts
FROM inquiry_outbox WHERE state IN ('pending','sending');
```

Rekord jest logicznie niedostępny po maksymalnie180 dniach. Worker usuwa wygasłe rekordy oraz powiązany outbox przy starcie i co24h; fizyczne sprzątanie może nastąpić do24h po wygaśnięciu. `secure_delete` i checkpoint TRUNCATE ograniczają pozostawienie danych w stronach/WAL; problem checkpoint jest ponawiany. Brak działającego workera jest blokadą produkcyjną, bo oznacza brak gwarancji sprzątania i powiadomień.

**Oddzielne polityki — propozycja, wymagają decyzji właściciela i potwierdzenia dostawcy:** backupy maksymalnie30 dni, powiadomienia/metadane mailbox i logi SMTP maksymalnie30 dni. Nie zmieniono ustawień żadnego dostawcy. Snapshot sharedDB może zawierać rekord usunięty z liveDB przez kolejne30 dni: wymaga jawnego odzwierciedlenia w zatwierdzonej informacji o prywatności, kontroli dostępu i obiegu usuwania; nie wolno deklarować twardego180 dni dla każdej kopii bez rozstrzygnięcia tej polityki. Po restore operator stosuje retencję przed ponownym uruchomieniem API i nie przywraca starych danych do bieżącego użytku. Powiadomienie zawiera wyłącznie ID/datę/typ/status, bez kontaktu i opisu, ale nadal ma ograniczoną retencję.

## Rollback

Wyłączyć przyjmowanie nowych zgłoszeń w proxy/UI z jasnym komunikatem zachowania treści, zachować trwałą bazę oraz outbox i ich prywatne uprawnienia. Nie usuwać tabel, nie cofać wolumenu do starej kopii i nie gubić przyjętych UUID. Dozwolony rollback obrazu musi umieć bezpiecznie pozostawić nowe tabele; worker/retencja wymagają dalszej obsługi do opróżnienia zgodnie z polityką. **Nie przywracać starego przycisku mailto ani komunikatu sugerującego wysłanie bez zapisu.** TXT/PDF i zwykły kontakt mogą pozostać dostępne z jasnym statusem formularza.

## Lokalne kontrole

`tests/test_inquiry_preflight.py`:4 przypadki PASS — poprawny schemat i brak zmian hashów/mode, brak/równość sekretów, niebezpieczne DB/WAL/SHM, błędnyHTTPS/TLS/proxy/retencja i brak schematu. Testy korzystają tylko z tymczasowych plików. Pełny lokalny HTTPS/SMTP proof opisuje raport główny; produkcyjny odbiór skrzynki i konfiguracja infrastruktury pozostają PENDING OWNER APPROVAL.

## Zależności i dodatkowy lokalny proof proxy

Manifest bezpośredni jest przypięty do rzeczywiście sprawdzonych FastAPI 0.162.0, Uvicorn 0.54.0 i httpx 0.28.1. `httpx2` zastąpiono przez główną implementację; nie jest już zależnością tego kandydata. `analytics/requirements.lock` utrwala 17 zależności, a Dockerfile aktualizuje bootstrap pip do 26.2.0 przed instalacją locka. Wynik SCA i regresji opisuje raport główny; samo istnienie locka nie stanowi dowodu zbudowania lub wdrożenia obrazu produkcyjnego.

Proxy test używa standardowej oficjalnej binarki w/tmp (bez instalacji systemowej), `admin off`, `auto_https off`, `persist_config off` i jawnego `bind 127.0.0.1`. Pełny site jest złożony z obydwu snippetów; runtime podmienia wyłącznie upstream analytics na lokalny syntetyczny serwer. Żadnych prawdziwych zgłoszeń, kontaktów, bazy, APK, SMTP, ACME ani produkcyjnych konfiguracji. 25 kontroli obejmuje exactGET/POST, odrzucenie list/detail/OPTIONS/HEAD/innych metod i/internal, zachowanie Glikemia count/download i lokalnego landing,150 KB accept/170 KB 413, wyłączenie access-log dla prywatnych/inquiry ścieżek przy działającym control log oraz loopback bind przed startem. Oba własne procesy zostały zatrzymane.
