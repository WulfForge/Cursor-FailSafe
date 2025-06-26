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
exports.ChatResponseInterceptor = void 0;
const vscode = __importStar(require("vscode"));
const aiResponseValidator_1 = require("./aiResponseValidator");
const aiResponsePipeline_1 = require("./aiResponsePipeline");
/**
 * Chat Response Interceptor
 * This class provides methods for intercepting and validating chat responses
 * using VS Code's webview and command system instead of the Chat API
 */
class ChatResponseInterceptor {
    constructor(context, logger) {
        this.isEnabled = true;
        this.isIntercepting = false;
        this.context = context;
        this.logger = logger;
        this.aiResponseValidator = new aiResponseValidator_1.AIResponseValidator(context, logger);
        this.aiResponsePipeline = new aiResponsePipeline_1.AIResponsePipeline(context, logger);
        this.logger.info('Chat Response Interceptor initialized');
    }
    /**
     * Set up listeners for chat events and webview messages
     */
    setupChatListeners() {
        this.logger.info('Setting up chat response listeners...');
        // Set up command for manual chat response validation
        this.context.subscriptions.push(vscode.commands.registerCommand('failsafe.interceptChatResponse', async (response, source) => {
            return await this.interceptChatResponse(response, source || 'Manual Command');
        }));
        // Set up command for enabling/disabling chat interception
        this.context.subscriptions.push(vscode.commands.registerCommand('failsafe.toggleChatInterception', () => {
            this.isEnabled = !this.isEnabled;
            const status = this.isEnabled ? 'enabled' : 'disabled';
            this.logger.info(`Chat Response Interceptor ${status}`);
            vscode.window.showInformationMessage(`FailSafe Chat Interception ${status}`);
        }));
        this.logger.info('Chat response listeners set up successfully');
    }
    /**
     * Intercept a chat response from any source and validate it
     */
    async interceptChatResponse(response, source = 'Unknown', context) {
        if (!this.isEnabled) {
            return response;
        }
        try {
            this.logger.info('Chat Response Interceptor: Intercepting response', {
                source,
                responseLength: response.length
            });
            // Validate the response using FailSafe
            const validationResult = await this.aiResponseValidator.validateAIResponse(response, context || source);
            // Process through the AI response pipeline
            const pipelineResult = await this.aiResponsePipeline.processAIResponse(response, context || source, {
                skipValidation: false,
                validationMode: 'full',
                timeout: 5000
            });
            // Log validation results
            this.logValidationResults(validationResult, pipelineResult);
            // Show user feedback if validation found issues
            if (validationResult.appliedChanges || validationResult.warnings.length > 0) {
                await this.showValidationFeedback(validationResult);
            }
            // Return the validated response
            return pipelineResult.finalResponse;
        }
        catch (error) {
            this.logger.error('Error processing chat response', error);
            return response; // Return original response on error
        }
    }
    /**
     * Log validation results for monitoring and debugging
     */
    logValidationResults(validationResult, pipelineResult) {
        this.logger.info('Chat Response Interceptor: Validation completed', {
            appliedChanges: validationResult.appliedChanges,
            changeCount: validationResult.changeLog?.length || 0,
            warningCount: validationResult.warnings?.length || 0,
            errorCount: validationResult.errors?.length || 0,
            processingTime: pipelineResult.processingTime,
            isValid: validationResult.isValid
        });
    }
    /**
     * Show user feedback about validation results
     */
    async showValidationFeedback(validationResult) {
        try {
            const config = vscode.workspace.getConfiguration('failsafe.passiveValidation');
            const showFeedback = config.get('showFeedback', true);
            const showNotifications = config.get('enableNotifications', false);
            if (!showFeedback && !showNotifications) {
                return;
            }
            let feedbackMessage = '';
            let severity = 'info';
            if (validationResult.appliedChanges && validationResult.changeLog.length > 0) {
                feedbackMessage = `FailSafe applied ${validationResult.changeLog.length} validation changes to the chat response.`;
                severity = 'info';
            }
            else if (validationResult.warnings.length > 0) {
                feedbackMessage = `FailSafe detected ${validationResult.warnings.length} potential issues in the chat response.`;
                severity = 'warning';
            }
            else if (validationResult.errors.length > 0) {
                feedbackMessage = `FailSafe detected ${validationResult.errors.length} critical issues in the chat response.`;
                severity = 'error';
            }
            if (feedbackMessage) {
                if (showNotifications) {
                    switch (severity) {
                        case 'info':
                            await vscode.window.showInformationMessage(feedbackMessage, 'View Details', 'Dismiss');
                            break;
                        case 'warning':
                            await vscode.window.showWarningMessage(feedbackMessage, 'View Details', 'Dismiss');
                            break;
                        case 'error':
                            await vscode.window.showErrorMessage(feedbackMessage, 'View Details', 'Dismiss');
                            break;
                    }
                }
                if (showFeedback) {
                    // Add a subtle indicator in the status bar
                    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
                    statusBarItem.text = `$(shield) FailSafe: ${validationResult.changeLog?.length || 0} changes applied`;
                    statusBarItem.tooltip = feedbackMessage;
                    statusBarItem.show();
                    // Hide after 5 seconds
                    setTimeout(() => {
                        statusBarItem.dispose();
                    }, 5000);
                }
            }
        }
        catch (error) {
            this.logger.error('Chat Response Interceptor: Error showing validation feedback', error);
        }
    }
    async handleWebviewMessage(message) {
        // ... existing code ...
    }
}
exports.ChatResponseInterceptor = ChatResponseInterceptor;
//# sourceMappingURL=chatResponseInterceptor.js.map