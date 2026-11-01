# ProgressKit V3 — korekta materiałów

Data: 2026-10-23, Europe/Warsaw. Baza i aktualny HEAD: `9322e4e4b35be58517fbf7073c8015673770ef43`. Podgląd lokalny: **http://127.0.0.1:8111/**. Zmiany pozostawiono niezacommitowane, bez stagingu, pusha i deploymentu.

## Zgodność wizualna — PARTIAL

W istniejącym interfejsie zmieniono materiały: neutralne szczotkowane srebro, ciemny tekst na aluminium, grafitową konstrukcję, wyraźniejsze krawędzie i czerwone refleksy. Zachowano geometrię hero i mapy, sześć węzłów, pięć połączeń, centralny opis oraz istniejące animacje i ich pauzę. Poprawiono również kolory fokusu i stanów aktywnych na jasnych powierzchniach. Materiał wykonano w CSS; nie generowano ani nie podstawiano nowych rastrów.

| Element oceny wizualnej | Status |
| --- | --- |
| Materiały hero i mapy | IMPLEMENTED, obejrzane lokalne kadry desktop/mobile |
| Powrót do neutralnego aluminium, mechanicznej głębi i czerwonych odbić | Oceniony lokalnie na istniejącym układzie; ostateczny odbiór właściciela pozostaje OPEN |
| Oryginalna grafika czerwonego aluminium | NOT_IDENTIFIED |
| Oryginalny las z górami przeznaczony do stopki | NOT_IDENTIFIED |
| Stopka | UNCHANGED; nie przywracano krajobrazu bez potwierdzenia oryginału |

Znaleziono i obejrzano dwie lokalne makiety ProgressKit w `Pobrane`, pokazujące srebrne aluminium i czerwone światło. Są referencjami wizualnymi; nie potwierdzają tożsamości żądanej grafiki czerwonego aluminium i nie zawierają stopki. Nie skopiowano ich do zasobów strony.

Audyt pochodzenia objął dostępne refs Git — 187 commitów, 77 historycznych ścieżek obrazów i 46 unreachable blobs — oraz wskazane lokalne materiały. `docs/reference` nie występuje w dostępnej historii. `bg1–4` przedstawiają zielone grafiki Matrix, a `zdjtlo.png` programistę. Istniejący `hero-landscape-v5.webp` ma udokumentowane pochodzenie jako wcześniejsza edycja hero z górami, księżycem i murem; nie jest potwierdzonym oryginałem stopki z lasem. Dawnej makiety źródłowej nie ma dziś pod zapisaną ścieżką. [Dokładny zakres poszukiwań, ścieżki, hashe i ograniczenia](evidence/material-correction-v3-20261023/asset-provenance.md).

Użytkownik otrzymał opcjonalną prośbę o lokalne ścieżki obu oryginałów. Do chwili identyfikacji nie deklarujemy ich odzyskania ani przywrócenia. Poszukiwania dotyczą dostępnych lokalnych materiałów i historii; nie dowodzą, że pliki nie istnieją w innym miejscu.

## Testy funkcjonalne — PASS

| Kontrola | Wynik |
| --- | --- |
| Generator i składnia | PASS: 14 projektów / 23 generowane pliki |
| Python, w tym istniejący backend i preview | 115 PASS / 0 FAIL / 0 SKIP |
| JavaScript | 69 PASS / 0 FAIL / 0 SKIP |
| Pełny lokalny Chromium | 93 PASS / 0 FAIL; błędy konsoli i zasobów: 0 |
| Stopka na czterech szerokościach | 9 PASS / 0 FAIL; kompletny widok, zachowane linki, identyczny HTML i style obliczone względem bazy |
| HTTP, publiczne zasoby i APK/licznik | 69 PASS / 0 FAIL: 65 plików zgodnych bajtowo, CSP oraz cztery scenariusze pobierania |

Pełny przebieg Chromium obejmuje 1920×1080, 1440×900, 390×844 i 320×568: wszystkie 14 projektów rozwinięto i zamknięto na każdej szerokości. Sprawdzono sześć ról mapy, statusy, Enter/Spację, strzałki/Home/End, Escape, naturalny scroll, brak poziomego overflow, menu mobilne, zachowanie wyboru po odświeżeniu, fallback bez JS, lokalny brief, negatywne wyszukiwanie, pauzę, reduced motion, offscreen i powtarzane cykle pamięci.

Testy HTTP używają wyłącznie `127.0.0.1:8111` i osobnej bazy `/tmp/progresskit-material-v3-20261023/product.db`. Pełny pobrany APK ma 80 235 954 B i SHA-256 `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`; zwiększył lokalny licznik dokładnie o jeden. Range, HEAD i prefetch nie zwiększają licznika. To nie dowód produkcyjnych pobrań ani instalacji urządzenia.

Katalog projektów, nazwy, statusy, opisy, APK, liczniki, nawigacja, JS, HTML i szablony pozostają niezmienione względem `9322e4e`. Wszystkie połączenia ekosystemu nadal mają status planowanych. Brak nowych zależności i nowych odwołań do grafik w CSS. Wyniki funkcjonalne nie są potwierdzeniem zgodności z nieodnalezionymi oryginałami.

## Wymagane kadry

| Widok | Screenshot |
| --- | --- |
| HERO desktop | [1440-first.png](evidence/material-correction-v3-20261023/browser/1440-first.png) |
| Cała mapa ekosystemu desktop | [1440-ecosystem-map.png](evidence/material-correction-v3-20261023/browser/1440-ecosystem-map.png) |
| Rozwinięty Tax | [1440-progresskit-tax-expanded.png](evidence/material-correction-v3-20261023/browser/1440-progresskit-tax-expanded.png) |
| Rozwinięty Translator | [1440-progresskit-translator-expanded.png](evidence/material-correction-v3-20261023/browser/1440-progresskit-translator-expanded.png) |
| Pełna stopka desktop, bez zmian | [1440-footer.png](evidence/material-correction-v3-20261023/1440-footer.png) |
| HERO mobile | [390-first.png](evidence/material-correction-v3-20261023/browser/390-first.png) |
| Mapa mobile | [390-ecosystem-map.png](evidence/material-correction-v3-20261023/browser/390-ecosystem-map.png) |
| Pełna stopka mobile, bez zmian | [390-footer.png](evidence/material-correction-v3-20261023/390-footer.png) |

Pojedyncze rzeczywiste viewporty po naturalnym przewinięciu, z widoczną nawigacją, bez składania i podmiany treści. Łącznie 72 PNG i dwa nagrania interakcji. Odbiór dotyczy lokalnego Chromium i emulacji rozmiarów; brak nowego dowodu fizycznego urządzenia lub produkcji.

## Zmienione pliki

- `assets/interface-life.css`: materiały hero, ekspozycji projektów, nagłówka i istniejących sekcji; neutralne aluminium, grafit, czerwone refleksy oraz czytelne stany fokusu.
- `assets/ecosystem-system.css`: materiały istniejących węzłów, tła i panelu roli; zachowana geometria, treść, statusy i polityka ruchu.
- Ten raport i `docs/evidence/material-correction-v3-20261023/`: audyt pochodzenia, kontrole zachowania bazy, logi testów, kadry, nagrania i manifest hashy.

[Indeks dowodów i odtworzenie testów](evidence/material-correction-v3-20261023/README.md). Nie zmieniano stopki, danych produktów, skryptów aplikacji, szablonów ani plików wynikowych generatora. Nie wykonano commita, pusha, pakowania wydania ani deploymentu.
