// import * as vscode from 'vscode';
// import { AIResponsePipeline } from './aiResponsePipeline';

import { Logger } from './logger';
import { processAIResponse, AIResponsePipelineResult } from './aiResponsePipeline';

export interface AIResponseHook {
    name: string;
    description: string;
    enabled: boolean;
    hookFunction: (response: string, context?: string) => Promise<string>;
}

export class AIResponseHooks {
    private readonly logger: Logger;
    private readonly hooks: Map<string, AIResponseHook> = new Map();
    private isEnabled = true;

    constructor(logger: Logger) {
        this.logger = logger;
        this.logger.info('AI Response Hooks initialized');
        this.initializeDefaultHooks();
    }

    /**
     * Initialize default hooks for common AI response scenarios
     */
    private initializeDefaultHooks(): void {
        // Hook for VS Code chat responses
        this.registerHook({
            name: 'vscode-chat',
            description: 'Validates responses from VS Code chat interface',
            enabled: true,
            hookFunction: async (response: string, context?: string) => {
                return this.processResponse(response, context || 'VS Code Chat');
            }
        });

        // Hook for GitHub Copilot responses
        this.registerHook({
            name: 'github-copilot',
            description: 'Validates responses from GitHub Copilot',
            enabled: true,
            hookFunction: async (response: string, context?: string) => {
                return this.processResponse(response, context || 'GitHub Copilot');
            }
        });

        // Hook for Cursor AI responses
        this.registerHook({
            name: 'cursor-ai',
            description: 'Validates responses from Cursor AI',
            enabled: true,
            hookFunction: async (response: string, context?: string) => {
                return this.processResponse(response, context || 'Cursor AI');
            }
        });

        // Hook for general AI responses
        this.registerHook({
            name: 'general-ai',
            description: 'Validates general AI responses',
            enabled: true,
            hookFunction: async (response: string, context?: string) => {
                return this.processResponse(response, context || 'General AI');
            }
        });

        this.logger.info('AI response hooks initialized', {
            hookCount: this.hooks.size,
            enabled: this.isEnabled
        });
    }

    /**
     * Register a new AI response hook
     */
    public registerHook(hook: AIResponseHook): void {
        this.hooks.set(hook.name, hook);
        this.logger.info(`AI response hook registered: ${hook.name}`);
    }

    /**
     * Unregister an AI response hook
     */
    public unregisterHook(hookName: string): boolean {
        const removed = this.hooks.delete(hookName);
        if (removed) {
            this.logger.info(`AI response hook unregistered: ${hookName}`);
        }
        return removed;
    }

    /**
     * Enable/disable a specific hook
     */
    public setHookEnabled(hookName: string, enabled: boolean): boolean {
        const hook = this.hooks.get(hookName);
        if (hook) {
            hook.enabled = enabled;
            this.logger.info(`AI response hook ${hookName} ${enabled ? 'enabled' : 'disabled'}`);
            return true;
        }
        return false;
    }

