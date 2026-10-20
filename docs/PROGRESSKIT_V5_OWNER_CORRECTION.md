# ProgressKit V5 — pierwsza korekta właściciela (zapis historyczny)

Najnowszy brief zastąpił opis małej sygnatury i okien kategorii reliefem PK, pełnym tytułem i wspólnym showroom360/hologramem. Aktualna implementacja i wyniki: [FINAL_VISUAL_REPORT](PROGRESSKIT_V5_FINAL_VISUAL_REPORT.md). Zakaz publikacji nadal obowiązuje.

Data: **2026-10-15**, Europe/Warsaw. Status: **PARTIAL / NOT DEPLOYED**.
Odbiór kompozycji: **OWNER VISUAL APPROVAL OPEN**.
Przeglądarka i bezpośrednia kontrola wizualna: **OPEN / NOT RUN**.

To korekta prowadzonego sprintu, nie nowy projekt ani polecenie wycofania discovery.
Nadrzędne źródło to załącznik właściciela
`/home/pawe/.codex/attachments/0adae4f5-db6b-4b95-b26c-02ada6318f87/Wklejony tekst.txt`.
W szczególności wiersz 482 nakazuje:

> Nie publikuj nowego wyglądu produkcyjnie, dopóki jego kompozycja nie zostanie zaakceptowana przez właściciela.

Jest to wyraźna bramka użytkownika, a nie dodatkowa procedura wymyślona przez agenta.
Nie udzielono jeszcze akceptacji końcowej kompozycji. Niczego z nowego wyglądu
nie opublikowano produkcyjnie. Działająca istniejąca V4 lub udany GET nie potwierdza V5.

## Zachowany zakres techniczny

Zachowuje się centralny katalog **14 wpisów**, rozstrzygnięte aliasy, **9 sprawdzonych
screenshotów**, case studies, źródła dowodowe, szablony, istniejącą logikę
`assets/site-v5.js`, testy, ochronę danych i backup użytkownika. Korekta nie
upoważnia do zmian w repozytoriach produktów ani ponownego rozpoczynania discovery.

Inwentarz i media pozostają udokumentowane w
`PROGRESSKIT_V5_PROJECT_INVENTORY.md` i `PROGRESSKIT_V5_MEDIA.md`.
Snapshot pierwotnego `index.html` oraz patch zmian użytkownika pozostają w
`/tmp/progresskit-v5-before/`; oryginalny cinematic Vaelorii zachowano. Nie wykonuje
się resetu, czyszczenia ani force push w celu wyrównania lokalnego HEAD z oddalonym
o trzy commity `origin/main`.

## Obowiązujący układ

| Miejsce | Zakres po korekcie |
| --- | --- |
| Strona główna, początek | Hero → sześć kategorii |
| Bezpośrednio po kategoriach | O mnie oraz współpraca i działające CTA |
| Dalej na homepage | Krótki wybór wyzwań inżynieryjnych → technologie → kontakt z jednym briefem → stopka |
| `/projekty/` | Pełny katalog, wyszukiwanie, filtry, wszystkie karty i historia stanu |
| `/projekty/<slug>/` | Pełne case study, architektura, funkcje, galeria, dowody, ograniczenia i rozwój |
| Istniejące adresy produktów | Zachowane właściwe treści i wspólny shell; bez gubienia dystrybucji Glikemii |

Na stronie głównej nie ma sekcji „Wybrane projekty” ani pełnego gridu pod inną
nazwą. Projekty odkrywa się w panelach kategorii lub przez osobny indeks.
Powiązanie projektu, kategoria, etap i licznik pochodzą z katalogu JSON.
Nie tworzy się drugiej ręcznej listy danych.

Nazwy sześciu kategorii: **Aplikacje, SaaS, Platformy, Gry, Realizacje WWW,
Infrastruktura**. Pozostają wszystkie zweryfikowane wpisy, również KAN SYSTEM
z jawnym ograniczeniem źródeł oraz wspólne zaplecze.

## Panele kategorii

Podstawą jest natywne `details`/`summary`. Kliknięcie, tap i klawiatura muszą
umożliwiać otwarcie panelu bez JavaScript. Każdy panel pokazuje nazwę, rzeczowe
zastosowanie, etap, mały prawdziwy obraz, jeżeli istnieje, i link do pełnego projektu.

Rozszerzenie JavaScript obejmuje hover dla precyzyjnego wskaźnika, krótkie
opóźnienia i wspólny obszar kafel→panel, aby przejście kursora nie zamykało panelu.
Zamknięcie następuje po opuszczeniu obszaru, kliknięciu poza panelem lub Escape;
focus wraca do właściwej kontrolki. Mobile korzysta z tap i przycisku zamknięcia.
Należy utrzymywać zgodność `aria-expanded` ze stanem panelu, jeden otwarty panel,
widoczny focus i `prefers-reduced-motion`. Nie stosuje się gigantycznego
pełnoekranowego modala kategorii ani niepotrzebnej blokady przewijania.

To warunki implementacji i odbioru. Dopóki nie wykonano rzeczywistego testu
przeglądarkowego, nie oznacza się hover, pointer bridge, touch, fokusu lub wyglądu
jako PASS na podstawie samej obecności kodu.

## Hero, logo i paleta

