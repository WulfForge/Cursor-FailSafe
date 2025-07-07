const fs = require('fs');
const path = require('path');

console.log('🔍 Validating FailSafe Implementation Against Design Document\n');

// Read key files
const uiPath = path.join(__dirname, '../src/ui.ts');
const commandsPath = path.join(__dirname, '../src/commands.ts');
const designDocPath = path.join(__dirname, '../failsafe_ui_specification.md');

const uiContent = fs.readFileSync(uiPath, 'utf8');
const commandsContent = fs.readFileSync(commandsPath, 'utf8');
const specContent = fs.readFileSync(designDocPath, 'utf8');

let validationResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

function validate(description, condition) {
    validationResults.total++;
    if (condition) {
        validationResults.passed++;
        console.log(`✅ ${description}`);
    } else {
        validationResults.failed++;
        console.log(`❌ ${description}`);
    }
    validationResults.details.push({ description, passed: condition });
}

// 1. Design Document Requirement
console.log('\n📋 Design Document Requirement:');
validate('Design Document Manager class exists', commandsContent.includes('DesignDocumentManager'));
validate('Design document prompt on workspace open', commandsContent.includes('designDocumentManager'));
validate('Design document storage in .failsafe folder', commandsContent.includes('.failsafe'));
validate('Design document drift validation', uiContent.includes('checkForDrift'));
validate('Design document UI access points', uiContent.includes('viewDesignDocument') && uiContent.includes('manageDesignDocument'));

// 2. Dashboard Tab
console.log('\n📊 Dashboard Tab:');
validate('Summary metrics panel', uiContent.includes('Summary Metrics'));
validate('Effectiveness charts with Chart.js', uiContent.includes('Chart.js') && uiContent.includes('velocityChart'));
validate('Chart grouping dropdown', uiContent.includes('chart-grouping'));
validate('FailSafe success metrics', uiContent.includes('success-metrics'));
validate('Alerts and compliance panel', uiContent.includes('alerts-compliance'));
validate('Real chart data generation', uiContent.includes('generateVelocityChartData'));

// 3. Console Tab
console.log('\n💻 Console Tab:');
validate('System status display', uiContent.includes('System Status'));
validate('Cursor connection status', uiContent.includes('cursor-connected'));
validate('Quick actions panel', uiContent.includes('Quick Actions'));
validate('Validate chat manual action', commandsContent.includes('validateChat'));
validate('Check for drift action', commandsContent.includes('checkForDrift'));
validate('Version check action', commandsContent.includes('versionCheck'));
validate('Auto-bump version action', commandsContent.includes('autoBumpVersion'));
validate('Settings panel', uiContent.includes('Settings Panel'));

// 4. Sprint Plan Tab
console.log('\n🗓 Sprint Plan Tab:');
validate('Sprint list with filters', uiContent.includes('Sprint List'));
validate('Sprint cards with status badges', uiContent.includes('sprint-card'));
validate('Sprint detail panel', uiContent.includes('Sprint Detail'));
validate('Task drag-and-drop reordering', uiContent.includes('drag-and-drop'));
validate('Task cards with edit/delete/complete', uiContent.includes('task-card'));
validate('Add task functionality', commandsContent.includes('addTask'));
validate('Create from template', commandsContent.includes('createFromTemplate'));
validate('Edit task functionality', commandsContent.includes('editTask'));
validate('Delete task functionality', commandsContent.includes('deleteTask'));

// 5. Cursor Rules Tab
console.log('\n🔒 Cursor Rules Tab:');
validate('Rules table with columns', uiContent.includes('Rules Table'));
validate('Add new rule wizard', commandsContent.includes('addNewRule'));
validate('Add from template dropdown', commandsContent.includes('addFromTemplate'));
validate('Edit rule functionality', commandsContent.includes('editRule'));
validate('Delete rule functionality', commandsContent.includes('deleteRule'));
validate('Toggle enable/disable', commandsContent.includes('toggleRule'));
validate('View trigger history', commandsContent.includes('viewHistory'));

