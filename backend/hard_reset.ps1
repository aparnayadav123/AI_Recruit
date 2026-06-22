Write-Host "Force killing all Java processes..."
taskkill /F /IM java.exe
Start-Sleep -Seconds 5

Write-Host "Starting Backend..."
mvn spring-boot:run > console_output.txt 2>&1
