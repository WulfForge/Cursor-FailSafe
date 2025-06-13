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
            // Plan validation
            const planValidation = await this.ui.projectPlan.validatePlan();
            let color = '🟢';
            if (planValidation.status === 'missing') {
                color = '🔴';
            } else if (!planValidation.llmIsCurrent) {
                color = '🟡';
            }
            items.push(new FailSafeTreeItem(`${color} Plan: ${planValidation.status.toUpperCase()}`));
            if (!planValidation.llmIsCurrent) {
                items.push(new FailSafeTreeItem('Validate Plan with AI', vscode.TreeItemCollapsibleState.None, {
                    command: 'failsafe.validatePlanWithAI',
                    title: 'Validate Plan with AI',
                    arguments: []
                }));
            }
            // Failsafe Configuration entry
            items.push(new FailSafeTreeItem('Failsafe Configuration', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showFailsafeConfig',
                title: 'Failsafe Configuration',
                arguments: []
            }));
            // Status
            items.push(new FailSafeTreeItem(`Status: ${this.ui.statusBarState.toUpperCase()}`));
            // Recent actions
            const recent = this.ui.actionLog.slice(-5).reverse();
            if (recent.length > 0) {
                items.push(new FailSafeTreeItem('Recent Actions', vscode.TreeItemCollapsibleState.Collapsed));
            }
            // Show Dashboard button
            items.push(new FailSafeTreeItem('Show Dashboard', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showDashboard',
                title: 'Show Dashboard',
                arguments: []
            }));
            return Promise.resolve(items);
        } else if (element.label === 'Recent Actions') {
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
            
            const statusIcon = linearState.isOnTrack ? '🟡' : '🔴';
            this.statusBarItem.text = `${statusIcon} ${currentTask.name} (${elapsed}m)`;
            this.statusBarItem.tooltip = `Current Task: ${currentTask.name}\nElapsed: ${elapsed} minutes\nOn Track: ${linearState.isOnTrack ? 'Yes' : 'No'}`;
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

        // Show deviations if any
        if (linearState.deviations.length > 0) {
            this.statusBarItem.text = this.statusBarItem.text.replace(/[🟡🟢]/u, '⚠️');
        }
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
            // Plan validation
            const planValidation = await this.projectPlan.validatePlan();
            let color = '🟢';
            if (planValidation.status === 'missing') {
                color = '🔴';
            } else if (!planValidation.llmIsCurrent) {
                color = '🟡';
            }
            const llmStatus = planValidation.llmIsCurrent
                ? `LLM validation current (last run: ${planValidation.llmTimestamp?.toLocaleString() || 'never'})`
                : 'LLM validation missing or outdated';
            const planValidationSection = [
                `# ${color} FailSafe Project Dashboard`,
                `**Plan Status:** ${planValidation.status.toUpperCase()}`,
                `**Rule-based Validation:** ${planValidation.ruleResults.join(' ')}`,
                `**LLM Review:** ${planValidation.llmResults ? `${planValidation.llmResults.grade} (${planValidation.llmResults.score}/100) - ${planValidation.llmResults.summary}` : 'Not available'}`,
                `**LLM Status:** ${llmStatus}`,
                '',
                planValidation.recommendations.length > 0 ? '## Plan Recommendations' : '',
                ...planValidation.recommendations.map(r => `- ${r}`),
                '',
                !planValidation.llmIsCurrent ? '---\n[Validate Plan with AI](command:failsafe.validatePlanWithAI)' : '',
                '---'
            ].filter(Boolean).join('\n');
            // Original dashboard content
            const dashboard = this.getDashboardData();
            const mainDashboard = this.generateDashboardContent(dashboard);
            const dashboardContent = planValidationSection + '\n' + mainDashboard;
            const document = await vscode.workspace.openTextDocument({
                content: dashboardContent,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
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
    public generateDashboardContent(dashboard: UIDashboard): string {
        const { currentTask, nextTask, linearProgress, accountability, recommendations, feasibility, deviations, isOnTrack } = dashboard;

        return [
            `# 🛡️ FailSafe Dashboard`,
            `**Status:** ${isOnTrack ? '🟢 On Track' : '🔴 Off Track'}`,
            `**Last Activity:** ${Math.round(accountability.timeSinceLastActivity / 60000)} minutes ago`,
            '',
            `## 📋 Current Task`,
            currentTask ? [
                `**${currentTask.name}**`,
                `Status: ${this.getStatusIcon(currentTask.status)} ${currentTask.status}`,
                `Priority: ${currentTask.priority}`,
                `Elapsed: ${currentTask.startTime ? Math.round((Date.now() - currentTask.startTime.getTime()) / 60000) : 0} minutes`,
                `Estimated: ${currentTask.estimatedDuration} minutes`,
                `Description: ${currentTask.description}`
            ].join('\n') : 'No active task',
            '',
            `## 🎯 Next Task`,
            nextTask ? [
                `**${nextTask.name}**`,
                `Priority: ${nextTask.priority}`,
                `Estimated: ${nextTask.estimatedDuration} minutes`,
                `Dependencies: ${nextTask.dependencies.length > 0 ? nextTask.dependencies.join(', ') : 'None'}`
            ].join('\n') : 'No tasks ready',
            '',
            `## 📊 Progress Overview`,
            `**Overall Progress:** ${linearProgress.totalProgress.toFixed(1)}%`,
            `**Completed Tasks:** ${linearProgress.completedTasks.length}`,
            `**Blocked Tasks:** ${linearProgress.blockedTasks.length}`,
            `**Estimated Completion:** ${linearProgress.estimatedCompletion ? linearProgress.estimatedCompletion.toLocaleString() : 'Unknown'}`,
            '',
            `## 🚨 Deviations & Issues`,
            deviations.length > 0 ? deviations.map(d => `- ⚠️ ${d}`).join('\n') : '✅ No deviations detected',
            '',
            `## 💡 Recommendations`,
            recommendations.length > 0 ? recommendations.map(r => 
                `- **${r.priority.toUpperCase()}:** ${r.action} - ${r.reason}`
            ).join('\n') : '✅ No recommendations at this time',
            '',
            `## 🔍 Feasibility Analysis`,
            `**Current State:** ${feasibility.feasibility}`,
            feasibility.blockers.length > 0 ? [
                `**Blockers:**`,
                ...feasibility.blockers.map((b: string) => `- ${b}`)
            ].join('\n') : '✅ No blockers detected',
            feasibility.recommendations.length > 0 ? [
                `**Recommendations:**`,
                ...feasibility.recommendations.map((r: string) => `- ${r}`)
            ].join('\n') : '',
            '',
            `## 📈 Accountability Report`,
            `**Overdue Tasks:** ${accountability.overdueTasks.length}`,
            `**Current Task Duration:** ${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60000) : 0} minutes`,
            accountability.recommendations.length > 0 ? [
                `**Suggestions:**`,
                ...accountability.recommendations.map((r: string) => `- ${r}`)
            ].join('\n') : '',
            '',
            `## 🎮 Quick Actions`,
            `- \`failsafe.forceLinearProgression\` - Force advance to next task`,
            `- \`failsafe.autoAdvance\` - Auto-advance if ready`,
            `- \`failsafe.showProgress\` - Detailed progress view`,
            `- \`failsafe.showAccountability\` - Accountability details`,
            `- \`failsafe.showFeasibility\` - Feasibility analysis`
        ].join('\n');
    }

    /**
     * Show detailed progress information
     */
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

    /**
     * Show accountability report
     */
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

    /**
     * Show feasibility analysis
     */
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

    /**
     * Force linear progression
     */
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

    /**
     * Auto-advance to next task
     */
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