# Living Experience V1 — raport lokalny, 16.11.2026

Zaimplementowano działającą przebudowę głównego doświadczenia w istniejącym repozytorium. Oryginalny znak przechodzi w mapę, a jej obiekty w prezentacje produktów, odsłonięcie warstw i finał. Zachowano katalog 19 projektów, ich strony, filtry, galerie, pozostałą nawigację, kontakt i formularz. Stan odbioru wizualnego właściciela pozostaje `OPEN`.

[Galeria 53 zrzutów i nagrania](evidence/living-experience-20261116/browser/index.html) · [film desktop](evidence/living-experience-20261116/browser/1440-journey.mp4) · [film mobile](evidence/living-experience-20261116/browser/390-journey.mp4)

## Zaimplementowane sceny

| Scena | Wynik |
| --- | --- |
| A — Awakening | Oryginalny miedziany znak, krótki rozruch światła, zachowane motto „Technologia. Pod Twoją kontrolą.”, subtelna reakcja na wskaźnik i aktywację. Bez ekranu blokującego wejście. |
| B — Hero → ekosystem | Ten sam element DOM zmienia pozycję i skalę. Heksagony wychodzą z rdzenia; połączenia oraz impulsy wynikają z postępu przewijania. Cofnięcie scrolla odwraca transformację. |
| C — mapa | Wszystkie 19 projektów w czterech grupach. Hover/fokus rozświetlają wybrany węzeł i rdzeń. Kliknięcie, Enter, Spacja lub dotyk uruchamiają świadomą nawigację. Link do pełnego katalogu zachowuje filtry i rozwijane szczegóły. |
| D — zanurzenie w produkt | Pięć wspólnych sekwencji: Mail, Tax, Glikemia Premium, Vaeloria, Remote. Ten sam heksagon zmienia geometrię i odsłania media. Kliknięcie mapy używa natywnego płynnego scrolla; Escape i „Wróć do mapy” zamykają zbliżenie. Pełne prezentacje pozostają prawdziwymi linkami, z działającym Wstecz i bezpośrednimi kotwicami. |
| E — atmosfera | Jedna przestrzeń zmienia kierunek światła, barwę, typografię i kompozycję. INITIALIZATION / ACTIVE / PROCESSING / STABLE opisują wizualną narrację. Nie podłączono telemetrii. |
| F — Reveal | Rzeczywiste media i oznaczone schematy rozkładają się na warstwy; produkty pozostają klikalne. Na małym telefonie mają osobny układ dwóch kolumn. |
| G — finał | Elementy wracają do znaku. CTA prowadzi do istniejącego kontaktu, a link e-mail do `pawel@progresskit.pl`. Dalsze sekcje usług, procesu, technologii, roadmapy integracji, wydań i stopka zostały zachowane. |

Dla pozostałych 14 pozycji zachowano wspólną mapę oraz dotychczasowy mechanizm pełnych prezentacji. Nie wykonano dla nich osobnych bogatych sekwencji przewijania. To zakres V1 zgodny z priorytetem ukończenia spójnego przepływu i co najmniej dwóch rozbudowanych prezentacji.

## Materiały i granice treści

Źródłem nazw, opisów, statusów, adresów i mediów pozostaje `catalog/projects.json`. Nie zmieniono jego treści ani statusów produktów. Konfiguracja scen określa kolejność i kompozycję, bez drugiego katalogu faktów.

- **Marka:** oryginalny `assets/brand/progressorkit-stamp.png`, bez podmiany lub generowania nowego logo.
- **Mail:** autentyczny ekran startowy oraz ekran potwierdzenia usunięcia z tłem zamazanym w istniejącym materiale V4. Nie użyto prywatnej skrzynki. Brakuje zatwierdzonego ekranu listy wiadomości i podglądu, więc ta część szczegółowej wizji pozostaje nierozwinięta.
- **Glikemia:** rzeczywisty pusty formularz Android i ekran wyboru języka; bez danych zdrowotnych użytkownika.
- **Vaeloria:** zatwierdzone publiczne obrazy Earth oraz tutorialu z BOT. Ten sam autentyczny materiał lasu tworzy przygaszone tło. Zachowano informację o prototypie i pochodzeniu materiałów.
- **Tax i Remote:** brak galerii w katalogu. Użyto podpisanych schematów dokumentów/workflow/rejestrów oraz klienta/routera/hosta. Nie są to fikcyjne zrzuty aplikacji ani odczyty usług. Autentyczne prezentacje ekranów tych produktów wymagają późniejszych, zatwierdzonych materiałów.
- Nie użyto nowych wygenerowanych obrazów, obcych zasobów, zewnętrznych skryptów, prywatnych adresów infrastruktury ani rzeczywistych danych klientów.

