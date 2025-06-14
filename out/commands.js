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
exports.Commands = void 0;
const vscode = __importStar(require("vscode"));
const validator_1 = require("./validator");
const testRunner_1 = require("./testRunner");
class Commands {
    constructor(projectPlan, taskEngine, ui, logger) {
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.ui = ui;
        this.logger = logger;
        this.validator = new validator_1.Validator(this.logger, this.projectPlan);
        this.testRunner = new testRunner_1.TestRunner();
        this.config = vscode.workspace.getConfiguration('failsafe');
    }
    async registerCommands(context) {
        const commands = [
            vscode.commands.registerCommand('failsafe.askAI', this.askAI.bind(this)),
            vscode.commands.registerCommand('failsafe.refactor', this.refactor.bind(this)),
            vscode.commands.registerCommand('failsafe.validate', this.validate.bind(this)),
            vscode.commands.registerCommand('failsafe.showPlan', this.showPlan.bind(this)),
            vscode.commands.registerCommand('failsafe.retryLastTask', this.retryLastTask.bind(this)),
            vscode.commands.registerCommand('failsafe.viewSessionLog', this.viewSessionLog.bind(this)),
            vscode.commands.registerCommand('failsafe.markTaskComplete', this.markTaskComplete.bind(this)),
            vscode.commands.registerCommand('failsafe.createProjectPlan', this.createProjectPlan.bind(this)),
            vscode.commands.registerCommand('failsafe.editProjectPlan', this.editProjectPlan.bind(this)),
            vscode.commands.registerCommand('failsafe.reportProblem', this.reportProblem.bind(this)),
            vscode.commands.registerCommand('failsafe.suggestFailsafe', this.suggestFailsafe.bind(this)),
            vscode.commands.registerCommand('failsafe.suggestCustomFailsafe', this.suggestCustomFailsafe.bind(this)),
            vscode.commands.registerCommand('failsafe.suggestToCore', this.suggestFailsafeToCore.bind(this))
        ];
        commands.forEach(command => context.subscriptions.push(command));
        this.logger.info('All FailSafe commands registered successfully');
    }
    async askAI() {
        try {
            const prompt = await vscode.window.showInputBox({
                prompt: 'What would you like to ask the AI?',
                placeHolder: 'Describe what you need help with...'
            });
            if (!prompt) {
                return;
            }
            await this.executeAIRequest({
                prompt,
                validate: this.config.get('validationEnabled', true),
                runTests: true
            });
        }
        catch (error) {
            this.logger.error('Error in askAI command', error);
            vscode.window.showErrorMessage('Failed to execute AI request. Check logs for details.');
        }
    }
    async refactor() {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            if (!selectedText) {
                vscode.window.showWarningMessage('No text selected for refactoring');
                return;
            }
            const prompt = `Please refactor the following code to improve its quality, readability, and maintainability:\n\n${selectedText}`;
            await this.executeAIRequest({
                prompt,
                context: `File: ${editor.document.fileName}\nSelected code: ${selectedText}`,
                validate: this.config.get('validationEnabled', true),
                runTests: true
            });
        }
        catch (error) {
            this.logger.error('Error in refactor command', error);
            vscode.window.showErrorMessage('Failed to execute refactoring. Check logs for details.');
        }
    }
    async validate() {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }
            const document = editor.document;
            const content = document.getText();
            const validationResult = this.validator.validateCode(content, document.fileName);
            if (validationResult.isValid) {
                vscode.window.showInformationMessage('✅ Code validation passed!');
            }
            else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                vscode.window.showWarningMessage(`⚠️ Validation found ${errorCount} errors and ${warningCount} warnings`);
                // Show detailed results
                await this.showValidationResults(validationResult);
            }
        }
        catch (error) {
            this.logger.error('Error in validate command', error);
            vscode.window.showErrorMessage('Failed to validate code. Check logs for details.');
        }
    }
    async showPlan() {
        try {
            await this.ui.showDashboard();
        }
        catch (error) {
            this.logger.error('Error showing project plan', error);
            vscode.window.showErrorMessage('Failed to show project plan. Check logs for details.');
        }
    }
    async retryLastTask() {
        try {
            const lastTask = this.projectPlan.getCurrentTask();
            if (!lastTask) {
                vscode.window.showInformationMessage('No task to retry');
                return;
            }
            await this.taskEngine.retryTask(lastTask.id);
            vscode.window.showInformationMessage(`Retrying task: ${lastTask.name}`);
        }
        catch (error) {
            this.logger.error('Error retrying last task', error);
            vscode.window.showErrorMessage('Failed to retry task. Check logs for details.');
        }
    }
    async viewSessionLog() {
        try {
            const recentLogs = this.logger.getRecentLogs(20);
            if (recentLogs.length === 0) {
                vscode.window.showInformationMessage('No session logs found');
                return;
            }
            const logContent = recentLogs.map(log => `[${log.timestamp}] ${log.command} - ${log.status} (${log.duration}ms)`).join('\n');
            const document = await vscode.workspace.openTextDocument({
                content: logContent,
                language: 'json'
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            this.logger.error('Error viewing session log', error);
            vscode.window.showErrorMessage('Failed to view session log. Check logs for details.');
        }
    }
    async markTaskComplete() {
        try {
            const currentTask = this.projectPlan.getCurrentTask();
            if (!currentTask) {
                vscode.window.showInformationMessage('No active task to mark complete');
                return;
            }
            await this.projectPlan.completeTask(currentTask.id);
            vscode.window.showInformationMessage(`Task completed: ${currentTask.name}`);
        }
        catch (error) {
            this.logger.error('Error marking task complete', error);
            vscode.window.showErrorMessage('Failed to mark task complete. Check logs for details.');
        }
    }
    async executeAIRequest(request) {
        const startTime = Date.now();
        const sessionId = this.generateSessionId();
        try {
            this.logger.info('Executing AI request', { prompt: request.prompt, sessionId });
            // Show progress and execute request
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'FailSafe: Processing AI Request',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Sending request to AI...' });
                // Execute AI request via Cursor API
                const response = await this.executeCursorAIRequest(request.prompt);
                progress.report({ message: 'Validating response...' });
                // Validate response
                let validationResult;
                if (request.validate) {
                    validationResult = this.validator.validateResponse(response);
                }
                // If validation failed, handle override logic
                if (validationResult && !validationResult.isValid) {
                    const allowOverride = this.validator.shouldAllowOverride(validationResult, { allowOverride: this.config.get('allowOverride', false) });
                    // Show summary and allow details
                    const errorCount = validationResult.errors.length;
                    const warningCount = validationResult.warnings.length;
                    let message = `⚠️ Validation found ${errorCount} errors and ${warningCount} warnings.`;
                    if (allowOverride) {
                        message += '\nYou may override and proceed.';
                        const action = await vscode.window.showWarningMessage(message, 'View Details', 'Override and Continue', 'Cancel');
                        if (action === 'View Details') {
                            await this.showValidationResults(validationResult);
                            // Ask again
                            const confirm = await vscode.window.showWarningMessage('Do you want to override and continue?', 'Override and Continue', 'Cancel');
                            if (confirm !== 'Override and Continue') {
                                throw new Error('User cancelled due to validation errors.');
                            }
                        }
                        else if (action !== 'Override and Continue') {
                            throw new Error('User cancelled due to validation errors.');
                        }
                    }
                    else {
                        message += '\nOverride is not allowed by configuration.';
                        const action = await vscode.window.showWarningMessage(message, 'View Details', 'Cancel');
                        if (action === 'View Details') {
                            await this.showValidationResults(validationResult);
                        }
                        throw new Error('Validation failed and override is not allowed.');
                    }
                }
                progress.report({ message: 'Running tests...' });
                // Run tests if requested
                let testResult;
                if (request.runTests && this.testRunner.isTestFrameworkAvailable()) {
                    testResult = await this.testRunner.runTests();
                }
                const duration = Date.now() - startTime;
                // Log session
                const sessionLog = {
                    id: sessionId,
                    timestamp: new Date(),
                    command: 'ai_request',
                    prompt: request.prompt,
                    response,
                    validationResult,
                    testResult,
                    duration,
                    status: this.determineStatus(validationResult, testResult)
                };
                this.logger.logSession(sessionLog);
                // Show results
                await this.showAIResults(response, validationResult, testResult);
                return {
                    content: response,
                    isValid: validationResult?.isValid ?? true,
                    validationResult,
                    testResult,
                    duration
                };
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const sessionLog = {
                id: sessionId,
                timestamp: new Date(),
                command: 'ai_request',
                prompt: request.prompt,
                duration,
                status: 'error',
                error: error instanceof Error ? error.message : String(error)
            };
            this.logger.logSession(sessionLog);
            throw error;
        }
    }
    async executeCursorAIRequest(prompt) {
        // This is a placeholder for the actual Cursor AI integration
        // In a real implementation, this would use Cursor's API and support AbortController
        return new Promise((resolve, reject) => {
            const timeout = this.calculateDynamicTimeout(prompt);
            let didTimeout = false;
            const timer = setTimeout(() => {
                didTimeout = true;
                this.logger.warn('AI request timed out', { prompt });
                vscode.window.setStatusBarMessage('⚠️ FailSafe: AI request timed out', 5000);
                vscode.window.showWarningMessage('FailSafe: AI request timed out. Please try again or check your connection.');
                reject(new Error('AI request timed out'));
            }, timeout);
            // Simulate AI response (replace with actual Cursor API call)
            setTimeout(() => {
                if (didTimeout)
                    return;
                clearTimeout(timer);
                resolve(`AI Response to: ${prompt}\n\nThis is a simulated response. Replace with actual Cursor AI integration.`);
            }, 2000);
        });
    }
    calculateDynamicTimeout(prompt, context, requestType) {
        const baseTimeout = this.config.get('timeout', 10000);
        const maxTimeout = this.config.get('maxTimeout', 60000);
        const minTimeout = this.config.get('minTimeout', 5000);
        // Analyze prompt complexity
        const complexity = this.analyzePromptComplexity(prompt, context);
        const type = this.determineRequestType(prompt, requestType);
        // Calculate timeout based on complexity and type
        let timeout = baseTimeout;
        // Apply complexity multiplier
        const complexityMultipliers = {
            low: 0.8,
            medium: 1.2,
            high: 2.0
        };
        timeout *= complexityMultipliers[complexity] || 1.0;
        // Apply request type multiplier
        const typeMultipliers = {
            simple: 0.7,
            complex: 1.5,
            refactor: 1.3,
            generate: 1.8,
            debug: 1.1
        };
        timeout *= typeMultipliers[type] || 1.0;
        // Ensure timeout is within bounds
        timeout = Math.max(minTimeout, Math.min(maxTimeout, timeout));
        this.logger.debug('Dynamic timeout calculated', {
            prompt: prompt.substring(0, 100) + '...',
            complexity,
            type,
            calculatedTimeout: timeout,
            baseTimeout
        });
        return Math.round(timeout);
    }
    analyzePromptComplexity(prompt, context) {
        const fullText = (prompt + ' ' + (context || '')).toLowerCase();
        // Complexity indicators
        const highComplexityKeywords = [
            'architect', 'design pattern', 'optimize', 'performance', 'algorithm',
            'data structure', 'complex', 'sophisticated', 'enterprise', 'scalable',
            'microservices', 'distributed', 'concurrent', 'async', 'parallel'
        ];
        const mediumComplexityKeywords = [
            'refactor', 'improve', 'enhance', 'modify', 'update', 'change',
            'implement', 'create', 'build', 'develop', 'generate', 'write'
        ];
        const lowComplexityKeywords = [
            'explain', 'describe', 'what', 'how', 'why', 'simple', 'basic',
            'quick', 'fast', 'easy', 'help', 'assist'
        ];
        let score = 0;
        highComplexityKeywords.forEach(keyword => {
            if (fullText.includes(keyword))
                score += 3;
        });
        mediumComplexityKeywords.forEach(keyword => {
            if (fullText.includes(keyword))
                score += 2;
        });
        lowComplexityKeywords.forEach(keyword => {
            if (fullText.includes(keyword))
                score += 1;
        });
        // Length-based complexity
        const wordCount = fullText.split(/\s+/).length;
        if (wordCount > 100)
            score += 2;
        else if (wordCount > 50)
            score += 1;
        // Code block complexity
        const codeBlocks = (fullText.match(/```[\s\S]*?```/g) || []).length;
        score += codeBlocks * 2;
        if (score >= 6)
            return 'high';
        if (score >= 3)
            return 'medium';
        return 'low';
    }
    determineRequestType(prompt, requestType) {
        if (requestType && ['simple', 'complex', 'refactor', 'generate', 'debug'].includes(requestType)) {
            return requestType;
        }
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('refactor') || lowerPrompt.includes('improve'))
            return 'refactor';
        if (lowerPrompt.includes('generate') || lowerPrompt.includes('create') || lowerPrompt.includes('write'))
            return 'generate';
        if (lowerPrompt.includes('debug') || lowerPrompt.includes('fix') || lowerPrompt.includes('error'))
            return 'debug';
        if (lowerPrompt.includes('complex') || lowerPrompt.includes('architect') || lowerPrompt.includes('design'))
            return 'complex';
        return 'simple';
    }
    async showValidationResults(validationResult) {
        const items = [
            ...validationResult.errors.map((error) => `❌ ${error.message}`),
            ...validationResult.warnings.map((warning) => `⚠️ ${warning.message}`)
        ];
        if (items.length > 0) {
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an issue to view details'
            });
            if (selected) {
                vscode.window.showInformationMessage(selected);
            }
        }
    }
    async showAIResults(response, validationResult, testResult) {
        const messages = [];
        if (validationResult && !validationResult.isValid) {
            messages.push(`⚠️ Validation: ${validationResult.errors.length} errors found`);
        }
        if (testResult && !testResult.passed) {
            messages.push(`❌ Tests: ${testResult.failedTests} failed`);
        }
        if (messages.length === 0) {
            vscode.window.showInformationMessage('✅ AI request completed successfully!');
        }
        else {
            const action = await vscode.window.showWarningMessage(messages.join('\n'), 'View Details', 'Continue');
            if (action === 'View Details') {
                // Show detailed results in a new document
                const content = `AI Response:\n${response}\n\nValidation: ${JSON.stringify(validationResult, null, 2)}\n\nTests: ${JSON.stringify(testResult, null, 2)}`;
                const document = await vscode.workspace.openTextDocument({ content, language: 'json' });
                await vscode.window.showTextDocument(document);
            }
        }
    }
    determineStatus(validationResult, testResult) {
        if (validationResult && !validationResult.isValid) {
            return 'validation_failed';
        }
        if (testResult && !testResult.passed) {
            return 'test_failed';
        }
        return 'success';
    }
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async createProjectPlan() {
        try {
            const plan = await this.ui.projectPlan.validatePlan();
            if (plan.status === 'missing') {
                // Initialize default project plan
                await this.ui.projectPlan.initialize();
                vscode.window.showInformationMessage('Project plan created successfully!');
            }
            else {
                vscode.window.showInformationMessage('Project plan already exists.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create project plan: ${error}`);
        }
    }
    async editProjectPlan() {
        try {
            // Open the project plan file for editing
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder found.');
                return;
            }
            const projectFile = vscode.Uri.joinPath(workspaceFolders[0].uri, '.failsafe', 'project.json');
            // Check if file exists, if not create it
            try {
                await vscode.workspace.fs.stat(projectFile);
            }
            catch {
                // File doesn't exist, create it
                await this.ui.projectPlan.initialize();
            }
            // Open the file for editing
            const document = await vscode.workspace.openTextDocument(projectFile);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('Project plan opened for editing.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to edit project plan: ${error}`);
        }
    }
    async reportProblem() {
        try {
            await this.showReportProblemForm();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open report form: ${error}`);
        }
    }
    async showReportProblemForm() {
        const panel = vscode.window.createWebviewPanel('reportProblem', 'Report a Problem - FailSafe', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Get system information for the report
        const systemInfo = await this.getSystemInfo();
        panel.webview.html = this.generateReportFormContent(systemInfo);
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'submitReport':
                    await this.submitGitHubIssue(message.data, systemInfo);
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        });
    }
    async getSystemInfo() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const currentTask = this.ui.projectPlan.getCurrentTask();
        return {
            extensionVersion: '1.4.0',
            vscodeVersion: vscode.version,
            platform: process.platform,
            arch: process.arch,
            workspaceName: workspaceFolders?.[0]?.name || 'No workspace',
            currentTask: currentTask?.name || 'No active task',
            timestamp: new Date().toISOString()
        };
    }
    generateReportFormContent(systemInfo) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report a Problem - FailSafe</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .form-container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .form-content {
            padding: 40px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
        }
        
        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .system-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .system-info h3 {
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .system-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .system-info-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .system-info-item:last-child {
            border-bottom: none;
        }
        
        .system-info-label {
            font-weight: 600;
            color: #6c757d;
        }
        
        .system-info-value {
            color: #2c3e50;
        }
        
        .buttons {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 30px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
        }
        
        .required {
            color: #e74c3c;
        }
        
        .help-text {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="header">
            <h1>🐛 Report a Problem</h1>
            <p>Help us improve FailSafe by reporting bugs, suggesting features, or sharing feedback</p>
        </div>
        
        <div class="form-content">
            <div class="system-info">
                <h3>📊 System Information</h3>
                <div class="system-info-grid">
                    <div class="system-info-item">
                        <span class="system-info-label">Extension Version:</span>
                        <span class="system-info-value">${systemInfo.extensionVersion}</span>
                    </div>
                    <div class="system-info-item">
                        <span class="system-info-label">Editor Version:</span>
                        <span class="system-info-value">${systemInfo.vscodeVersion}</span>
                    </div>
                    <div class="system-info-item">
                        <span class="system-info-label">Platform:</span>
                        <span class="system-info-value">${systemInfo.platform} (${systemInfo.arch})</span>
                    </div>
                    <div class="system-info-item">
                        <span class="system-info-label">Workspace:</span>
                        <span class="system-info-value">${systemInfo.workspaceName}</span>
                    </div>
                    <div class="system-info-item">
                        <span class="system-info-label">Current Task:</span>
                        <span class="system-info-value">${systemInfo.currentTask}</span>
                    </div>
                    <div class="system-info-item">
                        <span class="system-info-label">Timestamp:</span>
                        <span class="system-info-value">${systemInfo.timestamp}</span>
                    </div>
                </div>
            </div>
            
            <form id="reportForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="issueType">Issue Type <span class="required">*</span></label>
                        <select id="issueType" required>
                            <option value="">Select issue type...</option>
                            <option value="bug">🐛 Bug Report</option>
                            <option value="feature">💡 Feature Request</option>
                            <option value="enhancement">✨ Enhancement</option>
                            <option value="documentation">📚 Documentation</option>
                            <option value="other">❓ Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="priority">Priority</label>
                        <select id="priority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="title">Title <span class="required">*</span></label>
                    <input type="text" id="title" placeholder="Brief description of the issue..." required>
                    <div class="help-text">Keep it concise but descriptive</div>
                </div>
                
                <div class="form-group">
                    <label for="description">Description <span class="required">*</span></label>
                    <textarea id="description" placeholder="Please provide a detailed description of the issue..." required></textarea>
                    <div class="help-text">Include steps to reproduce, expected vs actual behavior, and any relevant context</div>
                </div>
                
                <div class="form-group">
                    <label for="reproduction">Steps to Reproduce</label>
                    <textarea id="reproduction" placeholder="1. Open FailSafe dashboard&#10;2. Click on...&#10;3. Observe..."></textarea>
                    <div class="help-text">Numbered steps help us reproduce the issue</div>
                </div>
                
                <div class="form-group">
                    <label for="additionalInfo">Additional Information</label>
                    <textarea id="additionalInfo" placeholder="Any additional context, screenshots, or information that might be helpful..."></textarea>
                </div>
            </form>
            
            <div class="buttons">
                <button class="btn btn-secondary" onclick="cancelReport()">Cancel</button>
                <button class="btn btn-primary" onclick="submitReport()">Submit Report</button>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function submitReport() {
            const formData = {
                issueType: document.getElementById('issueType').value,
                priority: document.getElementById('priority').value,
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                reproduction: document.getElementById('reproduction').value,
                additionalInfo: document.getElementById('additionalInfo').value
            };
            
            // Validate required fields
            if (!formData.issueType || !formData.title || !formData.description) {
                alert('Please fill in all required fields.');
                return;
            }
            
            vscode.postMessage({
                command: 'submitReport',
                data: formData
            });
        }
        
        function cancelReport() {
            vscode.postMessage({
                command: 'cancel'
            });
        }
    </script>
</body>
</html>`;
    }
    async submitGitHubIssue(formData, systemInfo) {
        try {
            // Create GitHub issue URL with pre-filled data
            const issueTitle = encodeURIComponent(formData.title);
            const issueBody = this.generateGitHubIssueBody(formData, systemInfo);
            const issueUrl = encodeURIComponent(issueBody);
            // GitHub issue URL for the Cursor-FailSafe repo
            const githubUrl = `https://github.com/MythologIQ/Cursor-FailSafe/issues/new?title=${issueTitle}&body=${issueUrl}`;
            // Open in browser
            await vscode.env.openExternal(vscode.Uri.parse(githubUrl));
            vscode.window.showInformationMessage('GitHub issue page opened in your browser. Please submit the issue there.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open GitHub issue: ${error}`);
        }
    }
    generateGitHubIssueBody(formData, systemInfo) {
        return `## Issue Type
${this.getIssueTypeEmoji(formData.issueType)} ${formData.issueType.charAt(0).toUpperCase() + formData.issueType.slice(1)}

## Priority
${formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}

## Description
${formData.description}

${formData.reproduction ? `## Steps to Reproduce
${formData.reproduction}

` : ''}${formData.additionalInfo ? `## Additional Information
${formData.additionalInfo}

` : ''}## System Information
- **Extension Version:** ${systemInfo.extensionVersion}
- **Editor Version:** ${systemInfo.vscodeVersion}
- **Platform:** ${systemInfo.platform} (${systemInfo.arch})
- **Workspace:** ${systemInfo.workspaceName}
- **Current Task:** ${systemInfo.currentTask}
- **Timestamp:** ${systemInfo.timestamp}

---
*This issue was automatically generated by FailSafe's Report a Problem feature.*
`;
    }
    getIssueTypeEmoji(issueType) {
        switch (issueType) {
            case 'bug': return '🐛';
            case 'feature': return '💡';
            case 'enhancement': return '✨';
            case 'documentation': return '📚';
            default: return '❓';
        }
    }
    async suggestFailsafe() {
        // Implementation of suggestFailsafe method
    }
    async suggestCustomFailsafe() {
        try {
            // Get current context
            const context = await this.getCurrentContext();
            // Get user's custom failsafes
            const customFailsafes = this.ui.getUserFailsafes() || [];
            if (customFailsafes.length === 0) {
                vscode.window.showInformationMessage('No custom failsafes found. Create some custom failsafes first!');
                return;
            }
            // Analyze and suggest relevant failsafes
            const suggestions = this.analyzeFailsafeSuggestions(context, customFailsafes);
            if (suggestions.length === 0) {
                vscode.window.showInformationMessage('No relevant custom failsafes found for the current context.');
                return;
            }
            // Show suggestions in a quick pick
            const selected = await vscode.window.showQuickPick(suggestions.map(s => ({
                label: s.failsafe.name,
                description: s.reason,
                detail: `Relevance: ${s.relevanceScore}/100`,
                failsafe: s.failsafe
            })), {
                placeHolder: 'Select a custom failsafe to apply...',
                ignoreFocusOut: true
            });
            if (selected) {
                await this.applySuggestedFailsafe(selected.failsafe, context);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest failsafe: ${error}`);
        }
    }
    async getCurrentContext() {
        const editor = vscode.window.activeTextEditor;
        const currentTask = this.ui.projectPlan.getCurrentTask();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return {
            fileType: editor?.document.languageId || 'unknown',
            fileName: editor?.document.fileName || 'unknown',
            currentTask: currentTask?.name || 'No active task',
            workspaceName: workspaceFolders?.[0]?.name || 'No workspace',
            selectedText: editor?.document.getText(editor.selection) || '',
            lineCount: editor?.document.lineCount || 0,
            timestamp: new Date().toISOString()
        };
    }
    analyzeFailsafeSuggestions(context, customFailsafes) {
        const suggestions = [];
        for (const failsafe of customFailsafes) {
            const score = this.calculateRelevanceScore(failsafe, context);
            if (score > 30) { // Only suggest if relevance is above 30%
                const reason = this.generateSuggestionReason(failsafe, context, score);
                suggestions.push({
                    failsafe,
                    reason,
                    relevanceScore: score
                });
            }
        }
        // Sort by relevance score (highest first)
        return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    calculateRelevanceScore(failsafe, context) {
        let score = 0;
        // Check file type relevance
        if (failsafe.fileTypes && failsafe.fileTypes.includes(context.fileType)) {
            score += 25;
        }
        // Check task relevance
        if (failsafe.tasks && failsafe.tasks.some((task) => context.currentTask.toLowerCase().includes(task.toLowerCase()))) {
            score += 20;
        }
        // Check content relevance (if failsafe has keywords)
        if (failsafe.keywords && context.selectedText) {
            const keywordMatches = failsafe.keywords.filter((keyword) => context.selectedText.toLowerCase().includes(keyword.toLowerCase())).length;
            score += Math.min(keywordMatches * 10, 30);
        }
        // Check workspace relevance
        if (failsafe.workspaces && failsafe.workspaces.includes(context.workspaceName)) {
            score += 15;
        }
        // Check if failsafe is recently used (prefer less recently used ones)
        if (failsafe.lastUsed) {
            const daysSinceLastUse = (Date.now() - new Date(failsafe.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastUse > 7) {
                score += 10; // Bonus for unused failsafes
            }
        }
        else {
            score += 15; // Bonus for never-used failsafes
        }
        return Math.min(score, 100);
    }
    generateSuggestionReason(failsafe, context, score) {
        const reasons = [];
        if (failsafe.fileTypes && failsafe.fileTypes.includes(context.fileType)) {
            reasons.push(`matches ${context.fileType} files`);
        }
        if (failsafe.tasks && failsafe.tasks.some((task) => context.currentTask.toLowerCase().includes(task.toLowerCase()))) {
            reasons.push(`relevant to current task`);
        }
        if (failsafe.keywords && context.selectedText) {
            const keywordMatches = failsafe.keywords.filter((keyword) => context.selectedText.toLowerCase().includes(keyword.toLowerCase())).length;
            if (keywordMatches > 0) {
                reasons.push(`matches ${keywordMatches} keywords in selection`);
            }
        }
        if (failsafe.workspaces && failsafe.workspaces.includes(context.workspaceName)) {
            reasons.push(`workspace-specific`);
        }
        if (failsafe.lastUsed) {
            const daysSinceLastUse = (Date.now() - new Date(failsafe.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastUse > 7) {
                reasons.push(`not used recently`);
            }
        }
        else {
            reasons.push(`never used`);
        }
        return reasons.join(', ');
    }
    async applySuggestedFailsafe(failsafe, context) {
        try {
            // Log the suggestion usage
            this.ui.actionLog.push({
                timestamp: new Date().toISOString(),
                description: `💡 Applied suggested custom failsafe: ${failsafe.name}`
            });
            // Update failsafe usage
            failsafe.lastUsed = new Date().toISOString();
            failsafe.usageCount = (failsafe.usageCount || 0) + 1;
            // Show success message
            vscode.window.showInformationMessage(`Applied custom failsafe: ${failsafe.name}`, 'View Details', 'Dismiss').then(choice => {
                if (choice === 'View Details') {
                    this.showFailsafeDetails(failsafe, context);
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply failsafe: ${error}`);
        }
    }
    async showFailsafeDetails(failsafe, context) {
        const panel = vscode.window.createWebviewPanel('failsafeDetails', `Failsafe Details: ${failsafe.name}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.generateFailsafeDetailsContent(failsafe, context);
    }
    generateFailsafeDetailsContent(failsafe, context) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Failsafe Details</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .details-container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
        }
        
        .info-label {
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #2c3e50;
        }
        
        .description {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .tag {
            background: #3498db;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="details-container">
        <div class="header">
            <h1>${failsafe.name}</h1>
            <p>Custom Failsafe Details</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>📝 Description</h3>
                <div class="description">
                    ${failsafe.description || 'No description provided'}
                </div>
            </div>
            
            <div class="section">
                <h3>📊 Usage Statistics</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Usage Count</div>
                        <div class="info-value">${failsafe.usageCount || 0}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Last Used</div>
                        <div class="info-value">${failsafe.lastUsed ? new Date(failsafe.lastUsed).toLocaleDateString() : 'Never'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">${failsafe.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3>🎯 Context Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">File Type</div>
                        <div class="info-value">${context.fileType}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Current Task</div>
                        <div class="info-value">${context.currentTask}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Workspace</div>
                        <div class="info-value">${context.workspaceName}</div>
                    </div>
                </div>
            </div>
            
            ${failsafe.fileTypes ? `
            <div class="section">
                <h3>📁 Applicable File Types</h3>
                <div class="tags">
                    ${failsafe.fileTypes.map((type) => `<span class="tag">${type}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            ${failsafe.keywords ? `
            <div class="section">
                <h3>🔍 Keywords</h3>
                <div class="tags">
                    ${failsafe.keywords.map((keyword) => `<span class="tag">${keyword}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            ${failsafe.tasks ? `
            <div class="section">
                <h3>📋 Related Tasks</h3>
                <div class="tags">
                    ${failsafe.tasks.map((task) => `<span class="tag">${task}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
    }
    async suggestFailsafeToCore() {
        try {
            // Get user's custom failsafes
            const customFailsafes = this.ui.getUserFailsafes() || [];
            if (customFailsafes.length === 0) {
                vscode.window.showInformationMessage('No custom failsafes found. Create some custom failsafes first!');
                return;
            }
            // Show selection of custom failsafes
            const selected = await vscode.window.showQuickPick(customFailsafes.map(failsafe => ({
                label: failsafe.name,
                description: failsafe.description || 'No description',
                detail: failsafe.enabled ? '✅ Enabled' : '❌ Disabled',
                failsafe: failsafe
            })), {
                placeHolder: 'Select a custom failsafe to suggest for core functionality...',
                ignoreFocusOut: true
            });
            if (selected) {
                await this.showCoreSuggestionForm(selected.failsafe);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest failsafe to core: ${error}`);
        }
    }
    async showCoreSuggestionForm(failsafe) {
        const panel = vscode.window.createWebviewPanel('suggestToCore', `Suggest to Core: ${failsafe.name}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Get system information for the suggestion
        const systemInfo = await this.getSystemInfo();
        panel.webview.html = this.generateCoreSuggestionFormContent(failsafe, systemInfo);
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'submitCoreSuggestion':
                    await this.submitCoreSuggestion(message.data, failsafe, systemInfo);
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        });
    }
    generateCoreSuggestionFormContent(failsafe, systemInfo) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suggest to Core - ${failsafe.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .form-container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .content {
            padding: 40px;
        }
        
        .failsafe-preview {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 5px solid #27ae60;
        }
        
        .failsafe-preview h3 {
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .failsafe-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
        }
        
        .info-label {
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #2c3e50;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #27ae60;
        }
        
        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .buttons {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 30px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
        }
        
        .required {
            color: #e74c3c;
        }
        
        .help-text {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .benefits-section {
            background: #e8f5e8;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .benefits-section h4 {
            color: #27ae60;
            margin-bottom: 15px;
        }
        
        .benefits-list {
            list-style: none;
        }
        
        .benefits-list li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .benefits-list li:before {
            content: "✅";
            position: absolute;
            left: 0;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="header">
            <h1>🌟 Suggest to Core</h1>
            <p>Help improve FailSafe by suggesting your custom failsafe for core functionality</p>
        </div>
        
        <div class="content">
            <div class="failsafe-preview">
                <h3>📋 Failsafe Preview</h3>
                <div class="failsafe-info">
                    <div class="info-item">
                        <div class="info-label">Name</div>
                        <div class="info-value">${failsafe.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Description</div>
                        <div class="info-value">${failsafe.description || 'No description provided'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">${failsafe.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
                    </div>
                </div>
            </div>
            
            <div class="benefits-section">
                <h4>🎯 Why Suggest to Core?</h4>
                <ul class="benefits-list">
                    <li>Help other developers benefit from your custom failsafe</li>
                    <li>Contribute to the FailSafe community</li>
                    <li>Get recognition for your contribution</li>
                    <li>Help improve the overall quality of FailSafe</li>
                    <li>Make your failsafe available to everyone by default</li>
                </ul>
            </div>
            
            <form id="coreSuggestionForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="suggestionType">Suggestion Type <span class="required">*</span></label>
                        <select id="suggestionType" required>
                            <option value="">Select suggestion type...</option>
                            <option value="new-feature">✨ New Core Feature</option>
                            <option value="enhancement">🚀 Enhancement to Existing</option>
                            <option value="validation-rule">🔍 New Validation Rule</option>
                            <option value="safety-check">🛡️ New Safety Check</option>
                            <option value="other">❓ Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="priority">Suggested Priority</label>
                        <select id="priority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="title">Suggestion Title <span class="required">*</span></label>
                    <input type="text" id="title" value="Add '${failsafe.name}' to Core Failsafes" required>
                    <div class="help-text">Clear, descriptive title for your suggestion</div>
                </div>
                
                <div class="form-group">
                    <label for="rationale">Why Should This Be Core? <span class="required">*</span></label>
                    <textarea id="rationale" placeholder="Explain why this failsafe would benefit all FailSafe users..." required></textarea>
                    <div class="help-text">Describe the problem it solves and the value it provides to the community</div>
                </div>
                
                <div class="form-group">
                    <label for="useCases">Use Cases & Scenarios</label>
                    <textarea id="useCases" placeholder="Describe specific scenarios where this failsafe would be useful..."></textarea>
                    <div class="help-text">Provide examples of when and how this failsafe would be triggered</div>
                </div>
                
                <div class="form-group">
                    <label for="implementation">Implementation Notes</label>
                    <textarea id="implementation" placeholder="Any notes about how this could be implemented in core..."></textarea>
                    <div class="help-text">Optional technical details or implementation suggestions</div>
                </div>
                
                <div class="form-group">
                    <label for="additionalInfo">Additional Information</label>
                    <textarea id="additionalInfo" placeholder="Any other relevant information, considerations, or context..."></textarea>
                </div>
            </form>
            
            <div class="buttons">
                <button class="btn btn-secondary" onclick="cancelSuggestion()">Cancel</button>
                <button class="btn btn-primary" onclick="submitCoreSuggestion()">Submit Suggestion</button>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function submitCoreSuggestion() {
            const formData = {
                suggestionType: document.getElementById('suggestionType').value,
                priority: document.getElementById('priority').value,
                title: document.getElementById('title').value,
                rationale: document.getElementById('rationale').value,
                useCases: document.getElementById('useCases').value,
                implementation: document.getElementById('implementation').value,
                additionalInfo: document.getElementById('additionalInfo').value
            };
            
            // Validate required fields
            if (!formData.suggestionType || !formData.title || !formData.rationale) {
                alert('Please fill in all required fields.');
                return;
            }
            
            vscode.postMessage({
                command: 'submitCoreSuggestion',
                data: formData
            });
        }
        
        function cancelSuggestion() {
            vscode.postMessage({
                command: 'cancel'
            });
        }
    </script>
</body>
</html>`;
    }
    async submitCoreSuggestion(formData, failsafe, systemInfo) {
        try {
            // Create GitHub issue URL with pre-filled data for core suggestion
            const issueTitle = encodeURIComponent(formData.title);
            const issueBody = this.generateCoreSuggestionBody(formData, failsafe, systemInfo);
            const issueUrl = encodeURIComponent(issueBody);
            // GitHub issue URL for the Cursor-FailSafe repo with core-suggestion label
            const githubUrl = `https://github.com/MythologIQ/Cursor-FailSafe/issues/new?title=${issueTitle}&body=${issueUrl}&labels=core-suggestion,enhancement`;
            // Open in browser
            await vscode.env.openExternal(vscode.Uri.parse(githubUrl));
            vscode.window.showInformationMessage('Core suggestion GitHub issue opened in your browser. Please submit the issue there.', 'OK');
            // Log the suggestion
            this.ui.actionLog.push({
                timestamp: new Date().toISOString(),
                description: `🌟 Suggested failsafe "${failsafe.name}" for core functionality`
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open core suggestion: ${error}`);
        }
    }
    generateCoreSuggestionBody(formData, failsafe, systemInfo) {
        return `## Suggestion Type
${this.getSuggestionTypeEmoji(formData.suggestionType)} ${formData.suggestionType.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}

## Suggested Priority
${formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}

## Failsafe Details
- **Name:** ${failsafe.name}
- **Description:** ${failsafe.description || 'No description provided'}
- **Status:** ${failsafe.enabled ? 'Enabled' : 'Disabled'}

## Rationale
${formData.rationale}

${formData.useCases ? `## Use Cases & Scenarios
${formData.useCases}

` : ''}${formData.implementation ? `## Implementation Notes
${formData.implementation}

` : ''}${formData.additionalInfo ? `## Additional Information
${formData.additionalInfo}

` : ''}## System Information
- **Extension Version:** ${systemInfo.extensionVersion}
- **Editor Version:** ${systemInfo.vscodeVersion}
- **Platform:** ${systemInfo.platform} (${systemInfo.arch})
- **Workspace:** ${systemInfo.workspaceName}
- **Current Task:** ${systemInfo.currentTask}
- **Timestamp:** ${systemInfo.timestamp}

---
*This core suggestion was automatically generated by FailSafe's "Suggest to Core" feature.*
`;
    }
    getSuggestionTypeEmoji(suggestionType) {
        switch (suggestionType) {
            case 'new-feature': return '✨';
            case 'enhancement': return '🚀';
            case 'validation-rule': return '🔍';
            case 'safety-check': return '🛡️';
            default: return '❓';
        }
    }
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map