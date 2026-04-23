$port = 8089
Write-Host "Searching for Node processes on port $port..."
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($procId in $processes) {
        Write-Host "Killing process $procId..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process $procId..."
    }
    Start-Sleep -Seconds 2
    Write-Host "Port $port cleared."
} else {
    Write-Host "Port $port is free."
}

# Write-Host "Resetting DB..."
# node reset_db.js

Write-Host "Starting Simulator..."
Start-Process node -ArgumentList "mongodb-simulator.js" -RedirectStandardOutput "simulator.log" -RedirectStandardError "simulator_error.log" -NoNewWindow
Write-Host "🚀 Simulator running on http://localhost:8089"
