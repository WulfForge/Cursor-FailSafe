const fs = require('fs');

console.log('🔧 Fixing final syntax errors...');

// Fix the syntax errors in extension.ts
let content = fs.readFileSync('src/extension.ts', 'utf8');

// Fix the extra parentheses
content = content.replace(
    /panel\.webview\.html = content\);/g,
    'panel.webview.html = content;'
);

content = content.replace(
    /panel\.webview\.html = this\.getViolationsHtml\(violations\)\);/g,
    'panel.webview.html = this.getViolationsHtml(violations);'
);

content = content.replace(
    /panel\.webview\.html = this\.getValidationDetailsHtml\(result\)\);/g,
    'panel.webview.html = this.getValidationDetailsHtml(result);'
);

fs.writeFileSync('src/extension.ts', content, 'utf8');
console.log('✅ Fixed syntax errors in extension.ts'); 