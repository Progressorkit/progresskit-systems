# Niezależny przegląd V2 — 2026-11-02

Tryb: read-only źródeł produkcyjnych; bez zmian katalogu/UI i bez dodatkowej przeglądarki. Przejrzano `catalog/projects.json`, `scripts/build-site.py`, `assets/site-v5.js`, nowe testy V2 oraz granicę `scripts/stage-public.py`.

Nie znaleziono nowego XSS ani niekontrolowanego wyjątku nowych pól V2. W 160 celowanych mutacjach typów metadata/verification walidator zwracał kontrolowany wynik. To sonda granicy typów, nie pełny security gate ani browser QA. HTML nowych pól jest escapowany; source IDs mają ograniczony format, URL wymaga publicznego HTTPS. Stager korzysta z jawnej listy, nie dołącza prywatnych raportów/marketingu. Katalog rozdziela datowane wyniki historyczne od nowych wykonań gotowych DLL Mail i nie przedstawia ich jako świeżego rebuilda.

## Findings do poprawy

1. **P2 — niepełna identyfikacja niezacommitowanego źródła Mail.** `catalog/projects.json:439` i analogiczne źródła `progresskit-mail-f06`–`f12`, `f14` podają wyłącznie HEAD `c9b669ce…`. Prywatny audyt wskazuje `workingTreeSource=true`; `git cat-file -e HEAD:<path>` potwierdza, że m.in. `MailService.cs`, `MainViewModel.cs`, `GoogleOAuthService.cs` i `PasswordChangeEndpoints.cs` nie istnieją w tym commicie. Funkcje są zaimplementowane w working tree, ale sam SHA commitu ich nie odtwarza. Uzupełnić publiczne `revision` o lokalny working tree z datą przeglądu / snapshot manifestu, bez publikowania ścieżek. Prywatne hashe/manifeste pozostają dowodem dokładnych bajtów.

2. **P2 — techniczne szczegóły niezakończonych security findings trafiają do publicznych wyników Tax.** `catalog/projects.json:2317` i analogiczne rekordy zawierają „Zod unbounded” / „trzy FAIL_UNFIXED”. To nie ujawnienie sekretu, ale wykracza poza zasadę `schema-v2.md`, że szczegółowe problemy bezpieczeństwa pozostają prywatne. Zachować FAIL/BLOCKED i informację o otwartym gate; publicznie użyć ogólnego opisu otwartych ustaleń walidacji/vendor. Pełną diagnozę zachować w prywatnym evidence.

3. **P3 — nieustalony licznik renderuje się jako `None SKIP`.** Vaeloria, `catalog/projects.json:1542`: nieznanej liczby pominięć nie przedstawiać jako dosłownego `None` ani zera. Poprawne znaczenie: „liczba pominięć nieustalona; 3 NOT_VERIFIED”.

Drobne korekty redakcyjne: `mg/d L` → `mg/dL`; Mail `mail-current-native` ma „podpisy zapisane w audycie”, choć dowód to SHA-256, nie kryptograficzny podpis DLL — precyzyjniej „sumy SHA-256”.

Przegląd nie przyznaje owner visual approval, gotowości komercyjnej ani wdrożenia. Istniejąca zredagowana galeria Mail pozostaje tylko WWW zgodnie z ustaleniem; nie kwalifikowano jej do promo. Po późniejszych poprawkach powyższe line numbers mogą się przesunąć; identyfikatory rekordów są stabilniejsze.

## Re-check poprawek — 2026-11-02

Wszystkie trzy findings rozwiązane: Mail ma oznaczony working tree/snapshot; Tax zachowuje FAIL/BLOCKED bez szczegółowej nazwy ustaleń; Vaeloria jawnie opisuje nieustaloną liczbę pominięć. Potwierdzono również `mg/dL` i „sumy SHA-256”. To odczyt aktualnych danych, bez ponownego browser QA.

Operator: `catalog/operator.json` zawiera dokładnie trzy pola zgodne z istniejącym legal Lud&Pra; wygenerowana polityka zawiera te dane i datę 2 listopada 2026. Źródło Lud&Pra nadal ma `published=false`; lokalne użycie wskazane przez właściciela nie zamyka finalnego approval publikacji ani przeglądu formalnego. Dane osobowe/adresowe nie są tu powielane.
