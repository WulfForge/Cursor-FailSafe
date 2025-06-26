const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Find the last closing brace of the class
const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex === -1) {
    console.error('Could not find closing brace');
    process.exit(1);
}

// Add the missing methods before the closing brace
const methodsToAdd = `
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
    }

    public async applyCursorRulesToHtml(html: string): Promise<string> {
        try {
            // For now, return the HTML as-is
            // In a full implementation, this would apply cursor rules to the HTML content
            return html;
        } catch (error) {
            this.logger.error('Error applying cursor rules to HTML:', error);
            return html; // Return original HTML if processing fails
        }
    }

    private generateDashboardHTML(currentSprint: any, sprintHistory: any[], templates: any[], sprintMetrics: any): string {
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
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .dashboard {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: var(--vscode-button-background);
                        margin-right: 15px;
                    }
                    .title {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 600;
                    }
                    .quick-actions {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    .action-group {
                        background: var(--vscode-panel-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .group-title {
                        font-size: 16px;
                        font-weight: 600;
                        margin-bottom: 15px;
                        color: var(--vscode-editor-foreground);
                    }
                    .action-button {
                        display: block;
                        width: 100%;
                        padding: 10px 15px;
                        margin-bottom: 8px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        text-align: left;
                        transition: background-color 0.2s;
                    }
                    .action-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .sprint-section {
                        background: var(--vscode-panel-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    .sprint-header {
                        display: flex;
                        justify-content: between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .sprint-title {
                        font-size: 20px;
                        font-weight: 600;
                        margin: 0;
                    }
                    .task-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }
                    .task-item {
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        margin-bottom: 8px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        cursor: move;
                    }
                    .task-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .task-drag-handle {
                        cursor: move;
                        margin-right: 10px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .task-content {
                        flex: 1;
                    }
                    .task-name {
                        font-weight: 500;
                        margin-bottom: 4px;
                    }
                    .task-description {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .task-actions {
                        display: flex;
                        gap: 5px;
                    }
                    .task-action-btn {
                        padding: 4px 8px;
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    .task-action-btn:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .metrics {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .metric-card {
                        background: var(--vscode-panel-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 15px;
                        text-align: center;
                    }
                    .metric-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: var(--vscode-button-background);
                    }
                    .metric-label {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="dashboard">
                    <div class="header">
                        <div class="logo">🛡️</div>
                        <h1 class="title">FailSafe Dashboard</h1>
                    </div>

                    <div class="quick-actions">
                        <div class="action-group">
                            <div class="group-title">Sprint Management</div>
                            <button class="action-button" onclick="createSprint()">📅 Create New Sprint</button>
                            <button class="action-button" onclick="exportSprintData()">📊 Export Sprint Data</button>
                            <button class="action-button" onclick="showSprintMetrics()">📈 View Metrics</button>
                        </div>

                        <div class="action-group">
                            <div class="group-title">Validation & Safety</div>
                            <button class="action-button" onclick="validateChat()">🔍 Validate Chat</button>
                            <button class="action-button" onclick="createCursorrule()">⚙️ Create CursorRule</button>
                            <button class="action-button" onclick="validatePlanWithAI()">🤖 AI Plan Validation</button>
                        </div>

                        <div class="action-group">
                            <div class="group-title">Task Management</div>
                            <button class="action-button" onclick="addTask()">➕ Add Task</button>
                            <button class="action-button" onclick="refreshDashboard()">🔄 Refresh</button>
                        </div>
                    </div>

                    \${currentSprint ? \`
                        <div class="sprint-section">
                            <div class="sprint-header">
                                <h2 class="sprint-title">Current Sprint: \${currentSprint.name}</h2>
                            </div>

                            \${sprintMetrics ? \`
                                <div class="metrics">
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.totalTasks}</div>
                                        <div class="metric-label">Total Tasks</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.completedTasks}</div>
                                        <div class="metric-label">Completed</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.progressPercentage}%</div>
                                        <div class="metric-label">Progress</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.remainingDays}</div>
                                        <div class="metric-label">Days Left</div>
                                    </div>
                                </div>
                            \` : ''}

                            <h3>Tasks</h3>
                            <ul class="task-list" id="taskList">
                                \${currentSprint.tasks.map((task: any, index: number) => \`
                                    <li class="task-item" draggable="true" data-task-id="\${task.id}" data-index="\${index}">
                                        <div class="task-drag-handle">⋮⋮</div>
                                        <div class="task-content">
                                            <div class="task-name">\${task.name}</div>
                                            <div class="task-description">\${task.description || 'No description'}</div>
                                        </div>
                                        <div class="task-actions">
                                            <button class="task-action-btn" onclick="editTask('\${task.id}')">Edit</button>
                                            <button class="task-action-btn" onclick="duplicateTask('\${task.id}')">Copy</button>
                                            <button class="task-action-btn" onclick="deleteTask('\${task.id}')">Delete</button>
                                            <button class="task-action-btn" onclick="markTaskComplete('\${task.id}')">Complete</button>
                                        </div>
                                    </li>
                                \`).join('')}
                            </ul>
                        </div>
                    \` : \`
                        <div class="sprint-section">
                            <h2>No Active Sprint</h2>
                            <p>Create a new sprint to get started with task management.</p>
                        </div>
                    \`}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    // Drag and drop functionality
                    let draggedElement = null;

                    document.addEventListener('DOMContentLoaded', function() {
                        const taskList = document.getElementById('taskList');
                        if (taskList) {
                            taskList.addEventListener('dragstart', handleDragStart);
                            taskList.addEventListener('dragover', handleDragOver);
                            taskList.addEventListener('drop', handleDrop);
                            taskList.addEventListener('dragend', handleDragEnd);
                        }
                    });

                    function handleDragStart(e) {
                        draggedElement = e.target;
                        e.target.style.opacity = '0.5';
                    }

                    function handleDragOver(e) {
                        e.preventDefault();
                    }

                    function handleDrop(e) {
                        e.preventDefault();
                        if (draggedElement && e.target.closest('.task-item')) {
                            const targetTask = e.target.closest('.task-item');
                            const taskIds = Array.from(taskList.children).map(item => item.dataset.taskId);
                            vscode.postMessage({
                                command: 'reorderTasksByDragDrop',
                                taskIds: taskIds
                            });
                        }
                    }

                    function handleDragEnd(e) {
                        e.target.style.opacity = '1';
                        draggedElement = null;
                    }

                    // Action functions
                    function createSprint() {
                        vscode.postMessage({ command: 'createSprint' });
                    }

                    function exportSprintData() {
                        vscode.postMessage({ command: 'exportSprintData' });
                    }

                    function showSprintMetrics() {
                        vscode.postMessage({ command: 'showSprintMetrics' });
                    }

                    function validateChat() {
                        vscode.postMessage({ command: 'validateChat' });
                    }

                    function createCursorrule() {
                        vscode.postMessage({ command: 'createCursorrule' });
                    }

                    function validatePlanWithAI() {
                        vscode.postMessage({ command: 'validatePlanWithAI' });
                    }

                    function addTask() {
                        vscode.postMessage({ command: 'addTask' });
                    }

                    function editTask(taskId) {
                        vscode.postMessage({ command: 'editTask', taskId: taskId });
                    }

                    function deleteTask(taskId) {
                        vscode.postMessage({ command: 'deleteTask', taskId: taskId });
                    }

                    function duplicateTask(taskId) {
                        vscode.postMessage({ command: 'duplicateTask', taskId: taskId });
                    }

                    function markTaskComplete(taskId) {
                        vscode.postMessage({ command: 'markTaskComplete', taskId: taskId });
                    }

                    function refreshDashboard() {
                        vscode.postMessage({ command: 'refreshDashboard' });
                    }
                </script>
            </body>
            </html>
        \`;
    }

    // Placeholder methods for task management
    private async createSprint(): Promise<void> {
        // Implementation will be added
    }

    private async exportSprintData(): Promise<void> {
        // Implementation will be added
    }

    private async showSprintMetrics(): Promise<void> {
        // Implementation will be added
    }

    private async createCursorrule(): Promise<void> {
        // Implementation will be added
    }

    private async validatePlanWithAI(): Promise<void> {
        // Implementation will be added
    }

    private async addTask(): Promise<void> {
        // Implementation will be added
    }

    private async editTask(taskId: string): Promise<void> {
        // Implementation will be added
    }

    private async deleteTask(taskId: string): Promise<void> {
        // Implementation will be added
    }

    private async duplicateTask(taskId: string): Promise<void> {
        // Implementation will be added
    }

    private async reorderTasksByDragDrop(taskIds: string[]): Promise<void> {
        // Implementation will be added
    }
`;

// Insert the methods before the closing brace
const newContent = content.slice(0, lastBraceIndex) + methodsToAdd + '\n' + content.slice(lastBraceIndex);

// Write back
fs.writeFileSync('src/commands.ts', newContent, 'utf8');

console.log('Added missing methods!'); 