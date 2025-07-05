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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleCommands = void 0;
const vscode = __importStar(require("vscode"));
const aiResponseValidator_1 = require("../aiResponseValidator");
class ConsoleCommands {
    constructor(logger, validator, testRunner, versionManager, cursorrulesEngine, extensionContext) {
        this.logger = logger;
        this.validator = validator;
        this.testRunner = testRunner;
        this.versionManager = versionManager;
        this.cursorrulesEngine = cursorrulesEngine;
        this.extensionContext = extensionContext;
    }
    /**
     * Validate chat content for hallucinations and inconsistencies
     */
    async validateChat() {
        try {
            let content = '';
            let fileName = '';
            let source = '';
            // Try to get content from active editor first
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                content = editor.document.getText();
                fileName = editor.document.fileName;
                source = `Active editor: ${fileName}`;
            }
            // If no active editor or no content, try clipboard
            if (!content.trim()) {
                try {
                    content = await vscode.env.clipboard.readText();
                    if (content.trim()) {
                        source = 'Clipboard content';
                        fileName = 'clipboard.txt';
                    }
                }
                catch (clipboardError) {
                    this.logger.debug('Could not read from clipboard', clipboardError);
                }
            }
            // If still no content, prompt user to paste content
            if (!content.trim()) {
                const userInput = await vscode.window.showInputBox({
                    prompt: 'Paste the chat content you want to validate:',
                    placeHolder: 'Enter or paste chat content here...',
                    validateInput: (input) => {
                        if (!input.trim()) {
                            return 'Please enter some content to validate';
                        }
                        return null;
                    }
                });
                if (userInput) {
                    content = userInput;
                    source = 'User input';
                    fileName = 'user-input.txt';
                }
                else {
                    vscode.window.showInformationMessage('Chat validation cancelled');
                    return;
                }
            }
            this.logger.info(`Starting chat validation from ${source}...`);
            // Create AI response validator
            const aiResponseValidator = new aiResponseValidator_1.AIResponseValidator(this.extensionContext, this.logger);
            // Validate the content
            const validationResult = await aiResponseValidator.validateAIResponse(content, fileName);
            if (validationResult.isValid) {
                vscode.window.showInformationMessage('✅ Chat validation passed!');
            }
            else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                vscode.window.showWarningMessage(`⚠️ Chat validation found ${errorCount} errors and ${warningCount} warnings`);
                // Show detailed results
                await this.showChatValidationResults(validationResult);
            }
        }
        catch (error) {
            this.logger.error('Error in validateChat command', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }
    /**
     * Check version consistency across all files
     */
    async checkVersionConsistency() {
        try {
            const inconsistencies = await this.versionManager.checkVersionConsistency();
            if (inconsistencies.issues.length === 0) {
                vscode.window.showInformationMessage('✅ Version consistency check passed! All files have consistent versions.');
            }
            else {
                vscode.window.showWarningMessage(`⚠️ Found ${inconsistencies.issues.length} version inconsistencies`);
                // Show detailed results
                await this.showVersionInconsistencies(inconsistencies.issues);
            }
        }
        catch (error) {
            this.logger.error('Error in checkVersionConsistency command', error);
            vscode.window.showErrorMessage('Failed to check version consistency. Check logs for details.');
        }
    }
    /**
     * Show detailed version information
     */
    async showVersionDetails() {
        try {
            const versionInfo = await this.versionManager.getVersionDetails();
            const panel = vscode.window.createWebviewPanel('versionDetails', 'Version Details', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateVersionDetailsHTML(versionInfo);
        }
        catch (error) {
            this.logger.error('Error in showVersionDetails command', error);
            vscode.window.showErrorMessage('Failed to show version details. Check logs for details.');
        }
    }
    /**
     * Run full verification pipeline
     */
    async enforceFullVerification() {
        try {
            const progressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: "Running Full Verification Pipeline",
                cancellable: false
            };
            await vscode.window.withProgress(progressOptions, async (progress) => {
                // Step 1: Compilation
                progress.report({ message: 'Compiling TypeScript...', increment: 10 });
                await this.runCommand('npm run compile');
                // Step 2: Linting
                progress.report({ message: 'Running linting...', increment: 20 });
                await this.runCommand('npm run lint');
                // Step 3: Icon Check
                progress.report({ message: 'Checking icon...', increment: 30 });
                await this.runCommand('npm run prepackage');
                // Step 4: Tests
                progress.report({ message: 'Running tests...', increment: 40 });
                await this.runCommand('npm run test');
                // Step 5: Spec Gate
                progress.report({ message: 'Running spec gate...', increment: 50 });
                await this.runCommand('npm run spec-gate');
                // Step 6: Package
                progress.report({ message: 'Creating package...', increment: 60 });
                await this.runCommand('npm run package');
                progress.report({ message: 'Verification complete!', increment: 100 });
            });
            vscode.window.showInformationMessage('✅ Full verification pipeline completed successfully!');
        }
        catch (error) {
            this.logger.error('Error in enforceFullVerification command', error);
            vscode.window.showErrorMessage('Failed to run full verification pipeline. Check logs for details.');
        }
    }
    /**
     * Evaluate technical debt
     */
    async evaluateTechDebt() {
        try {
            const techDebtReport = await this.generateTechDebtReport();
            const panel = vscode.window.createWebviewPanel('techDebtReport', 'Technical Debt Report', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateTechDebtHTML(techDebtReport);
        }
        catch (error) {
            this.logger.error('Error in evaluateTechDebt command', error);
            vscode.window.showErrorMessage('Failed to evaluate technical debt. Check logs for details.');
        }
    }
    // Private helper methods
    async showChatValidationResults(validationResult) {
        const panel = vscode.window.createWebviewPanel('chatValidationResults', 'Chat Validation Results', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = this.generateChatValidationHTML(validationResult);
    }
    async showVersionInconsistencies(inconsistencies) {
        const panel = vscode.window.createWebviewPanel('versionInconsistencies', 'Version Inconsistencies', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = this.generateVersionInconsistenciesHTML(inconsistencies);
    }
    async runCommand(command) {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                this.logger.warn(`Command stderr: ${stderr}`);
            }
            this.logger.info(`Command executed: ${command}`);
        }
        catch (error) {
            this.logger.error(`Command failed: ${command}`, error);
            throw error;
        }
    }
    async generateTechDebtReport() {
        // Implementation for generating tech debt report
        return {
            totalIssues: 0,
            criticalIssues: 0,
            warnings: 0,
            suggestions: []
        };
    }
    generateChatValidationHTML(validationResult) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Chat Validation Results</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .error { color: #d32f2f; background: #ffebee; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .warning { color: #f57c00; background: #fff3e0; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .success { color: #388e3c; background: #e8f5e8; padding: 10px; margin: 5px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Chat Validation Results</h1>
                <div class="${validationResult.isValid ? 'success' : 'error'}">
                    <h2>${validationResult.isValid ? '✅ Validation Passed' : '❌ Validation Failed'}</h2>
                </div>
                
                ${validationResult.errors.length > 0 ? `
                    <h3>Errors (${validationResult.errors.length})</h3>
                    ${validationResult.errors.map((error) => `<div class="error">${error}</div>`).join('')}
                ` : ''}
                
                ${validationResult.warnings.length > 0 ? `
                    <h3>Warnings (${validationResult.warnings.length})</h3>
                    ${validationResult.warnings.map((warning) => `<div class="warning">${warning}</div>`).join('')}
                ` : ''}
                
                ${validationResult.changeLog.length > 0 ? `
                    <h3>Applied Changes</h3>
                    <ul>
                        ${validationResult.changeLog.map((change) => `<li>${change}</li>`).join('')}
                    </ul>
                ` : ''}
            </body>
            </html>
        `;
    }
    generateVersionInconsistenciesHTML(inconsistencies) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Version Inconsistencies</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .inconsistency { color: #d32f2f; background: #ffebee; padding: 10px; margin: 5px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Version Inconsistencies Found</h1>
                <p>Found ${inconsistencies.length} version inconsistencies across your project files.</p>
                
                ${inconsistencies.map(inconsistency => `<div class="inconsistency">${inconsistency}</div>`).join('')}
                
                <h3>Recommendations</h3>
                <ul>
                    <li>Update all version references to match the current version</li>
                    <li>Use the version manager to automatically fix inconsistencies</li>
                    <li>Review package.json, README.md, and other version references</li>
                </ul>
            </body>
            </html>
        `;
    }
    generateVersionDetailsHTML(versionInfo) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Version Details</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .version-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Version Details</h1>
                <div class="version-info">
                    <h3>Current Version: ${versionInfo.currentVersion || 'Unknown'}</h3>
                    <p><strong>Package.json:</strong> ${versionInfo.packageJsonVersion || 'Not found'}</p>
                    <p><strong>README.md:</strong> ${versionInfo.readmeVersion || 'Not found'}</p>
                    <p><strong>Extension Manifest:</strong> ${versionInfo.manifestVersion || 'Not found'}</p>
                </div>
            </body>
            </html>
        `;
    }
    generateTechDebtHTML(techDebtReport) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Technical Debt Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Technical Debt Report</h1>
                <div class="metric">
                    <h3>Total Issues: ${techDebtReport.totalIssues}</h3>
                    <p><strong>Critical Issues:</strong> ${techDebtReport.criticalIssues}</p>
                    <p><strong>Warnings:</strong> ${techDebtReport.warnings}</p>
                </div>
                
                ${techDebtReport.suggestions.length > 0 ? `
                    <h3>Suggestions</h3>
                    <ul>
                        ${techDebtReport.suggestions.map((suggestion) => `<li>${suggestion}</li>`).join('')}
                    </ul>
                ` : ''}
            </body>
            </html>
        `;
    }
}
exports.ConsoleCommands = ConsoleCommands;
//# sourceMappingURL=consoleCommands.js.map