Set-Location $PSScriptRoot
$port = 3000
Write-Host "Searching for processes on port $port..."
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($procId in $processes) {
        Write-Host "Forcefully killing process $procId on port $port..."
        taskkill /PID $procId /F /T
    }
    Start-Sleep -Seconds 2
    Write-Host "Port $port cleared."
} else {
    Write-Host "Port $port is free."
}

Write-Host "Starting Frontend on Port $port..."
npm run dev
