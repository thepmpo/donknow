@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0connect-phone.ps1"
if errorlevel 1 echo Setup stopped. Existing data and login were preserved. Keep the message above.
pause
