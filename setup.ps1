# =============================================================================
#  Trilogy Panel — one-shot installer for the lighting PC (Windows).
#  Run from an elevated PowerShell:    .\setup.ps1
#
#  Performs:
#    1. Sanity checks (admin, Node, npm)
#    2. npm install for server + client
#    3. Client build (creates client\dist for Express to serve)
#    4. Global install of pm2 if missing
#    5. pm2 start ecosystem.config.js  +  pm2 save
#    6. Task Scheduler entries:
#         a) "Trilogy PM2 Resurrect"  — at user logon, brings PM2 + server back
#         b) "Trilogy Chrome Kiosk"   — at user logon, runs startup-chrome.bat
# =============================================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

function Require-Admin {
  $current = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($current)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this script from an elevated PowerShell (Right-click -> Run as Administrator)."
    exit 1
  }
}

function Need-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "$name not found on PATH. Install it before continuing."
    exit 1
  }
}

Write-Host "==> Trilogy Panel setup — running in $root" -ForegroundColor Cyan
Require-Admin
Need-Cmd 'node'
Need-Cmd 'npm'

Write-Host "==> Installing server dependencies"
npm install --no-audit --no-fund

Write-Host "==> Installing client dependencies"
npm --prefix client install --no-audit --no-fund

Write-Host "==> Building client bundle (client\dist)"
npm --prefix client run build

if (-not (Get-Command 'pm2' -ErrorAction SilentlyContinue)) {
  Write-Host "==> Installing pm2 globally"
  npm install -g pm2
}

Write-Host "==> Starting server under PM2"
pm2 delete trilogy-panel 2>$null | Out-Null
pm2 start "$root\ecosystem.config.js"
pm2 save

# --- Scheduled task: PM2 resurrect at user logon -----------------------------
$pm2Resurrect = "$env:APPDATA\npm\pm2.cmd"
if (-not (Test-Path $pm2Resurrect)) {
  # Fallback for newer npm prefix
  $pm2Resurrect = (Get-Command pm2).Source
}

Write-Host "==> Registering Task Scheduler entry: 'Trilogy PM2 Resurrect'"
$pm2Action  = New-ScheduledTaskAction  -Execute $pm2Resurrect -Argument "resurrect"
$pm2Trigger = New-ScheduledTaskTrigger -AtLogOn
$pm2Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Unregister-ScheduledTask -TaskName "Trilogy PM2 Resurrect" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trilogy PM2 Resurrect" `
  -Action $pm2Action -Trigger $pm2Trigger -Settings $pm2Settings `
  -RunLevel Highest -User $env:USERNAME | Out-Null

# --- Scheduled task: Chrome kiosk at user logon (with delay built into .bat) -
$kiosk = Join-Path $root 'startup-chrome.bat'
Write-Host "==> Registering Task Scheduler entry: 'Trilogy Chrome Kiosk'"
$chromeAction  = New-ScheduledTaskAction  -Execute $kiosk -WorkingDirectory $root
$chromeTrigger = New-ScheduledTaskTrigger -AtLogOn
Unregister-ScheduledTask -TaskName "Trilogy Chrome Kiosk" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trilogy Chrome Kiosk" `
  -Action $chromeAction -Trigger $chromeTrigger -Settings $pm2Settings `
  -RunLevel Highest -User $env:USERNAME | Out-Null

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
Write-Host "    Server status:   pm2 status"
Write-Host "    Server logs:     pm2 logs trilogy-panel"
Write-Host "    Open panel now:  http://localhost:3000"
Write-Host ""
Write-Host "    Reboot the PC once to verify the auto-start chain:"
Write-Host "      1. grandMA2 onPC      (separate Task Scheduler entry you already manage)"
Write-Host "      2. Trilogy PM2 Resurrect  (registered just now)"
Write-Host "      3. Trilogy Chrome Kiosk   (registered just now, 60s grace built in)"
