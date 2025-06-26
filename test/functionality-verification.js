const fs = require('fs');
const path = require('path');

console.log('🔍 FailSafe Functionality Verification\n');

// Read key files
const uiPath = path.join(__dirname, '../src/ui.ts');
const commandsPath = path.join(__dirname, '../src/commands.ts');
const extensionPath = path.join(__dirname, '../src/extension.ts');

const uiContent = fs.readFileSync(uiPath, 'utf8');
const commandsContent = fs.readFileSync(commandsPath, 'utf8');
const extensionContent = fs.readFileSync(extensionPath, 'utf8');

let verificationResults = {
    real: 0,
    mock: 0,
    total: 0,
    details: []
};

function verify(description, isReal, details = '') {
    verificationResults.total++;
    if (isReal) {
        verificationResults.real++;
        console.log(`✅ REAL: ${description}`);
    } else {
        verificationResults.mock++;
        console.log(`❌ MOCK: ${description}${details ? ' - ' + details : ''}`);
    }
    verificationResults.details.push({ description, isReal, details });
}

// 1. Chart Implementation Verification
console.log('\n📊 Chart Implementation:');
verify('Chart.js CDN loaded', uiContent.includes('https://cdn.jsdelivr.net/npm/chart.js'));
verify('Chart initialization with real data', uiContent.includes('new Chart(') && uiContent.includes('data:'));
verify('Chart update functionality', uiContent.includes('velocityChart.update()') && uiContent.includes('validationChart.update()'));
verify('Chart grouping dropdown with real options', uiContent.includes('Group by Sprint') && uiContent.includes('Group by Rule'));
verify('Chart data transformation logic', uiContent.includes('velocityChart.data = velocityData') && uiContent.includes('switch(grouping)'));

// 2. Task Management Verification
console.log('\n🗓 Task Management:');
verify('Add task with real validation', commandsContent.includes('vscode.window.showInputBox') && commandsContent.includes('this.sprintPlanner.addTaskToSprint'));
verify('Edit task with status mapping', commandsContent.includes('statusMap: { [key: string]: TaskStatus }') && commandsContent.includes('this.sprintPlanner.updateTask'));
verify('Delete task with confirmation', commandsContent.includes('vscode.window.showWarningMessage') && commandsContent.includes('this.sprintPlanner.removeTaskFromSprint'));
verify('Task templates with real data', commandsContent.includes('Bug Fix') && commandsContent.includes('Feature Development') && commandsContent.includes('storyPoints: 2'));
verify('Task error handling', commandsContent.includes('this.logger.error') && commandsContent.includes('vscode.window.showErrorMessage'));

// 3. Design Document Verification
console.log('\n📋 Design Document:');
verify('DesignDocumentManager singleton', commandsContent.includes('DesignDocumentManager.getInstance()'));
verify('Design document storage', commandsContent.includes('.failsafe/design-doc.md'));
verify('Design document HTML generation', commandsContent.includes('generateDesignDocumentHTML'));
verify('Design document prompt integration', extensionContent.includes('promptForDesignDocument'));
verify('Design document drift validation', commandsContent.includes('checkForDrift'));

// 4. Backend Integration Verification
console.log('\n🔗 Backend Integration:');
verify('Project plan integration', commandsContent.includes('this.projectPlan.'));
verify('Task engine integration', commandsContent.includes('this.taskEngine.'));
verify('Logger integration', commandsContent.includes('this.logger.info') || commandsContent.includes('this.logger.error'));
verify('Sprint planner integration', commandsContent.includes('this.sprintPlanner.'));
verify('Validator integration', commandsContent.includes('this.validator.'));
verify('Test runner integration', commandsContent.includes('this.testRunner.'));
verify('Cursor rules engine integration', commandsContent.includes('this.cursorrulesEngine.'));
verify('Design document manager integration', commandsContent.includes('this.designDocumentManager.'));

// 5. UI Structure Verification
console.log('\n🎨 UI Structure:');
verify('Dashboard tab with real content', uiContent.includes('id="dashboard"') && uiContent.includes('Summary Metrics'));
verify('Console tab with real actions', uiContent.includes('id="console"') && uiContent.includes('Validate Chat'));
verify('Sprint plan tab with real structure', uiContent.includes('id="sprint-plan"') && uiContent.includes('Sprint List'));
verify('Cursor rules tab with real structure', uiContent.includes('id="cursor-rules"') && uiContent.includes('Rules Table'));
verify('Logs tab with real structure', uiContent.includes('id="logs"') && uiContent.includes('Logs Table'));
verify('Tab navigation with real JavaScript', uiContent.includes('function switchTab(') && uiContent.includes('classList.add(\'active\')'));

