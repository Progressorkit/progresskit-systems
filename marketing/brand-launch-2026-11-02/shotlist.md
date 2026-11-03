# Shotlista — 30 sekund, 10 autentycznych ujęć

Każdy klip istnieje i ma 3.000 s / 90 klatek, H.264, 1080×1920, 30 FPS, bez audio. Złożony `preview/brand-v1.mp4` ma 30.000 s / 900 klatek. ffprobe, pełne dekodowanie i aktualne hashe: PASS. Root potwierdził czytelność głównych podpisów finalnych kadrów telefonu; owner visual approval pozostaje otwarte.

| Czas | Nr / plik | Autentyczne źródło i zakres | Stan ręcznego review |
|---|---|---|---|
| 00–03 | [01.mp4](clips/01.mp4) | Prawdziwy ProgressKit Core Three.js/WebGL2 na obecnym lokalnym portfolio z 19 pozycjami; oryginalna identyfikacja PK. | Główny podpis czytelny; drobne szczegóły nie otrzymują pełnego PASS. |
| 03–06 | [02.mp4](clips/02.mp4) | Rzeczywisty splash Mail Android i nagłówek dostawców Linux; adres konta i skrzynka poza kadrem. | Obejrzano nazwę/główny obraz na telefonie. |
| 06–09 | [03.mp4](clips/03.mp4) | Tax v2: oddzielne fragmenty nawigacji działów, domyślnego filtra i stałego przycisku zatwierdzania; podpis „Fragmenty interfejsu”. | Obejrzano finalny kadr; bez klienta, historii i identyfikatorów. |
| 09–12 | [04.mp4](clips/04.mp4) | Prawdziwie uruchomiony Swagger Adivary; jawny podpis „API — widok dokumentacji”. | Główny podpis czytelny; drobne szczegóły nie otrzymują pełnego PASS. |
| 12–15 | [05.mp4](clips/05.mp4) | Lud&Pra: prawdziwy nagłówek Discovery i puste wyszukiwanie; bez kart fixture, autorów i rozmów. | Obejrzano nazwę/główną akcję na telefonie. |
| 15–18 | [06.mp4](clips/06.mp4) | Vaeloria: fizyczny gameplay APK 6, oryginalny odcinek 3.9–6.9 s; rzeczywista magia i zmiana HP/MP. | Obejrzano wszystkie 90 klatek; prawa reklamowe potwierdził właściciel. |
| 18–21 | [07.mp4](clips/07.mp4) | Glikemia Premium: rzeczywisty wybór języka, bez pomiarów, PDF i danych pacjenta. | Obejrzano nazwę/główny obraz na telefonie. |
| 21–24 | [08.mp4](clips/08.mp4) | Translator: autentyczny pusty ekran startowy 0.2.0, bez wypowiedzi i historii; nie jest to proof aktualnego 0.2.2. | Obejrzano nazwę/główny obraz na telefonie. |
| 24–27 | [09.mp4](clips/09.mp4) | Faktyczne `showroom-lifecycle.mjs:30–55` i zakresowy TAP `showroom-3d.test.cjs`, w nagranej prezentacji oryginalnych źródeł i wyniku; jawny podpis „Scheduler sceny · 5 PASS / 0 FAIL”. | Główny podpis czytelny; drobne szczegóły nie otrzymują pełnego PASS. |
| 27–30 | [10.mp4](clips/10.mp4) | Oryginalny znak PK i progresskit.pl na grafitowym tle; bez zmiany logo i kolorów. | Obejrzano znak i adres na telefonie. |

Drobny tekst drugorzędny oryginalnego UI nie otrzymuje deklaracji pełnej czytelności. Statyczne fragmenty mają tylko spokojny ruch kadru; nie udają interakcji. Film nie zawiera muzyki, lektora, wymyślonego UI ani planszy zastępczej Adivary. Rzeczywista dokumentacja API nie dowodzi procesów opieki, bazy lub logowania.

[Manifest](manifest.json) zawiera SHA-256 wszystkich 10 klipów, oryginałów i dokładne prostokąty. [Pochodzenie 09](qa/09-code-source.json) wiąże pokazany kod oraz wynik z konkretnymi bajtami. Wcześniejsze próby i siedmioklipowy etap pozostają jawnie historyczne; nie są brakami aktualnego montażu.

**Owner visual approval OPEN.** Całość preview czeka na końcowy odbiór artystyczny. Browser QA witryny i potwierdzenie publicznego wdrożenia są osobnymi bramkami; brak publikacji, commita, pushu i deploya.
