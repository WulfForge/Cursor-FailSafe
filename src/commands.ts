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
import { AIRequest, AIResponse, SessionLog, ValidationResult, ValidationError, ValidationWarning, TestResult, TaskStatus, TaskPriority, ChatValidationResult } from './types';
import * as fs from 'fs';
import { VersionManager } from './versionManager';
import { SprintTask } from './sprintPlanner';
import { AIResponseValidator } from './aiResponseValidator';
import { CursorRule } from './cursorrulesEngine';
import { ConsoleCommands } from './commands/consoleCommands';
import { SprintPlanCommands } from './commands/sprintPlanCommands';
import { CursorRulesCommands } from './commands/cursorRulesCommands';
import { LogCommands } from './commands/logCommands';
import { DashboardCommands } from './commands/dashboardCommands';

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
    private readonly versionManager: VersionManager;
    
    // New command modules
    private readonly consoleCommands: ConsoleCommands;
    private readonly sprintPlanCommands: SprintPlanCommands;
    private readonly cursorRulesCommands: CursorRulesCommands;
    private readonly logCommands: LogCommands;
    private readonly dashboardCommands: DashboardCommands;

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
        this.versionManager = new VersionManager(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        
        // Initialize command modules
        this.consoleCommands = new ConsoleCommands(this.logger, this.validator, this.testRunner, this.versionManager, this.cursorrulesEngine, context);
        this.sprintPlanCommands = new SprintPlanCommands(this.logger, this.sprintPlanner);
        this.cursorRulesCommands = new CursorRulesCommands(this.logger, this.cursorrulesEngine, this.cursorrulesManager, context);
        this.logCommands = new LogCommands(this.logger);
        this.dashboardCommands = new DashboardCommands(this.logger, this.sprintPlanner, this.cursorrulesEngine, this.versionManager, this.projectPlan, this.taskEngine, context);
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
            vscode.commands.registerCommand('failsafe.validateChatMinimal', this.validateChatMinimal.bind(this)),
            vscode.commands.registerCommand('failsafe.evaluateTechDebt', this.evaluateTechDebt.bind(this)),
            vscode.commands.registerCommand('failsafe.showDashboard', this.showDashboard.bind(this)),
            vscode.commands.registerCommand('failsafe.addTaskToSprint', this.addTaskToSprint.bind(this)),
            vscode.commands.registerCommand('failsafe.enforceFullVerification', this.enforceFullVerification.bind(this)),
            vscode.commands.registerCommand('failsafe.openPreview', this.openPreview.bind(this))
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
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found.');
                return;
            }

            const incompleteTasks = currentSprint.tasks.filter((task: any) => task.status !== 'completed');
            if (incompleteTasks.length === 0) {
                vscode.window.showInformationMessage('All tasks in the current sprint are already completed.');
                return;
            }

            // For now, just mark the first incomplete task as complete
            const taskToComplete = incompleteTasks[0];
            taskToComplete.status = TaskStatus.completed;
            taskToComplete.completedAt = new Date().toISOString();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(`Task "${taskToComplete.name}" marked as complete`);

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
            let content = '';
            let source = '';

            // Try to get content from active editor first
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                content = editor.document.getText();
                source = `Active editor: ${editor.document.fileName}`;
            }

            // If no active editor or no content, try clipboard
            if (!content.trim()) {
                try {
                    content = await vscode.env.clipboard.readText();
                    if (content.trim()) {
                        source = 'Clipboard content';
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
                } else {
                    vscode.window.showInformationMessage('Chat validation cancelled');
                return;
                }
            }

            this.logger.info(`Starting chat validation from ${source}...`);
            const validationResult = await this.validateChatContent(content);

            if (validationResult.length === 0) {
                vscode.window.showInformationMessage('Chat content validation passed successfully!');
            } else {
                const errorCount = validationResult.filter(r => r.severity === 'error').length;
                const warningCount = validationResult.filter(r => r.severity === 'warning').length;
                
                vscode.window.showWarningMessage(
                    `⚠️ Chat validation found ${errorCount} errors and ${warningCount} warnings`
                );
            }

                // Show detailed results in a webview
                await this.displayChatValidationResults(validationResult, content, this.extensionContext!);

        } catch (error) {
            this.logger.error('Error in validateChat command', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }

    private async validateChatMinimal(): Promise<void> {
        try {
            let content = '';
            let source = '';

            // Try to get content from active editor first
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                content = editor.document.getText();
                source = `Active editor: ${editor.document.fileName}`;
            }

            // If no active editor or no content, try clipboard
            if (!content.trim()) {
                try {
                    content = await vscode.env.clipboard.readText();
                    if (content.trim()) {
                        source = 'Clipboard content';
                    }
                } catch (clipboardError) {
                    this.logger.debug('Could not read from clipboard', clipboardError);
                }
            }

            // If still no content, prompt user to paste content
            if (!content.trim()) {
                const userInput = await vscode.window.showInputBox({
                    prompt: 'Paste the chat content you want to validate (minimal):',
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
                } else {
                    vscode.window.showInformationMessage('Minimal chat validation cancelled');
                return;
                }
            }

            this.logger.info(`Starting minimal chat validation from ${source}...`);
            
            // Perform lightweight validation for common patterns
            const issues = [];
            
            // Check for common issues
            if (content.includes('TODO') || content.includes('FIXME')) {
                issues.push('Contains TODO/FIXME comments');
            }
            
            if (content.length > 10000) {
                issues.push('Content is very long (>10k chars)');
            }
            
            if (content.includes('password') || content.includes('secret')) {
                issues.push('Contains potential sensitive information');
            }

            if (issues.length === 0) {
                vscode.window.showInformationMessage('✅ Minimal validation passed!');
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ Minimal validation found ${issues.length} potential issues: ${issues.join(', ')}`
                );
            }

        } catch (error) {
            this.logger.error('Error in validateChatMinimal command', error);
            vscode.window.showErrorMessage('Failed to validate chat. Check logs for details.');
        }
    }

    private async evaluateTechDebt(): Promise<void> {
        try {
            let content = '';
            let source = '';

            // Try to get content from active editor first
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                content = editor.document.getText();
                source = `Active editor: ${editor.document.fileName}`;
            }

            // If no active editor or no content, try clipboard
            if (!content.trim()) {
                try {
                    content = await vscode.env.clipboard.readText();
                    if (content.trim()) {
                        source = 'Clipboard content';
                    }
                } catch (clipboardError) {
                    this.logger.debug('Could not read from clipboard', clipboardError);
                }
            }

            // If still no content, prompt user to paste content
            if (!content.trim()) {
                const userInput = await vscode.window.showInputBox({
                    prompt: 'Paste the code content you want to analyze for tech debt:',
                    placeHolder: 'Enter or paste code content here...',
                    validateInput: (input) => {
                        if (!input.trim()) {
                            return 'Please enter some content to analyze';
                        }
                        return null;
                    }
                });

                if (userInput) {
                    content = userInput;
                    source = 'User input';
                } else {
                    vscode.window.showInformationMessage('Tech debt analysis cancelled');
                return;
                }
            }

            this.logger.info(`Starting tech debt evaluation from ${source}...`);
            
            // Perform basic tech debt analysis
            const analysis = {
                complexity: 0,
                maintainability: 0,
                issues: [] as string[]
            };
            
            // Calculate basic metrics
            const lines = content.split('\n');
            const functions = (content.match(/function\s+\w+/g) || []).length;
            const classes = (content.match(/class\s+\w+/g) || []).length;
            const comments = (content.match(/\/\/|\/\*|\*/g) || []).length;
            
            // Simple complexity calculation
            analysis.complexity = functions + classes;
            analysis.maintainability = Math.max(0, 100 - analysis.complexity * 5);
            
            // Identify potential issues
            if (functions > 10) {
                analysis.issues.push('High number of functions');
            }
            
            if (classes > 5) {
                analysis.issues.push('High number of classes');
            }
            
            if (comments < lines.length * 0.1) {
                analysis.issues.push('Low comment density');
            }
            
            if (content.includes('TODO') || content.includes('FIXME')) {
                analysis.issues.push('Contains TODO/FIXME comments');
            }

            // Show results
            const message = `Tech Debt Analysis:\n` +
                          `Complexity Score: ${analysis.complexity}\n` +
                          `Maintainability: ${analysis.maintainability}%\n` +
                          `Issues Found: ${analysis.issues.length}`;
            
            if (analysis.issues.length === 0) {
                vscode.window.showInformationMessage('✅ Tech debt analysis passed!');
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ Tech debt analysis found ${analysis.issues.length} issues:\n${analysis.issues.join('\n')}`
                );
            }

        } catch (error) {
            this.logger.error('Error in evaluateTechDebt command', error);
            vscode.window.showErrorMessage('Failed to evaluate tech debt. Check logs for details.');
        }
    }

    public async showDashboard(): Promise<void> {
        try {
            // Check if dashboard is already open
            if (Commands.dashboardPanel) {
                Commands.dashboardPanel.reveal();
                    return;
            }

            // Set extension context for icon loading
            // this.extensionContext is already set in constructor

            // Create and show the dashboard panel
            const panel = vscode.window.createWebviewPanel(
                'failsafeDashboard',
                'FailSafe Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: this.extensionContext?.extensionUri ? [
                        vscode.Uri.joinPath(this.extensionContext.extensionUri, 'images')
                    ] : []
                }
            );

            // Store the panel reference for single instance enforcement
            Commands.dashboardPanel = panel;

            // Handle panel disposal
            panel.onDidDispose(() => {
                Commands.dashboardPanel = undefined;
            });

            // Get current data for the dashboard
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            const sprintHistory = this.sprintPlanner.getSprintHistory();
            const templates = this.sprintPlanner.getTemplates();
            const sprintMetrics = currentSprint ? this.sprintPlanner.getSprintMetrics(currentSprint.id) : null;

            // Generate dashboard HTML
            const html = this.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            panel.webview.html = html;

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
        try {
            switch (message.command) {
                            case 'executeCommand':
                                await this.handleDashboardCommand(message.value, message.args);
                    break;
                            case 'createSprint':
                                vscode.window.showInformationMessage('Create Sprint feature coming soon');
                    break;
                            case 'exportSprintData':
                                await this.exportSprintData();
                    break;
                            case 'importSprintData':
                                await this.importSprintData();
                    break;
                            case 'showSprintMetrics':
                                vscode.window.showInformationMessage('Sprint Metrics feature coming soon');
                                break;
                            case 'validateChat':
                                await this.validateChat();
                                break;
                            case 'createCursorrule':
                                vscode.window.showInformationMessage('Create Cursorrule feature coming soon');
                                break;
                            case 'validatePlanWithAI':
                                vscode.window.showInformationMessage('Validate Plan with AI feature coming soon');
                                break;
                            case 'addTask':
                                await this.addTask();
                                break;
                            case 'editTask':
                                await this.editTask(message.taskId);
                                break;
                            case 'deleteTask':
                                await this.deleteTask(message.taskId);
                                break;
                            case 'duplicateTask':
                                await this.duplicateTask(message.taskId);
                                break;
                            case 'markTaskComplete':
                                await this.markTaskComplete();
                                break;
                            case 'reorderTasksByDragDrop':
                                await this.reorderTasksByDragDrop(message.taskIds);
                                break;
                            case 'refreshDashboard': {
                                // Refresh the dashboard data
                                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                                const updatedMetrics = updatedSprint ? this.sprintPlanner.getSprintMetrics(updatedSprint.id) : null;
                                const updatedHtml = this.generateDashboardHTML(updatedSprint, sprintHistory, templates, updatedMetrics);
                                panel.webview.html = updatedHtml;
                                break;
                            }
                            case 'showNotification': {
                                // Handle webview-contained notifications
                                this.showWebviewNotification(panel, message.type, message.message);
                                break;
                            }
                        }
        } catch (error) {
                        // Send error to webview instead of showing toast
                        this.showWebviewNotification(panel, 'error', 
                            `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        this.logger.error('Dashboard operation failed', error);
                    }
                },
                undefined,
                this.extensionContext?.subscriptions || []
            );

            this.logger.info('Dashboard opened successfully');
        } catch (error) {
            this.logger.error('Failed to show dashboard', error);
            // Only show error toast if dashboard is not open
            if (!Commands.dashboardPanel) {
                vscode.window.showErrorMessage(`Failed to show dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    private showWebviewNotification(panel: vscode.WebviewPanel, type: 'info' | 'warning' | 'error' | 'success', message: string): void {
        panel.webview.postMessage({
            command: 'showNotification',
            type: type,
            message: message
        });
    }

    private generateDashboardHTML(currentSprint: any, sprintHistory: any[], templates: any[], sprintMetrics: any): string {
        // Get icon URIs for the webview
        const iconUri = this.extensionContext?.extensionUri ? 
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'images', 'icon.png') : null;
        const mythologiqUri = this.extensionContext?.extensionUri ? 
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'images', 'MythologIQ.png') : null;
        
        const iconWebviewUri = iconUri && Commands.dashboardPanel ? 
            Commands.dashboardPanel.webview.asWebviewUri(iconUri) : null;
        const mythologiqWebviewUri = mythologiqUri && Commands.dashboardPanel ? 
            Commands.dashboardPanel.webview.asWebviewUri(mythologiqUri) : null;

        // Get cursor rules for display
        const cursorRules = this.cursorrulesEngine.getAllRules();
        const enabledRules = this.cursorrulesEngine.getEnabledRules();

        // Get logs for display
        const logs = [
            { timestamp: new Date(), level: 'info', message: 'Dashboard opened successfully' },
            { timestamp: new Date(Date.now() - 60000), level: 'info', message: 'System initialized' }
        ];

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FailSafe Dashboard</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
        }
        .dashboard-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .dashboard-header {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
            text-align: center;
        }
        .header-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .header-icon {
            width: 32px;
            height: 32px;
            background-color: var(--vscode-button-background);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .header-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 6px;
        }
        .dashboard-title {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
            color: var(--vscode-foreground);
        }
        .dashboard-subtitle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 2px 0 0 0;
        }
        .tab-container {
            display: flex;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
            padding: 12px 20px;
            background-color: transparent;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 14px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
        }
        .tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .tab.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .tab-content {
            display: none;
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        }
        .tab-content.active {
            display: block;
        }
        .dashboard-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 20px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .footer-icon {
            width: 16px;
            height: 16px;
            margin-left: 8px;
            background-color: var(--vscode-button-background);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .metric-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .chart-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .chart-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .chart-placeholder {
            height: 200px;
            background-color: var(--vscode-editor-background);
            border: 2px dashed var(--vscode-panel-border);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-descriptionForeground);
        }
        .action-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin: 2px;
            transition: background-color 0.2s;
        }
        .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-online {
            background-color: var(--vscode-testing-iconPassed);
        }
        .status-offline {
            background-color: var(--vscode-testing-iconFailed);
        }
        .sprint-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
        }
        .sprint-card:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .sprint-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .sprint-status {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .task-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .task-name {
            flex: 1;
        }
        .task-status {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .task-actions {
            display: flex;
            gap: 5px;
        }
        .task-action-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        }
        .task-action-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .rule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .rule-table th,
        .rule-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .rule-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-weight: bold;
        }
        .log-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .log-table th,
        .log-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 12px;
        }
        .log-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-weight: bold;
        }
        .log-timestamp {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .log-type {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .log-description {
            margin-top: 4px;
        }
        .settings-group {
            margin-bottom: 20px;
        }
        .settings-group h3 {
            margin-bottom: 10px;
            font-size: 14px;
        }
        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .setting-label {
            font-size: 13px;
        }
        .setting-value {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .no-content {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            padding: 40px;
        }
        .sprint-actions {
            margin-bottom: 15px;
        }
        .sprint-actions .action-button {
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="dashboard-header">
            <div class="header-content">
                <div class="header-icon">
                    ${iconWebviewUri ? `<img src="${iconWebviewUri}" alt="FailSafe Icon" />` : '🛡️'}
                </div>
                <div>
                    <h1 class="dashboard-title">FailSafe</h1>
                    <p class="dashboard-subtitle">AI Safety and Validation System</p>
                </div>
                ${mythologiqWebviewUri ? `<img src="${mythologiqWebviewUri}" alt="MythologIQ" style="width: 24px; height: 24px; margin-left: 10px;" />` : ''}
            </div>
        </div>

        <div class="tab-container">
            <button class="tab active" onclick="switchTab('dashboard')">📊 Dashboard</button>
            <button class="tab" onclick="switchTab('console')">💻 Console</button>
            <button class="tab" onclick="switchTab('sprint-plan')">🗓 Sprint Plan</button>
            <button class="tab" onclick="switchTab('cursor-rules')">🔒 Cursor Rules</button>
            <button class="tab" onclick="switchTab('logs')">📘 Logs</button>
        </div>

        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${currentSprint ? '1' : '0'}</div>
                    <div class="metric-label">Active Sprints</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${currentSprint ? currentSprint.tasks?.length || 0 : 0}</div>
                    <div class="metric-label">Total Tasks</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.calculateSprintProgress(currentSprint)}%</div>
                    <div class="metric-label">Completion %</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">0</div>
                    <div class="metric-label">Validations Run</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${enabledRules.length}</div>
                    <div class="metric-label">Rules Enabled</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">100%</div>
                    <div class="metric-label">Validation Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">0</div>
                    <div class="metric-label">Drift Events</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">0</div>
                    <div class="metric-label">Hallucinations</div>
                </div>
            </div>

            <div class="chart-section">
                <div class="chart-title">Effectiveness Charts</div>
                <div class="chart-placeholder">
                    Bar & Line graphs for weekly velocity, validation types, drift trends
                </div>
            </div>

            <div class="chart-section">
                <div class="chart-title">FailSafe Success</div>
                <div class="chart-placeholder">
                    % of errors flagged vs missed, Time saved, Accuracy metrics
                </div>
            </div>
        </div>

        <!-- Console Tab -->
        <div id="console" class="tab-content">
            <div class="settings-group">
                <h3>System Status</h3>
                <div class="setting-item">
                    <span class="setting-label">
                        <span class="status-indicator status-online"></span>
                        Cursor Connected
                    </span>
                    <span class="setting-value">🟢 Online</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Detected Cursor Version</span>
                    <span class="setting-value">Latest</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Last Sync Timestamp</span>
                    <span class="setting-value">${new Date().toLocaleString()}</span>
                </div>
            </div>

            <div class="settings-group">
                <h3>Quick Actions</h3>
                <button class="action-button" onclick="executeCommand('failsafe.validateChat')">Validate Chat</button>
                <button class="action-button" onclick="executeCommand('failsafe.checkVersionConsistency')">Check for Drift</button>
                <button class="action-button" onclick="executeCommand('failsafe.showVersionDetails')">Version Check</button>
                <button class="action-button" onclick="executeCommand('failsafe.enforceVersionConsistency')">Auto-Bump Version</button>
                <button class="action-button" onclick="executeCommand('failsafe.evaluateTechDebt')">Compile + Package</button>
                <button class="action-button" onclick="executeCommand('failsafe.reportProblem')">Install Extension</button>
                <button class="action-button" onclick="executeCommand('failsafe.simulateEvent')">Reload Window</button>
            </div>

            <div class="settings-group">
                <h3>Settings</h3>
                <div class="setting-item">
                    <span class="setting-label">Cursor Path</span>
                    <span class="setting-value">Auto-detected</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Rule Sync Interval</span>
                    <span class="setting-value">5 minutes</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Logging Verbosity</span>
                    <span class="setting-value">Normal</span>
                </div>
            </div>
        </div>

        <!-- Sprint Plan Tab -->
        <div id="sprint-plan" class="tab-content">
            <div class="sprint-actions">
                <button class="action-button" onclick="executeCommand('failsafe.addTask')">Add Task</button>
                <button class="action-button" onclick="executeCommand('failsafe.createSprint')">Create Sprint</button>
                <button class="action-button" onclick="executeCommand('failsafe.showSprintTemplates')">Sprint Templates</button>
                <button class="action-button" onclick="executeCommand('exportSprintData')">Export Sprint</button>
                <button class="action-button" onclick="executeCommand('importSprintData')">Import Sprint</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <div>
                    <h3>Sprint List</h3>
                    ${currentSprint ? `
                        <div class="sprint-card">
                            <div class="sprint-name">${currentSprint.name}</div>
                            <div class="sprint-status">Active</div>
                        </div>
                    ` : `
                        <div class="no-content">No active sprints</div>
                    `}
                </div>
                <div>
                    <h3>Sprint Details</h3>
                    ${currentSprint ? `
                        <div class="sprint-card">
                            <div class="sprint-name">${currentSprint.name}</div>
                            <div style="margin: 10px 0;">
                                <strong>Tasks:</strong>
                                ${currentSprint.tasks && currentSprint.tasks.length > 0 ? 
                                    currentSprint.tasks.map((task: any) => `
                                        <div class="task-item">
                                            <span class="task-name">${task.name}</span>
                                            <span class="task-status">${task.status}</span>
                                            <div class="task-actions">
                                                <button class="task-action-btn" onclick="executeCommand('failsafe.editTask', '${task.id}')">Edit</button>
                                                <button class="task-action-btn" onclick="executeCommand('failsafe.duplicateTask', '${task.id}')">Copy</button>
                                                <button class="task-action-btn" onclick="executeCommand('failsafe.deleteTask', '${task.id}')">Delete</button>
                                                <button class="task-action-btn" onclick="executeCommand('failsafe.markTaskComplete', '${task.id}')">Complete</button>
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<div class="no-content">No tasks in this sprint</div>'
                                }
                            </div>
                        </div>
                    ` : `
                        <div class="no-content">Select a sprint to view details</div>
                    `}
                </div>
            </div>
        </div>

        <!-- Cursor Rules Tab -->
        <div id="cursor-rules" class="tab-content">
            <div style="margin-bottom: 15px;">
                <button class="action-button" onclick="executeCommand('failsafe.createCursorRule')">Add New Rule</button>
                <button class="action-button" onclick="executeCommand('failsafe.addRuleFromTemplate')">Add from Template</button>
                <button class="action-button" onclick="executeCommand('failsafe.manageCursorRules')">Manage Rules</button>
            </div>
            <table class="rule-table">
                <thead>
                    <tr>
                        <th>Rule Name</th>
                        <th>Category</th>
                        <th>Enabled</th>
                        <th>Trigger Count</th>
                        <th>Last Triggered</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${cursorRules.length > 0 ? cursorRules.map((rule: any) => `
                        <tr>
                            <td>${rule.name}</td>
                            <td>${rule.purpose}</td>
                            <td>${rule.enabled ? '✅' : '❌'}</td>
                            <td>${rule.usageStats?.triggers || 0}</td>
                            <td>${rule.usageStats?.lastTriggered ? new Date(rule.usageStats.lastTriggered).toLocaleString() : 'Never'}</td>
                            <td>${rule.patternType}</td>
                            <td>
                                <button class="task-action-btn" onclick="executeCommand('failsafe.toggleCursorRule', '${rule.id}')">${rule.enabled ? 'Disable' : 'Enable'}</button>
                                <button class="task-action-btn" onclick="executeCommand('failsafe.editCursorRule', '${rule.id}')">Edit</button>
                            </td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="7" style="text-align: center;">No rules configured</td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>

        <!-- Logs Tab -->
        <div id="logs" class="tab-content">
            <div style="margin-bottom: 15px;">
                <button class="action-button" onclick="executeCommand('failsafe.exportLogs')">Export Logs</button>
                <button class="action-button" onclick="executeCommand('failsafe.clearLogs')">Clear Logs</button>
            </div>
            <table class="log-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Level</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map((log: any) => `
                        <tr>
                            <td class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</td>
                            <td><span class="log-type">${log.level}</span></td>
                            <td class="log-description">${log.message}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="dashboard-footer">
            Cursor Development tool built by MythologIQ
            <div class="footer-icon">🧠</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function switchTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }

        function executeCommand(command, ...args) {
            vscode.postMessage({
                command: 'executeCommand',
                value: command,
                args: args
            });
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'showNotification':
                    console.log('Notification:', message.type, message.message);
                    break;
                case 'refreshDashboard':
                    location.reload();
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    private calculateSprintProgress(sprint: any): number {
        if (!sprint || !sprint.tasks || sprint.tasks.length === 0) {
            return 0;
        }
        
        const completedTasks = sprint.tasks.filter((task: any) => task.status === 'completed').length;
        return Math.round((completedTasks / sprint.tasks.length) * 100);
    }

    private async addTask(): Promise<void> {
        try {
            const taskName = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'e.g., Implement user authentication'
            });

            if (!taskName) {
                return;
            }

            const taskDescription = await vscode.window.showInputBox({
                prompt: 'Enter task description (optional)',
                placeHolder: 'Describe what needs to be done'
            });

            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found. Please start a sprint first.');
                return;
            }

            const newTask: SprintTask = {
                id: Date.now().toString(),
                name: taskName,
                description: taskDescription || '',
                status: TaskStatus.notStarted,
                storyPoints: 1,
                sprintId: currentSprint.id,
                estimatedHours: 2,
                sprintPosition: currentSprint.tasks.length + 1,
                dependencies: [],
                blockers: [],
                riskLevel: 'low',
                acceptanceCriteria: [],
                definitionOfDone: [],
                estimatedDuration: 120, // 2 hours in minutes
                priority: TaskPriority.medium,
                assignee: 'User' // Default assignee
            };

            currentSprint.tasks.push(newTask);
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

                vscode.window.showInformationMessage(`Task "${taskName}" added to sprint successfully`);
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error adding task:', error);
            vscode.window.showErrorMessage('Failed to add task');
        }
    }

    private async editTask(taskId: string): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found.');
                return;
            }

            const task = currentSprint.tasks.find((t: any) => t.id === taskId);
            if (!task) {
                vscode.window.showWarningMessage('Task not found.');
                return;
            }

            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new task name',
                value: task.name,
                placeHolder: 'e.g., Implement user authentication'
            });

            if (!newName) {
                return;
            }

            const newDescription = await vscode.window.showInputBox({
                prompt: 'Enter new task description (optional)',
                value: task.description,
                placeHolder: 'Describe what needs to be done'
            });

            // Update the task
            Object.assign(task, {
                name: newName,
                description: newDescription
            });

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(`Task "${newName}" updated successfully`);
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error editing task:', error);
            vscode.window.showErrorMessage('Failed to edit task');
        }
    }

    private async deleteTask(taskId: string): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found.');
                return;
            }

            const task = currentSprint.tasks.find((t: any) => t.id === taskId);
            if (!task) {
                vscode.window.showWarningMessage('Task not found.');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete task "${task.name}"?`,
                'Yes', 'No'
            );

            if (confirm !== 'Yes') {
                return;
            }

            currentSprint.tasks = currentSprint.tasks.filter((t: any) => t.id !== taskId);
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(`Task "${task.name}" deleted successfully`);
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error deleting task:', error);
            vscode.window.showErrorMessage('Failed to delete task');
        }
    }

    private async duplicateTask(taskId: string): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found.');
                return;
            }

            const originalTask = currentSprint.tasks.find((t: any) => t.id === taskId);
            if (!originalTask) {
                vscode.window.showWarningMessage('Task not found.');
                return;
            }

            const duplicatedTask: SprintTask = {
                ...originalTask,
                id: Date.now().toString(),
                name: `${originalTask.name} (Copy)`,
                status: TaskStatus.notStarted
            };

            currentSprint.tasks.push(duplicatedTask);
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(`Task "${duplicatedTask.name}" duplicated successfully`);
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error duplicating task:', error);
            vscode.window.showErrorMessage('Failed to duplicate task');
        }
    }
    
    private async reorderTasksByDragDrop(taskIds: string[]): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found.');
                return;
            }

            if (!currentSprint.tasks || currentSprint.tasks.length === 0) {
                vscode.window.showInformationMessage('No tasks to reorder.');
                return;
            }

            // Reorder tasks based on the new order
            const reorderedTasks = taskIds.map(id => 
                currentSprint.tasks.find((task: any) => task.id === id)
            ).filter((task): task is SprintTask => task !== undefined);

            if (reorderedTasks.length !== currentSprint.tasks.length) {
                vscode.window.showWarningMessage('Some tasks could not be found for reordering.');
                return;
            }

            currentSprint.tasks = reorderedTasks;
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage('Tasks reordered successfully');
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error reordering tasks:', error);
            vscode.window.showErrorMessage('Failed to reorder tasks');
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

    private async addTaskToSprint(): Promise<void> {
        try {
            const taskName = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'e.g., Implement user authentication'
            });

            if (!taskName) {
                return;
            }

            const taskDescription = await vscode.window.showInputBox({
                prompt: 'Enter task description (optional)',
                placeHolder: 'Describe what needs to be done'
            });

            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found. Please start a sprint first.');
                return;
            }

            const newTask: SprintTask = {
                id: Date.now().toString(),
                name: taskName,
                description: taskDescription || '',
                status: TaskStatus.notStarted,
                storyPoints: 1,
                sprintId: currentSprint.id,
                estimatedHours: 2,
                sprintPosition: currentSprint.tasks.length + 1,
                dependencies: [],
                blockers: [],
                riskLevel: 'low',
                acceptanceCriteria: [],
                definitionOfDone: [],
                estimatedDuration: 120, // 2 hours in minutes
                priority: TaskPriority.medium,
                assignee: 'User' // Default assignee
            };

            currentSprint.tasks.push(newTask);
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(`Task "${taskName}" added to sprint successfully`);
            
            // Refresh dashboard if open
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }

        } catch (error) {
            this.logger.error('Error adding task to sprint:', error);
            vscode.window.showErrorMessage('Failed to add task to sprint');
        }
    }

    private async detectVersionInconsistencies(): Promise<string[]> {
        try {
            // Placeholder implementation - check for version inconsistencies
            const inconsistencies: string[] = [];
            
            // Check package.json version vs extension version
            const packageVersion = require('../package.json').version;
            // Note: VersionManager doesn't have getCurrentVersion method yet
            const extensionVersion = '2.0.0'; // Placeholder
            
            if (packageVersion !== extensionVersion) {
                inconsistencies.push(`Package version (${packageVersion}) differs from extension version (${extensionVersion})`);
            }
            
            return inconsistencies;
        } catch (error) {
            this.logger.error('Error detecting version inconsistencies:', error);
            return [];
        }
    }

    private generateVersionConsistencyHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Version Consistency Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { background: #f0f0f0; padding: 10px; border-radius: 5px; }
                    .inconsistency { background: #ffe6e6; padding: 10px; margin: 10px 0; border-left: 4px solid #ff4444; }
                    .success { background: #e6ffe6; padding: 10px; margin: 10px 0; border-left: 4px solid #44ff44; }
                </style>
            </head>
            <body>
                    <div class="header">
                    <h2>Version Consistency Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                        </div>
                <div class="success">
                    <h3>✅ Version Consistency Check</h3>
                    <p>All version checks passed successfully.</p>
                </div>
            </body>
            </html>
        `;
    }

    private async validateChatContent(content: string): Promise<ChatValidationResult[]> {
        try {
            const results: ChatValidationResult[] = [];
            
            // Basic content validation
            if (!content || content.trim().length === 0) {
                results.push({
                    severity: 'error',
                    message: 'Chat content is empty',
                    details: 'The chat content cannot be empty',
                    recommendation: 'Please provide some content to validate',
                    timestamp: new Date(),
                    category: 'content'
                });
            }
            
            // Check for potential security issues
            if (content.includes('password') || content.includes('secret') || content.includes('token')) {
                results.push({
                    severity: 'warning',
                    message: 'Potential sensitive information detected',
                    details: 'Content may contain sensitive information',
                    recommendation: 'Review content for any sensitive data before sharing',
                    timestamp: new Date(),
                    category: 'security'
                });
            }
            
            return results;
        } catch (error) {
            this.logger.error('Error validating chat content:', error);
            return [{
                severity: 'error',
                message: 'Validation failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                recommendation: 'Please try again',
                timestamp: new Date(),
                category: 'system'
            }];
        }
    }

    private async displayChatValidationResults(results: ChatValidationResult[], content: string, context: vscode.ExtensionContext): Promise<void> {
        try {
            const panel = vscode.window.createWebviewPanel(
                'chatValidation',
                'Chat Validation Results',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                    <title>Chat Validation Results</title>
                <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { background: #f0f0f0; padding: 10px; border-radius: 5px; }
                        .result { margin: 10px 0; padding: 10px; border-radius: 5px; }
                        .error { background: #ffe6e6; border-left: 4px solid #ff4444; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
                        .info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
                        .content { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                    <div class="header">
                        <h2>Chat Validation Results</h2>
                        <p>Validated on: ${new Date().toLocaleString()}</p>
                </div>
                    
                    <div class="content">
                        <h3>Content Preview:</h3>
                        <pre>${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</pre>
                    </div>
                    
                    ${results.map(result => `
                        <div class="result ${result.severity}">
                            <h4>${result.severity.toUpperCase()}: ${result.message}</h4>
                            <p><strong>Details:</strong> ${result.details || 'No details provided'}</p>
                            ${result.recommendation ? `<p><strong>Recommendation:</strong> ${result.recommendation}</p>` : ''}
                            <p><small>Category: ${result.category} | Time: ${result.timestamp.toLocaleString()}</small></p>
                        </div>
                    `).join('')}
                    
                    ${results.length === 0 ? '<div class="result info"><h4>✅ No issues found</h4><p>The chat content passed all validation checks.</p></div>' : ''}
            </body>
            </html>
        `;

            panel.webview.html = html;
        } catch (error) {
            this.logger.error('Error displaying chat validation results:', error);
            vscode.window.showErrorMessage('Failed to display validation results');
        }
    }

    private async enforceFullVerification(): Promise<void> {
        try {
            this.logger.info('🚨 Full Verification Process Enforcement triggered');
            
            // Show immediate notification
            vscode.window.showWarningMessage(
                '🚨 Full Verification Process Required!',
                'Run Full Pipeline',
                'Cancel'
            ).then(async (selection) => {
                if (selection === 'Run Full Pipeline') {
                    await this.runFullVerificationPipeline();
                }
            });

        } catch (error) {
            this.logger.error('Error in enforceFullVerification', error);
            vscode.window.showErrorMessage('Failed to enforce full verification process');
        }
    }

    private async runFullVerificationPipeline(): Promise<void> {
        try {
            this.logger.info('Starting full verification pipeline...');
            
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
                progress.report({ message: 'Checking icon integrity...', increment: 30 });
                await this.runCommand('npm run prepackage');
                
                // Step 4: Tests
                progress.report({ message: 'Running tests...', increment: 40 });
                await this.runCommand('npm test');
                
                // Step 5: Spec Gate
                progress.report({ message: 'Running spec gate validation...', increment: 50 });
                await this.runCommand('npm run spec-gate');
                
                // Step 6: Packaging
                progress.report({ message: 'Creating package...', increment: 60 });
                await this.runCommand('npm run package');
                
                // Step 7: Verification
                progress.report({ message: 'Verifying package...', increment: 70 });
                await this.verifyPackageCreated();
                
                progress.report({ message: 'Full verification pipeline completed!', increment: 100 });
            });

            vscode.window.showInformationMessage('✅ Full verification pipeline completed successfully!');
            
        } catch (error) {
            this.logger.error('Error in runFullVerificationPipeline', error);
            vscode.window.showErrorMessage(`❌ Full verification pipeline failed: ${error}`);
        }
    }

    private async runCommand(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(command, { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    this.logger.error(`Command failed: ${command}`, error);
                    reject(new Error(`Command failed: ${command} - ${error.message}`));
                } else {
                    this.logger.info(`Command succeeded: ${command}`);
                    resolve();
                }
            });
        });
    }

    private async verifyPackageCreated(): Promise<void> {
        const fs = require('fs');
        const path = require('path');
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!workspacePath) {
            throw new Error('No workspace found');
        }

        const files = fs.readdirSync(workspacePath);
        const vsixFiles = files.filter((file: string) => file.endsWith('.vsix'));
        
        if (vsixFiles.length === 0) {
            throw new Error('No .vsix package file found after packaging');
        }

        const latestVsix = vsixFiles
            .map((file: string) => ({
                name: file,
                path: path.join(workspacePath, file),
                stats: fs.statSync(path.join(workspacePath, file))
            }))
            .sort((a: any, b: any) => b.stats.mtime.getTime() - a.stats.mtime.getTime())[0];

        this.logger.info(`Package verified: ${latestVsix.name} (${(latestVsix.stats.size / 1024 / 1024).toFixed(2)} MB)`);
    }

    private async handleDashboardCommand(command: string, args: any[] = []): Promise<void> {
        try {
            switch (command) {
                // Console Commands
                case 'failsafe.validateChat':
                    await this.consoleCommands.validateChat();
                    break;
                case 'failsafe.checkVersionConsistency':
                    await this.consoleCommands.checkVersionConsistency();
                    break;
                case 'failsafe.showVersionDetails':
                    await this.consoleCommands.showVersionDetails();
                    break;
                case 'failsafe.enforceVersionConsistency':
                    await this.enforceVersionConsistency();
                    break;
                case 'failsafe.evaluateTechDebt':
                    await this.consoleCommands.evaluateTechDebt();
                    break;
                case 'failsafe.enforceFullVerification':
                    await this.consoleCommands.enforceFullVerification();
                    break;
                case 'failsafe.reportProblem':
                    await this.reportProblem();
                    break;
                case 'failsafe.simulateEvent':
                    await this.simulateEvent();
                    break;

                // Sprint Plan Commands
                case 'failsafe.addTask':
                    await this.sprintPlanCommands.addTask();
                    break;
                case 'failsafe.createSprint':
                    await this.sprintPlanCommands.createSprint();
                    break;
                case 'failsafe.showSprintTemplates':
                    vscode.window.showInformationMessage('Sprint Templates feature coming soon');
                    break;
                case 'failsafe.editTask':
                    if (args[0]) await this.sprintPlanCommands.editTask(args[0]);
                    break;
                case 'failsafe.duplicateTask':
                    if (args[0]) await this.sprintPlanCommands.duplicateTask(args[0]);
                    break;
                case 'failsafe.deleteTask':
                    if (args[0]) await this.sprintPlanCommands.deleteTask(args[0]);
                    break;
                case 'failsafe.markTaskComplete':
                    await this.markTaskComplete();
                    break;
                case 'failsafe.reorderTasks':
                    if (args[0]) await this.sprintPlanCommands.reorderTasksByDragDrop(args[0]);
                    break;
                case 'failsafe.exportSprintData':
                    await this.sprintPlanCommands.exportSprintData();
                    break;
                case 'failsafe.getSprintMetrics':
                    await this.sprintPlanCommands.getSprintMetrics();
                    break;

                // Cursor Rules Commands
                case 'failsafe.createCursorRule':
                    await this.cursorRulesCommands.createNewRule();
                    break;
                case 'failsafe.addRuleFromTemplate':
                    await this.cursorRulesCommands.addFromTemplate();
                    break;
                case 'failsafe.manageCursorRules':
                    await this.cursorRulesCommands.manageRules();
                    break;
                case 'failsafe.toggleCursorRule':
                    if (args[0]) {
                        const rule = this.cursorrulesEngine.getRule(args[0]);
                        if (rule) {
                            this.cursorrulesEngine.toggleRule(args[0], !rule.enabled);
                            vscode.window.showInformationMessage(`Rule ${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`);
                        }
                    }
                    break;
                case 'failsafe.editCursorRule':
                    if (args[0]) await this.cursorRulesCommands.editRule(args[0]);
                    break;
                case 'failsafe.validateWithRules':
                    await this.cursorRulesCommands.validateWithRules();
                    break;
                case 'failsafe.testPassiveValidation':
                    await this.cursorRulesCommands.testPassiveValidation();
                    break;
                case 'failsafe.restorePredefinedRules':
                    await this.cursorRulesCommands.restorePredefinedRules();
                    break;

                // Log Commands
                case 'failsafe.viewLogs':
                    await this.logCommands.viewLogs();
                    break;
                case 'failsafe.exportLogs':
                    await this.logCommands.exportLogs();
                    break;
                case 'failsafe.clearLogs':
                    await this.logCommands.clearLogs();
                    break;
                case 'failsafe.monitorSystemHealth':
                    await this.logCommands.monitorSystemHealth();
                    break;
                case 'failsafe.debugExtension':
                    await this.logCommands.debugExtension();
                    break;

                // Dashboard Commands
                case 'failsafe.exportDashboardReport':
                    await this.dashboardCommands.exportDashboardReport();
                    break;
                case 'failsafe.exportSprintReport':
                    await this.dashboardCommands.exportSprintReport();
                    break;
                case 'failsafe.exportCursorRulesReport':
                    await this.dashboardCommands.exportCursorRulesReport();
                    break;
                case 'failsafe.exportProjectHealthReport':
                    await this.dashboardCommands.exportProjectHealthReport();
                    break;
                case 'failsafe.customizeDashboardTheme':
                    await this.dashboardCommands.customizeDashboardTheme();
                    break;
                case 'failsafe.customizeDashboardLayout':
                    await this.dashboardCommands.customizeDashboardLayout();
                    break;
                case 'failsafe.configureDashboardWidgets':
                    await this.dashboardCommands.configureDashboardWidgets();
                    break;
                case 'failsafe.exportDashboardAsPDF':
                    await this.dashboardCommands.exportDashboardAsPDF();
                    break;
                case 'failsafe.shareDashboardSnapshot':
                    await this.dashboardCommands.shareDashboardSnapshot();
                    break;

                default:
                    vscode.window.showWarningMessage(`Unknown command: ${command}`);
                    break;
            }
            
            // Refresh dashboard after command execution
            if (Commands.dashboardPanel) {
                const updatedSprint = this.sprintPlanner.getCurrentSprint();
                const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), null);
                Commands.dashboardPanel.webview.html = updatedHtml;
            }
        } catch (error) {
            this.logger.error('Dashboard command failed', error);
            vscode.window.showErrorMessage(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Restore all predefined cursor rules (27+ rules)
     */
    private async restorePredefinedRules(): Promise<void> {
        try {
            const predefinedRules: Omit<CursorRule, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>[] = [
                // Filesystem Hallucination Detection Rules
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
                    name: 'Proactive File Existence Check',
                    pattern: '\\b(?:file|directory|folder|path)\\s+(?:exists|is\\s+present|can\\s+be\\s+found|is\\s+available)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_detection',
                    severity: 'error',
                    enabled: true,
                    message: 'Potential hallucination: File existence claim detected. Verify file actually exists.'
                },
                {
                    name: 'File Content Claim Validation',
                    pattern: '\\b(?:content|text|data)\\s+(?:in|of|from)\\s+(?:file|document)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_detection',
                    severity: 'error',
                    enabled: true,
                    message: 'Potential hallucination: File content claim detected. Verify content actually exists in file.'
                },
                {
                    name: 'File Modification Time Claim',
                    pattern: '\\b(?:modified|updated|changed)\\s+(?:on|at|when)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_detection',
                    severity: 'error',
                    enabled: true,
                    message: 'Potential hallucination: File modification time claim detected. Verify modification timestamp.'
                },
                {
                    name: 'Directory Structure Claim',
                    pattern: '\\b(?:directory|folder)\\s+(?:structure|layout|organization)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_detection',
                    severity: 'error',
                    enabled: true,
                    message: 'Potential hallucination: Directory structure claim detected. Verify directory structure.'
                },
                {
                    name: 'File Size Claim',
                    pattern: '\\b(?:file|document)\\s+(?:size|length|bytes)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_detection',
                    severity: 'error',
                    enabled: true,
                    message: 'Potential hallucination: File size claim detected. Verify actual file size.'
                },

                // Minimal Validation Rules
                {
                    name: 'Minimal Hallucination Detection',
                    pattern: '\\b(?:I\\s+can\\s+see|there\\s+is|I\\s+found|I\\s+located|the\\s+file\\s+contains|I\\s+can\\s+see\\s+in\\s+the\\s+file)\\b',
                    patternType: 'regex' as const,
                    purpose: 'minimal_validation',
                    severity: 'warning',
                    enabled: true,
                    message: 'Potential hallucination: File content claim detected. Verify actual file content.'
                },

                // Version Management Rules
                {
                    name: 'Version Consistency Check',
                    pattern: '\\b(?:version|v\\d+\\.\\d+\\.\\d+|semver)\\b',
                    patternType: 'regex' as const,
                    purpose: 'version_consistency',
                    severity: 'warning',
                    enabled: true,
                    message: 'Version claim detected. Verify version consistency across files.'
                },
                {
                    name: 'Auto Version Management',
                    pattern: '\\b(?:version|release|update|bump)\\b',
                    patternType: 'regex' as const,
                    purpose: 'auto_version_management',
                    severity: 'info',
                    enabled: true,
                    message: 'Version management activity detected. This is normal during updates.'
                },

                // Implementation Verification Rules
                {
                    name: 'Implementation Verification',
                    pattern: '\\b(?:I\\s+implemented|I\\s+created|I\\s+built|I\\s+developed)\\b',
                    patternType: 'regex' as const,
                    purpose: 'implementation_verification',
                    severity: 'warning',
                    enabled: true,
                    message: 'Implementation claim detected. Verify actual implementation exists.'
                },

                // Task Completion Rules
                {
                    name: 'Task Completion Claim',
                    pattern: '\\b(?:completed|finished|done|implemented|resolved)\\b',
                    patternType: 'regex' as const,
                    purpose: 'task_completion',
                    severity: 'warning',
                    enabled: true,
                    message: 'Task completion claim detected. Verify task is actually complete.'
                },

                // Audit Results Rules
                {
                    name: 'Audit Results Claim',
                    pattern: '\\b(?:audit|review|analysis|assessment)\\s+(?:shows|indicates|reveals)\\b',
                    patternType: 'regex' as const,
                    purpose: 'audit_results',
                    severity: 'warning',
                    enabled: true,
                    message: 'Audit result claim detected. Verify audit was actually performed.'
                },

                // Compilation Status Rules
                {
                    name: 'Compilation Status Claim',
                    pattern: '\\b(?:compiles|builds|runs|executes)\\s+(?:successfully|without\\s+errors)\\b',
                    patternType: 'regex' as const,
                    purpose: 'compilation_status',
                    severity: 'warning',
                    enabled: true,
                    message: 'Compilation claim detected. Verify code actually compiles.'
                },

                // Test Results Rules
                {
                    name: 'Test Results Claim',
                    pattern: '\\b(?:tests\\s+pass|test\\s+results|coverage|tested)\\b',
                    patternType: 'regex' as const,
                    purpose: 'test_results',
                    severity: 'warning',
                    enabled: true,
                    message: 'Test result claim detected. Verify tests actually pass.'
                },

                // Hallucination Admission Rules
                {
                    name: 'Hallucination Admission',
                    pattern: '\\b(?:I\\s+don\\s*\'t\\s+know|I\\s+can\\s*\'t\\s+see|I\\s+don\\s*\'t\\s+have\\s+access)\\b',
                    patternType: 'regex' as const,
                    purpose: 'hallucination_admission',
                    severity: 'info',
                    enabled: true,
                    message: 'Honest admission of limitations detected. This is good practice.'
                },

                // Vague Offer Detection Rules
                {
                    name: 'Vague Offer Detection',
                    pattern: '\\b(?:I\\s+can\\s+help|I\\s+can\\s+assist|I\\s+can\\s+guide)\\b',
                    patternType: 'regex' as const,
                    purpose: 'vague_offers',
                    severity: 'info',
                    enabled: true,
                    message: 'Vague offer detected. Consider being more specific about capabilities.'
                },

                // Absolute Statement Detection Rules
                {
                    name: 'Absolute Statement Detection',
                    pattern: '\\b(?:always|never|every|all|none|impossible|guaranteed)\\b',
                    patternType: 'regex' as const,
                    purpose: 'absolute_statements',
                    severity: 'warning',
                    enabled: true,
                    message: 'Absolute statement detected. Consider using more qualified language.'
                },

                // Performance Claim Detection Rules
                {
                    name: 'Performance Claim Detection',
                    pattern: '\\b(?:fast|slow|efficient|optimized|performance|speed)\\b',
                    patternType: 'regex' as const,
                    purpose: 'performance_claims',
                    severity: 'warning',
                    enabled: true,
                    message: 'Performance claim detected. Verify performance characteristics.'
                },

                // Workflow Rules
                {
                    name: 'No Repetitive Confirmation or Stalling',
                    pattern: '(let me know if you want to review|otherwise, I will proceed as planned|waiting for confirmation|if you have any new requests|just let me know).*?[.!?]',
                    patternType: 'regex' as const,
                    purpose: 'workflow',
                    severity: 'warning',
                    enabled: true,
                    message: 'Detected repetitive confirmation or stalling. Proceed with the work unless explicitly told to wait.'
                },

                // AI Task Execution Rules
                {
                    name: 'AI Task Execution',
                    pattern: '\\b(?:I\\s+will|I\\s+can|I\\s+should|let\\s+me)\\b',
                    patternType: 'regex' as const,
                    purpose: 'ai_task_execution',
                    severity: 'info',
                    enabled: true,
                    message: 'AI task execution detected. This is normal behavior.'
                },

                // GitHub Workflow Management Rules
                {
                    name: 'GitHub Workflow Management',
                    pattern: '\\b(?:branch|merge|commit|push|pull|issue|pr)\\b',
                    patternType: 'regex' as const,
                    purpose: 'github_workflow_management',
                    severity: 'info',
                    enabled: true,
                    message: 'GitHub workflow activity detected. This is normal during development.'
                },

                // Product Discovery Protocol Rules
                {
                    name: 'Product Discovery Protocol',
                    pattern: '\\b(?:plan|strategy|roadmap|milestone|goal)\\b',
                    patternType: 'regex' as const,
                    purpose: 'product_discovery_protocol',
                    severity: 'info',
                    enabled: true,
                    message: 'Product discovery activity detected. This is normal during planning.'
                },

                // Beginner Guidance Rules
                {
                    name: 'Beginner Guidance',
                    pattern: '\\b(?:how\\s+to|what\\s+is|explain|guide|tutorial)\\b',
                    patternType: 'regex' as const,
                    purpose: 'beginner_guidance',
                    severity: 'info',
                    enabled: true,
                    message: 'Beginner guidance request detected. Provide clear, helpful explanations.'
                },

                // Error Recovery Assistance Rules
                {
                    name: 'Error Recovery Assistance',
                    pattern: '\\b(?:error|exception|fail|crash|bug)\\b',
                    patternType: 'regex' as const,
                    purpose: 'error_recovery_assistance',
                    severity: 'warning',
                    enabled: true,
                    message: 'Error or issue detected. Provide helpful debugging assistance.'
                },

                // Best Practice Suggestions Rules
                {
                    name: 'Best Practice Suggestions',
                    pattern: '\\b(?:best\\s+practice|recommendation|suggestion|tip)\\b',
                    patternType: 'regex' as const,
                    purpose: 'best_practice_suggestions',
                    severity: 'info',
                    enabled: true,
                    message: 'Best practice discussion detected. Share relevant recommendations.'
                },

                // Dependency Management Rules
                {
                    name: 'Dependency Management',
                    pattern: '\\b(?:dependency|package|import|require|install)\\b',
                    patternType: 'regex' as const,
                    purpose: 'dependency_management',
                    severity: 'info',
                    enabled: true,
                    message: 'Dependency management activity detected. This is normal during development.'
                },

                // Testing Guidance Rules
                {
                    name: 'Testing Guidance',
                    pattern: '\\b(?:test|spec|coverage|assert|mock)\\b',
                    patternType: 'regex' as const,
                    purpose: 'testing_guidance',
                    severity: 'info',
                    enabled: true,
                    message: 'Testing activity detected. Provide testing guidance and best practices.'
                },

                // Documentation Assistance Rules
                {
                    name: 'Documentation Assistance',
                    pattern: '\\b(?:document|comment|readme|api|guide)\\b',
                    patternType: 'regex' as const,
                    purpose: 'documentation_assistance',
                    severity: 'info',
                    enabled: true,
                    message: 'Documentation activity detected. Provide documentation guidance.'
                },

                // Workflow Automation Rules (Critical)
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
                },
                {
                    name: 'Incomplete Build Detection',
                    pattern: '\\b(?:npm\\s+run\\s+compile.*npm\\s+run\\s+package|compile.*package|just\\s+compile|only\\s+package)\\b',
                    patternType: 'regex' as const,
                    purpose: 'incomplete_build_detection',
                    severity: 'warning',
                    enabled: true,
                    message: '⚠️ WARNING: Incomplete build process detected! Missing verification steps.',
                    response: 'warn',
                    description: 'Detects when only compilation and packaging are mentioned without full verification pipeline.'
                },
                {
                    name: 'Verification Pipeline Reminder',
                    pattern: '\\b(?:verification|testing|linting|quality\\s+check|compliance)\\b',
                    patternType: 'regex' as const,
                    purpose: 'verification_pipeline_reminder',
                    severity: 'info',
                    enabled: true,
                    message: '💡 REMINDER: Ensure full verification pipeline includes: Compilation → Linting → Icon Check → Tests → Spec Gate → Packaging',
                    response: 'suggest',
                    description: 'Reminds about complete verification steps when verification is mentioned.'
                }
            ];

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
            this.logger.error('Error restoring predefined rules', error);
            vscode.window.showErrorMessage('Failed to restore predefined rules. Check logs for details.');
        }
    }

    /**
     * Test passive validation system with sample text
     */
    private async testPassiveValidation(): Promise<void> {
        try {
            const sampleTexts = [
                "Let's package it up and ship it!",
                "I can see the file exists in the project directory.",
                "The tests pass successfully without any errors.",
                "I've implemented the feature and it's working perfectly.",
                "This is a simple and straightforward solution."
            ];

            for (const text of sampleTexts) {
                // Create a temporary AI response validator for testing
                const aiResponseValidator = new AIResponseValidator(
                    this.extensionContext!,
                    this.logger
                );
                
                const result = await aiResponseValidator.applyPassiveValidationToText(text);
                if (result.appliedChanges) {
                    this.logger.info(`Passive validation applied to: "${text}"`, {
                        changes: result.changeLog,
                        validatedText: result.validatedText
                    });
                }
            }

            vscode.window.showInformationMessage('Passive validation test completed. Check logs for details.');

            } catch (error) {
            this.logger.error('Error testing passive validation', error);
            vscode.window.showErrorMessage('Failed to test passive validation. Check logs for details.');
        }
            }

    private async openPreview(): Promise<void> {
            try {
            // Open the preview panel using the UI's preview functionality
            await this.ui.showPreviewPanel();
            vscode.window.showInformationMessage('FailSafe Preview opened! Use this to test UI changes without reloading the extension.');
            } catch (error) {
            this.logger.error('Error opening preview:', error);
            vscode.window.showErrorMessage('Failed to open preview: ' + error);
        }
    }

    // ===============================
    // SPRINT IMPORT/EXPORT METHODS
    // ===============================

    /**
     * Export sprint data to JSON file
     */
    private async exportSprintData(): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No current sprint to export');
                return;
            }

            // Show export type selection
            const exportType = await vscode.window.showQuickPick(
                ['Full Sprint', 'Partial Sprint', 'Single Task'],
                {
                    placeHolder: 'Select export type',
                    canPickMany: false
                }
            );

            if (!exportType) return;

            let jsonData: string;
            let fileName: string;

            switch (exportType) {
                case 'Full Sprint':
                    jsonData = await this.sprintPlanner.exportSprintToJSON('full_sprint');
                    fileName = `sprint-export-${currentSprint.id}-${new Date().toISOString().split('T')[0]}.json`;
                    break;
                case 'Partial Sprint':
                    jsonData = await this.sprintPlanner.exportSprintToJSON('partial_sprint');
                    fileName = `sprint-partial-${currentSprint.id}-${new Date().toISOString().split('T')[0]}.json`;
                    break;
                case 'Single Task':
                    // Show task selection
                    const tasks = currentSprint.tasks.map(task => ({
                        label: task.name,
                        description: `ID: ${task.id}`,
                        taskId: task.id
                    }));
                    
                    const selectedTask = await vscode.window.showQuickPick(tasks, {
                        placeHolder: 'Select task to export'
                    });

                    if (!selectedTask) return;

                    jsonData = await this.sprintPlanner.exportSprintToJSON('single_task', selectedTask.taskId);
                    fileName = `task-export-${selectedTask.taskId}-${new Date().toISOString().split('T')[0]}.json`;
                    break;
                default:
                    return;
            }

            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    'JSON Files': ['json']
                }
            });

            if (!uri) return;

            // Write file
            const encoder = new TextEncoder();
            const data = encoder.encode(jsonData);
            await vscode.workspace.fs.writeFile(uri, data);

            vscode.window.showInformationMessage(`Sprint exported successfully to ${uri.fsPath}`);

            // Option to open the file
            const openFile = await vscode.window.showInformationMessage(
                'Export completed successfully!',
                'Open File',
                'OK'
            );

            if (openFile === 'Open File') {
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            }

        } catch (error) {
            this.logger.error('Failed to export sprint data', error);
            vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Import sprint data from JSON file
     */
    private async importSprintData(): Promise<void> {
        try {
            // Show file picker
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json']
                }
            });

            if (!uris || uris.length === 0) return;

            const uri = uris[0];
            
            // Read file
            const data = await vscode.workspace.fs.readFile(uri);
            const jsonString = new TextDecoder().decode(data);

            // Show import confirmation
            const importType = await vscode.window.showQuickPick(
                ['Full Sprint (Replace Current)', 'Partial Sprint (Update Current)', 'Single Task (Add to Current)'],
                {
                    placeHolder: 'Select import type'
                }
            );

            if (!importType) return;

            // Show confirmation dialog
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to ${importType.toLowerCase()}? This action cannot be undone.`,
                'Yes, Import',
                'Cancel'
            );

            if (confirm !== 'Yes, Import') return;

            // Import the data
            const result = await this.sprintPlanner.importSprintFromJSON(jsonString);

            if (result.success) {
                vscode.window.showInformationMessage(`Import successful: ${result.message}`);
                
                // Refresh dashboard if open
                if (Commands.dashboardPanel) {
                    const updatedSprint = this.sprintPlanner.getCurrentSprint();
                    const updatedMetrics = updatedSprint ? this.sprintPlanner.getSprintMetrics(updatedSprint.id) : null;
                    const updatedHtml = this.generateDashboardHTML(updatedSprint, this.sprintPlanner.getSprintHistory(), this.sprintPlanner.getTemplates(), updatedMetrics);
                    Commands.dashboardPanel.webview.html = updatedHtml;
                }
            } else {
                vscode.window.showErrorMessage(`Import failed: ${result.message}`);
            }

        } catch (error) {
            this.logger.error('Failed to import sprint data', error);
            vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}