## Architektura i dostępność

Nowy moduł scen korzysta ze statycznego HTML z generatora, CSS transform/opacity i jednego lekkiego pola połączeń Canvas 2D. `assets/world-scene.mjs` nie uruchamia już modelu WebGL ani własnej pętli. Jeden kontroler wyznacza geometrię i atmosferę z pozycji scrolla; rAF jest planowany na żądanie. Pozostałe istniejące kontrolki zachowują własną obsługę zdarzeń w `world.mjs`.

IntersectionObserver zatrzymuje pracę poza widokiem. Obsługa visibility/pagehide/pageshow oraz AbortController i odłączenie obserwatorów porządkują lifecycle. Nie użyto przechwytywania gestu przewijania ani blokady scrolla. Nie dodano zależności.

Mobile ma własną geometrię, podział tekstu i mediów oraz ograniczony bufor renderowania. Reduced motion i ręczne zatrzymanie przełączają treść w zwykły przepływ dokumentu. Bez JavaScript wszystkie 19 linków i pięć opisów pozostają w HTML; czysto ruchowe przyciski są ukryte. Brak Canvas zachowuje funkcjonalną scenę HTML. Focus, semantyka, galerie i natywna historia zostały sprawdzone. Kontrola kontrastów obejmowała zrzuty i forced colors; nie jest to pełny audyt zgodności WCAG.

## Wyniki końcowe

| Kontrola | PASS | FAIL | Uwagi |
| --- | ---: | ---: | --- |
| Python — istniejące regresje i nowe kontrakty scen | 176 | 0 | `python -m unittest discover -s tests` |
| Node — wszystkie testy, w tym showroom i nowe sceny | 120 | 0 | `node --experimental-test-isolation=none --test tests/*.test.cjs` |
| Chrome — scenariusze przeglądarkowe | 23 | 0 | [Pełne wyniki](evidence/living-experience-20261116/browser/checks.json) |
| Build, kontrola generatora i składni, publiczny staging, diff | PASS | 0 | 19 pozycji, 27 wygenerowanych plików; 62 pliki publiczne |
| Audyt npm | PASS | 0 | 0 zgłoszonych podatności, bez dodanych zależności |

**Łącznie 319 wykonanych testów/scenariuszy: 319 PASS / 0 FAIL / 0 BLOCKED w tym zakresie.** Build i audyt są oddzielnymi kontrolami, niewliczonymi do 319. Repozytorium nie ma odrębnego lintera ani typechecku TypeScript; wykonano dostępne kontrole składni i generatora.

Przeglądarka sprawdziła 1920×1080, 1440×900, 768×1024, 390×844 i 320×568. W każdej rozdzielczości zapisano 10 pozycji narracji. Kontrole obejmują poziomy overflow, kadrowanie mediów, rozdzielenie tekstu/mediów, dostępność środków przycisków do kliknięcia, mapę, wszystkie 19 tras, hover/focus/click/Enter/Spację/touch, Escape, historię, pełne strony, filtrowanie i galerie. Dodatkowo: reduced motion, brak JS, forced colors i brak Canvas. Zrzuty przejrzano również wizualnie; poprawiono kolizje na tablecie i małym telefonie.

Nie usunięto istniejących testów. Dwa ich oczekiwania strukturalne zaktualizowano do nowego kontraktu: kolejność kotwic we wspólnej scenie oraz oryginalny znak jako główny obiekt, zamiast awaryjnej nakładki na logo WebGL.

**0 wyjątków JS, 0 naruszeń CSP, 0 nieoczekiwanych błędów zasobów i 0 zewnętrznych żądań podczas QA strony.** Lokalny endpoint tokenu formularza zwraca oczekiwane 503 bez konfiguracji sekretów; interfejs zachowuje komunikat niedostępności. Nie wysyłano formularzy, poczty ani APK. Nie oznacza to weryfikacji dostarczenia zgłoszenia na produkcji.

