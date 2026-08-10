# ==========================================
# TRANSPORT360 - MONOREPO GENERATOR SCRIPT
# ==========================================

$root = "transport360"

Write-Host "рџљЂ Tworzenie struktury katalogГіw dla $root..." -ForegroundColor Cyan

# 1. Lista katalogГіw do utworzenia
$folders = @(
 "$root/apps/web-passenger/src",
 "$root/apps/web-dispatcher/src",
 "$root/apps/app-driver/src",
 "$root/apps/api-core/src",
 "$root/packages/database/prisma",
 "$root/packages/vrp-engine/src",
 "$root/packages/ui-shared/src",
 "$root/packages/types/src",
 "$root/docs"
)

foreach ($folder in $folders) {
 New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# Funkcja pomocnicza do tworzenia plikГіw
function Create-File ($path, $content) {
 $file = New-Item -ItemType File -Path $path -Force
 Set-Content -Path $file.FullName -Value $content.Trim() -Encoding UTF8
 Write-Host " [+] Utworzono: $path" -ForegroundColor Green
}

Write-Host "`nрџ“ќ Inicjalizacja plikГіw konfiguracyjnych..." -ForegroundColor Cyan

# 2. GЕ‚Гіwny package.json (Monorepo Root)
Create-File "$root/package.json" @'
{
 "name": "transport360",
 "private": true,
 "scripts": {
 "build": "turbo run build",
 "dev": "turbo run dev",
 "lint": "turbo run lint"
 },
 "devDependencies": {
 "turbo": "^2.0.0"
 }
}
'@

# 3. PNPM Workspace Config
Create-File "$root/pnpm-workspace.yaml" @'
packages:
 - "apps/*"
 - "packages/*"
'@

# 4. Turborepo Config
Create-File "$root/turbo.json" @'
{
 "$schema": "https://turbo.build/schema.json",
 "tasks": {
 "build": {
 "dependsOn": ["^build"],
 "outputs": [".next/**", "dist/**"]
 },
 "dev": {
 "cache": false,
 "persistent": true
 },
 "lint": {}
 }
}
'@

# 5. .gitignore
Create-File "$root/.gitignore" @'
node_modules
.next
dist
.env
.env.local
*.log
.DS_Store
'@

# 6. README.md
Create-File "$root/README.md" @'
# рџљљ Transport360 Monorepo

System zarzД…dzania przewozami door-to-door, optymalizacji tras i gieЕ‚dy pasaЕјerskiej.

## рџЏ—пёЏ Struktura Projektu

- **apps/web-passenger** - Portal B2C dla pasaЕјerГіw (Next.js)
- **apps/web-dispatcher** - Panel B2B dla dyspozytorГіw i GieЕ‚da (React SPA)
- **apps/app-driver** - Aplikacja mobilna dla kierowcy (PWA)
- **apps/api-core** - GЕ‚Гіwny Backend API (Node.js/FastAPI)
- **packages/database** - ORM, migracje i modele bazy danych (Prisma)
- **packages/vrp-engine** - Algorytm optymalizacji tras i liczenie odchyleЕ„
- **packages/ui-shared** - WspГіlny Design System / UI Kit
- **packages/types** - WspГіlnione typy i interfejsy TypeScript
'@

# 7. Prisma Schema (Baza Danych)
Create-File "$root/packages/database/prisma/schema.prisma" @'
datasource db {
 provider = "postgresql"
 url = env("DATABASE_URL")
}

generator client {
 provider = "prisma-client-js"
}

enum Role {
 PASSENGER
 DISPATCHER
 DRIVER
 ADMIN
}

model User {
 id String @id @default(uuid())
 email String @unique
 password String
 role Role @default(PASSENGER)
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
}
'@

# 8. ModuЕ‚y Package.json
Create-File "$root/packages/database/package.json" '{"name": "@transport360/database", "version": "0.1.0", "main": "./prisma/client.js"}'
Create-File "$root/packages/vrp-engine/package.json" '{"name": "@transport360/vrp-engine", "version": "0.1.0", "main": "./src/index.ts"}'
Create-File "$root/packages/ui-shared/package.json" '{"name": "@transport360/ui-shared", "version": "0.1.0", "main": "./src/index.ts"}'
Create-File "$root/packages/types/package.json" '{"name": "@transport360/types", "version": "0.1.0", "main": "./src/index.ts"}'

Create-File "$root/apps/api-core/package.json" '{"name": "@transport360/api-core", "version": "0.1.0", "scripts": {"dev": "node src/index.js"}}'
Create-File "$root/apps/web-passenger/package.json" '{"name": "@transport360/web-passenger", "version": "0.1.0"}'
Create-File "$root/apps/web-dispatcher/package.json" '{"name": "@transport360/web-dispatcher", "version": "0.1.0"}'
Create-File "$root/apps/app-driver/package.json" '{"name": "@transport360/app-driver", "version": "0.1.0"}'

# 9. Pliki startowe TS/JS w moduЕ‚ach
Create-File "$root/packages/vrp-engine/src/index.ts" '// VRP Optimization Engine Exports'
Create-File "$root/packages/ui-shared/src/index.ts" '// UI Components Exports'
Create-File "$root/packages/types/src/index.ts" '// Global TypeScript Types'
Create-File "$root/apps/api-core/src/index.ts" 'console.log("Transport360 API Core Started");'

Write-Host "`nвњ… GOTOWE! Struktura projektu Transport360 zostaЕ‚a wygenerowana!" -ForegroundColor Yellow
Write-Host "рџ‘‰ Wpisz: cd transport360" -ForegroundColor Cyan
