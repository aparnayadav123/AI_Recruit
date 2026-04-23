$props = Get-Content "src/main/resources/application.properties"
$apiKeyLine = $props | Where-Object { $_ -match "gemini.api.key" }
$apiKey = $apiKeyLine -replace "gemini.api.key=", ""
$apiKey = $apiKey.Trim()

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$apiKey"

$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "Hello, this is a test. Reply with 'OK'."
                }
            )
        }
    )
} | ConvertTo-Json -Depth 5

Write-Host "Testing Gemini API with URL: $url"
try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "Response:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errBody = $streamReader.ReadToEnd()
    Write-Host "Body: $errBody"
}
