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
     * Apply CursorRules validation to AI response
     * This is the core passive validation system
     */
    async applyCursorRulesValidation(response) {
        const enabledRules = this.cursorrulesEngine.getEnabledRules();
        let validatedResponse = response;
        let appliedChanges = false;
        const changeLog = [];
        for (const rule of enabledRules) {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                if (regex.test(validatedResponse)) {
                    appliedChanges = true;
                    switch (rule.name) {
                        case 'No Repetitive Confirmation or Stalling':
                            validatedResponse = validatedResponse.replace(regex, '');
                            changeLog.push('Removed repetitive confirmation/stalling language');
                            break;
                        case 'Version Consistency Check':
                            changeLog.push('Version information detected - ensure consistency across files');
                            break;
                        case 'Implementation Verification':
                            changeLog.push('Implementation claims detected - verify actual implementation');
                            break;
                        case 'Task Completion Claim':
                            changeLog.push('Task completion claims detected - verify actual completion');
                            break;
                        case 'Audit Results Claim':
                            changeLog.push('Audit result claims detected - ensure evidence is available');
                            break;
                        case 'Compilation Status Claim':
                            changeLog.push('Compilation status claims detected - verify actual compilation');
                            break;
                        case 'Test Results Claim':
                            changeLog.push('Test result claims detected - verify actual test execution');
                            break;
                        case 'Hallucination Admission':
                            changeLog.push('Transparency detected - good practice acknowledged');
                            break;
                        case 'Vague Offer Detection':
                            validatedResponse = validatedResponse.replace(regex, (match) => {
                                return match.replace(/I\s+can\s+(help|assist|guide)/gi, 'I will provide specific guidance on');
                            });
                            changeLog.push('Vague offers made more specific');
                            break;
                        case 'Absolute Statement Detection':
                            changeLog.push('Absolute statements detected - consider adding qualifiers');
                            break;
                        case 'Performance Claim Detection':
                            changeLog.push('Performance claims detected - ensure metrics are available');
                            break;
                        case 'Auto Version Management':
                            changeLog.push('Version management detected - consider automated versioning');
                            break;
                        case 'AI Task Execution':
                            changeLog.push('AI task execution claims detected - verify actual execution');
                            break;
                        case 'GitHub Workflow Management':
                            changeLog.push('GitHub workflow detected - consider automated workflows');
                            break;
                        case 'Product Discovery Protocol':
                            changeLog.push('Product planning detected - consider structured discovery process');
                            break;
                        case 'Beginner Guidance':
                            changeLog.push('Beginner guidance detected - good practice acknowledged');
                            break;
                        case 'Error Recovery Assistance':
                            changeLog.push('Error handling detected - ensure comprehensive error recovery');
                            break;
                        case 'Best Practice Suggestions':
                            changeLog.push('Best practice suggestions detected - good practice acknowledged');
                            break;
                        case 'Dependency Management':
                            changeLog.push('Dependency management detected - ensure security review');
                            break;
                        case 'Testing Guidance':
                            changeLog.push('Testing guidance detected - ensure comprehensive test coverage');
                            break;
                        case 'Documentation Assistance':
                            changeLog.push('Documentation assistance detected - good practice acknowledged');
                            break;
                        default:
                            changeLog.push(`Rule "${rule.name}" triggered - review for accuracy`);
                            break;
                    }
                }
            }
            catch (error) {
                this.logger.warn(`Error applying rule "${rule.name}"`, error);
                changeLog.push(`Error applying rule "${rule.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return {
            validatedResponse,
            appliedChanges,
            changeLog
        };
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
}
exports.AIResponseValidator = AIResponseValidator;
//# sourceMappingURL=aiResponseValidator.js.map