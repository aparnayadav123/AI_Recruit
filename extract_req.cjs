const fs = require('fs');
const { execSync } = require('child_process');

const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('RecruitAI-Requirements.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$stream.Close()
$zip.Dispose()
[System.IO.File]::WriteAllText('scratch_req_xml.txt', $content)
`;

fs.writeFileSync('temp_read_req.ps1', ps);
execSync('powershell -ExecutionPolicy Bypass -File temp_read_req.ps1');

const xml = fs.readFileSync('scratch_req_xml.txt', 'utf8');
const text = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
fs.writeFileSync('scratch_req_text.txt', text);
console.log('Requirements docx text length:', text.length);
