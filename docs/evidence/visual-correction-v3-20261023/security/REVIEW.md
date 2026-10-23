# V3 — lokalny audyt bezpieczeństwa 2026-10-23

Baza Git: `78319345bcf6822d304b5de758aae0297a4ca812`. Narzędziowe timestampy UTC zachowano bez zmian. Audyt nie edytował źródeł aplikacji ani testów.

- **SAST PASS**: 49 plików, 6 lokalnych reguł, 0 findings, 0 błędów. Zakres zawiera nowe JS/CSS, generatory, harness i generated index. Cztery PNG powyżej 1 MB pominięto. To analiza wzorców, bez deklaracji analizy całego przepływu danych.
- **Gitleaks raw FAIL**: historia 4, worktree 3. **Reviewed PASS**: 7/7 benign, w tym 3 syntetyczne fixture negatywnego testu i 4 publiczne fingerprinty podpisu APK. Wszystkie trafienia związano z dokładnymi blobami, liniami i hashami; zero nierozpatrzonych. Reguł nie osłabiono, plików nie ukrywano. Surowe JSON po redakcji skanera zachowano bez zmian.
- **SCA PASS, nowy skan**: 18/18 pakietów, 0 advisories wszystkich poziomów. Rzeczywisty inventory lokalnego venv i finalny package.json są związane hashami z raportem. Zmiana package.json dotyczy wyłącznie scripts; brak nowych deps. Baza UpdatedAt `2026-10-22T13:15:26.425424764Z`, NextUpdate `2026-10-23T13:15:26.425424534Z`, wiek 18.065 h w chwili skanu. Kontener nie miał sieci; brak downloadów, instalacji i uploadów. Pierwszy skan zachowano w initial-sca/.
- **Powierzchnie HTML PASS**: 177 istniejących URL zachowano, dodano wyłącznie 4 lokalne odwołania do nowych JS/CSS. Skrypty 5→7; istniejący inline content bez zmian. Inline event/style: 0; formularze/pola: 6 bez zmian; aktywne embed/frame/object: 0. CSP pozostaje self i bez inline kodu.
- **Przegląd zasobów**: interface-life nie uruchamia RAF/timerów. Graf ma 6 stałych ról i 5 ścieżek, przenosi istniejące detail nodes, tworzy tylko 2 tekstowe etykiety panelu na wybór. Geometria używa jednego coalesced RAF anulowanego hidden/offscreen; maksymalnie 2 sygnały animowane. Pauza, reduced motion, visibility i istniejące hero/showroom in-view są respektowane. hero-space zachowuje ograniczony pointer RAF i CSSOM setters, rozszerzając obsługę globalnej pauzy. Istniejący IntersectionObserver obserwuje teraz hero i pierwszy rzęd/showroom; desktop wymaga widoczności obu, mobile widoczności hero. Zapobiega to animowaniu sticky hero schowanego pod dalszymi rozdziałami. Pomiar runtime/memory należy do osobnych dowodów GUI.
- Backend 10, katalog 2, istniejące CSS 17, metadane APK i test security headers są bajtowo zgodne z bazą. APK jest niezmieniony według Git; nie powtarzano podpisu/CRC ani backend runtime tests.

Pierwszy zestaw skanów po pierwotnym freeze zachowano w `pre-hitbox-fix-scans/`. Po realnym błędzie GUI z poruszającym się hitboxem root przeniósł ruch na dekoracyjne mocowania i poprawił QA harness; source drift został wykryty przed finalizacją. Końcowe skany poniżej wykonano ponownie na nowym freeze; nie ukryto starszych wyników.

Kolejny refresh po korekcie sticky hero zachowuje poprzedni końcowy zestaw w `pre-sticky-visibility-fix/`. Zmieniły się dokładnie hero-space.js, jego unit test oraz QA harness; ponowiono SAST i secrets. SCA z 07:19:21 UTC pozostaje niezmieniony i związany z identycznym package.json/inventory. Poprzedni canonical hash nie jest bieżącym wynikiem.

Mapy 97 plików tekstowych źródeł przed/po/przy finalizacji są identyczne. Dokumentacja i evidence są wyłączone z map źródeł. Oryginalny log Semgrep jest zachowany w deterministycznym .log.gz; czytelny log ma usunięte wyłącznie końcowe spacje, opis i hashe w log-normalization.json.

Wyniki nie potwierdzają produkcji, wdrożenia, VPS/Caddy/HTTPS, fizycznych urządzeń ani SCA APK/obrazu produkcyjnego. Manifest wiąże dowody hashem i rozmiarem.
