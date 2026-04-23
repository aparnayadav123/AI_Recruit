$port = 8089
Write-Host "Checking port $port..."
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Killing process $process on port $port..."
    Stop-Process -Id $process -Force
    Start-Sleep -Seconds 3
} else {
    Write-Host "Port $port is free."
}

Write-Host "Starting Backend..."
mvn spring-boot:run > console_output.txt 2>&1
