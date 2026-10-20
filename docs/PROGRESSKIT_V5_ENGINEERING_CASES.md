# ProgressKit V5 — przypadki inżynieryjne

Stan: 2026-10-15. Warstwa wewnętrzna; plik nie jest publikowany. Szczegółowe lokalizacje kodu oraz rozdzielenie testów historycznych od bieżących znajdują się w dokumentach EVIDENCE_MOBILE_GAME, EVIDENCE_SAAS i EVIDENCE_OTHER.

## Przypadki produktowe

### Glikemia Premium / 1

**PROBLEM** Rekordy z identyczną datą i godziną mogły mieć niestabilną kolejność na kolejnych stronach historii.

**DIAGNOZA** Audyt zapytania SQLite wykazał sortowanie wyłącznie po czasie pomiaru.

**ROOT CAUSE** Brak drugiego klucza sortowania przy legalnych remisach timestampu.

**SOLUTION** Dodano sortowanie po dacie malejąco, następnie po identyfikatorze rekordu malejąco.

**VERIFICATION** Historyczny raport z 31 sierpnia 2026 dokumentuje test remisu i pełny zestaw 62 PASS. Bieżący audyt potwierdził implementację; bez ponownego uruchomienia testów.

**RESULT** Historia ma deterministyczny porządek również dla pomiarów zapisanych w tej samej chwili.

**SOURCE** glikemia-time

### Glikemia Premium / 2

**PROBLEM** Granice filtra dnia mogły zostać wyliczone z dwóch różnych odczytów zegara w chwili przejścia przez północ.

**DIAGNOZA** Analiza wyznaczania zakresu ujawniła wielokrotne pobranie daty dla jednego filtra.

**ROOT CAUSE** Niezależne odczyty czasu dla początku i końca tego samego dnia.

**SOLUTION** Obie granice wynikają z jednego odczytu czasu, a koniec zakresu jest wyłączny.

**VERIFICATION** Historyczny raport dokumentuje test przełomu dnia i roku. Kod obecnie korzysta z jednego snapshotu daty i zakresu od początku dnia do początku następnego.

**RESULT** Pomiar o północy należy do jednego dnia, bez nakładania się zakresów.

**SOURCE** glikemia-time

### ProgressKit Mail / 1

**PROBLEM** Wiadomość HTML lub nietypowa struktura MIME mogła nie dać czytelnej treści albo przerwać odświeżenie skrzynki.

**DIAGNOZA** Syntetyczne wiadomości odtworzyły problemy wyboru części, kodowania znaków i nadmiernego odczytu. Struktura pierwotnej rzeczywistej wiadomości nie została ustalona.

**ROOT CAUSE** Potwierdzone błędy parsera dotyczyły m.in. niewłaściwego wyboru części MIME i polegania na niepoprawnych deklaracjach charset. Nie przypisano ich automatycznie historycznemu incydentowi.

**SOLUTION** Wprowadzono kontrolowany wybór treści, ścisłą walidację kodowania, tekstowy odczyt HTML bez wykonywania skryptów oraz wspólne limity rozmiaru, liczby części i głębokości.

**VERIFICATION** Raport dokumentuje reprodukcje przed poprawką, 39 lokalnych testów parsera/metadanych i osobny fizyczny test świeżego syntetycznego HTML. Bieżący audyt potwierdził kod; testów nie ponawiano.

**RESULT** Obsługiwane warianty MIME mają czytelną reprezentację tekstową, a przekroczenia limitów widoczny komunikat. Pierwotna przyczyna historycznej wiadomości pozostaje nieudowodniona.

**SOURCE** mail-mime

### ProgressKit Mail / 2

**PROBLEM** Błąd zapisania kopii w Wysłanych po przyjęciu wiadomości przez SMTP mógł zachęcić do ponownej wysyłki.

**DIAGNOZA** Proces rozróżnia zaakceptowanie treści przez SMTP od późniejszego lokalnego zapisu i IMAP APPEND.

**ROOT CAUSE** Akceptacja wysyłki i zapis kopii to osobne operacje, które mogą zakończyć się różnymi wynikami.

