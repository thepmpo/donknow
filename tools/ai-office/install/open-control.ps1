param([switch]$RunServer,[switch]$RunMainServer,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
if($RunMainServer){
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/start.sh
    if($LASTEXITCODE -ne 0){throw 'Main office stopped. Existing data and authentication were preserved.'}
    exit 0
}
if($RunServer){
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/control.sh
    if($LASTEXITCODE -ne 0){throw 'Office input server stopped. Main office data was preserved.'}
    exit 0
}
$office=$null
try {$office=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 3} catch {}
if($null -ne $office -and $office.app -ne 'Claw-Empire'){throw 'Another service uses the office port; it was preserved.'}
if($null -eq $office){
    $script=Join-Path $PSScriptRoot 'open-control.ps1'
    Start-Process powershell.exe -WindowStyle Minimized -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$script+'"'),'-RunMainServer')
    for($i=0;$i -lt 60;$i++){
        Start-Sleep -Seconds 1
        try {$office=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 2;if($office.app -eq 'Claw-Empire'){break};throw 'Another service uses the office port; it was preserved.'}catch{if($_.Exception.Message -match 'Another service'){throw}}
    }
}
if($null -eq $office -or $office.app -ne 'Claw-Empire'){throw 'Main office did not start. Open its minimized server window to check the error. No reinstall or login reset was performed.'}
$temp=(& wsl.exe --distribution Ubuntu --exec mktemp -d /tmp/office-control-XXXXXXXX | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $temp -notmatch '^/tmp/office-control-[A-Za-z0-9]+$'){throw 'Cannot prepare input server installer.'}
foreach($name in @('install-control.py','control-payload.zip','restart-control.py','update-readability.py','readability.json')){
    $data=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $name)))
    $data | & wsl.exe --distribution Ubuntu --exec bash -lc "base64 --decode --ignore-garbage > $temp/$name"
    if($LASTEXITCODE -ne 0){throw 'Cannot transfer verified input server package.'}
}
Write-Host 'Checking office chat and display update. First application builds the UI; please wait.'
& wsl.exe --distribution Ubuntu --exec python3 "$temp/update-readability.py" "$temp/readability.json" | Tee-Object -Variable uiOutput
$uiExit=$LASTEXITCODE
if($uiExit -ne 0){
    $reason=$null
    try {$reason=($uiOutput | Select-Object -Last 1 | ConvertFrom-Json).reasonCode} catch {}
    if($reason -eq 'office_review_running_wait_until_finished'){
        Write-Warning 'Work is running. The office UI update was deferred. Existing work continues. Run 0 again after it finishes to apply native chat.'
    }else{throw 'Text update stopped safely. Existing data and login were preserved. Keep this error for review.'}
}
$installedText=(& wsl.exe --distribution Ubuntu --exec python3 "$temp/install-control.py" "$temp/control-payload.zip" | Out-String).Trim()
if($LASTEXITCODE -ne 0){Write-Host $installedText;throw 'Input server installation stopped safely.'}
$installed=$installedText|ConvertFrom-Json
$running=$false
$health=$null
try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8810/health' -TimeoutSec 2} catch {}
if($null -ne $health){
    if($health.app -ne 'AI-Office-Control'){throw 'Another service uses port 8810; it was preserved.'}
    if($health.packageVersion -ne $installed.packageId){
        & wsl.exe --distribution Ubuntu --exec python3 "$temp/restart-control.py"
        if($LASTEXITCODE -ne 0){throw 'Cannot verify the old input server. It was preserved; main office was not stopped.'}
    }else{$running=$true}
}
if(-not $running){
    $script=Join-Path $PSScriptRoot 'open-control.ps1'
    Start-Process powershell.exe -WindowStyle Minimized -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$script+'"'),'-RunServer')
    for($i=0;$i -lt 45;$i++){
        Start-Sleep -Seconds 1
        try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8810/health' -TimeoutSec 2;if($health.app -eq 'AI-Office-Control' -and $health.packageVersion -eq $installed.packageId){$running=$true;break}}catch{}
    }
}
if(-not $running){throw 'Input server did not start. Keep its error window open.'}
if(-not $NoBrowser){
    $access=(& wsl.exe --distribution Ubuntu --exec cat /workspace/ai-office/state/control-access.key | Out-String).Trim()
    if($LASTEXITCODE -ne 0 -or $access -notmatch '^[a-f0-9]{64}$'){throw 'Private browser connection was not prepared.'}
    Start-Process ('http://127.0.0.1:8810/#access='+$access)
    $access=$null
}
Write-Host 'Office is ready. Server windows are minimized. Next time, use only 0-open-office.cmd. Do not close server windows while work is running.'
