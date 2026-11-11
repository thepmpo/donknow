@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0development-tools.ps1" -Action validation
if errorlevel 1 echo Setup stopped. Existing office data and login were preserved.
pause
