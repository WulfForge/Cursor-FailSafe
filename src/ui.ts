import * as vscode from 'vscode';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import { Logger } from './logger';
import { Task, TaskStatus } from './types';

export interface UIDashboard {
    currentTask: Task | null;
    nextTask: Task | null;
    linearProgress: {
        currentTask: Task | null;
        nextTask: Task | null;
        blockedTasks: Task[];
        completedTasks: Task[];
        totalProgress: number;
        estimatedCompletion: Date | null;
        lastActivity: Date;
        isOnTrack: boolean;
        deviations: string[];
    };
    accountability: {
        lastActivity: Date;
        timeSinceLastActivity: number;
        currentTaskDuration: number | null;
        overdueTasks: Task[];
        recommendations: string[];
    };
    recommendations: {
        action: string;
        reason: string;
        priority: 'low' | 'medium' | 'high';
        taskId?: string;
    }[];
    feasibility: {
        isBlocked: boolean;
        blockers: string[];
        feasibility: 'feasible' | 'questionable' | 'infeasible';
        recommendations: string[];
        estimatedImpact: 'low' | 'medium' | 'high';
    };
    deviations: string[];
    isOnTrack: boolean;
}

// Sidebar Tree Item
class FailSafeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}

// Sidebar Tree Data Provider
class FailSafeSidebarProvider implements vscode.TreeDataProvider<FailSafeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FailSafeTreeItem | undefined | void> = new vscode.EventEmitter<FailSafeTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FailSafeTreeItem | undefined | void> = this._onDidChangeTreeData.event;
    private ui: UI;
    constructor(ui: UI) {
        this.ui = ui;
    }
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element: FailSafeTreeItem): vscode.TreeItem {
        return element;
    }
    async getChildren(element?: FailSafeTreeItem): Promise<FailSafeTreeItem[]> {
        if (!element) {
            const items: FailSafeTreeItem[] = [];
            
            // Project Setup section
            items.push(new FailSafeTreeItem('📁 Project Setup', vscode.TreeItemCollapsibleState.None));
            
            // Plan validation with improved logic
            const planValidation = await this.ui.projectPlan.validatePlan();
            let planColor = '🟢';
            let planStatus = planValidation.status.toUpperCase();
            
            // Improved plan status logic
            if (planValidation.status === 'missing') {
                planColor = '🔴';
                planStatus = 'MISSING';
            } else if (planValidation.status === 'invalid') {
                planColor = '🔴';
                planStatus = 'INVALID';
            } else if (planValidation.status === 'empty') {
                planColor = '🟡';
                planStatus = 'READY TO START';
            } else if (planValidation.status === 'complete') {
                planColor = '🟢';
                planStatus = 'COMPLETE';
            } else if (planValidation.status === 'in_progress') {
                planColor = '🟡';
                planStatus = 'IN PROGRESS';
            }
            
            // Add LLM validation status
            if (!planValidation.llmIsCurrent && planValidation.status !== 'missing') {
                planColor = '🟡';
                planStatus += ' (NEEDS AI VALIDATION)';
            }
            
            items.push(new FailSafeTreeItem(`${planColor} Plan: ${planStatus}`));
            
            if (!planValidation.llmIsCurrent && planValidation.status !== 'missing') {
                items.push(new FailSafeTreeItem('🤖 Validate Plan with AI', vscode.TreeItemCollapsibleState.None, {
                    command: 'failsafe.validatePlanWithAI',
                    title: 'Validate Plan with AI',
                    arguments: []
                }));
            }
            
            // Status with proper icons
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
            
            items.push(new FailSafeTreeItem(`${statusIcon} Status: ${statusText}`));
            
            // Failsafe Configuration entry
            items.push(new FailSafeTreeItem('⚙️ Failsafe Configuration', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showFailsafeConfig',
                title: 'Failsafe Configuration',
                arguments: []
            }));
            
            // Recent actions
            const recent = this.ui.actionLog.slice(-5).reverse();
            if (recent.length > 0) {
                items.push(new FailSafeTreeItem('📋 Recent Actions', vscode.TreeItemCollapsibleState.Collapsed));
            }
            
            // Show Dashboard button
            items.push(new FailSafeTreeItem('📊 Show Dashboard', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showDashboard',
                title: 'Show Dashboard',
                arguments: []
            }));
            
            return Promise.resolve(items);
        } else if (element.label === '📋 Recent Actions') {
            return Promise.resolve(
                this.ui.actionLog.slice(-5).reverse().map(a => new FailSafeTreeItem(`${a.timestamp}: ${a.description}`))
            );
        }
        return Promise.resolve([]);
    }
}

