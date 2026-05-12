@echo off
REM ---------------------------------------------------------------------------
REM  Trilogy Panel — update script
REM  Double-click this on the lighting PC to pull latest, rebuild, restart.
REM  Requires the project to have been installed via setup.ps1 first.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"
setlocal

echo === Trilogy Panel update ===

REM -- Pull latest -------------------------------------------------------------
where git >nul 2>nul
if %errorlevel% == 0 (
  echo.
  echo [1/4] git pull
  git pull
  if errorlevel 1 (
    echo.
    echo *** git pull failed. Resolve conflicts and re-run update.bat. ***
    pause
    exit /b 1
  )
) else (
  echo [1/4] git not found on PATH - skipping pull. Update files manually.
)

REM -- Server deps (re-runs only if package-lock changed) ---------------------
echo.
echo [2/4] npm install
call npm install --no-audit --no-fund
if errorlevel 1 goto :failed

REM -- Client deps + build ----------------------------------------------------
echo.
echo [3/4] npm --prefix client install
call npm --prefix client install --no-audit --no-fund
if errorlevel 1 goto :failed

echo.
echo [3b]  npm --prefix client run build
call npm --prefix client run build
if errorlevel 1 goto :failed

REM -- Restart server ---------------------------------------------------------
echo.
echo [4/4] pm2 restart trilogy-panel
call pm2 restart trilogy-panel
if errorlevel 1 goto :failed

echo.
echo === Update complete. Panel will refresh on the next WebSocket reconnect. ===
echo     If anything looks wrong, check:  pm2 logs trilogy-panel
pause
exit /b 0

:failed
echo.
echo *** Update FAILED. The server was NOT restarted; previous version still running. ***
echo     Check the output above, fix, and re-run update.bat.
pause
exit /b 1
