# Frontend del ambiente prueba. Apunta a la API local :8080.
# Uso, desde frontend-web:  .\scripts\ambiente-prueba.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "Frontend de prueba en http://localhost:4200  (API http://localhost:8080/api/v1)"
npx ng serve --configuration=development --host 127.0.0.1
