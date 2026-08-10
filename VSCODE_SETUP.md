# Transport360 — Setup VS Code (Pełna Instrukcja)

## 1. Otwórz Projekt w VS Code

```powershell
# Z dowolnego katalogu:
code C:\Users\Lenovo\.copilot\repos\copilot-worktrees\Vibewebstudio\progressorkit-scaling-chainsaw\transport360

# Lub z katalogu transport360:
cd transport360
code .
```

## 2. Polecane Rozszerzenia (Extensions)

Zainstaluj z VS Code Marketplace (Ctrl+Shift+X):

| Rozszerzenie | ID | Opis |
|---|---|---|
| **Node.js Extension Pack** | ms-vscode.js-debug | Debugowanie Node.js + npm scripts |
| **Prettier** | esbenp.prettier-vscode | Formatowanie kodu |
| **ESLint** | dbaeumer.vscode-eslint | Linting JavaScript |
| **REST Client** | humao.rest-client | Testowanie API bez Postmana |
| **Thunder Client** | rangav.vscode-thunder-client | Alternatywa do Postmana |
| **Turbo Console Log** | ChakrouneSyed.turbo-console-log | Szybkie dodawanie console.log |
| **Git Graph** | mhutchie.git-graph | Wizualizacja gałęzi git |
| **TypeScript Vue Plugin** | Vue.vscode-typescript-vue-plugin | Dla Vue 3 (jeśli będziesz używać) |

**Instalacja:**
1. Otwórz Extension Marketplace (Ctrl+Shift+X)
2. Wpisz nazwę rozszerzenia
3. Kliknij "Install"

---

## 3. Uruchomienie Dev Server w VS Code

### Metoda 1: Terminal w VS Code (Zalecana)

1. Otwórz terminal: **Ctrl+`** (backtick)
2. Upewnij się, że jesteś w katalogu `transport360`
3. Wpisz:
   ```bash
   pnpm run dev
   ```
4. Terminal pokaże: `Server listening at http://localhost:3000`
5. Otwórz przeglądarkę na http://localhost:3000

### Metoda 2: Uruchomienie przy pomocy VS Code Tasks

1. Utwórz plik `.vscode/tasks.json` w głównym katalogu:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "pnpm dev",
      "type": "shell",
      "command": "pnpm",
      "args": ["run", "dev"],
      "isBackground": true,
      "problemMatcher": [],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "pnpm install",
      "type": "shell",
      "command": "pnpm",
      "args": ["install"],
      "problemMatcher": []
    }
  ]
}
```

2. Uruchom task: **Ctrl+Shift+P** → "Run Task" → "pnpm dev"

---

## 4. Setup Debugowania (launch.json)

Utwórz `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch API Core",
      "program": "${workspaceFolder}/apps/api-core/src/index.js",
      "restart": true,
      "console": "integratedTerminal",
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to pnpm dev",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**Jak używać:**
1. Otwórz Debug panel: **Ctrl+Shift+D**
2. Wybierz "Launch API Core" lub "Attach to pnpm dev"
3. Kliknij "Start Debugging" (zielony ▶ przycisk)
4. Ustaw breakpointy klikając na numer linii (czerwony punkt)

---

## 5. Struktura Projektu w VS Code

Po otwarciu zobaczysz:

```
transport360/
├── apps/
│   ├── api-core/           ← Node.js backend (działa na :3000)
│   ├── web-passenger/      ← Frontend dla pasażerów
│   ├── web-dispatcher/     ← Frontend dla dyspozytorów
│   └── app-driver/         ← PWA dla kierowcy
├── packages/
│   ├── database/           ← Prisma schema
│   ├── vrp-engine/         ← Algorytm optymalizacji tras
│   ├── ui-shared/          ← Wspólne komponenty UI
│   └── types/              ← TS types
├── package.json            ← Workspace root
├── turbo.json              ← Konfiguracja turborepo
├── pnpm-workspace.yaml     ← Konfiguracja workspace pnpm
└── .vscode/                ← Pliki VSCode (tasks.json, launch.json)
```

---

## 6. Przydatne Klawisze Skrótów (VS Code)

| Skrót | Akcja |
|---|---|
| **Ctrl+Shift+P** | Command Palette (uruchamianie komend) |
| **Ctrl+`** | Otwarcie/zamknięcie terminala |
| **Ctrl+Shift+D** | Debug panel |
| **F5** | Start debugowania |
| **Shift+F5** | Stop debugowania |
| **Ctrl+B** | Ukrycie/pokazanie Explorera plików |
| **Ctrl+F** | Wyszukiwanie w pliku |
| **Ctrl+Shift+F** | Wyszukiwanie we wszystkich plikach |
| **Alt+Shift+F** | Formatowanie pliku (jeśli Prettier zainstalowany) |
| **Ctrl+.** | Quick fix (jeśli ESLint zainstalowany) |

---

## 7. Testowanie API (REST Client)

Utwórz plik `test.http` w głównym katalogu:

```http
### Test GET /
GET http://localhost:3000

### Test POST (przykład)
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Jak uruchomić:**
1. Otwórz plik `test.http`
2. Nad każdym requestem pojawia się link "Send Request"
3. Kliknij na niego → wynik pokaże się w panelu obok

---

## 8. Git Integration (VS Code)

VS Code ma wbudowany Git:

- Otwórz **Source Control** panel: **Ctrl+Shift+G**
- Przejrzyj zmiany, commit, push
- Zainstaluj rozszerzenie **Git Graph** dla lepszej wizualizacji gałęzi

---

## 9. Konfiguracja .gitignore (już ustawione)

Transport360 ma `.gitignore`:
```
node_modules
.next
dist
.env
.env.local
*.log
.DS_Store
```

---

## 10. Ścieżka Rozwoju (Getting Started)

1. **Terminal:** Uruchom `pnpm run dev`
2. **Browser:** Otwórz http://localhost:3000
3. **VSCode:** Edytuj pliki w `apps/api-core/src/`
4. **Debugowanie:** Ustaw breakpointy i uruchom debugger
5. **Git:** Commit zmiany (Ctrl+Shift+G)

---

## 11. Problemy i Rozwiązania

| Problem | Rozwiązanie |
|---|---|
| "pnpm: not found" | Zainstaluj: `npm install -g pnpm` |
| Port 3000 zajęty | Zmień port w `apps/api-core/src/index.js` na `PORT=3001` |
| node_modules brakuje | Uruchom: `pnpm install` |
| ESLint nie widzi kodu | Zainstaluj rozszerzenie ESLint w VSCode |
| Debuger nie łączy się | Sprawdź, czy proces dev działa na `:9229` |

---

## 12. Przydatne Polecenia (Terminal)

```bash
# Instalacja zależności
pnpm install

# Dev server (Turbo będzie uruchamiać wszystkie app/dev skrypty)
pnpm run dev

# Build produkcji
pnpm run build

# Linting
pnpm run lint

# Czyszczenie cache
pnpm run --filter @transport360/api-core dev

# Uruchomienie jednego app'a
cd apps/api-core && pnpm run dev
```

---

## 13. Następne Kroki

- [ ] Zainstaluj rozszerzenia (punkt 2)
- [ ] Otwórz terminal i uruchom `pnpm run dev` (punkt 3)
- [ ] Sprawdzić localhost:3000 w przeglądarce
- [ ] Zapoznaj się z folder structure (punkt 5)
- [ ] Utwórz launch.json dla debugowania (punkt 4)
- [ ] Testuj API za pomocą REST Client (punkt 7)
- [ ] Wypchnij commitów do gita (punkt 8)

---

**Powodzenia z Transport360! 🚀**
