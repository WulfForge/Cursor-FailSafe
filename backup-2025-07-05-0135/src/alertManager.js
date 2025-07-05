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
exports.AlertManager = void 0;
const vscode = __importStar(require("vscode"));
// Alert Manager for handling delayed, batched, and throttled alerts
class AlertManager {
    constructor(logger) {
        this.logger = logger;
        this.pendingAlerts = new Map();
        this.suppressedRules = new Map();
        this.lastAlertTimes = new Map();
    }
    shouldShowAlert(rule) {
        const ruleId = rule.id;
        const now = Date.now();
        // Check if rule is suppressed
        const suppressed = this.suppressedRules.get(ruleId);
        if (suppressed && now < suppressed.until) {
            return false;
        }
        // Check throttle
        if (rule.alerting?.alertFrequency === 'throttled' && rule.alerting.throttleMinutes) {
            const lastTime = this.lastAlertTimes.get(ruleId) || 0;
            const throttleMs = rule.alerting.throttleMinutes * 60 * 1000;
            if (now - lastTime < throttleMs) {
                return false;
            }
        }
        // Check "once" frequency
        if (rule.alerting?.alertFrequency === 'once') {
            if (this.lastAlertTimes.has(ruleId)) {
                return false;
            }
        }
        return true;
    }
    scheduleAlert(rule, message) {
        const ruleId = rule.id;
        const now = Date.now();
        if (!rule.alerting) {
            this.showAlertImmediate(rule, message);
            return;
        }
        switch (rule.alerting.whenToAlert) {
            case 'immediate':
                this.showAlertImmediate(rule, message);
                break;
            case 'delayed': {
                const delayMs = (rule.alerting.delaySeconds || 30) * 1000;
                setTimeout(() => {
                    this.showAlertImmediate(rule, message);
                }, delayMs);
                break;
            }
            case 'batch':
                this.addToBatch(rule, message);
                break;
            case 'manual':
                // Store for manual triggering
                this.pendingAlerts.set(ruleId, {
                    ruleId,
                    message,
                    timestamp: now,
                    count: 1
                });
                break;
        }
    }
    addToBatch(rule, message) {
        const ruleId = rule.id;
        const now = Date.now();
        const batchSize = rule.alerting?.batchSize || 5;
        const batchTimeout = (rule.alerting?.batchTimeout || 5) * 60 * 1000;
        const existing = this.pendingAlerts.get(ruleId);
        if (existing) {
            existing.count++;
            existing.message = `${existing.count} violations detected: ${message}`;
            // Check if batch is full
            if (existing.count >= batchSize) {
                this.showAlertImmediate(rule, existing.message);
                this.pendingAlerts.delete(ruleId);
            }
        }
        else {
            // Start new batch
            this.pendingAlerts.set(ruleId, {
                ruleId,
                message: `1 violation detected: ${message}`,
                timestamp: now,
                count: 1
            });
            // Set timeout for batch
            setTimeout(() => {
                const batch = this.pendingAlerts.get(ruleId);
                if (batch) {
                    this.showAlertImmediate(rule, batch.message);
                    this.pendingAlerts.delete(ruleId);
                }
            }, batchTimeout);
        }
    }
    showAlertImmediate(rule, message) {
        const ruleId = rule.id;
        const now = Date.now();
        // Update last alert time
        this.lastAlertTimes.set(ruleId, now);
        // Check suppression limits
        if (rule.alerting?.suppressAfterTriggers) {
            const currentCount = (rule.usageStats?.triggers || 0) + 1;
            if (currentCount >= rule.alerting.suppressAfterTriggers) {
                const suppressDuration = (rule.alerting.suppressDurationMinutes || 60) * 60 * 1000;
                this.suppressedRules.set(ruleId, {
                    until: now + suppressDuration,
                    triggerCount: currentCount
                });
                this.logger.info(`Rule ${rule.name} suppressed for ${rule.alerting.suppressDurationMinutes} minutes`);
                return;
            }
        }
        // Show alert based on method
        const alertMethod = rule.alerting?.howToAlert || 'notification';
        switch (alertMethod) {
            case 'notification':
                vscode.window.showInformationMessage(`FailSafe: ${message}`);
                break;
            case 'toast':
                vscode.window.showInformationMessage(`FailSafe: ${message}`, 'Dismiss');
                break;
            case 'statusbar':
                // Show in status bar (implementation needed)
                this.logger.info(`Status bar alert: ${message}`);
                break;
            case 'log':
                this.logger.info(`FailSafe Rule Alert: ${message}`);
                break;
            case 'dashboard':
                // Show in dashboard (implementation needed)
                this.logger.info(`Dashboard alert: ${message}`);
                break;
            case 'all':
                vscode.window.showInformationMessage(`FailSafe: ${message}`);
                this.logger.info(`FailSafe Rule Alert: ${message}`);
                break;
        }
    }
    getPendingAlerts() {
        return Array.from(this.pendingAlerts.values());
    }
    clearPendingAlert(ruleId) {
        this.pendingAlerts.delete(ruleId);
    }
    clearSuppression(ruleId) {
        this.suppressedRules.delete(ruleId);
    }
}
exports.AlertManager = AlertManager;
//# sourceMappingURL=alertManager.js.map