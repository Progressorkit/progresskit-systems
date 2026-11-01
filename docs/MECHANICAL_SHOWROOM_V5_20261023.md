# Mechanical Showroom Restoration V5 — 23.10.2026

Praca na istniejącym drzewie roboczym przy HEAD `9322e4e4b35be58517fbf7073c8015673770ef43`, z zachowaniem zmian sprzed sprintu i `owner-finish.css`. Bez commita, stagingu, pusha i deploymentu.

Podgląd: **http://127.0.0.1:8130/index.html**. Osobny lokalny serwer z syntetyczną bazą `/tmp/progresskit-mechanical-v5-20261023/product.db`; wcześniejsze podglądy pozostawione bez ingerencji. Wyniki liczników dotyczą wyłącznie tej bazy.

## Diagnoza i zmiany

Przyczyną prostokątnych kart była kombinacja trzech warstw: generator emitował ramę z prostymi prowadnicami; `mechanism()` wyznaczał dwa rzędy gniazd; CSS narzucał moduły 350 × 196 px z uciętym narożnikiem. Kolejne arkusze (`visual-acceptance.css`, `interface-life.css`, `owner-finish.css`) ponownie nadawały im materiał. Sama podmiana koloru nie mogła przywrócić sześciokątów.

Istniejący `project-mechanism.css` przejął końcową geometrię i materiał showroomu; generator ładuje go po `owner-finish.css`. Usunięto tylko sprawdzone, sprzeczne reguły ramy i zamkniętych modułów. Pozostały patch właściciela, układ pozostałych sekcji, mapa ekosystemu i stopka zostały zachowane.

Mechanizm zawiera jeden metalowy korpus, współosiowe pierścienie, sześć ramion, śruby, łożysko, podstawę oraz oryginalne logo PK. Sześciokąt to sześć wierzchołków `25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%`, a nie prostokąt z obciętymi narożnikami. Osobne sześciokątne warstwy tworzą obrzeże i szczotkowaną powierzchnię. Czerwone aluminium znajduje się wewnątrz okrągłego korpusu.

Kontroler prowadzi projekty po obwodzie. Na ekranie jest najwyżej sześć powierzchni, a przy wymianie projektu wygaszana powierzchnia opuszcza tylne gniazdo przed pokazaniem następnej. Kliknięcie sąsiada obraca mechanizm, kończy ustawianie i wysuwa ten sam element przez animację transformacji 520 ms. Dotychczasowy panel pozostaje wewnątrz modułu i w naturalnym przepływie dokumentu. Zamknięcie przywraca fokus. Szybkie powtarzanie klawiszy zachowuje bezpieczny fokus do chwili pojawienia się wybranego modułu. Filtr przerywa oczekujące otwarcie bez pozostawiania ukrytego panelu.

Na telefonie pozostaje piasta, obudowa i jeden aktywny sześciokąt. Długi opis wydłuża sześciokąt i przewija całą stronę. Ograniczono szerokość tego wariantu oraz poprawiono przestrzeń na etykiety przy mniejszych szerokościach desktopowych. Nie dodano biblioteki 3D ani nowych bitmap.

## Źródła wizualne i odstępstwa

Obejrzano lokalne referencje, obie 1586 × 992:

- `/home/pawe/Pobrane/exec-83313dab-3881-4601-81c1-27b25191c6b7.png` — mechanizm zamknięty; SHA-256 `c0e478b3dc7d92f59246185684094388c1bb548c22d06d9757bdba7364a85d22`.
- `/home/pawe/Pobrane/exec-40370cb3-2236-475d-a781-26110ab6c815.png` — rozwinięta Glikemia; SHA-256 `49e12c3a7d45beec5907faa71daf86db1491257cfe2c41577e75981978c89906`.

