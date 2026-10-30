param([ValidateRange(1024, 65535)][int]$Port = 3300, [string]$Server)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'get-server-target.ps1')
$ottlogServer = Get-OttlogServerTarget -Server $Server
$ottlogRoot = Split-Path $PSScriptRoot -Parent
$ottlogKey = Join-Path $ottlogRoot 'local-state/server-deploy/ottlog-deploy-ed25519'
$ottlogKnownHosts = Join-Path $ottlogRoot 'local-state/server-deploy/known_hosts'
if (-not (Test-Path -LiteralPath $ottlogKey)) { throw 'Deployment SSH key is missing on this computer.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use. The existing Ottlog tunnel may still be running; open http://127.0.0.1:$Port/ or choose another -Port."
}
Write-Host "After the SSH connection is established, open http://127.0.0.1:$Port/"
Write-Host 'Keep this terminal open. Press Ctrl+C to close the private preview connection.'
& ssh -N -L "127.0.0.1:${Port}:127.0.0.1:8088" -i $ottlogKey -o BatchMode=yes -o ConnectTimeout=10 -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ottlogKnownHosts" $ottlogServer
exit $LASTEXITCODE
