# Ensure we are in the directory containing this script (and the pom.xml)
Set-Location $PSScriptRoot

$ports = @(8088, 8089)
foreach ($port in $ports) {
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
}

$mavenBin = Join-Path $PSScriptRoot "maven_bin\apache-maven-3.9.5\bin"
if (Test-Path $mavenBin) {
    $env:PATH = "$mavenBin;" + $env:PATH
}
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
}

Write-Host "Starting Backend on Port 8089..."
mvn spring-boot:run > console_output.txt 2>&1
