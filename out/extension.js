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
exports.FailSafeExtension = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const timeoutWatchdog_1 = require("./timeoutWatchdog");
const validator_1 = require("./validator");
const enforcementEngine_1 = require("./enforcementEngine");
const testRunner_1 = require("./testRunner");
const logger_1 = require("./logger");
const projectPlan_1 = require("./projectPlan");
const taskEngine_1 = require("./taskEngine");
const ui_1 = require("./ui");
class FailSafeExtension {
    constructor(context) {
        this.context = context;
        this.logger = new logger_1.Logger();
        this.projectPlan = new projectPlan_1.ProjectPlan(this.logger);
        this.taskEngine = new taskEngine_1.TaskEngine(this.projectPlan, this.logger);
        this.ui = new ui_1.UI(this.projectPlan, this.taskEngine, this.logger);
        this.validator = new validator_1.Validator(this.logger, this.projectPlan);
        this.enforcementEngine = new enforcementEngine_1.EnforcementEngine(this.logger, this.validator, this.projectPlan);
        this.timeoutWatchdog = new timeoutWatchdog_1.TimeoutWatchdog();
        this.testRunner = new testRunner_1.TestRunner();
        this.commands = new commands_1.Commands(this.projectPlan, this.taskEngine, this.ui, this.logger);
    }
    async activate() {
        this.logger.info('FailSafe extension activating...');
        // Register commands
        await this.commands.registerCommands(this.context);
        // Initialize components
        await this.initializeComponents();
        // Set up AI request interception
        this.setupAIRequestInterception();
        this.logger.info('FailSafe extension activated successfully');
    }
    async initializeComponents() {
        try {
            await this.timeoutWatchdog.initialize();
            await this.projectPlan.initialize();
            await this.taskEngine.initialize();
            await this.ui.initialize();
            this.logger.info('All components initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize components:', error);
            throw error;
        }
    }
    setupAIRequestInterception() {
        // Intercept AI requests to enforce validation and adherence
        const originalExecuteCommand = vscode.commands.executeCommand;
        // Override executeCommand to intercept AI-related commands
        vscode.commands.executeCommand = async (command, ...args) => {
            if (this.isAICommand(command)) {
                return await this.handleAIRequest(command, args);
            }
            return originalExecuteCommand(command, ...args);
        };
        this.logger.info('AI request interception set up');
    }
    isAICommand(command) {
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
    async handleAIRequest(command, args) {
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
        }
        catch (error) {
            this.logger.error('Error handling AI request:', error);
            throw error;
        }
    }
    async executeOriginalCommand(command, args) {
        // This would execute the actual AI command
        // For now, we'll simulate the behavior
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, data: 'AI response simulation' });
            }, 2000);
        });
    }
    async validateAIResponseWithEnforcement(response, command, args) {
        this.logger.info('Validating AI response with enhanced enforcement...');
        // Extract the actual response content
        const responseContent = this.extractResponseContent(response);
        const validationContext = await this.buildValidationContext(command, args);
        // Use enhanced enforcement validation
        const enforcementResult = await this.enforcementEngine.enforceValidation(responseContent, validationContext);
        // Handle validation and enforcement results
        await this.handleEnforcementResults(enforcementResult, responseContent);
    }
    extractResponseContent(response) {
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
    async buildValidationContext(command, args) {
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
    detectProjectType() {
        // Detect project type based on workspace files
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return 'unknown';
        const files = vscode.workspace.findFiles('**/*', '**/node_modules/**');
        // This would be implemented to analyze workspace files
        return 'typescript'; // Placeholder
    }
    async detectTechStack() {
        // Detect tech stack based on package.json, tsconfig.json, etc.
        const techStack = [];
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
        }
        catch (error) {
            this.logger.error('Error detecting tech stack', error);
        }
        return techStack.length > 0 ? techStack : ['unknown'];
    }
    extractDependenciesFromArgs(args) {
        const dependencies = [];
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
    detectFileType(args) {
        // Detect file type from args or current editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            const extension = fileName.split('.').pop()?.toLowerCase();
            return extension || 'unknown';
        }
        return 'unknown';
    }
    estimateComplexity(args) {
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
        if (totalLength > 5000 || hasCode)
            return 'high';
        if (totalLength > 1000)
            return 'medium';
        return 'low';
    }
    estimateSize(args) {
        let totalSize = 0;
        args.forEach(arg => {
            if (typeof arg === 'string') {
                totalSize += arg.length;
            }
        });
        return totalSize;
    }
    determinePurpose(command, args) {
        if (command.includes('refactor'))
            return 'refactoring';
        if (command.includes('fix'))
            return 'bug_fix';
        if (command.includes('generate'))
            return 'code_generation';
        if (command.includes('test'))
            return 'testing';
        if (command.includes('explain'))
            return 'explanation';
        return 'general';
    }
    calculateSuccessRate() {
        // Calculate success rate from validation history
        const history = this.validator.getValidationHistory();
        let totalValidations = 0;
        let successfulValidations = 0;
        history.forEach((result) => {
            totalValidations++;
            if (result.isValid) {
                successfulValidations++;
            }
        });
        return totalValidations > 0 ? successfulValidations / totalValidations : 0;
    }
    getCommonIssues() {
        // Extract common issues from validation history
        const history = this.validator.getValidationHistory();
        const issueCounts = new Map();
        history.forEach((result) => {
            result.errors?.forEach((error) => {
                const key = error.type + ': ' + error.message.substring(0, 50);
                issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
            });
        });
        return Array.from(issueCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([issue, _]) => issue);
    }
    async handleEnforcementResults(enforcementResult, content) {
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
    async handleValidationIssues(validationResult, content) {
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
            const shouldOverride = await this.promptForOverride(validationResult);
            if (!shouldOverride) {
                throw new Error('AI response validation failed - user chose not to override');
            }
        }
        else {
            throw new Error('AI response validation failed - safety issues cannot be overridden');
        }
    }
    async handleEnforcementIssues(enforcementResults, content) {
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
    async showCriticalEnforcementIssues(issues) {
        const message = `Critical enforcement issues detected:\n${issues.map(i => `• ${i.message}`).join('\n')}`;
        await vscode.window.showErrorMessage(message, 'View Details', 'Override', 'Cancel');
    }
    async showHighEnforcementIssues(issues) {
        const message = `High-severity enforcement issues detected:\n${issues.map(i => `• ${i.message}`).join('\n')}`;
        await vscode.window.showWarningMessage(message, 'View Details', 'Override', 'Continue');
    }
    async showEnforcementSuggestions(suggestions) {
        const message = `Enforcement suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        await vscode.window.showInformationMessage(message, 'Apply Suggestions', 'Dismiss');
    }
    async showAdaptiveSuggestions(suggestions) {
        const message = `Adaptive suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        await vscode.window.showInformationMessage(message, 'Learn More', 'Dismiss');
    }
    updateUserPreferences(enforcementResults) {
        // Update enforcement engine preferences based on user behavior
        const overrideCount = enforcementResults.filter(r => r.severity === 'high').length;
        if (overrideCount > 0) {
            this.enforcementEngine.setUserPreference('overrideRate', overrideCount);
        }
    }
    async showValidationIssues(validationResult) {
        const issues = [
            ...validationResult.errors.map((e) => `❌ ${e.message}`),
            ...validationResult.warnings.map((w) => `⚠️ ${w.message}`)
        ];
        if (issues.length > 0) {
            const message = `FailSafe Validation Issues:\n${issues.join('\n')}`;
            await vscode.window.showWarningMessage(message, 'View Details', 'Override', 'Cancel');
        }
    }
    async promptForOverride(validationResult) {
        const result = await vscode.window.showWarningMessage('Validation issues detected. Do you want to override?', 'Override', 'Cancel');
        return result === 'Override';
    }
    getConfig() {
        return vscode.workspace.getConfiguration('failsafe');
    }
    async deactivate() {
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
    getLogger() { return this.logger; }
    getValidator() { return this.validator; }
    getEnforcementEngine() { return this.enforcementEngine; }
    getTestRunner() { return this.testRunner; }
    getProjectPlan() { return this.projectPlan; }
    getTaskEngine() { return this.taskEngine; }
    getUI() { return this.ui; }
    getContext() { return this.context; }
}
exports.FailSafeExtension = FailSafeExtension;
function activate(context) {
    const extension = new FailSafeExtension(context);
    return extension.activate();
}
function deactivate() {
    // This would be called when the extension is deactivated
    return Promise.resolve();
}
//# sourceMappingURL=extension.js.map