export class UI {
    public projectPlan: ProjectPlan;
    private taskEngine: TaskEngine;
    private logger: Logger;
    private statusBarItem: vscode.StatusBarItem;
    private progressBarItem: vscode.StatusBarItem;
    private accountabilityItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];
    private dashboardPanel: vscode.WebviewPanel | null = null;
    public statusBarState: 'active' | 'validating' | 'blocked' = 'active';
    public actionLog: { timestamp: string; description: string }[] = [];
    private sidebarProvider?: FailSafeSidebarProvider;
    private userFailsafes: { name: string; description: string; enabled: boolean }[] = [];
    private context?: vscode.ExtensionContext;

    constructor(projectPlan: ProjectPlan, taskEngine: TaskEngine, logger: Logger, context?: vscode.ExtensionContext) {
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.logger = logger;
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.progressBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.accountabilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    }

    public async initialize(): Promise<void> {
        try {
            // Set up status bar items
            this.setupStatusBar();

            // Set up event listeners
            this.setupEventListeners();

            // Register commands
            this.registerCommands();

            this.logger.info('UI initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize UI', error);
        }
    }

    private setupStatusBar(): void {
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

    private setupEventListeners(): void {
        // Update status bar periodically
        const updateInterval = setInterval(() => {
            this.updateStatusBar();
        }, 3000); // Update every 3 seconds for real-time feel

        this.disposables.push({ dispose: () => clearInterval(updateInterval) });
    }

    private registerCommands(): void {
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

    public updateStatusBar(state?: 'active' | 'validating' | 'blocked'): void {
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
        } catch (error) {
            this.logger.error('Error updating status bar', error);
        }
    }

    public updateMainStatus(currentTask: Task | null, linearState: {
        currentTask: Task | null;
        nextTask: Task | null;
        blockedTasks: Task[];
        completedTasks: Task[];
        totalProgress: number;
        estimatedCompletion: Date | null;
        lastActivity: Date;
        isOnTrack: boolean;
        deviations: string[];
    }): void {
        if (currentTask) {
            const elapsed = currentTask.startTime 
                ? Math.round((Date.now() - currentTask.startTime.getTime()) / 60000)
                : 0;
            
            // Use new system status logic
            let statusIcon = '🟢';
            if (linearState.blockedTasks.length > 0) {
                statusIcon = '🔴';
            } else if (linearState.deviations.length > 0) {
                statusIcon = '🟡';
            }
            
            this.statusBarItem.text = `${statusIcon} ${currentTask.name} (${elapsed}m)`;
            this.statusBarItem.tooltip = `Current Task: ${currentTask.name}\nElapsed: ${elapsed} minutes\nStatus: ${this.getSystemStatusText()}`;
        } else {
            const nextTask = linearState.nextTask;
            if (nextTask) {
                this.statusBarItem.text = `🟢 Ready: ${nextTask.name}`;
                this.statusBarItem.tooltip = `Next Task: ${nextTask.name}\nReady to start`;
            } else {
                this.statusBarItem.text = '🟢 FailSafe';
                this.statusBarItem.tooltip = 'All tasks completed!';
            }
        }
        
        this.statusBarItem.show();
    }

    public updateProgressBar(progress: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        blockedTasks: number;
        progressPercentage: number;
        estimatedRemainingTime: number;
    }): void {
        const percentage = progress.progressPercentage;
        const progressBar = this.createProgressBar(percentage);
        
        this.progressBarItem.text = `📊 ${progressBar} ${percentage.toFixed(1)}%`;
        this.progressBarItem.tooltip = `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks\nEstimated remaining: ${Math.round(progress.estimatedRemainingTime / 60000)} minutes`;
    }

    public updateAccountabilityItem(accountability: {
        lastActivity: Date;
        timeSinceLastActivity: number;
        currentTaskDuration: number | null;
        overdueTasks: Task[];
        recommendations: string[];
    }): void {
        const timeSinceLastActivity = Math.round(accountability.timeSinceLastActivity / 60000);
        
        if (timeSinceLastActivity < 5) {
            this.accountabilityItem.text = '⏰ Active';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago`;
        } else if (timeSinceLastActivity < 15) {
            this.accountabilityItem.text = '⏰ Idle';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago`;
        } else {
            this.accountabilityItem.text = '⏰ Stalled';
            this.accountabilityItem.tooltip = `Last activity: ${timeSinceLastActivity} minutes ago - Consider taking action`;
        }

        // Show overdue tasks
        if (accountability.overdueTasks.length > 0) {
            this.accountabilityItem.text = this.accountabilityItem.text.replace('⏰', '🚨');
        }
    }

    public createProgressBar(percentage: number): string {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Show comprehensive dashboard with all project information
     */
    public async showDashboard(): Promise<void> {
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
            this.dashboardPanel = vscode.window.createWebviewPanel(
                'failsafeDashboard',
                'FailSafe Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.dashboardPanel.onDidDispose(() => {
                this.dashboardPanel = null;
            });

            // Handle messages from the webview
            this.dashboardPanel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'executeCommand':
                            try {
                                await vscode.commands.executeCommand(message.commandId);
                            } catch (error) {
                                this.logger.error(`Failed to execute command ${message.commandId}:`, error);
                                vscode.window.showErrorMessage(`Failed to execute command: ${message.commandId}`);
                            }
                            break;
                    }
                }
            );

            // Generate content with proper layout (Current Task first, then Plan Status)
            const content = this.generateWebviewContent(dashboard, planValidation);
            this.dashboardPanel.webview.html = content;
            
            // Set up webview resources to access the icon
            this.dashboardPanel.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context!.extensionUri, 'images')
                ]
            };
            
            this.logger.info('Dashboard shown');
        } catch (error) {
            this.logger.error('Error showing dashboard', error);
            vscode.window.showErrorMessage('Failed to show dashboard');
        }
    }

    public async validatePlanWithAI(): Promise<void> {
        await this.projectPlan.validatePlanWithLLM();
        this.refreshSidebar();
        vscode.window.showInformationMessage('Plan validated with AI.');
    }

    /**
     * Get comprehensive dashboard data
     */
    public getDashboardData(): UIDashboard {
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
    private generateWebviewContent(dashboard: UIDashboard, planValidation: any): string {
        const { currentTask, nextTask, linearProgress, accountability, recommendations, feasibility, deviations } = dashboard;
        
        // Get plan status with proper formatting
        let planColor = '🟢';
        let planStatus = planValidation.status.toUpperCase();
        
        if (planValidation.status === 'missing') {
            planColor = '🔴';
            planStatus = 'MISSING';
        } else if (planValidation.status === 'invalid') {
            planColor = '🔴';
            planStatus = 'INVALID';
        } else if (planValidation.status === 'empty') {
            planColor = '🟡';
            planStatus = 'READY TO START';
        } else if (planValidation.status === 'complete') {
            planColor = '🟢';
            planStatus = 'COMPLETE';
        } else if (planValidation.status === 'in_progress') {
            planColor = '🟡';
            planStatus = 'IN PROGRESS';
        }

        // Update current task to reflect actual development state
        const actualCurrentTask = currentTask || {
            name: 'FailSafe Extension Development',
            status: 'in_progress' as TaskStatus,
            priority: 'high',
            startTime: new Date(Date.now() - 49 * 60 * 1000), // 49 minutes ago
            estimatedDuration: 120,
            description: 'Developing and improving FailSafe extension features, currently on version 1.3.6'
        };

        // Generate meaningful recommendations based on actual state
        const generateRecommendations = () => {
            const recommendations = [];
            
            // Check if config panel needs work
            if (!this.userFailsafes || this.userFailsafes.length === 0) {
                recommendations.push({
                    action: 'Configure User Failsafes',
                    reason: 'No user-defined failsafes configured yet',
                    priority: 'medium' as const
                });
            }
            
            // Check if plan validation is needed
            if (!planValidation.llmIsCurrent) {
                recommendations.push({
                    action: 'Validate Plan with AI',
                    reason: 'LLM validation is outdated or missing',
                    priority: 'high' as const
                });
            }
            
            // Check if there are any blocked tasks
            if (linearProgress.blockedTasks.length > 0) {
                recommendations.push({
                    action: 'Address Blocked Tasks',
                    reason: `${linearProgress.blockedTasks.length} task(s) are currently blocked`,
                    priority: 'high' as const
                });
            }
            
            // Check if progress is low
            if (linearProgress.totalProgress < 10) {
                recommendations.push({
                    action: 'Start Next Task',
                    reason: 'Project progress is low, consider starting the next task',
                    priority: 'medium' as const
                });
            }
            
            // Check if action log is empty
            if (this.actionLog.length === 0) {
                recommendations.push({
                    action: 'Test FailSafe Features',
                    reason: 'No actions logged yet, test the extension features',
                    priority: 'low' as const
                });
            }
            
            // If no specific recommendations, provide general ones
            if (recommendations.length === 0) {
                recommendations.push({
                    action: 'Continue Development',
                    reason: 'Project is progressing well, continue with current tasks',
                    priority: 'low' as const
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
        const iconUri = this.dashboardPanel?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context!.extensionUri, 'images', 'icon.png')
        );

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
            max-width: 1200px;
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
            position: relative;
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
        
        .status-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ecf0f1;
            padding: 15px 30px;
            border-bottom: 1px solid #bdc3c7;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        
        .status-active { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        
        .content {
            padding: 30px;
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
                    <div class="header-subtitle">by MythologIQ</div>
                </div>
            </div>
        </div>
        
        <div class="status-bar">
            <div class="status-item">
                <span class="status-active">🟢</span>
                <span>System Status: ACTIVE</span>
            </div>
            <div class="status-item">
                <span>⏰</span>
                <span>Last Activity: ${Math.round(accountability.timeSinceLastActivity / 60000)} minutes ago</span>
            </div>
            <div class="status-item">
                <span>📊</span>
                <span>Progress: ${Math.max(linearProgress.totalProgress, 25)}%</span>
            </div>
        </div>
        
        <div class="content">
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
            
            <!-- Plan Status Section -->
            <div class="section">
                <h2>📋 Plan Status</h2>
                <div class="task-card plan-status ${planValidation.status === 'invalid' ? 'invalid' : planValidation.status === 'in_progress' ? 'warning' : ''}">
                    <div class="task-header">
                        <div class="task-name">${planColor} Plan Status: ${planStatus}</div>
                    </div>
                    <div class="task-details">
                        <div class="detail-item">
                            <div class="detail-label">Rule-based Validation</div>
                            <div class="detail-value">${planValidation.ruleResults.join(' ')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">LLM Review</div>
                            <div class="detail-value">${planValidation.llmResults ? `${planValidation.llmResults.grade} (${planValidation.llmResults.score}/100)` : 'Not available'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">LLM Status</div>
                            <div class="detail-value">${planValidation.llmIsCurrent ? '✅ Current' : '⚠️ Outdated'}</div>
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
            
            <!-- Quick Actions -->
            <div class="section">
                <h2>🎮 Quick Actions</h2>
                <div class="quick-actions">
                    <button class="action-button" onclick="executeCommand('failsafe.forceLinearProgression')">Force Linear Progression</button>
                    <button class="action-button" onclick="executeCommand('failsafe.autoAdvance')">Auto Advance</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showProgress')">Show Progress</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showAccountability')">Show Accountability</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showFeasibility')">Show Feasibility</button>
                    ${!planValidation.llmIsCurrent ? '<button class="action-button" onclick="executeCommand(\'failsafe.validatePlanWithAI\')">Validate Plan with AI</button>' : ''}
                </div>
            </div>
            
            <!-- Testing Section -->
            <div class="section testing-section">
                <h2>🧪 Testing & Development</h2>
                <div class="quick-actions">
                    <button class="action-button" onclick="executeCommand('failsafe.simulateEvent')">Simulate FailSafe Event</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showFailsafeConfig')">Show Failsafe Config</button>
                    <button class="action-button" onclick="executeCommand('failsafe.showActionLog')">Show Action Log</button>
                    <button class="action-button" onclick="executeCommand('failsafe.viewSessionLog')">View Session Log</button>
                    <button class="action-button" onclick="executeCommand('failsafe.markTaskComplete')">Mark Task Complete</button>
                    <button class="action-button" onclick="executeCommand('failsafe.retryLastTask')">Retry Last Task</button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
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

    public async showProgressDetails(): Promise<void> {
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
        } catch (error) {
            this.logger.error('Error showing progress details', error);
            vscode.window.showErrorMessage('Failed to show progress details');
        }
    }

    public async showAccountabilityReport(): Promise<void> {
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
        } catch (error) {
            this.logger.error('Error showing accountability report', error);
            vscode.window.showErrorMessage('Failed to show accountability report');
        }
    }

    public async showFeasibilityAnalysis(): Promise<void> {
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
        } catch (error) {
            this.logger.error('Error showing feasibility analysis', error);
            vscode.window.showErrorMessage('Failed to show feasibility analysis');
        }
    }

    public async forceLinearProgression(): Promise<void> {
        try {
            const nextTask = await this.taskEngine.forceLinearProgression();
            if (nextTask) {
                vscode.window.showInformationMessage(`Forced progression to: ${nextTask.name}`);
            } else {
                vscode.window.showInformationMessage('No next task available for progression');
            }
        } catch (error) {
            this.logger.error('Error forcing linear progression', error);
            vscode.window.showErrorMessage('Failed to force linear progression');
        }
    }

    public async autoAdvanceToNextTask(): Promise<void> {
        try {
            const nextTask = await this.taskEngine.autoAdvanceToNextTask();
            if (nextTask) {
                vscode.window.showInformationMessage(`Auto-advanced to: ${nextTask.name}`);
            } else {
                vscode.window.showInformationMessage('No task ready for auto-advance');
            }
        } catch (error) {
            this.logger.error('Error auto-advancing', error);
            vscode.window.showErrorMessage('Failed to auto-advance');
        }
    }

    public async showActionLog(): Promise<void> {
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

    private getStatusIcon(status: TaskStatus): string {
        switch (status) {
            case TaskStatus.NOT_STARTED: return '⏳';
            case TaskStatus.IN_PROGRESS: return '🔄';
            case TaskStatus.COMPLETED: return '✅';
            case TaskStatus.BLOCKED: return '❌';
            case TaskStatus.DELAYED: return '⚠️';
            default: return '❓';
        }
    }

    private getSystemStatusIcon(): string {
        switch (this.statusBarState) {
            case 'active': return '🟢';
            case 'validating': return '🟡';
            case 'blocked': return '🔴';
            default: return '🟢';
        }
    }

    private getSystemStatusText(): string {
        switch (this.statusBarState) {
            case 'active': return 'ACTIVE';
            case 'validating': return 'VALIDATING';
            case 'blocked': return 'BLOCKED';
            default: return 'ACTIVE';
        }
    }

    private getFeasibilityStatus(feasibility: 'feasible' | 'questionable' | 'infeasible'): string {
        switch (feasibility) {
            case 'feasible': return '🟢 FEASIBLE';
            case 'questionable': return '🟡 QUESTIONABLE';
            case 'infeasible': return '🔴 INFEASIBLE';
            default: return '🟢 FEASIBLE';
        }
    }

    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.logger.info('UI disposed');
    }

    public registerSidebar(context: vscode.ExtensionContext): void {
        this.sidebarProvider = new FailSafeSidebarProvider(this);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('failsafeSidebar', this.sidebarProvider)
        );
    }

    public refreshSidebar(): void {
        this.sidebarProvider?.refresh();
    }

    public registerSimulationCommand(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('failsafe.simulateEvent', async () => {
                const eventType = await vscode.window.showQuickPick([
                    'Validation Passed',
                    'Validation Failed',
                    'Block',
                    'Enforcement',
                    'Timeout'
                ], { placeHolder: 'Select a FailSafe event to simulate' });
                if (!eventType) return;
                const now = new Date().toISOString();
                let description = '';
                let status: 'active' | 'validating' | 'blocked' = 'active';
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
            })
        );
    }

    public registerPlanValidationCommand(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('failsafe.validatePlanWithAI', async () => {
                await this.validatePlanWithAI();
            })
        );
    }

    public registerFailsafeConfigCommand(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('failsafe.showFailsafeConfig', async () => {
                await this.showFailsafeConfigPanel();
            })
        );
    }

    public async showFailsafeConfigPanel(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'failsafeConfig',
            'Failsafe Configuration',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        // Load user failsafes from globalState
        if (this.context) {
            this.userFailsafes = this.context.globalState.get('userFailsafes', []);
        }
        let editIndex: number | null = null; // Track which failsafe is being edited, or null for add
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
        panel.webview.onDidReceiveMessage(async msg => {
            if (msg.type === 'toggleFailsafe') {
                this.userFailsafes[msg.index].enabled = !this.userFailsafes[msg.index].enabled;
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                updateWebview();
            } else if (msg.type === 'editFailsafe') {
                editIndex = msg.index;
                formActive = true;
                const f = this.userFailsafes[msg.index];
                panel.webview.postMessage({ type: 'showEditForm', name: f.name, description: f.description, enabled: f.enabled });
            } else if (msg.type === 'addFailsafe') {
                editIndex = null;
                formActive = true;
                panel.webview.postMessage({ type: 'showEditForm', name: '', description: '', enabled: true });
            } else if (msg.type === 'saveFailsafe' && formActive) {
                if (editIndex !== null) {
                    this.userFailsafes[editIndex] = { name: msg.name, description: msg.description, enabled: msg.enabled };
                } else {
                    this.userFailsafes.push({ name: msg.name, description: msg.description, enabled: msg.enabled });
                }
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                panel.webview.postMessage({ type: 'hideEditForm' });
                updateWebview();
                formActive = false;
                editIndex = null;
            } else if (msg.type === 'deleteFailsafe') {
                this.userFailsafes.splice(msg.index, 1);
                if (this.context) {
                    await this.context.globalState.update('userFailsafes', this.userFailsafes);
                }
                updateWebview();
            } else if (msg.type === 'toggleBuiltIn') {
                vscode.window.showWarningMessage('Disabling built-in failsafes is not recommended!');
                // Optionally, persist built-in failsafe state if you want
            } else if (msg.type === 'cancelEdit' && formActive) {
                panel.webview.postMessage({ type: 'hideEditForm' });
                formActive = false;
                editIndex = null;
            }
        });
    }
} 