**SOLUTION** Po pozytywnej akceptacji SMTP klient wykonuje zapis kopii, a jego awarię przedstawia jako ostrzeżenie z informacją, aby nie wysyłać ponownie.

**VERIFICATION** Kod potwierdza osobne wyniki Completed i AcceptedWithWarning. Raport z 10 października opisuje jedną kontrolowaną wysyłkę oraz niezależny odczyt jednej kopii w serwerowym folderze Wysłane.

**RESULT** Interfejs odróżnia przyjętą wiadomość od niepotwierdzonej kopii i nie przedstawia automatycznie problemu archiwizacji jako nieudanej wysyłki.

**SOURCE** mail-smtp

### ProgressKit Translator / 1

**PROBLEM** Wybór usługi rozpoznawania i głosu TTS mógł zależeć od sieci mimo dostępności lokalnych komponentów.

**DIAGNOZA** Rozdzielono informację o modelu możliwym do pobrania od dowodu jego instalacji. Wcześniejsze próby TTS zgłaszały timeout sieci.

**ROOT CAUSE** Dostępność lokalnej usługi lub nazwa głosu nie potwierdza gotowego modelu ani syntezy bez sieci. Nie ustalono jednej przyczyny wszystkich opóźnień rozmowy.

**SOLUTION** ASR wybiera tryb lokalny tylko dla potwierdzonego zainstalowanego języka. Selektor TTS preferuje zgodny gotowy głos niewymagający sieci, z kontrolowanym fallbackiem.

**VERIFICATION** Historyczny raport obejmuje 20 testów polityki ASR i 15 polityki głosu w zestawie 123 JVM PASS oraz testy syntetycznych modeli i TTS. Metadane telefonu nie są testem rozpoznawania mowy.

**RESULT** Kod ma jawne reguły wyboru lokalnych komponentów. Pobranie modelu DE, lokalne rozpoznawanie na telefonie i całkowite opóźnienie wymagają osobnego potwierdzenia.

**SOURCE** translator-asr

### Vaeloria / 1

**PROBLEM** Niższa jakość grafiki ukrywała część ambientu, ale kod nadal aktualizował jego transformacje.

**DIAGNOZA** Audyt i mikropomiar oddzieliły koszt pętli ambientu od FPS całej gry i renderowania GPU.

**ROOT CAUSE** Pętla przetwarzała także ptaki, motyle i warstwy mgły przekraczające aktywny budżet jakości.

**SOLUTION** Aktualizacje ograniczono do aktywnego budżetu, a zmianie jakości towarzyszy natychmiastowe ukrycie wyłączonych obiektów. Zachowano wspólny zegar animacji.

**VERIFICATION** Historyczny raport z 13 października opisuje 265 kontroli PASS i desktopowy mikropomiar w pięciu partiach po 5000 callbacków. Bieżący audyt potwierdził pętle w kodzie, bez powtórzenia benchmarku.

**RESULT** Low aktualizuje 8 zamiast 25 obiektów tej grupy. Mediana desktopowego callbacku spadła z 0,042918 do 0,033380 ms; jest to mała oszczędność CPU, bez deklaracji poprawy FPS telefonu.

**SOURCE** vaeloria-performance

### Lud&Pra / ProgressKit Community / 1

**PROBLEM** Rozbudowa odkrywania społeczności wymagała połączenia tematów, nazw i fragmentów rozmów bez osobnego pobierania każdego wpisu.

**DIAGNOZA** Porównanie istniejących list i feedu wykazało brak jednego odczytu obejmującego ten kontekst. Testy kontrolowały liczbę zapytań i zachowanie widoczności.

**ROOT CAUSE** Istniejące API obsługiwało osobne listy, a nowy sposób odkrywania potrzebował danych zbiorczych.

**SOLUTION** Rozszerzono dotychczasowy moduł treści o zbiorcze wyszukiwanie i podglądy. Interfejs pobiera fragmenty po otwarciu tematu oraz obsługuje klawiaturę i ograniczenie animacji.