Dominują kamień, grafit, czerń, stalowe szarości, aluminium, metaliczne srebro
i głęboka czerwień. Niebieska dominacja, nowy logotyp i zamienny monogram
są niedopuszczone.

Kompozycja hero wymaga:

- dużego kamiennego napisu PROGRESSKIT przy lewym górnym rogu, z minimalnym bezpiecznym odstępem;
- oryginalnego małego logo PK z V4 w prawym dolnym rogu jako osobnej sygnatury;
- istniejących gór, księżyca, muru/skalnej konstrukcji i czerwonego światła;
- czytelnego tekstu oraz responsywności bez zasłaniania krajobrazu.

Napis HTML/CSS realizuje dostępną typografię; jego obecność nie zastępuje oceny
całej kompozycji. Właściciel doprecyzował oryginalne logo jako miedziany plik
`/home/pawe/Pulpit/logopkpod.png`. Jest bajtowo identyczny z użytym w hero
`assets/brand/progressorkit-stamp.png`: 1254×1254 RGBA, SHA-256
`b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
Zachowano kształt i barwy bez filtrów; nie wygenerowano nowego PK.

**Źródłowy krajobraz został odnaleziony i zintegrowany.** Po wcześniejszym
bezskutecznym przeglądzie repozytorium właściciel wskazał
`/home/pawe/Pobrane/a_dark_cinematic_high_end_ux_ui_website_landing.png`
i wyraźnie upoważnił do wydzielenia hero oraz usunięcia wtopionego interfejsu.
Późniejsza instrukcja dopuszcza tę konkretną edycję tła marki; nie dopuszcza
generowania logo ani fikcyjnych screenshotów produktów.

Jedno wywołanie wbudowanego imagegen usunęło tekst, CTA i litery ściany
z istniejącego źródła. Odtworzono fragmenty zasłonięte UI. Obejrzano wynik PNG
i końcowy WebP: rozpoznawalna kompozycja gór/księżyca/muru została zachowana,
ale wynik nie jest identyczny pikselowo ze źródłem. Oryginał pozostał niezmieniony.
Pełny prompt i pochodzenie: `PROGRESSKIT_V5_HERO_ASSET.md`.

Stan `catalog/brand.json`:

```json
{
  "heroBackground": "assets/brand/hero-landscape-v5.webp",
  "heroSourceStatus": "REVIEWED_EDIT",
  "ownerVisualApproval": "OPEN"
}
```

Konfiguracja zasila generowane `assets/hero.css`, a publiczny allowlist zawiera
wskazany WebP. Plik ma 1983×793 px, 201 050 B, SHA-256
`78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
Brak źródła nie jest już blockerem. Pozostają bezpośrednie testy kadrowania strony,
interakcji i akceptacja kompozycji przez właściciela. Nie deklarujemy zatwierdzonego
finalnego hero ani wyglądu na podstawie oględzin samego assetu.

## O mnie, CTA i zwięzła strona główna

Sekcja przedstawia rzeczywistego samodzielnego twórcę i kompetencje wynikające
z repozytoriów: aplikacje, backend/API, dane, SaaS, infrastruktura, platformy
i gry. Nie dodaje zespołu, klientów, certyfikatów, doświadczenia ani statystyk
niepotwierdzonych źródłami.

CTA prowadzą do istniejącego kontaktu, briefu lub materiałów. Brief jest jeden;
nadal przygotowuje lokalny plik/druk i nie wysyła automatycznie wiadomości.
Szczegóły inżynieryjne oraz cała historia nie tworzą drugiej ściany kart na homepage.

## Nowy warunek dopuszczenia do publikacji

1. Zachować i ponownie zweryfikować katalog, linki, generowanie, dystrybucję oraz granicę plików publicznych.
2. Wygenerować nowego kandydata z osobnym `projekty/index.html` i `assets/hero.css`. Liczba plików z wcześniejszej paczki jest historyczna; użyć aktualnego manifestu.
3. W rzeczywistej przeglądarce sprawdzić sześć paneli, desktop/mobile, tap, pointer bridge, klawiaturę, focus, Escape, galerię, reduced motion, brak duplikacji i wszystkie CTA.
4. Przygotować rzeczywisty podgląd z odnalezionego i zintegrowanego assetu hero. Źródło oraz autoryzowana edycja są udokumentowane; niedostępna przeglądarka pozostawia test kompozycji i kadrowania OPEN.
5. Przed publikacją uzyskać **wyraźną akceptację właściciela dla tej kompozycji**, powiązaną z podglądem/kandydatem. Samo zaliczenie testów nie zmienia `ownerVisualApproval`.
6. Dopiero po zamknięciu tej i pozostałych bramek zastosować procedurę z `PROGRESSKIT_V5_DEPLOYMENT.md`; nie uruchamiać przedtem automatycznej publikacji nowego wyglądu przez push/workflow. `scripts/check-publication.py` i workflow Pages egzekwują odmowę publikacji przy OPEN, niezależnie od możliwości lokalnego zbudowania kandydata.

Przeglądarka jest nadal niedostępna w przekazanym stanie środowiska. Kontrola
wizualna, dotyk i końcowa akceptacja właściciela pozostają **OPEN**. Testy wcześniejszej
wersji nie stają się automatycznie wynikiem nowej kompozycji. Niniejsza aktualizacja
dokumentacji nie nadaje nowego PASS implementacji UI i nie oznacza wdrożenia.
