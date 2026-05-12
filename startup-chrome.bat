@echo off
REM ---------------------------------------------------------------------------
REM  Trilogy Panel — Chrome kiosk launcher
REM  Triggered by Task Scheduler at user logon (created by setup.ps1).
REM  Waits for the Node server to be ready, then opens the panel full-screen.
REM ---------------------------------------------------------------------------

REM 60s grace period for grandMA2 onPC + Node server + Resolume PC to come up.
timeout /t 60 /nobreak >nul

REM Resolve Chrome — prefer 64-bit, fall back to 32-bit.
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo Chrome not found in Program Files. Edit startup-chrome.bat with the correct path.
  exit /b 1
)

start "" "%CHROME%" ^
  --kiosk ^
  --app=http://localhost:3000 ^
  --disable-infobars ^
  --noerrdialogs ^
  --disable-session-crashed-bubble ^
  --disable-restore-session-state ^
  --disable-features=TranslateUI ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --user-data-dir="%LOCALAPPDATA%\TrilogyPanelChrome"
