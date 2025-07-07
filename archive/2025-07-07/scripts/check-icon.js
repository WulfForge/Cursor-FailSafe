const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, '..', 'images', 'icon.png');

function isPng(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
           buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
}

if (!isPng(iconPath)) {
    console.error('ERROR: images/icon.png is missing or not a valid PNG file. Please restore a valid icon before packaging.');
    process.exit(1);
} else {
    console.log('icon.png is valid.');
} 