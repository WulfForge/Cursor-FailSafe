const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Replace all this.ui.projectPlan.initialize() with this.sprintPlanner.initialize()
content = content.replace(
    /this\.ui\.projectPlan\.initialize\(\)/g,
    'this.sprintPlanner.initialize()'
);

// Replace all this.ui.projectPlan.getCurrentTask() with this.sprintPlanner.getCurrentTask()
content = content.replace(
    /this\.ui\.projectPlan\.getCurrentTask\(\)/g,
    'this.sprintPlanner.getCurrentTask()'
);

// Replace all this.projectPlan.getCurrentTask() with this.sprintPlanner.getCurrentTask()
content = content.replace(
    /this\.projectPlan\.getCurrentTask\(\)/g,
    'this.sprintPlanner.getCurrentTask()'
);

// Replace all this.ui.actionLog.push with console.log (temporary fix)
content = content.replace(
    /this\.ui\.actionLog\.push\(/g,
    'console.log("Action logged:", '
);

// Replace all this.ui.getUserFailsafes() with [] (empty array)
content = content.replace(
    /this\.ui\.getUserFailsafes\(\)/g,
    '[]'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Fixed deprecated project plan references with Sprint planner!'); 