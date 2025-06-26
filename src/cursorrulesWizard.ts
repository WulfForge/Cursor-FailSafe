import * as vscode from 'vscode';
import { CursorRule, CursorrulesEngine } from './cursorrulesEngine';
import { Commands } from './commands';

export class CursorrulesWizard {
    private readonly engine: CursorrulesEngine;
    private readonly logger: any;
    private readonly context: vscode.ExtensionContext;

    constructor(engine: CursorrulesEngine, logger: any, context: vscode.ExtensionContext) {
        this.engine = engine;
        this.logger = logger;
        this.context = context;
    }

    public async createRule(): Promise<CursorRule | null> {
        const panel = vscode.window.createWebviewPanel(
            'cursorrulesWizard',
            'Create Cursorrule',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = await new Commands({} as vscode.ExtensionContext).applyCursorRulesToHtml(this.getWizardHtml());

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'createRule':
                            try {
                                const rule = this.engine.createRule(message.ruleData);
                                vscode.window.showInformationMessage(`Cursorrule "${rule.name}" created successfully!`);
                                resolve(rule as any);
                                panel.dispose();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to create Cursorrule: ${error}`);
                                resolve(null);
                            }
                            break;
                        case 'updateRule':
                            try {
                                const rule = this.engine.updateRule(message.ruleId, message.ruleData);
                                if (rule) {
                                    vscode.window.showInformationMessage(`Cursorrule "${rule.name}" updated successfully!`);
                                    resolve(rule as any);
                                } else {
                                    vscode.window.showErrorMessage('Failed to update Cursorrule: Rule not found');
                                    resolve(null);
                                }
                                panel.dispose();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to update Cursorrule: ${error}`);
                                resolve(null);
                            }
                            break;
                        case 'cancel':
                            resolve(null);
                            panel.dispose();
                            break;
                        case 'testPattern': {
                            const testResult = this.testPattern(message.pattern, message.patternType, message.testContent);
                            panel.webview.postMessage({ command: 'testResult', result: testResult });
                            break;
                        }
                        case 'exportTestResults': {
                            const testResult = this.testPattern(message.pattern, message.patternType, message.testContent);
                            let data = '';
                            if (message.format === 'markdown') {
                                data = this.patternTestResultsToMarkdown(testResult);
                            } else {
                                data = JSON.stringify(testResult, null, 2);
                            }
                            panel.webview.postMessage({ command: 'exportedTestResults', data, format: message.format });
                            break;
                        }
                    }
                }
            );

            panel.onDidDispose(() => {
                resolve(null);
            });
        });
    }

    public async editRule(rule: CursorRule): Promise<CursorRule | null> {
        const panel = vscode.window.createWebviewPanel(
            'cursorrulesWizard',
            `Edit Cursorrule: ${rule.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = await new Commands({} as vscode.ExtensionContext).applyCursorRulesToHtml(this.getWizardHtml(rule));

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'createRule':
                            try {
                                const newRule = this.engine.createRule(message.ruleData);
                                vscode.window.showInformationMessage(`Cursorrule "${newRule.name}" created successfully!`);
                                resolve(newRule as any);
                                panel.dispose();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to create Cursorrule: ${error}`);
                                resolve(null);
                            }
                            break;
                        case 'updateRule':
                            try {
                                const updatedRule = this.engine.updateRule(message.ruleId, message.ruleData);
                                if (updatedRule) {
                                    vscode.window.showInformationMessage(`Cursorrule "${updatedRule.name}" updated successfully!`);
                                    resolve(updatedRule as any);
                                } else {
                                    vscode.window.showErrorMessage('Failed to update Cursorrule: Rule not found');
                                    resolve(null);
                                }
                                panel.dispose();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to update Cursorrule: ${error}`);
                                resolve(null);
                            }
                            break;
                        case 'cancel':
                            resolve(null);
                            panel.dispose();
                            break;
                        case 'testPattern': {
                            const testResult = this.testPattern(message.pattern, message.patternType, message.testContent);
                            panel.webview.postMessage({ command: 'testResult', result: testResult });
                            break;
                        }
                        case 'exportTestResults': {
                            const testResult = this.testPattern(message.pattern, message.patternType, message.testContent);
                            let data = '';
                            if (message.format === 'markdown') {
                                data = this.patternTestResultsToMarkdown(testResult);
                            } else {
                                data = JSON.stringify(testResult, null, 2);
                            }
                            panel.webview.postMessage({ command: 'exportedTestResults', data, format: message.format });
                            break;
                        }
                    }
                }
            );

            panel.onDidDispose(() => {
                resolve(null);
            });
        });
    }

    private testPattern(pattern: string, patternType: string, testContent: string): any {
        // Use provided test content if available, otherwise use default test data
        const testData = testContent ? 
            testContent.split('\n').filter(line => line.trim().length > 0) :
            [
                'This is a test with password=123456',
                'TODO: Implement this feature',
                'const api_key = "secret123"',
                'Normal code without issues',
                'FIXME: This needs attention',
                'rm -rf /tmp/test'
            ];

        // Estimate regex complexity (very basic: count special chars)
        let regexComplexity = 0;
        if (patternType === 'regex') {
            regexComplexity = (pattern.match(/[.*+?^${}()|[\]\\]/g) || []).length;
        }

        const results = testData.map(content => {
            let matched = false;
            let match = '';

            switch (patternType) {
                case 'regex': {
                    try {
                        const regex = new RegExp(pattern, 'gi');
                        const matches = content.match(regex);
                        matched = matches !== null && matches.length > 0;
                        match = matches ? matches[0] : '';
                    } catch (error) {
                        return { content, matched: false, error: 'Invalid regex pattern' };
                    }
                    break;
                }
                case 'keyword': {
                    const keywords = pattern.split(',').map(k => k.trim().toLowerCase());
                    const lowerContent = content.toLowerCase();
                    matched = keywords.some(keyword => lowerContent.includes(keyword));
                    if (matched) {
                        const matchedKeyword = keywords.find(keyword => lowerContent.includes(keyword));
                        match = matchedKeyword || '';
                    }
                    break;
                }
                case 'semantic': {
                    // Semantic patterns - basic implementation
                    matched = content.toLowerCase().includes(pattern.toLowerCase());
                    if (matched) {
                        const startIndex = content.toLowerCase().indexOf(pattern.toLowerCase());
                        const endIndex = startIndex + pattern.length;
                        match = content.substring(startIndex, endIndex);
                    }
                    break;
                }
            }

            return { content, matched, match, error: '' };
        });

        return {
            results,
            summary: {
                totalTests: testData.length,
                matchedCount: results.filter(r => r.matched).length,
                patternType,
                pattern,
                regexComplexity,
                hasErrors: results.some(r => r.error)
            }
        };
    }

    private getWizardHtml(rule?: CursorRule): string {
        // Pattern templates for suggestions
        const patterns = [
            { label: 'Detect Hardcoded Secrets', value: 'password|secret|key|token|api_key', type: 'keyword' },
            { label: 'Detect Console Logs', value: 'console\\.log|console\\.warn|console\\.error', type: 'regex' },
            { label: 'Detect TODO Comments', value: 'TODO', type: 'keyword' },
            { label: 'Detect FIXME', value: 'FIXME', type: 'keyword' },
            { label: 'Detect Empty Functions', value: 'function\\s*\\w*\\s*\\([^)]*\\)\\s*\\{[^}]*\\}', type: 'regex' },
            { label: 'Detect Unused Variables', value: 'let\\s+\\w+\\s*;|const\\s+\\w+\\s*;', type: 'regex' }
        ];
        // Example test content
        const exampleContents = [
            'const password = "hunter2";',
            'TODO: Refactor this function',
            'api_key = "sk-12345"',
            'rm -rf /tmp/test',
            'Normal code',
            'FIXME: This is broken',
        ];

        // Pre-fill values if editing an existing rule
        const isEditing = !!rule;
        const ruleName = rule?.name || '';
        const ruleDescription = rule?.description || '';
        const rulePurpose = rule?.purpose || '';
        // Map CursorRule severity to wizard severity
        const severityMap: { [key: string]: string } = {
            'error': 'critical',
            'warning': 'high', 
            'info': 'medium'
        };
        const ruleSeverity = rule?.severity ? severityMap[rule.severity] || 'medium' : '';
        const rulePattern = rule?.pattern || '';
        const rulePatternType = rule?.patternType || '';
        const ruleResponse = rule?.response || '';

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${isEditing ? 'Edit' : 'Create'} Cursorrule</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-editor-inactiveSelectionBackground) 100%);
                        color: var(--vscode-editor-foreground);
                        min-height: 100vh;
                    }
                    .container {
                        max-width: 900px;
                        margin: 0 auto;
                        background: var(--vscode-editor-background);
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
                        color: var(--vscode-button-foreground);
                        padding: 20px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    .content {
                        padding: 30px;
                    }
                    .step {
                        display: none;
                        margin-bottom: 20px;
                        animation: fadeIn 0.3s ease-in-out;
                    }
                    .step.active {
                        display: block;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .step-indicator {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 30px;
                        padding: 20px 0;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 8px;
                    }
                    .step-dot {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background-color: var(--vscode-descriptionForeground);
                        margin: 0 15px;
                        transition: all 0.3s ease;
                        position: relative;
                    }
                    .step-dot.active {
                        background-color: var(--vscode-button-background);
                        transform: scale(1.2);
                        box-shadow: 0 0 10px rgba(var(--vscode-button-background), 0.3);
                    }
                    .step-dot.completed {
                        background-color: var(--vscode-charts-green);
                        transform: scale(1.1);
                    }
                    .step-dot::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 100%;
                        width: 30px;
                        height: 2px;
                        background: var(--vscode-input-border);
                        transform: translateY(-50%);
                    }
                    .step-dot:last-child::after {
                        display: none;
                    }
                    h2 {
                        color: var(--vscode-editor-foreground);
                        margin-bottom: 25px;
                        font-size: 20px;
                        font-weight: 600;
                        border-bottom: 2px solid var(--vscode-button-background);
                        padding-bottom: 10px;
                    }
                    .form-group {
                        margin-bottom: 25px;
                    }
                    label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                        font-size: 14px;
                    }
                    input, select, textarea {
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid var(--vscode-input-border);
                        border-radius: 6px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-size: 14px;
                        box-sizing: border-box;
                        transition: all 0.3s ease;
                    }
                    input:focus, select:focus, textarea:focus {
                        outline: none;
                        border-color: var(--vscode-button-background);
                        box-shadow: 0 0 0 3px rgba(var(--vscode-button-background), 0.1);
                    }
                    textarea {
                        min-height: 100px;
                        resize: vertical;
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    }
                    .button-group {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid var(--vscode-input-border);
                    }
                    button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .btn-primary {
                        background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
                        color: var(--vscode-button-foreground);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    .btn-secondary {
                        background: linear-gradient(135deg, var(--vscode-button-secondaryBackground) 0%, var(--vscode-button-secondaryHoverBackground) 100%);
                        color: var(--vscode-button-secondaryForeground);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    .btn-secondary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    .test-section {
                        margin-top: 30px;
                        padding: 20px;
                        background: linear-gradient(135deg, var(--vscode-editor-inactiveSelectionBackground) 0%, var(--vscode-editor-background) 100%);
                        border-radius: 8px;
                        border: 1px solid var(--vscode-input-border);
                    }
                    .test-section h3 {
                        margin-top: 0;
                        color: var(--vscode-editor-foreground);
                        font-size: 16px;
                        font-weight: 600;
                    }
                    .test-results {
                        margin-top: 15px;
                        max-height: 250px;
                        overflow-y: auto;
                        background: var(--vscode-editor-background);
                        border-radius: 6px;
                        padding: 15px;
                        border: 1px solid var(--vscode-input-border);
                    }
                    .test-item {
                        padding: 8px 0;
                        border-bottom: 1px solid var(--vscode-input-border);
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                        font-size: 13px;
                    }
                    .test-item:last-child {
                        border-bottom: none;
                    }
                    .test-item.matched {
                        color: var(--vscode-charts-red);
                        background: rgba(var(--vscode-charts-red), 0.1);
                        padding: 8px;
                        border-radius: 4px;
                        margin: 4px 0;
                    }
                    .test-item.not-matched {
                        color: var(--vscode-charts-green);
                    }
                    .error {
                        color: var(--vscode-errorForeground);
                        font-size: 12px;
                        margin-top: 8px;
                        padding: 8px;
                        background: rgba(var(--vscode-errorForeground), 0.1);
                        border-radius: 4px;
                    }
                    .help-text {
                        color: var(--vscode-descriptionForeground);
                        font-size: 12px;
                        margin-top: 8px;
                        font-style: italic;
                    }
                    .template-list { 
                        margin-bottom: 15px; 
                        padding: 15px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 6px;
                    }
                    .template-list strong {
                        display: block;
                        margin-bottom: 10px;
                        color: var(--vscode-editor-foreground);
                    }
                    .template-btn { 
                        margin-right: 10px; 
                        margin-bottom: 10px; 
                        padding: 6px 12px;
                        font-size: 12px;
                    }
                    .example-btn { 
                        margin-right: 10px; 
                        margin-bottom: 10px; 
                        padding: 6px 12px;
                        font-size: 12px;
                    }
                    .export-btn { 
                        margin-top: 15px; 
                        margin-right: 10px;
                        padding: 8px 16px;
                        font-size: 12px;
                    }
                    .complexity { 
                        font-size: 12px; 
                        color: var(--vscode-descriptionForeground); 
                        margin-top: 8px;
                        padding: 8px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    .required {
                        color: var(--vscode-errorForeground);
                    }
                    .success-message {
                        background: var(--vscode-charts-green);
                        color: white;
                        padding: 15px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        text-align: center;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${isEditing ? 'Edit' : 'Create'} Cursorrule</h1>
                        <p>${isEditing ? 'Modify your existing rule settings' : 'Build a custom validation rule for your code'}</p>
                    </div>
                    
                    <div class="content">
                        <div class="step-indicator">
                            <div class="step-dot active" id="step1-dot"></div>
                            <div class="step-dot" id="step2-dot"></div>
                            <div class="step-dot" id="step3-dot"></div>
                            <div class="step-dot" id="step4-dot"></div>
                        </div>

                        <!-- Step 1: Purpose & Scope -->
                        <div class="step active" id="step1">
                            <h2>Step 1: Define Purpose & Scope</h2>
                            
                            <div class="form-group">
                                <label for="ruleName">Rule Name <span class="required">*</span></label>
                                <input type="text" id="ruleName" placeholder="e.g., Prevent Hardcoded Secrets" value="${ruleName}" required>
                                <div class="help-text">Choose a clear, descriptive name for your rule</div>
                            </div>

                            <div class="form-group">
                                <label for="ruleDescription">Description</label>
                                <textarea id="ruleDescription" placeholder="Describe what this rule does and why it's important">${ruleDescription}</textarea>
                            </div>

                            <div class="form-group">
                                <label for="purpose">Purpose <span class="required">*</span></label>
                                <select id="purpose" required>
                                    <option value="">Select a purpose</option>
                                    <option value="security" ${rulePurpose === 'security' ? 'selected' : ''}>Security - Prevent dangerous code/commands</option>
                                    <option value="quality" ${rulePurpose === 'quality' ? 'selected' : ''}>Quality - Ensure code quality and standards</option>
                                    <option value="compliance" ${rulePurpose === 'compliance' ? 'selected' : ''}>Compliance - Enforce organizational policies</option>
                                    <option value="workflow" ${rulePurpose === 'workflow' ? 'selected' : ''}>Workflow - Guide development processes</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="severity">Severity <span class="required">*</span></label>
                                <select id="severity" required>
                                    <option value="">Select severity level</option>
                                    <option value="critical" ${ruleSeverity === 'critical' ? 'selected' : ''}>Critical - Always block</option>
                                    <option value="high" ${ruleSeverity === 'high' ? 'selected' : ''}>High - Block with override</option>
                                    <option value="medium" ${ruleSeverity === 'medium' ? 'selected' : ''}>Medium - Strong warning</option>
                                    <option value="low" ${ruleSeverity === 'low' ? 'selected' : ''}>Low - Gentle suggestion</option>
                                </select>
                            </div>

                            <div class="button-group">
                                <button class="btn-secondary" onclick="cancel()">Cancel</button>
                                <button class="btn-primary" onclick="nextStep()">Next</button>
                            </div>
                        </div>

                        <!-- Step 2: Detection Logic -->
                        <div class="step" id="step2">
                            <h2>Step 2: Define Detection Logic</h2>
                            
                            <div class="form-group">
                                <label for="patternType">Pattern Type <span class="required">*</span></label>
                                <select id="patternType" onchange="updatePatternHelp()" required>
                                    <option value="">Select pattern type</option>
                                    <option value="regex" ${rulePatternType === 'regex' ? 'selected' : ''}>Regex - Precise text matching</option>
                                    <option value="keyword" ${rulePatternType === 'keyword' ? 'selected' : ''}>Keyword - Simple term detection</option>
                                    <option value="semantic" ${rulePatternType === 'semantic' ? 'selected' : ''}>Semantic - Meaning-based detection</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="pattern">Pattern <span class="required">*</span></label>
                                <input type="text" id="pattern" placeholder="Enter your pattern" value="${rulePattern}" required>
                                <div class="help-text" id="patternHelp">Choose a pattern type first</div>
                            </div>

                            <div class="template-list">
                                <strong>Pattern Templates:</strong><br>
                                ${patterns.map(t => `<button class="btn-secondary template-btn" onclick="applyTemplate('${t.value.replace(/'/g, "\\'")}', '${t.type}')">${t.label}</button>`).join('')}
                            </div>

                            <div class="test-section">
                                <h3>Test Your Pattern</h3>
                                <div class="form-group">
                                    <label for="testContent">Test Content</label>
                                    <textarea id="testContent" placeholder="Enter content to test against your pattern"></textarea>
                                    <div class="help-text">Or use example content:</div>
                                    ${exampleContents.map(e => `<button class="btn-secondary example-btn" onclick="addExample('${e.replace(/'/g, "\\'")}')">${e}</button>`).join('')}
                                </div>
                                <button class="btn-secondary" onclick="testPattern()">Test Pattern</button>
                                <div class="complexity" id="complexityInfo"></div>
                                <div class="test-results" id="testResults"></div>
                                <button class="btn-secondary export-btn" onclick="exportTestResults('markdown')">Export as Markdown</button>
                                <button class="btn-secondary export-btn" onclick="exportTestResults('json')">Export as JSON</button>
                            </div>

                            <div class="button-group">
                                <button class="btn-secondary" onclick="prevStep()">Previous</button>
                                <button class="btn-primary" onclick="nextStep()">Next</button>
                            </div>
                        </div>

                        <!-- Step 3: Response Configuration -->
                        <div class="step" id="step3">
                            <h2>Step 3: Configure Response</h2>
                            
                            <div class="form-group">
                                <label for="response">Response Message <span class="required">*</span></label>
                                <textarea id="response" placeholder="Enter the message to show when this rule is triggered" required>${ruleResponse}</textarea>
                                <div class="help-text">This message will be displayed when the rule detects a violation</div>
                            </div>

                            <div class="button-group">
                                <button class="btn-secondary" onclick="prevStep()">Previous</button>
                                <button class="btn-primary" onclick="nextStep()">Next</button>
                            </div>
                        </div>

                        <!-- Step 4: Alerting Configuration -->
                        <div class="step" id="step4">
                            <h2>Step 4: Configure Alerting</h2>
                            
                            <div class="form-group">
                                <label for="whenToAlert">When to Alert <span class="required">*</span></label>
                                <select id="whenToAlert" onchange="updateAlertingHelp()" required>
                                    <option value="">Select when to trigger alerts</option>
                                    <option value="immediate">Immediate - Alert as soon as detected</option>
                                    <option value="delayed">Delayed - Wait before alerting (useful for version updates)</option>
                                    <option value="batch">Batch - Group multiple alerts together</option>
                                    <option value="manual">Manual - Only alert when manually triggered</option>
                                </select>
                                <div class="help-text" id="whenToAlertHelp">Choose when alerts should be triggered</div>
                            </div>

                            <div class="form-group" id="delayConfig" style="display: none;">
                                <label for="delaySeconds">Delay (seconds)</label>
                                <input type="number" id="delaySeconds" placeholder="30" min="1" max="3600">
                                <div class="help-text">Wait this many seconds before showing the alert</div>
                            </div>

                            <div class="form-group" id="batchConfig" style="display: none;">
                                <label for="batchSize">Batch Size</label>
                                <input type="number" id="batchSize" placeholder="5" min="1" max="100">
                                <div class="help-text">Group alerts when this many violations are detected</div>
                                
                                <label for="batchTimeout">Batch Timeout (minutes)</label>
                                <input type="number" id="batchTimeout" placeholder="5" min="1" max="60">
                                <div class="help-text">Maximum time to wait before showing batched alerts</div>
                            </div>

                            <div class="form-group">
                                <label for="howToAlert">How to Alert <span class="required">*</span></label>
                                <select id="howToAlert" required>
                                    <option value="">Select alert method</option>
                                    <option value="notification">Notification - VS Code notification</option>
                                    <option value="toast">Toast - Brief popup message</option>
                                    <option value="statusbar">Status Bar - Show in status bar</option>
                                    <option value="log">Log - Write to output log</option>
                                    <option value="dashboard">Dashboard - Show in FailSafe dashboard</option>
                                    <option value="all">All Methods - Use all available methods</option>
                                </select>
                                <div class="help-text">Choose how alerts should be displayed</div>
                            </div>

                            <div class="form-group">
                                <label for="alertFrequency">Alert Frequency</label>
                                <select id="alertFrequency" onchange="updateFrequencyHelp()">
                                    <option value="always">Always - Show every alert</option>
                                    <option value="once">Once - Show only the first alert</option>
                                    <option value="throttled">Throttled - Limit frequency of alerts</option>
                                </select>
                                <div class="help-text" id="frequencyHelp">Control how often alerts are shown</div>
                            </div>

                            <div class="form-group" id="throttleConfig" style="display: none;">
                                <label for="throttleMinutes">Throttle Interval (minutes)</label>
                                <input type="number" id="throttleMinutes" placeholder="5" min="1" max="1440">
                                <div class="help-text">Minimum time between alerts</div>
                            </div>

                            <div class="form-group">
                                <label for="suppressAfterTriggers">Suppress After Triggers</label>
                                <input type="number" id="suppressAfterTriggers" placeholder="10" min="1" max="1000">
                                <div class="help-text">Stop showing alerts after this many triggers (0 = never suppress)</div>
                            </div>

                            <div class="form-group">
                                <label for="suppressDurationMinutes">Suppress Duration (minutes)</label>
                                <input type="number" id="suppressDurationMinutes" placeholder="60" min="1" max="10080">
                                <div class="help-text">How long to suppress alerts after reaching the trigger limit</div>
                            </div>

                            <div class="button-group">
                                <button class="btn-secondary" onclick="prevStep()">Previous</button>
                                <button class="btn-primary" onclick="${isEditing ? 'updateRule()' : 'createRule()'}">${isEditing ? 'Update' : 'Create'} Rule</button>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    let currentStep = 1;
                    const totalSteps = 4;
                    ${isEditing ? `const isEditing = true; const ruleId = '${rule.id}';` : 'const isEditing = false;'}

                    function nextStep() {
                        if (validateCurrentStep()) {
                            if (currentStep < totalSteps) {
                                currentStep++;
                                updateStepDisplay();
                            }
                        }
                    }

                    function prevStep() {
                        if (currentStep > 1) {
                            currentStep--;
                            updateStepDisplay();
                        }
                    }

                    function updateStepDisplay() {
                        // Hide all steps
                        for (let i = 1; i <= totalSteps; i++) {
                            document.getElementById('step' + i).classList.remove('active');
                            document.getElementById('step' + i + '-dot').classList.remove('active');
                        }
                        
                        // Show current step
                        document.getElementById('step' + currentStep).classList.add('active');
                        document.getElementById('step' + currentStep + '-dot').classList.add('active');
                        
                        // Mark completed steps
                        for (let i = 1; i < currentStep; i++) {
                            document.getElementById('step' + i + '-dot').classList.add('completed');
                        }
                    }

                    function validateCurrentStep() {
                        const currentStepElement = document.getElementById('step' + currentStep);
                        const requiredFields = currentStepElement.querySelectorAll('[required]');
                        let isValid = true;
                        
                        requiredFields.forEach(field => {
                            if (!field.value.trim()) {
                                field.style.borderColor = 'var(--vscode-errorForeground)';
                                isValid = false;
                            } else {
                                field.style.borderColor = 'var(--vscode-input-border)';
                            }
                        });
                        
                        return isValid;
                    }

                    function createRule() {
                        if (validateCurrentStep()) {
                            // Map wizard severity back to CursorRule severity
                            const severityMap: { [key: string]: string } = {
                                'critical': 'error',
                                'high': 'warning',
                                'medium': 'info',
                                'low': 'info'
                            };
                            
                            const ruleData = {
                                name: document.getElementById('ruleName').value,
                                description: document.getElementById('ruleDescription').value,
                                purpose: document.getElementById('purpose').value,
                                severity: severityMap[document.getElementById('severity').value] || 'info',
                                pattern: document.getElementById('pattern').value,
                                patternType: document.getElementById('patternType').value,
                                response: document.getElementById('response').value,
                                alerting: {
                                    whenToAlert: document.getElementById('whenToAlert').value,
                                    delaySeconds: parseInt(document.getElementById('delaySeconds').value) || undefined,
                                    batchSize: parseInt(document.getElementById('batchSize').value) || undefined,
                                    batchTimeout: parseInt(document.getElementById('batchTimeout').value) || undefined,
                                    howToAlert: document.getElementById('howToAlert').value,
                                    alertFrequency: document.getElementById('alertFrequency').value,
                                    throttleMinutes: parseInt(document.getElementById('throttleMinutes').value) || undefined,
                                    suppressAfterTriggers: parseInt(document.getElementById('suppressAfterTriggers').value) || undefined,
                                    suppressDurationMinutes: parseInt(document.getElementById('suppressDurationMinutes').value) || undefined
                                }
                            };
                            
                            vscode.postMessage({ command: 'createRule', ruleData });
                        }
                    }

                    function updateRule() {
                        if (validateCurrentStep()) {
                            // Map wizard severity back to CursorRule severity
                            const severityMap: { [key: string]: string } = {
                                'critical': 'error',
                                'high': 'warning',
                                'medium': 'info',
                                'low': 'info'
                            };
                            
                            const ruleData = {
                                name: document.getElementById('ruleName').value,
                                description: document.getElementById('ruleDescription').value,
                                purpose: document.getElementById('purpose').value,
                                severity: severityMap[document.getElementById('severity').value] || 'info',
                                pattern: document.getElementById('pattern').value,
                                patternType: document.getElementById('patternType').value,
                                response: document.getElementById('response').value,
                                alerting: {
                                    whenToAlert: document.getElementById('whenToAlert').value,
                                    delaySeconds: parseInt(document.getElementById('delaySeconds').value) || undefined,
                                    batchSize: parseInt(document.getElementById('batchSize').value) || undefined,
                                    batchTimeout: parseInt(document.getElementById('batchTimeout').value) || undefined,
                                    howToAlert: document.getElementById('howToAlert').value,
                                    alertFrequency: document.getElementById('alertFrequency').value,
                                    throttleMinutes: parseInt(document.getElementById('throttleMinutes').value) || undefined,
                                    suppressAfterTriggers: parseInt(document.getElementById('suppressAfterTriggers').value) || undefined,
                                    suppressDurationMinutes: parseInt(document.getElementById('suppressDurationMinutes').value) || undefined
                                }
                            };
                            
                            vscode.postMessage({ command: 'updateRule', ruleId: ruleId, ruleData });
                        }
                    }

                    function cancel() {
                        vscode.postMessage({ command: 'cancel' });
                    }

                    function applyTemplate(pattern, type) {
                        document.getElementById('pattern').value = pattern;
                        document.getElementById('patternType').value = type;
                        updatePatternHelp();
                    }

                    function addExample(example) {
                        const textarea = document.getElementById('testContent');
                        textarea.value = example;
                    }

                    function updatePatternHelp() {
                        const patternType = document.getElementById('patternType').value;
                        const helpText = document.getElementById('patternHelp');
                        
                        switch(patternType) {
                            case 'regex':
                                helpText.textContent = 'Enter a regular expression pattern (e.g., password|secret|key)';
                                break;
                            case 'keyword':
                                helpText.textContent = 'Enter comma-separated keywords (e.g., TODO, FIXME, BUG)';
                                break;
                            case 'semantic':
                                helpText.textContent = 'Enter a semantic pattern for meaning-based detection';
                                break;
                            default:
                                helpText.textContent = 'Choose a pattern type first';
                        }
                    }

                    function testPattern() {
                        const pattern = document.getElementById('pattern').value;
                        const patternType = document.getElementById('patternType').value;
                        const testContent = document.getElementById('testContent').value;
                        
                        if (!pattern || !patternType) {
                            alert('Please enter both pattern and pattern type');
                            return;
                        }
                        
                        vscode.postMessage({ 
                            command: 'testPattern', 
                            pattern: pattern, 
                            patternType: patternType, 
                            testContent: testContent 
                        });
                    }

                    function exportTestResults(format) {
                        const pattern = document.getElementById('pattern').value;
                        const patternType = document.getElementById('patternType').value;
                        const testContent = document.getElementById('testContent').value;
                        
                        if (!pattern || !patternType) {
                            alert('Please enter both pattern and pattern type');
                            return;
                        }
                        
                        vscode.postMessage({ 
                            command: 'exportTestResults', 
                            pattern: pattern, 
                            patternType: patternType, 
                            testContent: testContent,
                            format: format
                        });
                    }

                    function updateAlertingHelp() {
                        const whenToAlert = document.getElementById('whenToAlert').value;
                        const helpText = document.getElementById('whenToAlertHelp');
                        const delayConfig = document.getElementById('delayConfig');
                        const batchConfig = document.getElementById('batchConfig');
                        
                        // Hide all config sections
                        delayConfig.style.display = 'none';
                        batchConfig.style.display = 'none';
                        
                        switch(whenToAlert) {
                            case 'immediate':
                                helpText.textContent = 'Alert will be shown immediately when violation is detected';
                                break;
                            case 'delayed':
                                helpText.textContent = 'Alert will be delayed to allow processes to complete (useful for version updates)';
                                delayConfig.style.display = 'block';
                                break;
                            case 'batch':
                                helpText.textContent = 'Multiple alerts will be grouped together for better user experience';
                                batchConfig.style.display = 'block';
                                break;
                            case 'manual':
                                helpText.textContent = 'Alert will only be shown when manually triggered by user';
                                break;
                            default:
                                helpText.textContent = 'Choose when alerts should be triggered';
                        }
                    }

                    function updateFrequencyHelp() {
                        const frequency = document.getElementById('alertFrequency').value;
                        const helpText = document.getElementById('frequencyHelp');
                        const throttleConfig = document.getElementById('throttleConfig');
                        
                        throttleConfig.style.display = 'none';
                        
                        switch(frequency) {
                            case 'always':
                                helpText.textContent = 'Show every alert without any restrictions';
                                break;
                            case 'once':
                                helpText.textContent = 'Show only the first alert, suppress subsequent ones';
                                break;
                            case 'throttled':
                                helpText.textContent = 'Limit the frequency of alerts to avoid spam';
                                throttleConfig.style.display = 'block';
                                break;
                            default:
                                helpText.textContent = 'Control how often alerts are shown';
                        }
                    }

                    // Initialize pattern help
                    updatePatternHelp();
                </script>
            </body>
            </html>
        `;
    }

    private patternTestResultsToMarkdown(testResult: any): string {
        const { summary, results } = testResult;
        let md = `# Pattern Test Results\n\n`;
        md += `**Pattern:** \

	type: ${summary.patternType}\n	token: \
	note: \
\n`;
        md += `**Total tests:** ${summary.totalTests}\n`;
        md += `**Matches found:** ${summary.matchedCount}\n`;
        if (summary.regexComplexity !== undefined) {
            md += `**Regex complexity:** ${summary.regexComplexity}\n`;
        }
        md += `\n## Results\n`;
        results.forEach((r: any) => {
            md += `- **${r.matched ? '✅ MATCH' : '❌ NO MATCH'}**\n`;
            md += `  - Content: \
${r.content}\n`;
            if (r.matched && r.match) {
                md += `  - Match: \
${r.match}\n`;
            }
            if (r.error) {
                md += `  - Error: \
${r.error}\n`;
            }
        });
        return md;
    }

    /**
     * Validate content against all enabled cursor rules
     */
    public async validateContent(content: string, fileName?: string): Promise<any[]> {
        try {
            this.logger.info(`Validating content against cursor rules${fileName ? ` for ${fileName}` : ''}`);
            
            // Get all enabled rules
            const enabledRules = this.engine.getEnabledRules();
            
            if (enabledRules.length === 0) {
                this.logger.info('No enabled cursor rules found');
                return [];
            }

            // Evaluate content against all rules
            const matches = this.engine.evaluateContent(content);
            
            // Convert matches to violation format
            const violations = matches.map(match => {
                const rule = this.engine.getRule(match.ruleId);
                if (!rule) return null;

                return {
                    ruleId: match.ruleId,
                    ruleName: match.ruleName,
                    message: rule.message || `Rule "${rule.name}" triggered`,
                    line: match.line,
                    match: match.match,
                    confidence: match.confidence,
                    severity: rule.severity,
                    purpose: rule.purpose,
                    response: rule.response
                };
            }).filter(v => v !== null);

            this.logger.info(`Found ${violations.length} cursor rule violations`);
            return violations;
        } catch (error) {
            this.logger.error('Error validating content with cursor rules', error);
            throw error;
        }
    }
} 
