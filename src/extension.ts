import * as vscode from 'vscode';
import { Commands } from './commands';
import { TimeoutWatchdog } from './timeoutWatchdog';
import { Validator, ValidationContext } from './validator';
import { ValidationResult, ValidationError, ValidationWarning } from './types';
import { EnforcementEngine, EnforcementResult } from './enforcementEngine';
import { TestRunner } from './testRunner';
import { Logger } from './logger';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import { UI } from './ui';

export class FailSafeExtension {
    private commands: Commands;
    private timeoutWatchdog: TimeoutWatchdog;
    private validator: Validator;
    private enforcementEngine: EnforcementEngine;
    private testRunner: TestRunner;
    private logger: Logger;
    private projectPlan: ProjectPlan;
    private taskEngine: TaskEngine;
    private ui: UI;
    private context: vscode.ExtensionContext;
    private originalExecuteCommand: typeof vscode.commands.executeCommand;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = new Logger();
        this.projectPlan = new ProjectPlan(this.logger);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.enforcementEngine = new EnforcementEngine(this.logger, this.validator, this.projectPlan);
        this.testRunner = new TestRunner();
        this.timeoutWatchdog = new TimeoutWatchdog();
        this.ui = new UI(this.projectPlan, this.taskEngine, this.logger, context);
        this.commands = new Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);
        this.originalExecuteCommand = vscode.commands.executeCommand;
    }

    public async activate(): Promise<void> {
        this.logger.info('FailSafe extension activating...');
        
        // Register commands
        await this.commands.registerCommands(this.context);
        
        // Register sidebar
        this.ui.registerSidebar(this.context);
        
        // Register simulation command
        this.ui.registerSimulationCommand(this.context);
        
        // Register plan validation command
        this.ui.registerPlanValidationCommand(this.context);
        
        // Register failsafe configuration command
        this.ui.registerFailsafeConfigCommand(this.context);
        
        // Initialize components
        await this.initializeComponents();
        
        // Set up AI request interception
        this.setupAIRequestInterception();
        
        this.logger.info('FailSafe extension activated successfully');
    }

    private async initializeComponents(): Promise<void> {
        try {
            await this.timeoutWatchdog.initialize();
            await this.projectPlan.initialize();
            await this.taskEngine.initialize();
            await this.ui.initialize();
            
            this.logger.info('All components initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize components:', error);
            throw error;
        }
    }

    private setupAIRequestInterception(): void {
        // Intercept AI requests to enforce validation and adherence
        
        // Override executeCommand to intercept AI-related commands
        (vscode.commands as { executeCommand: typeof vscode.commands.executeCommand }).executeCommand = async function<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
            // Use closure to access the extension instance
            const extension = (globalThis as Record<string, unknown>).__failsafeExtension as FailSafeExtension;
            if (extension && extension.isAICommand(command)) {
                return await extension.handleAIRequest(command, args) as T;
            }
            return extension.originalExecuteCommand(command, ...args);
        };

        // Store reference to this extension instance globally for the interceptor
        (globalThis as Record<string, unknown>).__failsafeExtension = this;

        this.logger.info('AI request interception set up');
    }

    private isAICommand(command: string): boolean {
        const aiCommands = [
            'cursor.chat',
            'cursor.generate',
            'cursor.edit',
            'cursor.explain',
            'cursor.fix',
            'cursor.test',
            'cursor.refactor'
        ];
        return aiCommands.some(cmd => command.includes(cmd));
    }

    private async handleAIRequest(command: string, args: unknown[]): Promise<unknown> {
        this.logger.info(`Intercepting AI request: ${command}`);
        
        try {
            // Start timeout watchdog
            const timeoutPromise = this.timeoutWatchdog.startWatching(command, args);
            
            // Execute the original command
            const resultPromise = this.executeOriginalCommand(command, args);
            
            // Wait for either completion or timeout
            const result = await Promise.race([resultPromise, timeoutPromise]);
            
            // Validate the AI response with enhanced enforcement
            await this.validateAIResponseWithEnforcement(result, command, args);
            
            return result;
            
        } catch (error) {
            this.logger.error('Error handling AI request:', error);
            throw error;
        }
    }

    private async executeOriginalCommand(command: string, args: unknown[]): Promise<unknown> {
        // This would execute the actual AI command
        // For now, we'll simulate the behavior
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, data: 'AI response simulation' });
            }, 2000);
        });
    }

    private async validateAIResponseWithEnforcement(response: unknown, command: string, args: unknown[]): Promise<void> {
        this.logger.info('Validating AI response with enhanced enforcement...');
        
        // Extract the actual response content
        const responseContent = this.extractResponseContent(response);
        const validationContext = await this.buildValidationContext(command, args);
        
        // Use enhanced enforcement validation
        const enforcementResult = await this.enforcementEngine.enforceValidation(responseContent, validationContext);
        
        // Handle validation and enforcement results
        await this.handleEnforcementResults(enforcementResult, responseContent);
    }

    private extractResponseContent(response: unknown): string {
        // Extract the actual code/content from the AI response
        if (typeof response === 'string') {
            return response;
        }
        
        if (response && typeof response === 'object') {
            // Look for common response patterns
            const obj = response as Record<string, unknown>;
            return (obj.content as string) || (obj.data as string) || (obj.text as string) || 
                   (obj.code as string) || (obj.message as string) || JSON.stringify(response);
        }
        
        return String(response);
    }

    private async buildValidationContext(command: string, args: unknown[]): Promise<ValidationContext> {
        const currentTask = this.projectPlan.getCurrentTask();
        
        return {
            projectState: {
                currentTask: currentTask?.name,
                projectType: this.detectProjectType(),
                techStack: await this.detectTechStack(),
                dependencies: this.extractDependenciesFromArgs(args)
            },
            codeContext: {
                fileType: this.detectFileType(),
                complexity: this.estimateComplexity(args),
                size: this.estimateSize(args),
                purpose: this.determinePurpose(command)
            },
            userPreferences: {
                strictMode: this.getConfig().get('validation.strictMode', false),
                focusAreas: this.getConfig().get('validation.focusAreas', []),
                ignorePatterns: this.getConfig().get('validation.ignorePatterns', [])
            },
            previousResults: {
                successRate: this.calculateSuccessRate(),
                commonIssues: this.getCommonIssues(),
                lastValidation: new Date()
            }
        };
    }

    private detectProjectType(): string {
        // Detect project type based on workspace files
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return 'unknown';

        // This would be implemented to analyze workspace files
        return 'typescript'; // Placeholder
    }

    private async detectTechStack(): Promise<string[]> {
        // Detect tech stack based on package.json, tsconfig.json, etc.
        const techStack: string[] = [];
        
        try {
            // Check for TypeScript
            const tsconfigFiles = await vscode.workspace.findFiles('**/tsconfig.json', '**/node_modules/**');
            if (tsconfigFiles.length > 0) {
                techStack.push('typescript');
            }
            
            // Check for Node.js
            const packageFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
            if (packageFiles.length > 0) {
                techStack.push('nodejs');
            }
            
            // Check for React
            const reactFiles = await vscode.workspace.findFiles('**/react', '**/react-dom');
            if (reactFiles.length > 0) {
                techStack.push('react');
            }
        } catch (error) {
            this.logger.error('Error detecting tech stack', error);
        }
        
        return techStack.length > 0 ? techStack : ['unknown'];
    }

    private extractDependenciesFromArgs(args: unknown[]): string[] {
        const dependencies: string[] = [];
        
        args.forEach(arg => {
            if (typeof arg === 'string') {
                // Extract potential dependencies from the prompt
                const depMatches = arg.match(/import\s+.*from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]/g);
                if (depMatches) {
                    depMatches.forEach(match => {
                        const dep = match.match(/['"]([^'"]+)['"]/)?.[1];
                        if (dep && !dep.startsWith('.')) {
                            dependencies.push(dep);
                        }
                    });
                }
            }
        });
        
        return [...new Set(dependencies)];
    }

    private detectFileType(): string {
        // Detect file type from args or current editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            const extension = fileName.split('.').pop()?.toLowerCase();
            return extension || 'unknown';
        }
        return 'unknown';
    }

    private estimateComplexity(args: unknown[]): 'low' | 'medium' | 'high' {
        let totalLength = 0;
        let hasCode = false;
        
        args.forEach(arg => {
            if (typeof arg === 'string') {
                totalLength += arg.length;
                if (arg.includes('function') || arg.includes('class') || arg.includes('import')) {
                    hasCode = true;
                }
            }
        });
        
        if (totalLength > 5000 || hasCode) return 'high';
        if (totalLength > 1000) return 'medium';
        return 'low';
    }

    private estimateSize(args: unknown[]): number {
        let totalSize = 0;
        args.forEach(arg => {
            if (typeof arg === 'string') {
                totalSize += arg.length;
            }
        });
        return totalSize;
    }

    private determinePurpose(command: string): string {
        if (command.includes('generate')) return 'code-generation';
        if (command.includes('edit')) return 'code-editing';
        if (command.includes('explain')) return 'code-explanation';
        if (command.includes('fix')) return 'bug-fixing';
        if (command.includes('test')) return 'testing';
        if (command.includes('refactor')) return 'refactoring';
        return 'general';
    }

    private calculateSuccessRate(): number {
        // Calculate success rate from validation history
        const history = this.validator.getValidationHistory();
        let totalValidations = 0;
        let successfulValidations = 0;
        
        history.forEach((result: ValidationResult) => {
            totalValidations++;
            if (result.isValid) {
                successfulValidations++;
            }
        });
        
        return totalValidations > 0 ? successfulValidations / totalValidations : 0;
    }

    private getCommonIssues(): string[] {
        // Extract common issues from validation history
        const history = this.validator.getValidationHistory();
        const issueCounts = new Map<string, number>();
        
        history.forEach((result: ValidationResult) => {
            result.errors?.forEach((error: ValidationError) => {
                const key = error.type + ': ' + error.message.substring(0, 50);
                issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
            });
        });
        
        return Array.from(issueCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([issue]) => issue);
    }

    private async handleEnforcementResults(enforcementResult: {
        validationResult: ValidationResult;
        enforcementResults: EnforcementResult[];
        adaptiveSuggestions: string[];
    }, content: string): Promise<void> {
        const { validationResult, enforcementResults, adaptiveSuggestions } = enforcementResult;

        // Log enforcement results
        this.logger.info('Enforcement validation completed', {
            validationPassed: validationResult.isValid,
            enforcementRulesTriggered: enforcementResults.length,
            adaptiveSuggestions: adaptiveSuggestions.length
        });

        // Log to UI action log
        this.ui["actionLog"].push({
            timestamp: new Date().toISOString(),
            description: `Enforcement validation completed. Passed: ${validationResult.isValid}, Rules triggered: ${enforcementResults.length}`
        });
        this.ui.updateStatusBar(validationResult.isValid ? 'active' : 'blocked');

        // Handle validation issues
        if (!validationResult.isValid) {
            await this.handleValidationIssues(validationResult);
        }

        // Handle enforcement issues
        if (enforcementResults.length > 0) {
            await this.handleEnforcementIssues(enforcementResults);
        }

        // Show adaptive suggestions
        if (adaptiveSuggestions.length > 0) {
            await this.showAdaptiveSuggestions(adaptiveSuggestions);
        }

        // Update user preferences based on behavior
        this.updateUserPreferences(enforcementResults);
    }

    private async handleValidationIssues(validationResult: ValidationResult): Promise<void> {
        this.logger.warn('Validation issues detected:', validationResult);
        // Log to UI action log
        this.ui["actionLog"].push({
            timestamp: new Date().toISOString(),
            description: `Validation issues detected: ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings.`
        });
        this.ui.updateStatusBar('blocked');
        // Show validation issues in UI
        await this.showValidationIssues(validationResult);
        // Check if override is allowed
        const config = this.getConfig();
        if (this.validator.shouldAllowOverride(validationResult, config)) {
            const shouldOverride = await this.promptForOverride();
            if (!shouldOverride) {
                throw new Error('AI response validation failed - user chose not to override');
            }
        } else {
            throw new Error('AI response validation failed - safety issues cannot be overridden');
        }
    }

    private async handleEnforcementIssues(enforcementResults: EnforcementResult[]): Promise<void> {
        const criticalIssues = enforcementResults.filter(r => r.severity === 'critical');
        const highIssues = enforcementResults.filter(r => r.severity === 'high');
        if (criticalIssues.length > 0) {
            this.logger.error('Critical enforcement issues detected', { criticalIssues });
            this.ui["actionLog"].push({
                timestamp: new Date().toISOString(),
                description: `Critical enforcement issues detected: ${criticalIssues.length}`
            });
            this.ui.updateStatusBar('blocked');
            await this.showCriticalEnforcementIssues(criticalIssues);
        }
        if (highIssues.length > 0) {
            this.logger.warn('High-severity enforcement issues detected', { highIssues });
            this.ui["actionLog"].push({
                timestamp: new Date().toISOString(),
                description: `High-severity enforcement issues detected: ${highIssues.length}`
            });
            this.ui.updateStatusBar('blocked');
            await this.showHighEnforcementIssues(highIssues);
        }
        // Show all enforcement suggestions
        const allSuggestions = enforcementResults.flatMap(r => r.suggestions);
        if (allSuggestions.length > 0) {
            await this.showEnforcementSuggestions(allSuggestions);
        }
    }

    private async showCriticalEnforcementIssues(issues: EnforcementResult[]): Promise<void> {
        const message = `Critical enforcement issues detected:\n${issues.map(i => `• ${i.message}`).join('\n')}`;
        await vscode.window.showErrorMessage(message, 'View Details', 'Override', 'Cancel');
    }

    private async showHighEnforcementIssues(issues: EnforcementResult[]): Promise<void> {
        const message = `High-severity enforcement issues detected:\n${issues.map(i => `• ${i.message}`).join('\n')}`;
        await vscode.window.showWarningMessage(message, 'View Details', 'Override', 'Continue');
    }

    private async showEnforcementSuggestions(suggestions: string[]): Promise<void> {
        const message = `Enforcement suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        await vscode.window.showInformationMessage(message, 'Apply Suggestions', 'Dismiss');
    }

    private async showAdaptiveSuggestions(suggestions: string[]): Promise<void> {
        const message = `Adaptive suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        await vscode.window.showInformationMessage(message, 'Learn More', 'Dismiss');
    }

    private updateUserPreferences(enforcementResults: EnforcementResult[]): void {
        // Update enforcement engine preferences based on user behavior
        const overrideCount = enforcementResults.filter(r => r.severity === 'high').length;
        if (overrideCount > 0) {
            this.enforcementEngine.setUserPreference('overrideRate', overrideCount);
        }
    }

    private async showValidationIssues(validationResult: ValidationResult): Promise<void> {
        const issues = [
            ...validationResult.errors.map((e: ValidationError) => `❌ ${e.message}`),
            ...validationResult.warnings.map((w: ValidationWarning) => `⚠️ ${w.message}`)
        ];

        if (issues.length > 0) {
            const message = `FailSafe Validation Issues:\n${issues.join('\n')}`;
            await vscode.window.showWarningMessage(message, 'View Details', 'Override', 'Cancel');
        }
    }

    private async promptForOverride(): Promise<boolean> {
        const result = await vscode.window.showWarningMessage(
            'Validation issues detected. Do you want to override?',
            'Override',
            'Cancel'
        );
        return result === 'Override';
    }

    private getConfig(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('failsafe');
    }

    public async deactivate(): Promise<void> {
        this.logger.info('FailSafe extension deactivating...');
        
        // Cleanup
        await this.timeoutWatchdog.cleanup();
        // Note: ProjectPlan doesn't have a cleanup method, so we'll just save the project
        await this.projectPlan.saveProject();
        this.taskEngine.stop();
        this.ui.dispose();
        
        this.logger.info('FailSafe extension deactivated');
    }

    // Getters for other components
    public getLogger(): Logger { return this.logger; }
    public getValidator(): Validator { return this.validator; }
    public getEnforcementEngine(): EnforcementEngine { return this.enforcementEngine; }
    public getTestRunner(): TestRunner { return this.testRunner; }
    public getProjectPlan(): ProjectPlan { return this.projectPlan; }
    public getTaskEngine(): TaskEngine { return this.taskEngine; }
    public getUI(): UI { return this.ui; }
    public getContext(): vscode.ExtensionContext { return this.context; }
}

export function activate(context: vscode.ExtensionContext): Promise<void> {
    const extension = new FailSafeExtension(context);
    return extension.activate();
}

export function deactivate(): Promise<void> {
    // This would be called when the extension is deactivated
    return Promise.resolve();
} 