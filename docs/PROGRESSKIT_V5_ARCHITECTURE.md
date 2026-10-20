# ProgressKit Systems V5 — architektura i utrzymanie

Stan audytu: 2026-10-15. Implementacja lokalna, status sprintu PARTIAL / NOT DEPLOYED.
Obowiązuje korekta kompozycji właściciela opisana w
`PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md`. Odbiór wizualny i zgoda właściciela pozostają OPEN.

## Fundament

Zachowano HTML/CSS/JavaScript i identyfikację V4 z `origin/main` a36969be.
Nie ma frameworka, bundlera, bazy katalogu ani bibliotek JavaScript runtime.
Generator używa wyłącznie standardowej biblioteki Python. Backend FastAPI pozostaje
zapleczem istniejącej analityki i dystrybucji Glikemii; nie obsługuje katalogu.

Przed zmianami lokalny HEAD d6662ca był o 3 commity za main. Zastane 74 dodatkowe
linie index.html i cinematic Vaelorii zabezpieczono w `/tmp/progresskit-v5-before`.
Zachowano plik cinematic bez zmian. Obraz nie stanowi dowodu rozgrywki i nie trafia
do publicznego artefaktu. Korekta właściciela zachowuje katalog 14 wpisów, 9 obrazów,
źródła, przypadki inżynieryjne, testy i zabezpieczone zmiany użytkownika.

## Jedno źródło treści

`catalog/projects.json` → `scripts/build-site.py` → szablony → statyczne HTML.

- Sześć filtrów i wspólna rolka 360° z hologramem na homepage, osobny pełny katalog, szufladki,
  case studies, technologie oraz historia stanu korzystają z tych samych danych.
- `templates/site.html` zapewnia wspólny shell, metadane, nawigację i galerię.
- `templates/about-contact.html` zachowuje osobistą komunikację, usługi i kontakt V4.
- `templates/glikemia-distribution.html` zachowuje operacyjny formularz opinii,
  instalację i licznik. Opis, etap i funkcje otrzymuje z katalogu.
- Wygenerowanych HTML nie edytować ręcznie. `--check` wykrywa rozjazd.
- `/projekty/` jest osobnym statycznym indeksem: pełna lista, wyszukiwanie,
  filtry, karty i historia rozwoju. Tego pełnego gridu nie renderuje homepage.
- `/projekty/<slug>/` ma kompletny HTML, title, opis, canonical i Open Graph.
- Istniejące `/progresskit-mail/` renderuje ten sam wpis i wskazuje canonical case study.
- `/glikemia-premium/` zachowuje publiczną dystrybucję i moderowane opinie.

## Kompozycja strony głównej po korekcie

Kolejność jest kontraktem projektu: hero → sześć interaktywnych kategorii → showroom 360° → hologram na żądanie →
O mnie i współpraca z CTA → skrót wyzwań inżynieryjnych → technologie →
kontakt z jednym briefem → stopka. Szczegółowe przypadki pozostają na podstronach
produktów. Pełny katalog i historia są pod `/projekty/`.

Sekcja „Wybrane projekty” i jej odpowiednik w postaci pełnego gridu nie występują
na stronie głównej. Produkty są dostępne w jednej filtrowanej ekspozycji oraz
w osobnym indeksie; nie powstaje druga ręcznie utrzymywana tablica projektów.
Nazwy kategorii homepage: Aplikacje, SaaS, Platformy, Gry, Realizacje WWW,
Infrastruktura. Liczby i przypisanie pozycji wynikają z katalogu.

Wspólny shell zachowuje srebro, aluminium, kamień, grafit, czerń i czerwone akcenty.
Nie wprowadza niebieskiej dominacji ani nowego monogramu. Produktowe akcenty
Glikemii pozostają lokalnym elementem jej istniejącej identyfikacji.

## Hero: wskazane źródło, autoryzowana edycja i integracja

`catalog/brand.json` przechowuje konfigurację kompozycji. Obecny stan:

```json
{
  "heroBackground": "assets/brand/hero-landscape-v5.webp",
  "heroSourceStatus": "REVIEWED_EDIT",
  "ownerVisualApproval": "OPEN"
}
```

Generator przygotowuje `assets/hero.css` z konfiguracji marki; publiczny allowlist
uwzględnia wskazany plik krajobrazu. Walidacja i jawne null nadal chronią przyszłą
konfigurację przed przypadkowym zastąpieniem brakującego obrazu. Obecnie źródło
jest odnalezione, edycja obejrzana i asset zintegrowany — brak pliku nie jest już blockerem.

