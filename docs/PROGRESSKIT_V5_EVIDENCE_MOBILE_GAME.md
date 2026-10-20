# ProgressKit V5 — dowody: aplikacje mobilne i Vaeloria

Audyt źródeł: 2026-10-15. Zakres: cztery wskazane checkouty, tylko odczyt. Wynik katalogu: `/tmp/v5-mobile-game.json` — 4 projekty, 6 przypadków inżynieryjnych. Ta notatka jest dokumentem roboczym audytu; lokalne ścieżki służą odnalezieniu źródeł i nie trafiają do publicznego katalogu.

Nie uruchamiano buildów, testów produktów, aplikacji, ADB, usług ani połączeń produkcyjnych. Wszystkie liczby testów poniżej są jawnie historycznymi zapisami istniejącej dokumentacji. Zweryfikowano teraz tożsamość Git, bieżący kod i wskazane pliki raportów, a także obejrzano użyte dwa obrazy galerii. Nie zmieniono żadnego repozytorium produktu; nie wykonano commit/push.

## Tożsamość i zastany stan Git

Wszystkie repozytoria są osobnymi checkoutami pod `/home/pawe/Pulpit/Projekty It/`, na gałęzi `main`.

| Repozytorium | Bieżący HEAD | Data commita | Zastany working tree |
| --- | --- | --- | --- |
| Glikemia Premium | `304292713f9d9fbda88d37715ec22f08f5c91de2` | 2026-09-09 | 3 wpisy: 2 zmodyfikowane dokumenty prywatności, 1 nieśledzona ikona |
| ProgressKit Mail | `c9b669ce0a2cc8e5baff6125415f62afc4aeed29` | 2026-10-10 | 12 zmodyfikowanych dokumentów; w tym aktualizacja zakresu dowodów odbiorczych |
| ProgressKitTranslator-v0.1 | `6932b069982e43cbcc91957c72334ee80798de4b` | 2026-10-13 | clean |
| Vaeloria | `0716317aeb73e328c515504056f6eece669d8eb3` | 2026-10-13 | 302 wpisy: 2 śledzone modyfikacje i 300 wpisów nieśledzonych |

Metoda: `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --porcelain=v1`, `git log -1 --format='%H %cs'`. Liczba wpisów statusu nie jest liczbą plików rekursywnie w nieśledzonych katalogach.

Odczytano `ProgressKit Mail/AGENTS.md`: zakaz połączeń z produkcją, publikowania sekretów i zmian tożsamości urządzeń. Nie odnaleziono plików AGENTS w trzech pozostałych checkoutach w wyszukiwaniu plików repozytorium.

## Glikemia Premium

Katalog publiczny: `glikemia-premium`, kategoria `mobile`, etap `W rozwoju`, data `2026-09-09`, coverage `partial`. Nie uznano samego numeru 1.0 za dowód ukończonego wydania sklepowego.

| Twierdzenie | Bieżący kod / dokument |
| --- | --- |
| Android/.NET MAUI, .NET 10, tożsamość i wersja 1.0 | `Glikemia Premium/TestApka.csproj:7`, `:10`, `:15`–`:22` |
| SQLite, SkiaSharp, Microcharts i lokalne powiadomienia | `TestApka.csproj:56`–`:65` |
| Lokalna baza, walidacja zapisu, CRUD, stronicowany odczyt | `Models/Services/DatabaseService.cs:18`–`:31`, `:40`–`:70`, `:94`–`:97` |
| Jedna kanoniczna jednostka mg/dL i normalizacja wejścia | `Models/GlucoseMeasurementPolicy.cs:11`–`:23`, `:45`–`:98` |
| Zakres półotwarty i stabilne sortowanie | `Models/Services/MeasurementRecordPersistence.cs:23`–`:42` |
| Jeden snapshot granicy dnia | `RaportPage.xaml.cs:159`–`:175` |
| PDF poza wątkiem UI, systemowy podgląd | `RaportPage.xaml.cs:342`–`:370` |
| Manifest bez INTERNET | `Platforms/Android/AndroidManifest.xml:1`–`:17`; brak uprawnienia nie jest ogólnym audytem wszystkich możliwych pośrednich przepływów systemowych |
| Importer nie dostarcza pomiarów użytkownika | `Models/Services/HistoricalGlucoseImporter.cs:28`–`:48`: pusta lista produkcyjna, wejście walidowane przed zapisem |
| Funkcje UI, 50 rekordów na stronę, lokalizacja i przypomnienie | `docs/ARCHITECTURE.md:13`–`:17`, `:79`–`:92`; zgodne z odczytanym kodem zapisu/PDF |

