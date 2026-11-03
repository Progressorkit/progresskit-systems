from pathlib import Path
import json,datetime,hashlib
out=Path(__file__).resolve().parent
fresh=json.loads((out/'fresh-tests.json').read_text())
source=json.loads((out/'pdb-source-freshness.json').read_text())
records=[d for item in source for d in item['documents']]
unique={d['path']:d for d in records}
summary={'pdbFiles':len(source),'documentRecords':len(records),'matchingDocumentRecords':sum(d['match']for d in records),'sourceMismatches':sum(d['exists']and not d['match']for d in records),'uniqueExistingMatchingFiles':sum(d['match']for d in unique.values()),'unavailableGeneratedDocuments':[d['path']for d in unique.values()if not d['exists']],'scope':'New tests executed prebuilt Release assemblies; not a fresh product rebuild. All available repo-source PDB document hashes match; absent generated documents are not a claimed source verification.'}
native_file=out/'fresh-native-tests.json';native=json.loads(native_file.read_text())if native_file.exists()else None
advisory_file=out/'fresh-advisory-query.json';advisory=json.loads(advisory_file.read_text())if advisory_file.exists()else None
operator_file=out/'operator-source-observation.json';operator_source=json.loads(operator_file.read_text())if operator_file.exists()else None
sast_file=out/'fresh-sast.json';sast=json.loads(sast_file.read_text())if sast_file.exists()else None
owner_delivery={'date':'2026-11-02','provenance':'OWNER_REPORTED','statement':'Owner confirms sending/receiving works and required ports are unblocked.','independentPASS':False,'sourceRevisionAndRuntimeNotIndependentlyCorrelated':True,'furtherAccountMailAndPortTests':'STOP requested explicitly by owner; no more account, IMAP/SMTP or port probes.'}
matrix=[
 {'platform':'Android','implementation':'IMPLEMENTED; source audit confirms IMAP/SMTP, MIME, Room, Keystore and FCM.','freshChecks':['Existing Debug APK cryptographic verification PASS (v2).','Existing Release candidate signature FAIL / DOES NOT VERIFY: the file is explicitly unsigned.','No new Android JVM/build/device run.'],'historical':'219 JVM PASS on 2026-10-27; physical Xiaomi Debug IMAP/SMTP/Sent and online FCM evidence from2026-10-10.','notRun':['Final production Release/Firebase/API configuration','Physical update/install/runtime/FCM lifecycle acceptance'],'commercialGate':'BLOCKED','needed':['Produce correct signed Release without bypassing configuration guards.','Acceptance of the concrete signed Android Release, installation/update/restart and FCM lifecycle; no further mail-account/delivery tests in this task.']},
 {'platform':'Linux','implementation':'IMPLEMENTED Avalonia client, shared mail engine, protected storage, drafts/attachments and account isolation.','freshChecks':['Core: 271 PASS / 0 FAIL / 14 notExecuted.','Linux UI/MVVM: 106 PASS / 0 FAIL / 4 notExecuted.','Linux security: 40 PASS / 0 FAIL / 1 notExecuted.','DEB metadata 1.0.0-10 amd64; current artifact hashes inspected.'],'historical':'2026-10-27 host upgrade 1.0.0-9 → 1.0.0-10 and launcher documented; not rerun today.','notRun':['Native GUI install/upgrade/start with isolated display (Xvfb unavailable; personal display/profile not used)','GUI and protected local-state restoration after restart for the exact client package/version'],'commercialGate':'PARTIAL LOCAL EVIDENCE; NOT APPROVED FOR PAYING USERS','needed':['Accept the exact Linux client package/version for GUI, installation, upgrade, restart and protected local-state restoration; no generic SMTP repeat or new account.','Trusted distribution/update policy and explicit support scope.']},
 {'platform':'Windows','implementation':'IMPLEMENTED WPF and DPAPI/CNG adapters; shared Core exercised on Linux.','freshChecks':['Shared Core: 271 PASS is cross-platform logic evidence, not WPF runtime.','Installer EXE and portable main EXE have no Authenticode certificate table.'],'historical':'WPF cross-build/publish and package audits documented; current source snapshot: 195 files matches manifest.','notRun':['Windows 11 installation/upgrade','WPF GUI, DPAPI/CNG adapters and protected local-state restoration for the exact client build','Physical Windows Hello acceptance'],'commercialGate':'BLOCKED','needed':['Dedicated Windows 11 runtime and negative/security acceptance.','Distribution signing and update policy.']},
 {'platform':'Backend/API','implementation':'IMPLEMENTED durable enrollment/recovery/revoke and fail-closed password-change capability/API.','freshChecks':['190 PASS / 0 FAIL / 11 notExecuted from existing Release assembly; in-memory/synthetic API and unit tests.','Targeted architecture/secret-boundary assertions included.'],'historical':'201 PASS including 11 isolated PostgreSQL tests and 11 post-restore tests documented on 2026-10-27.','notRun':['PostgreSQL/migrations/backup-restore (outside this bounded task)','Current production deployed revision/grants','Actual password-change provider propagation'],'commercialGate':'BLOCKED FOR PRODUCTION ROLLOUT','needed':['Reconcile actual deployed configuration and migration/grant requirements.','Password-change defaults currently use Unavailable providers; validate real provider only after separate rollout approval.']},
 {'platform':'Mail server / hosting','implementation':'Existing Postfix/Dovecot/DMS integration; distinct from the client product.','freshChecks':['Owner confirms current sending/receiving and unblocked ports on 2026-11-02 (OWNER_REPORTED); service state accepted for this task.','No further account, IMAP/SMTP, delivery or mail-port checks requested or performed after owner STOP.'],'historical':'Controlled 2026-10-10 SMTP/Gmail acceptance and owner-reported receipt/SPF/DKIM/DMARC; not current availability/SLA proof.','notRun':['Production backup/restore, monitoring and incident drills','Retention, incident/support responsibility and hosting SLA/offer scope','Current backend password-change provider readiness and deployed revision, separate from ordinary mail delivery'],'commercialGate':'OWNER_REPORTED DELIVERY ACCEPTED; HOSTING OPERATIONS/SLA SCOPE OPEN','needed':['Accept owner-confirmed sending/receiving for this task; no further mail/account/port tests.','Operational evidence and owner-approved service/legal/support scope.']}
]
formal=[
 {'topic':'Operator identity and consumer information','status':'UNKNOWN / owner input required','check':'Confirm the actual operator identity, service address and applicable contact/consumer information. Brand name is not evidence of registered legal identity.','sources':['https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/','https://biznes.gov.pl/pl/portal/00146']},
 {'topic':'Privacy and retention','status':'PARTIAL / review needed','check':'Existing technical privacy notice is not a complete formal release gate. Confirm controller identity, processing purposes/bases, retention period or criteria and relevant rights.','sources':['https://uodo.gov.pl/pl/676/4260','https://uodo.gov.pl/pl/493/2254']},
 {'topic':'Licenses, terms, support and billing','status':'UNKNOWN / review needed','check':'Bundled third-party notices exist; they do not grant a product license. Confirm product terms, rights/obligations, billing/support scope and client-versus-hosting offer.','sources':['ProgressKit Mail/windows/installer/THIRD-PARTY-NOTICES.txt','ProgressKit Mail/docs/LINUX_PACKAGING.md']}
]
report={'auditDate':datetime.date.today().isoformat(),'decision':'NOT COMMERCIAL RELEASE APPROVED','newTests':fresh,'nativeFollowups':native,'sourceFreshness':summary,'matrix':matrix,'securityScanning':{'secretRegexScan':json.loads((out/'secret-scan.json').read_text()),'SAST':'PARTIAL: targeted architecture/security assertions and code review; no complete SAST tool run claimed.','SCA':'INVENTORY ONLY: 64 NuGet resolved/locked and 27 direct Maven coordinates. No fresh vulnerability advisory query. Android transitive graph/native OS libraries not fully inventoried.','licenses':'NOTICES/licenses are present; no complete commercial-rights clearance claimed.'},'formalReviewChecklist':formal,'safeOfferProposal':{'currentDecision':'Owner-confirmed mail sending/receiving is accepted for this task. Unrestricted client release and hosting SLA still depend on exact client/platform, distribution, operational and formal scope.','conditionalFirstOffer':'Consider an invitation-only supported pilot of a named/versioned Linux client package after GUI, installation/upgrade/restart, protected local-state handling, safe distribution/update/support and formal gates are closed. Accept OWNER_REPORTED mail service delivery; do not repeat generic SMTP or create a new account in this task. Specify supported providers and exclude unverified Windows/Gmail OAuth and hosting SLA guarantees.','conditions':['Respect owner STOP: no further account, IMAP/SMTP, delivery or mail-port tests; no private correspondence or personal-profile access.','Do not describe unit/synthetic transport results as live deliverability.','Do not bypass Android Release, password-provider or Google OAuth guards.','Separate client software from operated mailbox hosting, backup and incident response.']},'productionActions':'NONE by this child audit','siblingSourcesModified':False,'limits':['No product rebuild was performed.','Concrete Windows/Android native-client, GUI/install/upgrade/restart and backend DB/provider checks remain outside executed evidence. Mail service operation is accepted from OWNER_REPORTED confirmation; further delivery/account/port testing is excluded.','Formal links are a review checklist based on root official-source research, not legal certification.']}
if advisory:
 assert advisory['inventorySHA256'] == hashlib.sha256((out/'dependency-inventory.json').read_bytes()).hexdigest(), 'Advisory inventory hash mismatch'
 report['securityScanning']['SCA'] = 'PARTIAL FRESH OSV QUERY: 91 inventoried coordinates queried, 91 responses, zero advisory matches on 2026-11-02. 64 NuGet resolved/locked and 27 direct Maven. Not complete Android transitive graph, OS library assessment or full security clearance.'
 report['securityScanning']['freshAdvisoryQuery'] = advisory
