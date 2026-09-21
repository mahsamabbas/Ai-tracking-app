# Techlio connector — runs at Windows sign-in and restarts if it stops.
# Requires: Node.js 20+, pnpm, and this repo cloned locally.
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$DefaultRepo = Join-Path $env:USERPROFILE "Documents\TechlioTrackingApp"
$Repo = Read-Host "Path to TechlioTrackingApp repo [$DefaultRepo]"
if ([string]::IsNullOrWhiteSpace($Repo)) { $Repo = $DefaultRepo }
$Repo = $Repo.Trim('"')

$ConnectorDir = Join-Path $Repo "apps\connector"
if (-not (Test-Path (Join-Path $ConnectorDir "package.json"))) {
  Write-Error "Expected $ConnectorDir — clone the repo first (git clone ...)."
}

$Runner = Join-Path $ConnectorDir "scripts\run-daemon.ps1"
if (-not (Test-Path $Runner)) {
  Write-Error "Missing $Runner"
}

Set-Location $Repo
pnpm --filter @techlio/connector run build

$LogDir = Join-Path $env:USERPROFILE ".techlio-connector"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$TaskName = "TechlioConnector"
$PsArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`""

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $PsArgs -WorkingDirectory $ConnectorDir
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
Write-Host "Connector installed (scheduled task: $TaskName)."
Write-Host "Health check: curl http://127.0.0.1:9477/health"
Write-Host "Edit API URL in: $ConnectorDir\.env"
Write-Host "Remove later: Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
