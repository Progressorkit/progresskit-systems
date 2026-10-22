# UI V2 — lokalny audyt bezpieczeństwa

Baza Git: `c515f3fcd25de29ee3c57bff1b26c777a506cac1`. Dowody dotyczą zamrożonego lokalnego kodu UI V2; audyt nie zmieniał źródeł aplikacji ani testów.

- Semgrep **PASS**: 44 pliki, 6 lokalnych reguł, 0 findings, 0 błędów. Reguły i surowy JSON są obok. Cztery obrazy PNG większe niż 1 MB pominięto zgodnie z domyślnym limitem skanera; brak deklaracji analizy całego przepływu danych.
- Gitleaks **raw FAIL**: 4 trafienia w 150 commitach i 3 w bieżącym drzewie 271 tekstowych plików. **Reviewed PASS**: wszystkie 7 trafień związano z dokładnym kontekstem; 3 to syntetyczny fixture negatywnego testu, 4 to publiczne fingerprinty podpisu APK. Nie wyłączano reguł ani nie ukrywano plików. Surowe, zredagowane przez skaner raporty zachowano bez zmian; klasyfikacja jest osobnym JSON.
- Offline SCA **PASS**: pełne 18/18 pakietów faktycznego lokalnego środowiska Python, 0 podatności wszystkich poziomów. Baza Trivy z 2026-10-22 13:15:26 UTC była świeża w chwili skanu, następna aktualizacja 2026-10-23 13:15:26 UTC. Kontener nie miał sieci; źródeł ani inventory nie wysyłano. `package.json` nie deklaruje zależności. Nie rozszerza to wyniku na APK, obrazy produkcyjne lub przyszłą rezolucję szerokich zakresów requirements.
- APK **PASS**: SHA-256 `137c6e4bde496346d186e83d7a34b085aded2b8dc4280ab7e1053c44e1c5684b`, 80 235 954 B, 1277 wpisów ZIP bez błędów CRC, apksigner exit 0, podpisy v2/v3 poprawne. Bez testu na fizycznym Androidzie.
- Katalog 14 projektów, metadane APK i 10 plików backendu pozostają zgodne z bazą Git. Mapy 92 tekstowych plików źródeł przed, po i przy finalizacji audytu są identyczne.

Przegląd zmian UI nie wykazał nowych sinków HTML, dynamicznego wykonywania kodu ani zewnętrznego egress. Wygenerowane elementy mechanizmu są statyczne; nowe CSS nie dodają importów, URL ani inline skryptów. Nagłówki CSP i limit 8 KiB kolektora pozostają w niezmienionym backendzie. Uprawnienia mikrofonu, kamery i geolokalizacji oraz framing są ograniczone przez istniejący middleware.

Bramki GUI i regresje są odrębnymi dowodami nadrzędnego zadania. Wyniki lokalne nie potwierdzają wdrożenia, VPS/Caddy/HTTPS, limitowania rozproszonego ani runtime fizycznego urządzenia. Wersje, komendy, zakres oraz hashe są w JSON obok. Oryginalne bajty logu Semgrep zachowano w deterministycznym `.log.gz`; czytelny log ma usunięte wyłącznie końcowe spacje, co opisuje `log-normalization.json`.
