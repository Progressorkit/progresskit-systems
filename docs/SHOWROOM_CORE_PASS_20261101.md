# Showroom — rdzeń i lżejsze projekty

Lokalny podgląd: <http://127.0.0.1:8191/#projekty>. Etap obejmuje centralny znak, zamknięte heksagony i ich reakcję na hover/focus.

## Co zmieniono

- **Rdzeń:** nieco większy oryginalny znak, jaśniejszy metal, miękka poświata z 7-sekundowym oddechem i wolny refleks. Ruch działa tylko w widocznej, niezasłoniętej sekcji. Respektuje istniejącą pauzę i ograniczony ruch.
- **Heksagony:** transparentne ciemne szkło, cieńszy optycznie rant, delikatniejsze szczotkowanie i śruby. Zmniejszona jest nieprzezroczystość materiału, a nie tekstu. Treści i nazwy pozostają czytelne.
- **Hover/focus:** rozjaśnienie, przesunięcie powierzchni o 4 px i skala 1,025; jednocześnie mocniej oświetla się rdzeń. Geometria orbit pozostaje w istniejącym kontrolerze. Fokus klawiaturowy ma dodatkowy jasny obrys.
- **Otwieranie:** usunięto wcześniejsze automatyczne rozwijanie po 130 ms ruchu kursora. Uniemożliwiało ono spokojne obejrzenie hover. Szczegóły nadal otwiera kliknięcie, Enter/Spacja lub dotyk; Escape i przycisk zamykają panel. Hover nie zmienia adresu ani układu.
- **Mobile:** bez rozmycia tła na projektach, bez ruchu refleksu i skalowania znaku. Pozostaje wolniejszy oddech poświaty. Dodany odstęp odsłania logo nad aktywnym projektem.

## Pliki

- `assets/world-atmosphere.css` — materiały, rdzeń, reakcje i dostosowanie telefonu.
- `assets/project-showroom.js` — usunięty wyłącznie mechanizm otwierania/zamykania przez hover wraz z jego timerem; zachowane sterowanie, filtrowanie, historia i otwieranie przez aktywację.
- `tests/project-showroom.test.cjs` — dwa istniejące scenariusze potwierdzają teraz, że eksploracja kursorem zachowuje zamknięty panel, a kliknięcie nadal go otwiera.

Nie zmieniono katalogu, HTML, generatora, treści, grafiki logo ani prototypu living-object. Kontrola SHA-256: spośród 202 istniejących źródeł zmieniły się tylko powyższe 3 pliki; pozostałe 199 są identyczne. Repozytorium na początku było czyste, HEAD: `e19fe9f`. Bez commitu, pushu i wdrożenia.

## Sprawdzenie

- `npm run check`: PASS, 14 projektów i 23 wygenerowane pliki.
- Testy showroomu: **36 PASS / 0 FAIL**; obsługi ruchu: **8 PASS / 0 FAIL**.
- Chrome: **40 PASS / 0 FAIL**, bez błędów JS/CSP. Sprawdzono 1440×1000, 1920×1080, 390×844 i 320×568, hover, klawiaturę, dotyk, otwieranie/zamykanie, pauzę, wyjście poza widok, reduced motion, forced colors i dostępność odnośników bez JS.
- `git diff --check`: PASS. Telefony były emulowane; nie wykonywano testów na fizycznym urządzeniu ani benchmarku FPS.

Wczesny przegląd ujawnił konflikt hover z automatycznym otwieraniem. Kolejny wykrył przesłanianie logo na telefonie; poprawiono istniejące reguły mobilne. Końcowe wyniki dotyczą wersji po tych poprawkach. Wbudowana przeglądarka była niedostępna, dlatego użyto lokalnego Chrome z osobnym profilem testowym.

## Podgląd i następny krok

[Przed](evidence/showroom-core-20261101/before.png) · [Po — desktop](evidence/showroom-core-20261101/1920-idle.png) · [Hover](evidence/showroom-core-20261101/1440-hover.png) · [Fokus](evidence/showroom-core-20261101/1440-focus.png) · [Telefon](evidence/showroom-core-20261101/390-idle.png) · [Wyniki Chrome](evidence/showroom-core-20261101/report.json)

Proponowany następny etap: pojedynczy, krótki impuls po konkretnym połączeniu między rdzeniem a wskazanym projektem. Obecnie powiązanie pokazuje wspólna reakcja światła. Warto ocenić ten etap przed dodaniem ruchu na przewodach.