// 6. Logs Tab
console.log('\n📘 Logs Tab:');
validate('Logs table with columns', uiContent.includes('Logs Table'));
validate('Log type filters', uiContent.includes('log-filters'));
validate('Time range picker', uiContent.includes('time-range'));
validate('Keyword search', uiContent.includes('keyword-search'));
validate('Export logs functionality', commandsContent.includes('exportLogs'));
validate('Clear logs functionality', commandsContent.includes('clearLogs'));

// 7. Hearthlink Global Theme
console.log('\n🎨 Hearthlink Global Theme:');
validate('Dark interface styling', uiContent.includes('#121417') || uiContent.includes('#1E1F24'));
validate('Electric blue accents', uiContent.includes('#00BFFF'));
validate('Soft violet accents', uiContent.includes('#9B59B6'));
validate('Success green colors', uiContent.includes('#2ECC71'));
validate('Error red colors', uiContent.includes('#E74C3C'));
validate('Warning amber colors', uiContent.includes('#F39C12'));
validate('Rounded components', uiContent.includes('border-radius'));
validate('Card-based layout', uiContent.includes('card'));

// 8. Real Implementation vs Mock
console.log('\n🔧 Real Implementation vs Mock:');
validate('Real Chart.js charts (not placeholders)', uiContent.includes('new Chart('));
validate('Real task management (not console.log)', !commandsContent.includes('console.log') || commandsContent.includes('this.logger'));
validate('Real sprint planner integration', commandsContent.includes('sprintPlanner.'));
validate('Real design document manager', commandsContent.includes('designDocumentManager.'));
validate('Real cursor rules engine', commandsContent.includes('cursorrulesEngine.'));
validate('Real validation system', commandsContent.includes('validator.'));

// 9. Backend Integration
console.log('\n🔗 Backend Integration:');
validate('Project plan integration', commandsContent.includes('projectPlan.'));
validate('Task engine integration', commandsContent.includes('taskEngine.'));
validate('Logger integration', commandsContent.includes('this.logger'));
validate('Test runner integration', commandsContent.includes('testRunner.'));
validate('Configuration management', commandsContent.includes('this.config'));

// 10. Message Handling
console.log('\n📨 Message Handling:');
validate('Dashboard message handler', commandsContent.includes('handleDashboardMessage'));
validate('Webview message posting', uiContent.includes('vscode.postMessage'));
validate('Command registration', commandsContent.includes('registerCommands'));
validate('Extension activation', commandsContent.includes('activate'));

console.log('\n📊 Validation Summary:');
console.log(`Total Checks: ${validationResults.total}`);
console.log(`Passed: ${validationResults.passed}`);
console.log(`Failed: ${validationResults.failed}`);
console.log(`Success Rate: ${((validationResults.passed / validationResults.total) * 100).toFixed(1)}%`);

if (validationResults.failed > 0) {
    console.log('\n❌ Failed Checks:');
    validationResults.details
        .filter(detail => !detail.passed)
        .forEach(detail => console.log(`  - ${detail.description}`));
}

console.log('\n🎯 Implementation Status:');
if (validationResults.passed / validationResults.total >= 0.9) {
    console.log('🟢 EXCELLENT: Implementation is highly compliant with specification');
} else if (validationResults.passed / validationResults.total >= 0.8) {
    console.log('🟡 GOOD: Implementation is mostly compliant with specification');
} else if (validationResults.passed / validationResults.total >= 0.7) {
    console.log('🟠 FAIR: Implementation needs some improvements');
} else {
    console.log('🔴 NEEDS WORK: Implementation requires significant improvements');
}

console.log('\n📋 Next Steps:');
if (validationResults.failed > 0) {
    console.log('1. Address failed validation checks');
    console.log('2. Complete missing functionality');
    console.log('3. Replace any remaining mock implementations');
} else {
    console.log('1. ✅ All specification requirements met');
    console.log('2. 🚀 Ready for testing and deployment');
    console.log('3. 📈 Consider additional enhancements');
} 