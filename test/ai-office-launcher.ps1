$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$testRoot=Join-Path ([IO.Path]::GetTempPath()) ('office single launcher with spaces '+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force > $null
foreach($name in @('open-control.ps1','install-control.py','control-payload.zip','restart-control.py','update-readability.py','readability.json')){Copy-Item (Join-Path (Join-Path $repo 'tools/ai-office/install') $name) $testRoot -Force}
$global:mainReady=$false;$global:inputReady=$false;$global:oldStopped=$false;$global:spawns=@();$global:mode='old'
function global:Start-Sleep {param($Seconds)}
function global:Start-Process {param($FilePath,$ArgumentList,$WindowStyle) if($ArgumentList -contains '-RunMainServer'){$global:mainReady=$true};if($ArgumentList -contains '-RunServer'){$global:inputReady=$true};$global:spawns+=,@($FilePath,$ArgumentList,$WindowStyle)}
function global:Invoke-RestMethod {param($Uri,$TimeoutSec) if($Uri -match ':8790/'){if(-not $global:mainReady){throw 'offline'};return @{app='Claw-Empire'}}if($global:mode -eq 'foreign'){return @{app='OtherApp'}}if($global:inputReady){return @{app='AI-Office-Control';packageVersion='fixture-package'}}if(-not $global:oldStopped){return @{app='AI-Office-Control';packageVersion='old-package'}}throw 'offline'}
function global:wsl.exe {$stream=($input|Out-String);$global:LASTEXITCODE=0;if($args -contains 'mktemp'){return '/tmp/office-control-fixture'}if(($args -join ' ') -match 'python3 /tmp/office-control-fixture/install-control.py'){return '{"installed":true,"packageId":"fixture-package"}'}if(($args -join ' ') -match 'python3 /tmp/office-control-fixture/restart-control.py'){$global:oldStopped=$true;return '{"stopped":true}'}if($args -contains 'cat'){return ('a'*64)}}
& "$testRoot/open-control.ps1"
if(-not $global:mainReady -or -not $global:inputReady -or -not $global:oldStopped){throw 'Startup or verified old control replacement not performed'}
$serverSpawns=@($global:spawns|Where-Object {$_[0] -eq 'powershell.exe'})
if($serverSpawns.Count -ne 2){throw 'Expected only two minimized server processes'}
foreach($spawn in $serverSpawns){if($spawn[2] -ne 'Minimized'){throw 'Server window not minimized'};$i=[Array]::IndexOf($spawn[1],'-File');if($spawn[1][$i+1] -ne ([char]34+$testRoot+'/open-control.ps1'+[char]34)){throw 'Path quoting failed'}}
$global:spawns=@();& "$testRoot/open-control.ps1" -NoBrowser
if($global:spawns.Count -ne 0){throw 'Duplicate server process started'}
$global:mode='foreign';$global:oldStopped=$false;$failed=$false
try{& "$testRoot/open-control.ps1" -NoBrowser}catch{$failed=$true}
if(-not $failed -or $global:oldStopped){throw 'Foreign listener not preserved'}
Write-Output 'PASS: one launcher starts main/input, replaces verified old control only, preserves other listener, reuses servers, quotes spaced paths and minimizes windows'

Remove-Item -Recurse -Force $testRoot