if sast:
 report['securityScanning']['SAST'] = 'PARTIAL EXECUTED: fresh Semgrep CE1.183.0 OSS offline scan;548 actual vendor security rules on258 targets,14 findings (13ERROR/1INFO),26 PartialParsing warnings (25C#/1shell), exit1 retained. No full SAST PASS, suppression or source changes.'
 report['securityScanning']['freshSAST'] = {k:sast[k] for k in ('status','scanner','version','engine','exitCode','configuredVendorSecurityRules','rulesActuallyRun','targetsScanned','findingsCount','severityCounts','parserWarnings','sourceFilesUnchangedAfterScan')}
 report['securityScanning']['freshSAST']['evidenceFile'] = 'fresh-sast.json'
 report['limits'].append('Fresh SAST executed with retained findings and parser coverage limits; no full security clearance. No changes to product source or ignored findings.')
report['userConfirmedMailDelivery20261102'] = owner_delivery
report['mailServiceScopeDecision'] = 'Owner-confirmed sending/receiving and unblocked ports are accepted as the service state for this task (OWNER_REPORTED). Earlier independent-audit limits do not imply service failure. Further account, IMAP/SMTP, delivery and mail-port testing is excluded.'
report['scopeAfterOwnerSteering'] = 'No further mail accounts, IMAP/SMTP, test deliveries or mail port probes; owner requested STOP. Continue website/video only.'
if operator_source:
 report['operatorSourceObservation'] = operator_source
 formal[0]['status'] = 'DATA_SOURCE_FOUND; owner-directed local reuse; final publication/current correctness pending'
 formal[0]['check'] = 'Existing Lud&Pra legal source contains operator name, address and contact; published=false. Owner directed use of the same local data. Current correctness, applicable DE jurisdiction/offer scope and final publication still require review; do not infer registered legal identity or legal compliance.'
 formal[0]['privateSource'] = 'progresskit-community/src/web/src/legal/legal-documents.json'
 matrix[4]['ownerReportedCurrentState'] = owner_delivery
 for row in matrix:
  row['mailServiceScope'] = 'Service sending/receiving accepted as OWNER_REPORTED; no further delivery/account/IMAP/SMTP/mail-port testing in this task.'
 matrix[4]['needed'] = ['Respect explicit owner stop: no further account/IMAP/SMTP/port/delivery tests.','Keep independent operational/revision evidence separate from owner-confirmed current delivery; complete distribution/support/formal offer scope locally.']
