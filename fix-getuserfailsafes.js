const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix getUserFailsafes references - return empty array
content = content.replace(
    /this\.ui\.getUserFailsafes\(\)/g,
    '[]'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('Fixed getUserFailsafes references!'); 