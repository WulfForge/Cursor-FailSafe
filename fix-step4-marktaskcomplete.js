const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix the markTaskComplete method signature to accept optional taskId
content = content.replace(
    /private async markTaskComplete\(\): Promise<void> \{/g,
    'private async markTaskComplete(taskId?: string): Promise<void> {'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Step 4: Fixed markTaskComplete method signature!'); 