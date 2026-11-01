# Audyt statusów Mail, Lud&Pra i Glikemia — 23.10.2026

Zmieniono trzy wpisy `catalog/projects.json`: Mail → **Wersja testowa**, Lud&Pra → **Finalizacja**, Glikemia → **Dostępny APK**. Wszystkie trzy `updatedAt` i katalogowe `asOf` wskazują 2026-10-23. To data przeglądu stanu i potwierdzenia właściciela, bez deklaracji nowego commita lub ponowienia testów produktu.

Kontrola katalogu: **13 PASS / 0 FAIL**. Zachowano kolejność i tożsamość 14 projektów, pozostałe 11 rekordów oraz wszystkie sześć historycznych case studies. Funkcje, architektura, galerie, filmy, linki i routing tych trzech projektów pozostały bez zmian. Nie dodano publicznego URL APK Mail. Pełne wyniki, zakresy linii i SHA-256 25 plików źródłowych zawiera [project-status-audit.json](project-status-audit.json).

## Aktualny etap i tożsamość źródeł

Właściciel potwierdził w bieżącej rozmowie 23.10.2026 testową dojrzałość Android Mail, bliskie ukończenie Lud&Pra i udostępnienie APK Glikemia 1.0. Te deklaracje uzasadniają krótkie etykiety etapu obok istniejących dowodów technicznych. Nie stanowią nowych pomiarów audytora. Zachowano `coverage: partial`.

| Projekt | Właściwy checkout pod `/home/pawe/Pulpit/Projekty It/` | Odczytany HEAD |
| --- | --- | --- |
| Mail | `ProgressKit Mail` | `c9b669ce0a2cc8e5baff6125415f62afc4aeed29` |
| Lud&Pra | `progresskit-community` | `c64296e0dfd67182ec368a00432b4c2ea3b36968` |
| Glikemia | `Glikemia Premium` | `304292713f9d9fbda88d37715ec22f08f5c91de2` |

Właściwy checkout Community wskazuje `docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md:9–24`; nie zastępowano go sąsiednią kopią z zipów. Zastane zmiany dokumentacji Mail i Glikemii oraz nieśledzona dokumentacja/bootstrap Community pozostały zachowane. Raportów roboczych Mail nie przypisujemy w całości samemu HEAD.

## Mail: Android, wersja testowa

`ProgressKit Mail/docs/PRODUCTION_CLOSURE_REPORT.md:25–46,48–99` i `docs/SMTP_CLOSURE.md:3–25,48–58` zapisują dowody z **10.10.2026**: odczyt IMAP na Xiaomi, kontrolowaną wysyłkę do Gmail MX i pojedynczą kopię w serwerowych Wysłanych. Odbiór oraz SPF/DKIM/DMARC są potwierdzeniem właściciela, bez niezależnego odczytu nagłówków. Starsza sekcja PROVIDER-BLOCKED nie unieważnia późniejszego checkpointu SMTP.

Ten sam raport `:83–99` dokumentuje rzeczywisty przepływ **online Debug na Xiaomi**: LMTP → FCM → ten sam event Android → worker/synchronizacja → jeden prywatny alert. `:342–348` zapisuje podpisany Debug APK, aktualizację `install -r` i zachowanie tożsamości. Historyczny SHA-256 tego artefaktu: `d25b60acc68a6913b8ebd00bfaf8b45115e0beb8191950b48a52fc3d40f3d1e2`. Nie obliczano jego sumy ponownie w tym audycie. Techniczny Release QA pozostaje odrębny od produkcyjnego podpisanego wydania.

Kod transportów: `android/app/src/main/kotlin/pl/progresskit/mail/AppContainer.kt:120–121`; TLS: `android/data/src/main/kotlin/pl/progresskit/mail/data/mail/MailTransportPolicy.kt:6–35`; osobne wyniki SMTP/Sent: `android/data/src/main/kotlin/pl/progresskit/mail/data/local/RoomMailRepository.kt:174–206`. Szczegółowy wcześniejszy przegląd tych ścieżek: portfolio `docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md:55–82`.

Historyczne wyniki **219 Android PASS / 166 server PASS** zachowano z datą 10.10.2026, bez ponowienia. Otwarte pozostają pełna macierz FCM offline/po zakończeniu procesu, niezależne cofanie urządzenia, odbiór aktualnego recovery/Release oraz szersza macierz poczty. Blokad Windows/Wiola nie przeniesiono na Androida. Nie potwierdzono publicznego URL APK Mail.

## Lud&Pra: finalizacja przed publiczną betą

Główne moduły są podpięte w `progresskit-community/src/api/Program.cs:94–107`. Endpointy potwierdzają konta (`Auth/AuthEndpoints.cs:18–23`), społeczności (`Communities/CommunityEndpoints.cs:17–26`), posty i komentarze (`Content/ContentEndpoints.cs:17–30`), media (`Media/MediaEndpoints.cs:26–33`) i moderację (`Moderation/ModerationEndpoints.cs:18–29`). To istniejąca implementacja, którą odzwierciedla deklaracja właściciela o bliskim ukończeniu.

`docs/COMMUNITY_DISCOVERY_CLOSURE_AUDIT.md:68–101` zapisuje **14.10.2026**: backend **286 PASS**, frontend **154 PASS**, przeglądarka na izolowanym fixture **170 PASS**, zwykły smoke **24 PASS / 5 SKIP**. Wyników nie powtarzano 23.10 ani nie przedstawiono jako testów produkcyjnych lub fizycznego telefonu. Poszczególnych bramek nie dodawano do jednego licznika.

