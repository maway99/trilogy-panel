@echo off
REM Run setup without changing system-wide PowerShell policy.
REM Right-click this file -> Run as administrator

setlocal EnableExtensions
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Administrator rights required.
  echo Right-click setup.bat and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

echo.
echo === Trilogy Panel setup ===
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set "ERR=%errorlevel%"

if not "%ERR%"=="0" (
  echo.
  echo Setup failed ^(exit code %ERR%^).
  pause
  exit /b %ERR%
)

echo.
echo Setup finished. Reboot once to verify auto-start.
pause
exit /b 0
