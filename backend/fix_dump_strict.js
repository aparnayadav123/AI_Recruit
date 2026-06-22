const fs = require('fs');

function cleanFile(inputFile, outputFile) {
    if (!fs.existsSync(inputFile)) {
        console.log(`File not found: ${inputFile}`);
        return;
    }

    try {
        const buffer = fs.readFileSync(inputFile);
        let startIdx = 0;

        // Find the index of the first '{' or '['
        // This skips ALL headers, BOMs, garbage characters
        for (let i = 0; i < buffer.length; i++) {
            const char = String.fromCharCode(buffer[i]);
            if (char === '{' || char === '[') {
                startIdx = i;
                break;
            }
        }

        if (startIdx === 0 && buffer[0] !== 123 && buffer[0] !== 91) {
            console.log(`Warning: No JSON start char found in ${inputFile}, or it's at 0 but check failed.`);
        }

        console.log(`Found JSON start at index ${startIdx} for ${inputFile}`);

        // Create new buffer from that point
        const cleanBuffer = buffer.slice(startIdx);

        // Write as binary/buffer to avoid encoding conversions adding new garbage
        fs.writeFileSync(outputFile, cleanBuffer);

        // Verify parse
        const check = fs.readFileSync(outputFile, 'utf8');
        try {
            JSON.parse(check);
            console.log(`✅ Successfully cleaned and verified ${outputFile}`);
        } catch (parseErr) {
            console.error(`❌ Saved file ${outputFile} is still invalid JSON: ${parseErr.message}`);
        }

    } catch (e) {
        console.error(`Error processing ${inputFile}:`, e);
    }
}

cleanFile('candidates_dump.json', 'candidates_strict_clean.json');
cleanFile('jobs_dump.json', 'jobs_strict_clean.json');