Po wcześniejszym bezskutecznym przeglądzie repozytorium właściciel wskazał
`/home/pawe/Pobrane/a_dark_cinematic_high_end_ux_ui_website_landing.png` i wyraźnie
upoważnił do wyodrębnienia krajobrazu oraz usunięcia wtopionego UI. Jedna edycja
wbudowanym imagegen zachowała rozpoznawalną kompozycję gór, księżyca i muru;
odtworzyła piksele zasłonięte tekstem. Nie jest to wycięcie identyczne pikselowo.
To jawnie autoryzowana edycja tła marki, nie wygenerowane dowody funkcji produktów.
Dziewięć screenshotów produktów pozostało rzeczywistymi capture'ami.

Wynik `assets/brand/hero-landscape-v5.webp`: 1983×793 px, 201 050 B, SHA-256
`78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
Źródło pozostało niezmienione; dokładny prompt, hash źródła i ograniczenia znajdują
się w `PROGRESSKIT_V5_HERO_ASSET.md`.

Monumentalny H1 PROGRESSKIT SYSTEMS pozostaje dostępnym tekstem HTML z lokalnym fontem i teksturą SVG. `templates/hero-scene.svg` umieszcza krajobraz i dokładny `assets/brand/progressorkit-stamp.png` we wspólnych współrzędnych1983×793. Kanał alpha oryginału stanowi jedyną geometrię reliefu: filtr nadaje materiał, cień wewnętrzny i czerwony brzeg. Plik PNG, proporcje całego znaku i hash pozostają zachowane. Ruch kursora przesuwa całą scenę, a nie niezależne logo. Opis materiału i ograniczeń: `PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md`. Akceptacja wizualna pozostaje OPEN.

## Model danych

Root: `schemaVersion: 1`, `asOf: YYYY-MM-DD`, `projects: []`.

| Pole | Znaczenie |
| --- | --- |
| id, slug | Jeden unikalny identyfikator, małe ASCII i łączniki; slug równy id |
| name, category, summary | Nazwa, jedna z 6 kategorii i krótka karta |
| problem, audiences, motivation, solution | Potrzeba, odbiorcy, uzasadnienie i odpowiedź produktu |
| features, technologies, architecture | Wyłącznie zakres potwierdzony źródłami |
| stage, availability, updatedAt | Etap produktu, osobna dostępność i data ostatniego źródła |
| gallery | src, alt, caption, width, height; pliki lokalne po przeglądzie |
| videos, links | Przejrzane HTTPS: label i url; bez osadzonych trackerów |
| repository | null albo potwierdzone publiczne repozytorium GitHub |
| results, cases | Wyniki z granicami dowodu i 7 pól problem–diagnoza–przyczyna–poprawka–test–wynik–źródło |
| planned, remaining | Plan oddzielony od działającego zakresu |
| sources | id, label, kind, revision, scope; bez prywatnych lokalizacji |
| coverage | verified albo partial; nie jest etapem produktu |

Etapy: Koncepcja, Prototyp, W rozwoju, Alpha, Beta, Dostępny, Utrzymywany,
Wstrzymany, Archiwalny. `stage:null` jest dozwolone tylko przy `coverage:partial`:
oznacza brak dowodu etapu, a interfejs wyświetla „Etap do potwierdzenia”.
Nie klasyfikujemy żywego produktu jako archiwalnego na podstawie wieku screenshotu.

Walidator odrzuca brakujące/nadmiarowe pola, duplikaty, błędne typy, niepoprawne daty,
nieznane odwołania case→source, prywatne URL, traversal, nieistniejące obrazy i ucieczkę
symlinkiem. Daty nie mogą przekraczać jawnej `AUDIT_DATE` w generatorze.
Puste funkcje/technologie/architektura są dopuszczone wyłącznie dla niepotwierdzonego
wpisu bez ustalonego etapu — obecnie KAN SYSTEM. Braku danych nie zastępuje domysł.

## Aktualizacja lub dodanie projektu

1. Sprawdź właściwy checkout produktu, SHA i istniejące zmiany. Nie edytuj produktu.
2. Potwierdź tożsamość i aliasy. Czytaj kod przed README; sprawdź datę raportu.
3. Uzupełnij jeden rekord, źródła i publicznie bezpieczne streszczenia przypadków.
4. Zachowaj dokładną lokalizację dowodów w dokumentacji wewnętrznej, nie w katalogu publicznym.
5. Przy kolejnej dacie audytu świadomie zaktualizuj `AUDIT_DATE` i `asOf`.
6. Uruchom `python3 scripts/build-site.py`, testy i `--check`; przejrzyj diff.
7. Wygeneruj wydanie. Publikuj dopiero po przejściu bramek z dokumentu wdrożenia.

Zmiana statusu wymaga nowego źródła i sprawdzenia availability, remaining oraz daty.
Wynik testu sprzed miesiąca nie jest nowym uruchomieniem ani dowodem aktualnej produkcji.
Automatyczne publikowanie każdego commita nie zostało wdrożone. Dalsza automatyzacja
może przygotowywać propozycję JSON/PR z release lub raportu; człowiek zatwierdza zakres
publiczny przed zmianą katalogu.

## Interakcje i dostępność

`scripts/showroom_markup.py` renderuje sześć przycisków kategorii oraz po jednym prawdziwym linku/kaflu ekspozycji na wpis katalogu. Bez JavaScript jest to natywnie przewijana kolekcja. `assets/project-showroom.js` dodaje pierścień pseudo3D, centrum, najbliższych sąsiadów, strzałki, klawiaturę, drag/swipe i poziomy wheel. Nie ma automatycznego obrotu. Hover pokazuje odwracalny podgląd; klik utrwala filtr. Gesty pionowe pozostają przewijaniem strony, a ruch od 12px tłumi przypadkowy click także przy pojedynczym projekcie.

Publiczny, ograniczony zestaw metadanych jest serializowany bezpiecznie w `#showroom-data`; nie zawiera wewnętrznych źródeł audytu. `assets/project-hologram.js` wypełnia pojedynczy natywny dialog przez textContent i sprawdzone lokalne URL. Otwieranie/zamykanie komunikuje się z rolką przez zdarzenia progresskit; blokuje jej sterowanie w czasie modala, zachowuje filtr i zwraca fokus. Escape oraz świadomy klik tła odwracają wejście. Reduced motion wyłącza ruch, bez utraty ręcznego sterowania.

