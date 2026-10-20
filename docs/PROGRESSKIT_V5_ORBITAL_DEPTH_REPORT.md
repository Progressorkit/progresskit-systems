# ProgressKit V5: głębia orbitalnego showroomu

Data: 2026-10-15. Kontynuacja lokalnego checkpointu `5847179` i odbioru preview 8094.
**Implementacja lokalna: gotowa. Odbiór renderu: OPEN. Push i deployment: NOT RUN.**

1. **Konstrukcja widoczna także na pauzie.** Oddzielne warstwy przodu i tyłu,
   metaliczne powierzchnie, dolne ściany, podziały szczotkowania, stężenia i jasny
   przedni rant. Front SVG ma warstwę 8, tylne moduły 2–5, przednie 10–16. Tylny
   uchwyt zasłania dolny rant dalszych modułów. Track nie tworzy własnego kontekstu
   warstw. Statyczna konstrukcja pozostaje widoczna po zatrzymaniu energii.

2. **Większa ekspozycja, krótsze przejście.** Desktop: promień poziomy do 480px
   zamiast 410, viewport 540px zamiast 620, oś na 40% wysokości zamiast 50%.
   Tylny łuk znajduje się bliżej filtrów. Mobile: viewport 500px, promień pionowy 145px;
   budżet obejmuje powiększoną przez perspektywę przednią część.

3. **Czytelne moduły.** Jaśniejsze srebrne krawędzie, tekst i transparentny grafit.
   Każdy moduł pokazuje nazwę, kategorię, etap albo jawny brak jego potwierdzenia
   oraz małą ikonę z rzeczywistym indeksem. Wymiary bazowe 340×178 / 320×174 /
   do 280×156 są stałe przy danej szerokości ekranu; rozmiar podczas ruchu zmienia ciągła skala
   głębi. Z węzłów usunięto rastry. Wszystkie 9 materiałów pozostało w katalogu
   i hologramie, których dane zachowano.

4. **Rdzeń.** Oryginalny PK, stonowane światło i metaliczna oś integrują środek
   z konstrukcją. Nie dodano nowego monogramu ani fikcyjnych danych.

5. **Połączenia i iskry.** Wyższy kontrast przewodów i aktualne końcówki każdego
   widocznego modułu. Iskry przemieszczają się po wektorze tej samej linii w cyklu
   6,5s, z przesuniętymi fazami i łagodnym wygaszeniem. Przebieg po obwodzie
   podkreśla konstrukcję. Pauza, reduced motion, IO, ukrycie karty i hologram
   zatrzymują automatyczne efekty. Reduced motion pozostawia statyczny detal linii.

6. **Przestrzenna trajektoria.** Jeden model kamery `k=0,24` wyznacza położenie
   modułów, końcówki przewodów i konstrukcję. Perspektywa to
   `1/(1-0,24*cos(theta))`. Front ma skalę 1, tył około 0,613; różnią się także
   światłem, kątem i warstwą. Ręczny obrót interpoluje fazę kąta przez 620ms.
   Przeciąganie korzysta z tej samej fazy: karta i przewód poruszają się razem także
   pod palcem. Cancel wraca łukiem. Jeden projekt pozostaje centralny; filtry 2/3/4
   oraz pełne 14 zachowują prawdziwe tożsamości. Okno ma maksymalnie 5 widocznych
   modułów, z wygaszeniem na tylnej granicy, bez nałożonego duplikatu przy wrap.

7. **Hologram i dostępność.** Filtry, URL, historia, klawiatura, wheel, dotyk,
   CTA i hologram pozostają. Przed zdarzeniem otwarcia geometria jest domykana,
   również przy pominiętej ostatniej klatce. Wyjście sekcji z widoku anuluje
   opóźnione otwarcie. Szybka klawiatura domyka zbyt daleki skumulowany ruch, aby
   fokus trafił do widocznego, interaktywnego modułu. Bez JS dostępna pozostaje
   pozioma kolekcja prawdziwych linków. Przejście filtra lub historii może ustalić
   nowy układ natychmiast, bez niekontrolowanego obiegu ukrytych projektów.

8. **Ostrość H1.** Usunięto deformujący filtr `stone-letter-cut`, obrót 3D,
   perspektywę i przesuwane wejście liter. H1 jest statycznym tekstem z zachowanym
   marmurowym materiałem; cienie liter mają promień rozmycia 0. Pejzaż, wędrowiec,
   PK i fonty pozostają. Źródła nie nakładają blur na litery; rzeczywista ostrość
   na ekranie wymaga oceny w przeglądarce.

9. **Wydajność.** Bez nowej biblioteki, Canvas lub WebGL. rAF działa tylko podczas
   gestu i ograniczonego ręcznego przejścia. Filtr, historia, reduced motion,
   visibility, IO i pagehide sprzątają lub domykają pracę; po zakończeniu nie ma
   zaplanowanej klatki. Nie odczytuje się geometrii DOM co klatkę. Publiczny zestaw
   nadal ma 57 plików, 5920598 bajtów (+27116 względem poprzedniego checkpointu).
   FPS/CPU/GPU i fizyczny Android: **NOT RUN**.

**Wyniki:** 138 PASS / 0 FAIL / 0 SKIP (84 Python + 54 Node), w tym 8 nowych regresji
trajektorii, granicy 5/14, przerwanego obrotu, cyklu strony, pominiętych klatek,
wyjścia poza widok, przeciągania i szybkiego fokusu. Osobno 107 HTTP PASS / 0 FAIL:
57 plików zgodnych bajtowo, trasy/redirecty i prywatne 404. Składnia JS, 2 zmienione
CSS i 3 SVG XML: PASS. Katalog 14/9, dane marki, kod i CSS hologramu oraz pozostałe
sekcje zachowują bajty poprzedniego checkpointu. Dowody: `evidence/progresskit-v5/depth-*`.
Niezależny review i pięć zamkniętych przypadków: [DEPTH_REVIEW](PROGRESSKIT_V5_ORBITAL_DEPTH_REVIEW.md).

**Preview:** http://127.0.0.1:8095/ z bazą `/tmp/progresskit-depth-preview/product.db`.
Własny proces 8094 zastąpiono; serwer 8092 pozostawiono. Kandydat:
`/tmp/progresskit-v5-review`, gałąź `codex/progresskit-v5-20261015`; wcześniejszych
commitów nie zmieniano. Root IDE zachowuje zastaną gałąź i zmiany użytkownika.
Paczka: `/tmp/progresskit-v5-depth-release/progresskit-v5-public.tar.gz`.
Manifest `release.json` obok podaje ostateczny HEAD, SHA-256 i czystość kandydata.

**Do ręcznej akceptacji:** przestrzenny mechanizm na pauzie, czytelność tylnych
modułów, zasłanianie przez konstrukcję, kadry 320/390/768/1024/1440/1920 i 200%,
widoczność iskier, gesty/fokus, ostrość H1 w żywej scenie i płynność na urządzeniach.
Browser zwrócił `No browser is available`, discovery `[]`; nie wykonano zrzutów
renderu ani Lighthouse. Źródła i syntetyczny DOM nie oznaczają visual PASS.
`ownerVisualApproval` pozostaje OPEN; bramka publikacji nadal blokuje wydanie.
