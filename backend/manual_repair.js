const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const DB_FILE = 'candidates.json';
const SEED_FILE = 'candidates_final.json';
const JOBS_FILE = 'jobs_final.json';

async function run() {
    console.log('Starting manual repair...');
    const jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    const candidatesData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    const candidates = candidatesData.content || candidatesData;

    const files = fs.readdirSync('uploads').filter(f => f.endsWith('.pdf'));
    console.log(`Found ${files.length} PDFs`);

    const fileTexts = [];
    for (const file of files) {
        try {
            console.log(`Parsing ${file}...`);
            const data = await pdf(fs.readFileSync(path.join('uploads', file)));
            fileTexts.push({ file, text: data.text });
        } catch (e) { console.log(`Error parsing ${file}: ${e.message}`); }
    }

    let count = 0;
    for (const c of candidates) {
        console.log(`Checking ${c.name}...`);
        const match = fileTexts.find(ft =>
            (c.email && ft.text.toLowerCase().includes(c.email.toLowerCase())) ||
            ft.text.toLowerCase().includes(c.name.split(' ').pop().toLowerCase())
        );

        if (match) {
            console.log(`Match found in ${match.file}`);
            // Basic extraction here just to verify
            c.fitScore = 85; // Fixed for now to verify
            c.status = 'New';
            count++;
        }
    }

    if (count > 0) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ content: candidates }, null, 2));
        console.log(`Saved ${count} candidates to ${DB_FILE}`);
    }
}

run();