**VERIFICATION** Raport z 14.10.2026 dokumentuje testy API, stałą liczbę zapytań dla 1 i 20 społeczności oraz przeglądarkowe scenariusze desktop i dotyk.

**RESULT** Lokalnie zweryfikowano odkrywanie tematów i rozmów z zachowaniem reguł dostępu. Aktualne wdrożenie pozostaje niepotwierdzone.

**SOURCE** community-discovery

### Lud&Pra / ProgressKit Community / 2

**PROBLEM** Rozbudowany feed potrzebował wiarygodnych informacji o rozmowie bez kosztu osobnego zapytania dla każdej karty.

**DIAGNOZA** Test regresyjny porównał treści widoczne i pominięte oraz liczbę zapytań dla strony stu publikacji.

**ROOT CAUSE** Prezentacja rozmów wymagała agregatów, których dotychczasowy kontrakt feedu nie udostępniał.

**SOLUTION** Dodano zbiorcze liczenie odpowiedzi, uczestników, ostatniej aktywności i obrazów w istniejącym feedzie.

**VERIFICATION** Raport V2 z 14.10.2026 zapisuje regresję trzech zapytań SQL dla stu postów i wykluczenie nieopublikowanych komentarzy z metryk.

**RESULT** Informacje o rozmowie wynikają z rzeczywistej treści. Raport dotyczy lokalnego środowiska testowego.

**SOURCE** community-feed-v2

### ProgressKit Tax / 1

**PROBLEM** Kwoty o nadmiernej precyzji mogły przejść walidację po wcześniejszym zaokrągleniu przez parser.

**DIAGNOZA** Przegląd konwersji oraz zapisany test porównujący zachowanie przed i po poprawce wskazały utratę części zapisu wejściowego.

**ROOT CAUSE** Walidacja opierała się na już sparsowanej wartości decimal zamiast na oryginalnym zapisie liczby.

**SOLUTION** Oryginalny token JSON jest sprawdzany przed parsowaniem; dozwolony jest zwykły zapis dziesiętny z najwyżej dwoma miejscami po przecinku.

**VERIFICATION** Raport 04B dokumentuje test porównawczy i 14 ukierunkowanych testów obejmujących walidację, rollback i migracje.

**RESULT** Nieprawidłowa precyzja jest odrzucana bez częściowego zapisu danych. Wynik dotyczy lokalnej implementacji technicznej.

**SOURCE** tax-04b

### ProgressKit Tax / 2

**PROBLEM** Korekta ewidencji musi zachować pełny ślad pierwotnego wpisu, storna i zastępującego zapisu.

**DIAGNOZA** Przegląd kontroli integralności wykazał, że jedna z reguł nie porównywała opisu storna z wymaganym źródłem.

**ROOT CAUSE** Kontrola nowego formatu nie obejmowała całego zestawu zachowywanych metadanych.

**SOLUTION** Dodano addytywną korektę kontroli bazy, zachowując zastosowaną historię migracji. Storno i zapis zastępczy powstają w jednej transakcji.

**VERIFICATION** Raport 04B opisuje testy integralności i rollbacku, aktualizację schematu oraz niezależne sprawdzenie CSV/PDF.

**RESULT** Lokalnie potwierdzono spójny łańcuch korekt, dokładne kwoty i zachowanie opisów. Merytoryczna akceptacja księgowa pozostaje osobnym etapem.

**SOURCE** tax-04b

### Adivara / 1

**PROBLEM** Rosnący zestaw operacji na danych podopiecznych potrzebował jednolitego sposobu egzekwowania uprawnień.

**DIAGNOZA** Przegląd architektury i testy dostępu wskazały potrzebę wspólnego mechanizmu dla list oraz pojedynczych zasobów.

**ROOT CAUSE** Rozproszone sprawdzanie uprawnień zwiększało zależność poprawności od każdej implementowanej operacji.

**SOLUTION** Wprowadzono centralny zakres autoryzowanych zapytań i deklaratywną politykę dla zasobów, powiązane z aktualnym stanem członkostwa.

