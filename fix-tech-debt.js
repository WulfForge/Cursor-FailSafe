const fs = require('fs');
const path = require('path');

// Fix TaskStatus enum usage in taskEngine.ts
function fixTaskEngine() {
    const filePath = 'src/taskEngine.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix checkIntervalMs type
    content = content.replace(
        /private checkIntervalMs = 30000;/,
        'private checkIntervalMs: NodeJS.Timeout | null = null;'
    );
    
    // Fix TaskStatus enum usage
    content = content.replace(/TaskStatus\.IN_PROGRESS/g, 'TaskStatus.inProgress');
    content = content.replace(/TaskStatus\.BLOCKED/g, 'TaskStatus.blocked');
    content = content.replace(/TaskStatus\.NOT_STARTED/g, 'TaskStatus.notStarted');
    
    // Fix setInterval usage
    content = content.replace(
        /this\.checkIntervalMs = setInterval\(\(\) => \{[\s\S]*?\}, this\.checkIntervalMs\);/,
        'this.checkIntervalMs = setInterval(() => {\n            this.checkTasks();\n        }, 30000);'
    );
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed taskEngine.ts');
}

// Fix cursorrulesEngine.ts issues
function fixCursorrulesEngine() {
    const filePath = 'src/cursorrulesEngine.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix updatedAt handling
    content = content.replace(
        /updatedAt: new Date\(rule\.updatedAt\)\.toISOString\(\)/,
        'updatedAt: rule.updatedAt ? new Date(rule.updatedAt).toISOString() : undefined'
    );
    
    // Fix context type
    content = content.replace(
        /context: rule\.context/,
        'context: typeof rule.context === \'string\' ? rule.context : undefined'
    );
    
    // Fix usageStats null checks
    content = content.replace(
        /rule\.usageStats\.triggers\+\+;/,
        'if (!rule.usageStats) rule.usageStats = { triggers: 0, overrides: 0 };\n            rule.usageStats.triggers++;'
    );
    
    content = content.replace(
        /rule\.usageStats\.lastTriggered = new Date\(\)\.toISOString\(\);/,
        'rule.usageStats.lastTriggered = new Date().toISOString();'
    );
    
    content = content.replace(
        /rule\.usageStats\.overrides\+\+;/,
        'if (!rule.usageStats) rule.usageStats = { triggers: 0, overrides: 0 };\n            rule.usageStats.overrides++;'
    );
    
    // Fix getStats method
    content = content.replace(
        /totalTriggers: this\.rules\.reduce\(\(sum, r\) => sum \+ r\.usageStats\.triggers, 0\)/,
        'totalTriggers: this.rules.reduce((sum, r) => sum + (r.usageStats?.triggers || 0), 0)'
    );
    
    content = content.replace(
        /totalOverrides: this\.rules\.reduce\(\(sum, r\) => sum \+ r\.usageStats\.overrides, 0\)/,
        'totalOverrides: this.rules.reduce((sum, r) => sum + (r.usageStats?.overrides || 0), 0)'
    );
    
    // Fix scope null check
    content = content.replace(
        /rule\.scope\.userRoles\.includes\(role\) \|\| rule\.scope\.userRoles\.includes\('\*'\)/,
        '(!rule.scope || rule.scope.userRoles.includes(role) || rule.scope.userRoles.includes(\'*\'))'
    );
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed cursorrulesEngine.ts');
}

// Fix commands.ts issues
function fixCommands() {
    const filePath = 'src/commands.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix failsafe type issues
    content = content.replace(
        /customFailsafes\.map\(failsafe => \(/,
        'customFailsafes.map((failsafe: any) => ('
    );
    
    // Fix validateChat method call
    content = content.replace(
        /const result = await validator\.validateChat\(chatContent, context\);/,
        'const result = await validator.validateChat(chatContent);'
    );
    
    // Fix extensionContext property references
    content = content.replace(/this\.extensionContext/g, 'this.context');
    
    // Fix validateContent method call
    content = content.replace(
        /const violations = this\.cursorrulesEngine\.validateContent\(content\);/,
        'const violations = this.cursorrulesEngine.evaluateContent(content);'
    );
    
    // Fix validateMinimal method call
    content = content.replace(
        /const result = this\.chatValidator\.validateMinimal\(content, \{[\s\S]*?\}\);/,
        'const result = this.chatValidator.validateMinimal(content);'
    );
    
    // Fix importProjectPlan method call
    content = content.replace(
        /const result = await this\.pmpProjectPlanManager\.importProjectPlan\(importData\.source, importData\.content\);/,
        'const result = await this.pmpProjectPlanManager.importProjectPlan(importData.source);'
    );
    
    // Fix createSprint method call
    content = content.replace(
        /const result = this\.sprintPlanner\.createSprint\(sprintData\.name, sprintData\.duration, sprintData\.tasks\);/,
        'const result = this.sprintPlanner.createSprint(sprintData.name);'
    );
    
    // Fix techStack type issue
    content = content.replace(
        /techStack: this\.detectTechStack\(\)/,
        'techStack: await this.detectTechStack()'
    );
    
    // Remove duplicate detectTechStack function
    const lines = content.split('\n');
    let inDuplicateFunction = false;
    let duplicateStart = -1;
    let braceCount = 0;
    
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('private detectTechStack(): string[]')) {
            duplicateStart = i;
            break;
        }
    }
    
    if (duplicateStart !== -1) {
        // Find the end of the function
        for (let i = duplicateStart; i < lines.length; i++) {
            if (lines[i].includes('{')) braceCount++;
            if (lines[i].includes('}')) braceCount--;
            if (braceCount === 0) {
                lines.splice(duplicateStart, i - duplicateStart + 1);
                break;
            }
        }
        content = lines.join('\n');
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed commands.ts');
}

// Fix extension.ts issues
function fixExtension() {
    const filePath = 'src/extension.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix validateContent method call
    content = content.replace(
        /const cursorruleResults = this\.cursorrulesEngine\.validateContent\(content, \{[\s\S]*?\}\);/,
        'const cursorruleResults = this.cursorrulesEngine.evaluateContent(content);'
    );
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed extension.ts');
}

// Fix testCursorrules.ts issues
function fixTestCursorrules() {
    const filePath = 'src/testCursorrules.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix severity value
    content = content.replace(
        /severity: "high"/,
        'severity: "error"'
    );
    
    // Fix validateContent method call
    content = content.replace(
        /const results = engine\.validateContent\(testContent, \{[\s\S]*?\}\);/,
        'const results = engine.evaluateContent(testContent);'
    );
    
    // Fix type annotations
    content = content.replace(
        /results\.forEach\(\(result, index\) => \{/,
        'results.forEach((result: any, index: number) => {'
    );
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed testCursorrules.ts');
}

// Main execution
console.log('Starting comprehensive tech debt fix...');

try {
    fixTaskEngine();
    fixCursorrulesEngine();
    fixCommands();
    fixExtension();
    fixTestCursorrules();
    
    console.log('All tech debt fixes completed successfully!');
} catch (error) {
    console.error('Error during tech debt fix:', error);
    process.exit(1);
} 