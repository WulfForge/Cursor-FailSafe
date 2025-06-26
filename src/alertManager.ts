import * as vscode from 'vscode';
import { Logger } from './logger';
import { CursorRule } from './cursorrulesEngine';

// Alert Manager for handling delayed, batched, and throttled alerts
export class AlertManager {
    private readonly pendingAlerts: Map<string, {
        ruleId: string;
        message: string;
        timestamp: number;
        count: number;
    }> = new Map();
    
    private readonly suppressedRules: Map<string, {
        until: number;
        triggerCount: number;
    }> = new Map();
    
    private readonly lastAlertTimes: Map<string, number> = new Map();
    
    constructor(private readonly logger: Logger) {}
    
    public shouldShowAlert(rule: CursorRule): boolean {
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
    
    public scheduleAlert(rule: CursorRule, message: string): void {
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
    
    private addToBatch(rule: CursorRule, message: string): void {
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
        } else {
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
    
    private showAlertImmediate(rule: CursorRule, message: string): void {
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
    
    public getPendingAlerts(): Array<{ruleId: string; message: string; count: number}> {
        return Array.from(this.pendingAlerts.values());
    }
    
    public clearPendingAlert(ruleId: string): void {
        this.pendingAlerts.delete(ruleId);
    }
    
    public clearSuppression(ruleId: string): void {
        this.suppressedRules.delete(ruleId);
    }
} 