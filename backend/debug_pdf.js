const pdf = require('pdf-parse');
console.log('Type:', typeof pdf);
console.log('Is Array?', Array.isArray(pdf));
console.log('Keys:', Object.keys(pdf));
// Check if any key is the function we want
for (const key of Object.keys(pdf)) {
    console.log(`Key: ${key}, Type: ${typeof pdf[key]}`);
}
try {
    const main = require('pdf-parse/index.js');
    console.log('Type of pdf-parse/index.js:', typeof main);
} catch (e) { console.log('Cannot require index.js'); }
try {
    const lib = require('pdf-parse/lib/pdf-parse.js');
    console.log('Type of pdf-parse/lib/pdf-parse.js:', typeof lib);
} catch (e) { console.log('Cannot require lib/pdf-parse.js'); }

