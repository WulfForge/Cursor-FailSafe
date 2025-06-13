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
const commands_1 = require("./src/commands");
const timeoutWatchdog_1 = require("./src/timeoutWatchdog");
const validator_1 = require("./src/validator");
const testRunner_1 = require("./src/testRunner");
const logger_1 = require("./src/logger");
const projectPlan_1 = require("./src/projectPlan");
const taskEngine_1 = require("./src/taskEngine");
const ui_1 = require("./src/ui");
class FailSafeExtension {
    constructor(context) {
        this.context = context;
        this.logger = new logger_1.Logger();
        this.validator = new validator_1.Validator();
        this.timeoutWatchdog = new timeoutWatchdog_1.TimeoutWatchdog();
        this.testRunner = new testRunner_1.TestRunner();
        this.projectPlan = new projectPlan_1.ProjectPlan(this.logger);
        this.taskEngine = new taskEngine_1.TaskEngine(this.projectPlan, this.logger);
        this.ui = new ui_1.UI(this.projectPlan, this.taskEngine, this.logger);
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
            // Validate the AI response
            await this.validateAIResponse(result, command, args);
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
    async validateAIResponse(response, command, args) {
        this.logger.info('Validating AI response...');
        // Extract the actual response content
        const responseContent = this.extractResponseContent(response);
        const context = this.buildValidationContext(command, args);
        // Use LLM-guided validation
        const validationResult = await this.validator.validateCodeWithLLM(responseContent, context);
        if (!validationResult.isValid) {
            await this.handleValidationIssues(validationResult, responseContent);
        }
        else {
            this.logger.info('AI response validation passed');
        }
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
    buildValidationContext(command, args) {
        return `Command: ${command}
Args: ${JSON.stringify(args, null, 2)}
Timestamp: ${new Date().toISOString()}
Extension: FailSafe Validation Context`;
    }
    async handleValidationIssues(validationResult, content) {
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
        }
        else {
            throw new Error('AI response validation failed - safety issues cannot be overridden');
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