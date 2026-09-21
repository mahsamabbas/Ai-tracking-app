# Used by Windows Scheduled Task — loads apps/connector/.env then starts the connector.
$ErrorActionPreference = "Stop"
$ConnDir = Split-Path -Parent $PSScriptRoot
$Root = Split-Path -Parent (Split-Path -Parent $ConnDir)
Set-Location $ConnDir

$envFile = Join-Path $ConnDir ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if (
      ($val.StartsWith('"') -and $val.EndsWith('"')) -or
      ($val.StartsWith("'") -and $val.EndsWith("'"))
    ) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    if (-not [string]::IsNullOrEmpty($key)) {
      Set-Item -Path "env:$key" -Value $val
    }
  }
}

$dist = Join-Path $ConnDir "dist\index.js"
if (-not (Test-Path $dist)) {
  Set-Location $Root
  pnpm --filter @techlio/connector run build
  Set-Location $ConnDir
}

$node = (Get-Command node -ErrorAction Stop).Source
& $node $dist
