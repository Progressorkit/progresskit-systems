# Zatwierdzone copy V2 — audyt bezpieczeństwa 2026-10-23

Baza Git: `b22201ba32c78fbc05f9b3ff46781e6041c86fe9`. Narzędziowe czasy w JSON pozostają w UTC. Audyt nie zmieniał źródeł ani testów.

- **SAST PASS**: 44 pliki, 6 lokalnych reguł, 0 findings, 0 błędów. To analiza wzorców; cztery PNG większe niż 1 MB zostały pominięte.
- **Gitleaks raw FAIL**: 4 trafienia w historii i 3 w drzewie roboczym. **Reviewed PASS**: wszystkie 7 dokładnie powiązano z kontekstem: 3 syntetyczne fixture negatywnego testu i 4 publiczne fingerprinty podpisu APK. Brak nierozpatrzonych trafień, wyłączonych reguł i wykluczeń ukrywających wyniki. Raporty skanera zachowano bez zmian po wbudowanej redakcji sekretów.
- **Powierzchnie HTML PASS**: 177 atrybutów URL, 5 skryptów wraz z treścią i atrybutami, 6 formularzy/pól oraz brak inline event handlers i inline style pozostają zgodne z bazą. JS zmienia tylko stałe etykiety przez `textContent`. Nowe opisy generatora przechodzą `html.escape`; walidacja sluga i istniejące linki pozostają zachowane. Nie dodano requestów, egress ani sinków HTML.
- **Bez zmian bajtów**: 10 plików backendu, 2 manifesty zależności, 17 CSS, 2 pliki katalogu, metadane APK i test security headers mają identyczne SHA-256 względem bazy. APK pozostaje niezmieniony według Git.
- **SCA/APK/backend: nie ponawiano**. Ten zakres zmienia copy, markup i dwa istniejące testy oczekiwanych tekstów. Odwołania do wcześniejszych dowodów są jawne w `baseline-verification.json`; wcześniejszego PASS ani terminu aktualizacji DB nie przedstawiamy jako nowego skanu podatności. Nie wykonywano ponownej weryfikacji podpisu/CRC APK ani regresji niezmienionego backendu.

Mapy źródeł przed, po i przy finalizacji skanów są identyczne. Skany nie korzystały z sieci; nie wysyłano źródeł ani inventory. Oryginalne bajty logu Semgrep są w deterministycznym `sast.log.gz`; czytelny log różni się wyłącznie końcowymi spacjami, z hashami w `log-normalization.json`.

Dowody lokalne nie potwierdzają wdrożenia, produkcji ani testu na fizycznym urządzeniu. Wyniki regresji i GUI należą do osobnych dowodów nadrzędnego zadania.
