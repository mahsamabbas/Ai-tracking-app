# Techlio local connector — Node.js only, no repo clone.
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$TechlioSite = if ($env:TECHLIO_SITE) { $env:TECHLIO_SITE } else { "https://tracking-app-api-t9yd.vercel.app" }
$InstallDir = if ($env:TECHLIO_INSTALL_DIR) { $env:TECHLIO_INSTALL_DIR } else { Join-Path $env:USERPROFILE ".techlio\connector" }
$BundleUrl = "$TechlioSite/downloads/techlio-connector.zip"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Install Node.js 20+ from https://nodejs.org then run this script again."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required (comes with Node.js)."
}

Write-Host "Installing Techlio connector to $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$TmpZip = Join-Path $env:TEMP "techlio-connector.zip"
Invoke-WebRequest -Uri $BundleUrl -OutFile $TmpZip -UseBasicParsing
if (Test-Path $InstallDir) {
  Get-ChildItem $InstallDir | Remove-Item -Recurse -Force
}
Expand-Archive -Path $TmpZip -DestinationPath $InstallDir -Force
Remove-Item $TmpZip -Force
$Nested = Join-Path $InstallDir "techlio-connector"
if (Test-Path $Nested) {
  Get-ChildItem $Nested | Move-Item -Destination $InstallDir -Force
  Remove-Item $Nested -Recurse -Force
}

$EnvFile = Join-Path $InstallDir ".env"
if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $InstallDir ".env.example") $EnvFile
}

Write-Host "Installing dependencies (one-time)…"
Set-Location $InstallDir
npm install --omit=dev

$Runner = Join-Path $InstallDir "run.ps1"
$LogDir = Join-Path $env:USERPROFILE ".techlio-connector"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$TaskName = "TechlioConnector"
$PsArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`""

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $PsArgs -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Limited | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host ""
Write-Host "Done. Connector runs at http://127.0.0.1:9477"
Write-Host "Open your Techlio dashboard -> My connectors -> Activate your key."
Write-Host "Config: $EnvFile"
