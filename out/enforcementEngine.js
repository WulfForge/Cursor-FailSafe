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
exports.EnforcementEngine = void 0;
const vscode = __importStar(require("vscode"));
class EnforcementEngine {
    constructor(logger, validator, projectPlan) {
        this.rules = new Map();
        this.adaptiveMetrics = new Map();
        this.enforcementHistory = [];
        this.userPreferences = new Map();
        this.logger = logger;
        this.validator = validator;
        this.projectPlan = projectPlan;
        this.initializeDefaultRules();
    }
    async enforceValidation(content, context) {
        this.logger.info('Starting enforcement validation...');
        // Perform standard validation
        const validationResult = await this.validator.validateCodeWithLLM(content, context);
        // Apply enforcement rules
        const enforcementResults = await this.applyEnforcementRules(content, context, validationResult);
        // Generate adaptive suggestions
        const adaptiveSuggestions = this.generateAdaptiveSuggestions(enforcementResults, context);
        // Update adaptive metrics
        this.updateAdaptiveMetrics(enforcementResults);
        // Store enforcement history
        this.enforcementHistory.push(...enforcementResults);
        return {
            validationResult,
            enforcementResults,
            adaptiveSuggestions
        };
    }
    async applyEnforcementRules(content, context, validationResult) {
        const results = [];
        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled)
                continue;
            try {
                const triggered = await this.evaluateRule(rule, content, context, validationResult);
                if (triggered) {
                    const result = await this.executeRuleActions(rule, content, context);
                    results.push(result);
                    this.logger.info(`Enforcement rule triggered: ${rule.name}`, {
                        ruleId,
                        severity: rule.severity,
                        message: result.message
                    });
                }
            }
            catch (error) {
                this.logger.error(`Error applying enforcement rule: ${rule.name}`, error);
            }
        }
        return results;
    }
    async evaluateRule(rule, content, context, validationResult) {
        for (const condition of rule.conditions) {
            const result = await this.evaluateCondition(condition, content, context, validationResult);
            if (!result) {
                return false; // All conditions must be true
            }
        }
        return true;
    }
    async evaluateCondition(condition, content, context, validationResult) {
        switch (condition.type) {
            case 'pattern':
                return this.evaluatePatternCondition(condition, content);
            case 'complexity':
                return this.evaluateComplexityCondition(condition, content);
            case 'context':
                return this.evaluateContextCondition(condition, context);
            case 'history':
                return this.evaluateHistoryCondition(condition, validationResult);
            case 'custom':
                return this.evaluateCustomCondition(condition, content, context);
            default:
                return false;
        }
    }
    evaluatePatternCondition(condition, content) {
        const pattern = new RegExp(condition.expression, 'gi');
        return pattern.test(content);
    }
    evaluateComplexityCondition(condition, content) {
        const complexity = this.calculateComplexityScore(content);
        const threshold = condition.parameters?.threshold || 5;
        return complexity > threshold;
    }
    evaluateContextCondition(condition, context) {
        if (!context)
            return false;
        const contextValue = this.getContextValue(condition.expression, context);
        const expectedValue = condition.parameters?.expectedValue;
        const operator = condition.parameters?.operator || 'equals';
        switch (operator) {
            case 'equals':
                return contextValue === expectedValue;
            case 'contains':
                return String(contextValue).includes(String(expectedValue));
            case 'greater_than':
                return Number(contextValue) > Number(expectedValue);
            case 'less_than':
                return Number(contextValue) < Number(expectedValue);
            default:
                return false;
        }
    }
    evaluateHistoryCondition(condition, validationResult) {
        if (!validationResult)
            return false;
        const errorType = condition.parameters?.errorType;
        const threshold = condition.parameters?.threshold || 1;
        const errorCount = validationResult.errors.filter(error => !errorType || error.type === errorType).length;
        return errorCount >= threshold;
    }
    evaluateCustomCondition(condition, content, context) {
        // Custom condition evaluation logic
        // This could be extended with a plugin system or custom evaluators
        return false;
    }
    getContextValue(path, context) {
        const keys = path.split('.');
        let value = context;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    calculateComplexityScore(content) {
        let score = 0;
        // Count lines
        score += content.split('\n').length * 0.1;
        // Count functions/classes
        const structures = (content.match(/function\s+\w+|=>|class\s+\w+/g) || []).length;
        score += structures * 0.5;
        // Count nested levels
        const maxNesting = this.calculateMaxNesting(content);
        score += maxNesting * 0.3;
        // Count conditional statements
        const conditionals = (content.match(/if\s*\(|else\s+if\s*\(|switch\s*\(/g) || []).length;
        score += conditionals * 0.2;
        return Math.round(score * 10) / 10;
    }
    calculateMaxNesting(content) {
        let maxNesting = 0;
        let currentNesting = 0;
        for (const char of content) {
            if (char === '{') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            }
            else if (char === '}') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }
        return maxNesting;
    }
    async executeRuleActions(rule, content, context) {
        const suggestions = [];
        let autoFixable = false;
        let confidence = 0.8;
        for (const action of rule.actions) {
            switch (action.type) {
                case 'suggest':
                    if (action.message) {
                        suggestions.push(action.message);
                    }
                    break;
                case 'auto_fix':
                    autoFixable = true;
                    confidence = 0.9;
                    break;
                case 'log':
                    this.logger.info(`Enforcement action: ${action.message}`, {
                        ruleId: rule.id,
                        category: rule.category
                    });
                    break;
                case 'notify':
                    await this.showNotification(action.message || rule.description, rule.severity);
                    break;
            }
        }
        return {
            ruleId: rule.id,
            triggered: true,
            severity: rule.severity,
            message: rule.description,
            suggestions,
            autoFixable,
            confidence
        };
    }
    async showNotification(message, severity) {
        const severityMap = {
            critical: vscode.window.showErrorMessage,
            high: vscode.window.showWarningMessage,
            medium: vscode.window.showInformationMessage,
            low: vscode.window.showInformationMessage
        };
        const showMessage = severityMap[severity] || vscode.window.showInformationMessage;
        await showMessage(message);
    }
    generateAdaptiveSuggestions(enforcementResults, context) {
        const suggestions = [];
        // Analyze enforcement patterns
        const criticalIssues = enforcementResults.filter(r => r.severity === 'critical');
        const highIssues = enforcementResults.filter(r => r.severity === 'high');
        if (criticalIssues.length > 0) {
            suggestions.push('Consider reviewing critical security and safety issues before proceeding');
        }
        if (highIssues.length > 2) {
            suggestions.push('Multiple high-severity issues detected. Consider breaking down the task into smaller components');
        }
        // Context-specific suggestions
        if (context?.projectState?.currentTask) {
            suggestions.push(`Ensure code aligns with current task: ${context.projectState.currentTask}`);
        }
        // Adaptive learning suggestions
        const adaptiveSuggestions = this.getAdaptiveSuggestions();
        suggestions.push(...adaptiveSuggestions);
        return suggestions;
    }
    getAdaptiveSuggestions() {
        const suggestions = [];
        // Analyze user behavior patterns
        const overrideRate = this.calculateOverrideRate();
        if (overrideRate > 0.7) {
            suggestions.push('Consider adjusting validation strictness based on your preferences');
        }
        // Suggest rule adjustments based on effectiveness
        for (const [ruleId, metrics] of this.adaptiveMetrics) {
            if (metrics.effectiveness < 0.3 && metrics.triggerCount > 5) {
                suggestions.push(`Consider disabling or adjusting rule: ${ruleId} (low effectiveness)`);
            }
        }
        return suggestions;
    }
    calculateOverrideRate() {
        const totalEnforcements = this.enforcementHistory.length;
        const overrides = this.enforcementHistory.filter(r => r.triggered && r.severity === 'high').length;
        return totalEnforcements > 0 ? overrides / totalEnforcements : 0;
    }
    updateAdaptiveMetrics(enforcementResults) {
        for (const result of enforcementResults) {
            const metrics = this.adaptiveMetrics.get(result.ruleId) || {
                ruleId: result.ruleId,
                triggerCount: 0,
                falsePositiveCount: 0,
                userOverrideCount: 0,
                lastTriggered: new Date(),
                effectiveness: 0.5
            };
            metrics.triggerCount++;
            metrics.lastTriggered = new Date();
            // Update effectiveness based on user feedback (simplified)
            if (result.confidence > 0.8) {
                metrics.effectiveness = Math.min(1.0, metrics.effectiveness + 0.1);
            }
            else {
                metrics.effectiveness = Math.max(0.0, metrics.effectiveness - 0.05);
            }
            this.adaptiveMetrics.set(result.ruleId, metrics);
        }
    }
    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'security_hardcoded_credentials',
                name: 'Hardcoded Credentials Detection',
                description: 'Detect and prevent hardcoded credentials in code',
                category: 'security',
                severity: 'critical',
                enabled: true,
                adaptive: true,
                learningRate: 0.1,
                conditions: [
                    {
                        type: 'pattern',
                        expression: '(password|secret|key|token)\\s*=\\s*[\'"][^\'"]+[\'"]',
                        parameters: { caseSensitive: false }
                    }
                ],
                actions: [
                    {
                        type: 'block',
                        message: 'Hardcoded credentials detected. Use environment variables or secure configuration.'
                    },
                    {
                        type: 'suggest',
                        message: 'Consider using environment variables or a secure configuration management system'
                    }
                ]
            },
            {
                id: 'performance_complexity',
                name: 'High Complexity Detection',
                description: 'Detect code with high cyclomatic complexity',
                category: 'performance',
                severity: 'high',
                enabled: true,
                adaptive: true,
                learningRate: 0.05,
                conditions: [
                    {
                        type: 'complexity',
                        expression: 'complexity_score',
                        parameters: { threshold: 10 }
                    }
                ],
                actions: [
                    {
                        type: 'warn',
                        message: 'High complexity detected. Consider refactoring into smaller functions.'
                    },
                    {
                        type: 'suggest',
                        message: 'Break down complex functions into smaller, more manageable pieces'
                    }
                ]
            },
            {
                id: 'quality_incomplete_code',
                name: 'Incomplete Code Detection',
                description: 'Detect placeholder or incomplete code patterns',
                category: 'quality',
                severity: 'medium',
                enabled: true,
                adaptive: true,
                learningRate: 0.1,
                conditions: [
                    {
                        type: 'pattern',
                        expression: '(TODO|FIXME|placeholder|mock|dummy)',
                        parameters: { caseSensitive: false }
                    }
                ],
                actions: [
                    {
                        type: 'warn',
                        message: 'Incomplete code detected. Complete implementation before proceeding.'
                    },
                    {
                        type: 'suggest',
                        message: 'Replace placeholder code with actual implementation'
                    }
                ]
            },
            {
                id: 'maintainability_documentation',
                name: 'Documentation Requirements',
                description: 'Ensure proper documentation for complex functions',
                category: 'maintainability',
                severity: 'low',
                enabled: true,
                adaptive: true,
                learningRate: 0.05,
                conditions: [
                    {
                        type: 'complexity',
                        expression: 'complexity_score',
                        parameters: { threshold: 5 }
                    },
                    {
                        type: 'pattern',
                        expression: 'function\\s+\\w+\\s*\\([^)]*\\)\\s*\\{',
                        parameters: {}
                    }
                ],
                actions: [
                    {
                        type: 'suggest',
                        message: 'Consider adding JSDoc comments for complex functions'
                    }
                ]
            }
        ];
        defaultRules.forEach(rule => {
            this.rules.set(rule.id, rule);
        });
    }
    addRule(rule) {
        this.rules.set(rule.id, rule);
        this.logger.info(`Enforcement rule added: ${rule.name}`);
    }
    removeRule(ruleId) {
        this.rules.delete(ruleId);
        this.logger.info(`Enforcement rule removed: ${ruleId}`);
    }
    updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.logger.info(`Enforcement rule updated: ${ruleId}`);
        }
    }
    getRules() {
        return Array.from(this.rules.values());
    }
    getAdaptiveMetrics() {
        return Array.from(this.adaptiveMetrics.values());
    }
    getUserPreferences() {
        return new Map(this.userPreferences);
    }
    setUserPreference(key, value) {
        this.userPreferences.set(key, value);
    }
    getEnforcementHistory() {
        return [...this.enforcementHistory];
    }
    clearHistory() {
        this.enforcementHistory = [];
        this.adaptiveMetrics.clear();
    }
}
exports.EnforcementEngine = EnforcementEngine;
//# sourceMappingURL=enforcementEngine.js.map