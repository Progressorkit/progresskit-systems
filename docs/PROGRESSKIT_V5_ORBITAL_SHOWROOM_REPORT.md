# ProgressKit V5: orbitalny showroom i zbiorcza korekta

Historyczny checkpoint `5847179`. Następna poprawka głębi, ostrości H1 i nowy
preview: [ORBITAL_DEPTH_REPORT](PROGRESSKIT_V5_ORBITAL_DEPTH_REPORT.md).

Data: 2026-10-15. Kontynuacja sprintu i checkpointu `b6ac3f8` zgodnie z briefem
`90d3cc04-9e41-468f-b94a-a3a3dc6dabc7/Wklejony tekst.txt`.
**Zmiany wykonane lokalnie. Odbiór wizualny: OPEN. Push i deployment: NOT RUN.**

1. **Koncepcja showroomu.** Pionowe karty 340×510 zastąpiono płaskimi modułami
   380×230, na wspólnej elipsie wokół centralnej osi PROGRESSKIT / EKOSYSTEM.
   Transparentny grafit, neutralne srebro i czerwono-miedziane akcenty zastępują
   wrażenie półki z telefonami. Sześć zaakceptowanych ikon kategorii pozostaje.

2. **Pełny obrót.** Wszystkie 14 tożsamości pozostaje w jednej kolekcji DOM.
   Sterowanie ręczne, gesty, poziomy wheel, strzałki, Home/End i kołowe indeksy
   umożliwiają przejście przez całą kolekcję w obu kierunkach. Jednocześnie widać
   maksymalnie pięć modułów. Ich pozycje wynikają z sin/cos, a karty i przewody SVG
   używają tych samych promieni. Filtry 2/3/4 projektów rozstawiają rzeczywiste
   moduły wokół całej elipsy; pojedynczy projekt trafia do środka bez pustych węzłów.
   Nie dodano automatycznej rotacji kolekcji. Ruch energii można wstrzymać osobno.

3. **Prezentacja projektów.** Moduł zawiera nazwę, kategorię, rzeczywisty etap
   lub „Etap do potwierdzenia” i małą autentyczną miniaturę, gdy istnieje materiał.
   Podgląd jest kadrowanym fragmentem, nie makietą urządzenia. Na tabletach i mobile
   dalsze moduły pokazują kompaktową tożsamość; pełny etap i podgląd są w aktywnym
   module oraz hologramie. Wymiary aktywne wynoszą 320×210 na tabletach i do 290×200
   na telefonach; dalsze moduły mają bazę 138×82. Dekoracje znikają w no-JS fallback,
   który pozostawia poziomą kolekcję prawdziwych linków.

4. **Połączenia i iskry.** Dwie cienkie elipsy konstrukcyjne, powolny przebieg
   po obwodzie, przerywane linie do rzeczywistych węzłów oraz drobne iskry na tych
   liniach tworzą połączony system. Przebiegi trwają 24/14s, pulsy4,8/6s. Przy
   projekcji wyróżnia się przewód aktywnego modułu. Podczas przestawiania i drag
   przewody są wyciszone do zakończenia650ms settle, również po anulowanym geście.
   Unika to odrywania linii od kart. Interakcje nie generują fikcyjnej aktywności.

5. **Hologram.** Zachowano natywny dialog, prawdziwy większy screenshot w całości,
   opis, problem, status, technologie i CTA do case study. Miejsce wybranego modułu
   wyznacza ograniczony origin projekcji; panel rozwija się z wąskiego pasma ze
   stonowanym czerwonym śladem światła. Moduł unosi się, a otoczenie przygasa.
   Centrowanie bocznego modułu nadal kończy się przed otwarciem. Escape, zamknięcie,
   powrót fokusu, bezpieczne adresy i wyścigi timerów zachowują testy regresyjne.

6. **Wydajność i ruch.** CSS3D/SVG, bez Canvas, WebGL, nowej biblioteki lub autoplay.
   Jest jeden DOM element na projekt, maksymalnie pięć widocznych modułów i pięć
   połączeń. Efekty są pauzowane poza widokiem, w ukrytej karcie, przy drag i przy
   hologramie. Przycisk pauzy orbity zachowuje wybór podczas filtrów i projekcji.
   HERO ma osobny przycisk pauzy, a reduced motion ma pierwszeństwo. rAF służy
   jedynie zdarzeniom wskaźnika i jest sprzątany. Publiczny zestaw zwiększył się
   z 5873969 do 5893482 bajtów (+19513), nadal 57 plików. To budżet źródeł;
   FPS, CPU/GPU, Lighthouse i fizyczny Android pozostają **NOT RUN**.

7. **Marmurowy H1.** Matowa mineralna powierzchnia ma rozgałęzione, nieregularne
   żyły, statyczne ziarno, nieregularną krawędź i naturalniejszy cień. Zmniejszono
   srebrną poświatę i połysk; pozostał ciepły, ciemny refleks czerwieni oraz
   powiązanie z zatwierdzoną skałą pejzażu. Nazwa PROGRESSKIT SYSTEMS jest pełna.
   Realizm kamienia pozostaje przedmiotem oceny renderu, nie deklaracją PASS.

