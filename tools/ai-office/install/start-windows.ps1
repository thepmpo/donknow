$ErrorActionPreference='Stop'
$launcher=Join-Path $PSScriptRoot 'windows.ps1'
$running=$false
try {$r=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 2; $running=($r.app -eq 'Claw-Empire')} catch {}
if (-not $running) {
    Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$launcher+'"'),'-Action','start')
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Seconds 1
        try {$r=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 2; if($r.app -eq 'Claw-Empire'){$running=$true;break}} catch {}
    }
}
if (-not $running) {throw 'Office did not start. Keep the server window open and check its error message.'}
Start-Process 'http://127.0.0.1:8790'
Write-Host 'Office opened. Keep the server window open. Use 3-login.cmd for your personal ChatGPT login.'
