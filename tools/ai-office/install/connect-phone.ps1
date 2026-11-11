$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'open-control.ps1') -NoBrowser
$ts=Get-Command tailscale.exe -ErrorAction SilentlyContinue
if($ts){$tailscale=$ts.Source}else{$tailscale='C:\Program Files\Tailscale\tailscale.exe'}
if(-not(Test-Path $tailscale)){
    Write-Host 'Install the official Windows Tailscale app, sign in, then run 10-phone-connect.cmd again.'
    Start-Process 'https://tailscale.com/download/windows'
    throw 'Official Tailscale installation and your own account login are required.'
}
$versionText=(& $tailscale version | Out-String)
if($LASTEXITCODE -ne 0 -or $versionText -notmatch '(\d+\.\d+\.\d+)'){throw 'Cannot verify installed Tailscale version.'}
$version=[version]$Matches[1]
if($version -lt [version]'1.90.0'){throw 'Update Tailscale to a current stable version before private office access.'}
$status=(& $tailscale status --json | ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Open Tailscale and complete your own sign-in first.'}
if($status.BackendState -ne 'Running'){
    & $tailscale up
    if($LASTEXITCODE -ne 0){throw 'Tailscale sign-in did not complete. Do not send login links or keys to chat.'}
    $status=(& $tailscale status --json | ConvertFrom-Json)
}
if($status.BackendState -ne 'Running'){throw 'Tailscale is not connected yet.'}
$dns=([string]$status.Self.DNSName).TrimEnd('.')
if($dns -notmatch '^[a-zA-Z0-9.-]+\.ts\.net$'){throw 'This device does not have a verified Tailscale HTTPS name.'}
$ownerId=[string]$status.Self.UserID
$owner=($status.User.PSObject.Properties | Where-Object Name -eq $ownerId).Value.LoginName
if(-not $owner -or ([string]$owner).Length -gt 240){throw 'This must be your user-owned device, not a tagged service device.'}
function Assert-PrivateScope($serve){
    foreach($p in $serve.AllowFunnel.PSObject.Properties){if($p.Value -eq $true){throw 'An existing public Funnel was found. Its configuration was preserved; stop and review it first.'}}
    foreach($p in $serve.TCP.PSObject.Properties){if($p.Name -ne '443' -or $p.Value.HTTPS -ne $true){throw 'Existing Tailscale service configuration was preserved; manual review is required.'}}
    foreach($p in $serve.Web.PSObject.Properties){
        if($p.Name -ne ($dns+':443')){throw 'Existing Tailscale web service was preserved; manual review is required.'}
        foreach($h in $p.Value.Handlers.PSObject.Properties){if($h.Name -ne '/' -or $h.Value.Proxy -ne 'http://127.0.0.1:8810'){throw 'Existing Tailscale route was preserved; manual review is required.'}}
    }
    if($serve.Services -and $serve.Services.PSObject.Properties.Count -gt 0){throw 'Existing Tailscale services were preserved; manual review is required.'}
}
$before=(& $tailscale serve status --json | ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Cannot inspect existing private/public serving configuration.'}
Assert-PrivateScope $before
$record=@{version=1;origin=('https://'+$dns);ownerLogin=[string]$owner}|ConvertTo-Json -Compress
$data=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($record))
$program=@'
import base64,json,os,sys,tempfile
from pathlib import Path
v=json.loads(base64.b64decode(sys.argv[1])); p=Path('/workspace/ai-office/state/private-access.json')
if p.is_symlink(): raise SystemExit('Existing private access configuration requires review.')
if p.exists():
 old=json.loads(p.read_text())
 if old.get('origin')!=v['origin'] or old.get('ownerLogin')!=v['ownerLogin']: raise SystemExit('Existing owner configuration was preserved. Review the account before changing it.')
else:
 fd,name=tempfile.mkstemp(prefix='private-access-',dir=str(p.parent));os.write(fd,json.dumps(v).encode());os.close(fd);os.chmod(name,0o600);os.replace(name,p)
print('Private owner pin prepared; credentials and office data were not changed.')
'@
$encodedProgram=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($program))
& wsl.exe --distribution Ubuntu --exec bash -lc "echo $encodedProgram | base64 --decode | python3 - $data"
if($LASTEXITCODE -ne 0){throw 'Owner connection settings were not changed.'}
& $tailscale serve --bg --https=443 http://127.0.0.1:8810
if($LASTEXITCODE -ne 0){throw 'Private HTTPS setup needs your Tailscale confirmation. Follow its official link, then retry this file.'}
$after=(& $tailscale serve status --json | ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Cannot verify the final Tailscale configuration.'}
Assert-PrivateScope $after
$web=($after.Web.PSObject.Properties | Where-Object Name -eq ($dns+':443')).Value
if(-not $web -or $web.Handlers.'/'.Proxy -ne 'http://127.0.0.1:8810'){throw 'Private HTTPS route was not confirmed.'}
Write-Host ''
Write-Host 'PRIVATE OFFICE ADDRESS (not a login code):'
Write-Host ('https://'+$dns+'/desk')
Write-Host 'Install Tailscale on your phone and sign in with the SAME account. Connect it, then open this address.'
Write-Host 'Keep this PC awake, and keep both office server windows open. No public Funnel was enabled.'
Write-Host 'Phone access is not verified until you open the address on the phone.'
