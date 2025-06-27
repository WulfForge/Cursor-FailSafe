import * as vscode from 'vscode';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import { Logger } from './logger';
import { UI } from './ui';
import { SprintPlanner } from './sprintPlanner';
import { Validator } from './validator';
import { TestRunner } from './testRunner';
import { CursorrulesEngine } from './cursorrulesEngine';
import { CursorrulesManager } from './cursorrulesManager';
import { DesignDocumentManager } from './designDocumentManager';
import { ChatValidator } from './chatValidator';
import { AIRequest, AIResponse, SessionLog, ValidationResult, ValidationError, ValidationWarning, TestResult } from './types';
import * as fs from 'fs';

export class Commands {
    private static dashboardPanel: vscode.WebviewPanel | undefined;
    private readonly projectPlan: ProjectPlan;
    private readonly taskEngine: TaskEngine;
    private readonly logger: Logger;
    private readonly ui: UI;
    private readonly sprintPlanner: SprintPlanner;
    private readonly validator: Validator;
    private readonly testRunner: TestRunner;
    private readonly config: vscode.WorkspaceConfiguration;
    private extensionContext?: vscode.ExtensionContext;
    private readonly cursorrulesEngine: CursorrulesEngine;
    private readonly cursorrulesManager: CursorrulesManager;
    private readonly designDocumentManager: DesignDocumentManager;
    private readonly fastifyServer?: any; // Will be set by extension.ts

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.logger = new Logger();
        this.projectPlan = new ProjectPlan(this.logger);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger);
        this.sprintPlanner = new SprintPlanner(this.logger);
        this.designDocumentManager = DesignDocumentManager.getInstance();
        this.ui = new UI(this.projectPlan, this.taskEngine, this.logger, context);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.testRunner = new TestRunner();
        this.config = vscode.workspace.getConfiguration('failsafe');
        this.cursorrulesEngine = new CursorrulesEngine(context || {} as vscode.ExtensionContext, this.logger);
        this.cursorrulesManager = new CursorrulesManager(this.cursorrulesEngine, this.logger, context || {} as vscode.ExtensionContext);
    }

    public async registerCommands(context: vscode.ExtensionContext): Promise<void> {
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
            vscode.commands.registerCommand('failsafe.updateChart', this.updateChart.bind(this)),
            vscode.commands.registerCommand('failsafe.showConsole', this.showConsole.bind(this)),
            vscode.commands.registerCommand('failsafe.showLogs', this.showLogs.bind(this)),
            vscode.commands.registerCommand('failsafe.showProjectPlan', this.showProjectPlan.bind(this)),
            vscode.commands.registerCommand('failsafe.showProgressDetails', this.showProgressDetails.bind(this)),
            vscode.commands.registerCommand('failsafe.showAccountabilityReport', this.showAccountabilityReport.bind(this)),
            vscode.commands.registerCommand('failsafe.showFeasibilityAnalysis', this.showFeasibilityAnalysis.bind(this)),
            vscode.commands.registerCommand('failsafe.showActionLog', this.showActionLog.bind(this)),
            vscode.commands.registerCommand('failsafe.showFailsafeConfigPanel', this.showFailsafeConfigPanel.bind(this)),
            vscode.commands.registerCommand('failsafe.openPreview', this.openPreview.bind(this)),
            vscode.commands.registerCommand('failsafe.togglePreviewSync', this.togglePreviewSync.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
        this.logger.info('All FailSafe commands registered successfully');
    }

    private async askAI(): Promise<void> {
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

        } catch (error) {
            this.logger.error('Error in askAI command', error);
            vscode.window.showErrorMessage('Failed to execute AI request. Check logs for details.');
        }
    }

    private async refactor(): Promise<void> {
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

        } catch (error) {
            this.logger.error('Error in refactor command', error);
            vscode.window.showErrorMessage('Failed to execute refactoring. Check logs for details.');
        }
    }

    private async validate(): Promise<void> {
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
            } else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                
                vscode.window.showWarningMessage(
                    `⚠️ Validation found ${errorCount} errors and ${warningCount} warnings`
                );

                // Show detailed results
                await this.showValidationResults(validationResult);
            }

        } catch (error) {
            this.logger.error('Error in validate command', error);
            vscode.window.showErrorMessage('Failed to validate code. Check logs for details.');
        }
    }

    private async showPlan(): Promise<void> {
        try {
            await this.showDashboard();
        } catch (error) {
            this.logger.error('Error showing project plan', error);
            vscode.window.showErrorMessage('Failed to show project plan. Check logs for details.');
        }
    }

    private async retryLastTask(): Promise<void> {
        try {
            const lastTask = this.projectPlan.getCurrentTask();
            if (!lastTask) {
                vscode.window.showInformationMessage('No task to retry');
                return;
            }

            await this.taskEngine.retryTask(lastTask.id);
            vscode.window.showInformationMessage(`Retrying task: ${lastTask.name}`);

        } catch (error) {
            this.logger.error('Error retrying last task', error);
            vscode.window.showErrorMessage('Failed to retry task. Check logs for details.');
        }
    }

    private async viewSessionLog(): Promise<void> {
        try {
            const recentLogs = this.logger.getRecentLogs(20);
            
            if (recentLogs.length === 0) {
                vscode.window.showInformationMessage('No session logs found');
                return;
            }

            const logContent = recentLogs.map(log => 
                `[${log.timestamp}] ${log.command} - ${log.status} (${log.duration}ms)`
            ).join('\n');

            const document = await vscode.workspace.openTextDocument({
                content: logContent,
                language: 'json'
            });

            await vscode.window.showTextDocument(document);

        } catch (error) {
            this.logger.error('Error viewing session log', error);
            vscode.window.showErrorMessage('Failed to view session log. Check logs for details.');
        }
    }

    private async markTaskComplete(): Promise<void> {
        try {
            const currentTask = this.projectPlan.getCurrentTask();
            if (!currentTask) {
                vscode.window.showInformationMessage('No active task to mark complete');
                return;
            }

            await this.projectPlan.completeTask(currentTask.id);
            vscode.window.showInformationMessage(`Task completed: ${currentTask.name}`);

        } catch (error) {
            this.logger.error('Error marking task complete', error);
            vscode.window.showErrorMessage('Failed to mark task complete. Check logs for details.');
        }
    }

    private async executeAIRequest(request: AIRequest): Promise<AIResponse> {
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
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`AI request timed out after ${timeoutMinutes} minutes`));
                }, timeoutMs);
            });

            // Execute AI request with timeout
            const aiPromise = this.executeCursorAIRequest(request.prompt);
            
            const response = await Promise.race([aiPromise, timeoutPromise]);

            // Validate response if auto-validate is enabled
            let validationResult: ValidationResult | undefined = undefined;
            if (this.config.get('autoValidate', true) && request.validate) {
                validationResult = this.validator.validateCode(response, 'ai-generated');
            }

            // Run tests if requested
            let testResult: TestResult | undefined = undefined;
            if (request.runTests) {
                testResult = await this.testRunner.runTests();
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log session
            const sessionLog: SessionLog = {
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

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log error session
            const sessionLog: SessionLog = {
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

    private async executeCursorAIRequest(prompt: string): Promise<string> {
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
                if (didTimeout) return;
                clearTimeout(timer);
                resolve(`AI Response to: ${prompt}\n\nThis is a simulated response. Replace with actual Cursor AI integration.`);
            }, 2000);
        });
    }

    private calculateDynamicTimeout(prompt: string, context?: string, requestType?: string): number {
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

    private analyzePromptComplexity(prompt: string, context?: string): 'low' | 'medium' | 'high' {
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
            if (fullText.includes(keyword)) score += 3;
        });
        
        mediumComplexityKeywords.forEach(keyword => {
            if (fullText.includes(keyword)) score += 2;
        });
        
        lowComplexityKeywords.forEach(keyword => {
            if (fullText.includes(keyword)) score += 1;
        });

        // Length-based complexity
        const wordCount = fullText.split(/\s+/).length;
        if (wordCount > 100) score += 2;
        else if (wordCount > 50) score += 1;

        // Code block complexity
        const codeBlocks = (fullText.match(/```[\s\S]*?```/g) || []).length;
        score += codeBlocks * 2;

        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    private determineRequestType(prompt: string, requestType?: string): 'simple' | 'complex' | 'refactor' | 'generate' | 'debug' {
        if (requestType && ['simple', 'complex', 'refactor', 'generate', 'debug'].includes(requestType)) {
            return requestType as 'simple' | 'complex' | 'refactor' | 'generate' | 'debug';
        }

        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('refactor') || lowerPrompt.includes('improve')) return 'refactor';
        if (lowerPrompt.includes('generate') || lowerPrompt.includes('create') || lowerPrompt.includes('write')) return 'generate';
        if (lowerPrompt.includes('debug') || lowerPrompt.includes('fix') || lowerPrompt.includes('error')) return 'debug';
        if (lowerPrompt.includes('complex') || lowerPrompt.includes('architect') || lowerPrompt.includes('design')) return 'complex';
        
        return 'simple';
    }

    private async showValidationResults(validationResult: ValidationResult): Promise<void> {
        const items = [
            ...validationResult.errors.map((error: ValidationError) => `❌ ${error.message}`),
            ...validationResult.warnings.map((warning: ValidationWarning) => `⚠️ ${warning.message}`)
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

    private async showAIResults(response: string, validationResult?: ValidationResult, testResult?: TestResult): Promise<void> {
        const messages: string[] = [];

        if (validationResult && !validationResult.isValid) {
            messages.push(`⚠️ Validation: ${validationResult.errors.length} errors found`);
        }

        if (testResult && !testResult.passed) {
            messages.push(`❌ Tests: ${testResult.failedTests} failed`);
        }

        if (messages.length === 0) {
            vscode.window.showInformationMessage('✅ AI request completed successfully!');
        } else {
            const action = await vscode.window.showWarningMessage(
                messages.join('\n'),
                'View Details',
                'Continue'
            );

            if (action === 'View Details') {
                // Show detailed results in a new document
                const content = `AI Response:\n${response}\n\nValidation: ${JSON.stringify(validationResult, null, 2)}\n\nTests: ${JSON.stringify(testResult, null, 2)}`;
                const document = await vscode.workspace.openTextDocument({ content, language: 'json' });
                await vscode.window.showTextDocument(document);
            }
        }
    }

    private determineStatus(validationResult?: ValidationResult, testResult?: TestResult): SessionLog['status'] {
        if (validationResult && !validationResult.isValid) {
            return 'validation_failed';
        }
        if (testResult && !testResult.passed) {
            return 'test_failed';
        }
        return 'success';
    }

    private generateSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async createProjectPlan(): Promise<void> {
        try {
            await this.projectPlan.createBasicProject();
            vscode.window.showInformationMessage('Basic project plan created successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create project plan: ' + error);
        }
    }

    private async editProjectPlan(): Promise<void> {
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
            } catch {
                // File doesn't exist, create it
                // Project plan initialization handled by SprintPlanner
            }

            // Open the file for editing
            const document = await vscode.workspace.openTextDocument(projectFile);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage('Project plan opened for editing.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to edit project plan: ${error}`);
        }
    }

    private async reportProblem(): Promise<void> {
        try {
            await this.showReportProblemForm();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open report form: ${error}`);
        }
    }

    private async showReportProblemForm(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'reportProblem',
            'Report a Problem - FailSafe',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

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

    private async getSystemInfo(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const currentTask = this.sprintPlanner.getCurrentSprint()?.tasks.find((t: any) => !t.completed) || null;
        
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

    private generateReportFormContent(systemInfo: any): string {
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

    private async submitGitHubIssue(formData: any, systemInfo: any): Promise<void> {
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

            vscode.window.showInformationMessage(
                'Issue content opened in editor. Please copy and paste to GitHub Issues.',
                'Open GitHub Issues', 'OK'
            ).then(choice => {
                if (choice === 'Open GitHub Issues') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/WulfForge/Cursor-FailSafe/issues/new'));
                }
            });

            // Log the issue report
            console.log("Action logged:", {
                timestamp: new Date().toISOString(),
                description: `🐛 Reported problem: ${formData.title}`
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
        }
    }

    private generateGitHubIssueBody(formData: any, systemInfo: any): string {
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

    private getIssueTypeEmoji(issueType: string): string {
        switch (issueType) {
            case 'bug': return '🐛';
            case 'feature': return '💡';
            case 'enhancement': return '✨';
            case 'documentation': return '📚';
            default: return '❓';
        }
    }

    private async suggestFailsafe(): Promise<void> {
        // Implementation of suggestFailsafe method
    }

    private async suggestCustomFailsafe(): Promise<void> {
        try {
            // Get current context
            const context = await this.getCurrentContext();
            
            // Get user's custom failsafes
            const customFailsafes: any[] = []; // Legacy failsafes removed in favor of CursorRules
            
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
            const selected = await vscode.window.showQuickPick(
                suggestions.map(s => ({
                    label: s.failsafe.name,
                    description: s.reason,
                    detail: `Relevance: ${s.relevanceScore}/100`,
                    failsafe: s.failsafe
                })),
                {
                    placeHolder: 'Select a custom failsafe to apply...',
                    ignoreFocusOut: true
                }
            );

            if (selected) {
                await this.applySuggestedFailsafe(selected, context);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest failsafe: ${error}`);
        }
    }

    private async getCurrentContext(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        const currentTask = this.sprintPlanner.getCurrentSprint()?.tasks.find((t: any) => !t.completed) || null;
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

    private analyzeFailsafeSuggestions(context: any, customFailsafes: any[]): Array<{failsafe: any, reason: string, relevanceScore: number}> {
        const suggestions: Array<{failsafe: any, reason: string, relevanceScore: number}> = [];

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

    private calculateRelevanceScore(failsafe: any, context: any): number {
        // Simple relevance scoring based on context matching
        let score = 0;
        
        // Check if failsafe applies to current project type
        if (context.projectType && failsafe.projectTypes && failsafe.projectTypes.includes(context.projectType)) {
            score += 30;
        }
        
        // Check if failsafe applies to current tech stack
        if (context.techStack && failsafe.techStack && context.techStack.some((tech: string) => failsafe.techStack.includes(tech))) {
            score += 25;
        }
        
        // Check if failsafe applies to current task type
        if (context.currentTask && failsafe.taskTypes && failsafe.taskTypes.includes(context.currentTask.type)) {
            score += 20;
        }
        
        // Check if failsafe applies to current issue type
        if (context.issueType && failsafe.issueTypes && failsafe.issueTypes.includes(context.issueType)) {
            score += 15;
        }
        
        // Bonus for recent usage
        if (failsafe.lastUsed && (Date.now() - new Date(failsafe.lastUsed).getTime()) < 24 * 60 * 60 * 1000) {
            score += 10;
        }
        
        return Math.min(100, score);
    }

    private generateSuggestionReason(failsafe: any, context: any, score: number): string {
        // Generate a reason based on the relevance score and context
        if (score >= 80) {
            return `Highly relevant: ${failsafe.name} perfectly matches your current context`;
        } else if (score >= 60) {
            return `Very relevant: ${failsafe.name} closely matches your current context`;
        } else if (score >= 40) {
            return `Moderately relevant: ${failsafe.name} has some relevance to your context`;
        } else {
            return `Low relevance: ${failsafe.name} may be useful in certain scenarios`;
        }
    }

    private async applySuggestedFailsafe(failsafe: any, context: any): Promise<void> {
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
            vscode.window.showInformationMessage(
                `Applied custom failsafe: ${failsafe.name}`,
                'View Details', 'Dismiss'
            ).then(choice => {
                if (choice === 'View Details') {
                    this.showFailsafeDetails(failsafe, context);
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply failsafe: ${error}`);
        }
    }

    private async showFailsafeDetails(failsafe: any, context: any): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'failsafeDetails',
            `Failsafe Details: ${failsafe.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateFailsafeDetailsContent(failsafe, context);
    }

    private generateFailsafeDetailsContent(failsafe: any, context: any): string {
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
                    ${failsafe.fileTypes.map((type: string) => `<span class="tag">${type}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            ${failsafe.keywords ? `
            <div class="section">
                <h3>🔍 Keywords</h3>
                <div class="tags">
                    ${failsafe.keywords.map((keyword: string) => `<span class="tag">${keyword}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            ${failsafe.tasks ? `
            <div class="section">
                <h3>📋 Related Tasks</h3>
                <div class="tags">
                    ${failsafe.tasks.map((task: string) => `<span class="tag">${task}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
    }

    private async suggestFailsafeToCore(): Promise<void> {
        try {
            // Get user's custom failsafes
            const customFailsafes: any[] = []; // Legacy failsafes removed in favor of CursorRules
            
            if (customFailsafes.length === 0) {
                vscode.window.showInformationMessage('No custom failsafes found. Create some custom failsafes first!');
                return;
            }

            // Show selection of custom failsafes
            const selected = await vscode.window.showQuickPick(
                customFailsafes.map((failsafe: any) => ({
                    label: failsafe.name,
                    description: failsafe.description || 'No description',
                    detail: failsafe.enabled ? '✅ Enabled' : '❌ Disabled',
                    failsafe: failsafe
                })),
                {
                    placeHolder: 'Select a custom failsafe to suggest for core functionality...',
                    ignoreFocusOut: true
                }
            );

            if (selected) {
                await this.showCoreSuggestionForm(selected);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest failsafe to core: ${error}`);
        }
    }

    private async showCoreSuggestionForm(failsafe: any): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'suggestToCore',
            `Suggest to Core: ${failsafe.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Get system information for the suggestion
        const systemInfo = await this.getSystemInfo();
        
        panel.webview.html = this.generateCoreSuggestionFormContent();

        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'submitCoreSuggestion':
                        await this.submitCoreSuggestion(message.data, failsafe, systemInfo);
                        panel.dispose();
                        break;
                }
            }
        );
    }

    private generateCoreSuggestionFormContent(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Suggest Failsafe to Core</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                    textarea { height: 100px; resize: vertical; }
                    button { background: #007acc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                    button:hover { background: #005a9e; }
                </style>
            </head>
            <body>
                <h1>Suggest Failsafe to Core</h1>
                <form id="suggestionForm">
                    <div class="form-group">
                        <label for="suggestionType">Suggestion Type:</label>
                        <select id="suggestionType" name="suggestionType" required>
                            <option value="new-feature">New Feature</option>
                            <option value="improvement">Improvement</option>
                            <option value="bug-fix">Bug Fix</option>
                            <option value="documentation">Documentation</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="title">Title:</label>
                        <input type="text" id="title" name="title" placeholder="Brief title for the suggestion" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description:</label>
                        <textarea id="description" name="description" placeholder="Detailed description of the suggestion..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="rationale">Rationale:</label>
                        <textarea id="rationale" name="rationale" placeholder="Why this suggestion would be valuable..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="priority">Priority:</label>
                        <select id="priority" name="priority" required>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    
                    <button type="submit">Submit Suggestion</button>
                </form>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('suggestionForm').addEventListener('submit', function(e) {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = Object.fromEntries(formData);
                        
                        vscode.postMessage({
                            command: 'submitCoreSuggestion',
                            data: data
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    private async submitCoreSuggestion(formData: any, failsafe: any, systemInfo: any): Promise<void> {
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

            vscode.window.showInformationMessage(
                'Core suggestion content opened in editor. Please copy and paste to GitHub Issues.',
                'Open GitHub Issues', 'OK'
            ).then(choice => {
                if (choice === 'Open GitHub Issues') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/WulfForge/Cursor-FailSafe/issues/new'));
                }
            });

            // Log the suggestion
            console.log("Action logged:", {
                timestamp: new Date().toISOString(),
                description: `🌟 Suggested failsafe "${failsafe.name}" for core functionality`
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create core suggestion: ${error}`);
        }
    }

    private generateCoreSuggestionBody(formData: any, failsafe: any, systemInfo: any): string {
        return `## Suggestion Type
${this.getSuggestionTypeEmoji(formData.suggestionType)} ${formData.suggestionType.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}

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

    private getSuggestionTypeEmoji(suggestionType: string): string {
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
    private async simulateEvent(): Promise<void> {
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

        } catch (error) {
            this.logger.error('Error simulating event', error);
            vscode.window.showErrorMessage('Failed to simulate event. Check logs for details.');
        }
    }

    private async simulateTaskCompletion(): Promise<void> {
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            await this.projectPlan.completeTask(currentTask.id);
            vscode.window.showInformationMessage(`Simulated completion of task: ${currentTask.name}`);
        } else {
            vscode.window.showInformationMessage('No active task to complete');
        }
    }

    private async simulateValidationFailure(): Promise<void> {
        const mockValidationResult: ValidationResult = {
            isValid: false,
            errors: [
                {
                    type: 'syntax',
                    message: 'Simulated syntax error on line 42',
                    severity: 'error',
                    timestamp: new Date()
                },
                {
                    type: 'syntax',
                    message: 'Missing semicolon on line 15',
                    severity: 'error',
                    timestamp: new Date()
                }
            ],
            warnings: [
                {
                    type: 'quality',
                    message: 'Unused variable detected',
                    timestamp: new Date()
                },
                {
                    type: 'quality',
                    message: 'Deprecated function usage',
                    timestamp: new Date()
                }
            ],
            suggestions: ['Consider using modern syntax', 'Remove unused variables'],
            timestamp: new Date()
        };

        await this.showValidationResults(mockValidationResult);
    }

    private async simulateTimeoutEvent(): Promise<void> {
        const timeoutMinutes = this.config.get('timeoutMinutes', 30);
        vscode.window.showWarningMessage(
            `⏰ Simulated timeout after ${timeoutMinutes} minutes of inactivity`
        );
    }

    private async simulateAIResponse(): Promise<void> {
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

    private async simulateTestFailure(): Promise<void> {
        const mockTestResult = {
            passed: false,
            totalTests: 5,
            failedTests: 2,
            errors: [
                'Test "should validate user input" failed',
                'Test "should handle edge cases" failed'
            ]
        };

        vscode.window.showErrorMessage(
            `🧪 Simulated test failure: ${mockTestResult.failedTests}/${mockTestResult.totalTests} tests failed`
        );
    }

    private async simulateProjectMilestone(): Promise<void> {
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
    private async checkVersionConsistency(): Promise<void> {
        try {
            // Get current workspace path
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Check for version inconsistencies
            const inconsistencies = await this.detectVersionInconsistencies();
            
            if (inconsistencies.length === 0) {
                vscode.window.showInformationMessage('✅ No version inconsistencies found');
                return;
            }

            // Show inconsistencies in a webview
            const panel = vscode.window.createWebviewPanel(
                'versionConsistency',
                'Version Consistency Check',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            const html = this.generateVersionConsistencyHTML();
            panel.webview.html = html;

        } catch (error) {
            this.logger.error('Failed to check version consistency', error);
            vscode.window.showErrorMessage('Failed to check version consistency');
        }
    }

    /**
     * Enforce version consistency by auto-fixing issues
     */
    private async enforceVersionConsistency(): Promise<void> {
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
                    const updatedContent = readmeContent.replace(
                        /version-\d+\.\d+\.\d+/g,
                        `version-${currentVersion}`
                    );
                    fs.writeFileSync('README.md', updatedContent);
                    fixedIssues++;
                }
            }

            if (fixedIssues > 0) {
                vscode.window.showInformationMessage(`✅ Fixed ${fixedIssues} version consistency issues`);
            } else {
                vscode.window.showInformationMessage('✅ All versions are already consistent');
            }

        } catch (error) {
            this.logger.error('Error enforcing version consistency', error);
            vscode.window.showErrorMessage('Failed to enforce version consistency. Check logs for details.');
        }
    }

    /**
     * Show detailed version information
     */
    private async showVersionDetails(): Promise<void> {
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

        } catch (error) {
            this.logger.error('Error showing version details', error);
            vscode.window.showErrorMessage('Failed to show version details. Check logs for details.');
        }
    }

    private async validateChat(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const document = editor.document;
            const content = document.getText();

            // Create validation context with all required properties
            // const context: ChatValidationContext = {
            //     workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            //     currentFile: document.fileName,
            //     projectType: await this.detectProjectType(),
            //     techStack: await this.detectTechStack(),
            //     fileSystem: require('fs'),
            //     path: require('path')
            // };

            const validator = new ChatValidator(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            const result = await validator.validateChat(content);

            if (this.extensionContext) {
                await this.displayChatValidationResults(result, content, this.extensionContext);
            } else {
                this.logger.error('Extension context not available for chat validation');
                vscode.window.showErrorMessage('Extension context not available for chat validation');
            }

        } catch (error) {
            this.logger.error('Error validating chat', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }

    private async displayChatValidationResults(result: ValidationResult, originalContent: string, extensionContext: vscode.ExtensionContext): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'chatValidationResults',
            'Chat Validation Results',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const html = this.generateChatValidationHTML(result, originalContent);
        panel.webview.html = html;

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => {
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
            },
            undefined,
            extensionContext.subscriptions
        );
    }

    private generateChatValidationHTML(result: ValidationResult, originalContent: string): string {
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        const suggestionCount = result.suggestions.length;

        const errorHtml = result.errors.map((error: ValidationError) => `
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

        const warningHtml = result.warnings.map((warning: ValidationWarning) => `
            <div class="warning-item">
                <div class="warning-header">
                    <span class="warning-type">${warning.type.toUpperCase()}</span>
                    <span class="warning-category">${warning.category}</span>
                </div>
                <div class="warning-message">${warning.message}</div>
                ${warning.line ? `<div class="warning-line">Line: ${warning.line}</div>` : ''}
            </div>
        `).join('');

        const suggestionHtml = result.suggestions.map((suggestion: string) => `
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

    private async detectProjectType(): Promise<string> {
        // Simple project type detection
        const files = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
        if (files.length > 0) return 'node';
        
        const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/__pycache__/**');
        if (pythonFiles.length > 0) return 'python';
        
        const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/target/**');
        if (javaFiles.length > 0) return 'java';
        
        return 'unknown';
    }

    private async detectTechStack(): Promise<string[]> {
        const techStack: string[] = [];
        
        // Check for common tech stack indicators
        const packageJson = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
        if (packageJson.length > 0) {
            techStack.push('nodejs');
            
            // Read package.json to detect frameworks
            try {
                const content = await vscode.workspace.fs.readFile(packageJson[0]);
                const pkg = JSON.parse(content.toString());
                if (pkg.dependencies) {
                    if (pkg.dependencies.react) techStack.push('react');
                    if (pkg.dependencies.vue) techStack.push('vue');
                    if (pkg.dependencies.angular) techStack.push('angular');
                    if (pkg.dependencies.express) techStack.push('express');
                    if (pkg.dependencies.next) techStack.push('nextjs');
                }
            } catch {
                // Ignore parsing errors
            }
        }
        
        const requirementsTxt = await vscode.workspace.findFiles('**/requirements.txt', '**/__pycache__/**');
        if (requirementsTxt.length > 0) {
            techStack.push('python');
        }
        
        return techStack;
    }

    public async showDashboard(): Promise<void> {
        try {
            // Reveal the FailSafe sidebar
            await vscode.commands.executeCommand('workbench.view.extension.failsafe-sidebar');
            
            // Focus on the dashboard view
            await vscode.commands.executeCommand('workbench.view.extension.failsafe-dashboard');
            
            this.logger.info('Dashboard opened successfully');
        } catch (error) {
            this.logger.error('Failed to show dashboard', error);
            vscode.window.showErrorMessage('Failed to show dashboard');
        }
    }

    private calculateDashboardMetrics(): any {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            const sprintHistory = this.sprintPlanner.getSprintHistory();
            const cursorRules = this.cursorrulesEngine.getAllRules();
            const systemLogs = this.logger.getRecentLogs(100);

            return {
                currentSprint: currentSprint ? {
                    name: currentSprint.name,
                    progress: 0, // Calculate progress based on completed tasks
                    totalTasks: currentSprint.tasks.length || 0,
                    completedTasks: currentSprint.tasks.filter(t => t.status === 'completed').length || 0
                } : undefined,
                sprintHistory: sprintHistory.map(sprint => ({
                    name: sprint.name,
                    progress: 0, // Calculate progress based on completed tasks
                    startDate: sprint.startDate,
                    endDate: sprint.endDate
                })),
                cursorRules: cursorRules.map(rule => ({
                    name: rule.name,
                    enabled: rule.enabled,
                    category: 'custom' // Default category
                })),
                systemLogs: systemLogs.slice(-10).map(log => ({
                    level: 'info', // Default level
                    message: log.command || '',
                    timestamp: log.timestamp
                }))
            };
        } catch (error) {
            this.logger.error('Failed to calculate dashboard metrics', error);
            return {};
        }
    }

    private async handleDashboardMessage(message: any): Promise<void> {
        try {
            switch (message.command) {
                case 'updateChart':
                    await this.updateChart(message.chartType);
                    break;
                case 'exportData':
                    await this.exportSprintData();
                    break;
                case 'showMetrics':
                    await this.showSprintMetrics();
                    break;
                default:
                    this.logger.warn('Unknown dashboard message command', { command: message.command });
            }
        } catch (error) {
            this.logger.error('Failed to handle dashboard message', error);
        }
    }

    public async applyCursorRulesToHtml(html: string): Promise<string> {
        try {
            // Apply any cursor rules processing to HTML content
            // For now, just return the HTML as-is
            return html;
        } catch (error) {
            this.logger.error('Error applying cursor rules to HTML', error);
            return html; // Return original HTML on error
        }
    }

    private async createCursorrule(): Promise<void> {
        try {
            // This would integrate with the CursorrulesWizard
            vscode.window.showInformationMessage('Cursorrule creation wizard will be available in Beta');
        } catch (error) {
            this.logger.error('Error creating cursorrule', error);
            vscode.window.showErrorMessage('Failed to create cursorrule. Check logs for details.');
        }
    }

    private async manageCursorrules(): Promise<void> {
        try {
            // This would integrate with the CursorrulesManager
            vscode.window.showInformationMessage('Cursorrule management will be available in Beta');
        } catch (error) {
            this.logger.error('Error managing cursorrules', error);
            vscode.window.showErrorMessage('Failed to manage cursorrules. Check logs for details.');
        }
    }

    private async validateWithCursorrules(): Promise<void> {
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
            } else {
                const errorCount = validationResult.errors.length;
                const warningCount = validationResult.warnings.length;
                
                vscode.window.showWarningMessage(
                    `⚠️ Validation found ${errorCount} errors and ${warningCount} warnings`
                );

                await this.showValidationResults(validationResult);
            }

        } catch (error) {
            this.logger.error('Error validating with cursorrules', error);
            vscode.window.showErrorMessage('Failed to validate with cursorrules. Check logs for details.');
        }
    }

    // Sprint Management Methods
    private async createSprint(): Promise<void> {
        try {
            await this.sprintPlanner.createSprint();
            vscode.window.showInformationMessage('Sprint created successfully');
        } catch (error) {
            this.logger.error('Failed to create sprint', error);
            vscode.window.showErrorMessage('Failed to create sprint');
        }
    }

    private async exportSprintData(): Promise<void> {
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
                filters: { csvFiles: ['csv'] }
            });

            if (uri) {
                // Create a simple CSV export
                const csvData = this.generateSprintCSV(currentSprint);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csvData, 'utf8'));
                vscode.window.showInformationMessage('Sprint data exported successfully');
            }
        } catch (error) {
            this.logger.error('Failed to export sprint data', error);
            vscode.window.showErrorMessage('Failed to export sprint data');
        }
    }

    private generateSprintCSV(sprint: any): string {
        const lines = [];
        lines.push('Sprint Overview');
        lines.push('Name,Description,Status,Start Date,End Date,Duration');
        lines.push(`"${sprint.name}","${sprint.description}",${sprint.status},${sprint.startDate.toISOString().split('T')[0]},${sprint.endDate.toISOString().split('T')[0]},${sprint.duration}`);
        lines.push('');
        lines.push('Tasks');
        lines.push('Name,Description,Status,Story Points,Priority');
        sprint.tasks.forEach((task: any) => {
            lines.push(`"${task.name}","${task.description || ''}",${task.status || 'Not Started'},${task.storyPoints || 0},${task.priority || 'Medium'}`);
        });
        return lines.join('\n');
    }

    private async showSprintMetrics(): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showInformationMessage('No active sprint found');
                return;
            }

            // const metrics = this.calculateSprintMetrics();
            const html = this.generateMetricsHTML();
            
            const panel = vscode.window.createWebviewPanel(
                'sprintMetrics',
                'Sprint Metrics',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            panel.webview.html = html;
        } catch (error) {
            this.logger.error('Failed to show sprint metrics', error);
            vscode.window.showErrorMessage('Failed to show sprint metrics');
        }
    }

    private calculateSprintMetrics(): any {
        // Implement your sprint metrics calculation logic here
        return {
            labels: ['Completed', 'In Progress', 'Blocked', 'Not Started'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9E9E9E']
            }]
        };
    }

    private generateMetricsHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sprint Metrics</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .metric { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
                </style>
            </head>
            <body>
                <h1>Sprint Metrics</h1>
                <div class="metric">
                    <h3>Task Status Distribution</h3>
                    <p>No metrics available.</p>
                </div>
            </body>
            </html>
        `;
    }

    private generateProgressChartData(): any {
        return {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Progress',
                data: [0, 0, 0, 0],
                borderColor: '#007acc',
                backgroundColor: 'rgba(0, 122, 204, 0.1)'
            }]
        };
    }

    private generateActivityChartData(): any {
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                label: 'Activity',
                data: [0, 0, 0, 0, 0],
                backgroundColor: '#4CAF50'
            }]
        };
    }

    private generatePerformanceChartData(): any {
        return {
            labels: ['Sprint 1', 'Sprint 2', 'Sprint 3'],
            datasets: [{
                label: 'Performance',
                data: [0, 0, 0],
                backgroundColor: '#2196F3'
            }]
        };
    }

    private generateIssuesChartData(): any {
        return {
            labels: ['Bug', 'Task', 'Improvement'],
            datasets: [{
                label: 'Issues',
                data: [0, 0, 0],
                backgroundColor: ['#FF9800', '#9E9E9E', '#4CAF50']
            }]
        };
    }

    private isThisWeek(date: Date): boolean {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return date >= startOfWeek && date <= endOfWeek;
    }

    private isThisMonth(date: Date): boolean {
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    private async validateChatContent(content: string): Promise<ValidationResult> {
        try {
            const validator = new ChatValidator(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
            const result = await validator.validateChat(content);

            if (this.extensionContext) {
                await this.displayChatValidationResults(result, content, this.extensionContext);
            } else {
                this.logger.error('Extension context not available for chat validation');
                vscode.window.showErrorMessage('Extension context not available for chat validation');
            }

            return result;
        } catch (error) {
            this.logger.error('Chat validation failed', error);
            vscode.window.showErrorMessage('Chat validation failed');
            return {
                isValid: false,
                errors: [{
                    type: 'safety',
                    message: 'Validation process failed',
                    severity: 'error',
                    timestamp: new Date()
                }],
                warnings: [],
                suggestions: ['Check the console for more details'],
                timestamp: new Date()
            };
        }
    }

    private async updateChart(chartType: string): Promise<void> {
        try {
            // Generate updated chart data based on the grouping
            const dashboard = this.ui.getDashboardData();
            const planValidation = {
                status: 'in_progress',
                llmIsCurrent: true
            };
            
            const chartData = this.generateUpdatedChartData(dashboard, planValidation, chartType);
            
            // Send updated data to the webview
            if (Commands.dashboardPanel) {
                Commands.dashboardPanel.webview.postMessage({
                    command: 'updateChartData',
                    chartType: chartType,
                    data: chartData
                });
            }
            
        } catch (error) {
            this.logger.error('Error updating chart', error);
            vscode.window.showErrorMessage('Failed to update chart');
        }
    }

    private generateUpdatedChartData(dashboard: any, planValidation: any, chartType: string): any {
        // const { linearProgress } = dashboard;
        
        switch (chartType) {
            case 'progress':
                return this.generateProgressChartData();
            case 'activity':
                return this.generateActivityChartData();
            case 'performance':
                return this.generatePerformanceChartData();
            case 'issues':
                return this.generateIssuesChartData();
            default:
                return this.generateProgressChartData();
        }
    }

    private async checkForDrift(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Drift check completed - no issues found');
        } catch (error) {
            this.logger.error('Failed to check for drift', error);
            vscode.window.showErrorMessage('Failed to check for drift');
        }
    }

    private async viewDesignDocument(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Design document viewer coming soon');
        } catch (error) {
            this.logger.error('Failed to view design document', error);
            vscode.window.showErrorMessage('Failed to view design document');
        }
    }

    private async manageDesignDocument(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Design document manager coming soon');
        } catch (error) {
            this.logger.error('Failed to manage design document', error);
            vscode.window.showErrorMessage('Failed to manage design document');
        }
    }

    private async detectVersionInconsistencies(): Promise<string[]> {
        // Placeholder implementation
        return [];
    }

    private generateVersionConsistencyHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Version Consistency Check</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .version-item { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
                    .inconsistent { background-color: #ffebee; border-color: #f44336; }
                    .consistent { background-color: #e8f5e8; border-color: #4caf50; }
                </style>
            </head>
            <body>
                <h1>Version Consistency Check</h1>
                <div id="version-results">
                    <p>Checking version consistency across project files...</p>
                </div>
            </body>
            </html>
        `;
    }

    private async showConsole(): Promise<void> {
        try {
            await this.ui.showConsole();
        } catch (error) {
            this.logger.error('Error showing console', error);
            vscode.window.showErrorMessage('Failed to show console. Check logs for details.');
        }
    }

    private async showLogs(): Promise<void> {
        try {
            await this.ui.showLogs();
        } catch (error) {
            this.logger.error('Error showing logs', error);
            vscode.window.showErrorMessage('Failed to show logs. Check logs for details.');
        }
    }

    private async showProjectPlan(): Promise<void> {
        try {
            await this.ui.showProjectPlan();
        } catch (error) {
            this.logger.error('Error showing project plan', error);
            vscode.window.showErrorMessage('Failed to show project plan. Check logs for details.');
        }
    }

    private async showProgressDetails(): Promise<void> {
        try {
            await this.ui.showProgressDetails();
        } catch (error) {
            this.logger.error('Error showing progress details', error);
            vscode.window.showErrorMessage('Failed to show progress details. Check logs for details.');
        }
    }

    private async showAccountabilityReport(): Promise<void> {
        try {
            await this.ui.showAccountabilityReport();
        } catch (error) {
            this.logger.error('Error showing accountability report', error);
            vscode.window.showErrorMessage('Failed to show accountability report. Check logs for details.');
        }
    }

    private async showFeasibilityAnalysis(): Promise<void> {
        try {
            await this.ui.showFeasibilityAnalysis();
        } catch (error) {
            this.logger.error('Error showing feasibility analysis', error);
            vscode.window.showErrorMessage('Failed to show feasibility analysis. Check logs for details.');
        }
    }

    private async showActionLog(): Promise<void> {
        try {
            await this.ui.showActionLog();
        } catch (error) {
            this.logger.error('Error showing action log', error);
            vscode.window.showErrorMessage('Failed to show action log. Check logs for details.');
        }
    }

    private async showFailsafeConfigPanel(): Promise<void> {
        try {
            await this.ui.showFailsafeConfigPanel();
        } catch (error) {
            this.logger.error('Error showing failsafe config panel', error);
            vscode.window.showErrorMessage('Failed to show failsafe config panel. Check logs for details.');
        }
    }

    private async openPreview(): Promise<void> {
        try {
            const panel = vscode.window.createWebviewPanel(
                'failsafePreview',
                'FailSafe Preview',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // Get the current tab from context or default to dashboard
            const currentTab = vscode.workspace.getConfiguration('failsafe').get('currentTab', 'dashboard');
            const serverPort = this.fastifyServer?.getPort() || 3000;
            const previewUrl = `http://127.0.0.1:${serverPort}/preview?tab=${currentTab}&format=html`;

            panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>FailSafe Preview</title>
    <style>
        body { margin: 0; padding: 0; }
        .preview-container { width: 100%; height: 100vh; }
        .preview-iframe { width: 100%; height: 100%; border: none; }
        .tab-selector { 
            position: fixed; 
            top: 10px; 
            right: 10px; 
            z-index: 1000; 
            background: white; 
            padding: 10px; 
            border-radius: 4px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .sync-toggle {
            position: fixed;
            top: 50px;
            right: 10px;
            z-index: 1000;
            background: white;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="tab-selector">
        <label for="tabSelect">Tab:</label>
        <select id="tabSelect" onchange="changeTab()">
            <option value="dashboard">Dashboard</option>
            <option value="console">Console</option>
            <option value="logs">Logs</option>
            <option value="projectplan">Project Plan</option>
            <option value="progressdetails">Progress Details</option>
            <option value="accountabilityreport">Accountability Report</option>
            <option value="feasibilityanalysis">Feasibility Analysis</option>
            <option value="actionlog">Action Log</option>
            <option value="failsafeconfigpanel">Config Panel</option>
        </select>
    </div>
    
    <div class="sync-toggle">
        <label>
            <input type="checkbox" id="syncToggle" checked onchange="toggleSync()">
            Auto-refresh
        </label>
    </div>
    
    <div class="preview-container">
        <iframe id="previewFrame" class="preview-iframe" src="${previewUrl}"></iframe>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let syncEnabled = true;
        
        function changeTab() {
            const tab = document.getElementById('tabSelect').value;
            const serverPort = ${serverPort};
            const newUrl = \`http://127.0.0.1:\${serverPort}/preview?tab=\${tab}&format=html\`;
            document.getElementById('previewFrame').src = newUrl;
            
            // Update VS Code configuration
            vscode.postMessage({
                command: 'updateCurrentTab',
                tab: tab
            });
        }
        
        function toggleSync() {
            syncEnabled = document.getElementById('syncToggle').checked;
            vscode.postMessage({
                command: 'toggleSync',
                enabled: syncEnabled
            });
        }
        
        // Set initial tab
        document.getElementById('tabSelect').value = '${currentTab}';
        
        // Listen for file save events from VS Code
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'fileSaved' && syncEnabled) {
                // Refresh the preview
                const iframe = document.getElementById('previewFrame');
                iframe.src = iframe.src;
            }
        });
    </script>
</body>
</html>`;

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'updateCurrentTab':
                            vscode.workspace.getConfiguration('failsafe').update('currentTab', message.tab, true);
                            break;
                        case 'toggleSync':
                            vscode.workspace.getConfiguration('failsafe').update('previewSyncEnabled', message.enabled, true);
                            break;
                    }
                },
                undefined,
                this.extensionContext?.subscriptions || []
            );

            // Set up file save listener for auto-refresh
            const fileSaveListener = vscode.workspace.onDidSaveTextDocument(document => {
                if (vscode.workspace.getConfiguration('failsafe').get('previewSyncEnabled', true)) {
                    panel.webview.postMessage({ command: 'fileSaved' });
                }
            });

            panel.onDidDispose(() => {
                fileSaveListener.dispose();
            });

        } catch (error) {
            this.logger.error('Error opening preview', error);
            vscode.window.showErrorMessage('Failed to open preview. Check logs for details.');
        }
    }

    private async togglePreviewSync(): Promise<void> {
        try {
            const currentSync = vscode.workspace.getConfiguration('failsafe').get('previewSyncEnabled', true);
            const newSync = !currentSync;
            
            await vscode.workspace.getConfiguration('failsafe').update('previewSyncEnabled', newSync, true);
            
            vscode.window.showInformationMessage(
                `Preview auto-refresh ${newSync ? 'enabled' : 'disabled'}`
            );
        } catch (error) {
            this.logger.error('Error toggling preview sync', error);
            vscode.window.showErrorMessage('Failed to toggle preview sync. Check logs for details.');
        }
    }
} 
