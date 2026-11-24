# Ensayo del build que Firebase ejecuta en produccion, mas un serve opcional
# contra la API local de deploy (:8081). No llama a firebase deploy.
# Uso, desde frontend-web:
#   .\scripts\ambiente-deploy.ps1            # solo el build de produccion
#   .\scripts\ambiente-deploy.ps1 -Servir    # ademas sirve el ensayo en :4201
param([switch]$Servir)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Build de produccion (el mismo que el workflow, sin desplegar)..."
npx ng build --configuration=production
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "El build de produccion paso. Firebase no se toco."

if ($Servir) {
    Write-Host "Sirviendo el ensayo en http://localhost:4201 contra http://localhost:8081/api/v1"
    npx ng serve --configuration=deploy --host 127.0.0.1 --port 4201
}
