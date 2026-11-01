# Kontrola zachowania materiałów V3

Data: 2026-10-23T13:10:45.436399+00:00. Repo: `/home/pawe/Pulpit/Projekty It/ProgressorKit Systems`. Baza: `9322e4e4b35be58517fbf7073c8015673770ef43`.

Wynik kontroli źródeł: **11 PASS / 0 FAIL**. Porównanie AST obu zmienionych CSS daje **0 zmian właściwości innych niż materiały/kolory**. Geometria, transformacje, animacje, czasy oraz keyframes są zachowane. To kontrola źródeł, nie nowy przebieg GUI ani testów Node/Python.

| CSS | Klucze deklaracji przed | Po | Różnice nonmaterial |
|---|---:|---:|---:|
| assets/interface-life.css | 115 | 115 | 0 |
| assets/ecosystem-system.css | 202 | 202 | 0 |

Z porównania wyłączono wyłącznie właściwości materiałów/kolorów wymienione w JSON. W shorthandach border/outline normalizowano tylko tokeny koloru HEX; szerokości, style obramowań i `!important` nadal podlegają porównaniu. Każdy klucz zawiera selektor oraz kontekst media/keyframes. Pełne hashe i rekordy są w [preservation-review.json](preservation-review.json).

| Zachowana grupa | Pliki | Wynik |
|---|---:|---|
| javascript | 8 | PASS |
| html | 24 | PASS |
| catalogue | 2 | PASS |
| backend | 9 | PASS |
| unchangedCss | 17 | PASS |
| footerDependencies | 6 | PASS |

Wszystkie **19 CSS** zachowują definicje custom properties: **172 deklaracji**, zero zmienionych plików z definicjami. Edytowane dwa CSS nie dodają takich deklaracji. `index.html` i `templates/site.html`, łącznie z fragmentami stopki, są bajtowo identyczne z bazą. Zmienione CSS nie zawierają selektorów stopki. Zamierzona grafika stopki pozostaje **UNCONFIRMED**; nie wykonano jej nowej oceny wizualnej ani podmiany.

Dwie wykryte kolizje mają status **FOUND_FIXED**: kicker ekspozycji otrzymał selektor `#main .project-showroom .section-kicker`, a link Kontakt ma biały tekst również przy `:focus-visible`. Dodatki forced colors i print dotyczą kolorów, tła, obramowania i outline; nie wprowadzają zmian układu lub animacji. Nie przypisujemy temu sprawdzeniu wyniku nowej emulacji przeglądarkowej.

Stan źródeł przed i po zapisie dowodu: **62 pliki, bez zmian**. Zapisano tylko dwa pliki `preservation-review.*`.

## Komendy do powtórzenia kontroli

```sh
git diff --name-only 9322e4e4b35be58517fbf7073c8015673770ef43
git diff --exit-code 9322e4e4b35be58517fbf7073c8015673770ef43 -- '*.js' '*.html' catalog analytics templates assets/site-v4.css assets/site-v5.css assets/visual-acceptance.css assets/home-atmosphere.css assets/brand-atmosphere.css
git diff --check -- assets/interface-life.css assets/ecosystem-system.css
```

Porównanie AST wykonuje `tinycss2 1.2.1`: rekurencyjnie parsuje deklaracje i konteksty at-rule, odrzuca właściwości `materialPropertiesExcluded` z JSON, normalizuje HEX tylko w border/outline i porównuje listy `(wartość, important)` pod kluczem `(kontekst, selektor, właściwość)`. Ten sam algorytm opisuje pole `borderOutlineMethod`; wyniki zawierają pełne hashe wejść i listy różnic, bez zmiany celu istniejących testów.

## Uzupełnienie ograniczonego poszukiwania oryginałów

Wcześniejsze poszukiwanie nie było pełnym audytem wszystkich lokalnych/ignorowanych plików. Obecnie jawnie uwzględniono `.local` oraz powiązany z ProgressKit katalog obrazu wskazanego przez dokumentację. Nie przeglądano treści losowych grafik UUID innych produktów ani całych archiwów.

- `generated_images`: potwierdzony wcześniejszy **EDIT HERO**, 1983×793, 2212542 B, SHA-256 `954bdff17d5ae0b0d8e54e59605c1ac6c27b70c7c15d3f0e3dfc8fc0517e4d86`. Dokładna ścieżka w JSON. Obraz góry/księżyc/mur nie jest oryginałem stopki.
- Ignorowane `.local`: **4 katalogi release, 20 kopii, 5 unikalnych znanych assetów**. Hash każdej kopii zgadza się z odpowiednim znanym plikiem strony. Bez nowego potwierdzonego materiału czerwonego aluminium lub lasu z górami.
- Attachments: 149 plików, 148 TXT i 1 indeks JSON, zero obrazów lub plików bez rozszerzenia. `/mnt/data` nie istnieje.

| Znany asset `.local` | Kopie | SHA-256 |
|---|---:|---|
| progressorkit-primary.png | 4 | `29875e2751973261055c4d75c436b17db0cab413b53f996f5c476ae447cf6532` |
| og-progresskit.jpg | 4 | `4a2bebfed7c8e177f1c5f119dce3f7121140b0d0f583cf180a941a91a68a34dd` |
| hero-landscape-v5.webp | 4 | `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad` |
| progressorkit-stamp.png | 4 | `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3` |
| stone-material.svg | 4 | `f3d99545fc29a467f2f55decd89f71bfcc52dd33c1c156f33827103ce74ea938` |

To **bounded search, not exhaustive**. Oryginały żądanych materiałów pozostają **UNCONFIRMED / NOT_IDENTIFIED**. Nie oznacza to, że nie istnieją w innym miejscu. Pełne wcześniejsze pochodzenie i odrzucone kandydaty: [asset-provenance.json](asset-provenance.json). Nie wygenerowano zamienników, nie kopiowano grafik do `assets`, nie zmieniono stopki ani innych plików produktu. Bez commit/push/deploy.
