"use strict";
// import * as vscode from 'vscode';
// import { AIResponsePipeline } from './aiResponsePipeline';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorAIHook = exports.GitHubCopilotHook = exports.VSCodeChatHook = exports.AIResponseHooks = void 0;
exports.initializeAIResponseHooks = initializeAIResponseHooks;
exports.getAIResponseHooks = getAIResponseHooks;
exports.processAIResponseWithHooks = processAIResponseWithHooks;
const aiResponsePipeline_1 = require("./aiResponsePipeline");
class AIResponseHooks {
    constructor(logger) {
        this.hooks = new Map();
        this.isEnabled = true;
        this.logger = logger;
        this.logger.info('AI Response Hooks initialized');
        this.initializeDefaultHooks();
    }
    /**
     * Initialize default hooks for common AI response scenarios
     */
    initializeDefaultHooks() {
        // Hook for VS Code chat responses
        this.registerHook({
            name: 'vscode-chat',
            description: 'Validates responses from VS Code chat interface',
            enabled: true,
            hookFunction: async (response, context) => {
                return this.processResponse(response, context || 'VS Code Chat');
            }
        });
        // Hook for GitHub Copilot responses
        this.registerHook({
            name: 'github-copilot',
            description: 'Validates responses from GitHub Copilot',
            enabled: true,
            hookFunction: async (response, context) => {
                return this.processResponse(response, context || 'GitHub Copilot');
            }
        });
        // Hook for Cursor AI responses
        this.registerHook({
            name: 'cursor-ai',
            description: 'Validates responses from Cursor AI',
            enabled: true,
            hookFunction: async (response, context) => {
                return this.processResponse(response, context || 'Cursor AI');
            }
        });
        // Hook for general AI responses
        this.registerHook({
            name: 'general-ai',
            description: 'Validates general AI responses',
            enabled: true,
            hookFunction: async (response, context) => {
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
    registerHook(hook) {
        this.hooks.set(hook.name, hook);
        this.logger.info(`AI response hook registered: ${hook.name}`);
    }
    /**
     * Unregister an AI response hook
     */
    unregisterHook(hookName) {
        const removed = this.hooks.delete(hookName);
        if (removed) {
            this.logger.info(`AI response hook unregistered: ${hookName}`);
        }
        return removed;
    }
    /**
     * Enable/disable a specific hook
     */
    setHookEnabled(hookName, enabled) {
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
    setAllHooksEnabled(enabled) {
        this.isEnabled = enabled;
        this.hooks.forEach(hook => {
            hook.enabled = enabled;
        });
        this.logger.info(`All AI response hooks ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Process an AI response through the validation pipeline
     */
    async processResponse(response, context) {
        try {
            const result = await (0, aiResponsePipeline_1.processAIResponse)(response, context, {
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
        }
        catch (error) {
            this.logger.error('Failed to process AI response', error);
            return response; // Return original response if processing fails
        }
    }
    /**
     * Process an AI response using a specific hook
     */
    async processWithHook(hookName, response, context) {
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
        }
        catch (error) {
            this.logger.error(`Error in AI response hook ${hookName}`, error);
            return response;
        }
    }
    /**
     * Process an AI response using the most appropriate hook
     */
    async processResponseAuto(response, context) {
        // Determine the best hook based on context
        let hookName = 'general-ai';
        if (context) {
            const contextLower = context.toLowerCase();
            if (contextLower.includes('vscode') || contextLower.includes('chat')) {
                hookName = 'vscode-chat';
            }
            else if (contextLower.includes('copilot') || contextLower.includes('github')) {
                hookName = 'github-copilot';
            }
            else if (contextLower.includes('cursor')) {
                hookName = 'cursor-ai';
            }
        }
        return this.processWithHook(hookName, response, context);
    }
    /**
     * Get all registered hooks
     */
    getHooks() {
        return Array.from(this.hooks.values());
    }
    /**
     * Get hook statistics
     */
    getHookStats() {
        const hooks = Array.from(this.hooks.values());
        return {
            totalHooks: hooks.length,
            enabledHooks: hooks.filter(h => h.enabled).length,
            disabledHooks: hooks.filter(h => !h.enabled).length,
            hookNames: hooks.map(h => h.name)
        };
    }
}
exports.AIResponseHooks = AIResponseHooks;
/**
 * Global AI response hooks instance
 */
let globalAIResponseHooks = null;
/**
 * Initialize global AI response hooks
 */
function initializeAIResponseHooks(logger) {
    if (!globalAIResponseHooks) {
        globalAIResponseHooks = new AIResponseHooks(logger);
        logger.info('Global AI response hooks initialized');
    }
    return globalAIResponseHooks;
}
/**
 * Get global AI response hooks instance
 */
function getAIResponseHooks() {
    return globalAIResponseHooks;
}
/**
 * Process AI response through global hooks
 */
async function processAIResponseWithHooks(response, context, hookName) {
    const hooks = getAIResponseHooks();
    if (!hooks) {
        throw new Error('AI response hooks not initialized');
    }
    if (hookName) {
        return hooks.processWithHook(hookName, response, context);
    }
    else {
        return hooks.processResponseAuto(response, context);
    }
}
/**
 * VS Code Chat Integration Hook
 * This hook specifically targets VS Code's chat interface
 */
class VSCodeChatHook {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Hook into VS Code chat responses
     * This would be called whenever a chat response is generated
     */
    async hookChatResponse(response, context) {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('vscode-chat', response, context);
            }
            return response;
        }
        catch (error) {
            this.logger.error('VSCode chat hook failed', error);
            return response;
        }
    }
    /**
     * Hook into VS Code inline suggestions
     */
    async hookInlineSuggestion(suggestion, context) {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('vscode-chat', suggestion, context || 'Inline Suggestion');
            }
            return suggestion;
        }
        catch (error) {
            this.logger.error('VSCode inline suggestion hook failed', error);
            return suggestion;
        }
    }
}
exports.VSCodeChatHook = VSCodeChatHook;
/**
 * GitHub Copilot Integration Hook
 */
class GitHubCopilotHook {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Hook into GitHub Copilot responses
     */
    async hookCopilotResponse(response, context) {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('github-copilot', response, context);
            }
            return response;
        }
        catch (error) {
            this.logger.error('GitHub Copilot hook failed', error);
            return response;
        }
    }
}
exports.GitHubCopilotHook = GitHubCopilotHook;
/**
 * Cursor AI Integration Hook
 */
class CursorAIHook {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Hook into Cursor AI responses
     */
    async hookCursorResponse(response, context) {
        try {
            const hooks = getAIResponseHooks();
            if (hooks) {
                return await hooks.processWithHook('cursor-ai', response, context);
            }
            return response;
        }
        catch (error) {
            this.logger.error('Cursor AI hook failed', error);
            return response;
        }
    }
}
exports.CursorAIHook = CursorAIHook;
//# sourceMappingURL=aiResponseHooks.js.map