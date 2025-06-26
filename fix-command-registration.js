const fs = require('fs');
const path = require('path');

// Read the commands.ts file
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let content = fs.readFileSync(commandsPath, 'utf8');

// Remove the markTaskComplete command registration
content = content.replace(
    /vscode\.commands\.registerCommand\('failsafe\.markTaskComplete', \(\) => this\.markTaskComplete\(\)\),\s*/g,
    ''
);

// Write the fixed content back
fs.writeFileSync(commandsPath, content, 'utf8');

console.log('Command registration fixed!'); 