Odtworzono zasadę geometryczną i materiałową, nie zgodność pikselową. To działający mechanizm CSS/SVG z perspektywą i cieniami, nie pełny model 3D z renderera. Rzeczywiste nazwy, statusy i długości opisów mają pierwszeństwo przed tekstami z referencji. Rozwinięta obudowa mieści pełną treść, dlatego jest większa; mobilna jest wydłużona i uproszczona. Kadrowanie i oświetlenie nie są fotorealistyczną kopią referencji.

Obie wcześniej zatwierdzone bitmapy nadal są **rekonstrukcjami**: `red-aluminium-reconstruction.jpg` i `footer-forest-mountains-reconstruction.png`. Ich sumy kontrolne są identyczne jak przed sprintem. Nie deklaruje się odnalezienia ani przywrócenia oryginałów tych dwóch materiałów. Stopka zachowuje las i góry, bez czerwonej planety.

## Zakres plików tego sprintu

Porównanie z zapisanym stanem roboczym sprzed sprintu, a nie z HEAD:

| Plik | Zmiana |
|---|---|
| `scripts/showroom_markup.py` | Konstrukcja piasty, ramion, pierścieni i elementów obudowy |
| `scripts/build-site.py` | Kolejność istniejących arkuszy strony głównej |
| `assets/project-mechanism.css` | Sześciokąty, metal, warstwy, otwieranie i responsywność |
| `assets/owner-finish.css` | Konsolidacja wyłącznie nadpisań showroomu |
| `assets/interface-life.css` | Usunięcie sprzecznych prowadnic i materiałów zamkniętych kart |
| `assets/visual-acceptance.css` | Usunięcie nadpisania zamkniętych powierzchni |
| `assets/project-showroom.js` | Kołowa trajektoria, wybór i wysunięcie, fokus, stabilne etykiety |
| `assets/hero-space.js` | Aktualizowanie istniejącego węzła tekstowego kontrolki |
| `assets/ecosystem-system.js` | Ponowne użycie dwóch etykiet konsoli mapy |
| `tests/project-showroom.test.cjs` | Regresje trajektorii, sześciu powierzchni, fokusu i filtrowania |
| `scripts/qa-final-website.cjs` | Rzeczywisty odbiór sześciokątów, rotacji, wysunięcia i 100 cykli |
| `index.html` | Wygenerowana strona główna |

Dodatkowo powstał ten raport i [katalog dowodów](evidence/mechanical-showroom-v5-20261023/README.md). Pozostałe zmiany kodu widoczne w `git status` istniały już przed sprintem. Dane katalogu nie zostały zmienione: Glikemia — Dostępny APK 1.0, Mail — Wersja testowa, Lud&Pra — Finalizacja; połączenia ekosystemu pozostają planowane. [Kontrola zakresu](evidence/mechanical-showroom-v5-20261023/scope-verification.json) porównuje także markup pozostałych sekcji i stopki.

## Wyniki funkcjonalne

| Kontrola | PASS | FAIL | BLOCKED | Dowód |
|---|---:|---:|---:|---|
| Generator / składnia JavaScript | 14 projektów / 23 pliki | 0 | 0 | `build-check.log` |
| JavaScript | 73 | 0 | 0 | `node-tests.log` |
| Python | 118 | 0 | 0 | `python-tests.log` |
| Pełny końcowy Chrome | 94 | 0 | 0 | `browser/report.json` |
| Rzeczywiste zdarzenia dotykowe, klawiatura, filtr, search w Chrome | 5 | 0 | 0 | `input-review.json` |
| Dodatkowe szerokości 700, 701, 768, 900, 1024, 1100, 1101, 1280 px | 8 | 0 | 0 | `breakpoint-review.json` |
| HTTP: 68 zasobów + 4 scenariusze pobrania Glikemii | 72 | 0 | 0 | `http-check.json` |
| Linki wewnętrzne | 856 | 0 | 0 | `internal-links.json` |
| Zachowanie zakresu i danych | 17 | 0 | 0 | `scope-verification.json` |
| Fizyczny Android | 0 | 0 | 1 | `hardware.json`: pusta lista ADB |

