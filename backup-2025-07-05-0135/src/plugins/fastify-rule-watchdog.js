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
const typebox_1 = require("@sinclair/typebox");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fastifyRuleWatchdog = async (fastify, options) => {
    const { logger, rulesStorePath = '.failsafe/rules.json', historyPath = '.failsafe/rule-history.json' } = options;
    // Ensure directories exist
    const rulesDir = path.dirname(path.join(process.cwd(), rulesStorePath));
    const historyDir = path.dirname(path.join(process.cwd(), historyPath));
    if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
    }
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    // Decorate fastify with rule watchdog functionality
    fastify.decorate('ruleWatchdog', {
        async checkRuleChanges() {
            try {
                const currentRules = await loadCurrentRules();
                const previousRules = await loadPreviousRules();
                const violations = [];
                // Check for disabled rules
                for (const [ruleId, currentRule] of Object.entries(currentRules)) {
                    const previousRule = previousRules[ruleId];
                    if (previousRule && previousRule.enabled && !currentRule.enabled) {
                        violations.push({
                            ruleId,
                            ruleName: currentRule.name,
                            action: 'disabled',
                            severity: currentRule.severity,
                            timestamp: new Date().toISOString(),
                            requiresApproval: currentRule.severity === 'high' || currentRule.severity === 'critical'
                        });
                        // Log the violation
                        await logRuleViolation({
                            timestamp: new Date().toISOString(),
                            ruleId,
                            action: 'disabled',
                            previousState: previousRule,
                            newState: currentRule,
                            reason: 'Rule disabled without approval'
                        });
                    }
                }
                // Check for modified rules
                for (const [ruleId, currentRule] of Object.entries(currentRules)) {
                    const previousRule = previousRules[ruleId];
                    if (previousRule && JSON.stringify(previousRule) !== JSON.stringify(currentRule)) {
                        violations.push({
                            ruleId,
                            ruleName: currentRule.name,
                            action: 'modified',
                            severity: currentRule.severity,
                            timestamp: new Date().toISOString(),
                            requiresApproval: currentRule.severity === 'high' || currentRule.severity === 'critical'
                        });
                        // Log the violation
                        await logRuleViolation({
                            timestamp: new Date().toISOString(),
                            ruleId,
                            action: 'modified',
                            previousState: previousRule,
                            newState: currentRule,
                            reason: 'Rule modified without approval'
                        });
                    }
                }
                // Emit SSE alerts for violations
                if (violations.length > 0) {
                    await emitRuleViolationAlerts(violations);
                }
                return violations;
            }
            catch (error) {
                logger.error('Rule change check failed:', error);
                return [];
            }
        },
        async approveRuleChange(ruleId, approvedBy, reason) {
            try {
                const history = await loadRuleHistory();
                const recentViolations = history.filter(h => h.ruleId === ruleId &&
                    !h.approved &&
                    new Date(h.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                );
                if (recentViolations.length === 0) {
                    return false;
                }
                // Mark violations as approved
                for (const violation of recentViolations) {
                    violation.approved = true;
                    violation.approvedBy = approvedBy;
                    violation.reason = reason;
                }
                await saveRuleHistory(history);
                // Emit approval event
                await emitRuleApprovalEvent(ruleId, approvedBy, reason);
                logger.info(`Rule change approved: ${ruleId} by ${approvedBy}`);
                return true;
            }
            catch (error) {
                logger.error('Rule approval failed:', error);
                return false;
            }
        },
        async getRuleViolations() {
            try {
                const history = await loadRuleHistory();
                const recentViolations = history.filter(h => !h.approved &&
                    new Date(h.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                );
                return recentViolations.map(v => ({
                    ruleId: v.ruleId,
                    ruleName: v.newState?.name || v.previousState?.name || 'Unknown',
                    action: v.action === 'enabled' ? 'modified' : v.action,
                    severity: v.newState?.severity || v.previousState?.severity || 'medium',
                    timestamp: v.timestamp,
                    requiresApproval: (v.newState?.severity === 'high' || v.newState?.severity === 'critical' ||
                        v.previousState?.severity === 'high' || v.previousState?.severity === 'critical')
                }));
            }
            catch (error) {
                logger.error('Failed to get rule violations:', error);
                return [];
            }
        },
        async saveCurrentRules(rules) {
            try {
                const rulesPath = path.join(process.cwd(), rulesStorePath);
                const rulesData = {
                    rules,
                    lastUpdated: new Date().toISOString(),
                    version: '1.0'
                };
                fs.writeFileSync(rulesPath, JSON.stringify(rulesData, null, 2));
                // Check for violations after saving
                await fastify.ruleWatchdog.checkRuleChanges();
            }
            catch (error) {
                logger.error('Failed to save current rules:', error);
                throw error;
            }
        }
    });
    // Register routes
    fastify.get('/rule-watchdog/violations', {
        schema: {
            response: {
                200: typebox_1.Type.Array(typebox_1.Type.Object({
                    ruleId: typebox_1.Type.String(),
                    ruleName: typebox_1.Type.String(),
                    action: typebox_1.Type.String(),
                    severity: typebox_1.Type.String(),
                    timestamp: typebox_1.Type.String(),
                    requiresApproval: typebox_1.Type.Boolean()
                }))
            }
        }
    }, async (request, reply) => {
        try {
            const violations = await fastify.ruleWatchdog.getRuleViolations();
            return violations;
        }
        catch (error) {
            logger.error('Failed to get rule violations:', error);
            reply.status(500).send({ error: 'Failed to get rule violations' });
        }
    });
    fastify.post('/rule-watchdog/approve', {
        schema: {
            body: typebox_1.Type.Object({
                ruleId: typebox_1.Type.String(),
                approvedBy: typebox_1.Type.String(),
                reason: typebox_1.Type.Optional(typebox_1.Type.String())
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { ruleId, approvedBy, reason } = request.body;
            const success = await fastify.ruleWatchdog.approveRuleChange(ruleId, approvedBy, reason);
            return {
                success,
                message: success ? 'Rule change approved' : 'No pending violations found for this rule'
            };
        }
        catch (error) {
            logger.error('Rule approval failed:', error);
            reply.status(500).send({ error: 'Rule approval failed' });
        }
    });
    fastify.post('/rule-watchdog/check', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    violations: typebox_1.Type.Array(typebox_1.Type.Object({
                        ruleId: typebox_1.Type.String(),
                        ruleName: typebox_1.Type.String(),
                        action: typebox_1.Type.String(),
                        severity: typebox_1.Type.String(),
                        timestamp: typebox_1.Type.String(),
                        requiresApproval: typebox_1.Type.Boolean()
                    })),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const violations = await fastify.ruleWatchdog.checkRuleChanges();
            return {
                violations,
                message: violations.length > 0 ?
                    `Found ${violations.length} rule violations` :
                    'No rule violations detected'
            };
        }
        catch (error) {
            logger.error('Rule check failed:', error);
            reply.status(500).send({ error: 'Rule check failed' });
        }
    });
    // Helper functions
    async function loadCurrentRules() {
        const rulesPath = path.join(process.cwd(), rulesStorePath);
        if (!fs.existsSync(rulesPath)) {
            return {};
        }
        try {
            const content = fs.readFileSync(rulesPath, 'utf-8');
            const data = JSON.parse(content);
            return data.rules || {};
        }
        catch (error) {
            logger.error('Failed to load current rules:', error);
            return {};
        }
    }
    async function loadPreviousRules() {
        const history = await loadRuleHistory();
        const previousRules = {};
        // Get the most recent state for each rule before any unapproved changes
        for (const entry of history) {
            if (!previousRules[entry.ruleId] && entry.previousState) {
                previousRules[entry.ruleId] = entry.previousState;
            }
        }
        return previousRules;
    }
    async function loadRuleHistory() {
        const historyFile = path.join(process.cwd(), historyPath);
        if (!fs.existsSync(historyFile)) {
            return [];
        }
        try {
            const content = fs.readFileSync(historyFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            logger.error('Failed to load rule history:', error);
            return [];
        }
    }
    async function saveRuleHistory(history) {
        const historyFile = path.join(process.cwd(), historyPath);
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    }
    async function logRuleViolation(violation) {
        const history = await loadRuleHistory();
        history.push(violation);
        await saveRuleHistory(history);
    }
    async function emitRuleViolationAlerts(violations) {
        try {
            // Emit SSE events for each violation
            for (const violation of violations) {
                const eventData = {
                    type: 'rule-violation',
                    data: violation,
                    timestamp: new Date().toISOString()
                };
                // Use the event bus if available
                if (fastify.eventBus) {
                    fastify.eventBus.emit('rule-violation', eventData);
                }
                // Log the violation
                logger.warn(`Rule violation detected: ${violation.ruleId} (${violation.action})`);
            }
        }
        catch (error) {
            logger.error('Failed to emit rule violation alerts:', error);
        }
    }
    async function emitRuleApprovalEvent(ruleId, approvedBy, reason) {
        try {
            const eventData = {
                type: 'rule-approval',
                data: {
                    ruleId,
                    approvedBy,
                    reason,
                    timestamp: new Date().toISOString()
                }
            };
            // Use the event bus if available
            if (fastify.eventBus) {
                fastify.eventBus.emit('rule-approval', eventData);
            }
            logger.info(`Rule approval event emitted: ${ruleId} approved by ${approvedBy}`);
        }
        catch (error) {
            logger.error('Failed to emit rule approval event:', error);
        }
    }
};
exports.default = fastifyRuleWatchdog;
//# sourceMappingURL=fastify-rule-watchdog.js.map