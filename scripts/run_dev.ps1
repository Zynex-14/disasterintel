# PowerShell script to run both Backend and Frontend in development mode

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting AURA-NWP Disaster Early Warning System" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in separate process or background job
Write-Host "[1/2] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$backendProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; .\.venv\Scripts\uvicorn app.main:app --reload --port 8000" -PassThru

Start-Sleep -Seconds 3

# 2. Start Frontend
Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"

Write-Host "`nBoth services launched successfully!" -ForegroundColor Green
Write-Host "• Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "• Backend Swagger Docs: http://127.0.0.1:8000/api/v1/docs" -ForegroundColor Yellow
Write-Host "Press any key to close this launcher..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
