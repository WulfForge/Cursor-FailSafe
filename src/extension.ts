import * as vscode from 'vscode';
import { Commands } from './commands';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import { UI } from './ui';
import { Logger } from './logger';
import { Validator } from './validator';
import { TestRunner } from './testRunner';
import { VersionManager } from './versionManager';

export class FailSafeExtension {
    private commands: Commands;
    private projectPlan: ProjectPlan;
    private taskEngine: TaskEngine;
    private ui: UI;
    private logger: Logger;
    private validator: Validator;
    private testRunner: TestRunner;
    private versionManager: VersionManager;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = new Logger();
        this.projectPlan = new ProjectPlan(this.logger);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger);
        this.ui = new UI(this.projectPlan, this.taskEngine, this.logger, context);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.testRunner = new TestRunner();
        this.versionManager = new VersionManager(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        this.commands = new Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);
    }

    public async activate(): Promise<void> {
        this.logger.info('FailSafe extension activating...');
        
        // Register commands
        await this.commands.registerCommands(this.context);
        
        // Register sidebar
        this.ui.registerSidebar(this.context);
        
        // Register simulation command
        this.ui.registerSimulationCommand(this.context);
        
        // Register plan validation command
        this.ui.registerPlanValidationCommand(this.context);
        
        // Register failsafe configuration command
        this.ui.registerFailsafeConfigCommand(this.context);
        
        // Initialize components
        await this.initializeComponents();
        
        // Set up automatic version checking
        this.setupAutomaticVersionChecking(this.context);
        
        this.logger.info('FailSafe extension activated successfully');
    }

    private async initializeComponents(): Promise<void> {
        try {
            await this.projectPlan.initialize();
            await this.taskEngine.initialize();
            await this.ui.initialize();
            await this.versionManager.initialize();
            
            this.logger.info('All components initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize components:', error);
            throw error;
        }
    }

    private setupAutomaticVersionChecking(context: vscode.ExtensionContext): void {
        // Check version consistency on activation
        setTimeout(async () => {
            await this.checkVersionConsistency();
        }, 2000); // Delay to allow extension to fully initialize

        // Set up file watchers for key files
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/{package.json,CHANGELOG.md,README.md}');
        
        fileWatcher.onDidChange(async () => {
            // Debounce the check to avoid too frequent checks
            setTimeout(async () => {
                await this.checkVersionConsistency();
            }, 1000);
        });

        context.subscriptions.push(fileWatcher);
    }

    private async checkVersionConsistency(): Promise<void> {
        if (!this.versionManager) {
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }

        const consistency = await this.versionManager.checkVersionConsistency();
        
        if (consistency.isConsistent) {
            vscode.window.showInformationMessage('✅ Version consistency check passed');
        } else {
            vscode.window.showWarningMessage(`❌ Version consistency issues found: ${consistency.issues.length} issues`);
            
            const action = await vscode.window.showWarningMessage(
                'Version consistency issues detected. Would you like to fix them automatically?',
                'Fix Automatically',
                'Show Details',
                'Ignore'
            );

            if (action === 'Fix Automatically') {
                await this.versionManager.autoFixVersionIssues();
            } else if (action === 'Show Details') {
                await this.showVersionDetails();
            }
        }
    }

    private async showVersionDetails(): Promise<void> {
        if (!this.versionManager) {
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }

        const consistency = await this.versionManager.checkVersionConsistency();
        
        const panel = vscode.window.createWebviewPanel(
            'versionDetails',
            'Version Consistency Details',
            vscode.ViewColumn.One,
            {}
        );

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        padding: 20px; 
                        background: #f5f5f5;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .issue { 
                        color: #d32f2f; 
                        margin: 10px 0; 
                        padding: 10px;
                        background: #ffebee;
                        border-left: 4px solid #d32f2f;
                        border-radius: 4px;
                    }
                    .recommendation { 
                        color: #1976d2; 
                        margin: 10px 0; 
                        padding: 10px;
                        background: #e3f2fd;
                        border-left: 4px solid #1976d2;
                        border-radius: 4px;
                    }
                    .status { 
                        font-weight: bold; 
                        margin: 20px 0; 
                        padding: 15px;
                        border-radius: 4px;
                    }
                    .status.success {
                        background: #e8f5e8;
                        color: #2e7d32;
                        border-left: 4px solid #2e7d32;
                    }
                    .status.error {
                        background: #ffebee;
                        color: #d32f2f;
                        border-left: 4px solid #d32f2f;
                    }
                    h2 { color: #333; }
                    h3 { color: #555; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>🔍 Version Consistency Report</h2>
                    <div class="status ${consistency.isConsistent ? 'success' : 'error'}">
                        Status: ${consistency.isConsistent ? '✅ All versions are consistent' : '❌ Version inconsistencies detected'}
                    </div>
                    
                    ${consistency.issues.length > 0 ? `
                        <h3>🚨 Issues Found:</h3>
                        ${consistency.issues.map(issue => `<div class="issue">• ${issue}</div>`).join('')}
                    ` : ''}
                    
                    ${consistency.recommendations.length > 0 ? `
                        <h3>💡 Recommendations:</h3>
                        ${consistency.recommendations.map(rec => `<div class="recommendation">• ${rec}</div>`).join('')}
                    ` : ''}
                    
                    <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 4px;">
                        <h3>📋 Auto-Versioning Status</h3>
                        <p>FailSafe includes automatic version checking to prevent version inconsistencies. 
                        The system monitors package.json, CHANGELOG.md, README.md, and badge URLs to ensure all versions match.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        panel.webview.html = content;
    }

    public async deactivate(): Promise<void> {
        this.logger.info('FailSafe extension deactivating...');
        
        // Cleanup
        this.taskEngine.stop();
        this.ui.dispose();
        
        this.logger.info('FailSafe extension deactivated');
    }

    // Getters for other components
    public getLogger(): Logger { return this.logger; }
    public getValidator(): Validator { return this.validator; }
    public getTestRunner(): TestRunner { return this.testRunner; }
    public getProjectPlan(): ProjectPlan { return this.projectPlan; }
    public getTaskEngine(): TaskEngine { return this.taskEngine; }
    public getUI(): UI { return this.ui; }
    public getContext(): vscode.ExtensionContext { return this.context; }
}

export function activate(context: vscode.ExtensionContext): Promise<void> {
    const extension = new FailSafeExtension(context);
    return extension.activate();
}

export function deactivate(): Promise<void> {
    // This would be called when the extension is deactivated
    return Promise.resolve();
} 