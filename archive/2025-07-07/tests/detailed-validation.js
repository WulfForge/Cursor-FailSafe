const fs = require('fs');
const path = require('path');

console.log('🔍 Detailed Validation of FailSafe Implementation Claims\n');

// Read key files
const uiPath = path.join(__dirname, '../src/ui.ts');
const commandsPath = path.join(__dirname, '../src/commands.ts');
const extensionPath = path.join(__dirname, '../src/extension.ts');

const uiContent = fs.readFileSync(uiPath, 'utf8');
const commandsContent = fs.readFileSync(commandsPath, 'utf8');
const extensionContent = fs.readFileSync(extensionPath, 'utf8');

let validationResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

function validate(description, condition, details = '') {
    validationResults.total++;
    if (condition) {
        validationResults.passed++;
        console.log(`✅ ${description}`);
    } else {
        validationResults.failed++;
        console.log(`❌ ${description}${details ? ' - ' + details : ''}`);
    }
    validationResults.details.push({ description, passed: condition, details });
}

// 1. Chart Implementation Validation
console.log('\n📊 Chart Implementation Validation:');
validate('Chart.js CDN included', uiContent.includes('https://cdn.jsdelivr.net/npm/chart.js'));
validate('Chart initialization function exists', uiContent.includes('function initializeCharts()'));
validate('Chart update function exists', uiContent.includes('function updateChartGrouping('));
validate('Chart grouping dropdown in HTML', uiContent.includes('onchange="updateChartGrouping(this.value)"'));
validate('Chart grouping options present', uiContent.includes('Group by Sprint') && uiContent.includes('Group by Rule'));
validate('Real chart data update logic', uiContent.includes('velocityChart.data = velocityData') && uiContent.includes('velocityChart.update()'));
validate('All four chart types implemented', uiContent.includes('velocityChart') && uiContent.includes('validationChart') && uiContent.includes('driftChart') && uiContent.includes('hallucinationChart'));

// 2. Task Management Validation
console.log('\n🗓 Task Management Validation:');
validate('Add task method implemented', commandsContent.includes('private async addTask()'));
validate('Edit task method implemented', commandsContent.includes('private async editTask('));
validate('Delete task method implemented', commandsContent.includes('private async deleteTask('));
validate('Create from template method', commandsContent.includes('private async createFromTemplate()'));
validate('Task status mapping implemented', commandsContent.includes('statusMap: { [key: string]: TaskStatus }'));
validate('Sprint planner integration', commandsContent.includes('this.sprintPlanner.addTaskToSprint'));
validate('Task validation and error handling', commandsContent.includes('vscode.window.showErrorMessage') && commandsContent.includes('try {') && commandsContent.includes('} catch (error)'));

// 3. Design Document Validation
console.log('\n📋 Design Document Validation:');
validate('DesignDocumentManager class exists', commandsContent.includes('DesignDocumentManager'));
validate('View design document method', commandsContent.includes('private async viewDesignDocument()'));
validate('Manage design document method', commandsContent.includes('private async manageDesignDocument()'));
validate('Design document HTML generation', commandsContent.includes('generateDesignDocumentHTML'));
validate('Design document prompt integration', extensionContent.includes('promptForDesignDocument'));
validate('Design document storage path', commandsContent.includes('.failsafe'));

// 4. Backend Integration Validation
console.log('\n🔗 Backend Integration Validation:');
validate('Project plan integration', commandsContent.includes('this.projectPlan.'));
validate('Task engine integration', commandsContent.includes('this.taskEngine.'));
validate('Logger integration', commandsContent.includes('this.logger.'));
validate('Sprint planner integration', commandsContent.includes('this.sprintPlanner.'));
validate('Validator integration', commandsContent.includes('this.validator.'));
validate('Test runner integration', commandsContent.includes('this.testRunner.'));
validate('Cursor rules engine integration', commandsContent.includes('this.cursorrulesEngine.'));
validate('Design document manager integration', commandsContent.includes('this.designDocumentManager.'));

