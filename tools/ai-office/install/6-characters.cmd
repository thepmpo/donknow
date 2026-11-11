@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows.ps1" -Action characters
if errorlevel 1 echo Theme was not changed completely. Keep the error above.
pause
