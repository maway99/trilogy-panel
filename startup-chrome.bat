@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "LOGDIR=%~dp0logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "LOG=%LOGDIR%\kiosk-startup.log"

echo.>>"%LOG%"
echo ==================================================>>"%LOG%"
echo [%date% %time%] Chrome kiosk launcher>>"%LOG%"

REM Short grace for Windows shell, network, and grandMA2 onPC to start.
timeout /t 15 /nobreak >nul

REM Wait for panel server (curl is built into Windows 11; no PowerShell required).
set "TRIES=0"
:wait_server
curl -sf -o nul http://127.0.0.1:3000/ 2>nul
if !errorlevel! equ 0 goto :server_ready
set /a TRIES+=1
if !TRIES! geq 90 goto :server_timeout
timeout /t 2 /nobreak >nul
goto :wait_server

:server_ready
echo Panel server ready after !TRIES! polls>>"%LOG%"
goto :launch

:server_timeout
echo WARNING: Panel server not ready after 3 min - opening kiosk anyway>>"%LOG%"

:launch
REM Use a .ps1 helper file so batch does not mangle PowerShell syntax (e.g. $_.ProcessId).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\close-trilogy-chrome.ps1" >>"%LOG%" 2>&1
timeout /t 2 /nobreak >nul

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo ERROR: Google Chrome not found. Install Chrome and re-run setup.bat>>"%LOG%"
  exit /b 1
)

echo Launching kiosk: %CHROME%>>"%LOG%"

start "" "%CHROME%" ^
  --kiosk ^
  --app=http://127.0.0.1:3000/ ^
  --disable-infobars ^
  --noerrdialogs ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-session-crashed-bubble ^
  --disable-restore-session-state ^
  --disable-features=TranslateUI,MediaRouter ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --user-data-dir="%LOCALAPPDATA%\TrilogyPanelChrome"

echo Kiosk process started>>"%LOG%"
exit /b 0
