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
exports.PassiveValidationConfigManager = void 0;
const vscode = __importStar(require("vscode"));
class PassiveValidationConfigManager {
    constructor(logger) {
        this.configSection = 'failsafe.passiveValidation';
        this.logger = logger;
    }
    /**
     * Get the current passive validation configuration
     */
    getConfig() {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return {
            // Core settings
            enabled: config.get('enabled', true),
            mode: config.get('mode', 'full'),
            timeout: config.get('timeout', 3000),
            showFeedback: config.get('showFeedback', true),
            showFailureNotices: config.get('showFailureNotices', true),
            // Performance settings
            enableRealTimeValidation: config.get('enableRealTimeValidation', true),
            enableStatistics: config.get('enableStatistics', true),
            enableLogging: config.get('enableLogging', true),
            enableNotifications: config.get('enableNotifications', false),
            enableAutoRetry: config.get('enableAutoRetry', true),
            maxRetries: config.get('maxRetries', 2),
            enablePerformanceMode: config.get('enablePerformanceMode', false),
            // Rule enablement settings
            enableCustomRules: config.get('enableCustomRules', true),
            enableBuiltInRules: config.get('enableBuiltInRules', true),
            enableChatValidation: config.get('enableChatValidation', true),
            enableFileValidation: config.get('enableFileValidation', true),
            enableCodeValidation: config.get('enableCodeValidation', true),
            enableVersionValidation: config.get('enableVersionValidation', true),
            enableSecurityValidation: config.get('enableSecurityValidation', true),
            enableQualityValidation: config.get('enableQualityValidation', true),
            enablePerformanceValidation: config.get('enablePerformanceValidation', true),
            enableTestingValidation: config.get('enableTestingValidation', true),
            enableDocumentationValidation: config.get('enableDocumentationValidation', true),
            enableWorkflowValidation: config.get('enableWorkflowValidation', true),
            enableBeginnerGuidance: config.get('enableBeginnerGuidance', true),
            enableErrorRecovery: config.get('enableErrorRecovery', true),
            enableBestPractices: config.get('enableBestPractices', true),
            enableDependencyValidation: config.get('enableDependencyValidation', true),
            enableTransparencyValidation: config.get('enableTransparencyValidation', true),
            // Specific rule enablement
            enableStallingDetection: config.get('enableStallingDetection', true),
            enableVagueOfferDetection: config.get('enableVagueOfferDetection', true),
            enableAbsoluteStatementDetection: config.get('enableAbsoluteStatementDetection', true),
            enableImplementationClaimDetection: config.get('enableImplementationClaimDetection', true),
            enableTaskCompletionDetection: config.get('enableTaskCompletionDetection', true),
            enableFileExistenceDetection: config.get('enableFileExistenceDetection', true),
            enablePerformanceClaimDetection: config.get('enablePerformanceClaimDetection', true),
            enableTestResultDetection: config.get('enableTestResultDetection', true),
            enableCompilationDetection: config.get('enableCompilationDetection', true),
            enableAuditResultDetection: config.get('enableAuditResultDetection', true),
            enableVersionManagementDetection: config.get('enableVersionManagementDetection', true),
            enableAITaskExecutionDetection: config.get('enableAITaskExecutionDetection', true),
            enableGitHubWorkflowDetection: config.get('enableGitHubWorkflowDetection', true),
            enableProductDiscoveryDetection: config.get('enableProductDiscoveryDetection', true),
            enableFullVerificationEnforcement: config.get('enableFullVerificationEnforcement', true),
            enableIncompleteBuildDetection: config.get('enableIncompleteBuildDetection', true),
            enableVerificationPipelineReminder: config.get('enableVerificationPipelineReminder', true)
        };
    }
    /**
     * Update a specific configuration value
     */
    async updateConfig(key, value) {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            await config.update(key, value, vscode.ConfigurationTarget.Global);
            this.logger.info(`Passive validation config updated: ${key} = ${value}`);
        }
        catch (error) {
            this.logger.error(`Failed to update passive validation config: ${key}`, error);
            throw error;
        }
    }
    /**
     * Update multiple configuration values at once
     */
    async updateConfigBatch(updates) {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            for (const [key, value] of Object.entries(updates)) {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
            }
            this.logger.info(`Passive validation config batch updated: ${Object.keys(updates).join(', ')}`);
        }
        catch (error) {
            this.logger.error('Failed to update passive validation config batch', error);
            throw error;
        }
    }
    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            const defaultConfig = this.getDefaultConfig();
            for (const [key, value] of Object.entries(defaultConfig)) {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
            }
            this.logger.info('Passive validation config reset to defaults');
        }
        catch (error) {
            this.logger.error('Failed to reset passive validation config', error);
            throw error;
        }
    }
    /**
     * Get default configuration values
     */
    getDefaultConfig() {
        return {
            // Core settings
            enabled: true,
            mode: 'full',
            timeout: 3000,
            showFeedback: true,
            showFailureNotices: true,
            // Performance settings
            enableRealTimeValidation: true,
            enableStatistics: true,
            enableLogging: true,
            enableNotifications: false,
            enableAutoRetry: true,
            maxRetries: 2,
            enablePerformanceMode: false,
            // Rule enablement settings
            enableCustomRules: true,
            enableBuiltInRules: true,
            enableChatValidation: true,
            enableFileValidation: true,
            enableCodeValidation: true,
            enableVersionValidation: true,
            enableSecurityValidation: true,
            enableQualityValidation: true,
            enablePerformanceValidation: true,
            enableTestingValidation: true,
            enableDocumentationValidation: true,
            enableWorkflowValidation: true,
            enableBeginnerGuidance: true,
            enableErrorRecovery: true,
            enableBestPractices: true,
            enableDependencyValidation: true,
            enableTransparencyValidation: true,
            // Specific rule enablement
            enableStallingDetection: true,
            enableVagueOfferDetection: true,
            enableAbsoluteStatementDetection: true,
            enableImplementationClaimDetection: true,
            enableTaskCompletionDetection: true,
            enableFileExistenceDetection: true,
            enablePerformanceClaimDetection: true,
            enableTestResultDetection: true,
            enableCompilationDetection: true,
            enableAuditResultDetection: true,
            enableVersionManagementDetection: true,
            enableAITaskExecutionDetection: true,
            enableGitHubWorkflowDetection: true,
            enableProductDiscoveryDetection: true,
            enableFullVerificationEnforcement: true,
            enableIncompleteBuildDetection: true,
            enableVerificationPipelineReminder: true
        };
    }
    /**
     * Check if a specific rule is enabled
     */
    isRuleEnabled(ruleName) {
        const config = this.getConfig();
        const ruleKey = `enable${ruleName.charAt(0).toUpperCase() + ruleName.slice(1)}Detection`;
        return config[ruleKey] || false;
    }
    /**
     * Get enabled rules based on current configuration
     */
    getEnabledRules() {
        const config = this.getConfig();
        const enabledRules = [];
        if (config.enableStallingDetection)
            enabledRules.push('No Repetitive Confirmation or Stalling');
        if (config.enableVagueOfferDetection)
            enabledRules.push('Vague Offer Detection');
        if (config.enableAbsoluteStatementDetection)
            enabledRules.push('Absolute Statement Detection');
        if (config.enableImplementationClaimDetection)
            enabledRules.push('Implementation Verification');
        if (config.enableTaskCompletionDetection)
            enabledRules.push('Task Completion Claim');
        if (config.enableFileExistenceDetection)
            enabledRules.push('File Existence Claim');
        if (config.enablePerformanceClaimDetection)
            enabledRules.push('Performance Claim Detection');
        if (config.enableTestResultDetection)
            enabledRules.push('Test Results Claim');
        if (config.enableCompilationDetection)
            enabledRules.push('Compilation Status Claim');
        if (config.enableAuditResultDetection)
            enabledRules.push('Audit Results Claim');
        if (config.enableVersionManagementDetection)
            enabledRules.push('Auto Version Management');
        if (config.enableAITaskExecutionDetection)
            enabledRules.push('AI Task Execution');
        if (config.enableGitHubWorkflowDetection)
            enabledRules.push('GitHub Workflow Management');
        if (config.enableProductDiscoveryDetection)
            enabledRules.push('Product Discovery Protocol');
        if (config.enableBeginnerGuidance)
            enabledRules.push('Beginner Guidance');
        if (config.enableErrorRecovery)
            enabledRules.push('Error Recovery Assistance');
        if (config.enableBestPractices)
            enabledRules.push('Best Practice Suggestions');
        if (config.enableDependencyValidation)
            enabledRules.push('Dependency Management');
        if (config.enableTransparencyValidation)
            enabledRules.push('Hallucination Admission');
        if (config.enableDocumentationValidation)
            enabledRules.push('Documentation Assistance');
        if (config.enableVersionValidation)
            enabledRules.push('Version Consistency Check');
        if (config.enableTestingValidation)
            enabledRules.push('Testing Guidance');
        if (config.enableFullVerificationEnforcement)
            enabledRules.push('Full Verification Process Enforcement');
        if (config.enableIncompleteBuildDetection)
            enabledRules.push('Incomplete Build Detection');
        if (config.enableVerificationPipelineReminder)
            enabledRules.push('Verification Pipeline Reminder');
        return enabledRules;
    }
    /**
     * Get configuration summary for display
     */
    getConfigSummary() {
        const config = this.getConfig();
        const enabledRules = this.getEnabledRules();
        return {
            enabled: config.enabled,
            mode: config.mode,
            enabledRules: enabledRules.length,
            totalRules: 24, // Total number of available rules
            performanceMode: config.enablePerformanceMode,
            timeout: config.timeout
        };
    }
    /**
     * Validate configuration values
     */
    validateConfig(config) {
        const errors = [];
        if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 10000)) {
            errors.push('Timeout must be between 1000 and 10000 milliseconds');
        }
        if (config.maxRetries !== undefined && (config.maxRetries < 0 || config.maxRetries > 5)) {
            errors.push('Max retries must be between 0 and 5');
        }
        if (config.mode !== undefined && !['full', 'minimal', 'critical'].includes(config.mode)) {
            errors.push('Mode must be one of: full, minimal, critical');
        }
        return errors;
    }
}
exports.PassiveValidationConfigManager = PassiveValidationConfigManager;
//# sourceMappingURL=passiveValidationConfig.js.map