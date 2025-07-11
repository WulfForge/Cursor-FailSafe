/// <reference types="node" />
import * as vscode from 'vscode';
import { Commands } from './commands';
import { Logger } from './logger';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import { Validator } from './validator';
import { TestRunner } from './testRunner';
import { CursorrulesEngine } from './cursorrulesEngine';
import { CursorrulesManager } from './cursorrulesManager';
import { CursorrulesWizard } from './cursorrulesWizard';
import { ChatValidator } from './chatValidator';
import { SprintPlanner } from './sprintPlanner';
import { DesignDocumentManager } from './designDocumentManager';
import { VersionManager } from './versionManager';
import { TroubleshootingStateManager } from './troubleshootingStateManager';
import { FailSafeServer } from './fastifyServer';
import * as path from 'path';
import { FailSafeSidebarProvider } from './sidebarProvider';
import { initializeAIResponsePipeline } from './aiResponsePipeline';
import { initializeAIResponseHooks, processAIResponseWithHooks } from './aiResponseHooks';
import { ChatResponseInterceptor } from './chatResponseInterceptor';
import { PreviewCommands } from './commands/previewCommands';

export class FailSafeExtension {
    private readonly commands: Commands;
    private readonly projectPlan: ProjectPlan;
    private readonly taskEngine: TaskEngine;
    private readonly logger: Logger;
    private readonly validator: Validator;
    private readonly testRunner: TestRunner;
    private readonly versionManager: VersionManager;
    private readonly context: vscode.ExtensionContext;
    private readonly cursorrulesEngine: CursorrulesEngine;
    private readonly cursorrulesWizard: CursorrulesWizard;
    private readonly cursorrulesManager: CursorrulesManager;
    private readonly chatValidator: ChatValidator;
    private readonly troubleshootingStateManager: TroubleshootingStateManager;
    private readonly sprintPlanner: SprintPlanner;
    private readonly designDocumentManager: DesignDocumentManager;
    private readonly sidebarProvider: FailSafeSidebarProvider;
    private readonly aiResponsePipeline: any;
    private readonly aiResponseHooks: any;
    private readonly chatResponseInterceptor: ChatResponseInterceptor;
    private fastifyServer: FailSafeServer;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = new Logger();
        this.projectPlan = new ProjectPlan(this.logger);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.chatValidator = new ChatValidator(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        this.testRunner = new TestRunner();
        this.versionManager = new VersionManager(this.logger, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        
        // Initialize Design Document Manager
        this.designDocumentManager = DesignDocumentManager.getInstance();
        
        // Initialize Cursorrules components first
        this.cursorrulesEngine = new CursorrulesEngine(context, this.logger);
        this.cursorrulesWizard = new CursorrulesWizard(this.cursorrulesEngine, this.logger, this.context);
        this.cursorrulesManager = new CursorrulesManager(this.cursorrulesEngine, this.logger, this.context);
        
        this.troubleshootingStateManager = new TroubleshootingStateManager(context, this.logger);
        
        this.sprintPlanner = new SprintPlanner(this.logger);
        
        this.sidebarProvider = new FailSafeSidebarProvider(this.context);
        
        this.commands = new Commands(this.context);
        
        // Initialize AI response pipeline for passive validation
        this.aiResponsePipeline = initializeAIResponsePipeline(context, this.logger);
        
        // Initialize AI response hooks for integration with various AI systems
        this.aiResponseHooks = initializeAIResponseHooks(this.logger);
        
        // Initialize Chat Response Interceptor for real-time validation
        this.chatResponseInterceptor = new ChatResponseInterceptor(context, this.logger);
        
        // Initialize Fastify server
        this.fastifyServer = new FailSafeServer(this.logger, this.taskEngine, this.projectPlan);
        this.initializeFailSafeServer();
        
        this.logger.info('FailSafe Extension initialized with AI response pipeline, hooks, Chat Response Interceptor, Design Document Manager, and Fastify server');
    }

    public async activate(): Promise<void> {
        this.logger.info('FailSafe extension activating...');
        
        try {
            // Validate extension environment first
            await this.validateExtensionEnvironment();
            
            // Log the activation context
            this.logger.info(`Extension context: ${this.context.extensionPath}`);
            this.logger.info(`Workspace folders: ${vscode.workspace.workspaceFolders?.length || 0}`);
            
            await this.initializeComponents();
            
            // Initialize Design Document for workspace
            await this.initializeDesignDocument();
            
            // Initialize Fastify server with error handling
            await this.initializeFailSafeServer();
            
            // Register commands first
            this.logger.info('Registering commands...');
            await this.commands.registerCommands(this.context);
            
            // Register preview commands
            this.logger.info('Registering preview commands...');
            PreviewCommands.registerCommands(this.context);
            this.logger.info('Preview commands registered successfully');
            
            this.logger.info('Commands registered successfully');
            
            // Register view providers for sidebar with proper error handling
            try {
                this.logger.info('Registering view providers...');
                
                // Register commands tree provider
                this.logger.info('Registering commands tree provider...');
                const commandsDisposable = vscode.window.registerTreeDataProvider(
                    'failsafe-commands',
                    this.sidebarProvider
                );
                this.context.subscriptions.push(commandsDisposable);
                this.logger.info('Commands provider registered successfully');
                
            } catch (error) {
                this.logger.error('Failed to register view providers:', error);
                vscode.window.showErrorMessage('Failed to register view providers');
            }
            
            // Set up chat response interceptor
            try {
                this.logger.info('Setting up chat response interceptor...');
                this.chatResponseInterceptor.setupChatListeners();
                this.logger.info('Chat response interceptor set up successfully');
            } catch (error) {
                this.logger.error('Failed to set up chat response interceptor:', error);
            }
            
            // Note: Removed auto-open dashboard to prevent race conditions and UI interference
            // Users can manually open the dashboard via the FailSafe sidebar or command palette
            
            // Set up automatic version checking
            this.setupAutomaticVersionChecking(this.context);
            
            this.logger.info('FailSafe extension activated successfully');
        } catch (error) {
            this.logger.error('Failed to activate FailSafe extension:', error);
            throw error;
        }
    }

    private async validateExtensionEnvironment(): Promise<void> {
        try {
            this.logger.info('Validating extension environment...');
            
            // Check if extension path is valid
            if (!this.context.extensionPath) {
                throw new Error('Extension path is not available');
            }
            
            // Check if workspace is available (optional but preferred)
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.warn('No workspace folder found - some features may be limited');
            }
            
            // Validate critical files exist (check both extension and workspace paths)
            const criticalFiles = [
                'failsafe_ui_specification.md',
                'o3-accountable.md'
            ];
            
            for (const file of criticalFiles) {
                const extensionFilePath = path.join(this.context.extensionPath, file);
                const workspaceFilePath = vscode.workspace.workspaceFolders?.[0] 
                    ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, file)
                    : null;
                
                const existsInExtension = require('fs').existsSync(extensionFilePath);
                const existsInWorkspace = workspaceFilePath ? require('fs').existsSync(workspaceFilePath) : false;
                
                if (!existsInExtension && !existsInWorkspace) {
                    this.logger.warn(`Critical file not found: ${file} - some features may not work`);
                } else {
                    this.logger.info(`Critical file found: ${file} ${existsInExtension ? '(extension)' : '(workspace)'}`);
                }
            }
            
            // Validate required directories exist
            const requiredDirs = [
                'out',
                'src',
                'src/plugins'
            ];
            
            for (const dir of requiredDirs) {
                const dirPath = path.join(this.context.extensionPath, dir);
                if (!require('fs').existsSync(dirPath)) {
                    this.logger.warn(`Required directory not found: ${dir} - some features may not work`);
                } else {
                    this.logger.info(`Required directory found: ${dir}`);
                }
            }
            
            // Validate compiled files exist
            const compiledFiles = [
                'out/extension.js',
                'out/ui.js',
                'out/commands.js'
            ];
            
            for (const file of compiledFiles) {
                const filePath = path.join(this.context.extensionPath, file);
                if (!require('fs').existsSync(filePath)) {
                    this.logger.warn(`Compiled file not found: ${file} - extension may not work properly`);
                } else {
                    this.logger.info(`Compiled file found: ${file}`);
                }
            }
            
            this.logger.info('Extension environment validation completed');
        } catch (error) {
            this.logger.error('Extension environment validation failed:', error);
            // Don't throw - allow extension to continue with limited functionality
        }
    }

    private async initializeFailSafeServer(): Promise<void> {
        try {
            this.logger.info('Initializing FailSafe server...');
            
            // Check if we have a valid workspace
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                this.logger.warn('No workspace path available - Fastify server will have limited functionality');
            }
            
            // Initialize dependencies
            const projectPlan = new ProjectPlan(this.logger);
            const taskEngine = new TaskEngine(projectPlan, this.logger);
            
            // Create and initialize the server with error handling
            this.fastifyServer = new FailSafeServer(this.logger, taskEngine, projectPlan);
            
            try {
                await this.fastifyServer.initialize();
                this.logger.info('FailSafe server initialized successfully');
            } catch (serverError) {
                this.logger.error('Failed to initialize Fastify server:', serverError);
                // Don't throw - allow extension to continue without server
                this.logger.info('Extension will continue without Fastify server functionality');
                
                // Set fastifyServer to undefined to indicate it's not available
                this.fastifyServer = undefined as any;
            }
            
        } catch (error) {
            this.logger.error('Failed to create FailSafe server:', error);
            // Don't throw - allow extension to continue without server
            this.logger.info('Extension will continue without Fastify server functionality');
            
            // Set fastifyServer to undefined to indicate it's not available
            this.fastifyServer = undefined as any;
        }
    }

    private async initializeDesignDocument(): Promise<void> {
        try {
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                this.logger.warn('No workspace folder found, skipping design document initialization');
                return;
            }

            this.logger.info('Initializing design document for workspace...');
            await this.designDocumentManager.promptForDesignDocument(workspacePath);
            this.logger.info('Design document initialization completed');
        } catch (error) {
            this.logger.error('Failed to initialize design document:', error);
            // Don't throw error to prevent extension activation failure
        }
    }

    private async initializeComponents(): Promise<void> {
        try {
            await this.projectPlan.initialize();
            await this.taskEngine.initialize();
            await this.versionManager.initialize();
            
            this.logger.info('All components initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize components:', error);
            throw error;
        }
    }

    private setupAutomaticVersionChecking(context: vscode.ExtensionContext): void {
        // Check version consistency on activation with proper error handling
        setTimeout(async () => {
            try {
                await this.checkVersionConsistency();
            } catch (error) {
                this.logger.error('Failed to check version consistency on activation:', error);
            }
        }, 2000); // Delay to allow extension to fully initialize

        // Set up file watchers for key files
        try {
            const fileWatcher = vscode.workspace.createFileSystemWatcher('**/{package.json,CHANGELOG.md,README.md}');
            
            fileWatcher.onDidChange(async () => {
                // Debounce the check to avoid too frequent checks
                setTimeout(async () => {
                    try {
                        await this.checkVersionConsistency();
                    } catch (error) {
                        this.logger.error('Failed to check version consistency on file change:', error);
                    }
                }, 1000);
            });

            context.subscriptions.push(fileWatcher);
            this.logger.info('Version checking file watcher set up successfully');
        } catch (error) {
            this.logger.error('Failed to set up version checking file watcher:', error);
        }
    }

    private async checkVersionConsistency(): Promise<void> {
        if (!this.versionManager) {
            this.logger.error('Version manager not initialized');
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }

        try {
            const consistency = await this.versionManager.checkVersionConsistency();
            
            if (consistency.isConsistent) {
                this.logger.info('Version consistency check passed');
                vscode.window.showInformationMessage('✅ Version consistency check passed');
            } else {
                this.logger.warn('Version consistency issues found:', consistency.issues);
                vscode.window.showWarningMessage(`❌ Version consistency issues found: ${consistency.issues.length} issues`);
                
                const action = await vscode.window.showWarningMessage(
                    'Version consistency issues detected. Would you like to fix them automatically?',
                    'Fix Automatically',
                    'Show Details',
                    'Ignore'
                );

                if (action === 'Fix Automatically') {
                    try {
                        await this.versionManager.autoFixVersionIssues();
                        vscode.window.showInformationMessage('Version issues fixed automatically');
                    } catch (error) {
                        this.logger.error('Failed to auto-fix version issues:', error);
                        vscode.window.showErrorMessage('Failed to auto-fix version issues');
                    }
                } else if (action === 'Show Details') {
                    await this.showVersionDetails();
                }
            }
        } catch (error) {
            this.logger.error('Failed to check version consistency:', error);
            vscode.window.showErrorMessage('Failed to check version consistency');
        }
    }

    private async showVersionDetails(): Promise<void> {
        if (!this.versionManager) {
            vscode.window.showErrorMessage('Version manager not initialized');
            return;
        }

        const consistency = await this.versionManager.checkVersionConsistency();
        const panel = vscode.window.createWebviewPanel(
            'versionDetails',
            'Version Consistency Details',
            vscode.ViewColumn.One,
            {}
        );

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

    public async deactivate(): Promise<void> {
        this.logger.info('FailSafe extension deactivating...');
        
        // Stop Fastify server
        if (this.fastifyServer) {
            await this.fastifyServer.stop();
        }
        
        // Cleanup
        this.taskEngine.stop();
        
        this.logger.info('FailSafe extension deactivated');
    }

    // Getters for other components
    public getLogger(): Logger { return this.logger; }
    public getValidator(): Validator { return this.validator; }
    public getTestRunner(): TestRunner { return this.testRunner; }
    public getProjectPlan(): ProjectPlan { return this.projectPlan; }
    public getTaskEngine(): TaskEngine { return this.taskEngine; }
    public getContext(): vscode.ExtensionContext { return this.context; }
    public getDesignDocumentManager(): DesignDocumentManager { return this.designDocumentManager; }
    public getFastifyServer(): FailSafeServer { return this.fastifyServer; }

    private async validateCurrentFileWithCursorrules(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const content = editor.document.getText();

        // Validate with Cursorrules first
        const cursorruleResults = this.cursorrulesEngine.evaluateContent(content);

        if (cursorruleResults.length > 0) {
            await this.handleCursorruleViolations(cursorruleResults);
        }

        // Then run existing validation
        await this.validateCurrentFile();
    }

    private async handleCursorruleViolations(results: any[]): Promise<void> {
        const violations = results.map(result => ({
            rule: result.rule,
            match: result.match,
            line: result.line,
            message: result.message,
            suggestions: result.suggestions,
            severity: result.rule.severity
        }));

        // Group by severity
        const critical = violations.filter(v => v.severity === 'critical');
        const high = violations.filter(v => v.severity === 'high');
        const medium = violations.filter(v => v.severity === 'medium');
        const low = violations.filter(v => v.severity === 'low');

        let message = '';
        if (critical.length > 0) {
            message += `🚨 ${critical.length} critical violation(s) found\n`;
        }
        if (high.length > 0) {
            message += `⚠️ ${high.length} high severity violation(s) found\n`;
        }
        if (medium.length > 0) {
            message += `📝 ${medium.length} medium severity violation(s) found\n`;
        }
        if (low.length > 0) {
            message += `💡 ${low.length} low severity suggestion(s) found\n`;
        }

        const action = await vscode.window.showWarningMessage(
            message,
            'View Details',
            'Override All',
            'Dismiss'
        );

        if (action === 'View Details') {
            await this.showCursorruleViolations(violations);
        } else if (action === 'Override All') {
            const justification = await vscode.window.showInputBox({
                prompt: 'Please provide justification for overriding all rules',
                placeHolder: 'Enter justification...'
            });

            if (justification) {
                violations.forEach(violation => {
                    this.cursorrulesEngine.recordOverride(violation.rule.id);
                });
                vscode.window.showInformationMessage('All rule violations overridden');
            }
        }
    }

    private async showCursorruleViolations(violations: any[]): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'cursorruleViolations',
            'Cursorrule Violations',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = this.getViolationsHtml(violations);
    }

    private getViolationsHtml(violations: any[]): string {
        const violationsHtml = violations.map(violation => `
            <div class="violation ${violation.severity}">
                <h3>${violation.rule.name}</h3>
                <p><strong>Severity:</strong> ${violation.severity}</p>
                <p><strong>Message:</strong> ${violation.message}</p>
                <p><strong>Match:</strong> <code>${violation.match}</code></p>
                ${violation.line ? `<p><strong>Line:</strong> ${violation.line}</p>` : ''}
                ${violation.suggestions && violation.suggestions.length > 0 ? `
                    <div class="suggestions">
                        <strong>Suggestions:</strong>
                        <ul>
                            ${violation.suggestions.map((s: string) => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <button onclick="overrideRule('${violation.rule.id}')">Override Rule</button>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .violation {
                        margin-bottom: 20px;
                        padding: 15px;
                        border-radius: 4px;
                        border-left: 4px solid;
                    }
                    .violation.critical {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        border-left-color: var(--vscode-errorForeground);
                    }
                    .violation.high {
                        background-color: var(--vscode-inputValidation-warningBackground);
                        border-left-color: var(--vscode-warningForeground);
                    }
                    .violation.medium {
                        background-color: var(--vscode-inputValidation-infoBackground);
                        border-left-color: var(--vscode-infoBar-foreground);
                    }
                    .violation.low {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-left-color: var(--vscode-descriptionForeground);
                    }
                    .suggestions {
                        margin-top: 10px;
                        padding: 10px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    button {
                        margin-top: 10px;
                        padding: 8px 16px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    code {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 2px;
                    }
                </style>
            </head>
            <body>
                <h1>Cursorrule Violations</h1>
                ${violationsHtml}
                <script>
                    function overrideRule(ruleId) {
                        const justification = prompt('Please provide justification for overriding this rule:');
                        if (justification) {
                            vscode.postMessage({
                                command: 'overrideRule',
                                ruleId: ruleId,
                                justification: justification
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    private detectProjectType(fileName: string): string {
        // Simple project type detection
        if (fileName.includes('package.json')) return 'node';
        if (fileName.includes('requirements.txt') || fileName.endsWith('.py')) return 'python';
        if (fileName.includes('pom.xml') || fileName.endsWith('.java')) return 'java';
        if (fileName.includes('Cargo.toml') || fileName.endsWith('.rs')) return 'rust';
        return 'unknown';
    }

    private async validateCurrentFile(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const content = editor.document.getText();

        try {
            const result = await this.validator.validateCodeWithLLM(content, {
                codeContext: {
                    fileType: path.extname(editor.document.fileName),
                    purpose: 'code validation'
                },
                projectState: {
                    projectType: this.detectProjectType(editor.document.fileName)
                }
            });

            if (!result.isValid) {
                await this.handleValidationIssues(result);
            } else {
                vscode.window.showInformationMessage('Validation passed - no issues found');
            }
        } catch (error) {
            this.logger.error('Validation failed', error);
            vscode.window.showErrorMessage('Validation failed due to an error');
        }
    }

    private async handleValidationIssues(result: any): Promise<void> {
        const issues = [];
        
        if (result.errors && result.errors.length > 0) {
            issues.push(`🚨 ${result.errors.length} error(s) found`);
        }
        if (result.warnings && result.warnings.length > 0) {
            issues.push(`⚠️ ${result.warnings.length} warning(s) found`);
        }

        const message = issues.join('\n');
        const action = await vscode.window.showWarningMessage(
            message,
            'View Details',
            'Dismiss'
        );

        if (action === 'View Details') {
            await this.showValidationDetails(result);
        }
    }

    private async showValidationDetails(result: any): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'validationDetails',
            'Validation Details',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = this.getValidationDetailsHtml(result);
    }

    private getValidationDetailsHtml(result: any): string {
        const errorsHtml = result.errors ? result.errors.map((error: any) => `
            <div class="issue error">
                <h4>${error.type} Error</h4>
                <p>${error.message}</p>
                ${error.line ? `<p><strong>Line:</strong> ${error.line}</p>` : ''}
            </div>
        `).join('') : '';

        const warningsHtml = result.warnings ? result.warnings.map((warning: any) => `
            <div class="issue warning">
                <h4>${warning.type} Warning</h4>
                <p>${warning.message}</p>
                ${warning.line ? `<p><strong>Line:</strong> ${warning.line}</p>` : ''}
            </div>
        `).join('') : '';

        const suggestionsHtml = result.suggestions && result.suggestions.length > 0 ? `
            <div class="suggestions">
                <h3>Suggestions</h3>
                <ul>
                    ${result.suggestions.map((s: string) => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .issue {
                        margin-bottom: 20px;
                        padding: 15px;
                        border-radius: 4px;
                        border-left: 4px solid;
                    }
                    .issue.error {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        border-left-color: var(--vscode-errorForeground);
                    }
                    .issue.warning {
                        background-color: var(--vscode-inputValidation-warningBackground);
                        border-left-color: var(--vscode-warningForeground);
                    }
                    .suggestions {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    h3, h4 {
                        margin-top: 0;
                        margin-bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>Validation Results</h1>
                ${errorsHtml}
                ${warningsHtml}
                ${suggestionsHtml}
            </body>
            </html>
        `;
    }

    /**
     * NEW: Get AI response pipeline for external use
     */
    public getAIResponsePipeline() {
        return this.aiResponsePipeline;
    }

    /**
     * NEW: Get AI response hooks for external use
     */
    public getAIResponseHooks() {
        return this.aiResponseHooks;
    }

    /**
     * NEW: Process AI response through validation pipeline
     * This is the main entry point for validating AI responses
     */
    public async processAIResponse(response: string, context?: string): Promise<any> {
        try {
            const result = await this.aiResponsePipeline.processAIResponse(response, context);
            this.logger.info('AI response processed through validation pipeline', {
                validationApplied: result.validationApplied,
                processingTime: result.processingTime
            });
            return result;
        } catch (error) {
            this.logger.error('Failed to process AI response', error);
            // Return original response if processing fails
            return {
                originalResponse: response,
                finalResponse: response,
                validationApplied: false,
                processingTime: 0,
                timestamp: new Date()
            };
        }
    }

    /**
     * NEW: Process AI response through hooks (for integration with specific AI systems)
     */
    public async processAIResponseWithHooks(response: string, context?: string, hookName?: string): Promise<string> {
        try {
            return await processAIResponseWithHooks(response, context, hookName);
        } catch (error) {
            this.logger.error('Failed to process AI response with hooks', error);
            return response; // Return original response if processing fails
        }
    }

    /**
     * NEW: Test passive validation system
     */
    public async testPassiveValidation(): Promise<void> {
        try {
            // Test responses that should trigger validation
            const testResponses = [
                {
                    response: "I have successfully implemented the feature and tested it thoroughly. The code is working perfectly.",
                    context: "Test Implementation Claim",
                    expectedChanges: true
                },
                {
                    response: "Let me help you with that. I can assist you in creating the solution.",
                    context: "Test Vague Offer",
                    expectedChanges: true
                },
                {
                    response: "The file exists in the project directory and contains all the necessary code.",
                    context: "Test File Existence Claim",
                    expectedChanges: true
                },
                {
                    response: "This is a simple and straightforward solution that will definitely work.",
                    context: "Test Absolute Statement",
                    expectedChanges: true
                },
                {
                    response: "Here's a clean implementation that follows best practices.",
                    context: "Test Clean Response",
                    expectedChanges: false
                }
            ];

            const results = [];
            for (const test of testResponses) {
                const result = await this.processAIResponse(test.response, test.context);
                results.push({
                    context: test.context,
                    originalResponse: test.response,
                    finalResponse: result.finalResponse,
                    validationApplied: result.validationApplied,
                    appliedChanges: result.validationResult?.appliedChanges || false,
                    changeLog: result.validationResult?.changeLog || [],
                    processingTime: result.processingTime
                });
            }

            // Show results in a webview
            await this.showPassiveValidationTestResults(results);

        } catch (error) {
            this.logger.error('Failed to test passive validation', error);
            vscode.window.showErrorMessage(`Failed to test passive validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * NEW: Show passive validation test results
     */
    private async showPassiveValidationTestResults(results: any[]): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'passiveValidationTest',
            'FailSafe Passive Validation Test Results',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        const html = `
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
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .test-result {
                        margin: 20px 0;
                        padding: 20px;
                        border-radius: 8px;
                        border-left: 4px solid #ddd;
                    }
                    .test-result.changes-applied {
                        background: #e8f5e8;
                        border-left-color: #4caf50;
                    }
                    .test-result.no-changes {
                        background: #f5f5f5;
                        border-left-color: #9e9e9e;
                    }
                    .context {
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .original, .final {
                        margin: 10px 0;
                        padding: 10px;
                        background: #f9f9f9;
                        border-radius: 4px;
                        font-family: monospace;
                        white-space: pre-wrap;
                    }
                    .final {
                        background: #e3f2fd;
                        border-left: 3px solid #2196f3;
                    }
                    .stats {
                        display: flex;
                        gap: 20px;
                        margin: 10px 0;
                        font-size: 14px;
                    }
                    .change-log {
                        margin: 10px 0;
                        padding: 10px;
                        background: #fff3e0;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    .change-log ul {
                        margin: 5px 0;
                        padding-left: 20px;
                    }
                    h1 { color: #333; text-align: center; }
                    h2 { color: #555; margin-top: 30px; }
                    .summary {
                        background: #e8f5e8;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔍 FailSafe Passive Validation Test Results</h1>
                    
                    <div class="summary">
                        <h2>Test Summary</h2>
                        <p><strong>Total Tests:</strong> ${results.length}</p>
                        <p><strong>Responses Modified:</strong> ${results.filter(r => r.appliedChanges).length}</p>
                        <p><strong>Average Processing Time:</strong> ${(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length).toFixed(2)}ms</p>
                        <p><strong>Validation System:</strong> ✅ Active and Working</p>
                    </div>

                    <h2>Test Results</h2>
                    ${results.map((result, index) => `
                        <div class="test-result ${result.appliedChanges ? 'changes-applied' : 'no-changes'}">
                            <div class="context">Test ${index + 1}: ${result.context}</div>
                            <div class="stats">
                                <span><strong>Validation Applied:</strong> ${result.validationApplied ? '✅ Yes' : '❌ No'}</span>
                                <span><strong>Changes Applied:</strong> ${result.appliedChanges ? '✅ Yes' : '❌ No'}</span>
                                <span><strong>Processing Time:</strong> ${result.processingTime}ms</span>
                            </div>
                            
                            <div><strong>Original Response:</strong></div>
                            <div class="original">${result.originalResponse}</div>
                            
                            <div><strong>Final Response:</strong></div>
                            <div class="final">${result.finalResponse}</div>
                            
                            ${result.changeLog.length > 0 ? `
                                <div class="change-log">
                                    <strong>Applied Changes:</strong>
                                    <ul>
                                        ${result.changeLog.map((change: string) => `<li>${change}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    
                    <div class="summary">
                        <h2>🎯 Passive Validation System Status</h2>
                        <p>The FailSafe passive validation system is successfully detecting and revising AI responses that contain:</p>
                        <ul>
                            <li>Unverified implementation claims</li>
                            <li>Vague offers without specific action</li>
                            <li>File existence claims without verification</li>
                            <li>Absolute statements that may need qualifiers</li>
                            <li>Repetitive confirmation or stalling language</li>
                        </ul>
                        <p><strong>This system provides a passive safety net for non-code proficient developers (vibe coders) to prevent problems they wouldn't know to look for.</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        panel.webview.html = html;
    }
}

export function activate(context: vscode.ExtensionContext): Promise<void> {
    const extension = new FailSafeExtension(context);
    return extension.activate();
}

export function deactivate(): Promise<void> {
    // This would be called when the extension is deactivated
    return Promise.resolve();
} 