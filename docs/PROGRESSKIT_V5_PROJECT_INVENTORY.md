# ProgressKit V5 — inwentarz projektów

Stan katalogu: **2026-10-15**, `catalog/projects.json`, `schemaVersion: 1`. Odczytano **17 pozycji briefu**, rozliczonych jako **14 publicznych wpisów**, **2 scalenia tożsamości między numerowanymi pozycjami** oraz **1 brak odnalezionych źródeł**. Wszystkie 17 pozycji ma decyzję poniżej. „Publiczny wpis” oznacza treść kandydata portfolio; nie oznacza publicznego repozytorium, działającego produktu ani wdrożenia V5.

Źródła ustaleń: [audyt mobile i gry](PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md), [audyt platformy i SaaS](PROGRESSKIT_V5_EVIDENCE_SAAS.md), [audyt pozostałych realizacji](PROGRESSKIT_V5_EVIDENCE_OTHER.md). Przegląd repozytoriów odbył się 15.10.2026. Historyczne raporty produktów zachowują własne daty i nie są nowymi uruchomieniami testów.

## Pełne rozliczenie 17 pozycji briefu

| Nr | Nazwa w briefie i aliasy | Wpis katalogu | Decyzja i rodzaj źródła |
| --- | --- | --- | --- |
| 1 | Glikemia Premium | `glikemia-premium` | Osobny produkt; lokalny checkout i raporty |
| 2 | ProgressKit Mail | `progresskit-mail` | Osobny produkt; lokalny checkout i raporty |
| 3 | Lud&Pra / ProgressKit Community | `progresskit-community` | Jedna tożsamość produktu i repozytorium, dwie nazwy |
| 4 | Vaeloria | `vaeloria` | Osobny produkt; lokalny checkout i raporty |
| 5 | ProgressKit Tax | `progresskit-tax` | Osobny produkt; lokalny checkout i raporty |
| 6 | ProgressKit Translator | `progresskit-translator` | Bieżąca wersja 0.2.2; v0.1 w nazwie katalogu nie tworzy drugiego produktu |
| 7 | Adivara | `adivara` | Potwierdzony fundament backendu; nie przypisano ukończonych ekranów operacyjnych |
| 8 | GoTransport360 / GoTrans360 | `gotrans360` | Jedna pozycja briefu; nazwa GoTrans360 potwierdzona kodem |
| 9 | Maria-Salon / Ignira | `ignira` | Jedna implementacja; lokalne źródła i potwierdzone publiczne repozytorium |
| 10 | Lejek Sprzedażowy / Marek Zaworski | `obserwator` | Rozliczone wspólnie z #11. Dostępne źródło jest serwisem autora; samodzielnego lejka i wyników konwersji nie potwierdzono |
| 11 | Obserwator | `obserwator` | **Scalenie #10 + #11** w jednym rekordzie. Brak oddzielnego potwierdzonego repozytorium platformy anonimowej |
| 12 | RWR | `kan-system` | Historyczna nazwa realizacji z #14 |
| 13 | P.A. Barczewska | — | **Brak odnalezionych źródeł w dostępnym zakresie**; bez fikcyjnego publicznego rekordu |
| 14 | System zarządzania kontrolerami biletów / KAN SYSTEM | `kan-system` | **Scalenie #12 + #14** potwierdzone historią portfolio. Źródła aplikacji niedostępne |
| 15 | ProgressKit Systems / progresskit.pl | `progresskit-systems` | Obecne repozytorium portfolio; kandydat V5 |
| 16 | ProgressKit Analytics | `progresskit-analytics` | Kod backendu i integracja w obecnym repozytorium |
| 17 | ProgressKit Infrastructure | `progresskit-infrastructure` | Konfiguracje i narzędzia wspólnego zaplecza w obecnym repozytorium; nie osobny produkt komercyjny |

Rachunek: **17 − 2 scalenia − 1 brak źródeł = 14 wpisów**. Dwie nazwy wewnątrz już pojedynczej pozycji briefu, np. Lud&Pra / Community, nie są dodatkowym odjęciem. Jeden rekord może zawierać wiele nazw historycznych; odwrotnie, kilka numerowanych pozycji może wskazywać na tę samą dostępną implementację.

