$props = Get-Content "src/main/resources/application.properties"
$apiKeyLine = $props | Where-Object { $_ -match "gemini.api.key" }
$apiKey = $apiKeyLine -replace "gemini.api.key=", ""
$apiKey = $apiKey.Trim()

$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"

Write-Host "Listing Models with URL: $url"
try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    Write-Host "Available Models:"
    $response.models | ForEach-Object { Write-Host $_.name }
} catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errBody = $streamReader.ReadToEnd()
        Write-Host "Body: $errBody"
    }
}
