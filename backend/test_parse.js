const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    console.log('PDF object:', typeof pdf, Object.keys(pdf));
    const buffer = fs.readFileSync('uploads/1770372755356-Chinnikrishna.pdf');
    try {
        // Standard call
        const res = await pdf(buffer);
        console.log('Result length:', res.text?.length);
    } catch (e) {
        console.log('Standard call failed:', e.message);
    }

    try {
        // Named export call
        if (pdf.pdfToText) {
            const res = await pdf.pdfToText(buffer);
            console.log('pdfToText length:', res?.length);
        }
    } catch (e) {
        console.log('pdfToText call failed:', e.message);
    }
}

test();
