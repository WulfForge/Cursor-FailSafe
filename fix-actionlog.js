const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix actionLog references - comment them out for now
content = content.replace(
    /this\.ui\.actionLog\.push\(/g,
    '// Action logged: '
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('Fixed actionLog references!'); 