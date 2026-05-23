# Waits for grandMA2 onPC to start, then sends Enter to dismiss the fader wing popup.
Add-Type -AssemblyName System.Windows.Forms

$proc = $null
for ($i = 0; $i -lt 60; $i++) {
    $proc = Get-Process -Name 'gma2onpc' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) { break }
    Start-Sleep -Seconds 1
}

if (-not $proc) {
    Write-Host "gma2onpc not detected within 60s - skipping popup dismiss"
    exit 0
}

Write-Host "gma2onpc detected (PID: $($proc.Id)), waiting 15s for popup to appear..."
Start-Sleep -Seconds 15

try {
    Add-Type -AssemblyName Microsoft.VisualBasic
    [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id)
    Start-Sleep -Milliseconds 300
} catch {}

[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Write-Host "Enter sent to dismiss popup"
exit 0
