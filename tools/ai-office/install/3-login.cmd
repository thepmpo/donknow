@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows.ps1" -Action login
if errorlevel 1 echo Action failed. Keep the error above; do not send passwords or login codes to chat.
pause
