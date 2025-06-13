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
exports.UI = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
class UI {
    constructor(projectPlan, taskEngine, logger) {
        this.disposables = [];
        this.dashboardPanel = null;
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.logger = logger;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.progressBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.accountabilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
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
        // Main status item
        this.statusBarItem.text = '🛡️ FailSafe';
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
            vscode.commands.registerCommand('failsafe.autoAdvance', () => this.autoAdvanceToNextTask())
        ];
        this.disposables.push(...commands);
    }
    updateStatusBar() {
        try {
            const status = this.taskEngine.getProjectStatus();
            const currentTask = status.currentTask;
            const linearState = status.linearState;
            const accountability = status.accountability;
            // Update main status item
            this.updateMainStatus(currentTask, linearState);
            // Update progress bar
            this.updateProgressBar(status.progress, linearState);
            // Update accountability item
            this.updateAccountabilityItem(accountability, linearState);
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
            const statusIcon = linearState.isOnTrack ? '🟡' : '🔴';
            this.statusBarItem.text = `${statusIcon} ${currentTask.name} (${elapsed}m)`;
            this.statusBarItem.tooltip = `Current Task: ${currentTask.name}\nElapsed: ${elapsed} minutes\nOn Track: ${linearState.isOnTrack ? 'Yes' : 'No'}`;
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
        // Show deviations if any
        if (linearState.deviations.length > 0) {
            this.statusBarItem.text = this.statusBarItem.text.replace(/[🟡🟢]/, '⚠️');
        }
    }
    updateProgressBar(progress, linearState) {
        const percentage = progress.progressPercentage;
        const progressBar = this.createProgressBar(percentage);
        this.progressBarItem.text = `📊 ${progressBar} ${percentage.toFixed(1)}%`;
        this.progressBarItem.tooltip = `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks\nEstimated remaining: ${Math.round(progress.estimatedRemainingTime / 60000)} minutes`;
    }
    updateAccountabilityItem(accountability, linearState) {
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
        try {
            const dashboard = this.getDashboardData();
            const content = this.generateDashboardContent(dashboard);
            const document = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(document);
            this.logger.info('Dashboard shown');
        }
        catch (error) {
            this.logger.error('Error showing dashboard', error);
            vscode.window.showErrorMessage('Failed to show dashboard');
        }
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
    generateDashboardContent(dashboard) {
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
            recommendations.length > 0 ? recommendations.map(r => `- **${r.priority.toUpperCase()}:** ${r.action} - ${r.reason}`).join('\n') : '✅ No recommendations at this time',
            '',
            `## 🔍 Feasibility Analysis`,
            `**Current State:** ${feasibility.feasibility}`,
            feasibility.blockers.length > 0 ? [
                `**Blockers:**`,
                ...feasibility.blockers.map((b) => `- ${b}`)
            ].join('\n') : '✅ No blockers detected',
            feasibility.recommendations.length > 0 ? [
                `**Recommendations:**`,
                ...feasibility.recommendations.map((r) => `- ${r}`)
            ].join('\n') : '',
            '',
            `## 📈 Accountability Report`,
            `**Overdue Tasks:** ${accountability.overdueTasks.length}`,
            `**Current Task Duration:** ${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60000) : 0} minutes`,
            accountability.recommendations.length > 0 ? [
                `**Suggestions:**`,
                ...accountability.recommendations.map((r) => `- ${r}`)
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
    async showProgressDetails() {
        try {
            const progress = this.projectPlan.getProjectProgress();
            const linearState = this.projectPlan.getLinearProgressState();
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
    /**
     * Show accountability report
     */
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
    /**
     * Show feasibility analysis
     */
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
    /**
     * Force linear progression
     */
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
    /**
     * Auto-advance to next task
     */
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
    dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.logger.info('UI disposed');
    }
}
exports.UI = UI;
//# sourceMappingURL=ui.js.map