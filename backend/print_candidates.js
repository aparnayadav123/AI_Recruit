const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('current_candidates.json', 'utf8'));
    data.content.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name}, Skills: ${JSON.stringify(c.skills)}`);
    });
} catch (e) {
    console.error(e);
}
