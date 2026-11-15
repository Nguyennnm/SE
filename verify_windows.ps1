$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/03_check_import.sql'
if ($LASTEXITCODE -ne 0) { throw 'Verification SQL failed.' }
& docker exec ses-phongvu-pa4-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/pa4_database/04_check_use_cases.sql'
if ($LASTEXITCODE -ne 0) { throw 'Use case SQL check failed.' }
