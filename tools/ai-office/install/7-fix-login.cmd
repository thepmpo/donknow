@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows.ps1" -Action repair
if errorlevel 1 echo Repair stopped safely. Keep the error above; do not send credentials.
pause
