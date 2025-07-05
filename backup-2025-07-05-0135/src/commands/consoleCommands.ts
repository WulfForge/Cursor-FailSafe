import * as vscode from 'vscode';
import { Logger } from '../logger';
import { Validator } from '../validator';
import { TestRunner } from '../testRunner';
import { VersionManager } from '../versionManager';
import { CursorrulesEngine } from '../cursorrulesEngine';
import { AIResponseValidator } from '../aiResponseValidator';
import { ValidationResult, TestResult } from '../types';

export class ConsoleCommands {
    private readonly logger: Logger;
    private readonly validator: Validator;
    private readonly testRunner: TestRunner;
    private readonly versionManager: VersionManager;
    private readonly cursorrulesEngine: CursorrulesEngine;
    private readonly extensionContext: vscode.ExtensionContext;

    constructor(
        logger: Logger,
        validator: Validator,
        testRunner: TestRunner,
        versionManager: VersionManager,
        cursorrulesEngine: CursorrulesEngine,
        extensionContext: vscode.ExtensionContext
    ) {
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
    public async validateChat(): Promise<void> {
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
                } catch (clipboardError) {
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
                } else {
                    vscode.window.showInformationMessage('Chat validation cancelled');
                    return;
                }
            }

            this.logger.info(`Starting chat validation from ${source}...`);

            // Create AI response validator
            const aiResponseValidator = new AIResponseValidator(this.extensionContext, this.logger);
            
            // Validate the content
            const validationResult = await aiResponseValidator.validateAIResponse(content, fileName);

            if (validationResult.isValid) {
                vscode.window.showInformationMessage('✅ Chat validation passed!');
            } else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                
                vscode.window.showWarningMessage(
                    `⚠️ Chat validation found ${errorCount} errors and ${warningCount} warnings`
                );

                // Show detailed results
                await this.showChatValidationResults(validationResult);
            }

        } catch (error) {
            this.logger.error('Error in validateChat command', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }

    /**
     * Check version consistency across all files
     */
    public async checkVersionConsistency(): Promise<void> {
        try {
            const inconsistencies = await this.versionManager.checkVersionConsistency();
            
            if (inconsistencies.issues.length === 0) {
                vscode.window.showInformationMessage('✅ Version consistency check passed! All files have consistent versions.');
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ Found ${inconsistencies.issues.length} version inconsistencies`
                );

                // Show detailed results
                await this.showVersionInconsistencies(inconsistencies.issues);
            }

        } catch (error) {
            this.logger.error('Error in checkVersionConsistency command', error);
            vscode.window.showErrorMessage('Failed to check version consistency. Check logs for details.');
        }
    }

    /**
     * Show detailed version information
     */
    public async showVersionDetails(): Promise<void> {
        try {
            const versionInfo = await this.versionManager.getVersionDetails();
            
            const panel = vscode.window.createWebviewPanel(
                'versionDetails',
                'Version Details',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateVersionDetailsHTML(versionInfo);

        } catch (error) {
            this.logger.error('Error in showVersionDetails command', error);
            vscode.window.showErrorMessage('Failed to show version details. Check logs for details.');
        }
    }

    /**
     * Run full verification pipeline
     */
    public async enforceFullVerification(): Promise<void> {
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

        } catch (error) {
            this.logger.error('Error in enforceFullVerification command', error);
            vscode.window.showErrorMessage('Failed to run full verification pipeline. Check logs for details.');
        }
    }

    /**
     * Evaluate technical debt
     */
    public async evaluateTechDebt(): Promise<void> {
        try {
            const techDebtReport = await this.generateTechDebtReport();
            
            const panel = vscode.window.createWebviewPanel(
                'techDebtReport',
                'Technical Debt Report',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateTechDebtHTML(techDebtReport);

        } catch (error) {
            this.logger.error('Error in evaluateTechDebt command', error);
            vscode.window.showErrorMessage('Failed to evaluate technical debt. Check logs for details.');
        }
    }

    // Private helper methods
    private async showChatValidationResults(validationResult: any): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'chatValidationResults',
            'Chat Validation Results',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.generateChatValidationHTML(validationResult);
    }

    private async showVersionInconsistencies(inconsistencies: string[]): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'versionInconsistencies',
            'Version Inconsistencies',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.generateVersionInconsistenciesHTML(inconsistencies);
    }

    private async runCommand(command: string): Promise<void> {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                this.logger.warn(`Command stderr: ${stderr}`);
            }
            this.logger.info(`Command executed: ${command}`);
        } catch (error) {
            this.logger.error(`Command failed: ${command}`, error);
            throw error;
        }
    }

    private async generateTechDebtReport(): Promise<any> {
        // Implementation for generating tech debt report
        return {
            totalIssues: 0,
            criticalIssues: 0,
            warnings: 0,
            suggestions: []
        };
    }

    private generateChatValidationHTML(validationResult: any): string {
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
                    ${validationResult.errors.map((error: string) => `<div class="error">${error}</div>`).join('')}
                ` : ''}
                
                ${validationResult.warnings.length > 0 ? `
                    <h3>Warnings (${validationResult.warnings.length})</h3>
                    ${validationResult.warnings.map((warning: string) => `<div class="warning">${warning}</div>`).join('')}
                ` : ''}
                
                ${validationResult.changeLog.length > 0 ? `
                    <h3>Applied Changes</h3>
                    <ul>
                        ${validationResult.changeLog.map((change: string) => `<li>${change}</li>`).join('')}
                    </ul>
                ` : ''}
            </body>
            </html>
        `;
    }

    private generateVersionInconsistenciesHTML(inconsistencies: string[]): string {
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

    private generateVersionDetailsHTML(versionInfo: any): string {
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

    private generateTechDebtHTML(techDebtReport: any): string {
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
                        ${techDebtReport.suggestions.map((suggestion: string) => `<li>${suggestion}</li>`).join('')}
                    </ul>
                ` : ''}
            </body>
            </html>
        `;
    }
} 