Pełny Chrome sprawdza wszystkie **14 projektów × 4 rozdzielczości** (1920 × 1080, 1440 × 900, 390 × 844, 320 × 568), rzeczywistą rotację i wysunięcie, naturalne przewijanie, fokus, mapę sześciu węzłów, planowane połączenia, reduced motion, brak JS, lokalny brief oraz błędne wejście wyszukiwania. Dodatkowy test dotykowy przesunął Glikemię do Mail; pionowy gest zmienił `scrollY` z 298 na 433 bez zmiany projektu.

Po **100 otwarciach/zamknięciach Tax**: DOM **2171 → 2171**, listenery **159 → 159**, dokumenty **1 → 1**. Po 30 wyborach ról i dwóch zmianach breakpointu mapy: DOM **2225 → 2225**, listenery **172 → 172**. To pomiary po zapisanej rozgrzewce, z wymuszeniem GC i bez tolerancji wzrostu. Brak błędów konsoli oraz odpowiedzi zasobów ≥400; **33 wejściowych plików UI** zachowało identyczne hashe przez cały odbiór.

Polecenia odtwarzające główne kontrole:

```bash
npm run check
env -u NODE_TEST_CONTEXT npm test
/tmp/progresskit-final-20261022/venv/bin/python -m unittest discover -s tests -p 'test_*.py'
node scripts/qa-final-website.cjs http://127.0.0.1:8130/ docs/evidence/mechanical-showroom-v5-20261023/browser
node docs/evidence/mechanical-showroom-v5-20261023/breakpoint-review.cjs
node docs/evidence/mechanical-showroom-v5-20261023/input-review.cjs
python3 docs/evidence/mechanical-showroom-v5-20261023/verify-scope.py
git diff --check
```

Nie dodawano tolerancji do testów pamięci. Test kolizji dostosowano z prostokątnych obwiedni do sześciu wierzchołków powierzchni; rozszerzono kontrolę breakpointów po znalezieniu faktycznych problemów wizualnych.

## Wyjaśnienie wcześniejszego +1 DOM

Historyczny raport V3 nadal zawiera swój wynik **92 PASS / 1 FAIL**: licznik CDP zmienił się z 2025 na 2026 przy niezmienionych 172 listenerach. Nie nadpisano raportu ani nie dodano tolerancji `+1`. Tamten pomiar nie zapisał tożsamości dodatkowego węzła, więc nie da się rzetelnie wskazać jego rodzaju retrospektywnie.

Kontrolowany eksperyment na obecnym markupu, przy podmienieniu wyłącznie trzech kontrolerów na ich wersje sprzed sprintu, wykazał tworzenie **60 elementów P i 150 węzłów tekstowych** podczas 30 wyborów roli i 20 otwarć/zamknięć. Powodem było budowanie etykiet konsoli od nowa oraz przypisywanie `textContent`. Poprawka zachowuje elementy i zmienia istniejące węzły tekstowe. Ta sama sekwencja po poprawce tworzy **0 nowych węzłów DOM**; istniejące opisy są nadal przenoszone między pozycjami.

W obu wariantach zimny pomiar 2165 przeszedł do 2173 po pierwszym użyciu rozwinięcia. Po osobno zapisanej rozgrzewce licznik wynosił **2173 → 2173**, listenery **152 → 152**. [Pierwszy pomiar bez rozgrzewki](evidence/mechanical-showroom-v5-20261023/allocation-diagnostic-cold.json) pozostaje w dowodach, podobnie jak [właściwe porównanie](evidence/mechanical-showroom-v5-20261023/allocation-diagnostic.json). Pomiar alokacji używa WeakSet, który nie zatrzymuje usuniętych węzłów. Ten eksperyment identyfikuje zbędną alokację; nie dowodzi, że właśnie ona spowodowała historyczny pojedynczy węzeł CDP.

