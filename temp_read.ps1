
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('RecruitAI-Validation-Spec.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$stream.Close()
$zip.Dispose()
[System.IO.File]::WriteAllText('scratch_spec_xml.txt', $content)
