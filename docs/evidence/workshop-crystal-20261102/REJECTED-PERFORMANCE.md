# Warsztat: pomiar odrzuconej iteracji z ruchomym refleksem

Status historyczny (prefinal, nie do akceptacji jako wynik końcowy): **PARTIAL — nie potwierdzono zachowania historycznych 7–13 ms**. `ownerVisualApproval: OPEN`.

Pomiary dotyczą wyłącznie samodzielnego, lokalnego Chrome z rzeczywistym ANGLE / Intel Mesa UHD 620. Nie mierzą opóźnienia podglądu osadzonego w aplikacji ani optycznego czasu od ruchu ręki do obrazu. Fizyczny telefon: `NOT_RUN`; mobile w proof to emulacja 390×844 z dotykiem.

## Reakcja na zaufane zdarzenie kursora

Oddzielna próba bez tracingu i filmu: 20 wejść dla bazy i 20 dla końcowego kodu, kolejność ABBA, pierwsza i największa grupa. Baza jest odtwarzana przez nadpisanie wyłącznie trzech odpowiedzi CSS/MJS zamrożonymi plikami `source-before`; kod produktu nie był zmieniany przez profiler.

| Miara | Baza | Końcowa iteracja |
|---|---:|---:|
| event timestamp → stan DOM, mediana | 11,15 ms | 18,30 ms |
| event timestamp → stan DOM, p95 | 33,30 ms | 51,00 ms |
| event timestamp → stan DOM, maksimum | 40,30 ms | 64,30 ms |
| handler → stan DOM, mediana | 0,20 ms | 0,20 ms |
| handler → stan DOM, p95 | 0,40 ms | 0,80 ms |

40/40 zdarzeń miało `isTrusted: true`. Źródła pozostały stabilne, zero błędów strony i zero prób zewnętrznych żądań. Pełne próbki: `crystal-latency.json`. Wersja końcowa jest w tym pliku oznaczona `after-final`; jej hashe odpowiadają końcowemu freeze, a nie poprzedniej odrzuconej iteracji.

Handler pozostaje szybki. W tej próbie kolejka przed handlerem była wolniejsza dla końcowej wersji, zatem nie należy deklarować „brak regresji” ani „7–13 ms zachowane”. Rozrzut i mała próba nie dają gwarancji dla każdego komputera lub osadzonego podglądu.

## Idle, ruch i scroll

Identyczny protokół dwukrotnie przed/po, bez nagrywania. Pierwsza próba zawiera trace, druga nie; trace może zmienić czas wykonania. RAF oznacza dostarczenie callbacków, nie prezentację każdej klatki na monitorze.

W drugiej, nietracowanej próbie końcowe p95 wynosiło: idle 16,7 ms, pointer pierwszej grupy 33,2 ms, pointer największej grupy 33,3 ms i scroll 16,8 ms. Baza: odpowiednio 16,8 / 33,3 / 33,4 / 16,8 ms. Pozostały pojedyncze przerwy przy aktywacji do około 150 ms; baza miała maksima 50–67 ms. Pierwsza, tracowana próba końcowa była gorsza: p95 ruchu 49,9 / 66,6 ms. Nie pominięto tych wyników.

Trace sumy Paint 455,9 → 189,7 ms, RasterTask 422,6 → 281,0 ms, UpdateLayoutTree 299,0 → 383,2 ms. Sumy mogą zachodzić na siebie między wątkami; nie są czasem jednej klatki. Idle nadal generuje dodatkowe około 97 ms obliczeń stylu na 5 s przez animację refleksu. `gradientUpdates: 0`; nie przywrócono przemalowywania gradientów sterowanego kursorem.

Raporty końcowe: `after-final2-crystal-profile.json`, `after-final2-comparison.json`, `after-final2-crystal-trace.json`. Wewnętrzna nazwa iteracji nie oznacza akceptacji ownera.

## Diagnostyka i zachowane próby

Zachowano pierwszą regresję (`after-*`), iterację po usunięciu maski (`after-final-*`), poprzednie próbki latencji (`crystal-latency-before-color-fix.json`) i odrzucone screenshoty w `rejected-masked-layer-screens/`.

