# Dowody V3 — zatwierdzone grafiki i faktyczne stany

Data: 23.10.2026. HEAD `9322e4e4b35be58517fbf7073c8015673770ef43`. [Raport zmian, testów i zgodności wizualnej](../../STATUS_AND_ASSETS_V3_20261023.md). Podgląd: **http://127.0.0.1:8111/**. Bez commita, pusha i deploymentu.

## Pochodzenie i dane

- [asset-provenance.md](asset-provenance.md), [approved-assets.json](approved-assets.json), [README dostawcy](supplied-asset-readme.txt): dwa obrazy są zatwierdzonymi rekonstrukcjami, nie odzyskanymi oryginałami; dokładne kopie bajtowe z ZIP.
- [project-status-audit.md](project-status-audit.md) i [JSON](project-status-audit.json): Mail **Wersja testowa**, Community **Finalizacja**, Glikemia **Dostępny APK**; źródła kodu, historycznych testów i deklaracji właściciela rozdzielone.
- [final-scope-review.md](final-scope-review.md): niezależny przegląd zachowania 14 projektów, 11 pozostałych rekordów, case studies, pięciu planowanych połączeń i publicznej whitelist.

## Testy i zrzuty

- [build-check.log](build-check.log): 14 wpisów katalogu / 23 zgodne pliki wynikowe i składnia JS.
- [python-tests.log](python-tests.log): 118 PASS / 0 FAIL / 0 SKIP.
- [node-tests.log](node-tests.log): 71 PASS / 0 FAIL / 0 SKIP.
- [browser/report.json](browser/report.json), [browser/run.log](browser/run.log): pełny przegląd Chrome, 32 hashe wejść przed/po, pomiary i jawne wyniki poszczególnych kontroli. Aktualny wynik z ewentualnym uzupełnieniem diagnostycznym podaje raport główny.
- [memory-diagnostic.json](memory-diagnostic.json): UNRESOLVED_MEASUREMENT; pełny wynik 92/1 pozostaje. Trzy niezależne sesje i 12 bloków nie odtworzyły wzrostu ponad rozgrzaną bazę; brak potwierdzonej przyczyny pierwotnego +1. [Helper](memory-diagnostic.cjs).
- [status-and-asset-review.json](status-and-asset-review.json): 46 PASS / 0 FAIL; poprawne stany po hydratacji, filtry, legacy Mail, case studies, panorama i pełne stopki na 1440/390/320 px, forced-colors/print, brak poziomego overflow i błędów zasobów. Skrypt [status-and-asset-review.cjs](status-and-asset-review.cjs).
- [http-check.json](http-check.json), [log](http-check.log): końcowe 71 PASS / 0 FAIL, 67 zasobów zgodnych bajtowo/SHA i cztery scenariusze APK. Syntetyczny licznik pełnego GET 2→3. [Rewalidacja po poprawce CSS](http-responsive-fix-revalidation.json).
- [internal-links.json](internal-links.json): 856 PASS / 0 FAIL, 20 HTML, zero połączeń zewnętrznych. Po tej kontroli zmieniono tylko dwa CSS; adresy i HTML pozostały bez zmian.

68 PNG i dwa MP4 w `browser/` przedstawiają aktualną stronę po poprawce mobilnej; dodatkowe 12 PNG w tym katalogu pokazuje wybór Mail i pełne stopki na trzech szerokościach. Wszystkie kadry są rzeczywistymi viewportami, bez składania. [Wymagane kadry z bezpośrednimi linkami](../../STATUS_AND_ASSETS_V3_20261023.md#zrzuty-do-odbioru). Mobile oznacza emulację, nie fizyczny telefon.

Początkowe nieudane kontrole zachowano jako `python-tests-initial.log`, `status-and-asset-review-initial.json`, `status-and-asset-review-before-responsive-fix.json`, `browser-before-responsive-fix.log`. Poprzednie HTTP to `http-check-before-responsive-fix.json/.log`; końcowy JSON ma aktualne hashe CSS. Nie oznaczać tych początkowych wyników jako bieżące PASS. [Końcowa weryfikacja](final-verification.json) i [manifest SHA-256](manifest.json) obejmują źródła publiczne, zmienione pliki i dowody.

## Odtworzenie lokalne

W katalogu repozytorium, przy działającym podglądzie:

```bash
npm run check
npm test
/tmp/progresskit-final-20261022/venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
node scripts/qa-final-website.cjs http://127.0.0.1:8111/ /tmp/progresskit-status-assets-review-repeat
node docs/evidence/status-and-assets-v3-20261023/status-and-asset-review.cjs
python3 docs/evidence/status-and-assets-v3-20261023/http-check.py
python3 docs/evidence/status-and-assets-v3-20261023/internal-links.py
```

GUI wymaga lokalnego Chrome i Playwright, integracyjne testy Python lokalnego IPC, a HTTP dostępu do loopback. W tym środowisku użyto zatwierdzonego wykonania poza ograniczonym sandboxem. Ścieżka istniejącego środowiska Python jest lokalna. Skrypty HTTP/GUI mają stały adres 8111 i są przeznaczone do tej izolowanej instancji; pełne pobranie APK zwiększy wyłącznie jej syntetyczny licznik. Nie uruchamiać ich przeciw produkcji.

Podgląd: `analytics/preview.py` (uruchamiany przez `scripts/preview.sh`), lokalny port 8111; `PK_PUBLIC_ORIGIN=http://127.0.0.1:8111`, `PK_PRODUCT_DB=/tmp/progresskit-material-v3-20261023/product.db`. PID i log procesu podglądu zapisano w lokalnym `/tmp/progresskit-status-assets-v3-20261023/`. Nie modyfikowano produkcji, zewnętrznych usług ani repozytoriów produktów.
