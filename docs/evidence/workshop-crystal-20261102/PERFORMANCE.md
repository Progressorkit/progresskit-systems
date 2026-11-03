# Warsztat — końcowe lokalne pomiary

W tej parze pomiarów mediana reakcji i p95 ciągłego ruchu są porównywalne z zamrożoną bazą. Ogon próbek reakcji jest wyższy i pozostaje jawny. `ownerVisualApproval: OPEN`.

| Miara | Baza | Końcowy kod |
|---|---:|---:|
| trusted event → stan DOM, mediana (12 próbek) | 5,9 ms | 6,0 ms |
| trusted event → stan DOM, p95 / maksimum | 16,4 ms | 26,3 ms |
| handler → stan DOM, mediana | 0,10 ms | 0,15 ms |
| handler → stan DOM, p95 | 0,50 ms | 0,40 ms |
| RAF p95, pointer pierwszej grupy | 16,8 ms | 16,8 ms |
| RAF p95, pointer największej grupy | 16,7 ms | 16,8 ms |
| RAF p95, idle / scroll | 16,7 / 16,8 ms | 16,8 / 16,7 ms |
| Przerwy >50 ms w czterech fazach | 0 | 0 |

Maksimum callback interval największej grupy to 50 ms w końcowej próbie i 16,8 ms w bazie. Nie ukryto tej różnicy. Próbki są małe: nie stanowią gwarancji 7–13 ms dla każdej interakcji i urządzenia.

Pomiar wykonano w samodzielnym, lokalnym Chrome na ANGLE / Intel Mesa UHD 620, bez tracingu i nagrywania. Baza korzysta z zamrożonych trzech plików `source-before`, reszta strony pozostaje ta sama. Latencja: kolejność ABBA, pierwsza i największa grupa, 12 wejść na wariant, wszystkie 24 zdarzenia `isTrusted: true`. Źródła stabilne, zero błędów strony i zewnętrznych żądań.

Event timestamp → DOM nie jest optycznym input-to-display. RAF callback intervals nie są dowodem prezentacji każdej klatki. Opóźnienie osadzonego podglądu aplikacji: **UNKNOWN**. Mobile w proof to emulacja 390×844; fizyczny telefon: **NOT_RUN**.

Koszt ruchu ograniczono przez przesuwanie dwóch małych ognisk podczas gestu i jednorazowe osiadanie ciężkiej tafli po 160 ms spokoju. Brak animowania całego panelu przy enter/leave, brak pełnopowierzchniowego wygaszania pozostałych tafli, brak przemalowywania gradientów (`gradientUpdates: 0`).

Surowe wyniki: `baseline-final7-crystal-profile.json`, `after-final7-crystal-profile.json`, `crystal-latency-settling-tilt.json`; zestawienie `CURRENT-MEASUREMENTS.json`. Kod benchmarku i hashe: `final7-benchmark-source/` oraz `final7-benchmark-source.json`.

Po pomiarze dodano tylko cleanup poprzedniego panelu przy zmianie focus, reduced-motion `transition:none` wewnętrznego rimu oraz kolor aktywnego tekstu w print. Finalne hashe są odrębne w JSON proof. Nie powtarzano szerokich benchmarków dla tych korekt; końcowe zachowanie funkcjonalne sprawdza osobna QA.

Filmy są rzeczywistym zapisem lokalnej przeglądarki, 1×, H264 25 fps. Nagrywanie jest oddzielone od benchmarków; 25 fps kodowania nie oznacza 25 fps renderera. Surowe WebM są zachowane.

Wcześniejsze regresje i nieudane hipotezy zachowano w oddzielnych raportach i `REJECTED-PERFORMANCE.md`; poprzednie 3 PNG oraz filmy znajdują się w `prefinal-translating-reflection/`. Nie są końcowym proof.
