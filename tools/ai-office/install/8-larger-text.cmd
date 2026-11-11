@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows.ps1" -Action readability
if errorlevel 1 echo UI update stopped safely. Keep the message above.
pause
