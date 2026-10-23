# Zatwierdzone teksty V2 — niezależny przegląd lokalny

Przegląd z 2026-10-23 dotyczy pakietu z [APPROVED_COPY_V2_20261023.md](../../APPROVED_COPY_V2_20261023.md), sekcja „Zatwierdzony pakiet”. Podgląd: `http://127.0.0.1:8100/`. Bazowy HEAD: `b22201ba32c78fbc05f9b3ff46781e6041c86fe9`; SHA-256 sprawdzonego `index.html`: `aa13474fc6ec45c8b2e339e68d35359840b9a83a3d4160493095c876aadda0ea`.

- [copy-review.json](copy-review.json): **13 PASS / 0 FAIL / 0 BLOCKED**. Teksty, nazwy, statusy i trzy planowane połączenia odpowiadają zatwierdzonemu pakietowi. Zachowano 14 projektów, treść katalogu, motto i objaśnienia wydań; owner approval pozostaje **OPEN**. Zmiany nie potwierdzają dostępności integracji ani wydania Stable lub Commercial.
- [gui-review.json](gui-review.json): **56 PASS / 0 FAIL / 0 BLOCKED**, po 14 sprawdzeń na każdy viewport. Sprawdzono rzeczywiste kliknięcia pauza/wznów, teksty i `aria-pressed`, nowe `aria-label`, etykietę i przejście CTA do `/projekty/`, dosłowną treść mapy, brak poziomego overflow i wewnętrznych kontenerów przewijania oraz naturalne przewijanie dokumentu. Bez ponawiania pełnej regresji 80 przypadków mechanizmu.
- [screenshot-review.json](screenshot-review.json): **16 finalnych PNG**, każdy ma dokładnie rozmiar jednego viewportu. Obejrzano wszystkie finalne obrazy. Etykiety i opisy mieszczą się w szerokości dokumentu; na telefonicznych viewportach dalsza treść mapy pozostaje dostępna przez zwykłe przewijanie, a dodatkowe ujęcia pokazują pełne opisy i końcową notę.

Rzeczywisty Chromium `155.0.8059.39` przez istniejący Playwright i `/usr/bin/google-chrome`; fallback autoryzowany po potwierdzeniu braku przeglądarki pluginu. Są to emulowane viewporty, bez dowodu z fizycznych urządzeń. Przegląd nie stanowi pełnego audytu WCAG, pomiaru wydajności ani weryfikacji produkcji.

| Viewport | Pierwszy ekran | Początek ekosystemu | Dalsza treść przy naturalnym przewijaniu |
| --- | --- | --- | --- |
| 1920 × 1080 | [pierwszy ekran](1920-first.png) | [cała mapa](1920-ecosystem.png) | Cała mapa i nota mieszczą się w ujęciu ekosystemu. |
| 1440 × 900 | [pierwszy ekran](1440-first.png) | [początek mapy](1440-ecosystem.png) | [komunikacja i nota](1440-ecosystem-bottom.png) |
| 390 × 844 | [pierwszy ekran](390-first.png) | [Tax i Translator](390-ecosystem.png) | [AI i Voice](390-flow-middle.png), [Mail i komunikator](390-communication-bottom.png), [końcowa nota](390-roadmap-note.png) |
| 320 × 568 | [pierwszy ekran](320-first.png) | [Tax](320-ecosystem.png) | [pełny opis Translatora](320-translator-description.png), [AI i Voice](320-flow-middle.png), [Mail i komunikator](320-communication-bottom.png), [końcowa nota](320-roadmap-note.png) |

Finalne ujęcia powstały przez naturalny scroll do początku wskazanego elementu minus 90 px, odczekanie 800 ms i `page.screenshot({ fullPage: false })`. Header i skip link nie były ukrywane, a DOM i style nie były zmieniane. [screenshot-review.cjs](screenshot-review.cjs) utrwala helper. Oryginalne, zastąpione ujęcia elementu są zachowane w [stitching-first/](stitching-first/README.md): zawierają artefakt składania wysokiej sekcji ze sticky headerem i nie są finalnym dowodem wizualnym. Zmiana helpera nie zmieniła ani nie zwiększyła 56 wyników semantycznych.

Agent przeglądu zapisywał wyłącznie dowody. Nie zmieniał produktu ani testów, nie wykonywał restartu, commit/push/deploy. Zatwierdzenie wizualne właściciela pozostaje osobną bramką **OPEN**.
