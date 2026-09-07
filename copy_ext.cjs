const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'linkedin-extension');
const destDir = path.join(__dirname, 'RecruitAI-LinkedIn-Extension');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isDirectory()) {
            copyFolderSync(fromPath, toPath);
        } else {
            fs.copyFileSync(fromPath, toPath);
        }
    });
}

console.log('Copying files from linkedin-extension to RecruitAI-LinkedIn-Extension...');
copyFolderSync(srcDir, destDir);
console.log('Copy complete!');
