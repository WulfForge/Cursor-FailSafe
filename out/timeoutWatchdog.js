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
exports.TimeoutWatchdog = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("./logger");
class TimeoutWatchdog {
    constructor() {
        this.activeTimeouts = new Map();
        this.logger = new logger_1.Logger();
        this.config = this.loadConfig();
    }
    async initialize() {
        this.logger.info('Timeout watchdog initializing...');
        // Any initialization logic can go here
    }
    async cleanup() {
        // Clear all active timeouts
        this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
        this.activeTimeouts.clear();
        this.logger.info('Timeout watchdog cleaned up');
    }
    startWatching(command, args) {
        const timeoutMs = this.calculateTimeout(command, args);
        const requestId = this.generateRequestId(command, args);
        this.logger.info(`Starting timeout watchdog for ${command}`, {
            timeoutMs,
            requestId,
            args: args.length
        });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.activeTimeouts.delete(requestId);
                const error = new Error(`AI request timed out after ${timeoutMs}ms`);
                this.logger.warn('AI request timed out', { command, requestId, timeoutMs });
                reject(error);
            }, timeoutMs);
            this.activeTimeouts.set(requestId, timeout);
        });
    }
    cancelTimeout(command, args) {
        const requestId = this.generateRequestId(command, args);
        const timeout = this.activeTimeouts.get(requestId);
        if (timeout) {
            clearTimeout(timeout);
            this.activeTimeouts.delete(requestId);
            this.logger.debug('Timeout cancelled', { command, requestId });
        }
    }
    calculateTimeout(command, args) {
        const baseTimeout = this.config.baseTimeout;
        const complexity = this.calculateComplexity(args);
        const requestType = this.getRequestType(command);
        const typeMultiplier = this.config.requestTypeMultipliers[requestType] || 1.0;
        let timeout = baseTimeout * complexity * typeMultiplier;
        // Apply min/max bounds
        timeout = Math.max(this.config.minTimeout, timeout);
        timeout = Math.min(this.config.maxTimeout, timeout);
        this.logger.debug('Timeout calculated', {
            command,
            baseTimeout,
            complexity,
            requestType,
            typeMultiplier,
            finalTimeout: timeout
        });
        return Math.round(timeout);
    }
    calculateComplexity(args) {
        let complexity = 1.0;
        // Analyze prompt length
        const promptLength = this.getPromptLength(args);
        if (promptLength > 1000)
            complexity *= 1.5;
        if (promptLength > 5000)
            complexity *= 2.0;
        if (promptLength > 10000)
            complexity *= 3.0;
        // Analyze code complexity
        const codeComplexity = this.getCodeComplexity(args);
        complexity *= codeComplexity;
        // Analyze context size
        const contextSize = this.getContextSize(args);
        if (contextSize > 10)
            complexity *= 1.3;
        if (contextSize > 50)
            complexity *= 1.8;
        return Math.min(complexity, 5.0); // Cap at 5x
    }
    getPromptLength(args) {
        let totalLength = 0;
        args.forEach(arg => {
            if (typeof arg === 'string') {
                totalLength += arg.length;
            }
            else if (typeof arg === 'object' && arg !== null) {
                totalLength += JSON.stringify(arg).length;
            }
        });
        return totalLength;
    }
    getCodeComplexity(args) {
        let complexity = 1.0;
        args.forEach(arg => {
            if (typeof arg === 'string') {
                // Count lines of code
                const lines = arg.split('\n').length;
                if (lines > 100)
                    complexity *= 1.2;
                if (lines > 500)
                    complexity *= 1.5;
                if (lines > 1000)
                    complexity *= 2.0;
                // Count function definitions
                const functionCount = (arg.match(/function\s+\w+|=>|class\s+\w+/g) || []).length;
                if (functionCount > 10)
                    complexity *= 1.3;
                if (functionCount > 50)
                    complexity *= 1.8;
                // Count imports/dependencies
                const importCount = (arg.match(/import|require/g) || []).length;
                if (importCount > 5)
                    complexity *= 1.2;
                if (importCount > 20)
                    complexity *= 1.5;
            }
        });
        return complexity;
    }
    getContextSize(args) {
        let contextSize = 0;
        args.forEach(arg => {
            if (typeof arg === 'object' && arg !== null) {
                // Count object properties as context
                contextSize += Object.keys(arg).length;
                // If it's an array, count array length
                if (Array.isArray(arg)) {
                    contextSize += arg.length;
                }
            }
        });
        return contextSize;
    }
    getRequestType(command) {
        if (command.includes('chat'))
            return 'chat';
        if (command.includes('generate'))
            return 'generate';
        if (command.includes('edit'))
            return 'edit';
        if (command.includes('explain'))
            return 'explain';
        if (command.includes('fix'))
            return 'fix';
        if (command.includes('test'))
            return 'test';
        if (command.includes('refactor'))
            return 'refactor';
        return 'chat'; // Default
    }
    generateRequestId(command, args) {
        const timestamp = Date.now();
        const argsHash = this.hashArgs(args);
        return `${command}-${timestamp}-${argsHash}`;
    }
    hashArgs(args) {
        // Simple hash for args
        const argsStr = JSON.stringify(args);
        let hash = 0;
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    loadConfig() {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration('failsafe');
            return {
                baseTimeout: workspaceConfig.get('timeout.baseTimeout', 30000), // 30 seconds
                complexityMultiplier: workspaceConfig.get('timeout.complexityMultiplier', 1.5),
                requestTypeMultipliers: {
                    chat: workspaceConfig.get('timeout.chatMultiplier', 1.0),
                    generate: workspaceConfig.get('timeout.generateMultiplier', 1.5),
                    edit: workspaceConfig.get('timeout.editMultiplier', 2.0),
                    explain: workspaceConfig.get('timeout.explainMultiplier', 1.2),
                    fix: workspaceConfig.get('timeout.fixMultiplier', 2.5),
                    test: workspaceConfig.get('timeout.testMultiplier', 3.0),
                    refactor: workspaceConfig.get('timeout.refactorMultiplier', 2.5)
                },
                maxTimeout: workspaceConfig.get('timeout.maxTimeout', 300000), // 5 minutes
                minTimeout: workspaceConfig.get('timeout.minTimeout', 10000) // 10 seconds
            };
        }
        catch (error) {
            this.logger.error('Failed to load timeout config, using defaults', error);
            return {
                baseTimeout: 30000,
                complexityMultiplier: 1.5,
                requestTypeMultipliers: {
                    chat: 1.0,
                    generate: 1.5,
                    edit: 2.0,
                    explain: 1.2,
                    fix: 2.5,
                    test: 3.0,
                    refactor: 2.5
                },
                maxTimeout: 300000,
                minTimeout: 10000
            };
        }
    }
    getActiveTimeoutCount() {
        return this.activeTimeouts.size;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.TimeoutWatchdog = TimeoutWatchdog;
//# sourceMappingURL=timeoutWatchdog.js.map