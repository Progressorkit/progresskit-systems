# Katalog portfolio V2 — 2026-11-02

Źródłem publicznych stron jest `catalog/projects.json`; HTML i sitemap są generowane przez `scripts/build-site.py`. Schemat1 pozostaje odczytywalny dla dotychczasowych fixture, a aktualny katalog korzysta ze schematu2.

Dotychczasowe `stage` pozostaje filtrem orientacyjnego etapu. Na kartach i w showroomie główną informacją jest krótki `portfolio.functionalStatus`. Nie wolno utożsamiać statusu implementacji z dystrybucją ani produkcją.

`portfolio` zawiera dokładnie:

- `classification`: product, realization, internal_tool, infrastructure, concept lub historical;
- `aliases`: alternatywne nazwy tej samej tożsamości;
- `functionalStatus`, `distributionStatus`, `productionStatus`: osobne informacje;
- `platforms`: nazwa, implementacja, weryfikacja, dystrybucja i ograniczenia każdej platformy;
- `featureSources`: niepuste odwołania do źródeł dla każdej potwierdzonej funkcji;
- `verification`: data, rewizja, środowisko, zakres, wynik PASS/FAIL/BLOCKED/NOT RUN, opis wyniku, źródło i flaga historyczna.

Nieznana data wykonania może być null wyłącznie dla wyniku historycznego. Daty nie mogą wyprzedzać przeglądu ani bieżącego dnia. `updatedAt` od wersji2 oznacza datę przeglądu źródeł; własne daty testów są zachowane w rekordach dowodowych. Usunięto stały limit przeglądu2026-10-23.

Ścieżki lokalne, linie kodu i szczegółowe problemy bezpieczeństwa pozostają w prywatnych raportach `docs/portfolio-audit-20261102/`. Publiczne źródła mają opis zakresu i rewizję, bez sekretów, adresów infrastruktury i PII. Odczyt aktualnego kodu jest weryfikacją zakresu, nie nowym testem produktu.

Brak kodu oznacza pusty zakres funkcji: OffGrid to koncepcja, KAN to realizacja historyczna. Nie powstają sztuczne funkcje, technologie ani galerie. Aliasy oraz dwie kopie integracji Remote nie zwiększają liczby produktów.

Walidacja: `npm run build`, `npm run check`, testy Python w istniejącym środowisku zależności i `npm test`. Stager publiczny ma jawną listę plików; raporty audytu i materiały marketingowe nie trafiają do artefaktu WWW.
