const fs = require('fs');
const path = require('path');

// Read the commands.ts file
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let content = fs.readFileSync(commandsPath, 'utf8');

// Fix the imports - remove UI import and add SprintPlanner
content = content.replace(
    /import \{ UI \} from '\.\/ui';/,
    'import { SprintPlanner } from \'./sprintPlanner\';'
);

// Fix the constructor signature
const constructorPattern = /constructor\(\s*logger: Logger,\s*workspaceRoot: string,\s*context: vscode\.ExtensionContext\s*\)\s*\{[\s\S]*?\}/;
const newConstructor = `constructor(
        logger: Logger,
        workspaceRoot: string,
        context: vscode.ExtensionContext
    ) {
        this.logger = logger;
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this.sprintPlanner = new SprintPlanner(logger);
        this.projectPlan = new ProjectPlan(logger);
        this.taskEngine = new TaskEngine(this.projectPlan, logger);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.testRunner = new TestRunner();
        this.config = vscode.workspace.getConfiguration('failsafe');
    }`;

content = content.replace(constructorPattern, newConstructor);

// Remove the UI property declaration
content = content.replace(/private ui: UI;/g, '');

// Fix the showPlan method to use showDashboard instead of ui.showDashboard
content = content.replace(
    /await this\.ui\.showDashboard\(\);/g,
    'await this.showDashboard();'
);

// Add the missing showDashboard method
const showDashboardMethod = `
    public async showDashboard(): Promise<void> {
        try {
            // Create and show the dashboard panel
            const panel = vscode.window.createWebviewPanel(
                'failsafeDashboard',
                'FailSafe Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: []
                }
            );

            // Get current data for the dashboard
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            const sprintHistory = this.sprintPlanner.getSprintHistory();
            const templates = this.sprintPlanner.getTemplates();
            const sprintMetrics = currentSprint ? this.sprintPlanner.getSprintMetrics(currentSprint.id) : null;

            // Generate dashboard HTML
            const html = this.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            panel.webview.html = html;

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'createSprint':
                            await this.createSprint();
                            break;
                        case 'exportSprintData':
                            await this.exportSprintData();
                            break;
                        case 'showSprintMetrics':
                            await this.showSprintMetrics();
                            break;
                        case 'validateChat':
                            await this.validateChat();
                            break;
                        case 'createCursorrule':
                            await this.createCursorrule();
                            break;
                        case 'validatePlanWithAI':
                            await this.validatePlanWithAI();
                            break;
                        case 'addTask':
                            await this.addTask();
                            break;
                        case 'editTask':
                            await this.editTask(message.taskId);
                            break;
                        case 'deleteTask':
                            await this.deleteTask(message.taskId);
                            break;
                        case 'duplicateTask':
                            await this.duplicateTask(message.taskId);
                            break;
                        case 'markTaskComplete':
                            await this.markTaskComplete(message.taskId);
                            break;
                        case 'reorderTasksByDragDrop':
                            await this.reorderTasksByDragDrop(message.taskIds);
                            break;
                        case 'refreshDashboard': {
                            // Refresh the dashboard data
                            const updatedSprint = this.sprintPlanner.getCurrentSprint();
                            const updatedMetrics = updatedSprint ? this.sprintPlanner.getSprintMetrics(updatedSprint.id) : null;
                            const updatedHtml = this.generateDashboardHTML(updatedSprint, sprintHistory, templates, updatedMetrics);
                            panel.webview.html = updatedHtml;
                            break;
                        }
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.logger.info('Dashboard opened successfully');
        } catch (error) {
            this.logger.error('Failed to show dashboard', error);
            vscode.window.showErrorMessage(\`Failed to show dashboard: \${error instanceof Error ? error.message : 'Unknown error'}\`);
        }
    }`;

// Add the showDashboard method before the askAI method
const askAIPattern = /private async askAI\(\): Promise<void> \{/;
content = content.replace(askAIPattern, showDashboardMethod + '\n\n    ' + askAIPattern.match(/private async askAI\(\): Promise<void> \{/)[0]);

// Add the missing applyCursorRulesToHtml method
const applyCursorRulesMethod = `
    public async applyCursorRulesToHtml(html: string): Promise<string> {
        try {
            // For now, return the HTML as-is
            // In a full implementation, this would apply cursor rules to the HTML content
            return html;
        } catch (error) {
            this.logger.error('Error applying cursor rules to HTML:', error);
            return html; // Return original HTML if processing fails
        }
    }`;

// Add the method at the end of the class
const classEndPattern = /^\s*}\s*$/m;
content = content.replace(classEndPattern, applyCursorRulesMethod + '\n}');

// Write the fixed content back
fs.writeFileSync(commandsPath, content, 'utf8');

console.log('Commands constructor and imports fixed!'); 