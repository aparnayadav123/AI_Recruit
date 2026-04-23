const fs = require('fs');
const data = JSON.parse(fs.readFileSync('final_result.json', 'utf8'));
console.log('Count:', data.length);
if (data.length > 0) {
    console.log('Metrics:', JSON.stringify(data[0].skillMetrics, null, 2));
} else {
    console.log('No data');
}