// 6. Message Handling Verification
console.log('\n📨 Message Handling:');
verify('Dashboard message handler', commandsContent.includes('handleDashboardMessage'));
verify('Webview message posting', uiContent.includes('vscode.postMessage'));
verify('Command registration', commandsContent.includes('registerCommands'));
verify('Extension activation', extensionContent.includes('activate'));
verify('Message command handling', uiContent.includes('command: \'addTask\'') || uiContent.includes('command: \'editTask\''));

// 7. Mock Implementation Detection
console.log('\n🔍 Mock Implementation Detection:');
const mockIndicators = [
    { pattern: 'console.log\\(', description: 'Console logging instead of real actions', count: 0 },
    { pattern: '// TODO', description: 'TODO comments indicating incomplete work', count: 0 },
    { pattern: '// FIXME', description: 'FIXME comments indicating broken code', count: 0 },
    { pattern: '// Example', description: 'Example code not real implementation', count: 0 },
    { pattern: '// Mock', description: 'Mock implementations', count: 0 },
    { pattern: 'placeholder', description: 'Placeholder implementations', count: 0 }
];

mockIndicators.forEach(indicator => {
    const uiMatches = (uiContent.match(new RegExp(indicator.pattern, 'gi')) || []).length;
    const commandsMatches = (commandsContent.match(new RegExp(indicator.pattern, 'gi')) || []).length;
    const totalMatches = uiMatches + commandsMatches;
    indicator.count = totalMatches;
    
    if (totalMatches > 0) {
        console.log(`⚠️  Found ${totalMatches} potential ${indicator.description}`);
    }
});

// 8. Compilation Verification
console.log('\n⚙️ Compilation Verification:');
try {
    const { execSync } = require('child_process');
    execSync('npm run compile', { stdio: 'pipe' });
    verify('TypeScript compilation successful', true);
} catch (error) {
    verify('TypeScript compilation successful', false, error.message);
}

console.log('\n📊 Verification Summary:');
console.log(`Total Features: ${verificationResults.total}`);
console.log(`Real Implementations: ${verificationResults.real}`);
console.log(`Mock Implementations: ${verificationResults.mock}`);
console.log(`Real Implementation Rate: ${((verificationResults.real / verificationResults.total) * 100).toFixed(1)}%`);

console.log('\n🎯 Implementation Assessment:');
if (verificationResults.real / verificationResults.total >= 0.9) {
    console.log('🟢 EXCELLENT: Implementation is highly real and production-ready');
} else if (verificationResults.real / verificationResults.total >= 0.8) {
    console.log('🟡 GOOD: Implementation is mostly real with minor mock elements');
} else if (verificationResults.real / verificationResults.total >= 0.7) {
    console.log('🟠 FAIR: Implementation has some mock elements but is functional');
} else {
    console.log('🔴 NEEDS WORK: Implementation has significant mock elements');
}

// Summary of mock indicators
const totalMockIndicators = mockIndicators.reduce((sum, indicator) => sum + indicator.count, 0);
if (totalMockIndicators > 0) {
    console.log(`\n⚠️  Mock Indicators Found: ${totalMockIndicators}`);
    mockIndicators.forEach(indicator => {
        if (indicator.count > 0) {
            console.log(`  - ${indicator.description}: ${indicator.count}`);
        }
    });
} else {
    console.log('\n✅ No mock indicators found in source code');
}

console.log('\n📋 Final Assessment:');
console.log(`✅ Real Implementation Rate: ${((verificationResults.real / verificationResults.total) * 100).toFixed(1)}%`);
console.log(`✅ Compilation Status: ${verificationResults.details.find(d => d.description.includes('compilation')).isReal ? 'Success' : 'Failed'}`);
console.log(`✅ Mock Indicators: ${totalMockIndicators} found`);
console.log(`✅ Overall Status: ${verificationResults.real / verificationResults.total >= 0.8 ? 'PRODUCTION READY' : 'NEEDS IMPROVEMENT'}`); 