Nie opisano synchronizacji i importu plików jako funkcji użytkownika. Kod nie ma własnego backendu ani cloud sync; istniejący importer legacy ma obecnie puste wejście produkcyjne. Dokumentuje to także `docs/ARCHITECTURE.md:7`, `:66`–`:77`, `:133`.

Publiczne przypadki `glikemia-time`:

- TIME-001: `docs/QA_LOG.md:283`–`:293` — dwa odczyty zegara mogły teoretycznie objąć dwa dni; pojedynczy snapshot i zakres półotwarty. Nie twierdzimy, że błąd został zaobserwowany fizycznie.
- TIME-002: `docs/QA_LOG.md:295`–`:305` — brak secondary order; naprawa `DataPomiaru DESC, Id DESC`. Bieżący kod: `MeasurementRecordPersistence.cs:37`–`:42`.
- Historyczna weryfikacja 31.08: `docs/QA_LOG.md:307` — targeted 3 PASS, full 62 PASS, bez nowego physical run.
- Nowszy raport 09.09: `docs/QA_LOG.md:331`–`:400`, zwłaszcza `:384`–`:395` — 62/0/0, Debug PASS, Release PASS z 6 ostrzeżeniami. Zapisano historyczny wynik i pochodzenie, bez twierdzenia o uruchomieniu dzisiaj.
- Ograniczenia ręcznego odbioru: `docs/QA_LOG.md:345`–`:356`, `:400`; Google Play: `docs/RELEASE_CHECKLIST.md:75`–`:98`. Właścicielskie wcześniejsze potwierdzenia nie są nowym pomiarem audytora.

## ProgressKit Mail

Katalog publiczny: `progresskit-mail`, kategoria `mobile`, etap `W rozwoju`, data `2026-10-10`, coverage `partial`.

README i część map architektury zawierają historię wcześniejszych etapów. Przykład: `README.md:53` mówi o nieaktywnych transportach, lecz bieżący `AppContainer.kt:120`–`:121` tworzy Angus IMAP i SMTP. `docs/PRODUCTION_PATHS.md:112` zawiera nieaktualne zdanie o braku remote APPEND; fakt z kodu `RoomMailRepository.kt:193` i `AngusMailDataSources.kt:50` ma pierwszeństwo. Nie skopiowano tych starych statusów do katalogu.

| Twierdzenie | Bieżący kod / dokument |
| --- | --- |
| Rozdzielone warstwy i aktywne składanie transportów | `android/app/src/main/kotlin/pl/progresskit/mail/AppContainer.kt:47`–`:48`, `:120`–`:121`; `docs/PRODUCTION_PATHS.md:14`–`:23` |
| UI, lokalne foldery, wyszukiwanie, szkice | `README.md:27`–`:31`; aktualna mapa `docs/PRODUCTION_PATHS.md:102`–`:111` |
| Keystore, osobna identity i zaszyfrowany credential | `docs/PRODUCTION_PATHS.md:29`–`:33`, wskazane tam klasy w module security |
| Wymuszony IMAPS i SMTP STARTTLS/hostname validation | `android/data/src/main/kotlin/pl/progresskit/mail/data/mail/MailTransportPolicy.kt:6`–`:35` |
| Parser MIME, czyszczenie HTML do zwykłego tekstu | `android/data/src/main/kotlin/pl/progresskit/mail/data/mail/MimeReadableContent.kt:25`–`:50`, `:72`–`:99`, `:183`–`:265` |
| Osobny wynik SMTP oraz zapisu kopii Sent | `android/data/src/main/kotlin/pl/progresskit/mail/data/local/RoomMailRepository.kt:174`–`:206`; `mail/AngusMailDataSources.kt:50`–`:75` |
| FCM i jawne bramki Release | `android/app/build.gradle.kts:22`–`:65`, `:149` |
| .NET/EF/PostgreSQL | `server/src/ProgressKit.Mail.Infrastructure/ProgressKit.Mail.Infrastructure.csproj:3`–`:8`, `server/src/ProgressKit.Mail.Api/ProgressKit.Mail.Api.csproj:1`–`:8` |

