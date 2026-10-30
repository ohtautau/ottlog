function Get-OttlogServerTarget {
    param([string]$Server)
    if (-not $Server) { $Server = $env:OTTLOG_SSH_TARGET }
    if (-not $Server) {
        $ottlogConnection = Join-Path (Split-Path $PSScriptRoot -Parent) 'local-state/server-deploy/connection.json'
        if (Test-Path -LiteralPath $ottlogConnection) { $Server = (Get-Content -LiteralPath $ottlogConnection -Raw | ConvertFrom-Json).sshTarget }
    }
    if (-not $Server -or $Server -notmatch '^[a-zA-Z0-9_][a-zA-Z0-9_.@-]*$') {
        throw 'Set -Server, OTTLOG_SSH_TARGET, or local-state/server-deploy/connection.json with the verified SSH target.'
    }
    return $Server
}
