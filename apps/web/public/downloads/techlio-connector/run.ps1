$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim().Trim('"')
    if ($key) { Set-Item -Path "env:$key" -Value $val }
  }
}
if (-not $env:CONNECTOR_DB) {
  $env:CONNECTOR_DB = Join-Path $env:USERPROFILE ".techlio-connector\queue.db"
}
New-Item -ItemType Directory -Force -Path (Split-Path $env:CONNECTOR_DB) | Out-Null
node agent.mjs