    /**
     * Enable/disable all hooks
     */
    public setAllHooksEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.hooks.forEach(hook => {
            hook.enabled = enabled;
        });
        this.logger.info(`All AI response hooks ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Process an AI response through the validation pipeline
     */
    private async processResponse(response: string, context: string): Promise<string> {
        try {
            const result: AIResponsePipelineResult = await processAIResponse(response, context, {
                validationMode: 'full',
                timeout: 3000
            });

            if (result.validationApplied && result.validationResult?.appliedChanges) {
                this.logger.info('AI response validation applied', {
                    context,
                    changeCount: result.validationResult.changeLog.length,
                    processingTime: result.processingTime
                });
            }

            return result.finalResponse;
        } catch (error) {
            this.logger.error('Failed to process AI response', error);
            return response; // Return original response if processing fails
        }
    }

    /**
     * Process an AI response using a specific hook
     */
    public async processWithHook(hookName: string, response: string, context?: string): Promise<string> {
        const hook = this.hooks.get(hookName);
        if (!hook) {
            this.logger.warn(`AI response hook not found: ${hookName}`);
            return response;
        }

        if (!hook.enabled || !this.isEnabled) {
            return response;
        }

        try {
            return await hook.hookFunction(response, context);
        } catch (error) {
            this.logger.error(`Error in AI response hook ${hookName}`, error);
            return response;
        }
    }

    /**
     * Process an AI response using the most appropriate hook
     */
    public async processResponseAuto(response: string, context?: string): Promise<string> {
        // Determine the best hook based on context
        let hookName = 'general-ai';
        
        if (context) {
            const contextLower = context.toLowerCase();
            if (contextLower.includes('vscode') || contextLower.includes('chat')) {
                hookName = 'vscode-chat';
            } else if (contextLower.includes('copilot') || contextLower.includes('github')) {
                hookName = 'github-copilot';
            } else if (contextLower.includes('cursor')) {
                hookName = 'cursor-ai';
            }
        }

        return this.processWithHook(hookName, response, context);
    }

    /**
     * Get all registered hooks
     */
    public getHooks(): AIResponseHook[] {
        return Array.from(this.hooks.values());
    }

    /**
     * Get hook statistics
     */
    public getHookStats(): {
        totalHooks: number;
        enabledHooks: number;
        disabledHooks: number;
        hookNames: string[];
    } {
        const hooks = Array.from(this.hooks.values());
        return {
            totalHooks: hooks.length,
            enabledHooks: hooks.filter(h => h.enabled).length,
            disabledHooks: hooks.filter(h => !h.enabled).length,
            hookNames: hooks.map(h => h.name)
        };
    }
}

/**
 * Global AI response hooks instance
 */
let globalAIResponseHooks: AIResponseHooks | null = null;

/**
 * Initialize global AI response hooks
 */
export function initializeAIResponseHooks(logger: Logger): AIResponseHooks {
    if (!globalAIResponseHooks) {
        globalAIResponseHooks = new AIResponseHooks(logger);
        logger.info('Global AI response hooks initialized');
    }
    return globalAIResponseHooks;
}

/**
 * Get global AI response hooks instance
 */
export function getAIResponseHooks(): AIResponseHooks | null {
    return globalAIResponseHooks;
}

/**
 * Process AI response through global hooks
 */
export async function processAIResponseWithHooks(
    response: string,
    context?: string,
    hookName?: string
): Promise<string> {
    const hooks = getAIResponseHooks();
    if (!hooks) {
        throw new Error('AI response hooks not initialized');
    }

    if (hookName) {
        return hooks.processWithHook(hookName, response, context);
    } else {
        return hooks.processResponseAuto(response, context);
    }
}

/**
 * VS Code Chat Integration Hook
 * This hook specifically targets VS Code's chat interface
 */
export class VSCodeChatHook {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Hook into VS Code chat responses
     * This would be called whenever a chat response is generated
     */
    public async hookChatResponse(response: string, context?: string): Promise<string> {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('vscode-chat', response, context);
            }
            return response;
        } catch (error) {
            this.logger.error('VSCode chat hook failed', error);
            return response;
        }
    }

    /**
     * Hook into VS Code inline suggestions
     */
    public async hookInlineSuggestion(suggestion: string, context?: string): Promise<string> {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('vscode-chat', suggestion, context || 'Inline Suggestion');
            }
            return suggestion;
        } catch (error) {
            this.logger.error('VSCode inline suggestion hook failed', error);
            return suggestion;
        }
    }
}

/**
 * GitHub Copilot Integration Hook
 */
export class GitHubCopilotHook {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Hook into GitHub Copilot responses
     */
    public async hookCopilotResponse(response: string, context?: string): Promise<string> {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('github-copilot', response, context);
            }
            return response;
        } catch (error) {
            this.logger.error('GitHub Copilot hook failed', error);
            return response;
        }
    }
}

/**
 * Cursor AI Integration Hook
 */
export class CursorAIHook {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Hook into Cursor AI responses
     */
    public async hookCursorResponse(response: string, context?: string): Promise<string> {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('cursor-ai', response, context);
            }
            return response;
        } catch (error) {
            this.logger.error('Cursor AI hook failed', error);
            return response;
        }
    }
} 