Niezależny pełny test GUI zachowuje dokładną bramkę `documents/nodes/jsEventListeners po <= przed`, bez tolerancji, i obejmuje 100 otwarć/zamknięć. Wynik i liczniki znajdują się w tabeli powyżej oraz raporcie przeglądarkowym. To ograniczony test lokalny, nie dowód braku wszelkich możliwych wycieków w każdej przeglądarce.

## Odbiór wizualny i urządzenia

**Zgodność geometryczna w lokalnym odbiorze: PASS.** Obejrzane rzeczywiste screenshoty pokazują centralną piastę PK, sześć sześciokątnych modułów, ciągły ruch po obwodzie i powiększoną sześciokątną obudowę z rzeczywistym panelem. Materiały, czerwone akcenty i wspólny korpus zastępują prostokątną tablicę. Zachowane są pełna stopka i mapa z prawdziwymi statusami. Nie deklaruję kopii 1:1 referencji.

[Galeria wszystkich wymaganych ujęć i dwóch nagrań](evidence/mechanical-showroom-v5-20261023/README.md). Najważniejsze: [HERO](evidence/mechanical-showroom-v5-20261023/browser/1440-first.png), [obrót](evidence/mechanical-showroom-v5-20261023/browser/1440-rotation.png), [Glikemia](evidence/mechanical-showroom-v5-20261023/browser/1440-glikemia-premium-expanded.png), [ekosystem](evidence/mechanical-showroom-v5-20261023/browser/1440-ecosystem-map.png), [pełna stopka](evidence/mechanical-showroom-v5-20261023/browser/1440-footer-full.png), [mobile HERO](evidence/mechanical-showroom-v5-20261023/browser/390-first.png), [mobile projekt](evidence/mechanical-showroom-v5-20261023/browser/390-glikemia-premium-expanded.png).

Host zidentyfikowany przez DMI: **ThinkPad T480s, 20L8S57601**. Testy wykonywał prawdziwy Chrome w trybie headless na tym komputerze. To nie jest ręczny odbiór pełnego okna ani pomiar sprzętowego FPS. Browser plugin nie udostępniał przeglądarki, dlatego użyto lokalnego Chrome z osobnymi profilami testowymi.

**Pełna akceptacja sprzętowa sprintu: PARTIAL. Android fizyczny: BLOCKED**, ponieważ `adb devices -l` nie wykazało telefonu. Widoki mobilne i gesty przeszły emulację, która nie zastępuje testu fizycznego urządzenia. Nie instalowano aplikacji ani nie zmieniano danych urządzeń.

Wcześniejszy pojedynczy węzeł CDP ma nadal nieustaloną tożsamość historyczną; aktualne pomiary i usunięta zbędna alokacja są udokumentowane osobno. Żadnego z tych ograniczeń nie zamieniono na deklarację pełnego PASS.


## Korekta dokumentacji dowodowej

Skopiowany do nowego katalogu skrypt kontroli linków początkowo zachował starą, wpisaną na stałe ścieżkę wyniku. W efekcie nadpisał **jeden wcześniejszy artefakt**: `docs/evidence/status-and-assets-v3-20261023/internal-links.json`. Poprawiono wyjście nowego skryptu na katalog V5 i wykonano właściwy raport ponownie. Nie odnaleziono kopii pozwalającej odtworzyć poprzedni JSON bajt w bajt; nie przedstawiono go jako oryginału. Stary manifest nadal przechowuje jego pierwotną sumę, która obecnie nie pasuje. [Dokładny zapis zdarzenia i sumy](evidence/mechanical-showroom-v5-20261023/historical-report-note.json).

To dodatkowa zmiana wygenerowanego dokumentu poza 12 plikami źródłowymi sprintu. Historyczny raport przeglądarkowy V3 z 92 PASS / 1 FAIL, jego pomiary DOM, katalog projektów i dane użytkownika pozostały nienaruszone przez ten skrypt.
