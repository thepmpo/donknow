param([switch]$RunServer,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
if($RunServer){
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/control.sh
    if($LASTEXITCODE -ne 0){throw 'Office input server stopped. Main office data was preserved.'}
    exit 0
}
try {$office=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 3} catch {throw 'Run 2-start.cmd first and keep its server window open.'}
if($office.app -ne 'Claw-Empire'){throw 'Another service uses the office port; it was preserved.'}
$temp=(& wsl.exe --distribution Ubuntu --exec mktemp -d /tmp/office-control-XXXXXXXX | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $temp -notmatch '^/tmp/office-control-[A-Za-z0-9]+$'){throw 'Cannot prepare input server installer.'}
foreach($name in @('install-control.py','control-payload.zip')){
    $data=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $name)))
    $data | & wsl.exe --distribution Ubuntu --exec bash -lc "base64 --decode --ignore-garbage > $temp/$name"
    if($LASTEXITCODE -ne 0){throw 'Cannot transfer verified input server package.'}
}
$installedText=(& wsl.exe --distribution Ubuntu --exec python3 "$temp/install-control.py" "$temp/control-payload.zip" | Out-String).Trim()
if($LASTEXITCODE -ne 0){Write-Host $installedText;throw 'Input server installation stopped safely.'}
$installed=$installedText|ConvertFrom-Json
$running=$false
try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8810/health' -TimeoutSec 2;if($health.app -ne 'AI-Office-Control'){throw 'Another service uses port 8810.'};if($health.packageVersion -ne $installed.packageId){throw 'Close only the old input-server window, then run this file again. Keep the main office server open.'};$running=$true} catch {if($_.Exception.Message -match 'Another service|old input-server'){throw}}
if(-not $running){
    $script=Join-Path $PSScriptRoot 'open-control.ps1'
    Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$script+'"'),'-RunServer')
    for($i=0;$i -lt 45;$i++){
        Start-Sleep -Seconds 1
        try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8810/health' -TimeoutSec 2;if($health.app -eq 'AI-Office-Control' -and $health.packageVersion -eq $installed.packageId){$running=$true;break}}catch{}
    }
}
if(-not $running){throw 'Input server did not start. Keep its error window open.'}
if(-not $NoBrowser){
    $access=(& wsl.exe --distribution Ubuntu --exec cat /workspace/ai-office/state/control-access.key | Out-String).Trim()
    if($LASTEXITCODE -ne 0 -or $access -notmatch '^[a-f0-9]{64}$'){throw 'Private browser connection was not prepared.'}
    Start-Process ('http://127.0.0.1:8810/desk#access='+$access)
    $access=$null
}
Write-Host 'Office input is ready. Keep both the main office and input-server windows open.'
