@echo off
REM Start or restart the panel server only (no Chrome, no full setup).
REM Use after copying the project to a PC that already has Node + pm2 installed.

cd /d "%~dp0"
echo Starting trilogy-panel under PM2...
call "%~dp0scripts\pm2-ensure-panel.bat" restart
if errorlevel 1 (
  echo.
  echo Failed. On a new PC run setup.bat as Administrator first.
  pause
  exit /b 1
)
echo.
echo Server running. Open http://127.0.0.1:3000
echo Logs: pm2 logs trilogy-panel
pause
exit /b 0
