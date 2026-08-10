# TRANSPORT360 - MONOREPO GENERATOR SCRIPT (ASCII-safe)

$root = "transport360"

Write-Host "Creating folder structure for $root..." -ForegroundColor Cyan

# 1. List of folders to create
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

# Helper to create files
function Create-File ($path, $content) {
 $file = New-Item -ItemType File -Path $path -Force
 Set-Content -Path $file.FullName -Value $content.Trim() -Encoding UTF8
 Write-Host "[+] Created: $path" -ForegroundColor Green
}

Write-Host "`nInitializing config files..." -ForegroundColor Cyan

# Root package.json
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

# pnpm workspace
Create-File "$root/pnpm-workspace.yaml" @'
packages:
 - "apps/*"
 - "packages/*"
'@

# turbo.json
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

# .gitignore
Create-File "$root/.gitignore" @'
node_modules
.next
dist
.env
.env.local
*.log
.DS_Store
'@

# README
Create-File "$root/README.md" @'
# Transport360 Monorepo

Door-to-door transport management, routing optimization and passenger marketplace.

Project structure:
- apps/web-passenger
- apps/web-dispatcher
- apps/app-driver
- apps/api-core
- packages/database
- packages/vrp-engine
- packages/ui-shared
- packages/types
'@

# Prisma schema
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

# package.json files for packages and apps
Create-File "$root/packages/database/package.json" '{"name": "@transport360/database", "version": "0.1.0", "main": "./prisma/client.js"}'
Create-File "$root/packages/vrp-engine/package.json" '{"name": "@transport360/vrp-engine", "version": "0.1.0", "main": "./src/index.ts"}'
Create-File "$root/packages/ui-shared/package.json" '{"name": "@transport360/ui-shared", "version": "0.1.0", "main": "./src/index.ts"}'
Create-File "$root/packages/types/package.json" '{"name": "@transport360/types", "version": "0.1.0", "main": "./src/index.ts"}'

Create-File "$root/apps/api-core/package.json" '{"name": "@transport360/api-core", "version": "0.1.0", "scripts": {"dev": "node src/index.js"}}'
Create-File "$root/apps/web-passenger/package.json" '{"name": "@transport360/web-passenger", "version": "0.1.0"}'
Create-File "$root/apps/web-dispatcher/package.json" '{"name": "@transport360/web-dispatcher", "version": "0.1.0"}'
Create-File "$root/apps/app-driver/package.json" '{"name": "@transport360/app-driver", "version": "0.1.0"}'

# starter files
Create-File "$root/packages/vrp-engine/src/index.ts" '// VRP Optimization Engine Exports'
Create-File "$root/packages/ui-shared/src/index.ts" '// UI Components Exports'
Create-File "$root/packages/types/src/index.ts" '// Global TypeScript Types'
Create-File "$root/apps/api-core/src/index.ts" 'console.log("Transport360 API Core Started");'

Write-Host "`nDone: transport360 structure created." -ForegroundColor Yellow
Write-Host "cd transport360" -ForegroundColor Cyan
