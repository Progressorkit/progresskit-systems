# ProgressKit Mail — formularz pilotażu, 10.11.2026

## Zakres i wynik

Lokalna integracja gotowa. Docelowy URL: https://progresskit.pl/progresskit-mail/.
Podgląd tej sesji: http://127.0.0.1:8237/progresskit-mail/ (dane syntetyczne, proces lokalny).
Nie wykonano połączenia z produkcyjnym VPS, deployu, commita, pushu ani wysyłki SMTP.
Nie potwierdzono działania formularza pod publicznym URL.

Przeniesiono istniejący landing Mail do źródła [templates/mail-pilot/index.html](../templates/mail-pilot/index.html).
Generator tworzy stronę sprzedażową; dotychczasowe case study zachowano pod
`/projekty/progresskit-mail/`. Stopka strony głównej już prowadzi do strony oferty.
Publiczna allowlista obejmuje tylko HTML, JS, CSS i dwa obrazy landing page.
Nie dodano projektu ani endpointów backendu, migracji bazy czy zmian w poczcie.

## Zapis i bezpieczeństwo

Formularz korzysta z istniejących `GET /api/project-inquiries/token` i
`POST /api/project-inquiries`. Firma trafia do `contact_name`, typ to `company`,
opcjonalna wiadomość ma prefiks `ProgressKit Mail — zgłoszenie do pilotażu`.
Walidacja serwera, zwykły tekst bez HTML, honeypot, kontrola origin, jednorazowy
token ważny 30 minut, minimalny czas 3 s i limity IP/e-mail/global pozostają aktywne.
SQLite zatwierdza zapis przed HTTP 201. Niepewna odpowiedź blokuje edycję i pozwala
ponowić ten sam token/UUID/payload bez duplikowania zgłoszenia. Żadne dane formularza
nie trafiają do analityki, localStorage czy logów. Sekret właściciela nie trafia do JS.

Właściciel używa istniejącego prywatnego API `/internal/project-inquiries` oraz
`/internal/project-inquiries/{id}` z osobnym Bearer tokenem. Publiczny Caddy ma
odrzucać całe `/internal/*`; odczyt należy wykonywać przez zatwierdzony prywatny
kanał operatora. Nie publikować panelu ani tokena w URL. Baza i sidecary mają prawa
0600, katalog 0700; nie mogą być w katalogu statycznej strony. Lokalny test nie
stanowi dowodu praw i kopii zapasowych na produkcji.

RODO: wskazano istniejącego administratora, cel, podstawę, kontakt i okres do 180 dni,
link do praw osoby i pełnej polityki. Przed publikacją operator musi potwierdzić
hosting/podwykonawców/transfery, retencję logów i backupów oraz dobowy purge
(`analytics/inquiry_worker.py --purge-only`). Te kwestie już były otwarte w polityce
Systems; nie uznano ich za potwierdzone przez samo dodanie tekstu.

## Świeża weryfikacja

- PASS: Python 170 testów, 0 błędów, 0 pominiętych.
- PASS: JavaScript 114 testów, 0 błędów, 0 pominiętych.
- PASS: Chrome: rzeczywisty POST, utrata odpowiedzi po commit, idempotentne ponowienie,
  jeden rekord, prywatny odczyt listy i szczegółu, 404 anonimowo, 403 obcy origin,
  brak błędów JS i poziomego przepełnienia przy 390/1440 px.
- PASS: odczyt SQLite z niezależnego połączenia: jeden rekord i jeden wpis outbox.
- PASS: generator 19 projektów / 27 wygenerowanych plików, `git diff --check`.
- PASS: gotowy MP4 dekoduje się w całości: H.264, 1080×1920, 27 s. Klatka 23 s
  zawiera `progresskit.pl/progresskit-mail/`, zgodne z canonical landing page.
- BLOCKED: pełny `infra/scripts/verify-local.sh` repo Mail zatrzymuje się na
  `:app:validateReleaseConfiguration` — brak wymaganego adresu API Release.
  Wcześniej PASS skan sekretów, branding oraz 19 + 5 testów narzędzi.
- SKIPPED: dalsza bramka izolowanego serwera Mail po przerwaniu verify-local.
- PENDING PHYSICAL VERIFICATION: fizyczny telefon; test szerokości jest emulacją.

Powtarzalny test przeglądarkowy: `.venv/bin/python scripts/verify-mail-pilot.py`.
Tworzy własną bazę i losowe sekrety tylko w pamięci procesu, uruchamia istniejący
preview na 127.0.0.1:8238, wykonuje test, zamyka proces i usuwa bazę testową.
Nie uruchamia workera SMTP. Wymaga lokalnego Chrome i Playwright.

## Publikacja i rollback — BLOCKED

Paczka statyczna jest w `/home/pawe/Pulpit/Transfer/ProgressKit-Mail-Pilot-20261110/`,
z allowlistą, manifestem SHA-256 i informacją NOT DEPLOYED. Nie zawiera bazy ani sekretów.
To kandydat z niecommitowanego drzewa; przed GIT wymagany ręczny przegląd i zgoda właściciela.

Po odrębnej decyzji właściciela uprawniony operator:
1. Potwierdza istniejącą usługę inquiries i jej prywatną konfigurację; uruchamia
   `scripts/inquiry-preflight.py` zgodnie z istniejącymi instrukcjami deploymentu.
2. Uzupełnia wymienione wyżej warunki prywatności, potwierdza dobową retencję.
3. Zachowuje poprzednią statyczną wersję i konfigurację reverse proxy, testuje ich
   przywrócenie w stagingu. Wdraża paczkę jako osobne wydanie i przełącza root atomowo.
4. Sprawdza HTTPS, token, kontrolowane zgłoszenie, prywatny odczyt i publiczne 404
   dla `/internal/*`. Bez tych wyników nie publikuje filmu/kampanii.
5. Przy niepowodzeniu przywraca poprzedni root i konfigurację; zachowuje bazę oraz
   już przyjęte zgłoszenia. Nie cofa/usuwa rekordów klientów. Nie restartuje poczty.

Nie wykonano ani nie przetestowano rollbacku produkcyjnego. Zakaz dostępu do VPS
w AGENTS.md Mail pozostaje obowiązujący; publiczna aktywacja pozyskiwania klientów
pozostaje BLOCKED, mimo działającego lokalnego formularza.
