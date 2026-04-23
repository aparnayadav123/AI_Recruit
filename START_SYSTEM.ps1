$backendPort = 8089
$frontendPort = 3000
$agentPort = 8090

Write-Host "--- RECRUITAI SYSTEM CLEANUP & START ---" -ForegroundColor Cyan

# 1. Kill everything on ports
function Clear-Port ([int]$port) {
    Write-Host "Checking Port $port..."
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        foreach ($p in $processes) {
            Write-Host "Forcefully terminating process PID $p on port $port..." -ForegroundColor Yellow
            taskkill /PID $p /F /T
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Port $port is already clear." -ForegroundColor Green
    }
}

Clear-Port $backendPort
Clear-Port $frontendPort
Clear-Port $agentPort

# 2. Start LinkedIn Agent
Write-Host "Starting Autonomous LinkedIn Agent on Port 8090..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd linkedin-agent; node index.js" -WindowStyle Normal

# 3. Start Backend
Write-Host "Starting Backend on Port 8088..." -ForegroundColor Cyan
Set-Location -Path ".\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn spring-boot:run | Tee-Object -FilePath '..\backend_debug.log'" -WindowStyle Normal

# 4. Start Frontend
Set-Location -Path ".."
Write-Host "Starting Frontend on Port 3000..." -ForegroundColor Cyan
npm run dev

Write-Host "--- SYSTEM LAUNCHED ---" -ForegroundColor Green
