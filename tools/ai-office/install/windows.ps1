# Run in normal Windows PowerShell. Only WSL installation itself may require elevation/reboot.
param([ValidateSet('install','start','initialize','login','review','doctor','handoff','characters','repair','readability')][string]$Action='install')
$ErrorActionPreference='Stop'
if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { throw 'WSL2 is required. https://learn.microsoft.com/windows/wsl/install' }
if ($Action -eq 'install') {
    $kernel = (& wsl.exe --distribution Ubuntu --exec uname -r | Out-String)
    if ($LASTEXITCODE -ne 0 -or $kernel -notmatch 'WSL2') { throw 'Ubuntu on WSL2 is required. Do not reset an existing distribution. https://learn.microsoft.com/windows/wsl/install' }
    $command = @'
set -euo pipefail
if ! test -d /workspace; then sudo install -d -o "$(id -u)" -g "$(id -g)" /workspace; fi
test -w /workspace || { echo '/workspace is not writable; existing ownership was preserved.' >&2; exit 1; }
sudo apt-get update
sudo apt-get install -y git ca-certificates
if ! test -e /workspace/donknow; then git clone https://github.com/thepmpo/donknow /workspace/donknow; fi
test -f /workspace/donknow/tools/ai-office/install/linux.sh || { echo 'The installer is missing from this checkout. Existing files were preserved.' >&2; exit 1; }
bash /workspace/donknow/tools/ai-office/install/linux.sh
'@
} elseif ($Action -eq 'readability') {
    $sourceDir=(& wsl.exe --distribution Ubuntu --exec mktemp -d /tmp/office-readable-XXXXXXXX | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $sourceDir -notmatch '^/tmp/office-readable-[A-Za-z0-9]+$') { throw 'Cannot prepare office UI update.' }
    foreach($name in @('update-readability.py','readability.json')) {
        $local=Join-Path $PSScriptRoot $name
        $data=[Convert]::ToBase64String([System.IO.File]::ReadAllBytes($local))
        $data | & wsl.exe --distribution Ubuntu --exec bash -lc "base64 --decode --ignore-garbage > $sourceDir/$name"
        if ($LASTEXITCODE -ne 0) { throw 'Cannot copy reviewed UI package.' }
    }
    & wsl.exe --distribution Ubuntu --exec python3 "$sourceDir/update-readability.py" "$sourceDir/readability.json"
    if ($LASTEXITCODE -ne 0) { throw 'UI update stopped. If a review is running, wait until it finishes.' }
    exit 0
} elseif ($Action -eq 'repair') {
    $repairFile=Join-Path $PSScriptRoot 'repair-auth.py'
    $repairEncoded=[Convert]::ToBase64String([System.IO.File]::ReadAllBytes($repairFile))
    & wsl.exe --distribution Ubuntu --exec bash -lc "echo $repairEncoded | base64 --decode | python3"
    if ($LASTEXITCODE -ne 0) { throw 'Login repair stopped. Existing authentication was preserved.' }
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/doctor.sh
    if ($LASTEXITCODE -ne 0) { throw 'Repair finished; diagnosis could not connect. Keep the server window open.' }
    exit 0
} elseif ($Action -eq 'login') {
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/login.sh
    if ($LASTEXITCODE -ne 0) { throw 'Login did not complete. No code or token should be sent to chat.' }
    $repairFile=Join-Path $PSScriptRoot 'repair-auth.py'
    $repairEncoded=[Convert]::ToBase64String([System.IO.File]::ReadAllBytes($repairFile))
    & wsl.exe --distribution Ubuntu --exec bash -lc "echo $repairEncoded | base64 --decode | python3"
    if ($LASTEXITCODE -ne 0) { throw 'Login completed; authentication folder needs review. Do not delete authentication.' }
    & wsl.exe --distribution Ubuntu --exec /workspace/ai-office/bin/doctor.sh
    if ($LASTEXITCODE -ne 0) { throw 'Login completed; office diagnosis unavailable. Keep the server window open.' }
    exit 0
} elseif ($Action -eq 'initialize') {
    $command = 'export PATH="/workspace/ai-office/toolchain/node/bin:$PATH"; cd /workspace/donknow; node scripts/ai-office-local.mjs initialize && node scripts/ai-office-ready.mjs prepare'
} else {
    $scriptName = if ($Action -eq 'start') {'start'} else {$Action}
    $command = '/workspace/ai-office/bin/' + $scriptName + '.sh'
}
# ASCII Base64 avoids PowerShell -> WSL quoting or accidental evaluation of pasted shell content.
$encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($command))
& wsl.exe --distribution Ubuntu --exec bash -lc "echo $encoded | base64 --decode | bash"
if ($LASTEXITCODE -ne 0) { throw "Action failed ($LASTEXITCODE). Existing data has not been reset. Keep this window's error details." }

if ($Action -eq 'handoff') { Start-Process explorer.exe '\\wsl.localhost\Ubuntu\workspace\ai-office\handoffs' }
