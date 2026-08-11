Skrypt instalacyjny Transport360 (create-transport360-ascii.ps1)

Użycie:
1. W tym katalogu uruchom skrypt (PowerShell):
   PowerShell -NoProfile -ExecutionPolicy Bypass -File .\create-transport360-ascii.ps1

2. Przejdź do wygenerowanego repozytororium:
   cd transport360

3. Zainstaluj zależności (przykład z pnpm):
   pnpm install

4. Typowe kolejne kroki:
- Zainicjuj repozytorium Git i zatwierdź zmiany (git init; git add .; git commit -m "Initial scaffold").
- Skonfiguruj DATABASE_URL oraz inne zmienne środowiskowe.
- Uruchom serwery deweloperskie poszczególnych aplikacji (zajrzyj do dokumentacji konkretnego pakietu/aplikacji).

Uwaga: skrypt tworzy tylko pliki i foldery startowe. Dostosuj package.json i konfigurację narzędzi według potrzeb.