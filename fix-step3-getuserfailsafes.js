const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix all this.ui.getUserFailsafes references - return empty array
content = content.replace(
    /this\.ui\.getUserFailsafes\(\)/g,
    '[]'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Step 3: Fixed all this.ui.getUserFailsafes references!'); 