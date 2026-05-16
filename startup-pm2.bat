@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "LOGDIR=%~dp0logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "LOG=%LOGDIR%\pm2-startup.log"

echo.>>"%LOG%"
echo ==================================================>>"%LOG%"
echo [%date% %time%] PM2 startup>>"%LOG%"

call "%~dp0scripts\pm2-ensure-panel.bat" >>"%LOG%" 2>&1
set "ERR=%errorlevel%"

if "%ERR%"=="0" (
  where pm2 >nul 2>&1 && pm2 status >>"%LOG%" 2>&1
) else (
  echo ERROR: pm2-ensure-panel failed with exit code %ERR%>>"%LOG%"
)

exit /b %ERR%
