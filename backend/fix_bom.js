const fs = require('fs');

const fixFile = (file) => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed BOM in ${file}`);
        } else {
            console.log(`No BOM in ${file}`);
        }
    } else {
        console.log(`${file} not found`);
    }
};

fixFile('recruits_db.json');
fixFile('jobs.json');
fixFile('candidates.json');
fixFile('candidates_v3.json');
fixFile('jobs_v3.json');
