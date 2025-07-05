import * as vscode from 'vscode';
import { Logger } from '../logger';
import { CursorrulesEngine } from '../cursorrulesEngine';
import { CursorrulesManager } from '../cursorrulesManager';
import { AIResponseValidator } from '../aiResponseValidator';
import { CursorRule } from '../cursorrulesEngine';

export class CursorRulesCommands {
    private readonly logger: Logger;
    private readonly cursorrulesEngine: CursorrulesEngine;
    private readonly cursorrulesManager: CursorrulesManager;
    private readonly extensionContext: vscode.ExtensionContext;

    constructor(
        logger: Logger,
        cursorrulesEngine: CursorrulesEngine,
        cursorrulesManager: CursorrulesManager,
        extensionContext: vscode.ExtensionContext
    ) {
        this.logger = logger;
        this.cursorrulesEngine = cursorrulesEngine;
        this.cursorrulesManager = cursorrulesManager;
        this.extensionContext = extensionContext;
    }

    /**
     * Create a new cursor rule
     */
    public async createNewRule(): Promise<void> {
        try {
            await this.cursorrulesManager.createRule();
        } catch (error) {
            this.logger.error('Error in createNewRule command', error);
            vscode.window.showErrorMessage('Failed to create new rule. Check logs for details.');
        }
    }

