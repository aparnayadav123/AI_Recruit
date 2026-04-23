const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'backend', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    console.log(`Processing ${file}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Truncate to standard ISO-8601 (yyyy-MM-ddTHH:mm:ss.SSS)
    // This catches patterns like .SSS.SS.S or .SSS.SSS
    const malformedRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})[0-9\.]*/g;
    
    const newContent = content.replace(malformedRegex, '$1');
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fixed malformed timestamps in ${file}`);
    } else {
        console.log(`No changes needed for ${file}`);
    }
});