Publiczny staging i skan tekstowych wzorców kluczy prywatnych, AWS i prywatnych IPv4 nie wykazały trafień. Publiczne obrazy i katalog porównano z bazą bajtowo. To kontrola zakresu zmian, nie nowy pełny audyt DLP wszystkich historycznych materiałów. [Dowód zachowania plików i bezpieczeństwa](evidence/living-experience-20261116/security-preservation.json).

## Wydajność i ograniczenia dowodu

Pomiar wykonano lokalnie na ThinkPad T480s. Przeglądarka raportowała `ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)`. Strona używa Canvas 2D na żądanie; WebGL służył wyłącznie jednorazowej identyfikacji GPU w teście.

- Chrome headless, 1440×900, DPR 1; 3.53 s pomiaru przewijania, 175 próbek rAF.
- Mediana odstępu klatek: **16.7 ms**, P95: **33.4 ms**; próbek ponad 50 ms: **1**.
- Liczba odświeżeń sceny podczas pomiaru: 172. Nie jest to deklaracja stałych 60 FPS na dowolnym urządzeniu.
- Po zatrzymaniu scrolla: **0 dodatkowych klatek w 1100 ms**; poza widokiem również brak dalszego renderowania.
- Pagehide/pageshow sprawdzono zdarzeniami syntetycznymi, a wyjście z widoku rzeczywistym IntersectionObserver. Nie wykonano długotrwałego profilowania sterty ani osobnego testu fizycznego przełączania kart systemu.
- Telefony/tablet i dotyk są emulowane z DPR 1. **Fizyczny Android/iOS, Safari/Firefox i ocena właściciela: NOT TESTED / OPEN.**
- Pliki MP4 mają 25 fps wynikające z rejestratora Playwright. Nie są pomiarem FPS strony.

## Lista plików sprintu

- `assets/world-scene.mjs`
- `index.html`
- `package.json`
- `scripts/build-site.py`
- `scripts/stage-public.py`
- `templates/hero-installation.html`
- `tests/test_owner_correction.py`
- `assets/living-experience.css`
- `assets/living-experience.mjs`
- `scripts/living_markup.py`
- `scripts/verify-living-experience.cjs`
- `tests/living-experience.test.cjs`
- `tests/test_living_experience.py`
- `docs/LIVING_EXPERIENCE_V1_20261116.md`

Dowody i narzędzia pomocnicze: `docs/evidence/living-experience-20261116/`. [Manifest zmian](evidence/living-experience-20261116/changed-by-sprint.json).

`build-site.py` i `stage-public.py` miały wcześniejsze zmiany Mail; zostały zachowane. Istniejące zmodyfikowane strony Mail/prywatności, sitemap i `tests/test_site_v4.py` są identyczne z bazą tej sesji. Nie usunięto wcześniejszych nieśledzonych plików. Nie zmieniono katalogu, grafiki marki, backendu ani dystrybucji APK.

## Uruchomienie

Z katalogu repozytorium:

```bash
npm run build
PK_PYTHON=.venv/bin/python PK_PREVIEW_PORT=8236 sh scripts/preview.sh
```

Otwórz `http://127.0.0.1:8236/`. Podgląd korzysta z istniejącej listy dozwolonych publicznych ścieżek. Serwery uruchomione przez QA zostały zakończone; powyższa komenda uruchamia nowy lokalny podgląd.

Automatyczny test sam uruchamia i kończy własny podgląd na bazach tymczasowych:

```bash
npm run test:living
PK_QA_RECORD=1 npm run test:living
```

W tym środowisku test używa zainstalowanego Chrome, Playwright i systemowego FFmpeg. Można ustawić `PK_CHROME`, `PK_PLAYWRIGHT`, `PK_PYTHON`, `PK_QA_URL` oraz `PK_QA_OUT`. `PK_QA_EXISTING=1` wybiera już uruchomiony lokalny serwer.

## Stan bazowy i Git

HEAD pozostał `899580c`. Przed zmianami zapisano różnicę Git i hashe 5017 śledzonych plików. Bazowy check generatora oraz 114 testów Node przeszły; bazowy pełny Python został przerwany przez środowisko, więc nie przypisano mu PASS. Końcowe pełne wyniki podano wyżej.

Brak commitu, stagingu Git, pushu, deployu i działań na VPS. Staging publicznych plików służył wyłącznie lokalnej walidacji. Odbiór wizualny pozostaje otwarty.
