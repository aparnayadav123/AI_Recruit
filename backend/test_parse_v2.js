const pdf = require('pdf-parse');
console.log('Keys:', Object.keys(pdf));
for (const key in pdf) {
    if (typeof pdf[key] === 'function') {
        console.log(`Function: ${key}`);
    }
}
async function test() {
    if (pdf.default) {
        console.log('Default exists, type:', typeof pdf.default);
        if (typeof pdf.default === 'function') {
            console.log('Trying default function...');
            // ...
        }
    }
}
test();
