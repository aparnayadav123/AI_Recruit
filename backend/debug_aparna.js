const fs = require('fs');
const data = JSON.parse(fs.readFileSync('skillmatrices_dump.json', 'utf8'));
const aparna = data.find(x => x.candidateId === 'CAN-91bb5031');
if (aparna) {
    console.log('ID:', aparna.candidateId);
    console.log('Metrics Count:', aparna.skillMetrics ? aparna.skillMetrics.length : 0);
    if (aparna.skillMetrics) {
        aparna.skillMetrics.forEach(m => console.log(`- ${m.skill}: ${m.percentage}%`));
    }
} else {
    console.log('Aparna matrix not found');
}
