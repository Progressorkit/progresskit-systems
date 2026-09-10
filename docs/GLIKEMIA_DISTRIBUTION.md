# Glikemia Premium — dystrybucja bezpośrednia

Status: zaimplementowane lokalnie; MANUAL SERVER DEPLOYMENT REQUIRED.
Nie wykonano commit/push/tag/merge ani zmian na VPS. Nie potwierdzono działania
nowych ścieżek na publicznym progresskit.pl.

## Architektura zastana i zakres

Portfolio to `index.html`, inline CSS/JS, moduły ładowane przez `loadModule`, lokalne
assety i workflow GitHub Pages. W repo istnieją też FastAPI/Uvicorn, SQLite,
Dockerfile, fragment Caddy i Compose dla usługi `analytics` na porcie 8091.
Compose wskazuje dane `/srv/progresskit/data/progresskit-analytics`.
README opisywał tylko frontend. Nie ma pełnego produkcyjnego Caddyfile ani mechanizmu
moderowania opinii. Nie odczytywano konfiguracji ani danych na VPS.

Nowa strona `glikemia-premium/index.html` jest samodzielnym dokumentem SEO,
z ciemną stylistyką, istniejącym logo, metalicznym niebieskim CTA i czerwonymi
akcentami. Portfolio ma link w nawigacji i karcie Glikemii. Pozostałe realizacje
zachowują układ. Nowa strona nie ładuje analityki istniejącej strony głównej.

Backend produktu (`analytics/product.py`) włączono do istniejącego FastAPI.
Oddzielna baza produktu w tym samym trwałym wolumenie izoluje opinie od zastanych
zdarzeń analitycznych. Nie dodano SaaS, kont, cookies, zewnętrznych fontów ani trackerów.

## APK

Źródło lokalne (wyłącznie dokumentacja operatora, nigdy publiczna strona):
`/home/pawe/Pulpit/Projekty It/Glikemia Premium/bin/Release/net10.0-android/com.progressorkit.glikemiapremium-Signed.apk`.

Kopia: `downloads/glikemia-premium.apk`. Brak rebuild/resign.

- Pakiet: `com.progressorkit.glikemiapremium`.
- Wersja manifestu: 1.0, versionCode 1.
- minSdk: 24 (Android 7.0), targetSdk: 36.
- Rozmiar: 80 235 954 bajty, 80,24 MB / 76,52 MiB.
- SHA-256: `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`.
- `apksigner verify`: PASS; źródło i kopia mają identyczny SHA-256.

Docelowe adresy:
- Strona: https://progresskit.pl/glikemia-premium/
- CTA: https://progresskit.pl/download/glikemia-premium
- Stabilny adres APK: https://progresskit.pl/downloads/glikemia-premium.apk
- Licznik: https://progresskit.pl/api/glikemia/downloads

Obie ścieżki APK obsługuje backend bezpośrednio: odpowiedź APK → po zakończeniu
pełnej odpowiedzi HTTP 200 transakcyjny increment. Nie ma drugiego żądania/redirectu zwiększającego licznik drugi raz.
Content-Type `application/vnd.android.package-archive`, Content-Disposition
`attachment; filename="glikemia-premium.apk"`, Cache-Control `no-store`.
Nie serwować tego pliku dodatkowo przez file_server/CDN: omijałoby to licznik.

## Licznik i trwałość

Produkcja: `PK_PRODUCT_DB=/data/product.db` w kontenerze, na hoście
`/srv/progresskit/data/progresskit-analytics/product.db`.

Tabela `downloads` zawiera jeden wiersz: `total` i `last_at` (Unix timestamp).
SQLite WAL, atomowe `UPDATE total=total+1`, commit po zakończeniu wysyłania pełnej
odpowiedzi HTTP 200 do serwera ASGI. HEAD zwraca 405 bez incrementu. Wykrywalny
prefetch/prerender (Purpose, Sec-Purpose, X-Purpose, X-Moz) zwraca 204 bez transferu.
Każde żądanie z Range jest wyłączone z naliczania, także If-Range prowadzący do 200;
206, błędny Range 400/416, błędny odczyt, przerwany send i liczba wysłanych bajtów
niezgodna z Content-Length nie zwiększają licznika.
Brak pliku zwraca 503. Odświeżenie strony, API licznika i assety nie liczą pobrań.
Normalne CTA prowadzą do `/download/glikemia-premium`; QR prowadzi do strony produktu,
gdzie CTA korzysta z tej samej ścieżki. Brak widocznego linku omijającego licznik.

