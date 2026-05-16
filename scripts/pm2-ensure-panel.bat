@echo off
REM Ensures trilogy-panel is registered and running under PM2.
REM Safe on a new PC (no saved process yet) or after copying the project folder.
REM Usage: pm2-ensure-panel.bat [restart]
REM   (no args)  - start if missing/stopped; leave running process alone
REM   restart    - restart if registered, else cold-start

setlocal EnableExtensions
set "MODE=%~1"
set "ROOT=%~dp0.."
cd /d "%ROOT%"

set "PM2="
where pm2 >nul 2>&1
if %errorlevel%==0 (
  for /f "delims=" %%I in ('where pm2 2^>nul') do (
    set "PM2=%%I"
    goto :found_pm2
  )
)
if exist "%APPDATA%\npm\pm2.cmd" set "PM2=%APPDATA%\npm\pm2.cmd"
if exist "%ProgramFiles%\nodejs\pm2.cmd" set "PM2=%ProgramFiles%\nodejs\pm2.cmd"

:found_pm2
if not defined PM2 (
  echo ERROR: pm2 not found. Run setup.bat first.
  exit /b 1
)

REM Restore any saved PM2 list (may be empty on a new machine — that is OK).
call "%PM2%" resurrect >nul 2>&1

call "%PM2%" describe trilogy-panel >nul 2>&1
if errorlevel 1 goto :cold_start

if /i "%MODE%"=="restart" (
  call "%PM2%" restart trilogy-panel >nul 2>&1
  if errorlevel 1 goto :cold_start
  goto :save_ok
)

for /f %%P in ('call "%PM2%" pid trilogy-panel 2^>nul') do (
  if not "%%P"=="" goto :save_ok
)

call "%PM2%" restart trilogy-panel >nul 2>&1
if errorlevel 1 goto :cold_start
goto :save_ok

:cold_start
call "%PM2%" delete trilogy-panel >nul 2>&1
call "%PM2%" start "%ROOT%\ecosystem.config.js"
if errorlevel 1 (
  echo ERROR: pm2 start failed for ecosystem.config.js
  exit /b 1
)

:save_ok
call "%PM2%" save >nul 2>&1
exit /b 0