Warunki A–H są jednorazowymi ablacjami CSS wyłącznie w odpowiedzi przeglądarki, bez edycji źródeł. Wyłączenie refleksu ograniczało koszt idle, a wyłączenie przejść koloru usuwało wiele równoległych animacji tekstu. Sama promocja `will-change` nie rozwiązała problemu. To przesłanki o kosztach warstw; nie przypisują całego opóźnienia jednej przyczynie. Zablokowana przez CSP pierwsza próba inline jest zachowana jako nieudana diagnostyka i nie wlicza się do wyników.

Korekta interpretacji trace: `compositeFailed: 131072` oznacza `kAnimationHasNoVisibleChange` (optymalizację odcinka bez widocznej zmiany), a nie samodzielny dowód kosztownej animacji main thread. Potwierdzenie enum otrzymano z [oficjalnego nagłówka Chromium](https://chromium.googlesource.com/chromium/src/+/fc3cf4f9e68047b6f4d04780d114ddcdd81dcfd2/third_party/blink/renderer/core/animation/compositor_animations.h).

Nagrania są osobne od pomiarów. MP4 ma 25 fps i prędkość 1×; nie jest to deklaracja wydajności renderowania. Zachowano źródłowy WebM.

Późniejsza hipoteza `crystal-opacity-latency.json` (15 próbek na wariant) również nie potwierdziła niepogorszenia: mediana baza 3,9 ms, opacity-only z pauzą idle 11,6 ms; p95 24,5 → 64,0 ms. To nadal diagnostyka, nie końcowy proof. Prefinal PNG i filmy przeniesiono do `prefinal-translating-reflection/`.


## Ostatni pomiar: final5, aktualna baza

Końcowa para 20×ABBA bez trace: baza mediana 13,30 ms / p95 41,00 ms, final5 mediana 14,35 ms / p95 32,40 ms. Handler 0,25 → 0,30 ms. To porównywalna reakcja na zdarzenie w tej próbie, bez gwarancji historycznych 7–13 ms.

Jednocześnie nowy aktualny frameprobe bazy (ten sam krótki protokół, brak tracingu) wykazał p95 ruchu pierwszej/największej grupy 16,7 / 16,7 ms, a final5 50,0 / 49,9 ms. Final5 miał 2 / 3 przerwy >50 ms; baza 0 / 0. Scroll pozostaje podobny (16,7 → 16,8 ms). **Gate ciągłego ruchu: FAIL w tym pomiarze. Nie wygenerowano końcowych filmów tego stanu, żeby nie przedstawiać go jako zaakceptowanego.** Prefinal filmy są wyraźnie oddzielone.

Wszystkie 40 końcowych zdarzeń było trusted; źródła stabilne, zero błędów strony i zewnętrznych żądań. Zestawienie końcowe: `CURRENT-MEASUREMENTS.json`; raw: `baseline-now-crystal-profile.json`, `after-final5-crystal-profile.json`, `crystal-latency.json`. Wcześniejsze odrzucone próby zachowano.


## Późniejsza próba final6: osiadanie tafli

Ciągły ruch steruje tylko dwoma małymi ogniskami; tafla przyjmuje tilt po 160 ms spokoju. Aktualny paired frameprobe: baza first/large pointer p95 16,8 / 16,7 ms; final6 16,8 / 33,2 ms. Idle/scroll około 16,7–16,8 ms. Największa grupa miała dwa outliery >50 ms (max 116,7 ms), baza zero. Styl aktualizowany w fazie dużej grupy: 49,6 → 17,2 ms, więc koszt per-frame rzeczywiście ograniczono.

Oddzielne 12×ABBA reakcji: baza mediana 5,7 ms, p95/max 17,8 ms; final6 mediana 18,4 ms, p95/max 87,7 ms. Handler 0,1 → 0,2 ms. **Aktywacja nadal FAIL w tym porównaniu; brak końcowych filmów.** 24/24 trusted, sourceStable, brak błędów i zewnętrznych żądań. Aktualne `CURRENT-MEASUREMENTS.json` wskazuje final6; final5 zachowano jako `REJECTED-final5-MEASUREMENTS.json`.
