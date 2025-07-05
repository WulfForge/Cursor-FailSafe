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
exports.AIResponseValidator = void 0;
const vscode = __importStar(require("vscode"));
const cursorrulesEngine_1 = require("./cursorrulesEngine");
const chatValidator_1 = require("./chatValidator");
const validator_1 = require("./validator");
const projectPlan_1 = require("./projectPlan");
class AIResponseValidator {
    constructor(context, logger) {
        this.cursorrulesEngine = new cursorrulesEngine_1.CursorrulesEngine(context, logger);
        this.chatValidator = new chatValidator_1.ChatValidator(logger, context.extensionPath);
        this.validator = new validator_1.Validator(logger, new projectPlan_1.ProjectPlan(logger));
        this.logger = logger;
    }
    /**
     * Main entry point for validating AI assistant responses
     * This should be called BEFORE any AI response is displayed to the user
     */
    async validateAIResponse(response, context) {
        const startTime = Date.now();
        this.logger.info('Starting AI response validation', { responseLength: response.length });
        try {
            // Step 1: Apply CursorRules validation (most important for passive control)
            const cursorRulesResult = await this.applyCursorRulesValidation(response);
            // Step 2: Apply chat validation for hallucination detection
            const chatValidationResult = await this.chatValidator.validateChat(cursorRulesResult.validatedResponse);
            // Step 3: Apply comprehensive AI response validation
            const actualFiles = await this.getActualFilesInWorkspace();
            const aiValidationResult = this.validator.validateAIResponse(cursorRulesResult.validatedResponse, context || 'AI Response', actualFiles);
            // Step 4: Combine all validation results
            const finalResult = {
                originalResponse: response,
                validatedResponse: cursorRulesResult.validatedResponse,
                isValid: chatValidationResult.isValid && aiValidationResult.isValid,
                appliedChanges: cursorRulesResult.appliedChanges,
                changeLog: cursorRulesResult.changeLog,
                warnings: [
                    ...chatValidationResult.warnings.map(w => w.message),
                    ...aiValidationResult.warnings.map(w => w.message)
                ],
                errors: [
                    ...chatValidationResult.errors.map(e => e.message),
                    ...aiValidationResult.errors.map(e => e.message)
                ],
                timestamp: new Date()
            };
            // Step 5: Add passive feedback if changes were applied
            if (finalResult.appliedChanges && finalResult.changeLog.length > 0) {
                finalResult.validatedResponse += this.generatePassiveFeedback(finalResult.changeLog);
            }
            const duration = Date.now() - startTime;
            this.logger.info('AI response validation completed', {
                duration,
                appliedChanges: finalResult.appliedChanges,
                changeCount: finalResult.changeLog.length,
                warningCount: finalResult.warnings.length,
                errorCount: finalResult.errors.length
            });
            return finalResult;
        }
        catch (error) {
            this.logger.error('AI response validation failed', error);
            // Return original response with validation failure notice
            const validationFailureNotice = this.generateValidationFailureNotice(error);
            const responseWithNotice = response + validationFailureNotice;
            return {
                originalResponse: response,
                validatedResponse: responseWithNotice,
                isValid: false,
                appliedChanges: false,
                changeLog: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
                errors: [`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`],
                timestamp: new Date()
            };
        }
    }
    /**
     * Apply CursorRules validation to the response
     */
    async applyCursorRulesValidation(response) {
        try {
            // Apply CursorRules validation
            const validatedResponse = await this.cursorrulesEngine.applyCursorRulesToHtml(response);
            // Check if verification enforcement rules were triggered
            await this.checkForVerificationEnforcement(response);
            const appliedChanges = validatedResponse !== response;
            const changeLog = [];
            if (appliedChanges) {
                changeLog.push('CursorRules validation applied');
            }
            return {
                validatedResponse,
                appliedChanges,
                changeLog
            };
        }
        catch (error) {
            this.logger.error('Error applying CursorRules validation', error);
            return {
                validatedResponse: response,
                appliedChanges: false,
                changeLog: []
            };
        }
    }
    /**
     * Check if verification enforcement rules were triggered and automatically trigger full verification
     */
    async checkForVerificationEnforcement(response) {
        try {
            const verificationPatterns = [
                /compile\s+and\s+package/i,
                /package\s+for\s+review/i,
                /build\s+package/i,
                /generate\s+package/i,
                /create\s+package/i,
                /npm\s+run\s+package/i
            ];
            const isVerificationTriggered = verificationPatterns.some(pattern => pattern.test(response));
            if (isVerificationTriggered) {
                this.logger.warn('🚨 Verification enforcement rule triggered - automatic full verification process initiated');
                // Show immediate notification
                vscode.window.showWarningMessage('🚨 Full Verification Process Required!', 'Run Full Pipeline', 'Cancel').then(async (selection) => {
                    if (selection === 'Run Full Pipeline') {
                        await this.triggerFullVerificationPipeline();
                    }
                });
            }
        }
        catch (error) {
            this.logger.error('Error checking for verification enforcement', error);
        }
    }
    /**
     * Trigger the full verification pipeline
     */
    async triggerFullVerificationPipeline() {
        try {
            this.logger.info('Starting automatic full verification pipeline...');
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
        }
        catch (error) {
            this.logger.error('Error in triggerFullVerificationPipeline', error);
            vscode.window.showErrorMessage(`❌ Full verification pipeline failed: ${error}`);
        }
    }
    async runCommand(command) {
        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            exec(command, { cwd: workspacePath }, (error, stdout, stderr) => {
                if (error) {
                    this.logger.error(`Command failed: ${command}`, error);
                    reject(new Error(`Command failed: ${command} - ${error.message}`));
                }
                else {
                    this.logger.info(`Command succeeded: ${command}`);
                    resolve();
                }
            });
        });
    }
    async verifyPackageCreated() {
        const fs = require('fs');
        const path = require('path');
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            throw new Error('No workspace found');
        }
        const files = fs.readdirSync(workspacePath);
        const vsixFiles = files.filter((file) => file.endsWith('.vsix'));
        if (vsixFiles.length === 0) {
            throw new Error('No .vsix package file found after packaging');
        }
        const latestVsix = vsixFiles
            .map((file) => ({
            name: file,
            path: path.join(workspacePath, file),
            stats: fs.statSync(path.join(workspacePath, file))
        }))
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())[0];
        this.logger.info(`Package verified: ${latestVsix.name} (${(latestVsix.stats.size / 1024 / 1024).toFixed(2)} MB)`);
    }
    /**
     * Get actual files in the workspace for validation
     */
    async getActualFilesInWorkspace() {
        try {
            const files = [];
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    const pattern = new vscode.RelativePattern(folder, '**/*');
                    const fileUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
                    files.push(...fileUris.map(uri => uri.fsPath));
                }
            }
            return files;
        }
        catch (error) {
            this.logger.warn('Failed to get workspace files for validation', error);
            return [];
        }
    }
    /**
     * Generate passive feedback message for applied changes
     */
    generatePassiveFeedback(changeLog) {
        const timestamp = new Date().toLocaleTimeString();
        return `\n\n---\n**FailSafe Passive Validation Applied** (${timestamp})\n` +
            `*${changeLog.join(', ')}*\n` +
            `*This response has been automatically validated and revised for accuracy.*`;
    }
    /**
     * Generate validation failure notice for users
     */
    generateValidationFailureNotice(error) {
        const timestamp = new Date().toLocaleTimeString();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return `\n\n---\n**⚠️ FailSafe Validation Failed** (${timestamp})\n` +
            `*Validation system encountered an error: ${errorMessage}*\n` +
            `*Manual verification of this response is strongly advised.*\n` +
            `*Please review the content carefully before proceeding.*`;
    }
    /**
     * Validate AI response with minimal overhead (for real-time validation)
     */
    async validateAIResponseMinimal(response) {
        const startTime = Date.now();
        try {
            // Only apply critical CursorRules for minimal validation
            const criticalRules = this.cursorrulesEngine.getEnabledRules().filter(rule => rule.name === 'No Repetitive Confirmation or Stalling' ||
                rule.name === 'Implementation Verification' ||
                rule.name === 'Task Completion Claim');
            let validatedResponse = response;
            let appliedChanges = false;
            const changeLog = [];
            for (const rule of criticalRules) {
                const regex = new RegExp(rule.pattern, 'gi');
                if (regex.test(validatedResponse)) {
                    appliedChanges = true;
                    if (rule.name === 'No Repetitive Confirmation or Stalling') {
                        validatedResponse = validatedResponse.replace(regex, '');
                        changeLog.push('Removed stalling language');
                    }
                    else {
                        changeLog.push(`Critical rule "${rule.name}" triggered`);
                    }
                }
            }
            const duration = Date.now() - startTime;
            this.logger.info('Minimal AI response validation completed', { duration, appliedChanges });
            return {
                originalResponse: response,
                validatedResponse,
                isValid: true,
                appliedChanges,
                changeLog,
                warnings: [],
                errors: [],
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Minimal AI response validation failed', error);
            // Return original response with validation failure notice
            const validationFailureNotice = this.generateValidationFailureNotice(error);
            const responseWithNotice = response + validationFailureNotice;
            return {
                originalResponse: response,
                validatedResponse: responseWithNotice,
                isValid: false,
                appliedChanges: false,
                changeLog: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
                errors: [`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`],
                timestamp: new Date()
            };
        }
    }
    /**
     * Get validation statistics
     */
    getValidationStats() {
        // This would track validation statistics over time
        // For now, return placeholder data
        return {
            totalValidations: 0,
            appliedChanges: 0,
            averageResponseTime: 0,
            lastValidation: null
        };
    }
    /**
     * Make passive validation system accessible for all cursor rules
     * This allows any rule to use the validation system
     */
    async applyPassiveValidationToRule(rule, response) {
        try {
            // Apply the specific rule validation
            const regex = new RegExp(rule.pattern, 'gi');
            let validatedResponse = response;
            let appliedChanges = false;
            const changeLog = [];
            if (regex.test(validatedResponse)) {
                appliedChanges = true;
                // Apply rule-specific actions
                switch (rule.response) {
                    case 'block':
                        validatedResponse = this.applyBlockAction(validatedResponse, rule);
                        changeLog.push(`Blocked content based on rule: ${rule.name}`);
                        break;
                    case 'warn':
                        validatedResponse = this.applyWarningAction(validatedResponse, rule);
                        changeLog.push(`Applied warning based on rule: ${rule.name}`);
                        break;
                    case 'suggest':
                        validatedResponse = this.applySuggestionAction(validatedResponse, rule);
                        changeLog.push(`Applied suggestion based on rule: ${rule.name}`);
                        break;
                    default:
                        validatedResponse = this.applyDefaultAction(validatedResponse, rule);
                        changeLog.push(`Applied default action based on rule: ${rule.name}`);
                }
                // Add rule message if provided
                if (rule.message) {
                    validatedResponse += `\n\n**${rule.message}**`;
                }
            }
            return {
                validatedResponse,
                appliedChanges,
                changeLog
            };
        }
        catch (error) {
            this.logger.error('Error applying passive validation to rule', error);
            return {
                validatedResponse: response,
                appliedChanges: false,
                changeLog: []
            };
        }
    }
    applyBlockAction(response, rule) {
        return `🚨 **BLOCKED**: This response was blocked by rule "${rule.name}". ${rule.description || 'Rule violation detected.'}`;
    }
    applyWarningAction(response, rule) {
        return response + `\n\n⚠️ **WARNING**: ${rule.message || `Rule "${rule.name}" was triggered.`}`;
    }
    applySuggestionAction(response, rule) {
        return response + `\n\n💡 **SUGGESTION**: ${rule.message || `Consider reviewing rule "${rule.name}".`}`;
    }
    applyDefaultAction(response, rule) {
        return response + `\n\nℹ️ **INFO**: Rule "${rule.name}" was applied.`;
    }
    /**
     * Get all available cursor rules for external use
     */
    async getAllCursorRules() {
        try {
            return await this.cursorrulesEngine.getEnabledRules();
        }
        catch (error) {
            this.logger.error('Error getting cursor rules', error);
            return [];
        }
    }
    /**
     * Apply passive validation to any text using all enabled rules
     */
    async applyPassiveValidationToText(text) {
        try {
            const rules = await this.getAllCursorRules();
            let validatedText = text;
            let appliedChanges = false;
            const changeLog = [];
            for (const rule of rules) {
                const result = await this.applyPassiveValidationToRule(rule, validatedText);
                if (result.appliedChanges) {
                    validatedText = result.validatedResponse;
                    appliedChanges = true;
                    changeLog.push(...result.changeLog);
                }
            }
            return {
                validatedText,
                appliedChanges,
                changeLog
            };
        }
        catch (error) {
            this.logger.error('Error applying passive validation to text', error);
            return {
                validatedText: text,
                appliedChanges: false,
                changeLog: []
            };
        }
    }
}
exports.AIResponseValidator = AIResponseValidator;
//# sourceMappingURL=aiResponseValidator.js.map