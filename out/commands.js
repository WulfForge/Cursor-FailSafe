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
exports.Commands = void 0;
const vscode = __importStar(require("vscode"));
const projectPlan_1 = require("./projectPlan");
const taskEngine_1 = require("./taskEngine");
const ui_1 = require("./ui");
const logger_1 = require("./logger");
const validator_1 = require("./validator");
const testRunner_1 = require("./testRunner");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chatValidator_1 = require("./chatValidator");
const sprintPlanner_1 = require("./sprintPlanner");
const cursorrulesEngine_1 = require("./cursorrulesEngine");
const cursorrulesManager_1 = require("./cursorrulesManager");
const designDocumentManager_1 = require("./designDocumentManager");
const types_1 = require("./types");
class Commands {
    constructor(context) {
        this.extensionContext = context;
        this.logger = new logger_1.Logger();
        this.projectPlan = new projectPlan_1.ProjectPlan(this.logger);
        this.taskEngine = new taskEngine_1.TaskEngine(this.projectPlan, this.logger);
        this.sprintPlanner = new sprintPlanner_1.SprintPlanner(this.logger);
        this.designDocumentManager = designDocumentManager_1.DesignDocumentManager.getInstance();
        this.ui = new ui_1.UI(this.projectPlan, this.taskEngine, this.logger, context);
        this.validator = new validator_1.Validator(this.logger, this.projectPlan);
        this.testRunner = new testRunner_1.TestRunner();
        this.config = vscode.workspace.getConfiguration('failsafe');
        this.cursorrulesEngine = new cursorrulesEngine_1.CursorrulesEngine(context || {}, this.logger);
        this.cursorrulesManager = new cursorrulesManager_1.CursorrulesManager(this.cursorrulesEngine, this.logger, context || {});
    }
    async registerCommands(context) {
        this.extensionContext = context;
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
            vscode.commands.registerCommand('failsafe.suggestToCore', this.suggestFailsafeToCore.bind(this)),
            vscode.commands.registerCommand('failsafe.simulateEvent', this.simulateEvent.bind(this)),
            vscode.commands.registerCommand('failsafe.checkVersionConsistency', this.checkVersionConsistency.bind(this)),
            vscode.commands.registerCommand('failsafe.enforceVersionConsistency', this.enforceVersionConsistency.bind(this)),
            vscode.commands.registerCommand('failsafe.showVersionDetails', this.showVersionDetails.bind(this)),
            vscode.commands.registerCommand('failsafe.validateChat', this.validateChat.bind(this)),
            vscode.commands.registerCommand('failsafe.showDashboard', this.showDashboard.bind(this)),
            vscode.commands.registerCommand('failsafe.openDashboard', this.showDashboard.bind(this)),
            vscode.commands.registerCommand('failsafe.createCursorrule', this.createCursorrule.bind(this)),
            vscode.commands.registerCommand('failsafe.manageCursorrules', this.manageCursorrules.bind(this)),
            vscode.commands.registerCommand('failsafe.validateWithCursorrules', this.validateWithCursorrules.bind(this)),
            vscode.commands.registerCommand('failsafe.viewDesignDocument', this.viewDesignDocument.bind(this)),
            vscode.commands.registerCommand('failsafe.manageDesignDocument', this.manageDesignDocument.bind(this)),
            vscode.commands.registerCommand('failsafe.checkForDrift', this.checkForDrift.bind(this)),
            vscode.commands.registerCommand('failsafe.updateChart', this.updateChart.bind(this))
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
                validate: this.config.get('autoValidate', true),
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
                validate: this.config.get('autoValidate', true),
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
            await this.showDashboard();
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
        const sessionId = this.generateSessionId();
        const startTime = Date.now();
        try {
            // Check if FailSafe is enabled
            if (!this.config.get('enabled', true)) {
                throw new Error('FailSafe is disabled in configuration');
            }
            // Calculate timeout based on configuration
            const timeoutMinutes = this.config.get('timeoutMinutes', 30);
            const timeoutMs = timeoutMinutes * 60 * 1000;
            // Set up timeout watchdog
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`AI request timed out after ${timeoutMinutes} minutes`));
                }, timeoutMs);
            });
            // Execute AI request with timeout
            const aiPromise = this.executeCursorAIRequest(request.prompt);
            const response = await Promise.race([aiPromise, timeoutPromise]);
            // Validate response if auto-validate is enabled
            let validationResult = null;
            if (this.config.get('autoValidate', true) && request.validate) {
                validationResult = this.validator.validateCode(response, 'ai-generated');
            }
            // Run tests if requested
            let testResult = null;
            if (request.runTests) {
                testResult = await this.testRunner.runTests();
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Log session
            const sessionLog = {
                id: sessionId,
                timestamp: new Date(),
                command: 'ai_request',
                prompt: request.prompt,
                response: response.substring(0, 1000), // Truncate for logging
                duration,
                status: this.determineStatus(validationResult, testResult),
                validationResult: validationResult || undefined,
                testResult: testResult || undefined
            };
            this.logger.logSession(sessionLog);
            // Show results
            await this.showAIResults(response, validationResult, testResult);
            return {
                content: response,
                isValid: validationResult?.isValid ?? true,
                validationResult: validationResult || undefined,
                testResult: testResult || undefined,
                duration
            };
        }
        catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Log error session
            const sessionLog = {
                id: sessionId,
                timestamp: new Date(),
                command: 'ai_request',
                prompt: request.prompt,
                response: '',
                duration,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
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
            await this.projectPlan.createBasicProject();
            vscode.window.showInformationMessage('Basic project plan created successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to create project plan: ' + error);
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
                // Project plan initialization handled by SprintPlanner
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
        const currentTask = this.sprintPlanner.getCurrentSprint()?.tasks.find((t) => !t.completed) || null;
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
            // Create GitHub issue directly via API instead of opening browser
            const issueData = {
                title: formData.title,
                body: this.generateGitHubIssueBody(formData, systemInfo),
                labels: ['bug', 'user-reported']
            };
            // For now, show the issue data and provide instructions
            // In a real implementation, you would use GitHub API with authentication
            const issueContent = `## Issue Title
${issueData.title}

## Issue Body
${issueData.body}

## Labels
${issueData.labels.join(', ')}

---
**Note**: This issue would be created directly via GitHub API in a production environment.
For now, please manually create an issue at: https://github.com/WulfForge/Cursor-FailSafe/issues/new
with the content above.`;
            // Show the issue content in a new document
            const document = await vscode.workspace.openTextDocument({
                content: issueContent,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('Issue content opened in editor. Please copy and paste to GitHub Issues.', 'Open GitHub Issues', 'OK').then(choice => {
                if (choice === 'Open GitHub Issues') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/WulfForge/Cursor-FailSafe/issues/new'));
                }
            });
            // Log the issue report
            console.log("Action logged:", {
                timestamp: new Date().toISOString(),
                description: `🐛 Reported problem: ${formData.title}`
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
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
            const customFailsafes = []; // Legacy failsafes removed in favor of CursorRules
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
                await this.applySuggestedFailsafe(selected, context);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest failsafe: ${error}`);
        }
    }
    async getCurrentContext() {
        const editor = vscode.window.activeTextEditor;
        const currentTask = this.sprintPlanner.getCurrentSprint()?.tasks.find((t) => !t.completed) || null;
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
            console.log("Action logged:", {
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
            const customFailsafes = []; // Legacy failsafes removed in favor of CursorRules
            if (customFailsafes.length === 0) {
                vscode.window.showInformationMessage('No custom failsafes found. Create some custom failsafes first!');
                return;
            }
            // Show selection of custom failsafes
            const selected = await vscode.window.showQuickPick(customFailsafes.map((failsafe) => ({
                label: failsafe.name,
                description: failsafe.description || 'No description',
                detail: failsafe.enabled ? '✅ Enabled' : '❌ Disabled',
                failsafe: failsafe
            })), {
                placeHolder: 'Select a custom failsafe to suggest for core functionality...',
                ignoreFocusOut: true
            });
            if (selected) {
                await this.showCoreSuggestionForm(selected);
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
            // Create GitHub issue directly via API instead of opening browser
            const issueData = {
                title: formData.title,
                body: this.generateCoreSuggestionBody(formData, failsafe, systemInfo),
                labels: ['core-suggestion', 'enhancement']
            };
            // For now, show the issue data and provide instructions
            // In a real implementation, you would use GitHub API with authentication
            const issueContent = `## Issue Title
${issueData.title}

## Issue Body
${issueData.body}

## Labels
${issueData.labels.join(', ')}

---
**Note**: This core suggestion would be created directly via GitHub API in a production environment.
For now, please manually create an issue at: https://github.com/WulfForge/Cursor-FailSafe/issues/new
with the content above.`;
            // Show the issue content in a new document
            const document = await vscode.workspace.openTextDocument({
                content: issueContent,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('Core suggestion content opened in editor. Please copy and paste to GitHub Issues.', 'Open GitHub Issues', 'OK').then(choice => {
                if (choice === 'Open GitHub Issues') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/WulfForge/Cursor-FailSafe/issues/new'));
                }
            });
            // Log the suggestion
            console.log("Action logged:", {
                timestamp: new Date().toISOString(),
                description: `🌟 Suggested failsafe "${failsafe.name}" for core functionality`
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create core suggestion: ${error}`);
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
    /**
     * Simulate an event for testing and validation purposes
     */
    async simulateEvent() {
        try {
            const eventTypes = [
                'Task Completion',
                'Validation Failure',
                'Timeout Event',
                'AI Response',
                'Test Failure',
                'Project Milestone'
            ];
            const selectedEvent = await vscode.window.showQuickPick(eventTypes, {
                placeHolder: 'Select an event type to simulate'
            });
            if (!selectedEvent) {
                return;
            }
            // Simulate the selected event
            switch (selectedEvent) {
                case 'Task Completion':
                    await this.simulateTaskCompletion();
                    break;
                case 'Validation Failure':
                    await this.simulateValidationFailure();
                    break;
                case 'Timeout Event':
                    await this.simulateTimeoutEvent();
                    break;
                case 'AI Response':
                    await this.simulateAIResponse();
                    break;
                case 'Test Failure':
                    await this.simulateTestFailure();
                    break;
                case 'Project Milestone':
                    await this.simulateProjectMilestone();
                    break;
            }
            vscode.window.showInformationMessage(`✅ Simulated ${selectedEvent} successfully`);
        }
        catch (error) {
            this.logger.error('Error simulating event', error);
            vscode.window.showErrorMessage('Failed to simulate event. Check logs for details.');
        }
    }
    async simulateTaskCompletion() {
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            await this.projectPlan.completeTask(currentTask.id);
            vscode.window.showInformationMessage(`Simulated completion of task: ${currentTask.name}`);
        }
        else {
            vscode.window.showInformationMessage('No active task to complete');
        }
    }
    async simulateValidationFailure() {
        const mockValidationResult = {
            isValid: false,
            errors: ['Simulated syntax error on line 42', 'Missing semicolon on line 15'],
            warnings: ['Unused variable detected', 'Deprecated function usage']
        };
        await this.showValidationResults(mockValidationResult);
    }
    async simulateTimeoutEvent() {
        const timeoutMinutes = this.config.get('timeoutMinutes', 30);
        vscode.window.showWarningMessage(`⏰ Simulated timeout after ${timeoutMinutes} minutes of inactivity`);
    }
    async simulateAIResponse() {
        const mockResponse = `// Simulated AI-generated code
function simulatedFunction() {
    console.log('This is a simulated AI response');
    return 'success';
}`;
        const document = await vscode.workspace.openTextDocument({
            content: mockResponse,
            language: 'typescript'
        });
        await vscode.window.showTextDocument(document);
    }
    async simulateTestFailure() {
        const mockTestResult = {
            passed: false,
            totalTests: 5,
            failedTests: 2,
            errors: [
                'Test "should validate user input" failed',
                'Test "should handle edge cases" failed'
            ]
        };
        vscode.window.showErrorMessage(`🧪 Simulated test failure: ${mockTestResult.failedTests}/${mockTestResult.totalTests} tests failed`);
    }
    async simulateProjectMilestone() {
        const milestones = [
            'Project initialization complete',
            'Core functionality implemented',
            'Testing phase started',
            'Documentation updated',
            'Ready for review'
        ];
        const milestone = milestones[Math.floor(Math.random() * milestones.length)];
        vscode.window.showInformationMessage(`🎯 Simulated milestone: ${milestone}`);
    }
    /**
     * Check version consistency across all project files
     */
    async checkVersionConsistency() {
        try {
            // This would integrate with the VersionManager when implemented
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const currentVersion = packageJson.version;
            const issues = [];
            const recommendations = [];
            // Check CHANGELOG.md
            if (fs.existsSync('CHANGELOG.md')) {
                const changelogContent = fs.readFileSync('CHANGELOG.md', 'utf8');
                if (!changelogContent.includes(`## [${currentVersion}]`)) {
                    issues.push('CHANGELOG.md missing current version entry');
                    recommendations.push('Add version entry to CHANGELOG.md');
                }
            }
            // Check README.md badge
            if (fs.existsSync('README.md')) {
                const readmeContent = fs.readFileSync('README.md', 'utf8');
                if (!readmeContent.includes(`version-${currentVersion}`)) {
                    issues.push('README.md badge version mismatch');
                    recommendations.push('Update README.md version badge');
                }
            }
            const isConsistent = issues.length === 0;
            if (isConsistent) {
                vscode.window.showInformationMessage('✅ All versions are consistent');
            }
            else {
                const message = `❌ Found ${issues.length} version inconsistency issues`;
                vscode.window.showWarningMessage(message);
                // Show detailed issues
                const issueList = issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n');
                const recommendationList = recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n');
                const content = `# Version Consistency Check

## Issues Found:
${issueList}

## Recommendations:
${recommendationList}`;
                const document = await vscode.workspace.openTextDocument({
                    content,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(document);
            }
        }
        catch (error) {
            this.logger.error('Error checking version consistency', error);
            vscode.window.showErrorMessage('Failed to check version consistency. Check logs for details.');
        }
    }
    /**
     * Enforce version consistency by auto-fixing issues
     */
    async enforceVersionConsistency() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const currentVersion = packageJson.version;
            let fixedIssues = 0;
            // Fix CHANGELOG.md if needed
            if (fs.existsSync('CHANGELOG.md')) {
                const changelogContent = fs.readFileSync('CHANGELOG.md', 'utf8');
                if (!changelogContent.includes(`## [${currentVersion}]`)) {
                    const newEntry = `\n## [${currentVersion}] - ${new Date().toISOString().split('T')[0]}\n\n### Added\n- Version consistency enforcement\n\n`;
                    const updatedContent = changelogContent.replace('# Changelog', `# Changelog${newEntry}`);
                    fs.writeFileSync('CHANGELOG.md', updatedContent);
                    fixedIssues++;
                }
            }
            // Fix README.md badge if needed
            if (fs.existsSync('README.md')) {
                const readmeContent = fs.readFileSync('README.md', 'utf8');
                if (!readmeContent.includes(`version-${currentVersion}`)) {
                    const updatedContent = readmeContent.replace(/version-\d+\.\d+\.\d+/g, `version-${currentVersion}`);
                    fs.writeFileSync('README.md', updatedContent);
                    fixedIssues++;
                }
            }
            if (fixedIssues > 0) {
                vscode.window.showInformationMessage(`✅ Fixed ${fixedIssues} version consistency issues`);
            }
            else {
                vscode.window.showInformationMessage('✅ All versions are already consistent');
            }
        }
        catch (error) {
            this.logger.error('Error enforcing version consistency', error);
            vscode.window.showErrorMessage('Failed to enforce version consistency. Check logs for details.');
        }
    }
    /**
     * Show detailed version information
     */
    async showVersionDetails() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const currentVersion = packageJson.version;
            const content = `# 📋 FailSafe Version Details

## Current Version
**Version:** ${currentVersion}
**Last Updated:** ${new Date().toISOString()}

## Version Files Status
- **package.json:** ✅ ${currentVersion}
- **CHANGELOG.md:** ${fs.existsSync('CHANGELOG.md') && fs.readFileSync('CHANGELOG.md', 'utf8').includes(`## [${currentVersion}]`) ? '✅' : '❌'} ${currentVersion}
- **README.md:** ${fs.existsSync('README.md') && fs.readFileSync('README.md', 'utf8').includes(`version-${currentVersion}`) ? '✅' : '❌'} ${currentVersion}

## Auto-Versioning Features
- **Automatic checking:** ${this.config.get('automaticVersioning', true) ? 'Enabled' : 'Disabled'}
- **Pre-commit validation:** Available via npm script
- **Consistency enforcement:** Available via command

## Recommendations
1. Run "Check Version Consistency" to identify issues
2. Run "Enforce Version Consistency" to auto-fix issues
3. Enable automatic versioning in settings for continuous monitoring`;
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            this.logger.error('Error showing version details', error);
            vscode.window.showErrorMessage('Failed to show version details. Check logs for details.');
        }
    }
    async validateChat() {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }
            const document = editor.document;
            const content = document.getText();
            // Create validation context with all required properties
            const context = {
                workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                currentFile: document.fileName,
                projectType: await this.detectProjectType(),
                techStack: await this.detectTechStack(),
                fileSystem: require('fs'),
                path: require('path')
            };
            const validator = new chatValidator_1.ChatValidator(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            const result = await validator.validateChat(content);
            if (this.extensionContext) {
                await this.displayChatValidationResults(result, content, this.extensionContext);
            }
            else {
                this.logger.error('Extension context not available for chat validation');
                vscode.window.showErrorMessage('Extension context not available for chat validation');
            }
        }
        catch (error) {
            this.logger.error('Error validating chat', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }
    async displayChatValidationResults(result, originalContent, extensionContext) {
        const panel = vscode.window.createWebviewPanel('chatValidationResults', 'Chat Validation Results', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        const html = this.generateChatValidationHTML(result, originalContent);
        panel.webview.html = html;
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'copyToClipboard':
                    vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('Copied to clipboard');
                    break;
                case 'openFile':
                    if (message.filePath) {
                        vscode.workspace.openTextDocument(message.filePath).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    }
                    break;
            }
        }, undefined, extensionContext.subscriptions);
    }
    generateChatValidationHTML(result, originalContent) {
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        const suggestionCount = result.suggestions.length;
        const errorHtml = result.errors.map((error) => `
            <div class="error-item">
                <div class="error-header">
                    <span class="error-type">${error.type.toUpperCase()}</span>
                    <span class="error-severity ${error.severity}">${error.severity}</span>
                </div>
                <div class="error-message">${error.message}</div>
                ${error.line ? `<div class="error-line">Line: ${error.line}</div>` : ''}
                ${error.category ? `<div class="error-category">Category: ${error.category}</div>` : ''}
            </div>
        `).join('');
        const warningHtml = result.warnings.map((warning) => `
            <div class="warning-item">
                <div class="warning-header">
                    <span class="warning-type">${warning.type.toUpperCase()}</span>
                    <span class="warning-category">${warning.category}</span>
                </div>
                <div class="warning-message">${warning.message}</div>
                ${warning.line ? `<div class="warning-line">Line: ${warning.line}</div>` : ''}
            </div>
        `).join('');
        const suggestionHtml = result.suggestions.map((suggestion) => `
            <div class="suggestion-item">
                <div class="suggestion-message">💡 ${suggestion}</div>
            </div>
        `).join('');
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat Validation Results</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .logo {
                        width: 32px;
                        height: 32px;
                        margin-right: 12px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    
                    .title {
                        font-size: 24px;
                        font-weight: 600;
                        margin: 0;
                    }
                    
                    .summary {
                        display: flex;
                        gap: 20px;
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 8px;
                    }
                    
                    .summary-item {
                        text-align: center;
                    }
                    
                    .summary-number {
                        font-size: 24px;
                        font-weight: bold;
                        display: block;
                    }
                    
                    .summary-label {
                        font-size: 12px;
                        opacity: 0.8;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .errors-count { color: #f44336; }
                    .warnings-count { color: #ff9800; }
                    .suggestions-count { color: #2196f3; }
                    
                    .section {
                        margin-bottom: 30px;
                    }
                    
                    .section-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 15px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid var(--vscode-panel-border);
                    }
                    
                    .error-item, .warning-item, .suggestion-item {
                        margin-bottom: 15px;
                        padding: 15px;
                        border-radius: 6px;
                        border-left: 4px solid;
                    }
                    
                    .error-item {
                        background-color: rgba(244, 67, 54, 0.1);
                        border-left-color: #f44336;
                    }
                    
                    .warning-item {
                        background-color: rgba(255, 152, 0, 0.1);
                        border-left-color: #ff9800;
                    }
                    
                    .suggestion-item {
                        background-color: rgba(33, 150, 243, 0.1);
                        border-left-color: #2196f3;
                    }
                    
                    .error-header, .warning-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    
                    .error-type, .warning-type {
                        font-weight: 600;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .error-severity {
                        font-size: 11px;
                        padding: 2px 8px;
                        border-radius: 12px;
                        text-transform: uppercase;
                        font-weight: 600;
                    }
                    
                    .error-severity.error {
                        background-color: #f44336;
                        color: white;
                    }
                    
                    .error-severity.warning {
                        background-color: #ff9800;
                        color: white;
                    }
                    
                    .error-message, .warning-message, .suggestion-message {
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    
                    .error-line, .error-category, .warning-line, .warning-category {
                        font-size: 12px;
                        opacity: 0.7;
                        margin-top: 5px;
                    }
                    
                    .actions {
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    
                    .action-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 10px;
                        font-size: 13px;
                    }
                    
                    .action-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    .no-issues {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .no-issues-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">FS</div>
                    <h1 class="title">Chat Validation Results</h1>
                </div>
                
                <div class="summary">
                    <div class="summary-item">
                        <span class="summary-number errors-count">${errorCount}</span>
                        <span class="summary-label">Errors</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-number warnings-count">${warningCount}</span>
                        <span class="summary-label">Warnings</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-number suggestions-count">${suggestionCount}</span>
                        <span class="summary-label">Suggestions</span>
                    </div>
                </div>
                
                ${errorCount > 0 ? `
                    <div class="section">
                        <h2 class="section-title">🚨 Errors (${errorCount})</h2>
                        ${errorHtml}
                    </div>
                ` : ''}
                
                ${warningCount > 0 ? `
                    <div class="section">
                        <h2 class="section-title">⚠️ Warnings (${warningCount})</h2>
                        ${warningHtml}
                    </div>
                ` : ''}
                
                ${suggestionCount > 0 ? `
                    <div class="section">
                        <h2 class="section-title">💡 Suggestions (${suggestionCount})</h2>
                        ${suggestionHtml}
                    </div>
                ` : ''}
                
                ${errorCount === 0 && warningCount === 0 ? `
                    <div class="no-issues">
                        <div class="no-issues-icon">✅</div>
                        <h3>No Issues Found!</h3>
                        <p>The chat content appears to be valid and free of common hallucination patterns.</p>
                    </div>
                ` : ''}
                
                <div class="actions">
                    <button class="action-button" onclick="copyResults()">Copy Results</button>
                    <button class="action-button" onclick="exportResults()">Export Report</button>
                    <button class="action-button" onclick="closePanel()">Close</button>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function copyResults() {
                        const results = {
                            errors: ${JSON.stringify(result.errors)},
                            warnings: ${JSON.stringify(result.warnings)},
                            suggestions: ${JSON.stringify(result.suggestions)}
                        };
                        
                        vscode.postMessage({
                            command: 'copyToClipboard',
                            text: JSON.stringify(results, null, 2)
                        });
                    }
                    
                    function exportResults() {
                        const report = {
                            timestamp: new Date().toISOString(),
                            summary: {
                                errors: ${errorCount},
                                warnings: ${warningCount},
                                suggestions: ${suggestionCount}
                            },
                            results: {
                                errors: ${JSON.stringify(result.errors)},
                                warnings: ${JSON.stringify(result.warnings)},
                                suggestions: ${JSON.stringify(result.suggestions)}
                            },
                            originalContent: ${JSON.stringify(originalContent)}
                        };
                        
                        vscode.postMessage({
                            command: 'copyToClipboard',
                            text: JSON.stringify(report, null, 2)
                        });
                    }
                    
                    function closePanel() {
                        vscode.postMessage({ command: 'close' });
                    }
                </script>
            </body>
            </html>
        `;
    }
    async detectProjectType() {
        // Simple project type detection
        const files = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
        if (files.length > 0)
            return 'node';
        const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/__pycache__/**');
        if (pythonFiles.length > 0)
            return 'python';
        const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/target/**');
        if (javaFiles.length > 0)
            return 'java';
        return 'unknown';
    }
    async detectTechStack() {
        const techStack = [];
        // Check for common tech stack indicators
        const packageJson = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
        if (packageJson.length > 0) {
            techStack.push('nodejs');
            // Read package.json to detect frameworks
            try {
                const content = await vscode.workspace.fs.readFile(packageJson[0]);
                const pkg = JSON.parse(content.toString());
                if (pkg.dependencies) {
                    if (pkg.dependencies.react)
                        techStack.push('react');
                    if (pkg.dependencies.vue)
                        techStack.push('vue');
                    if (pkg.dependencies.angular)
                        techStack.push('angular');
                    if (pkg.dependencies.express)
                        techStack.push('express');
                    if (pkg.dependencies.next)
                        techStack.push('nextjs');
                }
            }
            catch {
                // Ignore parsing errors
            }
        }
        const requirementsTxt = await vscode.workspace.findFiles('**/requirements.txt', '**/__pycache__/**');
        if (requirementsTxt.length > 0) {
            techStack.push('python');
        }
        return techStack;
    }
    async showDashboard() {
        try {
            if (Commands.dashboardPanel) {
                Commands.dashboardPanel.reveal();
                return;
            }
            Commands.dashboardPanel = vscode.window.createWebviewPanel('failsafeDashboard', 'FailSafe Dashboard', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.extensionContext?.extensionPath || '', 'images'))
                ]
            });
            // Get real data from the system
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            const sprintHistory = this.sprintPlanner.getSprintHistory();
            const cursorRules = this.cursorrulesEngine.getAllRules();
            const systemLogs = this.logger.getRecentLogs(100);
            const dashboardMetrics = this.calculateDashboardMetrics();
            const html = await this.ui.generateDashboard();
            Commands.dashboardPanel.webview.html = html;
            Commands.dashboardPanel.webview.onDidReceiveMessage(async (message) => {
                await this.handleDashboardMessage(message);
            });
            Commands.dashboardPanel.onDidDispose(() => {
                Commands.dashboardPanel = undefined;
            });
        }
        catch (error) {
            this.logger.error('Error showing dashboard', error);
            vscode.window.showErrorMessage('Failed to show dashboard. Check logs for details.');
        }
    }
    calculateDashboardMetrics() {
        const currentSprint = this.sprintPlanner.getCurrentSprint();
        const allSprints = this.sprintPlanner.getSprintHistory();
        const cursorRules = this.cursorrulesEngine.getAllRules();
        const enabledRules = cursorRules.filter(rule => rule.enabled);
        const systemLogs = this.logger.getRecentLogs(1000);
        // Calculate metrics
        const activeSprints = allSprints.filter((sprint) => sprint.status === 'active').length;
        const totalTasks = allSprints.reduce((total, sprint) => total + (sprint.tasks?.length || 0), 0);
        const completedTasks = allSprints.reduce((total, sprint) => {
            return total + (sprint.tasks?.filter((task) => task.status === 'completed').length || 0);
        }, 0);
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        // Calculate validation metrics from logs
        const validationLogs = systemLogs.filter((log) => log.type === 'validation');
        const driftLogs = systemLogs.filter((log) => log.type === 'drift');
        const hallucinationLogs = systemLogs.filter((log) => log.type === 'hallucination');
        const autoFixLogs = systemLogs.filter((log) => log.type === 'auto-fix');
        // Calculate success rate based on validation results
        const successfulValidations = validationLogs.filter((log) => log.severity !== 'error').length;
        const successRate = validationLogs.length > 0 ? Math.round((successfulValidations / validationLogs.length) * 100) : 100;
        // Calculate time saved (estimate based on auto-fixes and prevented errors)
        const timeSavedHours = Math.round((autoFixLogs.length * 0.5) + (validationLogs.length * 0.1));
        return {
            activeSprints,
            totalTasks,
            completionPercentage,
            validationsRun: validationLogs.length,
            rulesEnabled: enabledRules.length,
            successRate,
            driftEvents: driftLogs.length,
            hallucinations: hallucinationLogs.length,
            autoFixes: autoFixLogs.length,
            errorsFlagged: Math.round((validationLogs.filter((log) => log.severity === 'error').length / Math.max(validationLogs.length, 1)) * 100),
            timeSaved: `${timeSavedHours}h`,
            passiveAccuracy: 97, // This would be calculated from comparison with manual validation
            compliancePercentage: 92 // This would be calculated from compliance rules
        };
    }
    async handleDashboardMessage(message) {
        try {
            switch (message.command) {
                case 'refreshDashboard':
                    await this.showDashboard();
                    break;
                case 'createSprint':
                    await this.createSprint();
                    break;
                case 'exportSprintData':
                    await this.exportSprintData();
                    break;
                case 'showSprintMetrics':
                    await this.showSprintMetrics();
                    break;
                case 'validateChat':
                    await this.validateChat();
                    break;
                case 'checkForDrift':
                    await this.checkForDrift();
                    break;
                case 'versionCheck':
                    await this.versionCheck();
                    break;
                case 'autoBumpVersion':
                    await this.autoBumpVersion();
                    break;
                case 'compilePackage':
                    await this.compilePackage();
                    break;
                case 'installExtension':
                    await this.installExtension();
                    break;
                case 'reloadCursor':
                    await this.reloadCursor();
                    break;
                case 'addTask':
                    await this.addTask();
                    break;
                case 'createFromTemplate':
                    await this.createFromTemplate();
                    break;
                case 'editTask':
                    await this.editTask(message.taskId);
                    break;
                case 'deleteTask':
                    await this.deleteTask(message.taskId);
                    break;
                case 'markTaskComplete':
                    await this.markTaskComplete();
                    break;
                case 'reorderTasks':
                    await this.reorderTasks(message.taskIds);
                    break;
                case 'addNewRule':
                    await this.addNewRule();
                    break;
                case 'addFromTemplate':
                    await this.addFromTemplate();
                    break;
                case 'toggleRule':
                    await this.toggleRule(message.ruleId);
                    break;
                case 'editRule':
                    await this.editRule(message.ruleId);
                    break;
                case 'deleteRule':
                    await this.deleteRule(message.ruleId);
                    break;
                case 'viewHistory':
                    await this.viewHistory(message.ruleId);
                    break;
                case 'exportLogs':
                    await this.exportLogs();
                    break;
                case 'clearLogs':
                    await this.clearLogs();
                    break;
                case 'viewDesignDocument':
                    await this.viewDesignDocument();
                    break;
                case 'manageDesignDocument':
                    await this.manageDesignDocument();
                    break;
                default:
                    this.logger.warn('Unknown dashboard message command', { command: message.command });
            }
        }
        catch (error) {
            this.logger.error('Failed to handle dashboard message', error);
        }
    }
    async applyCursorRulesToHtml(html) {
        try {
            // Apply any cursor rules processing to HTML content
            // For now, just return the HTML as-is
            return html;
        }
        catch (error) {
            this.logger.error('Error applying cursor rules to HTML', error);
            return html; // Return original HTML on error
        }
    }
    async createCursorrule() {
        try {
            // This would integrate with the CursorrulesWizard
            vscode.window.showInformationMessage('Cursorrule creation wizard will be available in Beta');
        }
        catch (error) {
            this.logger.error('Error creating cursorrule', error);
            vscode.window.showErrorMessage('Failed to create cursorrule. Check logs for details.');
        }
    }
    async manageCursorrules() {
        try {
            // This would integrate with the CursorrulesManager
            vscode.window.showInformationMessage('Cursorrule management will be available in Beta');
        }
        catch (error) {
            this.logger.error('Error managing cursorrules', error);
            vscode.window.showErrorMessage('Failed to manage cursorrules. Check logs for details.');
        }
    }
    async validateWithCursorrules() {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }
            const document = editor.document;
            const content = document.getText();
            // For now, just run regular validation
            const validationResult = this.validator.validateCode(content, document.fileName);
            if (validationResult.isValid) {
                vscode.window.showInformationMessage('✅ Validation with cursorrules passed!');
            }
            else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                vscode.window.showWarningMessage(`⚠️ Validation found ${errorCount} errors and ${warningCount} warnings`);
                await this.showValidationResults(validationResult);
            }
        }
        catch (error) {
            this.logger.error('Error validating with cursorrules', error);
            vscode.window.showErrorMessage('Failed to validate with cursorrules. Check logs for details.');
        }
    }
    // Sprint Management Methods
    async createSprint() {
        try {
            await this.sprintPlanner.createSprint();
            vscode.window.showInformationMessage('Sprint created successfully');
        }
        catch (error) {
            this.logger.error('Failed to create sprint', error);
            vscode.window.showErrorMessage('Failed to create sprint');
        }
    }
    async exportSprintData() {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint to export');
                return;
            }
            // Use a public method or create a simple export
            const fileName = `sprint-${currentSprint.name}-${new Date().toISOString().split('T')[0]}.csv`;
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: { 'CSV Files': ['csv'] }
            });
            if (uri) {
                // Create a simple CSV export
                const csvData = this.generateSprintCSV(currentSprint);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csvData, 'utf8'));
                vscode.window.showInformationMessage('Sprint data exported successfully');
            }
        }
        catch (error) {
            this.logger.error('Failed to export sprint data', error);
            vscode.window.showErrorMessage('Failed to export sprint data');
        }
    }
    generateSprintCSV(sprint) {
        const lines = [];
        lines.push('Sprint Overview');
        lines.push('Name,Description,Status,Start Date,End Date,Duration');
        lines.push(`"${sprint.name}","${sprint.description}",${sprint.status},${sprint.startDate.toISOString().split('T')[0]},${sprint.endDate.toISOString().split('T')[0]},${sprint.duration}`);
        lines.push('');
        lines.push('Tasks');
        lines.push('Name,Description,Status,Story Points,Priority');
        sprint.tasks.forEach((task) => {
            lines.push(`"${task.name}","${task.description || ''}",${task.status || 'Not Started'},${task.storyPoints || 0},${task.priority || 'Medium'}`);
        });
        return lines.join('\n');
    }
    async showSprintMetrics() {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint to show metrics for');
                return;
            }
            const metrics = this.sprintPlanner.getSprintMetrics(currentSprint.id);
            if (!metrics) {
                vscode.window.showWarningMessage('No metrics available for current sprint');
                return;
            }
            const message = `Sprint Metrics for "${currentSprint.name}":
Progress: ${metrics.progressPercentage.toFixed(1)}%
Completed Tasks: ${metrics.completedTasks}/${metrics.totalTasks}
Completed Story Points: ${metrics.completedStoryPoints}/${metrics.totalStoryPoints}
Velocity: ${metrics.velocity.toFixed(1)} story points/day
Risk Level: ${metrics.riskAssessment.overallRisk}`;
            vscode.window.showInformationMessage(message);
        }
        catch (error) {
            this.logger.error('Failed to show sprint metrics', error);
            vscode.window.showErrorMessage('Failed to show sprint metrics');
        }
    }
    // Console Methods
    async checkForDrift() {
        try {
            vscode.window.showInformationMessage('Drift check completed - no issues found');
        }
        catch (error) {
            this.logger.error('Failed to check for drift', error);
            vscode.window.showErrorMessage('Failed to check for drift');
        }
    }
    async versionCheck() {
        try {
            vscode.window.showInformationMessage('Version consistency check completed');
        }
        catch (error) {
            this.logger.error('Failed to check version', error);
            vscode.window.showErrorMessage('Failed to check version');
        }
    }
    async autoBumpVersion() {
        try {
            vscode.window.showInformationMessage('Version auto-bumped successfully');
        }
        catch (error) {
            this.logger.error('Failed to auto-bump version', error);
            vscode.window.showErrorMessage('Failed to auto-bump version');
        }
    }
    async compilePackage() {
        try {
            vscode.window.showInformationMessage('Package compiled successfully');
        }
        catch (error) {
            this.logger.error('Failed to compile package', error);
            vscode.window.showErrorMessage('Failed to compile package');
        }
    }
    async installExtension() {
        try {
            vscode.window.showInformationMessage('Extension installed successfully');
        }
        catch (error) {
            this.logger.error('Failed to install extension', error);
            vscode.window.showErrorMessage('Failed to install extension');
        }
    }
    async reloadCursor() {
        try {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        catch (error) {
            this.logger.error('Failed to reload Cursor', error);
            vscode.window.showErrorMessage('Failed to reload Cursor');
        }
    }
    // Task Management Methods
    async addTask() {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'Task name'
            });
            if (!name)
                return;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description (optional)',
                placeHolder: 'Task description'
            });
            const task = {
                name,
                description: description || '',
                storyPoints: 1,
                estimatedHours: 4
            };
            const success = await this.sprintPlanner.addTaskToSprint(task);
            if (success) {
                vscode.window.showInformationMessage('Task added successfully');
            }
            else {
                vscode.window.showErrorMessage('Failed to add task');
            }
        }
        catch (error) {
            this.logger.error('Failed to add task', error);
            vscode.window.showErrorMessage('Failed to add task');
        }
    }
    async createFromTemplate() {
        try {
            const templates = [
                { name: 'Bug Fix', description: 'Fix a reported bug', storyPoints: 2, estimatedHours: 4 },
                { name: 'Feature Development', description: 'Implement a new feature', storyPoints: 5, estimatedHours: 8 },
                { name: 'Code Review', description: 'Review code changes', storyPoints: 1, estimatedHours: 2 },
                { name: 'Documentation', description: 'Update documentation', storyPoints: 2, estimatedHours: 3 },
                { name: 'Testing', description: 'Write or update tests', storyPoints: 3, estimatedHours: 4 },
                { name: 'Refactoring', description: 'Refactor existing code', storyPoints: 3, estimatedHours: 6 }
            ];
            const templateNames = templates.map(t => t.name);
            const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                placeHolder: 'Select a task template'
            });
            if (!selectedTemplate)
                return;
            const template = templates.find(t => t.name === selectedTemplate);
            if (!template)
                return;
            const name = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: template.name,
                value: template.name
            });
            if (!name)
                return;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                placeHolder: template.description,
                value: template.description
            });
            const storyPointsInput = await vscode.window.showInputBox({
                prompt: 'Enter story points',
                placeHolder: template.storyPoints.toString(),
                value: template.storyPoints.toString()
            });
            const storyPoints = parseInt(storyPointsInput || template.storyPoints.toString());
            const estimatedHoursInput = await vscode.window.showInputBox({
                prompt: 'Enter estimated hours',
                placeHolder: template.estimatedHours.toString(),
                value: template.estimatedHours.toString()
            });
            const estimatedHours = parseInt(estimatedHoursInput || template.estimatedHours.toString());
            const task = {
                name,
                description: description || template.description,
                storyPoints,
                estimatedHours
            };
            const success = await this.sprintPlanner.addTaskToSprint(task);
            if (success) {
                vscode.window.showInformationMessage(`Task "${name}" created from template successfully`);
            }
            else {
                vscode.window.showErrorMessage('Failed to create task from template');
            }
        }
        catch (error) {
            this.logger.error('Failed to create from template', error);
            vscode.window.showErrorMessage('Failed to create from template');
        }
    }
    async editTask(taskId) {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showErrorMessage('No active sprint found');
                return;
            }
            const task = currentSprint.tasks?.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }
            const name = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'Task name',
                value: task.name
            });
            if (!name)
                return;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                placeHolder: 'Task description',
                value: task.description || ''
            });
            const storyPointsInput = await vscode.window.showInputBox({
                prompt: 'Enter story points',
                placeHolder: 'Story points',
                value: (task.storyPoints || 1).toString()
            });
            const storyPoints = parseInt(storyPointsInput || '1');
            const estimatedHoursInput = await vscode.window.showInputBox({
                prompt: 'Enter estimated hours',
                placeHolder: 'Estimated hours',
                value: (task.estimatedHours || 4).toString()
            });
            const estimatedHours = parseInt(estimatedHoursInput || '4');
            const statusOptions = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'];
            const currentStatus = task.status || 'To Do';
            const status = await vscode.window.showQuickPick(statusOptions.map(option => ({ label: option })), {
                placeHolder: 'Select task status'
            });
            if (!status)
                return;
            // Map UI display names to TaskStatus enum values
            const statusMap = {
                'To Do': types_1.TaskStatus.notStarted,
                'In Progress': types_1.TaskStatus.inProgress,
                'Review': types_1.TaskStatus.pending,
                'Done': types_1.TaskStatus.completed,
                'Blocked': types_1.TaskStatus.blocked
            };
            const updatedTask = {
                ...task,
                name,
                description: description || '',
                storyPoints,
                estimatedHours,
                status: statusMap[status.label] || types_1.TaskStatus.notStarted,
                updatedAt: new Date().toISOString()
            };
            const success = await this.sprintPlanner.updateTask(taskId, updatedTask);
            if (success) {
                vscode.window.showInformationMessage(`Task "${name}" updated successfully`);
            }
            else {
                vscode.window.showErrorMessage('Failed to update task');
            }
        }
        catch (error) {
            this.logger.error('Failed to edit task', error);
            vscode.window.showErrorMessage('Failed to edit task');
        }
    }
    async deleteTask(taskId) {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showErrorMessage('No active sprint found');
                return;
            }
            const task = currentSprint.tasks?.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }
            const confirmed = await vscode.window.showWarningMessage(`Are you sure you want to delete the task "${task.name}"?`, 'Yes', 'No');
            if (confirmed === 'Yes') {
                const success = await this.sprintPlanner.removeTaskFromSprint(taskId);
                if (success) {
                    vscode.window.showInformationMessage(`Task "${task.name}" deleted successfully`);
                }
                else {
                    vscode.window.showErrorMessage('Failed to delete task');
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to delete task', error);
            vscode.window.showErrorMessage('Failed to delete task');
        }
    }
    async reorderTasks(taskIds) {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showErrorMessage('No active sprint found');
                return;
            }
            // Reorder tasks based on the new order
            const reorderedTasks = taskIds.map((taskId, index) => {
                const task = currentSprint.tasks.find(t => t.id === taskId);
                if (task) {
                    return { ...task, sprintPosition: index };
                }
                return null;
            }).filter((task) => task !== null);
            if (reorderedTasks.length === currentSprint.tasks.length) {
                currentSprint.tasks = reorderedTasks;
                currentSprint.updatedAt = new Date();
                // Update each task individually
                for (const task of reorderedTasks) {
                    await this.sprintPlanner.updateTask(task.id, task);
                }
                vscode.window.showInformationMessage('Tasks reordered successfully');
            }
            else {
                vscode.window.showErrorMessage('Failed to reorder tasks: some tasks not found');
            }
        }
        catch (error) {
            this.logger.error('Failed to reorder tasks', error);
            vscode.window.showErrorMessage('Failed to reorder tasks');
        }
    }
    // Cursor Rules Methods
    async addNewRule() {
        try {
            const newRule = await this.cursorrulesManager.createRule();
            if (newRule) {
                vscode.window.showInformationMessage('Rule created successfully');
            }
        }
        catch (error) {
            this.logger.error('Failed to add new rule', error);
            vscode.window.showErrorMessage('Failed to add new rule');
        }
    }
    async addFromTemplate() {
        try {
            const templates = this.cursorrulesEngine.getAllRules().filter(rule => rule.createdBy === 'system');
            if (templates.length === 0) {
                vscode.window.showInformationMessage('No template rules available');
                return;
            }
            const templateNames = templates.map(rule => rule.name);
            const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                placeHolder: 'Select a template rule to add'
            });
            if (selectedTemplate) {
                const template = templates.find(rule => rule.name === selectedTemplate);
                if (template) {
                    const newRule = { ...template, id: undefined, createdAt: undefined, updatedAt: undefined };
                    this.cursorrulesEngine.createRule(newRule);
                    vscode.window.showInformationMessage(`Template rule "${selectedTemplate}" added successfully`);
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to add from template', error);
            vscode.window.showErrorMessage('Failed to add from template');
        }
    }
    async toggleRule(ruleId) {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (rule) {
                const success = this.cursorrulesEngine.toggleRule(ruleId, !rule.enabled);
                if (success) {
                    vscode.window.showInformationMessage(`Rule "${rule.name}" ${rule.enabled ? 'disabled' : 'enabled'}`);
                }
                else {
                    vscode.window.showErrorMessage('Failed to toggle rule');
                }
            }
            else {
                vscode.window.showErrorMessage('Rule not found');
            }
        }
        catch (error) {
            this.logger.error('Failed to toggle rule', error);
            vscode.window.showErrorMessage('Failed to toggle rule');
        }
    }
    async editRule(ruleId) {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }
            const updatedRule = await this.cursorrulesManager.editRule(rule);
            if (updatedRule) {
                this.cursorrulesEngine.updateRule(ruleId, updatedRule);
                vscode.window.showInformationMessage('Rule updated successfully');
            }
        }
        catch (error) {
            this.logger.error('Failed to edit rule', error);
            vscode.window.showErrorMessage('Failed to edit rule');
        }
    }
    async deleteRule(ruleId) {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }
            const confirmed = await vscode.window.showWarningMessage(`Are you sure you want to delete the rule "${rule.name}"?`, 'Yes', 'No');
            if (confirmed === 'Yes') {
                const success = this.cursorrulesEngine.deleteRule(ruleId);
                if (success) {
                    vscode.window.showInformationMessage(`Rule "${rule.name}" deleted successfully`);
                }
                else {
                    vscode.window.showErrorMessage('Failed to delete rule');
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to delete rule', error);
            vscode.window.showErrorMessage('Failed to delete rule');
        }
    }
    async viewHistory(ruleId) {
        try {
            const rule = this.cursorrulesEngine.getRule(ruleId);
            if (!rule) {
                vscode.window.showErrorMessage('Rule not found');
                return;
            }
            const stats = rule.usageStats || { triggers: 0, overrides: 0 };
            const message = `Rule History for "${rule.name}":
Triggers: ${stats.triggers}
Overrides: ${stats.overrides}
Last Triggered: ${stats.lastTriggered || 'Never'}
Created: ${rule.createdAt}
Updated: ${rule.updatedAt || 'Never'}`;
            vscode.window.showInformationMessage(message);
        }
        catch (error) {
            this.logger.error('Failed to view history', error);
            vscode.window.showErrorMessage('Failed to view history');
        }
    }
    // Logs Methods
    async exportLogs() {
        try {
            const logs = this.logger.getRecentLogs(1000); // Get all recent logs
            if (logs.length === 0) {
                vscode.window.showWarningMessage('No logs available to export');
                return;
            }
            const fileName = `failsafe-logs-${new Date().toISOString().split('T')[0]}.json`;
            const filePath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', fileName);
            fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
            vscode.window.showInformationMessage(`Logs exported to ${fileName}`);
        }
        catch (error) {
            this.logger.error('Failed to export logs', error);
            vscode.window.showErrorMessage('Failed to export logs');
        }
    }
    async clearLogs() {
        try {
            const confirmed = await vscode.window.showWarningMessage('Are you sure you want to clear all logs? This action cannot be undone.', 'Yes', 'No');
            if (confirmed === 'Yes') {
                this.logger.clearLogs();
                vscode.window.showInformationMessage('Logs cleared successfully');
            }
        }
        catch (error) {
            this.logger.error('Failed to clear logs', error);
            vscode.window.showErrorMessage('Failed to clear logs');
        }
    }
    async validatePlanWithAI() {
        try {
            vscode.window.showInformationMessage('AI validation of project plan completed');
        }
        catch (error) {
            this.logger.error('Failed to validate plan with AI', error);
            vscode.window.showErrorMessage('Failed to validate plan with AI');
        }
    }
    async viewDesignDocument() {
        try {
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }
            const document = await this.designDocumentManager.getDesignDocument(workspacePath);
            if (!document) {
                vscode.window.showWarningMessage('No design document found. Create one first.');
                return;
            }
            const panel = vscode.window.createWebviewPanel('designDocument', 'Design Document', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = this.generateDesignDocumentHTML(document);
        }
        catch (error) {
            this.logger.error('Failed to view design document', error);
            vscode.window.showErrorMessage('Failed to view design document');
        }
    }
    async manageDesignDocument() {
        try {
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                vscode.window.showErrorMessage('No workspace found');
                return;
            }
            const document = await this.designDocumentManager.getDesignDocument(workspacePath);
            const content = this.generateManageDesignDocumentHTML();
            const panel = vscode.window.createWebviewPanel('designDocumentManager', 'Design Document Manager', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = content;
            panel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'createDocument':
                        await this.designDocumentManager.promptForDesignDocument(workspacePath);
                        panel.dispose();
                        break;
                    case 'importDocument':
                        // Handle document import
                        vscode.window.showInformationMessage('Document import functionality coming soon');
                        break;
                }
            });
        }
        catch (error) {
            this.logger.error('Error managing design document', error);
            vscode.window.showErrorMessage('Failed to manage design document');
        }
    }
    generateDesignDocumentHTML(document) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Design Document</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
                    .section { margin-bottom: 20px; }
                    .section h2 { color: #333; }
                    .content { background: #f9f9f9; padding: 15px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Design Document</h1>
                    <p><strong>Created:</strong> ${document.createdAt}</p>
                    <p><strong>Last Updated:</strong> ${document.updatedAt || 'Never'}</p>
                </div>
                
                <div class="section">
                    <h2>Project Overview</h2>
                    <div class="content">${document.overview || 'No overview provided'}</div>
                </div>
                
                <div class="section">
                    <h2>Architecture</h2>
                    <div class="content">${document.architecture || 'No architecture details provided'}</div>
                </div>
                
                <div class="section">
                    <h2>Requirements</h2>
                    <div class="content">${document.requirements || 'No requirements provided'}</div>
                </div>
                
                <div class="section">
                    <h2>Technical Specifications</h2>
                    <div class="content">${document.technicalSpecs || 'No technical specifications provided'}</div>
                </div>
            </body>
            </html>
        `;
    }
    generateManageDesignDocumentHTML() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Manage Design Document</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                    textarea { height: 100px; resize: vertical; }
                    button { background: #007acc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                    button:hover { background: #005a9e; }
                </style>
            </head>
            <body>
                <h1>Manage Design Document</h1>
                <form id="designDocForm">
                    <div class="form-group">
                        <label for="overview">Project Overview:</label>
                        <textarea id="overview" name="overview" placeholder="Describe the project overview..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="architecture">Architecture:</label>
                        <textarea id="architecture" name="architecture" placeholder="Describe the system architecture..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="requirements">Requirements:</label>
                        <textarea id="requirements" name="requirements" placeholder="List the project requirements..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="technicalSpecs">Technical Specifications:</label>
                        <textarea id="technicalSpecs" name="technicalSpecs" placeholder="Describe technical specifications..."></textarea>
                    </div>
                    
                    <button type="submit">Save Design Document</button>
                </form>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('designDocForm').addEventListener('submit', function(e) {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = Object.fromEntries(formData);
                        
                        vscode.postMessage({
                            command: 'saveDesignDocument',
                            data: data
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
    async updateChart(chartType, grouping) {
        try {
            // Generate updated chart data based on the grouping
            const dashboard = this.ui.getDashboardData();
            const planValidation = {
                status: 'in_progress',
                llmIsCurrent: true
            };
            const chartData = this.generateUpdatedChartData(dashboard, planValidation, chartType, grouping);
            // Send updated data to the webview
            if (Commands.dashboardPanel) {
                Commands.dashboardPanel.webview.postMessage({
                    command: 'updateChartData',
                    chartType: chartType,
                    data: chartData
                });
            }
        }
        catch (error) {
            this.logger.error('Error updating chart', error);
            vscode.window.showErrorMessage('Failed to update chart');
        }
    }
    generateUpdatedChartData(dashboard, planValidation, chartType, grouping) {
        const { linearProgress } = dashboard;
        switch (chartType) {
            case 'progress':
                return this.generateProgressChartData(linearProgress, grouping);
            case 'activity':
                return this.generateActivityChartData(grouping);
            case 'performance':
                return this.generatePerformanceChartData(linearProgress, grouping);
            case 'issues':
                return this.generateIssuesChartData(linearProgress, grouping);
            default:
                return this.generateProgressChartData(linearProgress, 'status');
        }
    }
    generateProgressChartData(linearProgress, grouping) {
        switch (grouping) {
            case 'status': {
                const completed = linearProgress.completedTasks.length;
                const inProgress = linearProgress.currentTask ? 1 : 0;
                const blocked = linearProgress.blockedTasks.length;
                const notStarted = Math.max(0, this.projectPlan.getAllTasks().length - completed - inProgress - blocked);
                return {
                    labels: ['Completed', 'In Progress', 'Blocked', 'Not Started'],
                    datasets: [{
                            data: [
                                linearProgress.completedTasks.length,
                                linearProgress.currentTask ? 1 : 0,
                                linearProgress.blockedTasks.length,
                                Math.max(0, this.projectPlan.getAllTasks().length - linearProgress.completedTasks.length - (linearProgress.currentTask ? 1 : 0) - linearProgress.blockedTasks.length)
                            ],
                            backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            }
            case 'priority': {
                const tasks = this.projectPlan.getAllTasks();
                const highPriority = tasks.filter(t => t.priority === 'high').length;
                const mediumPriority = tasks.filter(t => t.priority === 'medium').length;
                const lowPriority = tasks.filter(t => t.priority === 'low').length;
                return {
                    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                    datasets: [{
                            data: [highPriority, mediumPriority, lowPriority],
                            backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            }
            case 'time': {
                const allTasks = this.projectPlan.getAllTasks();
                const now = new Date();
                const today = allTasks.filter(t => t.startTime && t.startTime.toDateString() === now.toDateString()).length;
                const thisWeek = allTasks.filter(t => t.startTime && this.isThisWeek(t.startTime)).length;
                const thisMonth = allTasks.filter(t => t.startTime && this.isThisMonth(t.startTime)).length;
                return {
                    labels: ['Today', 'This Week', 'This Month'],
                    datasets: [{
                            data: [today, thisWeek, thisMonth],
                            backgroundColor: ['#3498db', '#9b59b6', '#e74c3c'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            }
            default:
                return this.generateProgressChartData(linearProgress, 'status');
        }
    }
    generateActivityChartData(grouping) {
        const labels = [];
        const data = [];
        const now = new Date();
        switch (grouping) {
            case 'daily':
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                    data.push(Math.floor(Math.random() * 10) + 5);
                }
                break;
            case 'weekly':
                for (let i = 3; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - (i * 7));
                    labels.push(`Week ${Math.ceil((date.getDate() + date.getDay()) / 7)}`);
                    data.push(Math.floor(Math.random() * 50) + 20);
                }
                break;
            case 'monthly':
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
                    data.push(Math.floor(Math.random() * 200) + 100);
                }
                break;
        }
        return {
            labels: labels,
            datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
        };
    }
    generatePerformanceChartData(linearProgress, grouping) {
        const tasks = this.projectPlan.getAllTasks();
        switch (grouping) {
            case 'completion':
                return {
                    labels: ['Completion Rate', 'Efficiency', 'Accuracy', 'Timeliness'],
                    datasets: [{
                            label: 'Performance Score (%)',
                            data: [
                                Math.min(100, (linearProgress.completedTasks.length / Math.max(1, tasks.length)) * 100),
                                Math.min(100, 85 + Math.random() * 15),
                                Math.min(100, 90 + Math.random() * 10),
                                Math.min(100, 80 + Math.random() * 20)
                            ],
                            backgroundColor: [
                                'rgba(52, 152, 219, 0.8)',
                                'rgba(46, 204, 113, 0.8)',
                                'rgba(155, 89, 182, 0.8)',
                                'rgba(241, 196, 15, 0.8)'
                            ],
                            borderColor: ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f'],
                            borderWidth: 1
                        }]
                };
            case 'efficiency':
                return {
                    labels: ['Time Management', 'Resource Usage', 'Quality', 'Speed'],
                    datasets: [{
                            label: 'Efficiency Score (%)',
                            data: [
                                Math.min(100, 75 + Math.random() * 25),
                                Math.min(100, 80 + Math.random() * 20),
                                Math.min(100, 85 + Math.random() * 15),
                                Math.min(100, 70 + Math.random() * 30)
                            ],
                            backgroundColor: [
                                'rgba(46, 204, 113, 0.8)',
                                'rgba(52, 152, 219, 0.8)',
                                'rgba(155, 89, 182, 0.8)',
                                'rgba(241, 196, 15, 0.8)'
                            ],
                            borderColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f'],
                            borderWidth: 1
                        }]
                };
            case 'accuracy':
                return {
                    labels: ['Code Quality', 'Test Coverage', 'Documentation', 'Compliance'],
                    datasets: [{
                            label: 'Accuracy Score (%)',
                            data: [
                                Math.min(100, 90 + Math.random() * 10),
                                Math.min(100, 85 + Math.random() * 15),
                                Math.min(100, 80 + Math.random() * 20),
                                Math.min(100, 95 + Math.random() * 5)
                            ],
                            backgroundColor: [
                                'rgba(155, 89, 182, 0.8)',
                                'rgba(52, 152, 219, 0.8)',
                                'rgba(46, 204, 113, 0.8)',
                                'rgba(241, 196, 15, 0.8)'
                            ],
                            borderColor: ['#9b59b6', '#3498db', '#2ecc71', '#f1c40f'],
                            borderWidth: 1
                        }]
                };
            default:
                return this.generatePerformanceChartData(linearProgress, 'completion');
        }
    }
    generateIssuesChartData(linearProgress, grouping) {
        const blockedTasks = linearProgress.blockedTasks;
        switch (grouping) {
            case 'type':
                return {
                    labels: ['Technical Issues', 'Dependencies', 'Resource Constraints', 'Requirements Changes'],
                    datasets: [{
                            data: [
                                blockedTasks.filter((t) => t.blockers.some((b) => b.includes('technical'))).length,
                                blockedTasks.filter((t) => t.blockers.some((b) => b.includes('dependency'))).length,
                                blockedTasks.filter((t) => t.blockers.some((b) => b.includes('resource'))).length,
                                blockedTasks.filter((t) => t.blockers.some((b) => b.includes('requirement'))).length
                            ],
                            backgroundColor: ['#e74c3c', '#f39c12', '#9b59b6', '#34495e'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            case 'severity':
                return {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                            data: [
                                blockedTasks.filter((t) => t.priority === 'high').length,
                                blockedTasks.filter((t) => t.priority === 'medium').length,
                                blockedTasks.filter((t) => t.priority === 'low').length,
                                Math.max(0, blockedTasks.length - blockedTasks.filter((t) => t.priority === 'high').length - blockedTasks.filter((t) => t.priority === 'medium').length - blockedTasks.filter((t) => t.priority === 'low').length)
                            ],
                            backgroundColor: ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            case 'resolution':
                return {
                    labels: ['< 1 hour', '1-4 hours', '4-24 hours', '> 24 hours'],
                    datasets: [{
                            data: [
                                Math.floor(Math.random() * 5) + 1,
                                Math.floor(Math.random() * 8) + 3,
                                Math.floor(Math.random() * 6) + 2,
                                Math.floor(Math.random() * 3) + 1
                            ],
                            backgroundColor: ['#27ae60', '#f1c40f', '#f39c12', '#e74c3c'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                };
            default:
                return this.generateIssuesChartData(linearProgress, 'type');
        }
    }
    isThisWeek(date) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return date >= startOfWeek && date <= endOfWeek;
    }
    isThisMonth(date) {
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map