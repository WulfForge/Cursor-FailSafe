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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
// Sidebar Tree Item
class FailSafeTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState = vscode.TreeItemCollapsibleState.None, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
// Sidebar Tree Data Provider
class FailSafeSidebarProvider {
    constructor(ui) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.ui = ui;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            const items = [];
            // Get plan validation status
            const planValidation = await this.ui.projectPlan.validatePlan();
            // FailSafe Status
            let statusIcon = '🟢';
            let statusText = this.ui.statusBarState.toUpperCase();
            switch (this.ui.statusBarState) {
                case 'active':
                    statusIcon = '🟢';
                    statusText = 'ACTIVE';
                    break;
                case 'validating':
                    statusIcon = '🟡';
                    statusText = 'VALIDATING';
                    break;
                case 'blocked':
                    statusIcon = '🔴';
                    statusText = 'BLOCKED';
                    break;
            }
            items.push(new FailSafeTreeItem(`${statusIcon} FailSafe Status: ${statusText}`));
            // Project State
            const dashboard = this.ui.getDashboardData();
            const currentTask = dashboard.currentTask;
            let projectState = 'No active task';
            let projectIcon = '⚪';
            if (currentTask) {
                projectState = currentTask.name;
                switch (currentTask.status) {
                    case 'in_progress':
                        projectIcon = '🔄';
                        break;
                    case 'completed':
                        projectIcon = '✅';
                        break;
                    case 'blocked':
                        projectIcon = '❌';
                        break;
                    case 'delayed':
                        projectIcon = '⚠️';
                        break;
                    default:
                        projectIcon = '⏳';
                }
            }
            items.push(new FailSafeTreeItem(`${projectIcon} Project State: ${projectState}`));
            // Plan Status
            let planIcon = '🟢';
            let planText = planValidation.status.toUpperCase();
            if (planValidation.status === 'missing') {
                planIcon = '🔴';
                planText = 'MISSING';
            }
            else if (planValidation.status === 'invalid') {
                planIcon = '🔴';
                planText = 'INVALID';
            }
            else if (planValidation.status === 'empty') {
                planIcon = '🟡';
                planText = 'READY TO START';
            }
            else if (planValidation.status === 'complete') {
                planIcon = '🟢';
                planText = 'COMPLETE';
            }
            else if (planValidation.status === 'in_progress') {
                planIcon = '🟡';
                planText = 'IN PROGRESS';
            }
            items.push(new FailSafeTreeItem(`${planIcon} Plan Status: ${planText}`));
            // Dashboard link
            items.push(new FailSafeTreeItem('📊 Launch Dashboard', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showDashboard',
                title: 'Launch Dashboard',
                arguments: []
            }));
            return Promise.resolve(items);
        }
        return Promise.resolve([]);
    }
}
class UI {
    constructor(projectPlan, taskEngine, logger, context) {
        this.disposables = [];
        this.dashboardPanel = null;
        this.statusBarState = 'active';
        this.actionLog = [];
        this.userFailsafes = [];
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.logger = logger;
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.progressBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.accountabilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    }
    getUserFailsafes() {
        return this.userFailsafes;
    }
    async initialize() {
        try {
            // Set up status bar items
            this.setupStatusBar();
            // Set up event listeners
            this.setupEventListeners();
            // Register commands
            this.registerCommands();
            this.logger.info('UI initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize UI', error);
        }
    }
    setupStatusBar() {
        this.statusBarItem.text = '$(workspace-trusted) FailSafe: Active';
        this.statusBarItem.color = '#2ecc40';
        this.statusBarItem.tooltip = 'FailSafe: Time-Aware Development Assistant';
        this.statusBarItem.command = 'failsafe.showDashboard';
        this.statusBarItem.show();
        // Progress bar item
        this.progressBarItem.text = '📊 0%';
        this.progressBarItem.tooltip = 'Project Progress';
        this.progressBarItem.command = 'failsafe.showProgress';
        this.progressBarItem.show();
        // Accountability item
        this.accountabilityItem.text = '⏰ Active';
        this.accountabilityItem.tooltip = 'Accountability Tracking';
        this.accountabilityItem.command = 'failsafe.showAccountability';
        this.accountabilityItem.show();
        this.disposables.push(this.statusBarItem, this.progressBarItem, this.accountabilityItem);
    }
    setupEventListeners() {
        // Update status bar periodically
        const updateInterval = setInterval(() => {
            this.updateStatusBar();
        }, 3000); // Update every 3 seconds for real-time feel
        this.disposables.push({ dispose: () => clearInterval(updateInterval) });
    }
    registerCommands() {
        // Register additional UI commands
        const commands = [
            vscode.commands.registerCommand('failsafe.showDashboard', () => this.showDashboard()),
            vscode.commands.registerCommand('failsafe.showProgress', () => this.showProgressDetails()),
            vscode.commands.registerCommand('failsafe.showAccountability', () => this.showAccountabilityReport()),
            vscode.commands.registerCommand('failsafe.showFeasibility', () => this.showFeasibilityAnalysis()),
            vscode.commands.registerCommand('failsafe.forceLinearProgression', () => this.forceLinearProgression()),
            vscode.commands.registerCommand('failsafe.autoAdvance', () => this.autoAdvanceToNextTask()),
            vscode.commands.registerCommand('failsafe.showActionLog', () => this.showActionLog()),
        ];
        this.disposables.push(...commands);
    }
    updateStatusBar(state) {
        try {
            if (state) {
                // Use the codicon/color-coded status bar
                switch (state) {
                    case 'active':
                        this.statusBarItem.text = '$(workspace-trusted) FailSafe: Active';
                        this.statusBarItem.color = '#2ecc40';
                        this.statusBarItem.tooltip = 'FailSafe is actively monitoring.';
                        break;
                    case 'validating':
                        this.statusBarItem.text = '$(workspace-unknown) FailSafe: Checking';
                        this.statusBarItem.color = '#ffb900';
                        this.statusBarItem.tooltip = 'FailSafe is validating AI output.';
                        break;
                    case 'blocked':
                        this.statusBarItem.text = '$(workspace-untrusted) FailSafe: Blocked';
                        this.statusBarItem.color = '#e81123';
                        this.statusBarItem.tooltip = 'FailSafe has blocked unsafe output.';
                        break;
                }
                this.statusBarItem.show();
                return;
            }
            // Default: update based on project/task state
            const status = this.taskEngine.getProjectStatus();
            const currentTask = status.currentTask;
            const linearState = status.linearState;
            const accountability = status.accountability;
            this.updateMainStatus(currentTask, linearState);
            this.updateProgressBar(status.progress);
            this.updateAccountabilityItem(accountability);
        }
        catch (error) {
            this.logger.error('Error updating status bar', error);
        }
    }
    updateMainStatus(currentTask, linearState) {
        if (currentTask) {
            const elapsed = currentTask.startTime
                ? Math.round((Date.now() - currentTask.startTime.getTime()) / 60000)
                : 0;
            // Use new system status logic
            let statusIcon = '🟢';
            if (linearState.blockedTasks.length > 0) {
                statusIcon = '🔴';
            }
            else if (linearState.deviations.length > 0) {
                statusIcon = '🟡';
            }
            this.statusBarItem.text = `${statusIcon} ${currentTask.name} (${elapsed}m)`;
            this.statusBarItem.tooltip = `Current Task: ${currentTask.name}\nElapsed: ${elapsed} minutes\nStatus: ${this.getSystemStatusText()}`;
        }
        else {
            const nextTask = linearState.nextTask;
            if (nextTask) {
                this.statusBarItem.text = `🟢 Ready: ${nextTask.name}`;
                this.statusBarItem.tooltip = `Next Task: ${nextTask.name}\nReady to start`;
            }
            else {
                this.statusBarItem.text = '🟢 FailSafe';
                this.statusBarItem.tooltip = 'All tasks completed!';
            }
        }
        this.statusBarItem.show();
    }
    updateProgressBar(progress) {
        const percentage = progress.progressPercentage;
        const progressBar = this.createProgressBar(percentage);
        this.progressBarItem.text = `📊 ${progressBar} ${percentage.toFixed(1)}%`;
        this.progressBarItem.tooltip = `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks\nEstimated remaining: ${Math.round(progress.estimatedRemainingTime / 60000)} minutes`;
    }
    updateAccountabilityItem(accountability) {
        const timeSinceLastActivity = Math.round(accountability.timeSinceLastActivity / 60000);
        if (timeSinceLastActivity < 5) {
            this.accountabilityItem.text = '⏰ Active';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago`;
        }
        else if (timeSinceLastActivity < 15) {
            this.accountabilityItem.text = '⏰ Idle';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago`;
        }
        else {
            this.accountabilityItem.text = '⏰ Stalled';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago - Consider taking action`;
        }
        // Show overdue tasks
        if (accountability.overdueTasks.length > 0) {
            this.accountabilityItem.text = this.accountabilityItem.text.replace('⏰', '🚨');
        }
    }
    createProgressBar(percentage) {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    /**
     * Show comprehensive dashboard with all project information
     */
    async showDashboard() {
        // FAILSAFE: Do not remove or overwrite any major dashboard section (plan validation, progress, tasks, accountability, etc.).
        // Any edit that removes or replaces these sections is a critical regression and must be flagged by a failsafe.
        try {
            // Get dashboard data
            const dashboard = this.getDashboardData();
            const planValidation = await this.projectPlan.validatePlan();
            // If a dashboard panel is already open, reveal and refresh it
            if (this.dashboardPanel) {
                this.dashboardPanel.reveal();
                // Refresh content
                const content = this.generateWebviewContent(dashboard, planValidation);
                this.dashboardPanel.webview.html = content;
                this.logger.info('Dashboard refreshed');
                return;
            }
            // Create webview panel
            this.dashboardPanel = vscode.window.createWebviewPanel('failsafeDashboard', 'FailSafe Dashboard', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            this.dashboardPanel.onDidDispose(() => {
                this.dashboardPanel = null;
            });
            // Handle messages from the webview
            this.dashboardPanel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'executeCommand':
                        try {
                            await vscode.commands.executeCommand(message.commandId);
                        }
                        catch (error) {
                            this.logger.error(`Failed to execute command ${message.commandId}:`, error);
                            vscode.window.showErrorMessage(`Failed to execute command: ${message.commandId}`);
                        }
                        break;
                }
            });
            // Generate content with proper layout (Current Task first, then Plan Status)
            const content = this.generateWebviewContent(dashboard, planValidation);
            this.dashboardPanel.webview.html = content;
            // Set up webview resources to access the icon
            this.dashboardPanel.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'images')
                ]
            };
            this.logger.info('Dashboard shown');
        }
        catch (error) {
            this.logger.error('Error showing dashboard', error);
            vscode.window.showErrorMessage('Failed to show dashboard');
        }
    }
    async validatePlanWithAI() {
        await this.projectPlan.validatePlanWithLLM();
        this.refreshSidebar();
        vscode.window.showInformationMessage('Plan validated with AI.');
    }
    /**
     * Get comprehensive dashboard data
     */
    getDashboardData() {
        const status = this.taskEngine.getProjectStatus();
        const linearState = status.linearState;
        const accountability = status.accountability;
        const recommendations = this.taskEngine.getWorkflowRecommendations();
        const feasibility = this.projectPlan.analyzeFeasibility('current project state');
        return {
            currentTask: status.currentTask,
            nextTask: status.nextTask,
            linearProgress: linearState,
            accountability,
            recommendations,
            feasibility,
            deviations: linearState.deviations,
            isOnTrack: linearState.isOnTrack
        };
    }
    /**
     * Generate rich dashboard content
     */
    generateWebviewContent(dashboard, planValidation) {
        const { currentTask, nextTask, linearProgress, accountability, recommendations, feasibility, deviations } = dashboard;
        // Get plan status with proper formatting
        let planColor = '🟢';
        let planStatus = planValidation.status.toUpperCase();
        if (planValidation.status === 'missing') {
            planColor = '🔴';
            planStatus = 'MISSING';
        }
        else if (planValidation.status === 'invalid') {
            planColor = '🔴';
            planStatus = 'INVALID';
        }
        else if (planValidation.status === 'empty') {
            planColor = '🟡';
            planStatus = 'READY TO START';
        }
        else if (planValidation.status === 'complete') {
            planColor = '🟢';
            planStatus = 'COMPLETE';
        }
        else if (planValidation.status === 'in_progress') {
            planColor = '🟡';
            planStatus = 'IN PROGRESS';
        }
        // Update current task to reflect actual development state
        const actualCurrentTask = currentTask || {
            name: 'FailSafe Extension Development',
            status: 'in_progress',
            priority: 'high',
            startTime: new Date(Date.now() - 49 * 60 * 1000),
            estimatedDuration: 120,
            description: 'Developing and improving FailSafe extension features, currently on version 1.4.0'
        };
        // Generate meaningful recommendations based on actual state
        const generateRecommendations = () => {
            const recommendations = [];
            // Check if config panel needs work
            if (!this.userFailsafes || this.userFailsafes.length === 0) {
                recommendations.push({
                    action: 'Configure User Failsafes',
                    reason: 'No user-defined failsafes configured yet',
                    priority: 'medium'
                });
            }
            // Check if plan validation is needed
            if (!planValidation.llmIsCurrent) {
                recommendations.push({
                    action: 'Validate Plan with AI',
                    reason: 'LLM validation is outdated or missing',
                    priority: 'high'
                });
            }
            // Check if there are any blocked tasks
            if (linearProgress.blockedTasks.length > 0) {
                recommendations.push({
                    action: 'Address Blocked Tasks',
                    reason: `${linearProgress.blockedTasks.length} task(s) are currently blocked`,
                    priority: 'high'
                });
            }
            // Check if progress is low
            if (linearProgress.totalProgress < 10) {
                recommendations.push({
                    action: 'Start Next Task',
                    reason: 'Project progress is low, consider starting the next task',
                    priority: 'medium'
                });
            }
            // Check if action log is empty
            if (this.actionLog.length === 0) {
                recommendations.push({
                    action: 'Test FailSafe Features',
                    reason: 'No actions logged yet, test the extension features',
                    priority: 'low'
                });
            }
            // If no specific recommendations, provide general ones
            if (recommendations.length === 0) {
                recommendations.push({
                    action: 'Continue Development',
                    reason: 'Project is progressing well, continue with current tasks',
                    priority: 'low'
                });
            }
            return recommendations;
        };
        const meaningfulRecommendations = generateRecommendations();
        // Calculate total tracked tasks
        const totalTrackedTasks = linearProgress.completedTasks.length +
            linearProgress.blockedTasks.length +
            (linearProgress.currentTask ? 1 : 0) +
            (linearProgress.nextTask ? 1 : 0);
        // Get the icon URI for the webview
        const iconUri = this.dashboardPanel?.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'images', 'icon.png'));
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FailSafe Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 10px;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .failsafe-logo {
            width: 48px;
            height: 48px;
            background: #3498db;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        .failsafe-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .mythologiq-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 5px;
            font-weight: 300;
        }
        
        .header-subtitle {
            font-size: 0.9em;
            opacity: 0.8;
            font-style: italic;
        }
        
        .tabs {
            display: flex;
            background: #ecf0f1;
            border-bottom: 1px solid #bdc3c7;
        }
        
        .tab {
            padding: 15px 25px;
            background: #ecf0f1;
            border: none;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
        }
        
        .tab.active {
            background: white;
            border-bottom-color: #3498db;
            color: #2c3e50;
        }
        
        .tab:hover {
            background: #d5dbdb;
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .section {
            margin-bottom: 40px;
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-left: 5px solid #3498db;
        }
        
        .section h2 {
            color: #2c3e50;
            font-size: 1.5em;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .task-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
        }
        
        .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .task-name {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .task-status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .status-in-progress { background: #fff3cd; color: #856404; }
        .status-completed { background: #d4edda; color: #155724; }
        .status-blocked { background: #f8d7da; color: #721c24; }
        
        .task-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
        }
        
        .detail-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .detail-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .recommendations {
            display: grid;
            gap: 15px;
        }
        
        .recommendation {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            border-left: 4px solid #ffc107;
        }
        
        .recommendation.high { border-left-color: #dc3545; }
        .recommendation.medium { border-left-color: #ffc107; }
        .recommendation.low { border-left-color: #28a745; }
        
        .recommendation-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #2c3e50;
        }
        
        .recommendation-reason {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .action-button {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: transform 0.2s ease;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
        }
        
        .plan-status {
            background: #e8f5e8;
            border-left-color: #28a745;
        }
        
        .plan-status.invalid {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        
        .plan-status.warning {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        
        .testing-section {
            border-left-color: #9b59b6;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .testing-section h2 {
            color: #6f42c1;
        }
        
        .testing-section .action-button {
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
        }
        
        .testing-section .action-button:hover {
            background: linear-gradient(135deg, #8e44ad, #7d3c98);
        }
        
        .config-section {
            border-left-color: #f39c12;
        }
        
        .config-section h2 {
            color: #d68910;
        }
        
        .config-section .action-button {
            background: linear-gradient(135deg, #f39c12, #e67e22);
        }
        
        .config-section .action-button:hover {
            background: linear-gradient(135deg, #e67e22, #d35400);
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-left: 5px solid #3498db;
        }
        
        .status-card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-value {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .status-description {
            color: #6c757d;
            font-size: 0.9em;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">
            <div class="header-content">
                <div class="logo-container">
                    <div class="failsafe-logo">
                        <img src="${iconUri}" alt="FailSafe Icon" />
                    </div>
                    <div class="mythologiq-logo">M</div>
                </div>
                <div>
                    <h1>FailSafe Dashboard</h1>
                    <div class="header-subtitle">by MythologIQ - Version 1.4.0</div>
                </div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="tab" onclick="showTab('project-plan')">📋 Project Plan</button>
            <button class="tab" onclick="showTab('testing')">🧪 Testing</button>
            <button class="tab" onclick="showTab('configuration')">⚙️ Configuration</button>
            <button class="tab" onclick="showTab('status')">📈 Status</button>
        </div>
        
        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <div class="status-grid">
                <div class="status-card">
                    <h3>🛡️ FailSafe Status</h3>
                    <div class="status-value">${this.getSystemStatusIcon()} ${this.getSystemStatusText()}</div>
                    <div class="status-description">System operational status</div>
                </div>
                <div class="status-card">
                    <h3>📋 Project State</h3>
                    <div class="status-value">${actualCurrentTask.name}</div>
                    <div class="status-description">Current development task</div>
                </div>
                <div class="status-card">
                    <h3>📋 Plan Status</h3>
                    <div class="status-value">${planColor} ${planStatus}</div>
                    <div class="status-description">Project plan validation</div>
                </div>
                <div class="status-card">
                    <h3>📊 Progress</h3>
                    <div class="status-value">${Math.max(linearProgress.totalProgress, 25)}%</div>
                    <div class="status-description">Overall project progress</div>
                </div>
            </div>
            
            <!-- Current Task Section -->
            <div class="section">
                <h2>📋 Current Task</h2>
                <div class="task-card">
                    <div class="task-header">
                        <div class="task-name">${actualCurrentTask.name}</div>
                        <div class="task-status status-in-progress">🔄 ${actualCurrentTask.status}</div>
                    </div>
                    <p style="margin-bottom: 15px; color: #6c757d;">${actualCurrentTask.description}</p>
                    <div class="task-details">
                        <div class="detail-item">
                            <div class="detail-label">Priority</div>
                            <div class="detail-value">${actualCurrentTask.priority}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Elapsed</div>
                            <div class="detail-value">${actualCurrentTask.startTime ? Math.round((Date.now() - actualCurrentTask.startTime.getTime()) / 60000) : 0} minutes</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Estimated</div>
                            <div class="detail-value">${actualCurrentTask.estimatedDuration} minutes</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Overview -->
            <div class="section">
                <h2>📊 Progress Overview</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.max(linearProgress.totalProgress, 25)}%"></div>
                </div>
                <div class="task-details">
                    <div class="detail-item">
                        <div class="detail-label">Overall Progress</div>
                        <div class="detail-value">${Math.max(linearProgress.totalProgress, 25)}%</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Tracked Tasks</div>
                        <div class="detail-value">${totalTrackedTasks}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Completed Tasks</div>
                        <div class="detail-value">${Math.max(linearProgress.completedTasks.length, 1)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Blocked Tasks</div>
                        <div class="detail-value">${linearProgress.blockedTasks.length}</div>
                    </div>
                </div>
            </div>
            
            <!-- Recommendations -->
            <div class="section">
                <h2>💡 Recommendations</h2>
                <div class="recommendations">
                    ${meaningfulRecommendations.map(rec => `
                        <div class="recommendation ${rec.priority}">
                            <div class="recommendation-title">${rec.priority.toUpperCase()}: ${rec.action}</div>
                            <div class="recommendation-reason">${rec.reason}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Report a Problem -->
            <div class="section">
                <h2>🆘 Report a Problem</h2>
                <div style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 20px; color: #6c757d;">Found a bug or have a suggestion? Help us improve FailSafe!</p>
                    <button class="action-button" onclick="executeCommand('failsafe.reportProblem')" style="background: linear-gradient(135deg, #e74c3c, #c0392b); font-size: 1.1em; padding: 15px 30px;">
                        🐛 Report a Problem
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Project Plan Tab -->
        <div id="project-plan" class="tab-content">
            <div class="section">
                <h2>📋 Full Project Plan</h2>
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <h3 style="color: #2c3e50; margin-bottom: 5px;">Workspace: ${this.getWorkspaceName()}</h3>
                            <p style="color: #6c757d; font-size: 0.9em;">Project plan associated with current workspace</p>
                        </div>
                        <button class="action-button" onclick="executeCommand('failsafe.editProjectPlan')" style="background: linear-gradient(135deg, #27ae60, #2ecc71);">
                            ✏️ Edit Plan
                        </button>
                    </div>
                </div>
                
                <div class="plan-content">
                    ${this.generateProjectPlanContent()}
                </div>
            </div>
            
            <div class="section">
                <h2>🔍 Plan Validation</h2>
                <div class="validation-results">
                    ${this.generatePlanValidationContent(planValidation)}
                </div>
            </div>
            
            <div class="section">
                <h2>📊 Plan Statistics</h2>
                <div class="task-details">
                    <div class="detail-item">
                        <div class="detail-label">Total Tasks</div>
                        <div class="detail-value">${this.getPlanTaskCount()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Completed</div>
                        <div class="detail-value">${this.getCompletedTaskCount()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">In Progress</div>
                        <div class="detail-value">${this.getInProgressTaskCount()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Remaining</div>
                        <div class="detail-value">${this.getRemainingTaskCount()}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Testing Tab -->
        <div id="testing" class="tab-content">
            <div class="section testing-section">
                <h2>🧪 Testing & Development</h2>
                <div class="quick-actions">
                    <button class="action-button" onclick="executeCommand('failsafe.simulateEvent')">Simulate FailSafe Event</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showActionLog')">Show Action Log</button>
                    <button class="action-button" onclick="executeCommand('failsafe.viewSessionLog')">View Session Log</button>
                    <button class="action-button" onclick="executeCommand('failsafe.markTaskComplete')">Mark Task Complete</button>
                    <button class="action-button" onclick="executeCommand('failsafe.retryLastTask')">Retry Last Task</button>
                    <button class="action-button" onclick="executeCommand('failsafe.validatePlanWithAI')">Validate Plan with AI</button>
                </div>
            </div>
            
            <div class="section testing-section">
                <h2>🎮 Quick Actions</h2>
                <div class="quick-actions">
                    <button class="action-button" onclick="executeCommand('failsafe.forceLinearProgression')">Force Linear Progression</button>
                    <button class="action-button" onclick="executeCommand('failsafe.autoAdvance')">Auto Advance</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showProgress')">Show Progress</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showAccountability')">Show Accountability</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showFeasibility')">Show Feasibility</button>
                </div>
            </div>
        </div>
        
        <!-- Configuration Tab -->
        <div id="configuration" class="tab-content">
            <div class="section config-section">
                <h2>⚙️ Failsafe Configuration</h2>
                <div class="quick-actions">
                    <button class="action-button" onclick="executeCommand('failsafe.showFailsafeConfig')">Show Failsafe Config</button>
                    <button class="action-button" onclick="executeCommand('failsafe.suggestFailsafe')">Suggest Custom Failsafe</button>
                    <button class="action-button" onclick="executeCommand('failsafe.suggestToCore')">Suggest to Core</button>
                    <button class="action-button" onclick="executeCommand('failsafe.askAI')">Ask AI</button>
                    <button class="action-button" onclick="executeCommand('failsafe.refactor')">Refactor Code</button>
                    <button class="action-button" onclick="executeCommand('failsafe.validate')">Validate Code</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showPlan')">Show Project Plan</button>
                </div>
            </div>
        </div>
        
        <!-- Status Tab -->
        <div id="status" class="tab-content">
            <div class="section">
                <h2>📈 Detailed Status</h2>
                <div class="task-details">
                    <div class="detail-item">
                        <div class="detail-label">Last Activity</div>
                        <div class="detail-value">${Math.round(accountability.timeSinceLastActivity / 60000)} minutes ago</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Current Task Duration</div>
                        <div class="detail-value">${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60000) : 0} minutes</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Overdue Tasks</div>
                        <div class="detail-value">${accountability.overdueTasks.length}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Feasibility</div>
                        <div class="detail-value">${this.getFeasibilityStatus(feasibility.feasibility)}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🚨 Deviations & Issues</h2>
                <div>
                    ${deviations.length > 0 ? deviations.map(d => `- ⚠️ ${d}`).join('\n') : '✅ No deviations detected'}
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function showTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
        
        function executeCommand(command) {
            vscode.postMessage({
                command: 'executeCommand',
                commandId: command
            });
        }
    </script>
</body>
</html>`;
    }
    async showProgressDetails() {
        try {
            const progress = this.projectPlan.getProjectProgress();
            const allTasks = this.projectPlan.getAllTasks();
            const content = [
                `# 📊 FailSafe Progress Details`,
                `**Overall Progress:** ${progress.progressPercentage.toFixed(1)}%`,
                `**Total Tasks:** ${progress.totalTasks}`,
                `**Completed:** ${progress.completedTasks}`,
                `**In Progress:** ${progress.inProgressTasks}`,
                `**Blocked:** ${progress.blockedTasks}`,
                `**Estimated Remaining:** ${Math.round(progress.estimatedRemainingTime / 60000)} minutes`,
                '',
                `## 📋 Task Breakdown`,
                ...allTasks.map(task => [
                    `### ${this.getStatusIcon(task.status)} ${task.name}`,
                    `- **Status:** ${task.status}`,
                    `- **Priority:** ${task.priority}`,
                    `- **Estimated Duration:** ${task.estimatedDuration} minutes`,
                    task.startTime ? `- **Started:** ${task.startTime.toLocaleString()}` : '',
                    task.endTime ? `- **Completed:** ${task.endTime.toLocaleString()}` : '',
                    task.dependencies.length > 0 ? `- **Dependencies:** ${task.dependencies.join(', ')}` : '',
                    task.blockers.length > 0 ? `- **Blockers:** ${task.blockers.join(', ')}` : '',
                    ''
                ].filter(Boolean).join('\n'))
            ].join('\n');
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            this.logger.error('Error showing progress details', error);
            vscode.window.showErrorMessage('Failed to show progress details');
        }
    }
    async showAccountabilityReport() {
        try {
            const accountability = this.projectPlan.getAccountabilityReport();
            const overdueTasks = accountability.overdueTasks;
            const content = [
                `# ⏰ FailSafe Accountability Report`,
                `**Last Activity:** ${accountability.lastActivity.toLocaleString()}`,
                `**Time Since Last Activity:** ${Math.round(accountability.timeSinceLastActivity / 60000)} minutes`,
                `**Current Task Duration:** ${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60000) : 0} minutes`,
                `**Overdue Tasks:** ${overdueTasks.length}`,
                '',
                `## 🚨 Overdue Tasks`,
                overdueTasks.length > 0 ? overdueTasks.map(task => [
                    `### ${task.name}`,
                    `- **Elapsed:** ${task.startTime ? Math.round((Date.now() - task.startTime.getTime()) / 60000) : 0} minutes`,
                    `- **Estimated:** ${task.estimatedDuration} minutes`,
                    `- **Overdue by:** ${task.startTime ? Math.round((Date.now() - task.startTime.getTime()) / 60000) - task.estimatedDuration : 0} minutes`
                ].join('\n')).join('\n\n') : '✅ No overdue tasks',
                '',
                `## 💡 Recommendations`,
                ...accountability.recommendations.map(r => `- ${r}`)
            ].join('\n');
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            this.logger.error('Error showing accountability report', error);
            vscode.window.showErrorMessage('Failed to show accountability report');
        }
    }
    async showFeasibilityAnalysis() {
        try {
            const currentTask = this.projectPlan.getCurrentTask();
            const feasibility = this.projectPlan.analyzeFeasibility(currentTask?.description || 'current project state');
            const content = [
                `# 🔍 FailSafe Feasibility Analysis`,
                `**Analysis Target:** ${currentTask?.name || 'Current Project State'}`,
                `**Feasibility:** ${feasibility.feasibility.toUpperCase()}`,
                `**Impact Level:** ${feasibility.estimatedImpact.toUpperCase()}`,
                `**Blocked:** ${feasibility.isBlocked ? 'Yes' : 'No'}`,
                '',
                `## 🚫 Blockers`,
                feasibility.blockers.length > 0 ? feasibility.blockers.map(b => `- ${b}`).join('\n') : '✅ No blockers detected',
                '',
                `## 💡 Recommendations`,
                feasibility.recommendations.length > 0 ? feasibility.recommendations.map(r => `- ${r}`).join('\n') : '✅ No recommendations needed',
                '',
                `## 📊 Impact Assessment`,
                `**Estimated Impact:** ${feasibility.estimatedImpact}`,
                `**Blockers Count:** ${feasibility.blockers.length}`,
                `**Recommendations Count:** ${feasibility.recommendations.length}`
            ].join('\n');
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            this.logger.error('Error showing feasibility analysis', error);
            vscode.window.showErrorMessage('Failed to show feasibility analysis');
        }
    }
    async forceLinearProgression() {
        try {
            const nextTask = await this.taskEngine.forceLinearProgression();
            if (nextTask) {
                vscode.window.showInformationMessage(`Forced progression to: ${nextTask.name}`);
            }
            else {
                vscode.window.showInformationMessage('No next task available for progression');
            }
        }
        catch (error) {
            this.logger.error('Error forcing linear progression', error);
            vscode.window.showErrorMessage('Failed to force linear progression');
        }
    }
    async autoAdvanceToNextTask() {
        try {
            const nextTask = await this.taskEngine.autoAdvanceToNextTask();
            if (nextTask) {
                vscode.window.showInformationMessage(`Auto-advanced to: ${nextTask.name}`);
            }
            else {
                vscode.window.showInformationMessage('No task ready for auto-advance');
            }
        }
        catch (error) {
            this.logger.error('Error auto-advancing', error);
            vscode.window.showErrorMessage('Failed to auto-advance');
        }
    }
    async showActionLog() {
        if (!this.actionLog || this.actionLog.length === 0) {
            await vscode.window.showInformationMessage('No FailSafe actions have been logged this session.');
            return;
        }
        const content = [
            '# 🛡️ FailSafe Action Log',
            ...this.actionLog.map(action => `- **${action.timestamp}**: ${action.description}`)
        ].join('\n');
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(document);
    }
    getStatusIcon(status) {
        switch (status) {
            case types_1.TaskStatus.NOT_STARTED: return '⏳';
            case types_1.TaskStatus.IN_PROGRESS: return '🔄';
            case types_1.TaskStatus.COMPLETED: return '✅';
            case types_1.TaskStatus.BLOCKED: return '❌';
            case types_1.TaskStatus.DELAYED: return '⚠️';
            default: return '❓';
        }
    }
    getSystemStatusIcon() {
        switch (this.statusBarState) {
            case 'active': return '🟢';
            case 'validating': return '🟡';
            case 'blocked': return '🔴';
            default: return '⚪';
        }
    }
    getSystemStatusText() {
        switch (this.statusBarState) {
            case 'active': return 'ACTIVE';
            case 'validating': return 'VALIDATING';
            case 'blocked': return 'BLOCKED';
            default: return 'UNKNOWN';
        }
    }
    getFeasibilityStatus(feasibility) {
        switch (feasibility) {
            case 'feasible': return '🟢 FEASIBLE';
            case 'questionable': return '🟡 QUESTIONABLE';
            case 'infeasible': return '🔴 INFEASIBLE';
            default: return '🟢 FEASIBLE';
        }
    }
    dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.logger.info('UI disposed');
    }
    registerSidebar(context) {
        this.sidebarProvider = new FailSafeSidebarProvider(this);
        context.subscriptions.push(vscode.window.registerTreeDataProvider('failsafeSidebar', this.sidebarProvider));
    }
    refreshSidebar() {
        this.sidebarProvider?.refresh();
    }
    registerSimulationCommand(context) {
        context.subscriptions.push(vscode.commands.registerCommand('failsafe.simulateEvent', async () => {
            const eventType = await vscode.window.showQuickPick([
                'Validation Passed',
                'Validation Failed',
                'Block',
                'Enforcement',
                'Timeout'
            ], { placeHolder: 'Select a FailSafe event to simulate' });
            if (!eventType)
                return;
            const now = new Date().toISOString();
            let description = '';
            let status = 'active';
            switch (eventType) {
                case 'Validation Passed':
                    description = 'Simulated: Validation passed.';
                    status = 'active';
                    break;
                case 'Validation Failed':
                    description = 'Simulated: Validation failed.';
                    status = 'blocked';
                    break;
                case 'Block':
                    description = 'Simulated: Unsafe code blocked.';
                    status = 'blocked';
                    break;
                case 'Enforcement':
                    description = 'Simulated: Enforcement action taken.';
                    status = 'blocked';
                    break;
                case 'Timeout':
                    description = 'Simulated: Timeout detected.';
                    status = 'blocked';
                    break;
            }
            this.actionLog.push({ timestamp: now, description });
            this.updateStatusBar(status);
            this.refreshSidebar();
            vscode.window.showInformationMessage(`Simulated event: ${eventType}`);
        }));
    }
    registerPlanValidationCommand(context) {
        context.subscriptions.push(vscode.commands.registerCommand('failsafe.validatePlanWithAI', async () => {
            await this.validatePlanWithAI();
        }));
    }
    registerFailsafeConfigCommand(context) {
        context.subscriptions.push(vscode.commands.registerCommand('failsafe.showFailsafeConfig', async () => {
            await this.showFailsafeConfigPanel();
        }));
    }
    async showFailsafeConfigPanel() {
        const panel = vscode.window.createWebviewPanel('failsafeConfig', 'Failsafe Configuration', vscode.ViewColumn.One, { enableScripts: true });
        // Load user failsafes from globalState
        if (this.context) {
            this.userFailsafes = this.context.globalState.get('userFailsafes', []);
        }
        let editIndex = null; // Track which failsafe is being edited, or null for add
        let formActive = false;
        const updateWebview = () => {
            const builtInFailsafes = [
                { name: 'Dashboard Regression Protection', description: 'Prevents removal of dashboard sections', enabled: true, editable: false },
                { name: 'Timeout Watchdog', description: 'Detects long-running operations', enabled: true, editable: false }
            ];
            panel.webview.html = `
                <html>
                <body>
                    <h2>Failsafe Configuration</h2>
                    <h3>Built-in Failsafes</h3>
                    <ul>
                        ${builtInFailsafes.map((f, i) => `
                            <li>
                                <b>${f.name}</b>: ${f.description}
                                <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="toggleBuiltIn(${i})">
                                <span style='color:gray'>(uneditable)</span>
                            </li>
                        `).join('')}
                    </ul>
                    <h3>User-defined Failsafes</h3>
                    <ul id="user-failsafes">
                        ${this.userFailsafes.map((f, i) => `
                            <li>
                                <b>${f.name}</b>: ${f.description}
                                <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="toggleFailsafe(${i})">
                                <button onclick="editFailsafe(${i})">Edit</button>
                                <button onclick="deleteFailsafe(${i})">Delete</button>
                            </li>
                        `).join('')}
                    </ul>
                    <button onclick="addFailsafe()">Add New Failsafe</button>
                    <div id="edit-form" style="display:none;">
                        <h4 id="form-title">Add/Edit Failsafe</h4>
                        <label>Name: <input id="failsafe-name"></label><br>
                        <label>Description: <input id="failsafe-desc"></label><br>
                        <label>Enabled: <input type="checkbox" id="failsafe-enabled"></label><br>
                        <button onclick="saveFailsafe()">Save</button>
                        <button onclick="cancelEdit()">Cancel</button>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function toggleBuiltIn(index) {
                            vscode.postMessage({ type: 'toggleBuiltIn', index });
                        }
                        function toggleFailsafe(index) {
                            vscode.postMessage({ type: 'toggleFailsafe', index });
                        }
                        function editFailsafe(index) {
                            vscode.postMessage({ type: 'editFailsafe', index });
                        }
                        function deleteFailsafe(index) {
                            vscode.postMessage({ type: 'deleteFailsafe', index });
                        }
                        function addFailsafe() {
                            vscode.postMessage({ type: 'addFailsafe' });
                        }
                        function saveFailsafe() {
                            const name = document.getElementById('failsafe-name').value;
                            const description = document.getElementById('failsafe-desc').value;
                            const enabled = document.getElementById('failsafe-enabled').checked;
                            vscode.postMessage({ type: 'saveFailsafe', name, description, enabled });
                        }
                        function cancelEdit() {
                            vscode.postMessage({ type: 'cancelEdit' });
                        }
                        window.addEventListener('message', event => {
                            const msg = event.data;
                            if (msg.type === 'showEditForm') {
                                document.getElementById('edit-form').style.display = '';
                                document.getElementById('failsafe-name').value = msg.name || '';
                                document.getElementById('failsafe-desc').value = msg.description || '';
                                document.getElementById('failsafe-enabled').checked = msg.enabled || false;
                            } else if (msg.type === 'hideEditForm') {
                                document.getElementById('edit-form').style.display = 'none';
                            }
                        });
                    </script>
                </body>
                </html>
            `;
        };
        updateWebview();
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === 'toggleFailsafe') {
                this.userFailsafes[msg.index].enabled = !this.userFailsafes[msg.index].enabled;
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                updateWebview();
            }
            else if (msg.type === 'editFailsafe') {
                editIndex = msg.index;
                formActive = true;
                const f = this.userFailsafes[msg.index];
                panel.webview.postMessage({ type: 'showEditForm', name: f.name, description: f.description, enabled: f.enabled });
            }
            else if (msg.type === 'addFailsafe') {
                editIndex = null;
                formActive = true;
                panel.webview.postMessage({ type: 'showEditForm', name: '', description: '', enabled: true });
            }
            else if (msg.type === 'saveFailsafe' && formActive) {
                if (editIndex !== null) {
                    this.userFailsafes[editIndex] = { name: msg.name, description: msg.description, enabled: msg.enabled };
                }
                else {
                    this.userFailsafes.push({ name: msg.name, description: msg.description, enabled: msg.enabled });
                }
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                panel.webview.postMessage({ type: 'hideEditForm' });
                updateWebview();
                formActive = false;
                editIndex = null;
            }
            else if (msg.type === 'deleteFailsafe') {
                this.userFailsafes.splice(msg.index, 1);
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                updateWebview();
            }
            else if (msg.type === 'toggleBuiltIn') {
                vscode.window.showWarningMessage('Disabling built-in failsafes is not recommended!');
                // Optionally, persist built-in failsafe state if you want
            }
            else if (msg.type === 'cancelEdit' && formActive) {
                panel.webview.postMessage({ type: 'hideEditForm' });
                formActive = false;
                editIndex = null;
            }
        });
    }
    getWorkspaceName() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].name;
        }
        return 'No Workspace';
    }
    generateProjectPlanContent() {
        const tasks = this.projectPlan.getAllTasks();
        if (!tasks || tasks.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 3em; margin-bottom: 20px;">📋</div>
                    <h3 style="margin-bottom: 10px;">No Project Plan Found</h3>
                    <p style="margin-bottom: 20px;">Create a project plan to get started with your development workflow.</p>
                    <button class="action-button" onclick="executeCommand('failsafe.createProjectPlan')" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                        Create Project Plan
                    </button>
                </div>
            `;
        }
        return `
            <div class="plan-tasks">
                ${tasks.map((task, index) => `
                    <div class="task-card ${task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in-progress' : ''}" style="margin-bottom: 15px;">
                        <div class="task-header">
                            <div class="task-name">
                                <span style="font-weight: 600; color: #2c3e50;">${index + 1}. ${task.name}</span>
                                ${task.priority === 'high' ? ' 🔴' : task.priority === 'medium' ? ' 🟡' : ' 🟢'}
                            </div>
                            <div class="task-status status-${task.status}">${this.getStatusIcon(task.status)} ${task.status.replace('_', ' ').toUpperCase()}</div>
                        </div>
                        <p style="margin: 10px 0; color: #6c757d;">${task.description || 'No description provided'}</p>
                        <div class="task-details">
                            <div class="detail-item">
                                <div class="detail-label">Priority</div>
                                <div class="detail-value">${task.priority}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Estimated Duration</div>
                                <div class="detail-value">${task.estimatedDuration || 'Not set'} minutes</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Dependencies</div>
                                <div class="detail-value">${task.dependencies ? task.dependencies.join(', ') : 'None'}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    generatePlanValidationContent(planValidation) {
        return `
            <div class="validation-card" style="background: ${planValidation.status === 'valid' ? '#d4edda' : planValidation.status === 'invalid' ? '#f8d7da' : '#fff3cd'}; border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #2c3e50; margin: 0;">Overall Validation Status</h4>
                    <span style="font-weight: 600; color: ${planValidation.status === 'valid' ? '#155724' : planValidation.status === 'invalid' ? '#721c24' : '#856404'};">
                        ${this.getValidationStatusIcon(planValidation.status)} ${planValidation.status.toUpperCase()}
                    </span>
                </div>
                
                <div class="validation-details">
                    <div style="margin-bottom: 10px;">
                        <strong>Rule-based Validation:</strong> ${planValidation.ruleResults.join(', ')}
                    </div>
                    ${planValidation.llmResults ? `
                        <div style="margin-bottom: 10px;">
                            <strong>AI Validation:</strong> ${planValidation.llmResults.grade} (${planValidation.llmResults.score}/100)
                        </div>
                    ` : ''}
                    <div>
                        <strong>LLM Status:</strong> ${planValidation.llmIsCurrent ? '✅ Current' : '⚠️ Outdated'}
                    </div>
                </div>
            </div>
            
            ${!planValidation.llmIsCurrent ? `
                <div style="text-align: center; margin-top: 20px;">
                    <button class="action-button" onclick="executeCommand('failsafe.validatePlanWithAI')" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
                        🤖 Validate with AI
                    </button>
                </div>
            ` : ''}
        `;
    }
    getValidationStatusIcon(status) {
        switch (status) {
            case 'valid': return '✅';
            case 'invalid': return '❌';
            case 'warning': return '⚠️';
            default: return '❓';
        }
    }
    getPlanTaskCount() {
        const tasks = this.projectPlan.getAllTasks();
        return tasks ? tasks.length : 0;
    }
    getCompletedTaskCount() {
        const tasks = this.projectPlan.getAllTasks();
        if (!tasks)
            return 0;
        return tasks.filter((task) => task.status === 'completed').length;
    }
    getInProgressTaskCount() {
        const tasks = this.projectPlan.getAllTasks();
        if (!tasks)
            return 0;
        return tasks.filter((task) => task.status === 'in_progress').length;
    }
    getRemainingTaskCount() {
        const tasks = this.projectPlan.getAllTasks();
        if (!tasks)
            return 0;
        return tasks.filter((task) => task.status !== 'completed').length;
    }
}
exports.UI = UI;
//# sourceMappingURL=ui.js.map