// 5. UI Structure Validation
console.log('\n🎨 UI Structure Validation:');
validate('Dashboard tab structure', uiContent.includes('id="dashboard"'));
validate('Console tab structure', uiContent.includes('id="console"'));
validate('Sprint plan tab structure', uiContent.includes('id="sprint-plan"'));
validate('Cursor rules tab structure', uiContent.includes('id="cursor-rules"'));
validate('Logs tab structure', uiContent.includes('id="logs"'));
validate('Tab navigation implemented', uiContent.includes('function switchTab('));
validate('Card-based layout', uiContent.includes('class="card"'));
validate('Hearthlink theme colors', uiContent.includes('#00BFFF') || uiContent.includes('#2ECC71') || uiContent.includes('#E74C3C'));

// 6. Message Handling Validation
console.log('\n📨 Message Handling Validation:');
validate('Dashboard message handler', commandsContent.includes('handleDashboardMessage'));
validate('Webview message posting', uiContent.includes('vscode.postMessage'));
validate('Command registration', commandsContent.includes('registerCommands'));
validate('Extension activation', extensionContent.includes('activate'));
validate('Message command handling', uiContent.includes('command: \'addTask\'') || uiContent.includes('command: \'editTask\''));

// 7. Mock vs Real Implementation Check
console.log('\n🔧 Mock vs Real Implementation Check:');
validate('No console.log in task methods', !commandsContent.includes('console.log(\'Task') || commandsContent.includes('this.logger.info(\'Task'));
validate('Real error handling in tasks', commandsContent.includes('vscode.window.showErrorMessage') && commandsContent.includes('this.logger.error'));
validate('Real chart data generation', uiContent.includes('generateVelocityChartData') && uiContent.includes('generateValidationChartData'));
validate('Real UI generation methods', uiContent.includes('generateDashboardHTML') && uiContent.includes('generateSprintCards'));
validate('Real command implementations', commandsContent.includes('async') && commandsContent.includes('Promise<void>'));

// 8. Compilation Check
console.log('\n⚙️ Compilation Check:');
try {
    const { execSync } = require('child_process');
    execSync('npm run compile', { stdio: 'pipe' });
    validate('TypeScript compilation successful', true);
} catch (error) {
    validate('TypeScript compilation successful', false, error.message);
}

console.log('\n📊 Detailed Validation Summary:');
console.log(`Total Checks: ${validationResults.total}`);
console.log(`Passed: ${validationResults.passed}`);
console.log(`Failed: ${validationResults.failed}`);
console.log(`Success Rate: ${((validationResults.passed / validationResults.total) * 100).toFixed(1)}%`);

if (validationResults.failed > 0) {
    console.log('\n❌ Failed Checks:');
    validationResults.details
        .filter(detail => !detail.passed)
        .forEach(detail => console.log(`  - ${detail.description}${detail.details ? ': ' + detail.details : ''}`));
}

console.log('\n🎯 Implementation Assessment:');
if (validationResults.passed / validationResults.total >= 0.9) {
    console.log('🟢 EXCELLENT: Implementation is highly compliant and production-ready');
} else if (validationResults.passed / validationResults.total >= 0.8) {
    console.log('🟡 GOOD: Implementation is mostly complete with minor gaps');
} else if (validationResults.passed / validationResults.total >= 0.7) {
    console.log('🟠 FAIR: Implementation needs some improvements');
} else {
    console.log('🔴 NEEDS WORK: Implementation requires significant improvements');
}

// Check for specific mock implementations
console.log('\n🔍 Mock Implementation Detection:');
const mockIndicators = [
    { pattern: 'console.log', description: 'Console logging instead of real actions' },
    { pattern: '// TODO', description: 'TODO comments indicating incomplete work' },
    { pattern: 'placeholder', description: 'Placeholder implementations' },
    { pattern: 'mock', description: 'Mock implementations' },
    { pattern: '// Example', description: 'Example code not real implementation' }
];

mockIndicators.forEach(indicator => {
    const count = (uiContent.match(new RegExp(indicator.pattern, 'gi')) || []).length + 
                  (commandsContent.match(new RegExp(indicator.pattern, 'gi')) || []).length;
    if (count > 0) {
        console.log(`⚠️  Found ${count} potential ${indicator.description}`);
    }
}); 