const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix the chat validation context to include missing properties
content = content.replace(
    /const context: ChatValidationContext = \{[\s\S]*?workspaceRoot: string;[\s\S]*?techStack: string\[\];[\s\S]*?\};/g,
    `const context: ChatValidationContext = {
                workspaceRoot: string;
                currentFile: string;
                projectType: string;
                techStack: string[];
                fileSystem: 'vscode';
                path: document.fileName;
            };`
);

// Fix the validateChatContent method call
content = content.replace(
    /validator\.validateChatContent\(/g,
    'validator.validate('
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Step 5: Fixed chat validation context and validator usage!'); 