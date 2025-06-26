const fs = require('fs');

console.log('🧹 Cleaning up legacy UI functionality...');

// Fix 1: Remove all legacy UI references from commands.ts
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Remove UI property and constructor parameter
content = content.replace(
    /private ui: AldenUI;/g,
    ''
);
content = content.replace(
    /ui: AldenUI,/g,
    ''
);

// Remove all this.ui references and replace with appropriate alternatives
content = content.replace(
    /await this\.ui\.showDashboard\(\);/g,
    'await this.showDashboard();'
);

content = content.replace(
    /await this\.ui\.projectPlan\.initialize\(\);/g,
    '// Project plan initialization handled by SprintPlanner'
);

content = content.replace(
    /const currentTask = this\.ui\.projectPlan\.getCurrentTask\(\);/g,
    'const currentTask = this.sprintPlanner.getCurrentSprint()?.tasks.find(t => !t.completed) || null;'
);

content = content.replace(
    /this\.ui\.actionLog\.push\(/g,
    'console.log("Action logged:", '
);

content = content.replace(
    /const customFailsafes = this\.ui\.getUserFailsafes\(\) \|\| \[\];/g,
    'const customFailsafes = []; // Legacy failsafes removed in favor of CursorRules'
);

// Fix constructor to remove UI parameter
content = content.replace(
    /constructor\(\s*projectPlan: ProjectPlan,\s*taskEngine: TaskEngine,\s*ui: AldenUI,\s*logger: Logger\s*\)/g,
    'constructor(projectPlan: ProjectPlan, taskEngine: TaskEngine, logger: Logger)'
);

content = content.replace(
    /this\.ui = ui;/g,
    ''
);

fs.writeFileSync('src/commands.ts', content, 'utf8');
console.log('✅ Removed legacy UI references from commands.ts');

// Fix 2: Add missing showDashboard method to Commands class
content = fs.readFileSync('src/commands.ts', 'utf8');
if (!content.includes('public async showDashboard(): Promise<void>')) {
    content = content.replace(
        '    }\n}',
        `    }

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
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    .logo:hover {
                        transform: scale(1.1);
                    }
                    .title {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 600;
                    }
                    .notification-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                        max-width: 400px;
                    }
                    .notification {
                        padding: 12px 16px;
                        margin-bottom: 10px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transform: translateX(100%);
                        transition: transform 0.3s ease;
                        cursor: pointer;
                    }
                    .notification.show {
                        transform: translateX(0);
                    }
                    .notification.info {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .notification.success {
                        background: #4caf50;
                        color: white;
                    }
                    .notification.warning {
                        background: #ff9800;
                        color: white;
                    }
                    .notification.error {
                        background: #f44336;
                        color: white;
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
                        justify-content: space-between;
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
                    .loading {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="notification-container" id="notificationContainer"></div>
                
                <div class="dashboard">
                    <div class="header">
                        <div class="logo" onclick="handleLogoClick()">🛡️</div>
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
                                <span>\${currentSprint.status}</span>
                            </div>
                            
                            \${sprintMetrics ? \`
                                <div class="metrics">
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.progressPercentage}%</div>
                                        <div class="metric-label">Progress</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.completedTasks}/\${sprintMetrics.totalTasks}</div>
                                        <div class="metric-label">Tasks</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.completedStoryPoints}/\${sprintMetrics.totalStoryPoints}</div>
                                        <div class="metric-label">Story Points</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">\${sprintMetrics.velocity}</div>
                                        <div class="metric-label">Velocity</div>
                                    </div>
                                </div>
                            \` : '<div class="loading">Loading metrics...</div>'}
                            
                            <ul class="task-list" id="taskList">
                                \${currentSprint.tasks.map((task: any, index: number) => \`
                                    <li class="task-item" draggable="true" data-task-id="\${task.id}">
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
                            <div class="loading">No active sprint. Create a new sprint to get started!</div>
                        </div>
                    \`}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    // Notification system
                    function showNotification(type, message) {
                        const container = document.getElementById('notificationContainer');
                        const notification = document.createElement('div');
                        notification.className = \`notification \${type}\`;
                        notification.textContent = message;
                        
                        container.appendChild(notification);
                        
                        // Animate in
                        setTimeout(() => notification.classList.add('show'), 100);
                        
                        // Auto remove after 5 seconds
                        setTimeout(() => {
                            notification.classList.remove('show');
                            setTimeout(() => container.removeChild(notification), 300);
                        }, 5000);
                        
                        // Click to dismiss
                        notification.onclick = () => {
                            notification.classList.remove('show');
                            setTimeout(() => container.removeChild(notification), 300);
                        };
                    }

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'showNotification':
                                showNotification(message.type, message.message);
                                break;
                        }
                    });

                    // Logo click handler
                    function handleLogoClick() {
                        showNotification('info', '🛡️ FailSafe - Your AI Safety Net');
                    }

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

    // Placeholder methods for dashboard actions
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
} 