    /**
     * Add rule from template
     */
    public async addFromTemplate(): Promise<void> {
        try {
            const templates = this.getRuleTemplates();
            const selectedTemplate = await vscode.window.showQuickPick(
                templates.map(t => t.name),
                {
                    placeHolder: 'Select a rule template'
                }
            );

            if (!selectedTemplate) {
                return;
            }

            const template = templates.find(t => t.name === selectedTemplate);
            if (!template) {
                return;
            }

            const ruleName = await vscode.window.showInputBox({
                prompt: 'Enter rule name',
                value: template.name,
                placeHolder: 'e.g., My Custom Rule'
            });

            if (!ruleName) {
                return;
            }

            const rule: Omit<CursorRule, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'> = {
                ...template,
                name: ruleName
            };

            this.cursorrulesEngine.createRule(rule);
            vscode.window.showInformationMessage(`✅ Rule "${ruleName}" created from template!`);

        } catch (error) {
            this.logger.error('Error in addFromTemplate command', error);
            vscode.window.showErrorMessage('Failed to add rule from template. Check logs for details.');
        }
    }

    /**
     * Manage existing rules
     */
    public async manageRules(): Promise<void> {
        try {
            const rules = this.cursorrulesEngine.getAllRules();
            
            const panel = vscode.window.createWebviewPanel(
                'manageRules',
                'Manage Cursor Rules',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateManageRulesHTML(rules);

        } catch (error) {
            this.logger.error('Error in manageRules command', error);
            vscode.window.showErrorMessage('Failed to manage rules. Check logs for details.');
        }
    }

    /**
     * Test passive validation system
     */
    public async testPassiveValidation(): Promise<void> {
        try {
            const sampleTexts = [
                "Let's package it up and ship it!",
                "I can see the file exists in the project directory.",
                "The tests pass successfully without any errors.",
                "I've implemented the feature and it's working perfectly.",
                "This is a simple and straightforward solution."
            ];

            const aiResponseValidator = new AIResponseValidator(this.extensionContext, this.logger);
            let testResults: any[] = [];

            for (const text of sampleTexts) {
                const result = await aiResponseValidator.applyPassiveValidationToText(text);
                testResults.push({
                    originalText: text,
                    validatedText: result.validatedText,
                    appliedChanges: result.appliedChanges,
                    changeLog: result.changeLog
                });
            }

            const panel = vscode.window.createWebviewPanel(
                'passiveValidationTest',
                'Passive Validation Test Results',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generatePassiveValidationTestHTML(testResults);

        } catch (error) {
            this.logger.error('Error in testPassiveValidation command', error);
            vscode.window.showErrorMessage('Failed to test passive validation. Check logs for details.');
        }
    }

    /**
     * Restore predefined rules
     */
    public async restorePredefinedRules(): Promise<void> {
        try {
            const predefinedRules = this.getPredefinedRules();
            let restoredCount = 0;

            for (const ruleData of predefinedRules) {
                const existingRule = this.cursorrulesEngine.getAllRules().find(rule => rule.name === ruleData.name);
                if (!existingRule) {
                    this.cursorrulesEngine.createRule(ruleData);
                    restoredCount++;
                }
            }

            vscode.window.showInformationMessage(`✅ Restored ${restoredCount} predefined cursor rules! Total rules: ${this.cursorrulesEngine.getAllRules().length}`);

        } catch (error) {
            this.logger.error('Error in restorePredefinedRules command', error);
            vscode.window.showErrorMessage('Failed to restore predefined rules. Check logs for details.');
        }
    }

    /**
     * Validate content with cursor rules
     */
    public async validateWithRules(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const content = editor.document.getText();
            const fileName = editor.document.fileName;

            const aiResponseValidator = new AIResponseValidator(this.extensionContext, this.logger);
            const result = await aiResponseValidator.applyPassiveValidationToText(content);

            if (result.appliedChanges) {
                vscode.window.showWarningMessage(
                    `⚠️ Cursor rules applied ${result.changeLog.length} changes to the content`
                );

                // Show detailed results
                await this.showValidationResults(result, fileName);
            } else {
                vscode.window.showInformationMessage('✅ Content passed all cursor rules validation!');
            }

        } catch (error) {
            this.logger.error('Error in validateWithRules command', error);
            vscode.window.showErrorMessage('Failed to validate with rules. Check logs for details.');
        }
    }

    /**
     * Edit an existing rule
     */
    public async editRule(ruleId: string): Promise<void> {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }

            await this.cursorrulesManager.editRule();
        } catch (error) {
            this.logger.error('Error editing rule', error);
            vscode.window.showErrorMessage('Failed to edit rule. Check logs for details.');
        }
    }

    // Private helper methods
    private async toggleRule(ruleId: string, enabled: boolean): Promise<void> {
        try {
            this.cursorrulesEngine.toggleRule(ruleId, enabled);
            vscode.window.showInformationMessage(`✅ Rule ${enabled ? 'enabled' : 'disabled'} successfully!`);
        } catch (error) {
            this.logger.error('Error toggling rule', error);
            vscode.window.showErrorMessage('Failed to toggle rule. Check logs for details.');
        }
    }

    private async deleteRule(ruleId: string): Promise<void> {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete rule "${rule.name}"?`,
                'Yes',
                'No'
            );

            if (confirm === 'Yes') {
                this.cursorrulesEngine.deleteRule(ruleId);
                vscode.window.showInformationMessage(`✅ Rule "${rule.name}" deleted successfully!`);
            }
        } catch (error) {
            this.logger.error('Error deleting rule', error);
            vscode.window.showErrorMessage('Failed to delete rule. Check logs for details.');
        }
    }

    private async viewRuleStats(ruleId: string): Promise<void> {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'ruleStats',
                `Rule Stats: ${rule.name}`,
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateRuleStatsHTML(rule);
        } catch (error) {
            this.logger.error('Error viewing rule stats', error);
            vscode.window.showErrorMessage('Failed to view rule stats. Check logs for details.');
        }
    }

    private async showValidationResults(result: any, fileName: string): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'validationResults',
            'Cursor Rules Validation Results',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.generateValidationResultsHTML(result, fileName);
    }

    private getRuleTemplates(): Omit<CursorRule, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>[] {
        return [
            {
                name: 'Security Check',
                pattern: '\\b(?:password|secret|key|token)\\s*=\\s*["\'][^"\']+["\']\\b',
                patternType: 'regex' as const,
                purpose: 'security',
                severity: 'error',
                enabled: true,
                message: 'Potential security issue: Hardcoded credentials detected.',
                response: 'block'
            },
            {
                name: 'TODO Detection',
                pattern: '\\bTODO\\b',
                patternType: 'keyword' as const,
                purpose: 'code_quality',
                severity: 'warning',
                enabled: true,
                message: 'TODO comment detected. Consider addressing this before production.',
                response: 'warn'
            },
            {
                name: 'Console Log Detection',
                pattern: 'console\\.(log|warn|error)\\s*\\(',
                patternType: 'regex' as const,
                purpose: 'code_quality',
                severity: 'warning',
                enabled: true,
                message: 'Console logging detected. Consider removing for production.',
                response: 'warn'
            },
            {
                name: 'Performance Claim',
                pattern: '\\b(?:fast|slow|efficient|optimized|performance)\\b',
                patternType: 'regex' as const,
                purpose: 'performance',
                severity: 'info',
                enabled: true,
                message: 'Performance-related claim detected. Verify with benchmarks.',
                response: 'suggest'
            }
        ];
    }

    private getPredefinedRules(): Omit<CursorRule, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>[] {
        // This would contain all the 27+ predefined rules
        // For brevity, I'll include a subset here
        return [
            {
                name: 'Filesystem Hallucination Detection',
                pattern: '\\b(?:file|directory|folder|path)\\s+(?:exists|is\\s+present|can\\s+be\\s+found|is\\s+available)\\b',
                patternType: 'regex' as const,
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: File existence claim detected. Verify file actually exists.'
            },
            {
                name: 'Full Verification Process Enforcement',
                pattern: '\\b(?:compile\\s+and\\s+package|package\\s+for\\s+review|build\\s+package|generate\\s+package|create\\s+package|npm\\s+run\\s+package|package\\s+it\\s+up|let\\s*\'s\\s+package|package\\s+the\\s+extension|package\\s+up|build\\s+and\\s+package)\\b',
                patternType: 'regex' as const,
                purpose: 'full_verification_enforcement',
                severity: 'error',
                enabled: true,
                message: '🚨 CRITICAL: Package generation detected without full verification process!',
                response: 'block',
                description: 'Enforces complete verification pipeline before any package generation. No exceptions allowed.'
            }
            // ... more predefined rules would be added here
        ];
    }

    private generateManageRulesHTML(rules: CursorRule[]): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Manage Cursor Rules</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .rule { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .rule-header { display: flex; justify-content: space-between; align-items: center; }
                    .rule-actions { display: flex; gap: 10px; }
                    .btn { padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; }
                    .btn-primary { background: #007acc; color: white; }
                    .btn-danger { background: #d32f2f; color: white; }
                    .btn-warning { background: #f57c00; color: white; }
                    .enabled { border-left: 4px solid #4caf50; }
                    .disabled { border-left: 4px solid #9e9e9e; opacity: 0.7; }
                </style>
            </head>
            <body>
                <h1>Manage Cursor Rules (${rules.length} total)</h1>
                
                ${rules.map(rule => `
                    <div class="rule ${rule.enabled ? 'enabled' : 'disabled'}">
                        <div class="rule-header">
                            <div>
                                <h3>${rule.name}</h3>
                                <p><strong>Purpose:</strong> ${rule.purpose}</p>
                                <p><strong>Severity:</strong> ${rule.severity}</p>
                                <p><strong>Pattern:</strong> <code>${rule.pattern}</code></p>
                                ${rule.message ? `<p><strong>Message:</strong> ${rule.message}</p>` : ''}
                            </div>
                            <div class="rule-actions">
                                <button class="btn ${rule.enabled ? 'btn-warning' : 'btn-primary'}" 
                                        onclick="toggleRule('${rule.id}', ${!rule.enabled})">
                                    ${rule.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button class="btn btn-primary" onclick="editRule('${rule.id}')">Edit</button>
                                <button class="btn btn-primary" onclick="viewStats('${rule.id}')">Stats</button>
                                <button class="btn btn-danger" onclick="deleteRule('${rule.id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function toggleRule(ruleId, enabled) {
                        vscode.postMessage({ command: 'toggleRule', ruleId, enabled });
                    }
                    
                    function editRule(ruleId) {
                        vscode.postMessage({ command: 'editRule', ruleId });
                    }
                    
                    function viewStats(ruleId) {
                        vscode.postMessage({ command: 'viewRuleStats', ruleId });
                    }
                    
                    function deleteRule(ruleId) {
                        vscode.postMessage({ command: 'deleteRule', ruleId });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private generatePassiveValidationTestHTML(testResults: any[]): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Passive Validation Test Results</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .test-result { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .original { background: #fff3e0; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .validated { background: #e8f5e8; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .changes { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Passive Validation Test Results</h1>
                
                ${testResults.map((result, index) => `
                    <div class="test-result">
                        <h3>Test ${index + 1}</h3>
                        
                        <div class="original">
                            <h4>Original Text:</h4>
                            <p>${result.originalText}</p>
                        </div>
                        
                        ${result.appliedChanges ? `
                            <div class="validated">
                                <h4>Validated Text:</h4>
                                <p>${result.validatedText}</p>
                            </div>
                            
                            <div class="changes">
                                <h4>Applied Changes:</h4>
                                <ul>
                                    ${result.changeLog.map((change: string) => `<li>${change}</li>`).join('')}
                                </ul>
                            </div>
                        ` : `
                            <div class="validated">
                                <h4>No Changes Applied</h4>
                                <p>Text passed all validation rules.</p>
                            </div>
                        `}
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }

    private generateValidationResultsHTML(result: any, fileName: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Cursor Rules Validation Results</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .result { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .changes { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Cursor Rules Validation Results</h1>
                <p><strong>File:</strong> ${fileName}</p>
                
                <div class="result">
                    <h3>${result.appliedChanges ? '⚠️ Changes Applied' : '✅ No Changes Needed'}</h3>
                    
                    ${result.appliedChanges ? `
                        <div class="changes">
                            <h4>Applied Changes:</h4>
                            <ul>
                                ${result.changeLog.map((change: string) => `<li>${change}</li>`).join('')}
                            </ul>
                        </div>
                    ` : `
                        <p>Content passed all cursor rules validation successfully.</p>
                    `}
                </div>
            </body>
            </html>
        `;
    }

    private generateRuleStatsHTML(rule: CursorRule): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Rule Stats: ${rule.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .stat { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Rule Stats: ${rule.name}</h1>
                
                <div class="stat">
                    <h3>Basic Information</h3>
                    <p><strong>Pattern:</strong> <code>${rule.pattern}</code></p>
                    <p><strong>Purpose:</strong> ${rule.purpose}</p>
                    <p><strong>Severity:</strong> ${rule.severity}</p>
                    <p><strong>Status:</strong> ${rule.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                
                <div class="stat">
                    <h3>Usage Statistics</h3>
                    <p><strong>Total Triggers:</strong> ${rule.usageStats?.triggers || 0}</p>
                    <p><strong>Total Overrides:</strong> ${rule.usageStats?.overrides || 0}</p>
                    <p><strong>Last Triggered:</strong> ${rule.usageStats?.lastTriggered || 'Never'}</p>
                </div>
                
                <div class="stat">
                    <h3>Timestamps</h3>
                    <p><strong>Created:</strong> ${rule.createdAt}</p>
                    <p><strong>Updated:</strong> ${rule.updatedAt || 'Never'}</p>
                </div>
            </body>
            </html>
        `;
    }
} 