@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "LOGDIR=%~dp0logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "LOG=%LOGDIR%\pm2-startup.log"

echo.>>"%LOG%"
echo ==================================================>>"%LOG%"
echo [%date% %time%] startup-pm2 at logon>>"%LOG%"

REM Brief grace for Windows network stack.
timeout /t 8 /nobreak >nul

call "%~dp0scripts\start-panel-server.bat" logon >>"%LOG%" 2>&1
set "ERR=%errorlevel%"

if not "%ERR%"=="0" (
  echo ERROR: panel server failed to start ^(exit %ERR%^)>>"%LOG%"
)

exit /b %ERR%
