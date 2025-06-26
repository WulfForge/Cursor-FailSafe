const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Remove the duplicate methods that were added at the end
// Find the first occurrence of the duplicate methods and remove everything after the original class closing brace
const originalClassEnd = content.indexOf('    private async detectTechStack(): Promise<string[]> {');
if (originalClassEnd !== -1) {
    // Find the end of the original class (before the duplicates)
    const originalEnd = content.indexOf('}', originalClassEnd);
    if (originalEnd !== -1) {
        // Keep only the content up to the original class end
        content = content.substring(0, originalEnd + 1);
    }
}

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Step 6: Removed duplicate methods!'); 