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
            vscode.commands.registerCommand('failsafe.markTaskComplete', this.markTaskComplete.bind(this))
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
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map