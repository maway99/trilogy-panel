# Close only Chrome instances launched with the Trilogy kiosk profile.
$processes = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue
if (-not $processes) { exit 0 }

foreach ($proc in $processes) {
  if ($proc.CommandLine -and $proc.CommandLine -like '*TrilogyPanelChrome*') {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

exit 0
