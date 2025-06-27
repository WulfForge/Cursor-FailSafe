/// <reference types="vscode" />
import * as vscode from 'vscode';
import { UI } from './ui';

export class FailSafeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}

export class FailSafeDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'failsafe-dashboard';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('[preview] html sent');
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'executeCommand':
                        try {
                            await vscode.commands.executeCommand(message.value);
                        } catch (error) {
                            console.error('Failed to execute command:', error);
                        }
                        break;
                    default:
                        console.warn('Unknown message command:', message.command);
                }
            }
        );
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FailSafe Dashboard</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
        }
        .dashboard-container {
            max-width: 100%;
        }
        .dashboard-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .dashboard-title {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }
        .dashboard-subtitle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 4px 0 0 0;
        }
        .quick-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 20px;
        }
        .action-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            transition: background-color 0.2s;
        }
        .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .status-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
        }
        .status-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            font-size: 12px;
        }
        .status-value {
            font-weight: bold;
        }
        .status-good {
            color: var(--vscode-testing-iconPassed);
        }
        .status-warning {
            color: var(--vscode-testing-iconFailed);
        }
        .recent-activity {
            margin-top: 16px;
        }
        .activity-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
        }
        .activity-item {
            font-size: 12px;
            margin-bottom: 4px;
            padding: 4px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .activity-time {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="dashboard-header">
            <div>
                <h1 class="dashboard-title">🚀 FailSafe Dashboard</h1>
                <p class="dashboard-subtitle">AI Safety & Validation System</p>
            </div>
        </div>

        <div class="quick-actions">
            <button class="action-button" onclick="executeCommand('failsafe.validateChat')">
                🔍 Validate Chat
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.validateChatMinimal')">
                🔍 Quick Validate
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.createCursorrule')">
                📝 Create Rule
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.createSprint')">
                📅 Create Sprint
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.startSprint')">
                ▶️ Start Sprint
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.addTaskToSprint')">
                ➕ Add Task
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.evaluateTechDebt')">
                🔧 Tech Debt
            </button>
            <button class="action-button" onclick="executeCommand('failsafe.checkVersionConsistency')">
                🔍 Check Version
            </button>
        </div>

        <div class="status-section">
            <h3 class="status-title">System Status</h3>
            <div class="status-item">
                <span>Extension Status:</span>
                <span class="status-value status-good">Active</span>
            </div>
            <div class="status-item">
                <span>Validation Engine:</span>
                <span class="status-value status-good">Ready</span>
            </div>
            <div class="status-item">
                <span>Fastify Server:</span>
                <span class="status-value status-good">Running</span>
            </div>
            <div class="status-item">
                <span>Last Check:</span>
                <span class="status-value">${new Date().toLocaleTimeString()}</span>
            </div>
        </div>

        <div class="recent-activity">
            <h3 class="activity-title">Recent Activity</h3>
            <div class="activity-item">
                <div>Dashboard loaded successfully</div>
                <div class="activity-time">${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="activity-item">
                <div>FailSafe extension activated</div>
                <div class="activity-time">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeCommand(command) {
            vscode.postMessage({
                command: 'executeCommand',
                value: command
            });
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateStatus':
                    // Update status information
                    break;
                case 'updateActivity':
                    // Update activity feed
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

export class FailSafeSidebarProvider implements vscode.TreeDataProvider<FailSafeTreeItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<FailSafeTreeItem | undefined | null | void> = new vscode.EventEmitter<FailSafeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FailSafeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FailSafeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FailSafeTreeItem): vscode.ProviderResult<FailSafeTreeItem[]> {
        try {
            if (element) {
                return Promise.resolve([]);
            } else {
                return Promise.resolve([
                    new FailSafeTreeItem(
                        '🚀 Open Dashboard',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.openDashboard',
                            title: 'Open FailSafe Dashboard',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔍 Validate Chat',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.validateChat',
                            title: 'Validate Chat Content',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📝 Create Cursor Rule',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.createCursorrule',
                            title: 'Create Cursor Rule',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📅 Create Sprint',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.createSprint',
                            title: 'Create Sprint',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '▶️ Start Sprint',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.startSprint',
                            title: 'Start Sprint',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '✅ Complete Sprint',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.completeSprint',
                            title: 'Complete Sprint',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '➕ Add Task to Sprint',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.addTaskToSprint',
                            title: 'Add Task to Sprint',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔒 Manage Cursor Rules',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.manageCursorrules',
                            title: 'Manage Cursor Rules',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📊 Sprint Metrics',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.showSprintMetrics',
                            title: 'Show Sprint Metrics',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔍 Check Version',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.checkVersionConsistency',
                            title: 'Check Version Consistency',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🚀 Auto Bump Version',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.autoBumpVersion',
                            title: 'Auto Bump Version',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📋 Version Log',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.viewVersionLog',
                            title: 'View Version Log',
                            arguments: []
                        }
                    )
                ]);
            }
        } catch (error) {
            console.error('Error in sidebar provider getChildren:', error);
            return Promise.resolve([
                new FailSafeTreeItem(
                    '❌ Error Loading Items',
                    vscode.TreeItemCollapsibleState.None
                )
            ]);
        }
    }
}

interface FailSafeTreeItemData {
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
    command?: vscode.Command;
    children?: FailSafeTreeItemData[];
} 