**VERIFICATION** Historyczny raport dokumentuje testy poprawnych uprawnień, cofnięcia dostępu i izolacji organizacji; pełny zapisany zestaw liczy 203 PASS.

**RESULT** Lokalnie zweryfikowano wspólną granicę dostępu. Pełny odbiór bezpieczeństwa i gotowość produkcyjna pozostają otwarte.

**SOURCE** adivara-auth-review

### GoTrans360 / 1

**PROBLEM** Liczby widoczne na ekranach prototypu wymagały sprawdzenia przed użyciem w opisie osiągnięć produktu.

**DIAGNOZA** Porównano pola interfejsu z modelem bazy, API i logiką dopasowania, a dostępne operacje zbadano na izolowanych danych syntetycznych.

**ROOT CAUSE** Część interfejsu używała stałych danych demonstracyjnych zamiast agregatów operacyjnych.

**SOLUTION** Przygotowano inwentarz twierdzeń i odtwarzalny benchmark, rozdzielając działające odczyty i obliczenia od planowanych procesów.

**VERIFICATION** Historyczny raport dokumentuje odczyt 12 567 testowych tras oraz trzy zgodne uruchomienia demonstracyjnego Smart Match.

**RESULT** Powstał potwierdzony zakres prototypu i uczciwe granice prezentacji. Benchmark nie zamknął procesu rezerwacji ani gotowości produkcyjnej.

**SOURCE** gotrans-benchmark

### Ignira / Maria-Salon / 1

**PROBLEM** Układ sekcji kontaktowej wymagał dopracowania na różnych szerokościach ekranu.

**DIAGNOZA** Historia zmian pokazuje korektę siatki, szerokości pól, nagłówka i obszaru przycisku.

**ROOT CAUSE** Pierwotnego błędu nie odtworzono niezależnie; dostępny jest zapis poprawki układu.

**SOLUTION** Wprowadzono jawne obszary siatki, ograniczenia szerokości pól i oddzielny blok akcji.

**VERIFICATION** Porównanie zatwierdzonej zmiany z kodem oraz poprawna kontrola składni JavaScript; bez nowego testu przeglądarkowego.

**RESULT** Poprawka znajduje się w źródłach. Bieżące działanie opublikowanej witryny pozostaje do potwierdzenia.

**SOURCE** ignira-layout

### Obserwator / Marek Zaworski / 1

**PROBLEM** Animowana prezentacja tekstu wymaga zachowania kontroli nad przewijaniem podczas czytania.

**DIAGNOZA** Kod zawiera pętlę wyświetlania tekstu i obsługę ręcznych interakcji z przewijaniem.

**ROOT CAUSE** Brak udokumentowanego pierwotnego incydentu lub testu, który wykazywał błąd.

**SOLUTION** Istniejąca obsługa dotyku, kółka myszy i kliknięcia wyłącza automatyczne przewijanie.

**VERIFICATION** Przegląd źródeł prezentacji; zachowanie nie zostało ponownie sprawdzone w przeglądarce.

**RESULT** Mechanizm kontroli czytania jest zaimplementowany. Nie przypisano mu niezmierzonego wpływu na konwersję.

**SOURCE** obserwator-reading

### KAN SYSTEM / 1

**PROBLEM** Po zmianie nazwy produktu okładka realizacji wskazywała nieistniejącą lokalizację.

**DIAGNOZA** Porównano zmianę nazwy z rzeczywistą strukturą plików i następną poprawką.

**ROOT CAUSE** Zmieniono techniczną ścieżkę razem z nazwą publiczną, mimo że istniejący obraz zachował dawną lokalizację.

**SOLUTION** Przywrócono odwołanie do istniejącego obrazu przy zachowaniu publicznej nazwy KAN SYSTEM.

**VERIFICATION** Zachowana historia zmian i obecność wskazanego pliku; sprawdzenie dotyczy prezentacji portfolio.

**RESULT** Odwołanie do okładki zostało poprawione. Nie stanowi to testu działania systemu kontrolerów.

**SOURCE** kan-portfolio-history

### ProgressKit Systems / 1

