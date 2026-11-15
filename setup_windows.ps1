# Windows PowerShell - create a NEW, separate PostgreSQL PA4 database with Docker.
# Safe to re-run: existing data volume is kept, SQL scripts use conflict protection.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Assert-Ok([string] $Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit code $LASTEXITCODE)." }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker was not found. Install/start Docker Desktop and reopen PowerShell.'
}
& docker info *> $null
Assert-Ok 'Docker Desktop status'

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env with a LOCAL DEMO password. Change it for non-demo use.' -ForegroundColor Yellow
}

Write-Host '1/4 Starting PostgreSQL 16 in Docker (host port 5434 by default)...'
& docker compose up -d --wait
Assert-Ok 'docker compose up'

Write-Host '2/4 Copying SQL files into container...'
& docker exec ses-phongvu-pa4-db sh -c 'rm -rf /tmp/pa4_database'
Assert-Ok 'Clearing temporary SQL script folder'
& docker cp (Join-Path $PSScriptRoot 'database') 'ses-phongvu-pa4-db:/tmp/pa4_database'
Assert-Ok 'docker cp database'

Write-Host '3/4 Creating schema, importing Phong Vu snapshot and seeding PA4...'
& docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/00_install_clean_psql.sql'
Assert-Ok 'PostgreSQL SQL import'

Write-Host '4/4 Additional UC16/UC17/UC19 checks...'
& docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/04_check_use_cases.sql'
Assert-Ok 'UC16/17/19 SQL checks'

Write-Host ''
Write-Host 'IMPORT COMPLETE. Database: smart_electronics_store; Host: 127.0.0.1; Port: 5434 (defaults).' -ForegroundColor Green
Write-Host 'User: ses_user. Password: read it from the LOCAL .env file. Do not commit .env.'
Write-Host 'Run .\verify_windows.ps1 to check again, or .\use_local_images_windows.ps1 for offline images.'
