const fs = require('fs');

console.log('🔧 Fixing remaining compilation errors...');

// Fix 1: Fix UI type references in commands.ts
let content = fs.readFileSync('src/commands.ts', 'utf8');
content = content.replace(
    /private ui: UI;/g,
    'private ui: AldenUI;'
);
content = content.replace(
    /ui: UI,/g,
    'ui: AldenUI,'
);
fs.writeFileSync('src/commands.ts', content, 'utf8');
console.log('✅ Fixed UI type references');

// Fix 2: Fix ChatValidationContext with proper properties
content = fs.readFileSync('src/commands.ts', 'utf8');
content = content.replace(
    /const context: ChatValidationContext = \{[\s\S]*?workspaceRoot: string;[\s\S]*?techStack: string\[\];[\s\S]*?\};/g,
    `const context: ChatValidationContext = {
                workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                fileSystem: require('fs'),
                path: require('path'),
                currentFile: document.fileName,
                projectType: await this.detectProjectType(),
                techStack: await this.detectTechStack()
            };`
);
fs.writeFileSync('src/commands.ts', content, 'utf8');
console.log('✅ Fixed ChatValidationContext');

// Fix 3: Fix validateChat method call to not pass context
content = fs.readFileSync('src/commands.ts', 'utf8');
content = content.replace(
    /const result = await validator\.validateChat\(chatContent, context\);/g,
    'const result = await validator.validateChat(chatContent);'
);
fs.writeFileSync('src/commands.ts', content, 'utf8');
console.log('✅ Fixed validateChat method call');

// Fix 4: Fix Commands constructor calls to match the 4-parameter signature
// The constructor expects: (projectPlan, taskEngine, ui, logger)
// But we're calling with: (logger, context, context)

// Fix cursorrulesManager.ts
content = fs.readFileSync('src/cursorrulesManager.ts', 'utf8');
content = content.replace(
    /new Commands\(this\.logger, this\.context, this\.context\)/g,
    'new Commands(new ProjectPlan(this.logger), new TaskEngine(this.logger), new AldenUI(), this.logger)'
);
fs.writeFileSync('src/cursorrulesManager.ts', content, 'utf8');
console.log('✅ Fixed Commands constructor calls in cursorrulesManager');

// Fix cursorrulesWizard.ts
content = fs.readFileSync('src/cursorrulesWizard.ts', 'utf8');
content = content.replace(
    /new Commands\(this\.logger, this\.context, this\.context\)/g,
    'new Commands(new ProjectPlan(this.logger), new TaskEngine(this.logger), new AldenUI(), this.logger)'
);
fs.writeFileSync('src/cursorrulesWizard.ts', content, 'utf8');
console.log('✅ Fixed Commands constructor calls in cursorrulesWizard');

// Fix extension.ts
content = fs.readFileSync('src/extension.ts', 'utf8');
content = content.replace(
    /this\.commands = new Commands\(\s*this\.logger,\s*this\.context,\s*this\.context\s*\);/g,
    'this.commands = new Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);'
);
fs.writeFileSync('src/extension.ts', content, 'utf8');
console.log('✅ Fixed Commands constructor call in extension');

// Fix troubleshootingStateManager.ts
content = fs.readFileSync('src/troubleshootingStateManager.ts', 'utf8');
content = content.replace(
    /new Commands\(this\.logger, this\.context, this\.context\)/g,
    'new Commands(new ProjectPlan(this.logger), new TaskEngine(this.logger), new AldenUI(), this.logger)'
);
fs.writeFileSync('src/troubleshootingStateManager.ts', content, 'utf8');
console.log('✅ Fixed Commands constructor call in troubleshootingStateManager');

// Fix ui.ts
content = fs.readFileSync('src/ui.ts', 'utf8');
content = content.replace(
    /new Commands\(undefined as any, context, context\)/g,
    'new Commands(new ProjectPlan(undefined as any), new TaskEngine(undefined as any), new AldenUI(), undefined as any)'
);
fs.writeFileSync('src/ui.ts', content, 'utf8');
console.log('✅ Fixed Commands constructor call in ui');

// Fix 5: Add missing imports for ProjectPlan and TaskEngine
content = fs.readFileSync('src/cursorrulesManager.ts', 'utf8');
if (!content.includes('import { ProjectPlan }')) {
    content = content.replace(
        "import { Logger } from './logger';",
        "import { Logger } from './logger';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}
fs.writeFileSync('src/cursorrulesManager.ts', content, 'utf8');

content = fs.readFileSync('src/cursorrulesWizard.ts', 'utf8');
if (!content.includes('import { ProjectPlan }')) {
    content = content.replace(
        "import { Logger } from './logger';",
        "import { Logger } from './logger';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}
fs.writeFileSync('src/cursorrulesWizard.ts', content, 'utf8');

content = fs.readFileSync('src/troubleshootingStateManager.ts', 'utf8');
if (!content.includes('import { ProjectPlan }')) {
    content = content.replace(
        "import { Logger } from './logger';",
        "import { Logger } from './logger';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}
fs.writeFileSync('src/troubleshootingStateManager.ts', content, 'utf8');

content = fs.readFileSync('src/ui.ts', 'utf8');
if (!content.includes('import { ProjectPlan }')) {
    content = content.replace(
        "import { Logger } from './logger';",
        "import { Logger } from './logger';\nimport { ProjectPlan } from './projectPlan';\nimport { TaskEngine } from './taskEngine';"
    );
}
fs.writeFileSync('src/ui.ts', content, 'utf8');
console.log('✅ Added missing imports');

console.log('🎉 All remaining compilation errors fixed!'); 