Publiczny przypadek `mail-mime`:

- `docs/MIME_CLOSURE.md:65`–`:85` opisuje syntetyczne reprodukcje 13 FAIL/15 PASS, rozdzielone według wariantu.
- `:91`–`:102` opisuje osobne niepoprawne metadata, zakres obsługi wyjątku i zachowanie błędów transportowych.
- Bieżący parser: `MimeReadableContent.kt:87`–`:91` usuwa aktywne elementy HTML i bierze tekst; `:263`–`:265` ustawia 1 MiB, 512 części i głębokość 20.
- Historyczny wynik 39 testów parsera/metadanych: `docs/PRODUCTION_CLOSURE_REPORT.md:237`–`:242`.
- Fizyczny kontrolowany HTML-only: `docs/MIME_CLOSURE.md:3`–`:17`. To odrębny dowód, nie diagnoza oryginalnej wiadomości.
- Granica przyczyny historycznego incydentu: `docs/MIME_CLOSURE.md:38`–`:53`. Nie pobrano oryginalnego .eml, więc root cause konkretnego incydentu pozostaje nieudowodniony.

Publiczny przypadek `mail-smtp`:

- Kod `RoomMailRepository.kt:174`–`:206` rozróżnia zaakceptowane DATA od lokalnej/serwerowej kopii i zwraca AcceptedWithWarning.
- `docs/SMTP_CLOSURE.md:3`–`:25` opisuje jedną kontrolowaną wysyłkę i pojedynczą kopię Sent; `:60`–`:70` opisuje remote APPEND.
- Nie przypisano dowodowi akceptacji przez MX gwarancji przyszłej dostarczalności. `docs/SMTP_CLOSURE.md:48`–`:54` odróżnia owner-reported odbiór i uwierzytelnienie od niezależnej weryfikacji.
- Dokumenty robocze z 10.10 korygują wcześniejsze szersze twierdzenie o DKIM; diff jest dokumentacyjny, poza HEAD. `docs/PRODUCTION_CLOSURE_REPORT.md:24`–`:45` zawiera aktualne zakresy i wyniki: Android 219/0/0, serwer 166/0/0, w tym 11 integracji PostgreSQL. Nie agregowano dodatkowych kontroli w kolejną liczbę „testów”.
- `docs/PRODUCTION_CLOSURE_REPORT.md:32`–`:35`, `:98` dokumentuje otwarte bramki lifecycle, live revocation i Release. Lokalny sukces nie oznacza wdrożenia aktualnego API.
- Nie ujawniono w publicznych danych adresów skrzynek, UID, kolejek, hostów, selectorów, produkcyjnych ścieżek ani treści wiadomości.

## ProgressKit Translator

Katalog publiczny: `progresskit-translator`, kategoria `mobile`, etap `Prototyp`, data `2026-10-13`, coverage `partial`.

Nazwa checkoutu nadal zawiera v0.1, ale `app/build.gradle.kts:15`–`:16` potwierdza 0.2.2/versionCode 4. Nie utworzono osobnego projektu na podstawie nazwy katalogu.

| Twierdzenie | Bieżący kod / dokument |
| --- | --- |
| Kotlin, Compose, Android, ML Kit | `app/build.gradle.kts:1`–`:24`, `:31`–`:41` |
| Ograniczona lokalna historia | `app/src/main/java/pl/progresskit/translator/LocalPreferences.kt:19`–`:28`; `TranslatorEngine.kt:499` |
| Routing lokalnego ASR wymaga installed | `app/src/main/java/pl/progresskit/translator/AsrRoutingPolicy.kt:18`–`:43`; `TranslatorEngine.kt:252` |
| Gotowy lokalny TTS wymaga zgodnego języka i braku sieci/notInstalled | `app/src/main/java/pl/progresskit/translator/TtsVoicePolicy.kt:16`–`:25`; `TtsVoiceSelector.kt:43`–`:44` |
| Usługa foreground microphone | `app/src/main/java/pl/progresskit/translator/TranslatorService.kt:114`–`:116` |
| PCM AudioTrack | `app/src/main/java/pl/progresskit/translator/StereoPlayer.kt:242` i istniejące routery PCM; opis granic `README.md:67`–`:81` |

