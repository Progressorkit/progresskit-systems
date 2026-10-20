# ProgressKit V5 — wydanie, publikacja i rollback

Stan: PARTIAL / NOT DEPLOYED / OWNER VISUAL APPROVAL OPEN.
Nie opublikowano nowego wyglądu. Nie wykonano push, restartu usług, migracji ani zmian VPS.
Publiczny odczyt 15.10.2026 potwierdził działającą V4, nie wdrożenie V5.

Obowiązuje korekta właściciela z 15.10.2026:
`PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md`. Jej końcowe polecenie brzmi:
„Nie publikuj nowego wyglądu produkcyjnie, dopóki jego kompozycja nie zostanie
zaakceptowana przez właściciela.” Jest to jawna nowa bramka publikacji.
Wynik testów i przygotowanie paczki nie zastępują akceptacji.

## Ścieżki zastane

- `main` na GitHub uruchamia workflow `.github/workflows/static.yml` i GitHub Pages.
- progresskit.pl obsługuje także API i pobieranie; samo Pages nie uruchamia FastAPI.
- Dostępne są tylko fragmenty Caddy i Compose, nie pełna konfiguracja ani mounty VPS.
- Pełny proces dystrybucji Glikemii opisuje historyczny `GLIKEMIA_DISTRIBUTION.md`.
- Zdalny main odczytany przez `git ls-remote`: a36969be91c0f969842a6bb3ed164729d4b09168.

Nie wolno traktować push/Pages jako dowodu aktualizacji domeny progresskit.pl.

## Bramki przed publikacją

| Bramka | Stan |
| --- | --- |
| Walidacja katalogu, generowania i statycznych odwołań | Wcześniejszy zakres PASS lokalnie; wynik po korekcie zapisać oddzielnie w raporcie testów |
| Regresja API oraz syntetyczna analityka | PASS wcześniejszego zakresu lokalnego; korekta kompozycji nie jest nowym testem API |
| Publiczny allowlist i brak źródeł/PII w 9 wybranych obrazach | PASS w zakresie wykonanych kontroli; ponownie sprawdzić manifest nowej paczki |
| Źródłowy krajobraz hero: góry, księżyc i mur/skała | ODNALEZIONY / REVIEWED_EDIT — autoryzowana edycja źródła, oględziny i integracja; nie jest już brakiem pliku |
| Finalna kompozycja i akceptacja właściciela | **REQUIRED / OPEN — BLOKUJE PUBLIKACJĘ**; `ownerVisualApproval:OPEN` |
| Browser: desktop/mobile, hover, showroom 360° i hologram, tap, focus, galeria i pojedynczy brief | **OPEN / NOT RUN** — brak dostępnej przeglądarki |
| Lighthouse i rzeczywiste CWV | OPEN / NOT RUN |
| Pełny audyt WCAG 2.2 AA | OPEN / NOT RUN |
| Aktualna pełna konfiguracja serwera, backup i próba rollbacku | NOT RUN — brak dowodów operatora |
| Retencja analityki i logi wszystkich warstw | DO POTWIERDZENIA |

Pozostawiono lokalnego kandydata, ponieważ bramki nie są zamknięte. Nie ma podstaw
do automatycznego wdrożenia ani oznaczenia RELEASE READY. Nie uruchamiaj workflow
publikacyjnego ani pushu do gałęzi automatycznie publikującej ten wygląd przed
akceptacją kompozycji przez właściciela. Testy bez interfejsu nie zamykają bramki
wizualnej. Sam brak odpowiedzi właściciela nie oznacza akceptacji.

Konfiguracja wskazuje `assets/brand/hero-landscape-v5.webp`, a
`heroSourceStatus` ma `REVIEWED_EDIT`. Właściciel osobno upoważnił do usunięcia
wtopionego UI ze wskazanej makiety. Odtworzenie zasłoniętych pikseli opisuje
`PROGRESSKIT_V5_HERO_ASSET.md`; nie należy nazywać wyniku kopią identyczną pikselowo.
Oryginalne miedziane PK używa niezmienionego `progressorkit-stamp.png`.
Oględziny plików nie są akceptacją całego hero w przeglądarce.

`python3 scripts/check-publication.py` sprawdza wyraźny stan `APPROVED` i gotowy
asset `REVIEWED_EDIT`. Workflow `.github/workflows/static.yml` uruchamia ten skrypt
przed stagingiem/publikacją. Obecny `ownerVisualApproval: OPEN` powoduje oczekiwaną
odmowę z kodem 1. Nie zmieniaj konfiguracji na APPROVED z powodu zaliczenia testów.

## Przygotowanie artefaktu

```sh
python3 scripts/build-site.py --check
node --check assets/site-v5.js
node --check glikemia-premium/product.js
node --test tests/catalog-filters.test.cjs
# W środowisku z zależnościami testowymi:
python -m unittest discover -s tests -v
python3 scripts/package-release.py /tmp/progresskit-v5-release
```

Wybierz nowy, nieistniejący katalog. Paczka zawiera `public/`, publiczny tar.gz,
`files.json`, `SHA256SUMS` i `release.json`. Manifest identyfikuje źródłowy Git HEAD,
stan zmian roboczych oraz hash katalogu. Nigdy nie utożsamiaj SHA bazowego HEAD
z zawartością niezatwierdzonego working tree.

