$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Section {
    param([string]$Message)

    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

function Invoke-CheckedCommand {
    param(
        [string]$FailureMessage,
        [scriptblock]$Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

Set-Location $RootDir

Write-Section "Checking backend..."
Set-Location (Join-Path $RootDir "backend")

$VenvActivate = Join-Path (Get-Location) ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $VenvActivate)) {
    throw "Backend virtual environment not found. Run: cd trademind-ai/backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt"
}

. $VenvActivate

Write-Section "Running backend smoke tests..."
Invoke-CheckedCommand "Backend smoke tests failed." {
    python smoke_test.py
}

Write-Section "Running backend compile check..."
Invoke-CheckedCommand "Backend compile check failed." {
    python -m compileall app
}

Write-Section "Checking frontend..."
Set-Location (Join-Path $RootDir "frontend")

if (-not (Test-Path "node_modules")) {
    throw "Frontend dependencies not found. Run: cd trademind-ai/frontend; npm install"
}

Write-Section "Running frontend build..."
Invoke-CheckedCommand "Frontend build failed." {
    npm run build
}

Write-Section "Running Playwright smoke tests..."
Invoke-CheckedCommand "Playwright smoke tests failed." {
    npm run test:e2e
}

Write-Host ""
Write-Host "TradeMind AI validation passed." -ForegroundColor Green
