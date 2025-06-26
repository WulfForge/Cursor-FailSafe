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
exports.AIResponsePipeline = void 0;
exports.initializeAIResponsePipeline = initializeAIResponsePipeline;
exports.getAIResponsePipeline = getAIResponsePipeline;
exports.processAIResponse = processAIResponse;
const vscode = __importStar(require("vscode"));
const aiResponseValidator_1 = require("./aiResponseValidator");
const passiveValidationConfig_1 = require("./passiveValidationConfig");
class AIResponsePipeline {
    constructor(context, logger) {
        this.validator = new aiResponseValidator_1.AIResponseValidator(context, logger);
        this.logger = logger;
        this.configManager = new passiveValidationConfig_1.PassiveValidationConfigManager(logger);
        this.validationStats = {
            totalResponses: 0,
            validatedResponses: 0,
            appliedChanges: 0,
            averageProcessingTime: 0,
            lastValidation: null
        };
    }
    /**
     * Main entry point for processing AI responses through the validation pipeline
     * This should be called whenever an AI response is generated
     */
    async processAIResponse(response, context, options) {
        const startTime = Date.now();
        this.validationStats.totalResponses++;
        try {
            // Get current configuration
            const config = this.configManager.getConfig();
            // Skip validation if disabled or explicitly skipped
            if (!config.enabled || options?.skipValidation) {
                return {
                    originalResponse: response,
                    finalResponse: response,
                    validationApplied: false,
                    processingTime: Date.now() - startTime,
                    timestamp: new Date()
                };
            }
            // Determine validation mode
            const validationMode = options?.validationMode || config.mode;
            const timeout = options?.timeout || config.timeout;
            // Apply validation with timeout protection
            const validationResult = await this.applyValidationWithTimeout(response, context, validationMode, timeout);
            // Update statistics
            this.validationStats.validatedResponses++;
            if (validationResult.appliedChanges) {
                this.validationStats.appliedChanges++;
            }
            this.validationStats.lastValidation = new Date();
            const processingTime = Date.now() - startTime;
            this.updateAverageProcessingTime(processingTime);
            // Log validation results if logging is enabled
            if (config.enableLogging) {
                this.logValidationResults(validationResult, processingTime);
            }
            // Show notifications if enabled
            if (config.enableNotifications && validationResult.appliedChanges) {
                vscode.window.showInformationMessage(`FailSafe: Applied ${validationResult.changeLog.length} validation changes to AI response`);
            }
            return {
                originalResponse: response,
                finalResponse: validationResult.validatedResponse,
                validationApplied: true,
                validationResult,
                processingTime,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('AI response pipeline processing failed', error);
            // Get configuration for failure notice
            // const config = this.configManager.getConfig();
            // Return original response with validation failure notice
            const validationFailureNotice = this.generateValidationFailureNotice(error);
            const responseWithNotice = response + validationFailureNotice;
            return {
                originalResponse: response,
                finalResponse: responseWithNotice,
                validationApplied: false,
                processingTime: Date.now() - startTime,
                timestamp: new Date()
            };
        }
    }
    /**
     * Apply validation with timeout protection
     */
    async applyValidationWithTimeout(response, context, mode, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Validation timeout after ${timeout}ms`));
            }, timeout);
            let validationPromise;
            switch (mode) {
                case 'minimal':
                    validationPromise = this.validator.validateAIResponseMinimal(response);
                    break;
                case 'critical':
                    validationPromise = this.validator.validateAIResponseMinimal(response);
                    break;
                case 'full':
                default:
                    validationPromise = this.validator.validateAIResponse(response, context);
                    break;
            }
            validationPromise
                .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * Update average processing time
     */
    updateAverageProcessingTime(processingTime) {
        const totalTime = this.validationStats.averageProcessingTime * (this.validationStats.validatedResponses - 1) + processingTime;
        this.validationStats.averageProcessingTime = totalTime / this.validationStats.validatedResponses;
    }
    /**
     * Log validation results
     */
    logValidationResults(result, processingTime) {
        this.logger.info('AI response validation completed', {
            processingTime,
            appliedChanges: result.appliedChanges,
            changeCount: result.changeLog.length,
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
            changeLog: result.changeLog
        });
        if (result.warnings.length > 0) {
            this.logger.warn('AI response validation warnings', {
                warnings: result.warnings
            });
        }
        if (result.errors.length > 0) {
            this.logger.error('AI response validation errors', {
                errors: result.errors
            });
        }
    }
    /**
     * Get pipeline statistics
     */
    getPipelineStats() {
        const config = this.configManager.getConfig();
        return {
            ...this.validationStats,
            config: config,
            configSummary: this.configManager.getConfigSummary()
        };
    }
    /**
     * Update pipeline configuration
     */
    async updateConfig(newConfig) {
        await this.configManager.updateConfigBatch(newConfig);
        this.logger.info('AI response pipeline configuration updated');
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.configManager.getConfig();
    }
    /**
     * Get configuration manager
     */
    getConfigManager() {
        return this.configManager;
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
}
exports.AIResponsePipeline = AIResponsePipeline;
/**
 * Global AI response pipeline instance
 * This should be initialized once and used throughout the extension
 */
let globalAIResponsePipeline = null;
/**
 * Initialize the global AI response pipeline
 */
function initializeAIResponsePipeline(context, logger) {
    if (!globalAIResponsePipeline) {
        globalAIResponsePipeline = new AIResponsePipeline(context, logger);
        logger.info('Global AI response pipeline initialized');
    }
    return globalAIResponsePipeline;
}
/**
 * Get the global AI response pipeline instance
 */
function getAIResponsePipeline() {
    return globalAIResponsePipeline;
}
/**
 * Process an AI response through the global pipeline
 */
async function processAIResponse(response, context, options) {
    const pipeline = getAIResponsePipeline();
    if (!pipeline) {
        throw new Error('AI response pipeline not initialized');
    }
    return pipeline.processAIResponse(response, context, options);
}
//# sourceMappingURL=aiResponsePipeline.js.map