Ograniczenie bez śledzenia: pobranie wykonane wyłącznie przez Range nie jest liczone.
Ponowiony pełny GET to nowe żądanie, nie da się uznać go za tego samego użytkownika.
Zakończenie ASGI nie dowodzi zapisu na urządzeniu; rozłączenie niewidoczne serwerowi
lub buforowanie przez proxy nie jest wykrywalne. Awaria procesu/bazy pomiędzy wysłaniem
ostatniego bloku a commitem może zaniżyć liczbę. Nie istnieje atomowa transakcja
obejmująca SQLite i sieć klienta. Właściciel powinien monitorować błędy bazy.
Metryka oznacza obsłużone pełne „pobrania APK”/download requests, nie unikalnych
użytkowników, instalacje ani potwierdzony odbiór na telefonie.
Publiczne API zwraca wyłącznie `{"downloads": N}`; awaria API nie jest pokazywana jako 0.

Dane przeżywają restart/rebuild kontenera, bo bind mount znajduje się poza kodem
wdrożenia. Nie usuwać katalogu danych podczas deployu. Nigdy nie kopiować lokalnej
bazy testowej na produkcję. Nowa baza zaczyna od rzeczywistego 0, bez importu fikcyjnych danych.
Lokalny podgląd: `/tmp/progresskit-product-preview/product.db`, początkowo 0.
`/tmp` służy wyłącznie do podglądu, nie jest konfiguracją produkcyjną.
Brak PK_PRODUCT_DB zatrzymuje start backendu; nie ma cichego fallbacku do /tmp.

Istniejący wewnętrzny dashboard analytics i `/summary` pokazują także
`glikemia_downloads`. Fragment Caddy nie wystawia dashboardu publicznie.

Inspekcja na serwerze:

```sh
docker exec progresskit-analytics python owner.py count
docker exec progresskit-analytics python owner.py pending
docker exec progresskit-analytics python owner.py approve 42
docker exec progresskit-analytics python owner.py delete 42
```

42 jest przykładowym ID; wybrać właściwe z `pending`. Nie ma publicznego endpointu
administracyjnego. CLI wymaga dostępu operatora do serwera. Lista celowo koduje tekst
jako JSON, ograniczając także sekwencje sterujące terminalem. `pending` pokazuje do 100 rekordów.

Backup aktywnej bazy należy wykonać przez SQLite backup API (nie kopiować samego
`.db`, ignorując aktywne WAL). Przykład na serwerze z zainstalowanym sqlite3:

```sh
sqlite3 /srv/progresskit/data/progresskit-analytics/product.db '.backup /srv/progresskit/data/product-backup.db'
```

## Opinie, moderacja i prywatność

GET `/api/glikemia/review-token` wydaje losowy jednorazowy token formularza.
POST `/api/glikemia/reviews` przyjmuje JSON: nickname, rating, comment, version,
website (puste pole antyspamowe), token. Origin musi dokładnie odpowiadać
`PK_PUBLIC_ORIGIN` (produkcja `https://progresskit.pl`). Brak CORS. Origin jest kontrolą przeglądarkowego CSRF, nie uwierzytelnieniem:
klient skryptowy może go podrobić. Ograniczenia abuse zapewniają niezależnie
walidacja, limity i obowiązkowa moderacja.

Walidacja po stronie serwera: pseudonim 2–60 znaków, ocena integer 1–5,
komentarz 10–2000 znaków, wersja do 30 znaków, body do 12 KB, brak dodatkowych pól,
HTML i znaków sterujących. Parametry SQL są bindowane. Frontend używa `textContent`,
bez `innerHTML`, także dla treści z już zatwierdzonej bazy.

Token działa od 3 sekund do 30 minut, jest jednorazowy po udanym zapisie.
Maksymalnie 1000 aktywnych tokenów. Trwały limit globalny 20 opinii/godzinę i 500
oczekujących opinii; przepełnienie zwraca 429. Tokeny wygasłe czyszczone przy wydaniu,
stare okna limitera przy wysyłaniu. Nie przechowujemy IP, UA, emaili ani device ID.
Token nie identyfikuje urządzenia i nie trafia do rekordu opinii. Globalny limit
może być wyczerpany przez spam; to świadomy kompromis prywatności dla małego serwisu,
nie pełna ochrona przed DDoS. Moderacja blokuje publiczne wyświetlenie spamu.

Opinie zapisują się jako `pending`. Publiczne GET zwraca do 50 ostatnich `approved`,
wyłącznie pseudonim, ocenę, komentarz, datę i wersję. Brak danych pokazuje
„Pierwsze opinie pojawią się tutaj.”; awaria pokazuje komunikat błędu.
Operator odrzuca spam/dane prywatne, nie negatywne oceny. Usuwanie przez `owner.py delete`.
Formularz informuje o publikacji, moderacji, okresie przechowywania, kontakcie
`pawel@progresskit.pl` i prosi, by nie wpisywać danych zdrowotnych.

