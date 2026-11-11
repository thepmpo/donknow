@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0development-tools.ps1" -Action github
if errorlevel 1 echo Setup stopped. Existing office data and login were preserved.
pause
