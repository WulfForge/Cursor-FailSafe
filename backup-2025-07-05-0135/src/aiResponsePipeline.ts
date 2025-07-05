import * as vscode from 'vscode';
import { AIResponseValidator, AIResponseValidationResult } from './aiResponseValidator';
import { Logger } from './logger';
import { PassiveValidationConfigManager, PassiveValidationConfig } from './passiveValidationConfig';

export interface AIResponsePipelineConfig {
    enablePassiveValidation: boolean;
    enableRealTimeValidation: boolean;
    showValidationFeedback: boolean;
    validationMode: 'full' | 'minimal' | 'critical';
    maxValidationTime: number; // milliseconds
}

export interface AIResponsePipelineResult {
    originalResponse: string;
    finalResponse: string;
    validationApplied: boolean;
    validationResult?: AIResponseValidationResult;
    processingTime: number;
    timestamp: Date;
}

export class AIResponsePipeline {
    private readonly validator: AIResponseValidator;
    private readonly logger: Logger;
    private readonly configManager: PassiveValidationConfigManager;
    private readonly validationStats: {
        totalResponses: number;
        validatedResponses: number;
        appliedChanges: number;
        averageProcessingTime: number;
        lastValidation: Date | null;
    };

    constructor(context: vscode.ExtensionContext, logger: Logger) {
        this.validator = new AIResponseValidator(context, logger);
        this.logger = logger;
        this.configManager = new PassiveValidationConfigManager(logger);
        
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
    public async processAIResponse(
        response: string, 
        context?: string,
        options?: {
            skipValidation?: boolean;
            validationMode?: 'full' | 'minimal' | 'critical';
            timeout?: number;
        }
    ): Promise<AIResponsePipelineResult> {
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
            const validationResult = await this.applyValidationWithTimeout(
                response, 
                context, 
                validationMode, 
                timeout
            );

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
                vscode.window.showInformationMessage(
                    `FailSafe: Applied ${validationResult.changeLog.length} validation changes to AI response`
                );
            }

            return {
                originalResponse: response,
                finalResponse: validationResult.validatedResponse,
                validationApplied: true,
                validationResult,
                processingTime,
                timestamp: new Date()
            };

        } catch (error) {
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
    private async applyValidationWithTimeout(
        response: string,
        context: string | undefined,
        mode: 'full' | 'minimal' | 'critical',
        timeout: number
    ): Promise<AIResponseValidationResult> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Validation timeout after ${timeout}ms`));
            }, timeout);

            let validationPromise: Promise<AIResponseValidationResult>;
            
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
    private updateAverageProcessingTime(processingTime: number): void {
        const totalTime = this.validationStats.averageProcessingTime * (this.validationStats.validatedResponses - 1) + processingTime;
        this.validationStats.averageProcessingTime = totalTime / this.validationStats.validatedResponses;
    }

    /**
     * Log validation results
     */
    private logValidationResults(result: AIResponseValidationResult, processingTime: number): void {
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
    public getPipelineStats() {
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
    public async updateConfig(newConfig: Partial<PassiveValidationConfig>): Promise<void> {
        await this.configManager.updateConfigBatch(newConfig);
        this.logger.info('AI response pipeline configuration updated');
    }

    /**
     * Get current configuration
     */
    public getConfig(): PassiveValidationConfig {
        return this.configManager.getConfig();
    }

    /**
     * Get configuration manager
     */
    public getConfigManager(): PassiveValidationConfigManager {
        return this.configManager;
    }

    /**
     * Generate validation failure notice for users
     */
    private generateValidationFailureNotice(error: Error | unknown): string {
        const timestamp = new Date().toLocaleTimeString();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return `\n\n---\n**⚠️ FailSafe Validation Failed** (${timestamp})\n` +
               `*Validation system encountered an error: ${errorMessage}*\n` +
               `*Manual verification of this response is strongly advised.*\n` +
               `*Please review the content carefully before proceeding.*`;
    }
}

/**
 * Global AI response pipeline instance
 * This should be initialized once and used throughout the extension
 */
let globalAIResponsePipeline: AIResponsePipeline | null = null;

/**
 * Initialize the global AI response pipeline
 */
export function initializeAIResponsePipeline(
    context: vscode.ExtensionContext, 
    logger: Logger
): AIResponsePipeline {
    if (!globalAIResponsePipeline) {
        globalAIResponsePipeline = new AIResponsePipeline(context, logger);
        logger.info('Global AI response pipeline initialized');
    }
    return globalAIResponsePipeline;
}

/**
 * Get the global AI response pipeline instance
 */
export function getAIResponsePipeline(): AIResponsePipeline | null {
    return globalAIResponsePipeline;
}

/**
 * Process an AI response through the global pipeline
 */
export async function processAIResponse(
    response: string,
    context?: string,
    options?: {
        skipValidation?: boolean;
        validationMode?: 'full' | 'minimal' | 'critical';
        timeout?: number;
    }
): Promise<AIResponsePipelineResult> {
    const pipeline = getAIResponsePipeline();
    if (!pipeline) {
        throw new Error('AI response pipeline not initialized');
    }
    return pipeline.processAIResponse(response, context, options);
} 