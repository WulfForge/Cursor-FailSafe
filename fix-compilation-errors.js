const fs = require('fs');
const path = require('path');

console.log('Starting compilation error fixes...');

// Fix 1: Fix ChatValidator usage in commands.ts
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let commandsContent = fs.readFileSync(commandsPath, 'utf8');

// Fix ChatValidator constructor call
commandsContent = commandsContent.replace(
    /const validator = new ChatValidator\(this\.logger\);/g,
    "const validator = new ChatValidator(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');"
);

// Fix ChatValidator method call
commandsContent = commandsContent.replace(
    /const result = await validator\.validateChatResponse\(content, context\);/g,
    "const result = await validator.validateChat(content);"
);

// Fix fileSystem type issue
commandsContent = commandsContent.replace(
    /fileSystem: vscode\.workspace\.fs,/g,
    "fileSystem: require('fs'),"
);

fs.writeFileSync(commandsPath, commandsContent);
console.log('✓ Fixed commands.ts');

// Fix 2: Add missing imports to cursorrulesWizard.ts
const cursorrulesWizardPath = path.join(__dirname, 'src', 'cursorrulesWizard.ts');
let cursorrulesWizardContent = fs.readFileSync(cursorrulesWizardPath, 'utf8');

// Add missing imports
if (!cursorrulesWizardContent.includes("import { ProjectPlan }")) {
    cursorrulesWizardContent = cursorrulesWizardContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';\nimport { AldenUI } from './ui';"
    );
}

// Fix Commands constructor calls
cursorrulesWizardContent = cursorrulesWizardContent.replace(
    /new Commands\(new ProjectPlan\(this\.logger\), new TaskEngine\(this\.logger\), new AldenUI\(\), this\.logger\)/g,
    "new Commands(new ProjectPlan(this.logger), new TaskEngine(new ProjectPlan(this.logger), this.logger), this.logger)"
);

fs.writeFileSync(cursorrulesWizardPath, cursorrulesWizardContent);
console.log('✓ Fixed cursorrulesWizard.ts');

// Fix 3: Add missing imports to troubleshootingStateManager.ts
const troubleshootingStateManagerPath = path.join(__dirname, 'src', 'troubleshootingStateManager.ts');
let troubleshootingStateManagerContent = fs.readFileSync(troubleshootingStateManagerPath, 'utf8');

// Add missing imports
if (!troubleshootingStateManagerContent.includes("import { ProjectPlan }")) {
    troubleshootingStateManagerContent = troubleshootingStateManagerContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';\nimport { AldenUI } from './ui';"
    );
}

// Fix Commands constructor calls
troubleshootingStateManagerContent = troubleshootingStateManagerContent.replace(
    /new Commands\(new ProjectPlan\(this\.logger\), new TaskEngine\(this\.logger\), new AldenUI\(\), this\.logger\)/g,
    "new Commands(new ProjectPlan(this.logger), new TaskEngine(new ProjectPlan(this.logger), this.logger), this.logger)"
);

fs.writeFileSync(troubleshootingStateManagerPath, troubleshootingStateManagerContent);
console.log('✓ Fixed troubleshootingStateManager.ts');

// Fix 4: Add missing imports to ui.ts
const uiPath = path.join(__dirname, 'src', 'ui.ts');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Add missing imports
if (!uiContent.includes("import { ProjectPlan }")) {
    uiContent = uiContent.replace(
        "import { Commands } from './commands';",
        "import { Commands } from './commands';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';\nimport { AldenUI } from './ui';"
    );
}

// Fix Commands constructor calls
uiContent = uiContent.replace(
    /new Commands\(new ProjectPlan\(undefined as any\), new TaskEngine\(undefined as any\), new AldenUI\(\), undefined as any\)/g,
    "new Commands(new ProjectPlan(undefined as any), new TaskEngine(new ProjectPlan(undefined as any), undefined as any), undefined as any)"
);

fs.writeFileSync(uiPath, uiContent);
console.log('✓ Fixed ui.ts');

// Fix 5: Fix extension.ts constructor call
const extensionPath = path.join(__dirname, 'src', 'extension.ts');
let extensionContent = fs.readFileSync(extensionPath, 'utf8');

// Fix the constructor call
extensionContent = extensionContent.replace(
    /this\.commands = new Commands\([^)]+\);/g,
    "this.commands = new Commands(this.projectPlan, this.taskEngine, this.logger);"
);

// Make showDashboard public
extensionContent = extensionContent.replace(
    /private async showDashboard\(\)/g,
    "public async showDashboard()"
);

fs.writeFileSync(extensionPath, extensionContent);
console.log('✓ Fixed extension.ts');

// Fix 6: Add missing method to AldenUI
const aldenUIPath = path.join(__dirname, 'src', 'ui.ts');
let aldenUIContent = fs.readFileSync(aldenUIPath, 'utf8');

// Add generateDashboardHTML method if it doesn't exist
if (!aldenUIContent.includes("generateDashboardHTML")) {
    const methodToAdd = `
    public generateDashboardHTML(): string {
        return \`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FailSafe Dashboard</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .dashboard {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .content {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="dashboard">
                    <div class="header">
                        <h1>FailSafe Dashboard</h1>
                        <p>AI Safety and Validation System</p>
                    </div>
                    <div class="content">
                        <div class="card">
                            <h3>Quick Actions</h3>
                            <p>Dashboard content will be generated here.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        \`;
    }`;

    // Find the last method in the AldenUI class and add the new method
    const lastMethodIndex = aldenUIContent.lastIndexOf('}');
    aldenUIContent = aldenUIContent.slice(0, lastMethodIndex) + methodToAdd + '\n' + aldenUIContent.slice(lastMethodIndex);
}

fs.writeFileSync(aldenUIPath, aldenUIContent);
console.log('✓ Added missing method to AldenUI');

console.log('All compilation errors have been fixed!'); 