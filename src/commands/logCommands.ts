import * as vscode from 'vscode';
import { Logger } from '../logger';

export class LogCommands {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * View system logs
     */
    public async viewLogs(): Promise<void> {
        try {
            const logs = await this.getSystemLogs();
            
            const panel = vscode.window.createWebviewPanel(
                'systemLogs',
                'System Logs',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateLogsHTML(logs);

        } catch (error) {
            this.logger.error('Error in viewLogs command', error);
            vscode.window.showErrorMessage('Failed to view logs. Check logs for details.');
        }
    }

    /**
     * Clear logs
     */
    public async clearLogs(): Promise<void> {
        try {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to clear all logs?',
                'Yes',
                'No'
            );

            if (confirm === 'Yes') {
                await this.logger.clearLogs();
                vscode.window.showInformationMessage('✅ Logs cleared successfully!');
            }

        } catch (error) {
            this.logger.error('Error in clearLogs command', error);
            vscode.window.showErrorMessage('Failed to clear logs. Check logs for details.');
        }
    }

    /**
     * Export logs
     */
    public async exportLogs(): Promise<void> {
        try {
            const logs = await this.getSystemLogs();
            const logContent = this.formatLogsForExport(logs);
            
            const panel = vscode.window.createWebviewPanel(
                'exportLogs',
                'Export Logs',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateExportLogsHTML(logContent);

        } catch (error) {
            this.logger.error('Error in exportLogs command', error);
            vscode.window.showErrorMessage('Failed to export logs. Check logs for details.');
        }
    }

    /**
     * Monitor system health
     */
    public async monitorSystemHealth(): Promise<void> {
        try {
            const healthData = await this.getSystemHealthData();
            
            const panel = vscode.window.createWebviewPanel(
                'systemHealth',
                'System Health Monitor',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateSystemHealthHTML(healthData);

        } catch (error) {
            this.logger.error('Error in monitorSystemHealth command', error);
            vscode.window.showErrorMessage('Failed to monitor system health. Check logs for details.');
        }
    }

    /**
     * Debug extension
     */
    public async debugExtension(): Promise<void> {
        try {
            const debugInfo = await this.getDebugInfo();
            
            const panel = vscode.window.createWebviewPanel(
                'debugExtension',
                'Extension Debug Info',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateDebugInfoHTML(debugInfo);

        } catch (error) {
            this.logger.error('Error in debugExtension command', error);
            vscode.window.showErrorMessage('Failed to get debug info. Check logs for details.');
        }
    }

    // Private helper methods
    private async getSystemLogs(): Promise<any[]> {
        // This would get actual logs from the logger
        // For now, return sample data
        return [
            {
                timestamp: new Date(),
                level: 'info',
                message: 'System initialized successfully',
                source: 'extension'
            },
            {
                timestamp: new Date(Date.now() - 60000),
                level: 'info',
                message: 'Dashboard opened',
                source: 'dashboard'
            },
            {
                timestamp: new Date(Date.now() - 120000),
                level: 'warning',
                message: 'Version consistency check found 2 issues',
                source: 'version-manager'
            },
            {
                timestamp: new Date(Date.now() - 180000),
                level: 'error',
                message: 'Failed to load cursor rules',
                source: 'cursorrules-engine'
            }
        ];
    }

    private async getSystemHealthData(): Promise<any> {
        return {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            activeExtensions: vscode.extensions.all.length,
            workspaceFolders: vscode.workspace.workspaceFolders?.length || 0,
            activeEditors: vscode.window.visibleTextEditors.length
        };
    }

    private async getDebugInfo(): Promise<any> {
        return {
            extensionVersion: '2.0.0',
            vscodeVersion: vscode.version,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            workspacePath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'No workspace',
            activeFile: vscode.window.activeTextEditor?.document.fileName || 'No active file'
        };
    }

    private formatLogsForExport(logs: any[]): string {
        return logs.map(log => 
            `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} [${log.source}]: ${log.message}`
        ).join('\n');
    }

    private generateLogsHTML(logs: any[]): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>System Logs</title>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 20px; font-size: 12px; }
                    .log-entry { margin: 2px 0; padding: 2px 5px; }
                    .log-entry.info { background: #e8f5e8; }
                    .log-entry.warning { background: #fff3e0; }
                    .log-entry.error { background: #ffebee; }
                    .log-header { background: #f5f5f5; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
                    .log-table { width: 100%; border-collapse: collapse; }
                    .log-table th, .log-table td { 
                        text-align: left; 
                        padding: 8px; 
                        border-bottom: 1px solid #ddd; 
                    }
                    .log-table th { background: #f2f2f2; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="log-header">
                    <h1>System Logs</h1>
                    <p><strong>Total Entries:</strong> ${logs.length}</p>
                    <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <table class="log-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Level</th>
                            <th>Source</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr class="log-entry ${log.level}">
                                <td>${log.timestamp.toLocaleString()}</td>
                                <td><strong>${log.level.toUpperCase()}</strong></td>
                                <td>${log.source}</td>
                                <td>${log.message}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    }

    private generateExportLogsHTML(logContent: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Export Logs</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .export-content { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; background: white; padding: 10px; border-radius: 4px; }
                    .copy-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin: 10px 0; 
                    }
                </style>
            </head>
            <body>
                <h1>Export Logs</h1>
                <p>Copy the log content below or save it to a file:</p>
                
                <button class="copy-btn" onclick="copyToClipboard()">Copy to Clipboard</button>
                
                <div class="export-content">
                    <pre id="logContent">${logContent}</pre>
                </div>
                
                <script>
                    function copyToClipboard() {
                        const logContent = document.getElementById('logContent').textContent;
                        navigator.clipboard.writeText(logContent).then(() => {
                            alert('Logs copied to clipboard!');
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private generateSystemHealthHTML(healthData: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>System Health Monitor</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .metric h3 { margin-top: 0; }
                    .status-good { border-left: 4px solid #4caf50; }
                    .status-warning { border-left: 4px solid #ff9800; }
                    .status-error { border-left: 4px solid #f44336; }
                </style>
            </head>
            <body>
                <h1>System Health Monitor</h1>
                <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
                
                <div class="metric status-good">
                    <h3>System Uptime</h3>
                    <p><strong>Uptime:</strong> ${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m ${Math.floor(healthData.uptime % 60)}s</p>
                </div>
                
                <div class="metric status-good">
                    <h3>Memory Usage</h3>
                    <p><strong>RSS:</strong> ${Math.round(healthData.memoryUsage.rss / 1024 / 1024)} MB</p>
                    <p><strong>Heap Used:</strong> ${Math.round(healthData.memoryUsage.heapUsed / 1024 / 1024)} MB</p>
                    <p><strong>Heap Total:</strong> ${Math.round(healthData.memoryUsage.heapTotal / 1024 / 1024)} MB</p>
                </div>
                
                <div class="metric status-good">
                    <h3>Extension Status</h3>
                    <p><strong>Active Extensions:</strong> ${healthData.activeExtensions}</p>
                    <p><strong>Workspace Folders:</strong> ${healthData.workspaceFolders}</p>
                    <p><strong>Active Editors:</strong> ${healthData.activeEditors}</p>
                </div>
                
                <div class="metric status-good">
                    <h3>CPU Usage</h3>
                    <p><strong>User CPU:</strong> ${Math.round(healthData.cpuUsage.user / 1000)} ms</p>
                    <p><strong>System CPU:</strong> ${Math.round(healthData.cpuUsage.system / 1000)} ms</p>
                </div>
            </body>
            </html>
        `;
    }

    private generateDebugInfoHTML(debugInfo: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Extension Debug Info</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .info-section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .info-section h3 { margin-top: 0; }
                    .copy-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin: 10px 0; 
                    }
                </style>
            </head>
            <body>
                <h1>Extension Debug Info</h1>
                <p>Use this information when reporting issues or debugging problems.</p>
                
                <button class="copy-btn" onclick="copyDebugInfo()">Copy Debug Info</button>
                
                <div class="info-section">
                    <h3>Extension Information</h3>
                    <p><strong>Extension Version:</strong> ${debugInfo.extensionVersion}</p>
                    <p><strong>VS Code Version:</strong> ${debugInfo.vscodeVersion}</p>
                </div>
                
                <div class="info-section">
                    <h3>System Information</h3>
                    <p><strong>Platform:</strong> ${debugInfo.platform}</p>
                    <p><strong>Architecture:</strong> ${debugInfo.arch}</p>
                    <p><strong>Node.js Version:</strong> ${debugInfo.nodeVersion}</p>
                </div>
                
                <div class="info-section">
                    <h3>Workspace Information</h3>
                    <p><strong>Workspace Path:</strong> ${debugInfo.workspacePath}</p>
                    <p><strong>Active File:</strong> ${debugInfo.activeFile}</p>
                </div>
                
                <script>
                    function copyDebugInfo() {
                        const debugText = \`
Extension Debug Info
====================

Extension Information:
- Extension Version: ${debugInfo.extensionVersion}
- VS Code Version: ${debugInfo.vscodeVersion}

System Information:
- Platform: ${debugInfo.platform}
- Architecture: ${debugInfo.arch}
- Node.js Version: ${debugInfo.nodeVersion}

Workspace Information:
- Workspace Path: ${debugInfo.workspacePath}
- Active File: ${debugInfo.activeFile}
                        \`;
                        
                        navigator.clipboard.writeText(debugText).then(() => {
                            alert('Debug info copied to clipboard!');
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
} 