const fs = require('fs');
const { execSync } = require('child_process');

const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('RecruitAI-Validation-Spec.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$stream.Close()
$zip.Dispose()
[System.IO.File]::WriteAllText('scratch_spec_xml.txt', $content)
`;

fs.writeFileSync('temp_read.ps1', ps);
execSync('powershell -ExecutionPolicy Bypass -File temp_read.ps1');

const xml = fs.readFileSync('scratch_spec_xml.txt', 'utf8');
const text = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
fs.writeFileSync('scratch_spec_text.txt', text);
console.log('Docx text length:', text.length);
console.log(text.substring(0, 2000));
