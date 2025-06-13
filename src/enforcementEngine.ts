import * as vscode from 'vscode';
import { Logger } from './logger';
import { Validator, ValidationContext } from './validator';
import { ProjectPlan } from './projectPlan';
import { ValidationResult, ValidationError, ValidationWarning } from './types';

export interface EnforcementRule {
    id: string;
    name: string;
    description: string;
    category: 'security' | 'performance' | 'quality' | 'maintainability' | 'compliance';
    severity: 'critical' | 'high' | 'medium' | 'low';
    enabled: boolean;
    conditions: EnforcementCondition[];
    actions: EnforcementAction[];
    adaptive: boolean;
    learningRate: number;
}

export interface EnforcementCondition {
    type: 'pattern' | 'complexity' | 'context' | 'history' | 'custom';
    expression: string;
    parameters?: any;
}

export interface EnforcementAction {
    type: 'block' | 'warn' | 'suggest' | 'auto_fix' | 'log' | 'notify';
    parameters?: any;
    message?: string;
}

export interface EnforcementResult {
    ruleId: string;
    triggered: boolean;
    severity: string;
    message: string;
    suggestions: string[];
    autoFixable: boolean;
    confidence: number;
}

export interface AdaptiveMetrics {
    ruleId: string;
    triggerCount: number;
    falsePositiveCount: number;
    userOverrideCount: number;
    lastTriggered: Date;
    effectiveness: number;
}

export class EnforcementEngine {
    private logger: Logger;
    private validator: Validator;
    private projectPlan: ProjectPlan;
    private rules: Map<string, EnforcementRule> = new Map();
    private adaptiveMetrics: Map<string, AdaptiveMetrics> = new Map();
    private enforcementHistory: EnforcementResult[] = [];
    private userPreferences: Map<string, any> = new Map();

    constructor(logger: Logger, validator: Validator, projectPlan: ProjectPlan) {
        this.logger = logger;
        this.validator = validator;
        this.projectPlan = projectPlan;
        this.initializeDefaultRules();
    }

    public async enforceValidation(content: string, context?: ValidationContext): Promise<{
        validationResult: ValidationResult;
        enforcementResults: EnforcementResult[];
        adaptiveSuggestions: string[];
    }> {
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

    private async applyEnforcementRules(
        content: string, 
        context?: ValidationContext, 
        validationResult?: ValidationResult
    ): Promise<EnforcementResult[]> {
        const results: EnforcementResult[] = [];

        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled) continue;

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
            } catch (error) {
                this.logger.error(`Error applying enforcement rule: ${rule.name}`, error);
            }
        }

        return results;
    }

    private async evaluateRule(
        rule: EnforcementRule,
        content: string,
        context?: ValidationContext,
        validationResult?: ValidationResult
    ): Promise<boolean> {
        for (const condition of rule.conditions) {
            const result = await this.evaluateCondition(condition, content, context, validationResult);
            if (!result) {
                return false; // All conditions must be true
            }
        }
        return true;
    }

    private async evaluateCondition(
        condition: EnforcementCondition,
        content: string,
        context?: ValidationContext,
        validationResult?: ValidationResult
    ): Promise<boolean> {
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

    private evaluatePatternCondition(condition: EnforcementCondition, content: string): boolean {
        const pattern = new RegExp(condition.expression, 'gi');
        return pattern.test(content);
    }

    private evaluateComplexityCondition(condition: EnforcementCondition, content: string): boolean {
        const complexity = this.calculateComplexityScore(content);
        const threshold = condition.parameters?.threshold || 5;
        return complexity > threshold;
    }

    private evaluateContextCondition(condition: EnforcementCondition, context?: ValidationContext): boolean {
        if (!context) return false;

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

    private evaluateHistoryCondition(condition: EnforcementCondition, validationResult?: ValidationResult): boolean {
        if (!validationResult) return false;

        const errorType = condition.parameters?.errorType;
        const threshold = condition.parameters?.threshold || 1;

        const errorCount = validationResult.errors.filter(error => 
            !errorType || error.type === errorType
        ).length;

        return errorCount >= threshold;
    }

    private evaluateCustomCondition(
        condition: EnforcementCondition, 
        content: string, 
        context?: ValidationContext
    ): boolean {
        // Custom condition evaluation logic
        // This could be extended with a plugin system or custom evaluators
        return false;
    }

    private getContextValue(path: string, context: ValidationContext): any {
        const keys = path.split('.');
        let value: any = context;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    private calculateComplexityScore(content: string): number {
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

    private calculateMaxNesting(content: string): number {
        let maxNesting = 0;
        let currentNesting = 0;

        for (const char of content) {
            if (char === '{') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }

        return maxNesting;
    }

    private async executeRuleActions(
        rule: EnforcementRule,
        content: string,
        context?: ValidationContext
    ): Promise<EnforcementResult> {
        const suggestions: string[] = [];
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

    private async showNotification(message: string, severity: string): Promise<void> {
        const severityMap = {
            critical: vscode.window.showErrorMessage,
            high: vscode.window.showWarningMessage,
            medium: vscode.window.showInformationMessage,
            low: vscode.window.showInformationMessage
        };

        const showMessage = severityMap[severity as keyof typeof severityMap] || vscode.window.showInformationMessage;
        await showMessage(message);
    }

    private generateAdaptiveSuggestions(enforcementResults: EnforcementResult[], context?: ValidationContext): string[] {
        const suggestions: string[] = [];

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

    private getAdaptiveSuggestions(): string[] {
        const suggestions: string[] = [];

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

    private calculateOverrideRate(): number {
        const totalEnforcements = this.enforcementHistory.length;
        const overrides = this.enforcementHistory.filter(r => r.triggered && r.severity === 'high').length;
        return totalEnforcements > 0 ? overrides / totalEnforcements : 0;
    }

    private updateAdaptiveMetrics(enforcementResults: EnforcementResult[]): void {
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
            } else {
                metrics.effectiveness = Math.max(0.0, metrics.effectiveness - 0.05);
            }

            this.adaptiveMetrics.set(result.ruleId, metrics);
        }
    }

    private initializeDefaultRules(): void {
        const defaultRules: EnforcementRule[] = [
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

    public addRule(rule: EnforcementRule): void {
        this.rules.set(rule.id, rule);
        this.logger.info(`Enforcement rule added: ${rule.name}`);
    }

    public removeRule(ruleId: string): void {
        this.rules.delete(ruleId);
        this.logger.info(`Enforcement rule removed: ${ruleId}`);
    }

    public updateRule(ruleId: string, updates: Partial<EnforcementRule>): void {
        const rule = this.rules.get(ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.logger.info(`Enforcement rule updated: ${ruleId}`);
        }
    }

    public getRules(): EnforcementRule[] {
        return Array.from(this.rules.values());
    }

    public getAdaptiveMetrics(): AdaptiveMetrics[] {
        return Array.from(this.adaptiveMetrics.values());
    }

    public getUserPreferences(): Map<string, any> {
        return new Map(this.userPreferences);
    }

    public setUserPreference(key: string, value: any): void {
        this.userPreferences.set(key, value);
    }

    public getEnforcementHistory(): EnforcementResult[] {
        return [...this.enforcementHistory];
    }

    public clearHistory(): void {
        this.enforcementHistory = [];
        this.adaptiveMetrics.clear();
    }
} 