const fs = require('fs');

// Read the commands file
let content = fs.readFileSync('src/commands.ts', 'utf8');

// Add static panel reference at the top of the class
content = content.replace(
    'export class Commands {',
    'export class Commands {\n    private static dashboardPanel: vscode.WebviewPanel | undefined;'
);

// Add single instance check at the beginning of showDashboard
content = content.replace(
    'public async showDashboard(): Promise<void> {',
    'public async showDashboard(): Promise<void> {\n        try {\n            // Check if dashboard is already open\n            if (Commands.dashboardPanel) {\n                Commands.dashboardPanel.reveal();\n                return;\n            }\n\n            // Create and show the dashboard panel'
);

// Add panel disposal handler
content = content.replace(
    'const panel = vscode.window.createWebviewPanel(',
    'const panel = vscode.window.createWebviewPanel('
);

// Add panel storage and disposal after panel creation
content = content.replace(
    ');\n\n            // Get current data for the dashboard',
    ');\n\n            // Store the panel reference for single instance enforcement\n            Commands.dashboardPanel = panel;\n\n            // Handle panel disposal\n            panel.onDidDispose(() => {\n                Commands.dashboardPanel = undefined;\n            });\n\n            // Get current data for the dashboard'
);

// Add webview notification method at the end of the class
content = content.replace(
    '    }\n}',
    '    }\n\n    private showWebviewNotification(panel: vscode.WebviewPanel, type: \'info\' | \'warning\' | \'error\' | \'success\', message: string): void {\n        panel.webview.postMessage({\n            command: \'showNotification\',\n            type: type,\n            message: message\n        });\n    }\n}'
);

// Write back
fs.writeFileSync('src/commands.ts', content, 'utf8');

console.log('✅ Added targeted dashboard single instance enforcement!'); 