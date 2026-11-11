param([ValidateSet('update','github','validation')][string]$Action='update')
$ErrorActionPreference='Stop'
if(-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)){throw 'Existing Ubuntu on WSL2 is required. No new environment was created.'}
$temp=(& wsl.exe --distribution Ubuntu --exec mktemp -d /tmp/office-development-XXXXXXXX | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $temp -notmatch '^/tmp/office-development-[A-Za-z0-9]+$'){throw 'Cannot prepare reviewed office tools.'}
$names=switch($Action){
 'update' {@('enable-development.py','update-development.py','development-runtime.json','restart-main.py','restart-control.py','start-services.py','update-readability.py','readability.json','install-control.py','control-payload.zip','prepare-validation.mjs')}
 'github' {@('connect-github.sh')}
 'validation' {@('prepare-validation.mjs')}
}
foreach($name in $names){
 $data=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $name)))
 $data | & wsl.exe --distribution Ubuntu --exec bash -lc "base64 --decode --ignore-garbage > $temp/$name"
 if($LASTEXITCODE -ne 0){throw 'Cannot transfer reviewed office tool. Existing state was preserved.'}
}
switch($Action){
 'update' {
   & wsl.exe --distribution Ubuntu --exec python3 "$temp/enable-development.py"
   if($LASTEXITCODE -eq 0){& wsl.exe --distribution Ubuntu --exec /workspace/ai-office/toolchain/node/bin/node "$temp/prepare-validation.mjs"}
 }
 'github' {& wsl.exe --distribution Ubuntu --exec bash "$temp/connect-github.sh"}
 'validation' {& wsl.exe --distribution Ubuntu --exec /workspace/ai-office/toolchain/node/bin/node "$temp/prepare-validation.mjs"}
}
if($LASTEXITCODE -ne 0){throw 'Setup is incomplete. Keep the error above. Existing data and login were not reset.'}
Write-Host 'Completed. Open 0-open-office.cmd for the office. No new model task or deployment was started.'