(out/'readiness-matrix.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

if native:
 matrix[1]['freshChecks'] += ['Separate isolated follow-ups: trusted loopback TLS 14 PASS, private-bus notifications 4 PASS, native keyring 4 mode executions PASS. GUI acceptance of a concrete installed client build was outside this run; current mail operation is accepted from the owner report.']
 report['nativeInterpretation'] = '22 additional executions: 14 transport tests, 4 notification tests and one native keyring test exercised in four modes. Do not relabel original TRX skips or count keyring modes as four distinct test cases.'
 report['remainingNewTestGates'] = '11 PostgreSQL tests remain not executed in this bounded task; exact client GUI/install/upgrade/restart, Windows/Android runtime and backend provider/operations are separate gates. Mail operation is accepted as OWNER_REPORTED; no further account/delivery/port tests.'
 report['matrix'] = matrix
 (out/'readiness-matrix.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
lines = [
 '# ProgressKit Mail — preflight komercyjny, 2026-11-02',
 '',
 '**Status: pełne wydanie komercyjne wymaga domknięcia konkretnych wersji klientów, dystrybucji i zakresu oferty.** Stan usługi pocztowej przyjęto zgodnie z potwierdzeniem właściciela z 02.11.2026: wysyłka i odbiór działają, porty są odblokowane (OWNER_REPORTED). Wysyłka, konta, IMAP/SMTP i porty nie są przedmiotem dalszego testowania w tym zadaniu. Otwarte pozostają GUI/instalacja/upgrade/restart wskazanych pakietów klientów, platformowe DPAPI/CNG/FCM i unsigned Release, backend provider/DB, bezpieczna dystrybucja oraz kwestie operacyjne i formalne.',
 '',
 '## Nowe testy lokalne',
 '',
 'Pierwsza próba w sandboxie zatrzymała się przed wykonaniem testów przez odmowę lokalnego IPC VSTest. Dowody pozostają w `sandbox-attempt/`; nie jest to błąd produktu. Zaakceptowane ponowienie wykonało kopie istniejących zestawów Release w prywatnych katalogach tymczasowych/XDG. Nie wykonywano nowego builda, restore, instalacji, logowania na rzeczywiste konto ani migracji bazy.',
 '',
 '| Zestaw | PASS | FAIL | Niewykonane |',
 '|---|---:|---:|---:|'
]
for item in fresh['suites']:
 lines.append(f"| {item['suite']} | {item.get('passed',0)} | {item.get('failed',0)} | {item.get('notExecuted',0)} |")
lines += [
 '',
 'Bazowe wykonanie daje 607 PASS / 0 FAIL / 30 niewykonanych. Zachowano oryginalne TRX i ich warunki: 14 testów zaufanego lokalnego TLS, 4 powiadomień D-Bus, 1 natywnego keyringu i 11 PostgreSQL. Oddzielne wykonania poniżej nie zmieniają tych plików ani ich historycznych liczników.',
 '',
 '### Oddzielne testy natywne w izolacji',
 ''
]
if native:
 labels = {'keyring-locked':'Keyring: zablokowany','keyring-restart':'Keyring: odczyt z nowego procesu','keyring-unavailable':'Keyring: usługa niedostępna','keyring-unlocked':'Keyring: odblokowany','notifications':'Powiadomienia: prywatny D-Bus','trusted-loopback':'IMAP/SMTP: zaufany TLS na loopback'}
 lines += ['| Scenariusz | PASS | FAIL | Niewykonane |','|---|---:|---:|---:|']
 for item in native['results']:
  label=labels.get(Path(item['path']).parent.name,item['path'])
  lines.append(f"| {label} | {item['passed']} | {item['failed']} | {item['notExecuted']} |")
 lines += ['', 'To 22 dodatkowe wykonania: 14 testów transportu, 4 powiadomień i jeden test keyringu uruchomiony w czterech trybach. Nie są to cztery różne testy keyringu. Baza PostgreSQL nadal ma 11 niewykonanych testów.', '', 'Transport użył istniejącego fixture: efemeryczne CA, certyfikat serwera i CRL oraz zaufanie ograniczone do procesu. Zmieniono wyłącznie uruchomienie testów na istniejącą DLL; nie wyłączano walidacji TLS, weryfikacji unieważnienia ani nie dodawano CA do zaufania systemowego. Keyring pracował w nowej sesji D-Bus, z prywatnym XDG i syntetycznymi danymi; nie użyto keyringu użytkownika. Powiadomienia testowano na prywatnej magistrali bez katalogów aktywacji usług.', '']
else:
 lines += ['Testy natywne oczekują na wykonanie; nie przypisano im nowego PASS.','']
lines += [
 '## Powiązanie ze źródłami i artefaktami',
 '',
 f"Sprawdzono {summary['pdbFiles']} plików portable PDB: {summary['matchingDocumentRecords']} rekordów dokumentów odpowiadają aktualnym bajtom, {summary['sourceMismatches']} rozbieżności. Obejmuje to {summary['uniqueExistingMatchingFiles']} unikalnych dostępnych plików źródeł. Pięć wirtualnych plików generatorów `.g.cs` nie występuje na dysku i nie otrzymuje statusu zweryfikowanych źródeł. To powiązanie wcześniej zbudowanych DLL ze źródłami, a nie świeży rebuild produktu.",
 '',
 'Manifest 195 plików desktopu odpowiada aktualnym plikom. SHA-256 faktycznie wykonanych DLL znajdują się w `fresh-tests.json`, szczegóły PDB w `pdb-source-freshness.json`. Stan Git repo Mail po bazowym wykonaniu nie zmienił się. Manifest desktopu nie obejmuje wszystkich testów i backendu; dlatego nie zastępuje osobnej weryfikacji PDB.',
 '',
 'Aktualny plik Android Debug przechodzi `apksigner verify` (v2). Plik `app-release-unsigned.apk` jest faktycznie niepodpisany i nie przechodzi weryfikacji podpisu; jest to oczekiwana cecha kandydata unsigned oraz blokada przedstawiania go jako gotowego podpisanego Release. Instalator Windows i EXE w ZIP nie zawierają certyfikatu Authenticode. DEB ma wersję 1.0.0-10, amd64. Są to oględziny artefaktów, bez instalacji i odbioru ich działania. Artefakty wydania są wcześniejsze od części późniejszych zmian źródeł; nie utożsamiamy ich z dzisiejszymi testowanymi DLL.',
 '',
 '## Status platform',
 '',
 '| Platforma | Potwierdzone teraz | Nadal do zamknięcia |',
 '|---|---|---|',
 '| Android | Podpis istniejącego Debug: PASS; kandydat Release: unsigned. | Konkretny podpisany i poprawnie skonfigurowany Release, GUI, instalacja/aktualizacja/restart i lifecycle FCM. Stare dowody Debug nie zatwierdzają Release; stan usługi pocztowej przyjęty od właściciela nie wymaga powtórki SMTP w tym zadaniu. |',
 '| Linux | Core, UI/MVVM i security: wyniki powyżej. Izolowany TLS, D-Bus i keyring: PASS. Metadane i hashe DEB/TAR sprawdzone. | GUI, instalacja/upgrade/restart i odtworzenie chronionego stanu dokładnie wskazanej wersji DEB/TAR; zaufana dystrybucja, aktualizacje i wsparcie. Działanie usługi pocztowej przyjęto zgodnie z OWNER_REPORTED; bez nowego konta i powtórki SMTP. |',
 '| Windows | Wspólny Core wykonany na Linux; PE bez Authenticode. | Windows 11: instalacja/upgrade/restart, GUI WPF, DPAPI/CNG i chroniony stan lokalny konkretnego builda; podpis i polityka aktualizacji. Wspólny Core nie stanowi odbioru WPF; nie zleca się dalszych testów usługi pocztowej. |',
 '| Backend/API | 190 PASS z istniejącej DLL; syntetyczne/in-memory API i testy jednostkowe. | 11 testów PostgreSQL niewykonanych; aktualna rewizja wdrożenia, granty/migracje, backup/restore i rzeczywisty provider zmiany hasła pozostają osobnymi bramkami. |',
 '| Hosting poczty | Właściciel 02.11.2026 potwierdził działającą wysyłkę/odbiór i odblokowane porty; ten stan przyjęto jako OWNER_REPORTED. | Zakres operacyjny: backup/restore, monitoring, obsługa incydentów, retencja i SLA oraz powiązanie z konkretnym backendem/providerem. Dalsze testy kont/wysyłki/IMAP/SMTP/portów wyłączono z zadania. |',
 '',
 'Historia buildów/urządzeń i precyzyjne zakresy są w `../portfolio-audit-20261102/mobile-mail.json`. Wyników historycznych nie dodano do nowych PASS.',
 '',
 '## Stan poczty zgłoszony przez właściciela',
 '',
 '02.11.2026 właściciel potwierdził, że wysyłka i odbiór działają oraz wymagane porty są odblokowane. Potwierdzenie przyjęto jako stan usługi (OWNER_REPORTED). Wcześniejszy zakres audytu nie obejmował niezależnej korelacji tych operacji z konkretną rewizją/artefaktem; jest to historyczna granica pochodzenia dowodów. Aktualny stan usługi przyjęto zgodnie z potwierdzeniem właściciela. Zgodnie z poleceniem nie będą wykonywane dalsze testy wysyłki, kont, IMAP/SMTP ani portów. Nie odczytywano credentials ani skrzynek.',
 '',
 '## Bezpieczeństwo i ograniczenia',
 '',
 'Istniejący skrypt `infra/scripts/check-secrets.sh` wykonano ponownie: PASS. To skan regex/źródeł respektujący reguły ignorowania `rg`, bez pełnego skanu historii i bez deklaracji pełnego SAST. Spis zależności zawiera 64 współrzędne NuGet z istniejących lock/assets i 27 bezpośrednich Maven z katalogu wersji. Po sporządzeniu inwentarza wykonano świeże zapytanie OSV: 91 zapytań, 91 odpowiedzi, 0 dopasowań advisory (2026-11-02; `fresh-advisory-query.json`). Wysłano wyłącznie nazwy i wersje pakietów, bez źródeł i danych kont. To częściowa ocena konkretnego inwentarza, bez deklaracji pełnego SCA PASS: pełny graf przechodni Androida i biblioteki systemowe nie zostały w ten sposób ocenione.',
 '',
 'Świeży SAST wykonano narzędziem Semgrep Community Edition 1.183.0 (OSS), lokalnie i offline, na 258 kopiach plików kodu/markup. Skonfigurowano 581 reguł security z oficjalnego repozytorium Semgrep/community; scanner raportuje 548 faktycznie wykonanych. Wynik: 14 findings (13 ERROR, 1 INFO), 26 ostrzeżeń PartialParsing (25 plików C#, 1 shell), exit 1 przy --error/--strict. Status: PARTIAL_EXECUTED_WITH_FINDINGS_AND_PARSER_LIMITS; bez pełnego SAST PASS. Nie wyciszano reguł ani findings.',
 '',
 'Triage statyczny: 11 ostrzeżeń subprocess dotyczy owner/build/QA tooling z argv-listami i bez shell=True; zachowano granicę zaufania do lokalnych narzędzi/argumentów, bez potwierdzonego zdalnego command injection. Dwa wskazania XML dotyczą parsowania lokalnych metadanych NuGet podczas pakowania i pozostają OPEN_PACKAGING_HARDENING_REVIEW. INFO GCM wskazuje odczyt IV podczas deszyfracji; szyfrowanie otrzymuje IV od providera i wymaga randomized encryption, więc to wskazanie nie dowodzi ponownego użycia nonce. Ograniczenia parsera i intrafile CE uniemożliwiają deklarację pełnego pokrycia C# i cross-file. Pełny sanitized wynik: fresh-sast.json.',
 '',
 'Skan korzystał z niezmienionych vendor rules w /tmp, z metrics OFF, version check OFF, bez tokenów i z prywatnym settings/cache/config. Nie wysyłano źródeł. .env, appsettings, google-services, klucze, DB, logi i artefakty nie były kopiowane; wszystkie 258 hashów źródeł po skanie pozostają zgodne. Surowy output ze snippetami pozostał wyłącznie w /tmp; raport zawiera rule ID, ścieżki i linie, bez snippetów/metavariables. Nie wykonywano żadnego helpera projektu ani testów kont/usług/portów.',
 '',
 'Nie zaobserwowano istniejącego lokalnego serwera ADB; nie uruchamiano nowego demona ani nie generowano kluczy hosta. Nie było izolowanego Xvfb; nie użyto osobistego ekranu/profilu. GUI Linux, fizyczny Android i natywny Windows pozostają NOT RUN. Test keyringu w izolacji nie jest odbiorem keyringu osobistej sesji pulpitu.',
 '',
 'W aktualnym kodzie API `server/src/ProgressKit.Mail.Api/Program.cs:120–122` nadal rejestrowane są `UnavailableMailboxPasswordChangeProvider`, `UnavailableDistributedPasswordChangeThrottle` i `UnavailablePasswordChangeAvailability`. Nie należy oferować operacyjnej zmiany hasła na podstawie samej obecności endpointu. Gmail OAuth wymaga odrębnie poprawnej konfiguracji klienta/zgód i rzeczywistego odbioru; nie jest potwierdzony przez ten audyt.',
 '',
 '## Proponowany zakres pierwszej oferty',
 '',
 'Propozycją jest ograniczony, wspierany pilotaż konkretnego, wskazanego numerem wersji i hashem klienta Linux. Warunki dotyczą jego GUI, instalacji/upgrade/restartu, chronionego stanu lokalnego, bezpiecznej dystrybucji, aktualizacji, wsparcia i formalnego zakresu oferty. Stan usługi pocztowej przyjęto od właściciela; oferta nie jest warunkowana powtórką ogólnego SMTP ani utworzeniem nowego konta w tym zadaniu. To propozycja warunkowa, bez zatwierdzenia publikacji dzisiaj. Należy jawnie określić wspieranych dostawców i platformy oraz nie obiecywać nieodebranego WPF, Gmail OAuth ani hostingu/SLA. Osobne kwestie hostingu to backup/restore, monitoring, retencja, incydenty i odpowiedzialność.',
 '',
 '### Pytania formalne przed ofertą',
 '',
 'Poniższe źródła urzędowe służą jako lista zagadnień do przeglądu, bez certyfikacji zgodności prawnej. DATA_SOURCE_FOUND: istniejący lokalny dokument legal Lud&Pra zawiera nazwę operatora, adres i kontakt; `published=false`. Właściciel wskazał te same dane do lokalnego użycia. Aktualność danych, finalna publikacja i właściwy zakres jurysdykcji DE pozostają oddzielnym odbiorem; nie wywodzimy z tego rejestracji ani zgodności prawnej. Wartości adresowe nie są kopiowane do tego raportu.',
 '',
 '- Kto formalnie sprzedaje/świadczy usługę i jakie dane identyfikacyjne, adres oraz kontakt trzeba podać? [UOKiK — prawo do informacji](https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/), [Biznes.gov.pl — sprzedaż przez Internet](https://biznes.gov.pl/pl/portal/00146).',
 '- Kto jest administratorem danych, jakie są cele/podstawy, okres lub kryteria retencji oraz właściwe prawa użytkownika? [UODO — okres retencji](https://uodo.gov.pl/pl/676/4260), [UODO — obowiązek informacyjny](https://uodo.gov.pl/pl/493/2254).',
 '- Jakie są licencja produktu, uprawnienia do dystrybucji, warunki rozliczeń/reklamacji oraz zakres wsparcia? Dostępne `THIRD-PARTY-NOTICES` nie stanowią licencji produktu ani pełnego przeglądu praw do komercjalizacji.',
 '',
 '## Pliki dowodowe',
 '',
 '- `fresh-tests.json`, `tests/`: nowe wykonania wcześniej zbudowanych DLL.',
 '- `fresh-native-tests.json`, `native-tests/`: osobne testy izolowanego transportu i usług natywnych.',
 '- `pdb-source-freshness.json`: hashe dokumentów kompilacji i zakres brakujących generatorów.',
 '- `artifact-inspection.json`, `android-signatures.json`: rozmiary, SHA-256, metadane i podpisy istniejących paczek.',
 '- `secret-scan.json`: nowy wynik istniejącego skanu regex, bez wypisywania zawartości sekretów.',
 '- `fresh-sast.json`: świeży Semgrep CE, sanitized findings/triage i ograniczenia parsera; `sast-source-snapshot.json`, `sast-vendor-rules.json`, `sast-availability.json`: zakres, hashe, vendor rules i dostępność narzędzia.',
 '- `dependency-inventory.json`: pierwotny inwentarz 91 współrzędnych; `fresh-advisory-query.json`: osobne późniejsze zapytanie OSV związane SHA-256 z tym inwentarzem.',
 '- `device-availability.json`: granice dostępnego środowiska.',
 '- `operator-source-observation.json`: obecność pól istniejącego dokumentu operatora, bez kopiowania wartości prywatnych.',
 '- `readiness-matrix.json`: ustrukturyzowane statusy, bramki i warunkowy zakres oferty.',
 '',
 '**Bez zmian produkcyjnych, prawdziwej korespondencji/kont, osobistego keyringu/profilu, instalacji sudo i migracji backendu. Bez zmian źródeł repo Mail.**',
 ''
]
(out/'README.md').write_text('\n'.join(lines))
print('Readiness matrix and Polish README generated; native followups present:',bool(native))
