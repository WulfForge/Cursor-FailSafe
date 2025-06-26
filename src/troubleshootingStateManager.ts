import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import * as child_process from 'child_process';
import { promisify } from 'util';
import { Commands } from './commands';

export interface TroubleshootingAttempt {
    id: string;
    issue: string;
    attemptNumber: number;
    timestamp: Date;
    description: string;
    changes: FileChange[];
    status: 'pending' | 'success' | 'failed' | 'reverted';
    restorePoint?: RestorePoint;
}

export interface FileChange {
    filePath: string;
    originalContent: string;
    newContent: string;
    changeType: 'modified' | 'created' | 'deleted';
    timestamp: Date;
}

export interface RestorePoint {
    id: string;
    timestamp: Date;
    description: string;
    files: FileChange[];
    gitCommit?: string;
    workspaceState: WorkspaceState;
}

export interface WorkspaceState {
    openFiles: string[];
    activeEditor?: string;
    gitStatus?: string;
    extensionSettings: { [key: string]: any };
}

export class TroubleshootingStateManager {
    private readonly logger: Logger;
    private readonly storagePath: string;
    private attempts: Map<string, TroubleshootingAttempt[]> = new Map();
    private restorePoints: Map<string, RestorePoint> = new Map();
    private readonly maxAttemptsBeforeRestorePoint = 3;
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, logger: Logger) {
        this.context = context;
        this.logger = logger;
        this.storagePath = path.join(context.globalStorageUri.fsPath, 'troubleshooting');
        this.ensureStorageDirectory();
        this.loadState();
    }

    /**
     * Start tracking a new troubleshooting session
     */
    public startTroubleshooting(issue: string, description: string): string {
        const issueId = this.generateIssueId(issue);
        const attemptId = this.generateAttemptId();
        
        const attempt: TroubleshootingAttempt = {
            id: attemptId,
            issue,
            attemptNumber: this.getAttemptCount(issueId) + 1,
            timestamp: new Date(),
            description,
            changes: [],
            status: 'pending'
        };

        // Add to attempts
        if (!this.attempts.has(issueId)) {
            this.attempts.set(issueId, []);
        }
        const issueAttempts = this.attempts.get(issueId);
        if (issueAttempts) {
            issueAttempts.push(attempt);
        }

        // Check if we need to create a restore point
        if (attempt.attemptNumber === this.maxAttemptsBeforeRestorePoint) {
            this.createRestorePoint(issueId, attempt);
        }

        this.saveState();
        this.logger.info(`Started troubleshooting attempt ${attempt.attemptNumber} for issue: ${issue}`);
        
        return attemptId;
    }

    /**
     * Record a file change during troubleshooting
     */
    public recordFileChange(attemptId: string, filePath: string, originalContent: string, newContent: string, changeType: 'modified' | 'created' | 'deleted'): void {
        const attempt = this.findAttempt(attemptId);
        if (!attempt) {
            this.logger.warn(`Attempt ${attemptId} not found for file change recording`);
            return;
        }

        const fileChange: FileChange = {
            filePath,
            originalContent,
            newContent,
            changeType,
            timestamp: new Date()
        };

        attempt.changes.push(fileChange);
        this.saveState();
        
        this.logger.info(`Recorded file change for attempt ${attemptId}: ${changeType} ${filePath}`);
    }

    /**
     * Mark an attempt as completed
     */
    public completeAttempt(attemptId: string, status: 'success' | 'failed'): void {
        const attempt = this.findAttempt(attemptId);
        if (!attempt) {
            this.logger.warn(`Attempt ${attemptId} not found for completion`);
            return;
        }

        attempt.status = status;
        this.saveState();
        
        this.logger.info(`Completed troubleshooting attempt ${attemptId} with status: ${status}`);
    }

    /**
     * Create a restore point when multiple attempts are made
     */
    private async createRestorePoint(issueId: string, attempt: TroubleshootingAttempt): Promise<void> {
        try {
            const restorePointId = this.generateRestorePointId();
            
            // Capture current workspace state
            const workspaceState = await this.captureWorkspaceState();
            
            // Capture all file changes from previous attempts
            const allChanges: FileChange[] = [];
            const issueAttempts = this.attempts.get(issueId) || [];
            
            for (const prevAttempt of issueAttempts) {
                allChanges.push(...prevAttempt.changes);
            }

            // Try to get current git commit
            const gitCommit = await this.getCurrentGitCommit();

            const restorePoint: RestorePoint = {
                id: restorePointId,
                timestamp: new Date(),
                description: `Restore point before troubleshooting attempt ${attempt.attemptNumber} for: ${attempt.issue}`,
                files: allChanges,
                gitCommit,
                workspaceState
            };

            this.restorePoints.set(restorePointId, restorePoint);
            attempt.restorePoint = restorePoint;
            
            this.saveState();
            
            // Show notification to user
            vscode.window.showInformationMessage(
                `🛡️ Restore point created! This is attempt #${attempt.attemptNumber} for this issue. You can restore to this state if needed.`,
                'View Restore Points',
                'Dismiss'
            ).then(selection => {
                if (selection === 'View Restore Points') {
                    this.showRestorePoints();
                }
            });

            this.logger.info(`Created restore point ${restorePointId} for issue ${issueId}`);
            
        } catch (error) {
            this.logger.error('Failed to create restore point', error);
        }
    }

    /**
     * Capture current workspace state
     */
    private async captureWorkspaceState(): Promise<WorkspaceState> {
        const openFiles = vscode.workspace.textDocuments.map(doc => doc.fileName);
        const activeEditor = vscode.window.activeTextEditor?.document.fileName;
        
        // Capture extension settings
        const extensionSettings: { [key: string]: any } = {};
        const failsafeConfig = vscode.workspace.getConfiguration('failsafe');
        for (const key of failsafeConfig.keys()) {
            extensionSettings[key] = failsafeConfig.get(key);
        }

        return {
            openFiles,
            activeEditor,
            extensionSettings
        };
    }

    /**
     * Get current git commit hash
     */
    private async getCurrentGitCommit(): Promise<string | undefined> {
        try {
            const execAsync = promisify(child_process.exec);
            
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath });
            return stdout.trim();
        } catch (error) {
            this.logger.warn('Could not get git commit hash', error);
            return undefined;
        }
    }

    /**
     * Show restore points in a webview
     */
    public async showRestorePoints(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'restorePoints',
            'FailSafe - Restore Points',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const html = await new Commands(this.context).applyCursorRulesToHtml(this.generateRestorePointsHTML());
        panel.webview.html = html;

        // Handle restore point actions
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'restore':
                        this.restoreToPoint(message.restorePointId);
                        break;
                    case 'delete':
                        this.deleteRestorePoint(message.restorePointId);
                        break;
                }
            }
        );
    }

    /**
     * Generate HTML for restore points display
     */
    private generateRestorePointsHTML(): string {
        const restorePoints = Array.from(this.restorePoints.values());
        const timestamp = new Date().toLocaleString();

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FailSafe - Restore Points</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #e8e8e8;
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    overflow: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    padding: 30px;
                    text-align: center;
                }
                
                .header h1 {
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: white;
                }
                
                .header .subtitle {
                    font-size: 16px;
                    opacity: 0.9;
                    color: rgba(255, 255, 255, 0.9);
                }
                
                .content {
                    padding: 30px;
                }
                
                .intro {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    border-left: 4px solid #ff6b6b;
                }
                
                .intro h2 {
                    font-size: 20px;
                    margin-bottom: 15px;
                    color: #ff6b6b;
                }
                
                .intro p {
                    line-height: 1.6;
                    margin-bottom: 10px;
                }
                
                .restore-points-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .restore-point-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .restore-point-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                }
                
                .restore-point-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .restore-point-icon {
                    font-size: 24px;
                    margin-right: 15px;
                }
                
                .restore-point-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #e8e8e8;
                }
                
                .restore-point-description {
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 15px;
                    opacity: 0.9;
                }
                
                .restore-point-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    opacity: 0.7;
                    margin-bottom: 15px;
                }
                
                .restore-point-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .btn-restore {
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    color: white;
                }
                
                .btn-restore:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
                }
                
                .btn-delete {
                    background: rgba(255, 255, 255, 0.2);
                    color: #e8e8e8;
                }
                
                .btn-delete:hover {
                    background: rgba(239, 68, 68, 0.8);
                    color: white;
                }
                
                .footer {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    opacity: 0.7;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                @media (max-width: 768px) {
                    .container { margin: 10px; }
                    .content { padding: 20px; }
                    .restore-points-grid { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🛡️ Restore Points</h1>
                    <div class="subtitle">Safety checkpoints created during troubleshooting</div>
                </div>
                
                <div class="content">
                    <div class="intro">
                        <h2>Safety First! 🚀</h2>
                        <p>These restore points were automatically created when multiple troubleshooting attempts were made on the same issue.</p>
                        <p>You can restore to any of these points if the troubleshooting made things worse.</p>
                    </div>
                    
                    ${restorePoints.length === 0 ? `
                        <div style="text-align: center; padding: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 12px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                            <h3>No Restore Points Needed!</h3>
                            <p>Great job! No issues have required multiple troubleshooting attempts yet.</p>
                        </div>
                    ` : `
                        <div class="restore-points-grid">
                            ${restorePoints.map(point => `
                                <div class="restore-point-card">
                                    <div class="restore-point-header">
                                        <div class="restore-point-icon">🛡️</div>
                                        <div class="restore-point-title">Restore Point</div>
                                    </div>
                                    <div class="restore-point-description">${point.description}</div>
                                    <div class="restore-point-meta">
                                        <span>${point.timestamp.toLocaleString()}</span>
                                        <span>${point.files.length} files</span>
                                    </div>
                                    <div class="restore-point-actions">
                                        <button class="btn btn-restore" onclick="restorePoint('${point.id}')">
                                            🔄 Restore
                                        </button>
                                        <button class="btn btn-delete" onclick="deletePoint('${point.id}')">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <div class="footer">
                    <p>FailSafe Restore Points • ${timestamp}</p>
                    <p>Automatically created when multiple troubleshooting attempts are made</p>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function restorePoint(restorePointId) {
                    vscode.postMessage({
                        command: 'restore',
                        restorePointId: restorePointId
                    });
                }
                
                function deletePoint(restorePointId) {
                    if (confirm('Are you sure you want to delete this restore point?')) {
                        vscode.postMessage({
                            command: 'delete',
                            restorePointId: restorePointId
                        });
                    }
                }
            </script>
        </body>
        </html>
        `;
    }

    /**
     * Restore to a specific restore point
     */
    public async restoreToPoint(restorePointId: string): Promise<void> {
        const restorePoint = this.restorePoints.get(restorePointId);
        if (!restorePoint) {
            vscode.window.showErrorMessage('Restore point not found');
            return;
        }

        try {
            // Confirm with user
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to restore to this point? This will revert ${restorePoint.files.length} files.`,
                'Yes, Restore',
                'Cancel'
            );

            if (confirm !== 'Yes, Restore') {
                return;
            }

            // Restore files
            for (const fileChange of restorePoint.files) {
                await this.restoreFile(fileChange);
            }

            // Restore workspace state
            await this.restoreWorkspaceState(restorePoint.workspaceState);

            vscode.window.showInformationMessage(
                `✅ Successfully restored to checkpoint from ${restorePoint.timestamp.toLocaleString()}`
            );

            this.logger.info(`Restored to point ${restorePointId}`);

        } catch (error) {
            this.logger.error('Failed to restore to point', error);
            vscode.window.showErrorMessage('Failed to restore to checkpoint. Check logs for details.');
        }
    }

    /**
     * Restore a single file
     */
    private async restoreFile(fileChange: FileChange): Promise<void> {
        try {
            if (fileChange.changeType === 'deleted') {
                // File was deleted, recreate it
                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(fileChange.filePath),
                    Buffer.from(fileChange.originalContent, 'utf8')
                );
            } else if (fileChange.changeType === 'created') {
                // File was created, delete it
                await vscode.workspace.fs.delete(vscode.Uri.file(fileChange.filePath));
            } else {
                // File was modified, restore original content
                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(fileChange.filePath),
                    Buffer.from(fileChange.originalContent, 'utf8')
                );
            }
        } catch (error) {
            this.logger.error(`Failed to restore file ${fileChange.filePath}`, error);
        }
    }

    /**
     * Restore workspace state
     */
    private async restoreWorkspaceState(state: WorkspaceState): Promise<void> {
        try {
            // Restore extension settings
            const failsafeConfig = vscode.workspace.getConfiguration('failsafe');
            for (const [key, value] of Object.entries(state.extensionSettings)) {
                await failsafeConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
            }

            // Open files that were open
            for (const filePath of state.openFiles) {
                try {
                    const document = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(document);
                } catch (error) {
                    // File might not exist anymore, skip
                }
            }

            // Restore active editor
            if (state.activeEditor) {
                try {
                    const document = await vscode.workspace.openTextDocument(state.activeEditor);
                    await vscode.window.showTextDocument(document);
                } catch (error) {
                    // File might not exist anymore, skip
                }
            }
        } catch (error) {
            this.logger.error('Failed to restore workspace state', error);
        }
    }

    /**
     * Delete a restore point
     */
    public deleteRestorePoint(restorePointId: string): void {
        this.restorePoints.delete(restorePointId);
        this.saveState();
        
        vscode.window.showInformationMessage('Restore point deleted');
        this.logger.info(`Deleted restore point ${restorePointId}`);
    }

    /**
     * Get attempt count for an issue
     */
    private getAttemptCount(issueId: string): number {
        return this.attempts.get(issueId)?.length || 0;
    }

    /**
     * Find an attempt by ID
     */
    private findAttempt(attemptId: string): TroubleshootingAttempt | undefined {
        for (const attempts of this.attempts.values()) {
            const attempt = attempts.find(a => a.id === attemptId);
            if (attempt) return attempt;
        }
        return undefined;
    }

    /**
     * Generate unique IDs
     */
    private generateIssueId(issue: string): string {
        return `issue_${Buffer.from(issue).toString('base64').substring(0, 8)}_${Date.now()}`;
    }

    private generateAttemptId(): string {
        return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateRestorePointId(): string {
        return `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Storage management
     */
    private ensureStorageDirectory(): void {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    private saveState(): void {
        try {
            const state = {
                attempts: Array.from(this.attempts.entries()),
                restorePoints: Array.from(this.restorePoints.entries())
            };
            
            fs.writeFileSync(
                path.join(this.storagePath, 'state.json'),
                JSON.stringify(state, null, 2)
            );
        } catch (error) {
            this.logger.error('Failed to save troubleshooting state', error);
        }
    }

    private loadState(): void {
        try {
            const statePath = path.join(this.storagePath, 'state.json');
            if (fs.existsSync(statePath)) {
                const data = fs.readFileSync(statePath, 'utf8');
                const state = JSON.parse(data);
                
                // Restore attempts
                this.attempts = new Map(state.attempts);
                
                // Restore restore points
                this.restorePoints = new Map(state.restorePoints);
                
                this.logger.info(`Loaded ${this.attempts.size} issue attempts and ${this.restorePoints.size} restore points`);
            }
        } catch (error) {
            this.logger.error('Failed to load troubleshooting state', error);
        }
    }

    /**
     * Get troubleshooting statistics
     */
    public getStats(): { totalIssues: number; totalAttempts: number; totalRestorePoints: number; recentActivity: TroubleshootingAttempt[] } {
        const totalIssues = this.attempts.size;
        const totalAttempts = Array.from(this.attempts.values()).reduce((sum, attempts) => sum + attempts.length, 0);
        const totalRestorePoints = this.restorePoints.size;
        
        // Get recent activity (last 10 attempts)
        const allAttempts = Array.from(this.attempts.values()).flat();
        const recentActivity = allAttempts
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

        return {
            totalIssues,
            totalAttempts,
            totalRestorePoints,
            recentActivity
        };
    }
} 
