param([switch]$SkipMiniBuild, [string]$Server)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'get-server-target.ps1')
$ottlogServer = Get-OttlogServerTarget -Server $Server
$ottlogRoot = Split-Path $PSScriptRoot -Parent
$ottlogRuntime = Join-Path $ottlogRoot 'local-state/shared-test'
New-Item -ItemType Directory -Force -Path $ottlogRuntime | Out-Null
$ottlogNode = Join-Path $ottlogRoot '.tools/node-v24.22.0-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $ottlogNode)) { $ottlogNode = (Get-Command node -ErrorAction Stop).Source }
$ottlogKey = Join-Path $ottlogRoot 'local-state/server-deploy/ottlog-deploy-ed25519'
$ottlogKnownHosts = Join-Path $ottlogRoot 'local-state/server-deploy/known_hosts'
function Test-OttlogHealth {
    try { return (Invoke-WebRequest -Uri 'http://127.0.0.1:3300/health' -TimeoutSec 3).Content.Trim() -eq 'Healthy' } catch { return $false }
}
if (-not (Test-OttlogHealth)) {
    if (Get-NetTCPConnection -LocalPort 3300 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3300 is occupied by another service; no process was stopped.' }
    if (-not (Test-Path -LiteralPath $ottlogKey)) { throw 'The deployment SSH key is missing on this computer.' }
    $ottlogSsh = Start-Process -FilePath 'ssh.exe' -ArgumentList @('-N','-L','127.0.0.1:3300:127.0.0.1:8088','-i',('"'+$ottlogKey+'"'),'-o','BatchMode=yes','-o','ConnectTimeout=10','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-o','StrictHostKeyChecking=yes','-o',('"UserKnownHostsFile='+$ottlogKnownHosts+'"'),$ottlogServer) -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $ottlogRuntime 'ssh-error.log')
    $ottlogSsh.Id | Set-Content -LiteralPath (Join-Path $ottlogRuntime 'ssh.pid')
    for ($ottlogAttempt=0; $ottlogAttempt -lt 10 -and -not (Test-OttlogHealth); $ottlogAttempt++) { Start-Sleep -Milliseconds 500 }
    if (-not (Test-OttlogHealth)) { throw 'Private API tunnel did not become healthy. See local-state/shared-test/ssh-error.log.' }
}
$ottlogOldApi = $env:API_BASE_URL
$ottlogOldMiniApi = $env:TARO_APP_API_BASE_URL
Push-Location $ottlogRoot
try {
    $env:API_BASE_URL = 'http://127.0.0.1:3300'
    $env:TARO_APP_API_BASE_URL = $env:API_BASE_URL
    if (-not $SkipMiniBuild) {
        & $ottlogNode 'miniprogram/scripts/local-build.cjs'
        if ($LASTEXITCODE -ne 0) { throw 'Mini-program shared API build failed.' }
        & $ottlogNode 'miniprogram/scripts/check-weapp-bootstrap.cjs'
        if ($LASTEXITCODE -ne 0) { throw 'Mini-program bootstrap check failed.' }
        & $ottlogNode 'miniprogram/scripts/check-package-size.cjs'
        if ($LASTEXITCODE -ne 0) { throw 'Mini-program size check failed.' }
    }
    if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3000 is already in use. Confirm its API target before reusing it; no process was stopped.' }
    & $ottlogNode 'web/scripts/build-tool-app.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Shared website tools build failed.' }
    $ottlogNext = Join-Path $ottlogRoot 'web/node_modules/next/dist/bin/next'
    $ottlogWeb = Start-Process -FilePath $ottlogNode -ArgumentList @(('"'+$ottlogNext+'"'),'dev','--hostname','127.0.0.1','--port','3000') -WorkingDirectory (Join-Path $ottlogRoot 'web') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $ottlogRuntime 'web.log') -RedirectStandardError (Join-Path $ottlogRuntime 'web-error.log')
    $ottlogWeb.Id | Set-Content -LiteralPath (Join-Path $ottlogRuntime 'web.pid')
    Write-Host 'Website: http://127.0.0.1:3000/today'
    Write-Host 'Both clients use the server API through http://127.0.0.1:3300'
    Write-Host 'Compile the original Ottlog checkout in WeChat developer tools. Sign in to the same account in both clients.'
    Write-Host 'Guest records stay on their own device. This computer-only setup does not configure phone connectivity or public DNS.'
} finally {
    Pop-Location
    $env:API_BASE_URL = $ottlogOldApi
    $env:TARO_APP_API_BASE_URL = $ottlogOldMiniApi
}
