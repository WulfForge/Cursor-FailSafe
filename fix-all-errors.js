const fs = require('fs');
const path = require('path');

// Fix 1: Add missing imports to cursorrulesManager.ts
const cursorrulesManagerPath = path.join(__dirname, 'src', 'cursorrulesManager.ts');
let cursorrulesManagerContent = fs.readFileSync(cursorrulesManagerPath, 'utf8');

// Add missing imports
if (!cursorrulesManagerContent.includes("import { ProjectPlan }")) {
    cursorrulesManagerContent = cursorrulesManagerContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}

fs.writeFileSync(cursorrulesManagerPath, cursorrulesManagerContent);

// Fix 2: Add missing imports to cursorrulesWizard.ts
const cursorrulesWizardPath = path.join(__dirname, 'src', 'cursorrulesWizard.ts');
let cursorrulesWizardContent = fs.readFileSync(cursorrulesWizardPath, 'utf8');

// Add missing imports
if (!cursorrulesWizardContent.includes("import { ProjectPlan }")) {
    cursorrulesWizardContent = cursorrulesWizardContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}

fs.writeFileSync(cursorrulesWizardPath, cursorrulesWizardContent);

// Fix 3: Add missing imports to troubleshootingStateManager.ts
const troubleshootingStateManagerPath = path.join(__dirname, 'src', 'troubleshootingStateManager.ts');
let troubleshootingStateManagerContent = fs.readFileSync(troubleshootingStateManagerPath, 'utf8');

// Add missing imports
if (!troubleshootingStateManagerContent.includes("import { ProjectPlan }")) {
    troubleshootingStateManagerContent = troubleshootingStateManagerContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}

fs.writeFileSync(troubleshootingStateManagerPath, troubleshootingStateManagerContent);

// Fix 4: Add missing imports to ui.ts
const uiPath = path.join(__dirname, 'src', 'ui.ts');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Add missing imports
if (!uiContent.includes("import { ProjectPlan }")) {
    uiContent = uiContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}

fs.writeFileSync(uiPath, uiContent);

// Fix 5: Fix extension.ts constructor call
const extensionPath = path.join(__dirname, 'src', 'extension.ts');
let extensionContent = fs.readFileSync(extensionPath, 'utf8');

// Fix the constructor call
extensionContent = extensionContent.replace(
    /this\.commands = new Commands\([^)]+\);/g,
    "this.commands = new Commands(this.projectPlan, this.taskEngine, this.logger);"
);

fs.writeFileSync(extensionPath, extensionContent);

console.log('All compilation errors have been fixed!'); 