Źródła rozstrzygnięć: `docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md:22`–`:25` (Community i GoTrans360); `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:4`–`:20` (pozycje #9–#14), `:61`–`:70` (autor/Obserwator), `:81`–`:88` (RWR → KAN). Katalog Translatora i wersja: `docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md:84`–`:99`.

## Pokrycie katalogu, daty i etapy

`updatedAt` oznacza datę ostatniej potwierdzonej zmiany wybranego źródła. Nie jest datą nowego uruchomienia aplikacji, testów ani wdrożenia. Dla zaplecza V5 data 15.10 oznacza bieżący lokalny audyt/zmianę kandydata; nie wymyślono daty commita, którego jeszcze nie utworzono.

| Wpis | Kategoria | Etap z katalogu | updatedAt | Źródło / rewizja | Galeria |
| --- | --- | --- | --- | --- | ---: |
| Glikemia Premium | Aplikacje mobilne | W rozwoju | 2026-09-09 | Lokalny kod `3042927`; QA 31.08 i 09.09 | 2 |
| ProgressKit Mail | Aplikacje mobilne | W rozwoju | 2026-10-10 | Lokalny kod `c9b669ce` i nowszy roboczy raport 10.10 | 2 |
| ProgressKit Translator | Aplikacje mobilne | Prototyp | 2026-10-13 | Lokalny kod/raport 0.2.2 `6932b069`; obraz UI 0.2.0 jest podpisany oddzielnie | 1 |
| Vaeloria | Gry | W rozwoju | 2026-10-13 | Lokalny kod `0716317a`; odrębne raporty 12/13.10 | 2 |
| Lud&Pra / ProgressKit Community | Platformy i społeczność | W rozwoju | 2026-10-15 | Lokalny kod `c64296e0`; raporty lokalnego QA 14.10 | 2 |
| ProgressKit Tax | SaaS i biznes | W rozwoju | 2026-10-11 | Lokalny kod i raport 04B `d56da266` | 0 |
| Adivara | SaaS i biznes | Prototyp | 2026-08-27 | Lokalny fundament `17bc746d`, historyczny raport autoryzacji | 0 |
| GoTrans360 | SaaS i biznes | Prototyp | 2026-08-27 | Lokalny monorepo `27cf7155`; benchmark 23.08 i audyt 27.08 | 0 |
| Ignira / Maria-Salon | Realizacje WWW | `null` — niepotwierdzony | 2026-08-24 | Lokalny i publiczny GitHub `0ac25398` | 0 |
| Obserwator / Marek Zaworski | Realizacje WWW | `null` — niepotwierdzony | 2026-03-19 | Kod odczytany przez GitHub `03f9bbf5`; brak lokalnego checkoutu | 0 |
| KAN SYSTEM | SaaS i biznes | `null` — niepotwierdzony | 2026-08-31 | Wyłącznie historia portfolio `961c50c` i `c9bb17c` | 0 |
| ProgressKit Systems | Infrastruktura i technologie | W rozwoju | 2026-10-15 | Bieżący lokalny kandydat V5, generator i katalog | 0 |
| ProgressKit Analytics | Infrastruktura i technologie | W rozwoju | 2026-10-15 | Kod lokalnego backendu i integracji | 0 |
| Zaplecze ProgressKit | Infrastruktura i technologie | W rozwoju | 2026-10-15 | Lokalne fragmenty konfiguracji, workflow i staging publicznych plików | 0 |

Kategorie liczone z danych: **3 mobile, 4 saas, 1 platforms, 1 games, 2 web, 3 technology**. Wszystkie sześć kategorii ma co najmniej jeden wpis. Galerie: **9 obrazów w 5 wpisach**, zero filmów. Pochodzenie, hashe i ograniczenia materiałów: [PROGRESSKIT_V5_MEDIA.md](PROGRESSKIT_V5_MEDIA.md).

Wszystkie 14 rekordów ma `coverage: partial`. Oznacza to ograniczenie zakresu dowodu, np. niepełny odbiór bieżącego produktu, brak aktualnego runtime lub galerii. Nie oznacza 14 błędnych implementacji i nie jest sztucznym procentem ukończenia. Potwierdzone funkcje oraz plany mają osobne pola.

`stage: null` dla Igniry, Obserwatora i KAN SYSTEM jest zamierzony. Źródła nie potwierdzają obecnej dojrzałości/utrzymania, a nieudany odczyt strony nie dowodzi, że produkt został zarchiwizowany lub wstrzymany. Nie podstawiono `Dostępny`, `Utrzymywany`, `Archiwalny` ani innego zgadywanego etapu. Reguła modelu: `scripts/build-site.py:111`–`:113`; dokładny zakres discovery: `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:14`–`:21`.

## Rodzaje źródeł i granice weryfikacji

**9 lokalnych repozytoriów produktów:** Glikemia, Mail, Translator, Vaeloria, Community, Tax, Adivara, GoTrans360 i Maria-Salon. Audyty wskazują dokładne checkouty, HEAD i zastany working tree. Nie używano nazwy podobnej kopii jako zamiennika właściwego projektu. Zestawienie rewizji i zmian: `docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md:7`–`:20`, `docs/PROGRESSKIT_V5_EVIDENCE_SAAS.md:7`–`:20`, `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:14`–`:18`.

**1 produkt odczytany przez GitHub bez lokalnego checkoutu:** Obserwator/Marek Zaworski. Publiczna widoczność repozytorium została potwierdzona przez connector. Maria-Salon jest dodatkowo publicznym repozytorium, lecz nie liczymy go drugi raz jako nowego produktu. Dwa jawne publiczne linki `repository` w katalogu to wyłącznie te repozytoria. Pozostałe `null` oznaczają brak potwierdzenia publicznego dostępu, a nie twierdzenie, że repozytorium nie istnieje. Źródło: `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:17`–`:20`, `:51`–`:58`.

**1 realizacja potwierdzona tylko historią portfolio:** KAN SYSTEM. Historia nazwy oraz referencji assetu nie potwierdza stosu aplikacji, wykonanych funkcji, oszczędności czasu ani wdrożenia. Tablice funkcji i technologii pozostają puste. Odrzucono stary wskaźnik „−40%”, ponieważ brak pomiaru źródłowego. Źródło: `docs/PROGRESSKIT_V5_EVIDENCE_OTHER.md:81`–`:98`.

**3 wpisy wspólnego obecnego repozytorium:** portfolio, Analytics i zaplecze. Nie są trzema dodatkowymi znalezionymi repozytoriami. Fakty źródłowe: `scripts/build-site.py:15`–`:26`, `:38`–`:118` (katalog i walidacja), `scripts/stage-public.py:11`–`:46` (jawny zestaw plików publicznych), `analytics/app.py:12`–`:25`, `:43`–`:76`, `:86`–`:124` (eventy i SQLite), `assets/site-v5.js:179`–`:200` (integracja), `.github/workflows/static.yml:32`–`:44`, `analytics/deploy/compose.override.yaml:1`–`:16`, `analytics/deploy/Caddyfile.snippet:1`–`:23`. Istnienie konfiguracji nie dowodzi aktualnego stanu VPS.

**Brak #13:** dostępne wyszukiwanie nazw katalogów i repozytoriów nie odnalazło P.A. Barczewskiej. Granica jest dostępowa: nie twierdzimy, że projekt nie istnieje poza przeszukanym zakresem. Wpis można dodać po otrzymaniu źródeł; nie publikujemy zgadywanej technologii, statusu ani grafiki.

## Reguły interpretacji i aktualizacji

- Fakty aktualnego kodu mają pierwszeństwo przed starszym README; przykład Mail i remote Sent opisuje `docs/PROGRESSKIT_V5_EVIDENCE_MOBILE_GAME.md:49`–`:82`.
- Historyczne liczby PASS pozostają przypisane do daty, rewizji i środowiska. Nie sumujemy różnych raportów jako bieżącej regresji. Zakresy: mobile/gra `:39`–`:47`, `:74`–`:82`, `:101`–`:110`, `:127`–`:135`; SaaS `:43`–`:65`, `:102`–`:108`, `:128`–`:130`, `:143`–`:157`.
- Wstępne raporty agentów opisują również materiały, które początkowo odłożono do selekcji. Późniejsza recenzja dodała 7 obrazów do 2 istniejących ekranów Glikemii. Bieżący stan galerii bierze się z katalogu i dokumentu MEDIA, nie z początkowej pustej tablicy w fragmencie audytu.
- Nie odczytujemy pola `updatedAt`, publicznego repozytorium ani screenshotu jako potwierdzenia nowego wdrożenia. Ten inwentarz nie zawiera werdyktu produkcyjnego. Odbiór kandydata V5 i ewentualna publikacja muszą mieć osobny raport.

Weryfikacja inwentarza: liczby wpisów, kategorii, galerii, etapów `null`, repozytoriów oraz mapowanie 17 pozycji porównano bezpośrednio z odczytanym `catalog/projects.json`. Nie zmieniano katalogu w ramach redakcji tego dokumentu.
