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
exports.CursorrulesEngine = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const alertManager_1 = require("./alertManager");
class CursorrulesEngine {
    constructor(context, logger) {
        this.rules = [];
        this.context = context;
        this.logger = logger;
        this.alertManager = new alertManager_1.AlertManager(logger);
        this.storagePath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe', 'cursorrules.json');
        this.ensureStorageDirectory();
        this.loadRules();
        // Add default filesystem hallucination detection rule
        this.addDefaultFilesystemRule();
        // Add proactive file system validation rules
        this.addDefaultProactiveRules();
        // Add minimal validation rule for common patterns
        this.addMinimalValidationRule();
        // Add inherent rules based on conversation discoveries
        this.addInherentRules();
        // Add workflow automation rules for Vibe Coders
        this.addWorkflowAutomationRules();
    }
    ensureStorageDirectory() {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    loadRules() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                const rulesData = JSON.parse(data);
                this.rules = [];
                rulesData.forEach((ruleData) => {
                    const rule = {
                        ...ruleData,
                        createdAt: new Date(ruleData.createdAt).toISOString(),
                        updatedAt: ruleData.updatedAt ? new Date(ruleData.updatedAt).toISOString() : undefined,
                        usageStats: ruleData.usageStats || { triggers: 0, overrides: 0 }
                    };
                    this.rules.push(rule);
                });
                this.logger.info(`Loaded ${this.rules.length} Cursorrules`);
            }
        }
        catch (error) {
            this.logger.error('Error loading Cursorrules', error);
            this.rules = [];
        }
    }
    saveRules() {
        try {
            const rulesArray = this.rules.map(rule => ({
                ...rule,
                createdAt: new Date(rule.createdAt).toISOString(),
                updatedAt: rule.updatedAt ? new Date(rule.updatedAt).toISOString() : undefined,
                usageStats: rule.usageStats || { triggers: 0, overrides: 0 }
            }));
            fs.writeFileSync(this.storagePath, JSON.stringify(rulesArray, null, 2));
            this.logger.info(`Saved ${this.rules.length} Cursorrules`);
        }
        catch (error) {
            this.logger.error('Failed to save Cursorrules', error);
        }
    }
    createRule(ruleData) {
        const rule = {
            ...ruleData,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageStats: { triggers: 0, overrides: 0 }
        };
        this.rules.push(rule);
        this.saveRules();
        this.logger.info(`Created Cursorrule: ${rule.name}`);
        return rule;
    }
    updateRule(id, updates) {
        const rule = this.rules.find(rule => rule.id === id);
        if (!rule)
            return null;
        const updatedRule = {
            ...rule,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        const index = this.rules.findIndex(r => r.id === id);
        if (index !== -1) {
            this.rules[index] = updatedRule;
        }
        this.saveRules();
        this.logger.info(`Updated Cursorrule: ${updatedRule.name}`);
        return updatedRule;
    }
    deleteRule(id) {
        const index = this.rules.findIndex(rule => rule.id === id);
        if (index === -1)
            return false;
        this.rules.splice(index, 1);
        this.saveRules();
        this.logger.info(`Deleted Cursorrule: ${id}`);
        return true;
    }
    getRule(id) {
        return this.rules.find(rule => rule.id === id);
    }
    getAllRules() {
        return this.rules;
    }
    getEnabledRules() {
        return this.rules.filter(rule => rule.enabled);
    }
    evaluateContent(content) {
        const matches = [];
        for (const rule of this.rules) {
            if (!rule.enabled)
                continue;
            const match = this.evaluateRule(rule, content);
            if (match.matched) {
                matches.push(match);
                this.updateRuleStats(rule.id);
                // Use AlertManager to handle alerts based on configuration
                if (this.alertManager.shouldShowAlert(rule)) {
                    const message = rule.response || `Rule "${rule.name}" triggered: ${match.match}`;
                    this.alertManager.scheduleAlert(rule, message);
                }
            }
        }
        return matches;
    }
    evaluateRule(rule, content) {
        let matched = false;
        let match = '';
        let confidence = 0;
        let line;
        switch (rule.patternType) {
            case 'regex': {
                const regex = new RegExp(rule.pattern, 'gi');
                const matches = content.match(regex);
                if (matches) {
                    matched = true;
                    match = matches[0];
                    confidence = 0.9;
                    line = this.findLineNumber(content, match);
                }
                break;
            }
            case 'keyword': {
                const keywords = rule.pattern.split(',').map(k => k.trim().toLowerCase());
                const lowerContent = content.toLowerCase();
                for (const keyword of keywords) {
                    if (lowerContent.includes(keyword)) {
                        matched = true;
                        match = keyword;
                        confidence = 0.7;
                        line = this.findLineNumber(content, keyword);
                        break;
                    }
                }
                break;
            }
            case 'semantic': {
                // Basic semantic analysis - can be enhanced later
                const semanticPatterns = this.getSemanticPatterns(rule.purpose);
                for (const pattern of semanticPatterns) {
                    if (content.toLowerCase().includes(pattern.toLowerCase())) {
                        matched = true;
                        match = pattern;
                        confidence = 0.6;
                        line = this.findLineNumber(content, pattern);
                        break;
                    }
                }
                break;
            }
        }
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            matched,
            confidence,
            line,
            match
        };
    }
    getSemanticPatterns(purpose) {
        const patterns = {
            security: [
                'password', 'secret', 'api_key', 'token', 'credential',
                'rm -rf', 'format', 'eval', 'exec', 'child_process'
            ],
            quality: [
                'TODO', 'FIXME', 'lorem', 'mock', 'placeholder', 'example',
                'foo', 'bar', 'baz', 'abc', '1234', 'test', 'sample'
            ],
            compliance: [
                'PII', 'personal data', 'confidential', 'internal use only',
                'copyright', 'proprietary', 'restricted'
            ],
            workflow: [
                'merge conflict', 'unresolved', 'broken', 'deprecated',
                'legacy', 'obsolete', 'temporary'
            ]
        };
        return patterns[purpose] || [];
    }
    findLineNumber(content, match) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match)) {
                return i + 1;
            }
        }
        return undefined;
    }
    generateSuggestions(rule, match) {
        const suggestions = [];
        switch (rule.purpose) {
            case 'security':
                suggestions.push(`Remove or secure the detected "${match}"`);
                suggestions.push('Use environment variables for sensitive data');
                suggestions.push('Consider using a secrets management system');
                break;
            case 'quality':
                suggestions.push(`Replace "${match}" with actual implementation`);
                suggestions.push('Add proper error handling');
                suggestions.push('Include appropriate documentation');
                break;
            case 'compliance':
                suggestions.push('Review compliance requirements');
                suggestions.push('Ensure proper data handling procedures');
                suggestions.push('Consult with compliance team if needed');
                break;
            case 'workflow':
                suggestions.push('Resolve any pending issues');
                suggestions.push('Update documentation if needed');
                suggestions.push('Follow team coding standards');
                break;
        }
        return suggestions;
    }
    updateRuleStats(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            if (!rule.usageStats) {
                rule.usageStats = { triggers: 0, overrides: 0 };
            }
            if (!rule.usageStats)
                rule.usageStats = { triggers: 0, overrides: 0 };
            rule.usageStats.triggers++;
            rule.usageStats.lastTriggered = new Date().toISOString();
        }
    }
    recordOverride(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            if (!rule.usageStats) {
                rule.usageStats = { triggers: 0, overrides: 0 };
            }
            if (!rule.usageStats)
                rule.usageStats = { triggers: 0, overrides: 0 };
            rule.usageStats.overrides++;
        }
    }
    generateId() {
        return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    getStats() {
        return {
            totalRules: this.rules.length,
            enabledRules: this.rules.filter(r => r.enabled).length,
            totalTriggers: this.rules.reduce((sum, r) => sum + (r.usageStats?.triggers || 0), 0),
            totalOverrides: this.rules.reduce((sum, r) => sum + (r.usageStats?.overrides || 0), 0)
        };
    }
    getRulesByPurpose(purpose) {
        switch (purpose) {
            case 'security': {
                const securityRules = this.getAllRules().filter(rule => rule.purpose === 'security');
                return securityRules;
            }
            case 'quality': {
                const qualityRules = this.getAllRules().filter(rule => rule.purpose === 'quality');
                return qualityRules;
            }
            case 'compliance': {
                const complianceRules = this.getAllRules().filter(rule => rule.purpose === 'compliance');
                return complianceRules;
            }
            case 'workflow': {
                const workflowRules = this.getAllRules().filter(rule => rule.purpose === 'workflow');
                return workflowRules;
            }
            case 'all': {
                const allRules = this.getAllRules();
                return allRules;
            }
            default: {
                const customRules = this.getAllRules().filter(rule => rule.purpose === purpose);
                return customRules;
            }
        }
    }
    addDefaultFilesystemRule() {
        const existingRule = this.rules.find(rule => rule.name === 'Filesystem Hallucination Detection');
        if (!existingRule) {
            this.createRule({
                name: 'Filesystem Hallucination Detection',
                pattern: '\\b(?:file|directory|folder|path)\\s+(?:exists|is\\s+present|can\\s+be\\s+found|is\\s+available)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true
            });
        }
    }
    /**
     * Get default proactive file system validation rules
     */
    getDefaultProactiveRules() {
        return [
            {
                id: this.generateId(),
                name: 'Proactive File Existence Check',
                pattern: '\\b(?:file|directory|folder|path)\\s+(?:exists|is\\s+present|can\\s+be\\s+found|is\\s+available)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: File existence claim detected. Verify file actually exists.',
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'File Content Claim Validation',
                pattern: '\\b(?:content|text|data)\\s+(?:in|of|from)\\s+(?:file|document)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: File content claim detected. Verify content actually exists in file.',
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'File Modification Time Claim',
                pattern: '\\b(?:modified|updated|changed)\\s+(?:on|at|when)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: File modification time claim detected. Verify modification timestamp.',
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'Directory Structure Claim',
                pattern: '\\b(?:directory|folder)\\s+(?:structure|layout|organization)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: Directory structure claim detected. Verify directory structure.',
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'File Size Claim',
                pattern: '\\b(?:file|document)\\s+(?:size|length|bytes)\\b',
                patternType: 'regex',
                purpose: 'hallucination_detection',
                severity: 'error',
                enabled: true,
                message: 'Potential hallucination: File size claim detected. Verify actual file size.',
                createdAt: new Date().toISOString()
            }
        ];
    }
    /**
     * Add default proactive file system validation rules
     */
    addDefaultProactiveRules() {
        const defaultRules = this.getDefaultProactiveRules();
        defaultRules.forEach(ruleData => {
            const existingRule = this.rules.find(rule => rule.name === ruleData.name);
            if (!existingRule) {
                this.createRule(ruleData);
            }
        });
    }
    /**
     * Add minimal validation Cursorrule for common hallucination patterns
     */
    addMinimalValidationRule() {
        const existingRule = this.rules.find(rule => rule.name === 'Minimal Hallucination Detection');
        if (!existingRule) {
            this.createRule({
                name: 'Minimal Hallucination Detection',
                pattern: '\\b(?:I\\s+can\\s+see|there\\s+is|I\\s+found|I\\s+located|the\\s+file\\s+contains|I\\s+can\\s+see\\s+in\\s+the\\s+file)\\b',
                patternType: 'regex',
                purpose: 'minimal_validation',
                severity: 'warning',
                message: 'Potential hallucination: AI making claims about file content. Verify these claims.',
                enabled: true
            });
        }
    }
    /**
     * Add additional inherent Cursorrules based on conversation discoveries
     */
    addInherentRules() {
        const inherentRules = [
            {
                name: 'Version Consistency Check',
                pattern: '\\b(?:version|v\\d+\\.\\d+\\.\\d+|semver)\\b',
                patternType: 'regex',
                purpose: 'version_consistency',
                severity: 'warning',
                enabled: true,
                response: 'Version consistency check triggered. This may be a temporary mismatch during updates.',
                alerting: {
                    whenToAlert: 'delayed',
                    delaySeconds: 30,
                    howToAlert: 'notification',
                    alertFrequency: 'throttled',
                    throttleMinutes: 5,
                    suppressAfterTriggers: 10,
                    suppressDurationMinutes: 60
                }
            },
            {
                name: 'Implementation Verification',
                pattern: '\\b(?:I\\s+implemented|I\\s+created|I\\s+built|I\\s+developed)\\b',
                patternType: 'regex',
                purpose: 'implementation_verification',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Task Completion Claim',
                pattern: '\\b(?:completed|finished|done|implemented|resolved)\\b',
                patternType: 'regex',
                purpose: 'task_completion',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Audit Results Claim',
                pattern: '\\b(?:audit|review|analysis|assessment)\\s+(?:shows|indicates|reveals)\\b',
                patternType: 'regex',
                purpose: 'audit_results',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Compilation Status Claim',
                pattern: '\\b(?:compiles|builds|runs|executes)\\s+(?:successfully|without\\s+errors)\\b',
                patternType: 'regex',
                purpose: 'compilation_status',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Test Results Claim',
                pattern: '\\b(?:tests\\s+pass|test\\s+results|coverage|tested)\\b',
                patternType: 'regex',
                purpose: 'test_results',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Hallucination Admission',
                pattern: '\\b(?:I\\s+don\\s*\'t\\s+know|I\\s+can\\s*\'t\\s+see|I\\s+don\\s*\'t\\s+have\\s+access)\\b',
                patternType: 'regex',
                purpose: 'hallucination_admission',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Vague Offer Detection',
                pattern: '\\b(?:I\\s+can\\s+help|I\\s+can\\s+assist|I\\s+can\\s+guide)\\b',
                patternType: 'regex',
                purpose: 'vague_offers',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Absolute Statement Detection',
                pattern: '\\b(?:always|never|every|all|none|impossible|guaranteed)\\b',
                patternType: 'regex',
                purpose: 'absolute_statements',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Performance Claim Detection',
                pattern: '\\b(?:fast|slow|efficient|optimized|performance|speed)\\b',
                patternType: 'regex',
                purpose: 'performance_claims',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'No Repetitive Confirmation or Stalling',
                pattern: '(let me know if you want to review|otherwise, I will proceed as planned|waiting for confirmation|if you have any new requests|just let me know).*?[.!?]',
                patternType: 'regex',
                purpose: 'workflow',
                severity: 'warning',
                enabled: true,
                message: 'Detected repetitive confirmation or stalling. Proceed with the work unless explicitly told to wait.'
            }
        ];
        inherentRules.forEach(ruleData => {
            const existingRule = this.rules.find(rule => rule.name === ruleData.name);
            if (!existingRule) {
                this.createRule(ruleData);
            }
        });
    }
    /**
     * Add workflow automation rules for Vibe Coders
     */
    addWorkflowAutomationRules() {
        const workflowRules = [
            {
                name: 'Auto Version Management',
                pattern: '\\b(?:version|release|update|bump)\\b',
                patternType: 'regex',
                purpose: 'auto_version_management',
                severity: 'info',
                enabled: true,
                response: 'Version management activity detected. This is normal during updates.',
                alerting: {
                    whenToAlert: 'delayed',
                    delaySeconds: 15,
                    howToAlert: 'log',
                    alertFrequency: 'throttled',
                    throttleMinutes: 3,
                    suppressAfterTriggers: 5,
                    suppressDurationMinutes: 30
                }
            },
            {
                name: 'AI Task Execution',
                pattern: '\\b(?:I\\s+will|I\\s+can|I\\s+should|let\\s+me)\\b',
                patternType: 'regex',
                purpose: 'ai_task_execution',
                severity: 'info',
                enabled: true
            },
            {
                name: 'GitHub Workflow Management',
                pattern: '\\b(?:branch|merge|commit|push|pull|issue|pr)\\b',
                patternType: 'regex',
                purpose: 'github_workflow_management',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Product Discovery Protocol',
                pattern: '\\b(?:plan|strategy|roadmap|milestone|goal)\\b',
                patternType: 'regex',
                purpose: 'product_discovery_protocol',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Beginner Guidance',
                pattern: '\\b(?:how\\s+to|what\\s+is|explain|guide|tutorial)\\b',
                patternType: 'regex',
                purpose: 'beginner_guidance',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Error Recovery Assistance',
                pattern: '\\b(?:error|exception|fail|crash|bug)\\b',
                patternType: 'regex',
                purpose: 'error_recovery_assistance',
                severity: 'warning',
                enabled: true
            },
            {
                name: 'Best Practice Suggestions',
                pattern: '\\b(?:best\\s+practice|recommendation|suggestion|tip)\\b',
                patternType: 'regex',
                purpose: 'best_practice_suggestions',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Dependency Management',
                pattern: '\\b(?:dependency|package|import|require|install)\\b',
                patternType: 'regex',
                purpose: 'dependency_management',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Testing Guidance',
                pattern: '\\b(?:test|spec|coverage|assert|mock)\\b',
                patternType: 'regex',
                purpose: 'testing_guidance',
                severity: 'info',
                enabled: true
            },
            {
                name: 'Documentation Assistance',
                pattern: '\\b(?:document|comment|readme|api|guide)\\b',
                patternType: 'regex',
                purpose: 'documentation_assistance',
                severity: 'info',
                enabled: true
            }
        ];
        workflowRules.forEach(ruleData => {
            const existingRule = this.rules.find(rule => rule.name === ruleData.name);
            if (!existingRule) {
                this.createRule(ruleData);
            }
        });
    }
    /**
     * Enable/disable rules based on user preferences
     */
    toggleRule(ruleId, enabled) {
        const rule = this.rules.find(rule => rule.id === ruleId);
        if (!rule)
            return false;
        rule.enabled = enabled;
        rule.updatedAt = new Date().toISOString();
        this.saveRules();
        this.logger.info(`${enabled ? 'Enabled' : 'Disabled'} rule: ${rule.name}`);
        return true;
    }
    /**
     * Get rules by user role
     */
    getRulesByRole(role) {
        return this.rules.filter(rule => rule.enabled &&
            (!rule.scope ||
                rule.scope.userRoles.includes(role) ||
                rule.scope.userRoles.includes('*')));
    }
    async validateText(text) {
        try {
            const enabledRules = this.getEnabledRules();
            const content = text;
            const violations = [];
            for (const rule of enabledRules) {
                const matches = this.evaluateContent(content);
                const ruleMatches = matches.filter(match => match.ruleId === rule.id && match.matched);
                for (const match of ruleMatches) {
                    violations.push({
                        triggered: true,
                        rule: rule, // Type conversion for compatibility
                        match: match.match || '',
                        line: match.line,
                        confidence: match.confidence,
                        message: rule.message || `Rule "${rule.name}" triggered`,
                        suggestions: this.generateSuggestions(rule, match.match || '')
                    });
                }
            }
            return { violations };
        }
        catch (error) {
            this.logger.error('Error validating text', error);
            return { violations: [] };
        }
    }
    // Validate and revise outgoing HTML/content with CursorRules before rendering
    async applyCursorRulesToHtml(html) {
        const engine = new CursorrulesEngine(this.context, this.logger);
        const enabledRules = engine.getEnabledRules();
        let revisedHtml = html;
        let appliedChanges = false;
        const changeLog = [];
        for (const rule of enabledRules) {
            const regex = new RegExp(rule.pattern, 'gi');
            if (regex.test(revisedHtml)) {
                appliedChanges = true;
                switch (rule.name) {
                    case 'No Repetitive Confirmation or Stalling':
                        revisedHtml = revisedHtml.replace(regex, '');
                        changeLog.push('Removed repetitive confirmation/stalling language');
                        break;
                    case 'Version Consistency Check':
                        // Don't remove version info, just flag for review
                        changeLog.push('Version information detected - ensure consistency across files');
                        break;
                    case 'Implementation Verification':
                        // Flag potentially unverified implementation claims
                        changeLog.push('Implementation claims detected - verify actual implementation');
                        break;
                    case 'Task Completion Claim':
                        // Flag completion claims that may need verification
                        changeLog.push('Task completion claims detected - verify actual completion');
                        break;
                    case 'Audit Results Claim':
                        // Flag audit claims that may need evidence
                        changeLog.push('Audit result claims detected - ensure evidence is available');
                        break;
                    case 'Compilation Status Claim':
                        // Flag compilation claims that may need verification
                        changeLog.push('Compilation status claims detected - verify actual compilation');
                        break;
                    case 'Test Results Claim':
                        // Flag test result claims that may need verification
                        changeLog.push('Test result claims detected - verify actual test execution');
                        break;
                    case 'Hallucination Admission':
                        // Don't remove - this is good transparency
                        changeLog.push('Transparency detected - good practice acknowledged');
                        break;
                    case 'Vague Offer Detection':
                        // Flag vague offers for more specific action
                        revisedHtml = revisedHtml.replace(regex, (match) => {
                            return match.replace(/I\s+can\s+(help|assist|guide)/gi, 'I will provide specific guidance on');
                        });
                        changeLog.push('Vague offers made more specific');
                        break;
                    case 'Absolute Statement Detection':
                        // Flag absolute statements for review
                        changeLog.push('Absolute statements detected - consider adding qualifiers');
                        break;
                    case 'Performance Claim Detection':
                        // Flag performance claims that may need evidence
                        changeLog.push('Performance claims detected - ensure metrics are available');
                        break;
                    case 'Auto Version Management':
                        // Flag version management for automation
                        changeLog.push('Version management detected - consider automated versioning');
                        break;
                    case 'AI Task Execution':
                        // Flag AI execution claims for verification
                        changeLog.push('AI task execution claims detected - verify actual execution');
                        break;
                    case 'GitHub Workflow Management':
                        // Flag workflow management for automation
                        changeLog.push('GitHub workflow detected - consider automated workflows');
                        break;
                    case 'Product Discovery Protocol':
                        // Flag planning for structured approach
                        changeLog.push('Product planning detected - consider structured discovery process');
                        break;
                    case 'Beginner Guidance':
                        // Don't remove - this is helpful
                        changeLog.push('Beginner guidance detected - good practice acknowledged');
                        break;
                    case 'Error Recovery Assistance':
                        // Flag error handling for comprehensive approach
                        changeLog.push('Error handling detected - ensure comprehensive error recovery');
                        break;
                    case 'Best Practice Suggestions':
                        // Don't remove - this is helpful
                        changeLog.push('Best practice suggestions detected - good practice acknowledged');
                        break;
                    case 'Dependency Management':
                        // Flag dependency management for security review
                        changeLog.push('Dependency management detected - ensure security review');
                        break;
                    case 'Testing Guidance':
                        // Flag testing for comprehensive coverage
                        changeLog.push('Testing guidance detected - ensure comprehensive test coverage');
                        break;
                    case 'Documentation Assistance':
                        // Don't remove - this is helpful
                        changeLog.push('Documentation assistance detected - good practice acknowledged');
                        break;
                    default:
                        // Generic handling for other rules
                        changeLog.push(`Rule "${rule.name}" triggered - review for accuracy`);
                        break;
                }
            }
        }
        // Add passive feedback if changes were applied
        if (appliedChanges && changeLog.length > 0) {
            const feedbackHtml = `
                <!-- FailSafe Passive Validation Applied -->
                <!-- Changes made: ${changeLog.join(', ')} -->
                <!-- This content was automatically reviewed for common issues -->
            `;
            revisedHtml += feedbackHtml;
        }
        return revisedHtml;
    }
    // Alert management methods
    getPendingAlerts() {
        return this.alertManager.getPendingAlerts();
    }
    clearPendingAlert(ruleId) {
        this.alertManager.clearPendingAlert(ruleId);
    }
    clearSuppression(ruleId) {
        this.alertManager.clearSuppression(ruleId);
    }
    triggerManualAlert(ruleId) {
        const rule = this.getRule(ruleId);
        if (rule) {
            const message = rule.response || `Manual trigger for rule "${rule.name}"`;
            this.alertManager.scheduleAlert(rule, message);
        }
    }
}
exports.CursorrulesEngine = CursorrulesEngine;
//# sourceMappingURL=cursorrulesEngine.js.map