8. **Oryginalne PK.** `assets/brand/progressorkit-stamp.png` jest identyczne
   bajtowo z `/home/pawe/Pulpit/logopkpod.png`, SHA-256
   `b41bda6edaf8395a4a4ca61adda0d24c5e9ccf39393b9fd587a9ca9aaffc16b3`.
   Relief zachowuje alfę oryginału, rozmiar 260 i perspektywę środkowej części prawej
   płyty. Nie zmieniono geometrii ani pliku logo. Pejzaż i oba fonty pozostają
   niezmienione. Mały wędrowiec ma 64s progres 2,1px w prawo i 2px w górę w jednostkach
   sceny, z resetem wyłącznie przy przezroczystości. Pauza/reduced motion zatrzymują go.

9. **Motto i teksty.** Dokładna nowa treść: **Technologia ma dawać kontrolę.
   Nie na odwrót.** Motto jest bezpośrednio po H1, w lokalnym DejaVu Serif Italic,
   w stonowanym pergaminowym odcieniu. Font zawiera polskie znaki. Usunięto
   BUILD // CONTROL // FREEDOM z HERO, nawigacji i stopki, bez zamiennego sloganu.
   Kontrola 20 publicznych HTML wykazała 0 zbędnych pauz z odstępami. Zachowano
   zakres 1–5 i parę PL–DE. Poprawiono 25 pól językowych katalogu, metadane, podpisy
   i nagłówek eksportu briefu; identyfikatory, technologie, linki, etapy, obrazy,
   liczby i zakres potwierdzenia nie zmieniły się. Test zgodności V4 uwzględnia
   nową interpunkcję etykiety „TikTok: @progresskit”.

10. **Logo w tle.** Zachowano dwa niskokontrastowe reliefy z oryginalnego PNG:
    pod O mnie/współpraca i w przejściu technologii do kontaktu. Nie dodano nowych
    powtórzeń ani pustych bloków. Maski opacity 0,035/0,028 są poza głównymi akapitami,
    nie przechwytują wskaźnika, a do 1100px i w druku są wyłączone.

11. **Wyzwania, technologie, współpraca.** Interaktywna ekspozycja sześciu
    prawdziwych analiz pozostaje; przejście ma spokojniejsze 380ms/8px i subtelne
    światło aktywnego selektora. Zachowano Problem→Diagnoza→Rozwiązanie→Wynik,
    rozwijane dowody, źródła i obsługę klawiatury. Technologie uporządkowano w 6 grup:
    interfejsy, backend/komunikacja, dane/bezpieczeństwo, infrastruktura, języki/
    narzędzia i przetwarzanie treści. Wszystkie 50 technologii występuje raz, z
    rzeczywistymi licznikami i tymi samymi filtrami. Przyszłe nieprzypisane nazwy
    trafiają do grupy Inne. O mnie, CTA i jeden lokalny brief zachowują przepływ.

12. **Testy.** **130 PASS / 0 FAIL / 0 SKIP: 84 Python + 46 Node.** Dwanaście nowych
    regresji obejmuje geometrię1/2/3/4/14, realne filtry i przewody, pauzę/settle,
    origin hologramu, pauzę sceny oraz kompletność/fallback grup technologii.
    Osobno **107 HTTP PASS / 0 FAIL**, 57 publicznych plików, działające trasy i
    redirecty, prywatne404. Składnia JS, 6 CSS i 2 SVG przechodzi. Linki, galerie,
    pojedynczy brief i CTA obejmuje zestaw regresji. Dowody: `evidence/progresskit-v5/orbital-*`.
    Niezależny review: [ORBITAL_SHOWROOM_REVIEW](PROGRESSKIT_V5_ORBITAL_SHOWROOM_REVIEW.md).

13. **Git.** Kontynuowana gałąź `codex/progresskit-v5-20261015`, izolowany worktree
    `/tmp/progresskit-v5-review`. Zachowano poprzednie commity i root IDE. Nie
    resetowano, nie stashowano, nie zmieniano innych repozytoriów. Lokalna paczka
    `/tmp/progresskit-v5-orbital-release/progresskit-v5-public.tar.gz` zawiera
    publiczną allowlistę; `release.json` obok podaje HEAD, SHA-256 i stan kandydata.
    Nie wykonano push ani deploymentu. `ownerVisualApproval` pozostaje OPEN.

14. **Nowy preview.** **http://127.0.0.1:8094/**, osobna baza
    `/tmp/progresskit-orbital-preview/product.db`. Własny proces 8093 zastąpiono;
    dotychczasowy serwer 8092 pozostał bez zmian. To lokalny podgląd.

15. **Ręczna akceptacja.** Browser ponownie zwrócił `No browser is available`,
    discovery `[]`. **Nie wykonano zrzutów renderu, testu fizycznego telefonu,
    czytnika ekranu ani Lighthouse.** Do oceny pozostają kadr i brak kolizji na
    320/390/768/1024/1440/1920px oraz 200%, realizm marmuru i reliefu, rozmiar
    wędrowca, transparentność modułów, czytelność pobocznych węzłów, subtelność
    iskier, gesty/fokus, projekcja i obie pauzy. Kontrole źródłowe i syntetyczny DOM
    nie są dowodem visual PASS. Publikacja wymaga późniejszej zgody właściciela.
