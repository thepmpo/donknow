@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-control.ps1"
if errorlevel 1 (
 echo Office could not start. Existing data and login were preserved.
 pause
)
