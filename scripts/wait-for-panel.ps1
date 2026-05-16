param(
  [string]$Url = 'http://127.0.0.1:3000/',
  [int]$TimeoutSeconds = 180,
  [int]$IntervalSeconds = 2
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      exit 0
    }
  } catch {
    # Server not ready yet
  }
  Start-Sleep -Seconds $IntervalSeconds
}

exit 1
