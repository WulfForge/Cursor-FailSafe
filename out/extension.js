"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.FailSafeExtension = void 0;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const projectPlan_1 = require("./projectPlan");
const taskEngine_1 = require("./taskEngine");
const ui_1 = require("./ui");
const logger_1 = require("./logger");
const validator_1 = require("./validator");
const testRunner_1 = require("./testRunner");
const versionManager_1 = require("./versionManager");
class FailSafeExtension {
    constructor(context) {
        this.context = context;
        this.logger = new logger_1.Logger();
        this.projectPlan = new projectPlan_1.ProjectPlan(this.logger);
        this.taskEngine = new taskEngine_1.TaskEngine(this.projectPlan, this.logger);
        this.ui = new ui_1.UI(this.projectPlan, this.taskEngine, this.logger, context);
        this.validator = new validator_1.Validator(this.logger, this.projectPlan);
        this.testRunner = new testRunner_1.TestRunner();
        this.versionManager = new versionManager_1.VersionManager(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        this.commands = new commands_1.Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);
    }
    async activate() {
        this.logger.info('FailSafe extension activating...');
        // Register commands
        await this.commands.registerCommands(this.context);
        // Register sidebar
        this.ui.registerSidebar(this.context);
        this.ui.refreshSidebar();
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
    async initializeComponents() {
        try {
            await this.projectPlan.initialize();
            await this.taskEngine.initialize();
            await this.ui.initialize();
            await this.versionManager.initialize();
            this.logger.info('All components initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize components:', error);
            throw error;
        }
    }
    setupAutomaticVersionChecking(context) {
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
    async checkVersionConsistency() {
        if (!this.versionManager) {
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }
        const consistency = await this.versionManager.checkVersionConsistency();
        if (consistency.isConsistent) {
            vscode.window.showInformationMessage('✅ Version consistency check passed');
        }
        else {
            vscode.window.showWarningMessage(`❌ Version consistency issues found: ${consistency.issues.length} issues`);
            const action = await vscode.window.showWarningMessage('Version consistency issues detected. Would you like to fix them automatically?', 'Fix Automatically', 'Show Details', 'Ignore');
            if (action === 'Fix Automatically') {
                await this.versionManager.autoFixVersionIssues();
            }
            else if (action === 'Show Details') {
                await this.showVersionDetails();
            }
        }
    }
    async showVersionDetails() {
        if (!this.versionManager) {
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }
        const consistency = await this.versionManager.checkVersionConsistency();
        const panel = vscode.window.createWebviewPanel('versionDetails', 'Version Consistency Details', vscode.ViewColumn.One, {});
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
    async deactivate() {
        this.logger.info('FailSafe extension deactivating...');
        // Cleanup
        this.taskEngine.stop();
        this.ui.dispose();
        this.logger.info('FailSafe extension deactivated');
    }
    // Getters for other components
    getLogger() { return this.logger; }
    getValidator() { return this.validator; }
    getTestRunner() { return this.testRunner; }
    getProjectPlan() { return this.projectPlan; }
    getTaskEngine() { return this.taskEngine; }
    getUI() { return this.ui; }
    getContext() { return this.context; }
}
exports.FailSafeExtension = FailSafeExtension;
function activate(context) {
    const extension = new FailSafeExtension(context);
    return extension.activate();
}
exports.activate = activate;
function deactivate() {
    // This would be called when the extension is deactivated
    return Promise.resolve();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map