Archiwum jest deterministyczne: posortowane pliki, stały czas i prawa, brak UID
operatora. Sprawdź SHA i zgodność plików po rozpakowaniu. Nie przenoś na serwer całego
repozytorium. Nie kopiuj lokalnych baz ani ponownie nie podpisuj istniejącego APK.

Po korekcie konieczna jest nowa generacja i nowa paczka, obejmująca także
`projekty/index.html`, generowane `assets/hero.css` i wybrany krajobraz hero.
Odczytaj rzeczywistą liczbę plików z nowego allowlistu i manifestu;
nie kopiuj starego wyniku jako dowodu nowego kandydata. `catalog/brand.json` pozostaje
źródłem konfiguracji; do publicznego zestawu trafia wygenerowany CSS, a nie dokumentacja
lub lokalne źródła audytu.

## Kontrola przeglądarkowa do wykonania

Aktualna pełna instrukcja: [VISUAL_ACCEPTANCE](PROGRESSKIT_V5_VISUAL_ACCEPTANCE.md). Obejmuje pełny kamienny H1, relief PK w murze, showroom 360°, gesty, filtry, hologram, focus/Escape, reduced motion, podstrony, galerie i jeden brief. Lokalne preview najnowszej iteracji używa portu 8093; poprzedniego serwera 8092 nie zatrzymywano. Prawidłowe uruchomienie na wybranym porcie: `PK_PREVIEW_PORT=8093 PK_PYTHON=/ścieżka/do/venv/bin/python sh scripts/preview.sh`.

Nie oznaczaj tych kontroli jako PASS na podstawie testu struktury lub syntaktyki. Nie zapisuj ownerVisualApproval jako zatwierdzonego wyłącznie dlatego, że generator lub testy zakończyły się powodzeniem.

## Wdrożenie po zamknięciu bramek

Ten etap wolno rozpocząć dopiero po wyraźnej akceptacji kompozycji przez właściciela
oraz zamknięciu pozostałych wymaganych kontroli. Zapisz datę, zakres zatwierdzonego
podglądu i hash kandydata. Zmiana hero lub istotnej kompozycji po akceptacji wymaga
ponownego sprawdzenia, czy decyzja obejmuje nowy rezultat. Obecnie taka akceptacja
nie została udzielona i niczego nie opublikowano.

Najpierw operator ustala rzeczywisty webroot, mounty i aktualny Caddyfile. Zachowuje
kopię poprzedniego publicznego wydania, konfiguracji i bieżącego SHA. Jeżeli planuje
zmiany usług, wykonuje spójny backup SQLite przez backup API z uwzględnieniem WAL.
Ta zmiana frontendu nie wymaga migracji ani przebudowy backendu.

Prześlij jedynie sprawdzony artefakt i manifest do nowego katalogu wydania. Zweryfikuj
hash po przesłaniu. Porównaj konfigurację z `analytics/deploy/Caddyfile.snippet`:
publiczne są tylko istniejące POST zdarzeń i trasy API produktu. `/summary`, `/health`,
docs, katalog i źródła nie powinny trafiać do publicznego backendu.

Dla statycznych case studies stosuj istniejący `file_server` z rzeczywistym 404,
bez globalnego fallbacku wszystkich adresów do homepage. Poza aktualnymi handlerami
API ustaw politykę CSP dla dokumentów V5: default-src/script-src/style-src/img-src/
connect-src 'self', object-src/base-uri/frame-ancestors/form-action 'none'. Sprawdź
przy tym osobno wymagania istniejącej strony Glikemii i jej formularza.

Uruchom `caddy validate` na pełnej, rzeczywistej konfiguracji w istniejącym kontenerze.
Dobierz przełączenie katalogu do faktycznych mountów: nie zakładaj, że zmiana symlinka
automatycznie zmieni bind mount. Nie restartuj niepowiązanych kontenerów i nie usuwaj
wolumenów. Wykonaj wyłącznie zatwierdzoną zmianę konfiguracji lub webroota.

Po dozwolonej publikacji sprawdź HTTPS `/`, `/projekty/`, wszystkie `/projekty/<slug>/`, oba stare adresy
produktów, sitemap, robots, assets i rzeczywisty 404. Potwierdź odmowę dostępu do
źródeł i dashboardu. Dla APK użyj Range, nie generuj sztucznych pełnych pobrań.
Test zapisu zdarzenia wykonaj kontrolowanie z operatorem, a nie na podstawie health.

## Rollback

Zachowaj poprzednie wydanie aż do zakończenia smoke testów. Przy błędzie przywróć
poprzedni webroot zgodnie z faktycznym sposobem montowania. Jeżeli zmieniono Caddy,
przywróć wyłącznie jego poprzednią konfigurację, ponownie validate i dopiero reload.
Nie przywracaj bazy z backupu przy rollbacku statycznego frontendu — utraciłbyś nowe
opinie i liczniki. Potwierdź działanie poprzednich stron i API. Nie używaj force push
ani resetowania głównego working tree jako mechanizmu rollbacku produkcji.
