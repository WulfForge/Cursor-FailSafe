const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Fix all this.ui.projectPlan references
content = content.replace(
    /this\.ui\.projectPlan\.initialize\(\)/g,
    'this.projectPlan.initialize()'
);

content = content.replace(
    /this\.ui\.projectPlan\.getCurrentTask\(\)/g,
    'this.projectPlan.getCurrentTask()'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Step 1: Fixed all this.ui.projectPlan references!'); 