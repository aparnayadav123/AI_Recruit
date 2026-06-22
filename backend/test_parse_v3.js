const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    console.log('PDF object:', typeof pdf);
    const buffer = fs.readFileSync('uploads/1770372755356-Chinnikrishna.pdf');
    try {
        const res = await pdf(buffer);
        console.log('Success! Text length:', res.text?.length);
        console.log('Extracted Text Sample:', res.text.substring(0, 100));
    } catch (e) {
        console.log('Failed:', e.message);
    }
}
test();