`assets/hero-space.js` aktualizuje transformację całej sceny najwyżej raz na klatkę po zdarzeniu pointer; wyłącza ją przy touch/reduced-motion/ukryciu. Reveal używa IntersectionObserver, domyślnie treść jest widoczna. Kod nie zastępuje przeglądarkowej kontroli fokusu, gestów lub czytelności.

Wyszukiwanie, filtry i pełne karty są na `/projekty/`. Stan URL obejmuje `q`,
`kategoria`, `technologia`, `etap`, `projekt`; parametry kampanii i baza ścieżki
pozostają zachowane. Szufladka projektu jest pojedyncza: otwarcie kolejnej zamyka
poprzednią, a filtr zamyka ukrywaną. Escape zwraca focus do summary.
Galeria używa jednego natywnego dialogu z powrotem fokusu, Escape, strzałkami i linkiem
do pliku jako fallback. Reduced motion wyłącza animacje i przejścia.
Sekcja O mnie ma rzeczywiste kompetencje twórcy i linki do kontaktu lub materiałów;
nie wprowadza fikcyjnego zespołu lub doświadczenia. Brief występuje raz, w kontakcie.
Niczego nie wysyła i nie zapisuje w localStorage: tworzy lokalny TXT lub wydruk.

Semantyka kodu nie oznacza ukończonego audytu WCAG ani odbioru kompozycji.
Przeglądarka, czytnik ekranu, touch i realny layout wymagają bezpośredniego testu.
Przy niedostępnym narzędziu przeglądarkowym kontrola wizualna pozostaje OPEN.

## Granica publikacji

`scripts/stage-public.py` kopiuje wyłącznie jawnie wybrane pliki. Nie kopiuje
całego assets ani repozytorium. Katalog JSON, szablony, dokumentacja, testy, backend,
bazy, surowe screenshoty i oryginalny cinematic pozostają poza wydaniem.
Nowy indeks `/projekty/`, generowane `assets/hero.css` i krajobraz hero są częścią
nowego zestawu. Wiążąca jest lista i manifest konkretnego artefaktu, a nie stała
liczba w dokumentacji lub liczba plików wcześniejszej paczki.
Podgląd FastAPI korzysta z tej samej listy, a nie z ogólnego serwowania katalogu.
APK nadal obsługuje istniejący backend; nie jest częścią statycznego artefaktu.

**Nowa bramka wymagana przez właściciela:** kompozycja musi zostać przez niego
zaakceptowana przed produkcyjną publikacją nowego wyglądu. Testy, wygenerowanie
artefaktu ani publiczne odczyty istniejącej V4 nie zastępują tej decyzji.
Aktualny stan `ownerVisualApproval: OPEN` blokuje publikację.
`scripts/check-publication.py` egzekwuje tę bramkę, a workflow Pages wywołuje go
przed stagingiem i deployem. Przy OPEN skrypt kończy się kodem 1; to oczekiwane
zablokowanie publikacji, nie błąd budowania lokalnego podglądu. Rzeczywisty test
przeglądarkowy i decyzja właściciela muszą mieć osobne dowody.

Analityka V5 działa tylko na origin `https://progresskit.pl`, respektuje DNT i nie
wysyła query, fragmentu, wyszukiwania ani briefu. Pozostawiono istniejący model
zdarzeń. Retencja i osobne logi serwera wymagają sprawdzenia operatora.
