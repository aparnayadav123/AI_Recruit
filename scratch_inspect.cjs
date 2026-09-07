const fs = require('fs');

async function inspectBundle() {
  const res = await fetch('https://www.oryfolks.com/assets/index-CPXmo8SK.js');
  const text = await res.text();
  console.log('Bundle size:', text.length);

  const keywords = ['Thank you for your application', 'received your submission', 'Application Form', 'resume', 'upload', 'POST', 'FormData', 'fetch('];
  for (const kw of keywords) {
    let pos = 0;
    let count = 0;
    while ((pos = text.indexOf(kw, pos)) !== -1 && count < 3) {
      console.log(`\n=== Found "${kw}" at ${pos} ===`);
      console.log(text.substring(Math.max(0, pos - 200), Math.min(text.length, pos + 400)));
      pos += kw.length;
      count++;
    }
  }
}

inspectBundle();
