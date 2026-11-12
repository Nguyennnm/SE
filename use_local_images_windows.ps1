$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& docker cp (Join-Path $PSScriptRoot 'database') 'ses-phongvu-pa4-db:/tmp/pa4_database'
if ($LASTEXITCODE -ne 0) { throw 'docker cp failed' }
& docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/05_use_local_images_optional.sql'
if ($LASTEXITCODE -ne 0) { throw 'Image SQL update failed' }
Write-Host 'Done. Copy the frontend/public/images/products/phongvu directory into your React app public/images/products/phongvu.' -ForegroundColor Green
