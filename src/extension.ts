import * as vscode from 'vscode';
import { Commands } from './commands';
import { TimeoutWatchdog } from './timeoutWatchdog';
import { Validator, ValidationContext } from './validator';
import { ValidationResult } from './types';
import { EnforcementEngine } from './enforcementEngine';
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

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = new Logger();
        this.projectPlan = new ProjectPlan(this.logger);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger);
        this.ui = new UI(this.projectPlan, this.taskEngine, this.logger);
        this.validator = new Validator(this.logger, this.projectPlan);
        this.enforcementEngine = new EnforcementEngine(this.logger, this.validator, this.projectPlan);
        this.timeoutWatchdog = new TimeoutWatchdog();
        this.testRunner = new TestRunner();
        this.commands = new Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);
    }

    public async activate(): Promise<void> {
        this.logger.info('FailSafe extension activating...');
        
        // Register commands
        await this.commands.registerCommands(this.context);
        
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
        const originalExecuteCommand = vscode.commands.executeCommand;
        
        // Override executeCommand to intercept AI-related commands
        (vscode.commands as any).executeCommand = async (command: string, ...args: any[]) => {
            if (this.isAICommand(command)) {
                return await this.handleAIRequest(command, args);
            }
            return originalExecuteCommand(command, ...args);
        };

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

    private async handleAIRequest(command: string, args: any[]): Promise<any> {
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

    private async executeOriginalCommand(command: string, args: any[]): Promise<any> {
        // This would execute the actual AI command
        // For now, we'll simulate the behavior
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, data: 'AI response simulation' });
            }, 2000);
        });
    }

    private async validateAIResponseWithEnforcement(response: any, command: string, args: any[]): Promise<void> {
        this.logger.info('Validating AI response with enhanced enforcement...');
        
        // Extract the actual response content
        const responseContent = this.extractResponseContent(response);
        const validationContext = await this.buildValidationContext(command, args);
        
        // Use enhanced enforcement validation
        const enforcementResult = await this.enforcementEngine.enforceValidation(responseContent, validationContext);
        
        // Handle validation and enforcement results
        await this.handleEnforcementResults(enforcementResult, responseContent);
    }

    private extractResponseContent(response: any): string {
        // Extract the actual code/content from the AI response
        if (typeof response === 'string') {
            return response;
        }
        
        if (response && typeof response === 'object') {
            // Look for common response patterns
            return response.content || response.data || response.text || 
                   response.code || response.message || JSON.stringify(response);
        }
        
        return String(response);
    }

    private async buildValidationContext(command: string, args: any[]): Promise<ValidationContext> {
        const currentTask = this.projectPlan.getCurrentTask();
        const projectProgress = this.projectPlan.getProjectProgress();
        
        return {
            projectState: {
                currentTask: currentTask?.name,
                projectType: this.detectProjectType(),
                techStack: await this.detectTechStack(),
                dependencies: this.extractDependenciesFromArgs(args)
            },
            codeContext: {
                fileType: this.detectFileType(args),
                complexity: this.estimateComplexity(args),
                size: this.estimateSize(args),
                purpose: this.determinePurpose(command, args)
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

        const files = vscode.workspace.findFiles('**/*', '**/node_modules/**');
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

    private extractDependenciesFromArgs(args: any[]): string[] {
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

    private detectFileType(args: any[]): string {
        // Detect file type from args or current editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            const extension = fileName.split('.').pop()?.toLowerCase();
            return extension || 'unknown';
        }
        return 'unknown';
    }

    private estimateComplexity(args: any[]): 'low' | 'medium' | 'high' {
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

    private estimateSize(args: any[]): number {
        let totalSize = 0;
        args.forEach(arg => {
            if (typeof arg === 'string') {
                totalSize += arg.length;
            }
        });
        return totalSize;
    }

    private determinePurpose(command: string, args: any[]): string {
        if (command.includes('refactor')) return 'refactoring';
        if (command.includes('fix')) return 'bug_fix';
        if (command.includes('generate')) return 'code_generation';
        if (command.includes('test')) return 'testing';
        if (command.includes('explain')) return 'explanation';
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
            result.errors?.forEach((error: any) => {
                const key = error.type + ': ' + error.message.substring(0, 50);
                issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
            });
        });
        
        return Array.from(issueCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([issue, _]) => issue);
    }

    private async handleEnforcementResults(enforcementResult: {
        validationResult: any;
        enforcementResults: any[];
        adaptiveSuggestions: string[];
    }, content: string): Promise<void> {
        const { validationResult, enforcementResults, adaptiveSuggestions } = enforcementResult;

        // Log enforcement results
        this.logger.info('Enforcement validation completed', {
            validationPassed: validationResult.isValid,
            enforcementRulesTriggered: enforcementResults.length,
            adaptiveSuggestions: adaptiveSuggestions.length
        });

        // Handle validation issues
        if (!validationResult.isValid) {
            await this.handleValidationIssues(validationResult, content);
        }

        // Handle enforcement issues
        if (enforcementResults.length > 0) {
            await this.handleEnforcementIssues(enforcementResults, content);
        }

        // Show adaptive suggestions
        if (adaptiveSuggestions.length > 0) {
            await this.showAdaptiveSuggestions(adaptiveSuggestions);
        }

        // Update user preferences based on behavior
        this.updateUserPreferences(enforcementResults);
    }

    private async handleValidationIssues(validationResult: any, content: string): Promise<void> {
        this.logger.warn('Validation issues detected:', validationResult);
        
        // Show validation issues in UI
        await this.showValidationIssues(validationResult);
        
        // Check if override is allowed
        const config = this.getConfig();
        if (this.validator.shouldAllowOverride(validationResult, config)) {
            const shouldOverride = await this.promptForOverride(validationResult);
            if (!shouldOverride) {
                throw new Error('AI response validation failed - user chose not to override');
            }
        } else {
            throw new Error('AI response validation failed - safety issues cannot be overridden');
        }
    }

    private async handleEnforcementIssues(enforcementResults: any[], content: string): Promise<void> {
        const criticalIssues = enforcementResults.filter(r => r.severity === 'critical');
        const highIssues = enforcementResults.filter(r => r.severity === 'high');

        if (criticalIssues.length > 0) {
            this.logger.error('Critical enforcement issues detected', { criticalIssues });
            await this.showCriticalEnforcementIssues(criticalIssues);
        }

        if (highIssues.length > 0) {
            this.logger.warn('High-severity enforcement issues detected', { highIssues });
            await this.showHighEnforcementIssues(highIssues);
        }

        // Show all enforcement suggestions
        const allSuggestions = enforcementResults.flatMap(r => r.suggestions);
        if (allSuggestions.length > 0) {
            await this.showEnforcementSuggestions(allSuggestions);
        }
    }

    private async showCriticalEnforcementIssues(issues: any[]): Promise<void> {
        const message = `Critical enforcement issues detected:\n${issues.map(i => `• ${i.message}`).join('\n')}`;
        await vscode.window.showErrorMessage(message, 'View Details', 'Override', 'Cancel');
    }

    private async showHighEnforcementIssues(issues: any[]): Promise<void> {
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

    private updateUserPreferences(enforcementResults: any[]): void {
        // Update enforcement engine preferences based on user behavior
        const overrideCount = enforcementResults.filter(r => r.severity === 'high').length;
        if (overrideCount > 0) {
            this.enforcementEngine.setUserPreference('overrideRate', overrideCount);
        }
    }

    private async showValidationIssues(validationResult: any): Promise<void> {
        const issues = [
            ...validationResult.errors.map((e: any) => `❌ ${e.message}`),
            ...validationResult.warnings.map((w: any) => `⚠️ ${w.message}`)
        ];

        if (issues.length > 0) {
            const message = `FailSafe Validation Issues:\n${issues.join('\n')}`;
            await vscode.window.showWarningMessage(message, 'View Details', 'Override', 'Cancel');
        }
    }

    private async promptForOverride(validationResult: any): Promise<boolean> {
        const result = await vscode.window.showWarningMessage(
            'Validation issues detected. Do you want to override?',
            'Override',
            'Cancel'
        );
        return result === 'Override';
    }

    private getConfig(): any {
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