Uvicorn ma wyłączony access log. Fragment Caddy używa `log_skip` dla strony produktu,
API, pobierania i assetów Glikemii; wymaga Caddy >= 2.8:
[oficjalna dokumentacja log_skip](https://caddyserver.com/docs/caddyfile/directives/log_skip).
Sprawdzić ewentualne inne warstwy logowania na serwerze przed publikacją.

## Obrazy

Nowe WebP `product-{measurement,history,language,report-summary,report-pages}.webp`
są zoptymalizowanymi kopiami rzeczywistych JPG już w repo (648 × 1440).
Galeria portfolio również korzysta teraz z tych WebP. Oryginalne JPG i istniejące
covery zachowane świadomie jako źródła; nie są nowymi screenshotami wersji 1.0.
Końcowe wyszukiwanie objęło rekurencyjnie Glikemia Premium (w tym docs/Resources),
Glikemia-Premium-clean, `/home/pawe/Pulpit/glikemia foto`, a w tym repo
`assets/projects/glikemia` i `docs`; pominięto bin/obj/.git. Nowe pliki to tylko
ikony/splash/baner, bez potwierdzonych nowszych ekranów aplikacji. Wymaganie najnowszych ekranów pozostaje DO WERYFIKACJI po wskazaniu
źródła przez właściciela. Nie wygenerowano fałszywych ekranów ani opinii.

QR wygenerowano lokalnie; koduje `https://progresskit.pl/glikemia-premium/`.
Social preview `product-social.jpg` skomponowano lokalnie z prawdziwego ekranu.

## Ręczne wdrożenie — polecenia dla właściciela (NIE WYKONANO)

Wykonuj kolejne bloki w Bash i zatrzymaj się przy błędzie. Nie uruchamiaj ich
w ramach samego audytu. Pełny Caddyfile, bazowy Compose, nazwa kontenera Caddy oraz
hostowy webroot nie występują w repo. Muszą być ustalone z istniejących mountów;
bez tego bramka produkcyjna pozostaje NO. Poniższy proces nie wymaga żadnych operacji Git.

### 1. Lokalnie: przegląd, test, artefakt

```bash
set -euo pipefail
cd '/home/pawe/Pulpit/Projekty It/ProgressorKit Systems'
git status --short
git diff --stat
git diff --check
git diff
# git diff nie pokazuje nowych plików: przejrzyj także tę listę i ich zawartość.
git ls-files --others --exclude-standard
/tmp/progresskit-venv/bin/python -m unittest discover -s tests -v
node --check glikemia-premium/product.js
python3 -m compileall -q analytics tests scripts
PK_STAGE=$(mktemp -d /tmp/progresskit-release.XXXXXX)
python3 scripts/stage-public.py "$PK_STAGE/public"
mkdir "$PK_STAGE/backend" "$PK_STAGE/deploy" "$PK_STAGE/downloads"
cp analytics/{app.py,product.py,owner.py,Dockerfile,requirements.txt} "$PK_STAGE/backend/"
cp analytics/deploy/{compose.override.yaml,Caddyfile.snippet} "$PK_STAGE/deploy/"
cp downloads/glikemia-premium.apk "$PK_STAGE/downloads/"
PK_EXPECTED=137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b
printf '%s  %s\n' "$PK_EXPECTED" "$PK_STAGE/downloads/glikemia-premium.apk" | sha256sum -c -
docker build --iidfile "$PK_STAGE/backend-image.id" "$PK_STAGE/backend"
tar -czf "$PK_STAGE/release.tgz" -C "$PK_STAGE" public backend deploy downloads
read -r -p 'Zweryfikowany cel SSH (użytkownik@host): ' PK_SSH_TARGET
test -n "$PK_SSH_TARGET"
scp "$PK_STAGE/release.tgz" "$PK_SSH_TARGET:/tmp/progresskit-glikemia-release.tgz"
```

### 2. Na VPS: odkrycie istniejących ścieżek i backup

Zaloguj się ręcznie na potwierdzony VPS. Przejdź do sesji root poleceniem
`sudo -i` (lub użyj istniejącej sesji root), następnie uruchom poniższe bloki Bash.
Dzięki temu właściciel nowego katalogu danych jest jednoznacznie root:

```bash
set -euo pipefail
umask 027
for PK_CMD in docker python3 curl jq tar sha256sum; do command -v "$PK_CMD"; done
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker inspect progresskit-analytics --format '{{json .Mounts}}' | jq .
docker inspect progresskit-analytics --format '{{json .Config.Labels}}' | jq .
read -r -p 'Nazwa istniejącego kontenera Caddy: ' PK_CADDY
docker inspect "$PK_CADDY" --format '{{json .Mounts}}' | jq .
read -r -p 'Hostowy webroot progresskit.pl z mountów i Caddyfile: ' PK_WEBROOT
read -r -p 'Hostowa ścieżka istniejącego Caddyfile: ' PK_CADDY_HOST
read -r -p 'Ścieżka tego Caddyfile wewnątrz kontenera Caddy: ' PK_CADDY_IN
PK_WEBROOT=$(realpath -e "$PK_WEBROOT")
PK_CADDY_HOST=$(realpath -e "$PK_CADDY_HOST")
test -d "$PK_WEBROOT" && test -f "$PK_CADDY_HOST"
cat "$PK_CADDY_HOST"
PK_PROJECT=$(docker inspect progresskit-analytics --format '{{index .Config.Labels "com.docker.compose.project"}}')
PK_WORKDIR=$(docker inspect progresskit-analytics --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
PK_CONFIG_FILES=$(docker inspect progresskit-analytics --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')
test -n "$PK_PROJECT" && test -d "$PK_WORKDIR" && test -n "$PK_CONFIG_FILES"
PK_BASE=(docker compose --project-name "$PK_PROJECT" --project-directory "$PK_WORKDIR")
IFS=',' read -r -a PK_FILES <<< "$PK_CONFIG_FILES"
for PK_FILE in "${PK_FILES[@]}"; do test -f "$PK_FILE"; PK_BASE+=(-f "$PK_FILE"); done
"${PK_BASE[@]}" config --quiet
PK_DATA=/srv/progresskit/data/progresskit-analytics
PK_APP=/srv/progresskit/apps/progresskit-analytics
PK_APKS=/srv/progresskit/downloads
# Nie wolno umieścić bazy w webroot ani synchronizować webroot na bazę.
case "$PK_DATA/" in "$PK_WEBROOT/"*) echo 'STOP: baza w webroot'; exit 1;; esac
case "$PK_WEBROOT/" in "$PK_DATA/"*) echo 'STOP: webroot w danych'; exit 1;; esac
PK_RELEASE=/srv/progresskit/releases/glikemia-$(date -u +%Y%m%dT%H%M%SZ)
PK_BACKUP="$PK_RELEASE/backup"
mkdir -p "$PK_RELEASE" "$PK_BACKUP"
tar -tzf /tmp/progresskit-glikemia-release.tgz
# Archiwum utworzone w kroku 1, bez baz, sekretów i plików Git.
tar -xzf /tmp/progresskit-glikemia-release.tgz -C "$PK_RELEASE"
test -d "$PK_APP"
cp -a "$PK_APP" "$PK_BACKUP/backend"
cp -a "$PK_WEBROOT" "$PK_BACKUP/public"
cp -a "$PK_CADDY_HOST" "$PK_BACKUP/Caddyfile"
if test -f "$PK_APKS/glikemia-premium.apk"; then
  cp -a "$PK_APKS/glikemia-premium.apk" "$PK_BACKUP/previous.apk"
fi
docker inspect progresskit-analytics --format '{{.Image}}' > "$PK_BACKUP/previous-image.id"
export PK_DATA PK_BACKUP
python3 - <<'PY'
import os, sqlite3
from pathlib import Path
for name in ('analytics.db','product.db'):
    source = Path(os.environ['PK_DATA'])/name
    if source.exists():
        with sqlite3.connect(source) as src, sqlite3.connect(Path(os.environ['PK_BACKUP'])/name) as dst:
            src.backup(dst)
PY
printf 'RELEASE=%s\nBACKUP=%s\n' "$PK_RELEASE" "$PK_BACKUP"
```

Zapisz wartości zmiennych w notatce operatora, aby rollback działał także po utracie
sesji. **STOP**, jeśli `PK_WORKDIR`/pliki Compose nie są dostępne, mount `/data` nie
wskazuje dokładnie `PK_DATA`, albo Caddy nie obsługuje `progresskit.pl` po HTTPS.
Potwierdź wspólną sieć Docker Caddy i usługi `analytics`. Nie zmieniaj innych serwisów.

### 3. Przygotowanie plików i konfiguracji; kontrola przed przełączeniem

```bash
# Istniejących praw danych nie zmieniamy. Nowy katalog: root, 0750.
if ! test -d "$PK_DATA"; then install -d -m 0750 "$PK_DATA"; fi
if ! test -d "$PK_APKS"; then install -d -m 0755 "$PK_APKS"; fi
cp "$PK_RELEASE/backend/"* "$PK_APP/"
install -m 0644 "$PK_RELEASE/downloads/glikemia-premium.apk" "$PK_APKS/glikemia-premium.apk.new"
printf '%s  %s\n' 137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b "$PK_APKS/glikemia-premium.apk.new" | sha256sum -c -
mv "$PK_APKS/glikemia-premium.apk.new" "$PK_APKS/glikemia-premium.apk"
PK_COMPOSE=("${PK_BASE[@]}" -f "$PK_RELEASE/deploy/compose.override.yaml")
"${PK_COMPOSE[@]}" config --quiet
"${PK_COMPOSE[@]}" config > "$PK_BACKUP/effective-compose.yaml"
# Ten plik może zawierać istniejące sekrety środowiska; nie publikować go.
chmod 0600 "$PK_BACKUP/effective-compose.yaml"
"${PK_COMPOSE[@]}" build analytics
"${PK_COMPOSE[@]}" run --rm --no-deps --entrypoint python analytics -c '
import os, pathlib, sqlite3, tempfile
assert os.environ["PK_PRODUCT_DB"] == "/data/product.db"
assert pathlib.Path(os.environ["PK_APK_PATH"]).is_file()
with open(os.environ["PK_APK_PATH"], "rb") as apk: assert apk.read(1)
with tempfile.TemporaryDirectory(prefix=".pk-write-probe-", dir="/data") as folder:
    db=sqlite3.connect(folder+"/probe.db")
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("CREATE TABLE probe(value INTEGER)")
    db.commit(); db.close()
print("PASS APK read, SQLite/WAL write; uid/gid", os.getuid(), os.getgid())'
cp "$PK_CADDY_HOST" "$PK_BACKUP/Caddyfile.candidate"
printf '\nFragment do scalenia wewnątrz istniejącego bloku progresskit.pl:\n'
cat "$PK_RELEASE/deploy/Caddyfile.snippet"
"${EDITOR:-nano}" "$PK_BACKUP/Caddyfile.candidate"
```

W edytorze **scal**, nie zastępuj całego Caddyfile: dodaj zawartość fragmentu w
istniejącym bloku `progresskit.pl`. Zastąp istniejącą kopię handlera analityki, jeśli
już występuje — nie duplikuj nazw matcherów. Zachowaj dotychczasowy `root`, HTTPS,
inne domeny i trasy. Istniejące ogólne `try_files`/`file_server` umieść w końcowym
`handle { ... }`, aby nie przepisywały API. Nie używaj `file_server browse`.
Ta jedna czynność wymaga pełnej konfiguracji VPS; nie da się bezpiecznie
zautomatyzować scalenia nieznanego pliku. Po zapisaniu:

```bash
diff -u "$PK_BACKUP/Caddyfile" "$PK_BACKUP/Caddyfile.candidate" || test "$?" -eq 1
# Kandydat w kontenerze korzysta z tych samych certyfikatów, sieci i include'ów.
docker cp "$PK_BACKUP/Caddyfile.candidate" "$PK_CADDY:/tmp/progresskit-candidate.Caddyfile"
docker exec "$PK_CADDY" caddy validate --config /tmp/progresskit-candidate.Caddyfile --adapter caddyfile
```

Jeżeli istnieją relatywne `import`, walidacja z `/tmp` może zmienić ich bazę.
Wtedy przed kontynuacją użyj w kandydacie istniejących **absolutnych** ścieżek importów
i ponów walidację. Nie kontynuuj po błędzie.

### 4. Przełączenie tylko backendu produktu i plików strony

```bash
"${PK_COMPOSE[@]}" up -d --no-deps analytics
docker exec progresskit-analytics python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8091/health").read().decode())'
docker exec progresskit-analytics python owner.py count
# Zawartość katalogu public jest allowlistą. Bez --delete; katalog danych poza webroot.
cp -a "$PK_RELEASE/public/." "$PK_WEBROOT/"
# Zapis do istniejącego pliku zachowuje mount Caddyfile (nie podmieniaj inode przez mv).
cat "$PK_BACKUP/Caddyfile.candidate" > "$PK_CADDY_HOST"
docker exec "$PK_CADDY" caddy validate --config "$PK_CADDY_IN" --adapter caddyfile
docker exec "$PK_CADDY" caddy reload --config "$PK_CADDY_IN" --adapter caddyfile
```

Od tej chwili do kolejnych aktualizacji używaj tej samej bazowej konfiguracji z
produkcyjnym override. Zachowaj `PK_RELEASE/deploy/compose.override.yaml`; nie czyść
aktywnego release. Nie uruchamiaj `down -v`, nie usuwaj `/srv/progresskit/data`,
nie kopiuj na serwer lokalnej bazy `/tmp`. Container restart nie usuwa bind mountu.
Dockerfile domyślnie uruchamia proces jako root; test UID/GID powyżej sprawdza także
przypadek istniejącego override `user:`. Przy błędzie praw ustal rzeczywisty UID/GID;
nie stosuj `chmod 777` ani zbiorczego chown istniejącej bazy analityki.

### 5. Publiczna weryfikacja strony i jednego pobrania

```bash
PK_URL=https://progresskit.pl
PK_CHECK=$(mktemp -d /tmp/progresskit-public-check.XXXXXX)
curl --fail --silent --show-error "$PK_URL/glikemia-premium/" -o "$PK_CHECK/page.html"
grep -q 'Pobierz Glikemia Premium' "$PK_CHECK/page.html"
PK_BEFORE=$(curl -fsS "$PK_URL/api/glikemia/downloads" | jq -er '.downloads')
# Tylko jedno pobranie, bez --retry, bez dodatkowego wejścia przez drugi URL APK.
curl --fail --silent --show-error --dump-header "$PK_CHECK/apk.headers" \
  "$PK_URL/download/glikemia-premium" -o "$PK_CHECK/glikemia-premium.apk"
printf '%s  %s\n' 137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b "$PK_CHECK/glikemia-premium.apk" | sha256sum -c -
grep -i '^content-type: application/vnd.android.package-archive' "$PK_CHECK/apk.headers"
grep -i '^content-disposition: attachment;' "$PK_CHECK/apk.headers"
# Daj backendowi zakończyć commit po wysłaniu ostatniego bloku odpowiedzi.
sleep 1
PK_AFTER=$(curl -fsS "$PK_URL/api/glikemia/downloads" | jq -er '.downloads')
test "$PK_AFTER" -eq "$((PK_BEFORE + 1))"
# HEAD, prefetch i Range: brak wzrostu.
test "$(curl -sS -I -o /dev/null -w '%{http_code}' "$PK_URL/download/glikemia-premium")" = 405
test "$(curl -sS -H 'Sec-Purpose: prefetch' -o /dev/null -w '%{http_code}' "$PK_URL/download/glikemia-premium")" = 204
test "$(curl -sS -H 'Range: bytes=0-9' -o /dev/null -w '%{http_code}' "$PK_URL/download/glikemia-premium")" = 206
test "$(curl -fsS "$PK_URL/api/glikemia/downloads" | jq -er '.downloads')" -eq "$PK_AFTER"
"${PK_COMPOSE[@]}" restart analytics
for PK_TRY in {1..30}; do
  if curl -fsS "$PK_URL/api/glikemia/downloads" > "$PK_CHECK/restarted.json"; then break; fi
  sleep 1
done
test "$(jq -er '.downloads' "$PK_CHECK/restarted.json")" -eq "$PK_AFTER"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$PK_URL/downloads/")" = 404
```

Dokładne `+1` zakłada spokojne okno bez równoległych publicznych pobrań. Jeśli liczba
jest większa, sprawdź inne pobrania; **nie resetuj** licznika. Sprawdź również
portfolio, inne dotychczasowe trasy, mobile, SHA, galerię, formularz i disclaimer
w przeglądarce. Instalacja APK i skan QR na Androidzie pozostają ręcznymi testami.

### 6. Jedna opinia testowa, zatwierdzenie i usunięcie

```bash
PK_REVIEW_NAME="TEST-WDROZENIA-$(date -u +%Y%m%dT%H%M%SZ)"
PK_TOKEN=$(curl -fsS "$PK_URL/api/glikemia/review-token" | jq -er '.token')
sleep 4
jq -n --arg name "$PK_REVIEW_NAME" --arg token "$PK_TOKEN" \
  '{nickname:$name,rating:4,comment:"Techniczna opinia testowa wdrożenia. Zostanie usunięta.",version:"1.0",website:"",token:$token}' \
  > "$PK_CHECK/review.json"
curl --fail-with-body -sS -H "Origin: $PK_URL" -H 'Content-Type: application/json' \
  --data-binary @"$PK_CHECK/review.json" "$PK_URL/api/glikemia/reviews"
curl -fsS "$PK_URL/api/glikemia/reviews" | jq -e --arg n "$PK_REVIEW_NAME" 'all(.reviews[]; .nickname != $n)'
PK_REVIEW_ID=$(docker exec progresskit-analytics python owner.py pending | jq -sr --arg n "$PK_REVIEW_NAME" '.[] | select(.nickname==$n) | .id')
[[ "$PK_REVIEW_ID" =~ ^[0-9]+$ ]]
docker exec progresskit-analytics python owner.py approve "$PK_REVIEW_ID"
curl -fsS "$PK_URL/api/glikemia/reviews" | jq -e --arg n "$PK_REVIEW_NAME" 'any(.reviews[]; .nickname == $n)'
docker exec progresskit-analytics python owner.py delete "$PK_REVIEW_ID"
curl -fsS "$PK_URL/api/glikemia/reviews" | jq -e --arg n "$PK_REVIEW_NAME" 'all(.reviews[]; .nickname != $n)'
"${PK_COMPOSE[@]}" ps
docker logs --since 10m --tail 100 progresskit-analytics
docker logs --since 10m --tail 100 "$PK_CADDY"
```

Jeśli `pending` ma ponad 100 pozycji, najpierw rozpatrz kolejkę lub znajdź dokładny ID
w SQLite jako operator. Nigdy nie zatwierdzaj przypadkowego ID. Nie kopiuj logów
z cudzymi danymi do publicznych zgłoszeń. Sprawdź, czy inne warstwy proxy nie zapisują
żądań produktu mimo `log_skip`. Wynik testu zapisz w prywatnej notatce operatora.

### 7. Rollback bez cofania danych

Przy niepowodzeniu przywróć stary frontend/Caddy/backend. **Nie przywracaj starej
bazy nad nowszą**: utraciłoby to pobrania i opinie. Backup SQLite jest awaryjny;
normalny rollback kodu pozostawia obecną bazę na miejscu.

```bash
# Te same zweryfikowane zmienne z kroków 2–4. Zachowaj nowy katalog produktu poza webroot.
if test -d "$PK_WEBROOT/glikemia-premium"; then
  mv "$PK_WEBROOT/glikemia-premium" "$PK_BACKUP/failed-product-page"
fi
cp -a "$PK_BACKUP/public/." "$PK_WEBROOT/"
cat "$PK_BACKUP/Caddyfile" > "$PK_CADDY_HOST"
docker exec "$PK_CADDY" caddy validate --config "$PK_CADDY_IN" --adapter caddyfile
docker exec "$PK_CADDY" caddy reload --config "$PK_CADDY_IN" --adapter caddyfile
cp -a "$PK_BACKUP/backend/." "$PK_APP/"
PK_OLD_IMAGE=$(cat "$PK_BACKUP/previous-image.id")
printf 'services:\n  analytics:\n    image: "%s"\n' "$PK_OLD_IMAGE" > "$PK_BACKUP/rollback.override.yaml"
"${PK_BASE[@]}" -f "$PK_BACKUP/rollback.override.yaml" config --quiet
"${PK_BASE[@]}" -f "$PK_BACKUP/rollback.override.yaml" up -d --no-deps --no-build analytics
if test -f "$PK_BACKUP/previous.apk"; then
  cp "$PK_BACKUP/previous.apk" "$PK_APKS/glikemia-premium.apk.rollback"
  mv "$PK_APKS/glikemia-premium.apk.rollback" "$PK_APKS/glikemia-premium.apk"
fi
curl -fsS https://progresskit.pl/ -o /dev/null
docker exec progresskit-analytics python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8091/health").read().decode())'
docker logs --since 5m --tail 100 progresskit-analytics
```

Rollback zakłada brak niezgodnej migracji — ten release jedynie tworzy osobną bazę
i tabele, nie zmienia starych danych analytics. Przed rollbackiem upewnij się, że
stary obraz z `previous-image.id` nadal istnieje (`docker image inspect`).
Nie wykonuj prune obrazów lub danych w oknie wdrożenia.

GitHub Pages nadal publikuje tylko część statyczną; powyższy runbook dotyczy
kontrolowanego serwera Caddy, nie Pages.

## Podgląd i testy

```sh
python3 -m venv /tmp/progresskit-venv
/tmp/progresskit-venv/bin/pip install -r analytics/requirements.txt httpx
PK_PYTHON=/tmp/progresskit-venv/bin/python scripts/preview.sh
/tmp/progresskit-venv/bin/python -m unittest discover -s tests -v
node --check glikemia-premium/product.js
python3 -m compileall -q analytics tests scripts
git diff --check
```

- Strona główna: http://127.0.0.1:8092/
- Produkt: http://127.0.0.1:8092/glikemia-premium/
- Pobieranie: http://127.0.0.1:8092/download/glikemia-premium
- Licznik: http://127.0.0.1:8092/api/glikemia/downloads

Origin podglądu jest dokładnie `http://127.0.0.1:8092`; użycie localhost wymaga
zmiany PK_PUBLIC_ORIGIN. Podgląd nie serwuje repo jako katalogu statycznego.

Weryfikacja końcowa lokalna 2026-09-10:
- 12 testów unittest: PASS. Obejmują 48 równoległych pełnych odpowiedzi,
  HEAD/prefetch, Range/resume/If-Range, błąd odczytu, przerwany send, ucięte body,
  pasywny ruch strony, integralność, walidację, XSS, moderację i abuse.
- Pełny HTTP: PASS — rzeczywisty APK, count 0→1, restart procesu zachowuje 1.
- Docker build: PASS po poprawce końcowego `/` w wieloźródłowym COPY.
- Zbudowany backend: PASS import/health, odczyt APK, zapis SQLite/WAL, count=1;
  nowy kontener z tym samym bind mountem zachowuje 1; SQLite backup/quick_check PASS.
  Brak PK_PRODUCT_DB blokuje start, zamiast zapisywać w nietrwałej lokalizacji.
- Rzeczywisty lokalny Caddy → backend: PASS routing strony, API, obu ścieżek APK,
  MIME/disposition/hash, HEAD/Range/prefetch bez wzrostu, pełny GET +1, opinie pending,
  blokada katalogu downloads i prywatnych plików. log_skip usuwa tylko ruch produktu,
  log strony głównej pozostaje. Test bez połączenia z VPS.
- QR: istniejący plik PNG jest pikselowo identyczny z lokalnym kodowaniem
  oficjalnej strony produktu; nie zmieniono assetu. Fizyczny skan nadal ręczny.
- Chrome 1440×1000, 768×1024, 390×844, 320×740: PASS — brak overflow/błędów JS,
  wszystkie obrazy załadowane po przewinięciu, CTA nad foldem. SHA zawija się,
  formularz/disclaimer dostępne; QR jest celowo ukryty przy <=620 px.
- Formularz w Chrome: PASS wysłanie/moderacja, tekst HTML bez wykonania kodu,
  usunięcie syntetycznej opinii, nawigacja z homepage. Podgląd: 0 pobrań, 0 opinii.
- Node --check (produkt i inline JS portfolio), Python compileall, git diff --check,
  Bash -n wszystkich bloków runbooka: PASS. Poleceń produkcyjnych nie wykonywano.
- Lokalny Docker nie ma Compose: walidacja pełnego/scalonego Compose NIE WYKONANA.
  Nie ma repozytoryjnego skryptu frontend build/lint; użyto adekwatnych kontroli składni.
- Wcześniejsza odmowa auto-review restartu podglądu (limit usługi) ustąpiła po
  wskazanym czasie. Podgląd ponownie uruchomiony z ostatecznym kodem na 127.0.0.1:8092.
- Nadal ręcznie: mounty/uprawnienia i pełny Caddy/Compose na VPS, publiczny HTTPS,
  test instalacji/QR na Androidzie oraz bramki produkcyjne z runbooka.

## Stan Git po audycie

Bez stage/commit/push/tag/merge/deploy i bez dostępu do VPS. Wszystkie istniejące
zmiany zachowane; w tym audycie zmieniono tylko licznik/config bazy, Dockerfile,
blokadę katalogu downloads w Caddy, testy oraz ten runbook. Obrazy i UI bez zmian.

`git status --short`:

```text
 M .github/workflows/static.yml
 M .gitignore
 M README.md
 M analytics/Dockerfile
 M analytics/app.py
 M analytics/deploy/Caddyfile.snippet
 M analytics/deploy/compose.override.yaml
 M index.html
?? analytics/owner.py
?? analytics/preview.py
?? analytics/product.py
?? assets/projects/glikemia/product-history.webp
?? assets/projects/glikemia/product-language.webp
?? assets/projects/glikemia/product-measurement.webp
?? assets/projects/glikemia/product-qr.png
?? assets/projects/glikemia/product-report-pages.webp
?? assets/projects/glikemia/product-report-summary.webp
?? assets/projects/glikemia/product-social.jpg
?? docs/
?? downloads/
?? glikemia-premium/
?? scripts/
?? tests/
```

`git diff --stat` (nie obejmuje nowych plików):

```text
 .github/workflows/static.yml           |  5 +++--
 .gitignore                             |  3 +++
 README.md                              |  9 +++++++++
 analytics/Dockerfile                   |  4 ++--
 analytics/app.py                       |  9 +++++++++
 analytics/deploy/Caddyfile.snippet     | 30 ++++++++++++++++++++++++++++++
 analytics/deploy/compose.override.yaml |  4 ++++
 index.html                             | 15 ++++++++-------
 8 files changed, 68 insertions(+), 11 deletions(-)
```