**PROBLEM** Opisy i statusy projektów były powielane w statycznych sekcjach strony.

**DIAGNOZA** Audyt V4 wykazał ręczne karty oraz brak indeksowalnych prezentacji większości produktów.

**ROOT CAUSE** Treść produktu i warstwa prezentacji nie miały wspólnego modelu.

**SOLUTION** Katalog oddzielono od szablonów i dodano walidację przed generowaniem oraz publikacją.

**VERIFICATION** Zakres weryfikacji tej wersji podano w raporcie sprintu; kod generatora i filtry mają osobne testy regresyjne.

**RESULT** Aktualizacja jednego rekordu zasila kartę, case study, technologie i listę rozwoju. Wdrożenie pozostaje osobną bramką.

**SOURCE** progresskit-systems-source

## Poprawki w zakresie V5

| Objaw | Przyczyna | Poprawka i dowód | Pozostałe ograniczenie |
| --- | --- | --- | --- |
| Roboty i bezpośredni URL nie otrzymywały większości opisów produktu | V4 miała ręczne sekcje homepage | Generator pełnych HTML z canonical/OG i test odwołań oraz metadanych | Indeksowanie przez wyszukiwarki nie jest testem lokalnym |
| Pełne assets mogły zawierać materiały nieprzejrzane do publikacji | Stary staging kopiował cały katalog | Jawny allowlist i próby z plikami przynętami; testy stagingu i HTTP 404 | Pełny Caddyfile wymaga operatora |
| Kilka otwartych szufladek nie odpowiadało pojedynczemu projektowi w URL | Brak wyłączności i zamknięcia ukrywanego panelu | Jeden otwarty projekt, zamknięcie po filtrze; regresje Node | Zachowanie focus/scroll w przeglądarce OPEN |
| Obrys focus summary mógł zostać obcięty przez kartę | Zewnętrzny outline i overflow clip | Obrys summary przeniesiono do wnętrza | Kontrola faktycznego malowania OPEN |
| Przejście z górnego kafla do panelu mogło przeciąć inną kategorię | Panel pod wielorzędową siatką i natychmiastowy hover | Jednorzędowa siatka dla fine pointer od 761 px; JS sprawdza liczbę rzędów, dotyk i focus; regresja Node | Rzeczywisty wskaźnik i touch OPEN |
| Dotknięcie ekranu hybrydowego mogło zamknąć panel po pointerleave | Handler opuszczenia obszaru sprawdzał fine pointer bez rodzaju zdarzenia | Dotyk nie uruchamia timera zamykania myszy; regresja Node | Rzeczywisty ekran hybrydowy OPEN |
| Enter po hover mógł zostać anulowany | Obsługa przypięcia nie rozróżniała click detail=0 | Przypięcie tylko dla kliknięcia wskaźnikiem; regresja Node | Próba klawiaturowa w przeglądarce OPEN |
| Stary test przerwanego pobrania nie podnosił oczekiwanego OSError | Starlette 1.8 dla ASGI<2.4 nasłuchuje disconnect; fixture rozłączała przed body | Jawne ASGI2.4 z asercją próby body oraz osobny test wcześniejszego rozłączenia; backend bez zmian | Zachowanie testowane na podanych wersjach zależności |
| Łączny suite zmieniał bazę po reload | Inny moduł zaimportował product przed ustawieniem jego prywatnego środowiska testowego | Ponowny import konfiguracji przed utworzeniem klienta testów produktu; zachowano asercję trwałości | Bazy testowe pozostają wyłącznie w katalogach tymczasowych |
| Wskazany pejzaż zawierał napisy, CTA i rysunki produktów | Źródło było pełną makietą, nie tłem | Za zgodą właściciela pojedyncza edycja imagegen usunęła UI; oryginalny copper PK osobno, bez zmian | Odtworzone zasłonięte piksele nie są identycznym cropem; akceptacja kompozycji OPEN |

Szczegóły autoryzowanej edycji, prompt i hashe: [HERO_ASSET](PROGRESSKIT_V5_HERO_ASSET.md).