Nieśledzony `docs/bootstrap/LUDPRA_INITIALIZATION.md:1–5,13–31,36–47` dokumentuje inicjalizację **wcześniejszej publicznej instancji** przez API 14.10: trzy grupy i dziewięć publikacji. To źródło historycznego faktu istnienia instancji, bez deklaracji aktualnej aktywności społeczności lub wdrożenia najnowszego kandydata. Nie opisujemy produktu jako nigdy niewdrożonego.

Konkretne bramki finalizacji: lokalny `src/web/src/legal/legal-documents.json:1–3` nadal ma `published=false`; `src/api/Program.cs:50–55` blokuje start produkcyjny z niezatwierdzonym katalogiem. `src/api/Auth/ProductionConfiguration.cs:33–39` wymaga co najmniej dwóch różnych zatwierdzonych moderatorów, a rzeczywiste konta i status wymagają osobnego odbioru. `docs/PRODUCTION_READINESS.md:21–40` wskazuje bramki prywatności/dostawców i wydania. Historycznych liczb moderatorów/użytkowników nie uznano za bieżący stan. Pozostają odbiór moderacji oraz najnowszego wydania i wdrożenia.

## Glikemia: udostępniony APK 1.0

`downloads/glikemia-premium.json:1–7` identyfikuje APK **1.0 (1)**, minSdk 24, **80 235 954 B**, SHA-256 **137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b**. W tym audycie ponownie obliczono wyłącznie rozmiar i SHA-256 lokalnego pliku: zgodne. Zapis `docs/evidence/visual-acceptance-v2-20261022/security/apk-integrity.json:1–15` potwierdza wcześniejszy PASS CRC ZIP i podpisów V2/V3 z 22.10; nie jest nowym testem Android runtime.

Historyczny odczyt publiczny **15.10.2026**: `docs/evidence/progresskit-v5/public-http.json:9–28` — strona/API 200; `public-apk-range.json:1–9` — APK 206 i 32 B, łączny rozmiar 80 235 954 B. Nie weryfikował pełnej sumy pliku publicznego ani instalacji. Udostępnienie APK potwierdza także aktualna deklaracja właściciela. Nie wykonywano nowego odczytu HTTP/VPS.

`Glikemia Premium/docs/QA_LOG.md:331–359,382–400` zapisuje wcześniejsze **62 PASS / 0 FAIL / 0 SKIPPED** z 9.09.2026 oraz wąski pozostały odbiór dostępności/lokalizacji. `docs/RELEASE_CHECKLIST.md:61–98` zachowuje osobne bramki prywatności, finalnego kandydata i Google Play. Udostępniony APK nie jest deklaracją publikacji w Play ani Stable/Commercial.

## Weryfikacja i ograniczenia

Wykonano odczyt Git, źródeł i raportów, walidator katalogu bez generowania HTML, porównanie rekordów oraz lokalny rozmiar/SHA-256 APK Glikemia. Nie uruchamiano testów lub buildów produktów, urządzeń, poczty/FCM, Windows GUI, usług, baz, migracji ani VPS; nie odczytywano sekretów. Bez commit/push/deploy.

Pierwsza pomocnicza kontrola dat miała **11 PASS / 1 fałszywy FAIL**, ponieważ wymagała słowa „nie”, odrzucając poprawne „bez ponowienia”. Skorygowano wyłącznie probe, zachowując historię w JSON. Końcowy pełny probe ma **13 PASS / 0 FAIL**, z dodatkową kontrolą lokalnego APK. Nie dopasowywano opisu produktu do błędnego probe. Pierwsza próba zapisu raportu przerwała się przed wykonaniem Pythona przez kolizję delimitera heredoc; nie zmieniła katalogu ani źródeł. Zapis ponowiono z unikalnym delimiterem.

Agent `domain_audit` osobno zgłosił po zapisie katalogu: catalog validation **33 PASS**, delivery **15 PASS**, hologram Node **17 PASS**. To wyniki tamtego agenta, bez deklaracji uruchomienia testów produktów przez autora niniejszego audytu.

Polecenia do odtworzenia głównych kontroli offline, bez zapisu HTML:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 - <<'PY'
import importlib.util, json, subprocess
from pathlib import Path
after = json.loads(Path('catalog/projects.json').read_text())
before = json.loads(subprocess.check_output([
    'git', 'show', '9322e4e4b35be58517fbf7073c8015673770ef43:catalog/projects.json'
], text=True))
bp = {p['id']: p for p in before['projects']}
ap = {p['id']: p for p in after['projects']}
changed = {'progresskit-mail': 'Wersja testowa',
           'progresskit-community': 'Finalizacja',
           'glikemia-premium': 'Dostępny APK'}
assert len(ap) == 14 and list(bp) == list(ap)
assert all(bp[k] == ap[k] for k in bp if k not in changed)
assert all(ap[k]['stage'] == stage and ap[k]['updatedAt'] == '2026-10-23'
           for k, stage in changed.items())
assert all(bp[k]['cases'] == ap[k]['cases'] for k in changed)
assert ap['progresskit-mail']['links'] == []
assert after['asOf'] == '2026-10-23'
spec = importlib.util.spec_from_file_location('builder', 'scripts/build-site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
assert builder.validate_catalog(after) == []
print('PASS: schema, 14 projects, 11 unchanged, cases, stages, dates, no Mail URL')
PY
sha256sum downloads/glikemia-premium.apk
git diff --check -- catalog/projects.json docs/evidence/status-and-assets-v3-20261023/project-status-audit.md docs/evidence/status-and-assets-v3-20261023/project-status-audit.json
```

Początkowy SHA-256 katalogu: `2d96a6b5fec190c2da32b28aa3a1ba2f3b491066664ce0620a9d7c70bf3da07d`.

Końcowy SHA-256 katalogu: `256754522120d6780ac1f4a1ef0a3a83b21987478f3cace09a022bed11ef4622`.