Publiczny przypadek `translator-asr`:

- `docs/V0_2_2_ASR.md:38`–`:56`: installed ≠ downloadable ≠ pending; kontrolowany wybór i fallback.
- `:58`–`:64`: kryteria gotowego lokalnego głosu.
- `:72`–`:74`: wcześniejsze niepowodzenia TTS miały ERROR_NETWORK_TIMEOUT, lecz nie stanowią wyjaśnienia całego opóźnienia rozmowy.
- `:11`–`:30`: historyczne 123 JVM PASS i 39 funkcjonalnych Android PASS, dodatkowo osobna diagnostyka metadanych. Diagnostyki nie doliczono jako funkcjonalnego PASS.
- `:34`: pomiar pierwszego PCM na emulatorze nie jest pomiarem od końca mowy do słyszalnego przekładu na telefonie.
- `:19`–`:26` i `:78`–`:87`: instalacja zachowująca dane, identyczny hash, blokada pakietu testowego i brak fizycznego potwierdzenia DE/local ASR; kliknięcia nadal występują.
- `README.md:69`–`:73`: routing stereo istnieje w kodzie, separacja TWS wymaga odsłuchu; nie deklarujemy potwierdzenia.
- `README.md:77`–`:81`: ML Kit lokalnie po pobraniu; systemowe ASR i TTS mogą działać online. Nie opisano całego produktu jako „offline”.

Nie skopiowano ograniczeń historycznego Sprint 02 (m.in. starego braku foreground service) jako aktualnych.

## Vaeloria

Katalog publiczny: `vaeloria`, kategoria `games`, etap `W rozwoju`, data `2026-10-13`, coverage `partial`.

| Twierdzenie | Bieżący kod / dokument |
| --- | --- |
| Godot 4.6.3, C#, klient net9.0, oddzielne biblioteki | `Vaeloria/Vaeloria.csproj:1`–`:12` |
| OpenGL Compatibility, również Android | `project.godot:17`, `:42`–`:43` |
| Jedna domena walki | `scripts/domain/combat/CombatEngine.cs:3`–`:33` |
| Zapis JSON i atomowy plik tymczasowy | `scripts/infrastructure/JsonSaveGameService.cs:19`–`:42` |
| ASP.NET Core, EF/Npgsql i PostgreSQL backendu | `server/Vaeloria.Api/Vaeloria.Api.csproj:1`–`:9` |
| Zaimplementowane vs planowane systemy | `docs/VAELORIA_MASTER_VISION.md:29`–`:40`; nie przepisano marketingowo sześciu krain ani online matches jako ukończonych |
| Środowisko, fauna, mechaniki i budżet lasu | `docs/EARTH_FOREST_2_REPORT.md:14`–`:31`, `:58`–`:75` |
| Docelowa oprawa pozostaje przejściowa | `docs/VAELORIA_MASTER_VISION.md:46`–`:60` |

Publiczny przypadek `vaeloria-performance`:

