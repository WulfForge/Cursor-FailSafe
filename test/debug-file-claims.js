const { ChatValidator } = require('../out/chatValidator');
const { Logger } = require('../out/logger');

// Test the file claims extraction
const logger = new Logger();
const chatValidator = new ChatValidator(logger, '/tmp');

const chatContent = `
    I created a new file called test.txt with the content "Hello, World!".
    I also modified the package.json file to add new dependencies.
    I verified that the src/main.ts file exists and is properly formatted.
`;

console.log('Chat content:', chatContent);
console.log('---');

const claims = chatValidator.extractFileClaims(chatContent);
console.log('Extracted claims:', JSON.stringify(claims, null, 2));

// Test each regex pattern individually
const patterns = [
    /\b(?:I created|I've created|created|added)\s+(?:a\s+)?(?:new\s+)?(?:file|script|class|module)\s+(?:called\s+)?([\w\/\.-]+)/gi,
    /\b(?:I modified|I updated|modified|updated)\s+(?:the\s+)?(?:file|script|class|module)\s+([\w\/\.-]+)/gi,
    /\b(?:I verified|I checked|verified|checked)\s+(?:that\s+)?(?:the\s+)?(?:file|script|class|module)\s+([\w\/\.-]+)/gi
];

patterns.forEach((pattern, index) => {
    console.log(`Pattern ${index + 1}:`, pattern.source);
    const matches = chatContent.matchAll(pattern);
    for (const match of matches) {
        console.log(`  Match: "${match[0]}" -> "${match[1]}"`);
    }
}); 