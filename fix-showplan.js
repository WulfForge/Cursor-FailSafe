const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix the showPlan method to use showDashboard instead of ui.showDashboard
content = content.replace(
    /await this\.ui\.showDashboard\(\);/g,
    'await this.showDashboard();'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('Fixed showPlan method!'); 