- Bieżący kod `scripts/exploration/world/ForestLife.cs:62`–`:96`: natychmiastowe ukrycie ponad budżet oraz ograniczenie pętli do aktywnych ptaków, motyli i mgły.
- `docs/VAELORIA_PERFORMANCE_BASELINE_2026-10-13.md:159`–`:176`: metoda A/B 5×5000 callbacków i różnica Low 0,042918 → 0,033380 ms/callback, Medium 0,073160 → 0,061254. High mała różnica może być szumem. Brak twierdzenia o oszczędności alokacji ani o proporcjonalnym wzroście FPS.
- `:173`: Low 8 zamiast 25 obiektów tej grupy, nie wszystkich obiektów lasu.
- `:203`–`:215`: focused 265 PASS, inne historyczne zakresy oddzielone; Android/Windows nie testowano w tym pomiarze, art AA nadal nieodebrany.
- Raport bazuje na wcześniejszym `e7721daa` (`:3`), a aktualny HEAD ma późniejszy checkpoint EOS. Wyników nie przedstawiono jako pełnej regresji aktualnego HEAD.
- `:98`: 157,314 s luki historycznego trace nie wyjaśnia przesunięcia EOS; EXCLUDED pozostaje wyłączone z porównania. Publicznie ujawniono wyłącznie ogólny otwarty problem.
- `docs/EARTH_FOREST_2_REPORT.md:3`–`:10`, `:77`–`:96` opisuje oddzielny historyczny zakres i ograniczenia. Nie sumowano dowodów z różnych rewizji w pozornie aktualny wynik.

## Materiały wizualne i bezpieczeństwo publicznych danych

Oględziny wykonano narzędziem obrazu dla czterech istniejących assetów portfolio. Użyto tylko dwóch ekranów:

| Asset | Wymiary | SHA-256 | Decyzja |
| --- | --- | --- | --- |
| `assets/projects/glikemia/product-measurement.webp` | 648×1440 | `710f95be5c4ad7f729020b666119d2c73492ec0227c95eae2e95a229404f0a58` | Pusty formularz, wartości początkowe 0, brak notatki lub danych osobowych; galeria |
| `assets/projects/glikemia/product-language.webp` | 648×1440 | `cfe78f53657a8d7d254f59febd12bfefcb4499ebff0f4946df1f6e9a1d91712c` | Ekran wyboru języka, bez danych użytkownika; galeria |
| `assets/projects/glikemia/product-history.webp` | 648×1440 | nie dodano do katalogu | Widoczne pomiary oraz etykiety seed/test; pominięto zamiast traktować pochodzenie każdego rekordu jako potwierdzone |
| `assets/projects/vaeloria/vaeloria-cover.png` | 1920×1080 | nie dodano do katalogu | Filmowe wprowadzenie, nie galeria rozgrywki; pominięto |

Nie znaleziono istniejących assetów portfolio dla Mail i Translatora. Prawdziwe kadry Vaelorii są w repozytorium gry, ale nie kopiowano ich w tym zadaniu: przydzielony zakres dopuszczał wyłącznie obecne assety portfolio. Galerie pozostają puste z jawną informacją o braku materiałów, zamiast ilustracji sugerujących działający interfejs.

W publicznym JSON brak ścieżek lokalnych, adresów poczty, prywatnych hostname'ów, surowych logów, identyfikatorów urządzeń, kluczy, tokenów, UID wiadomości i treści korespondencji. `repository: null` oznacza brak potwierdzonej publiczności repozytorium. `links: []` oznacza brak nowo dopuszczonego linku; nie dodano pobierania ani nie uznano istniejącego URL za zweryfikowaną bieżącą usługę.

## Kontrole tego audytu

Wykonane: odczyt i porównanie kodu/raportów, tożsamości Git, przegląd wizualny użytych plików, odczyt wymiarów PIL i hashy SHA-256; walidacja JSON, wymaganych pól, unikalnych identyfikatorów, kategorii, etapów, dat, referencji źródeł oraz plików galerii.

Wynik walidacji katalogu: **33 kontroli PASS**, 4 projekty / 6 przypadków / 2 obrazy. JSON SHA-256: `8540fa096c4a64e88379967692a8a8bb1d351d4302ebd9584579f479fe2fafa0`. Kontrola whitespace dokumentu: PASS; `git diff --check -- docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md`: exit 0.

NOT RUN: testy jednostkowe/instrumentalne produktów, buildy, uruchomienia fizyczne, odsłuch, benchmarki, sprawdzenie usług online, publiczność repozytoriów i deployment. Przyczyna: audyt źródeł portfolio, zachowanie read-only i brak potrzeby uruchamiania lub modyfikowania produktów.

Ostateczny stan tych czterech wpisów: fakty źródłowe opracowane, coverage `partial` z powodu granic aktualnej weryfikacji runtime oraz brakujących galerii. Nie jest to werdykt gotowości produktów do wydania.
