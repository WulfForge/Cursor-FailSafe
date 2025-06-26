const fs = require('fs');

// Read the commands file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Add single instance enforcement and webview notifications
const dashboardMethod = `
    private static dashboardPanel: vscode.WebviewPanel | undefined;

    public async showDashboard(): Promise<void> {
        try {
            // Check if dashboard is already open
            if (Commands.dashboardPanel) {
                Commands.dashboardPanel.reveal();
                return;
            }

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

            // Store the panel reference for single instance enforcement
            Commands.dashboardPanel = panel;

            // Handle panel disposal
            panel.onDidDispose(() => {
                Commands.dashboardPanel = undefined;
            });

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
                    try {
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
                            case 'showNotification': {
                                // Handle webview-contained notifications
                                this.showWebviewNotification(panel, message.type, message.message);
                                break;
                            }
                        }
                    } catch (error) {
                        // Send error to webview instead of showing toast
                        this.showWebviewNotification(panel, 'error', \`Operation failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
                        this.logger.error('Dashboard operation failed', error);
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.logger.info('Dashboard opened successfully');
        } catch (error) {
            this.logger.error('Failed to show dashboard', error);
            // Only show error toast if dashboard is not open
            if (!Commands.dashboardPanel) {
                vscode.window.showErrorMessage(\`Failed to show dashboard: \${error instanceof Error ? error.message : 'Unknown error'}\`);
            }
        }
    }

    private showWebviewNotification(panel: vscode.WebviewPanel, type: 'info' | 'warning' | 'error' | 'success', message: string): void {
        panel.webview.postMessage({
            command: 'showNotification',
            type: type,
            message: message
        });
    }`;

// Replace the existing showDashboard method
content = content.replace(
    /public async showDashboard\(\): Promise<void> \{[\s\S]*?this\.logger\.info\('Dashboard opened successfully'\);\s*\} catch \(error\) \{[\s\S]*?vscode\.window\.showErrorMessage\(`Failed to show dashboard: \${error instanceof Error \? error\.message : 'Unknown error'}`\);\s*\}\s*\}/,
    dashboardMethod
);

// Write back the updated content
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Fixed dashboard integration with single instance enforcement and webview notifications!'); 