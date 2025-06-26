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
const chartDataService_1 = require("./chartDataService");
const path = __importStar(require("path"));
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
                    case types_1.TaskStatus.notStarted:
                        projectIcon = '⏳';
                        break;
                    case types_1.TaskStatus.completed:
                        projectIcon = '✅';
                        break;
                    case types_1.TaskStatus.blocked:
                        projectIcon = '❌';
                        break;
                    case types_1.TaskStatus.delayed:
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
        this.eventSource = null;
        this.serverPort = 3000;
        this.metricsData = null;
        this.realTimeEvents = [];
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.logger = logger;
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.progressBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.accountabilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        // Initialize chart data service with real data sources
        this.chartDataService = new chartDataService_1.RealChartDataService(taskEngine, projectPlan, logger);
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
            // Initialize SSE connection for real-time events
            await this.initializeSSE();
            // Load initial metrics data
            await this.loadMetricsData();
            this.logger.info('UI initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize UI:', error);
            throw error;
        }
    }
    async initializeSSE() {
        try {
            // Get server port from Fastify server
            const serverPort = await this.getServerPort();
            this.serverPort = serverPort;
            // Create EventSource for real-time events
            const eventUrl = `http://localhost:${serverPort}/events`;
            this.eventSource = new EventSource(eventUrl);
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealTimeEvent(data);
                }
                catch (error) {
                    this.logger.warn('Failed to parse SSE event:', error);
                }
            };
            this.eventSource.onerror = (error) => {
                this.logger.warn('SSE connection error:', error);
                // Reconnect after 5 seconds
                setTimeout(() => this.initializeSSE(), 5000);
            };
            this.logger.info(`SSE connection established on port ${serverPort}`);
        }
        catch (error) {
            this.logger.warn('Failed to initialize SSE connection:', error);
        }
    }
    async getServerPort() {
        try {
            // Try to get port from Fastify server instance
            const response = await fetch(`http://localhost:3000/status`);
            const data = await response.json();
            return data.port || 3000;
        }
        catch {
            return 3000; // Default fallback
        }
    }
    handleRealTimeEvent(event) {
        // Add event to real-time events array (keep last 100)
        this.realTimeEvents.push(event);
        if (this.realTimeEvents.length > 100) {
            this.realTimeEvents.shift();
        }
        // Update action log
        this.actionLog.push({
            timestamp: event.timestamp,
            description: `🔔 ${event.type}: ${JSON.stringify(event.data)}`
        });
        // Update UI based on event type
        switch (event.type) {
            case 'validation':
                this.handleValidationEvent(event);
                break;
            case 'rule_trigger':
                this.handleRuleTriggerEvent(event);
                break;
            case 'task_event':
                this.handleTaskEvent(event);
                break;
            case 'system':
                this.handleSystemEvent(event);
                break;
        }
        // Refresh dashboard if open
        if (this.dashboardPanel) {
            this.refreshDashboard();
        }
        // Refresh sidebar
        this.refreshSidebar();
    }
    handleValidationEvent(event) {
        this.logger.info('Validation event received:', event);
        // Update validation status in UI
        if (event.data.status === 'failed') {
            this.statusBarState = 'blocked';
            this.updateStatusBar('blocked');
        }
    }
    handleRuleTriggerEvent(event) {
        this.logger.info('Rule trigger event received:', event);
        // Handle rule triggers
    }
    handleTaskEvent(event) {
        this.logger.info('Task event received:', event);
        // Handle task events
    }
    handleSystemEvent(event) {
        this.logger.info('System event received:', event);
        // Handle system events
    }
    async loadMetricsData() {
        try {
            const response = await fetch(`http://localhost:${this.serverPort}/metrics?range=7d`);
            if (response.ok) {
                this.metricsData = await response.json();
                this.logger.info('Metrics data loaded successfully');
            }
        }
        catch (error) {
            this.logger.warn('Failed to load metrics data:', error);
        }
    }
    async refreshDashboard() {
        if (this.dashboardPanel) {
            const dashboard = this.getDashboardData();
            const planValidation = await this.projectPlan.validatePlan();
            const content = await this.generateWebviewContent(dashboard, planValidation);
            this.dashboardPanel.webview.html = content;
        }
    }
    getRealTimeEvents() {
        return [...this.realTimeEvents];
    }
    getMetricsData() {
        return this.metricsData;
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
        try {
            if (this.dashboardPanel) {
                this.dashboardPanel.reveal();
                return;
            }
            const iconUri = vscode.Uri.file(path.join(__dirname, '..', 'images', 'icon.png'));
            this.dashboardPanel = vscode.window.createWebviewPanel('failsafeDashboard', 'FailSafe Dashboard', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [iconUri]
            });
            const dashboard = this.getDashboardData();
            const planValidation = await this.projectPlan.validatePlan();
            // Generate webview content with async chart data
            const content = await this.generateWebviewContent(dashboard, planValidation);
            this.dashboardPanel.webview.html = content;
            this.dashboardPanel.onDidDispose(() => {
                this.dashboardPanel = null;
            });
            this.dashboardPanel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'executeCommand':
                        await this.executeDashboardCommand(msg.commandId);
                        break;
                    case 'updateChart':
                        await this.updateChartData(msg.chartType, msg.grouping);
                        break;
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to show dashboard: ' + error);
        }
    }
    async executeDashboardCommand(commandId) {
        try {
            switch (commandId) {
                case 'failsafe.showProgressDetails':
                    await this.showProgressDetails();
                    break;
                case 'failsafe.showAccountabilityReport':
                    await this.showAccountabilityReport();
                    break;
                case 'failsafe.showFeasibilityAnalysis':
                    await this.showFeasibilityAnalysis();
                    break;
                case 'failsafe.forceLinearProgression':
                    await this.forceLinearProgression();
                    break;
                case 'failsafe.autoAdvance':
                    await this.autoAdvanceToNextTask();
                    break;
                case 'failsafe.showActionLog':
                    await this.showActionLog();
                    break;
                case 'failsafe.validatePlanWithAI':
                    await this.validatePlanWithAI();
                    break;
                case 'failsafe.showFailsafeConfig':
                    await this.showFailsafeConfigPanel();
                    break;
                default:
                    vscode.window.showInformationMessage(`Command ${commandId} not implemented yet`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to execute command ${commandId}: ${error}`);
        }
    }
    async updateChartData(chartType, grouping) {
        try {
            // Get updated chart data based on grouping
            let chartData;
            switch (chartType) {
                case 'progress':
                    chartData = await this.chartDataService.getProgressData();
                    break;
                case 'activity':
                    chartData = await this.chartDataService.getActivityData(7);
                    break;
                case 'performance':
                    chartData = await this.chartDataService.getPerformanceData();
                    break;
                case 'issues':
                    chartData = await this.chartDataService.getIssuesData();
                    break;
                case 'velocity':
                    chartData = await this.chartDataService.getSprintVelocityData();
                    break;
                case 'validation':
                    chartData = await this.chartDataService.getValidationTypeData();
                    break;
                case 'drift':
                    chartData = await this.chartDataService.getDriftTrendData();
                    break;
                case 'hallucination':
                    chartData = await this.chartDataService.getHallucinationSourceData();
                    break;
                default:
                    return;
            }
            // Send updated data to webview
            if (this.dashboardPanel) {
                this.dashboardPanel.webview.postMessage({
                    command: 'updateChartData',
                    chartType: chartType,
                    data: chartData
                });
            }
        }
        catch (error) {
            this.logger.error(`Failed to update chart data for ${chartType}:`, error);
        }
    }
    async validatePlanWithAI() {
        await this.projectPlan.validatePlan();
        this.refreshSidebar();
        vscode.window.showInformationMessage('Plan validated.');
    }
    /**
     * Get comprehensive dashboard data
     */
    getDashboardData() {
        const status = this.taskEngine.getProjectStatus();
        const linearState = status.linearState;
        const accountability = status.accountability;
        const recommendations = this.taskEngine.getWorkflowRecommendations();
        const feasibility = this.projectPlan.analyzeFeasibility();
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
    async generateWebviewContent(dashboard, planValidation) {
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
            startTime: new Date(Date.now() - 49 * 60 * 1000), // 49 minutes ago
            estimatedDuration: 120,
            description: 'Developing and improving FailSafe extension features, currently on version 2.5.2'
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
        const iconUri = this.context && this.dashboardPanel?.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'images', 'icon.png'));
        // Generate chart data using real data sources
        const chartData = await this.generateChartData(dashboard, planValidation);
        // Generate the main content
        const content = `
        <div class="dashboard-content">
            <div class="header">
                <div class="header-content">
                    <div class="logo-container">
                        <div class="failsafe-logo">🛡️</div>
                        <div>
                            <h1>FailSafe Dashboard</h1>
                            <p>Project Management & Accountability System</p>
                        </div>
                    </div>
                </div>
                <div class="plan-status ${planValidation.status}">
                    <span class="status-icon">${planColor}</span>
                    <span class="status-text">${planStatus}</span>
                </div>
            </div>

            <div class="main-content">
                <div class="grid-container">
                    <div class="current-task-section">
                        <h2>Current Task</h2>
                        <div class="task-card">
                            <h3>${actualCurrentTask.name}</h3>
                            <p>${actualCurrentTask.description}</p>
                            <div class="task-meta">
                                <span class="priority ${actualCurrentTask.priority}">${actualCurrentTask.priority.toUpperCase()}</span>
                                <span class="duration">${actualCurrentTask.estimatedDuration} min</span>
                            </div>
                        </div>
                    </div>

                    <div class="progress-section">
                        <h2>Progress Overview</h2>
                        <div class="progress-card">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${linearProgress.totalProgress}%"></div>
                            </div>
                            <div class="progress-stats">
                                <span>${linearProgress.totalProgress}% Complete</span>
                                <span>${linearProgress.completedTasks.length} Tasks Done</span>
                            </div>
                        </div>
                    </div>

                    <div class="charts-section">
                        <h2>Analytics</h2>
                        <div class="chart-grid">
                            <div class="chart-container">
                                <h3>Progress Distribution</h3>
                                <canvas id="progressChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Activity Timeline</h3>
                                <canvas id="activityChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Performance Metrics</h3>
                                <canvas id="performanceChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Issues & Blockers</h3>
                                <canvas id="issuesChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="recommendations-section">
                        <h2>Recommendations</h2>
                        ${meaningfulRecommendations.map(rec => `
                            <div class="recommendation-item ${rec.priority}">
                                <div class="recommendation-action">${rec.action}</div>
                                <div class="recommendation-reason">${rec.reason}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="action-buttons">
                        <button class="action-button" onclick="vscode.postMessage({command: 'showProgress'})">
                            📊 Progress Details
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'showAccountability'})">
                            📋 Accountability Report
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'showFeasibility'})">
                            🔍 Feasibility Analysis
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'forceLinearProgression'})">
                            ⚡ Force Linear Progression
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'autoAdvance'})">
                            🚀 Auto-Advance to Next Task
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'showActionLog'})">
                            📝 Show Action Log
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'showFailsafeConfig'})">
                            ⚙️ Failsafe Configuration
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Initialize charts with real data
            const chartData = ${JSON.stringify(chartData)};
            
            // Progress Chart
            new Chart(document.getElementById('progressChart'), {
                type: 'doughnut',
                data: chartData.progress,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            // Activity Chart
            new Chart(document.getElementById('activityChart'), {
                type: 'line',
                data: chartData.activity,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Performance Chart
            new Chart(document.getElementById('performanceChart'), {
                type: 'bar',
                data: chartData.performance,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });

            // Issues Chart
            new Chart(document.getElementById('issuesChart'), {
                type: 'pie',
                data: chartData.issues,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        </script>
        `;
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FailSafe Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
            line-height: 1.6;
        }
        
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 24px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 25px;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 18px;
        }
        
        .failsafe-logo {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .failsafe-logo:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
        }
        
        .failsafe-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .mythologiq-logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
        }
        
        .mythologiq-logo:hover {
            transform: scale(1.1);
        }
        
        .header h1 {
            font-size: 2.8em;
            margin-bottom: 8px;
            font-weight: 300;
            letter-spacing: -0.5px;
        }
        
        .header-subtitle {
            font-size: 1em;
            opacity: 0.9;
            font-weight: 400;
        }
        
        .tabs {
            display: flex;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 1px solid #dee2e6;
            position: relative;
        }
        
        .tabs::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #dee2e6, transparent);
        }
        
        .tab {
            flex: 1;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            background: transparent;
            font-size: 1em;
            font-weight: 500;
            color: #6c757d;
            position: relative;
        }
        
        .tab:hover {
            background: rgba(52, 152, 219, 0.1);
            color: #3498db;
        }
        
        .tab.active {
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }
        
        .tab.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3498db, #2ecc71);
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 35px;
        }
        
        .status-card {
            background: white;
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            border-left: 6px solid #3498db;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .status-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #3498db, #2ecc71, #9b59b6);
            opacity: 0.7;
        }
        
        .status-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
        }
        
        .status-card h3 {
            color: #2c3e50;
            margin-bottom: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.2em;
        }
        
        .status-value {
            font-size: 1.4em;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .status-description {
            color: #6c757d;
            font-size: 0.9em;
            line-height: 1.4;
        }

        .charts-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 25px;
            margin-bottom: 35px;
        }
        
        .chart-container {
            background: white;
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .chart-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #3498db, #2ecc71, #9b59b6, #e74c3c);
            opacity: 0.7;
        }
        
        .chart-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .chart-title {
            font-weight: 600;
            color: #2c3e50;
            font-size: 1.1em;
        }
        
        .chart-controls {
            display: flex;
            gap: 10px;
        }
        
        .chart-controls select {
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            background: white;
            font-size: 0.9em;
            cursor: pointer;
        }
        
        .chart-canvas {
            width: 100%;
            height: 300px;
            position: relative;
        }
        
        .recommendations-section {
            background: white;
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            margin-bottom: 25px;
        }
        
        .recommendations-section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .recommendation-item {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
            transition: all 0.3s ease;
        }
        
        .recommendation-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .recommendation-item.high {
            border-left-color: #e74c3c;
            background: #fdf2f2;
        }
        
        .recommendation-item.medium {
            border-left-color: #f39c12;
            background: #fef9e7;
        }
        
        .recommendation-item.low {
            border-left-color: #27ae60;
            background: #f0f9f0;
        }
        
        .recommendation-action {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .recommendation-reason {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }
        
        .action-button {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 500;
            font-size: 0.95em;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .action-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .action-button:hover::before {
            left: 100%;
        }
        
        .action-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
            background: linear-gradient(135deg, #2980b9, #1f5f8b);
        }
        
        .action-button:active {
            transform: translateY(-1px);
        }
        
        .plan-status {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border-left-color: #28a745;
        }
        
        .plan-status.invalid {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border-left-color: #dc3545;
        }
        
        .plan-status.warning {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
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
            box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);
        }
        
        .testing-section .action-button:hover {
            background: linear-gradient(135deg, #8e44ad, #7d3c98);
            box-shadow: 0 8px 25px rgba(155, 89, 182, 0.4);
        }
        
        .config-section {
            border-left-color: #f39c12;
            background: linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%);
        }
        
        .config-section h2 {
            color: #d68910;
        }
        
        .config-section .action-button {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
        }
        
        .config-section .action-button:hover {
            background: linear-gradient(135deg, #e67e22, #d35400);
            box-shadow: 0 8px 25px rgba(243, 156, 18, 0.4);
        }
        
        .integration-section {
            background: #e3f2fd;
            border-color: #2196F3;
        }
        
        .integration-section h2 {
            color: #1976D2;
        }
        
        .integration-section .action-button {
            background: linear-gradient(135deg, #2196F3, #1976D2);
        }
    </style>
</head>
<body>
    ${content}
    <script>
        const vscode = acquireVsCodeApi();
        
        function startTask(taskId) {
            vscode.postMessage({ command: 'startTask', taskId: taskId });
        }
        
        function completeTask(taskId) {
            vscode.postMessage({ command: 'completeTask', taskId: taskId });
        }
        
        function blockTask(taskId) {
            const reason = prompt('Enter reason for blocking task:');
            if (reason) {
                vscode.postMessage({ command: 'blockTask', taskId: taskId, reason: reason });
            }
        }
        
        function unblockTask(taskId) {
            vscode.postMessage({ command: 'unblockTask', taskId: taskId });
        }
        
        function openProjectManagerExtension() {
            vscode.postMessage({ command: 'openProjectManagerExtension' });
        }
    </script>
</body>
</html>
`;
    }
    async showProjectPlan() {
        try {
            const panel = vscode.window.createWebviewPanel('projectPlan', 'FailSafe Project Plan', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            const content = `
                <div class="project-plan-container">
                    <h1>Project Plan</h1>
                    <div class="plan-content">
                        <p>Project plan content will be displayed here.</p>
                    </div>
                </div>
            `;
            panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FailSafe Project Plan</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .project-plan-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        
        .plan-content {
            padding: 20px;
        }
        
        .action-button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s ease;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    ${content}
    <script>
        const vscode = acquireVsCodeApi();
        
        function startTask(taskId) {
            vscode.postMessage({ command: 'startTask', taskId: taskId });
        }
        
        function completeTask(taskId) {
            vscode.postMessage({ command: 'completeTask', taskId: taskId });
        }
        
        function blockTask(taskId) {
            const reason = prompt('Enter reason for blocking task:');
            if (reason) {
                vscode.postMessage({ command: 'blockTask', taskId: taskId, reason: reason });
            }
        }
        
        function unblockTask(taskId) {
            vscode.postMessage({ command: 'unblockTask', taskId: taskId });
        }
        
        function openProjectManagerExtension() {
            vscode.postMessage({ command: 'openProjectManagerExtension' });
        }
    </script>
</body>
</html>
`;
            panel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'startTask':
                        await this.projectPlan.startTask(msg.taskId);
                        panel.dispose();
                        this.showProjectPlan();
                        break;
                    case 'completeTask':
                        await this.projectPlan.completeTask(msg.taskId);
                        panel.dispose();
                        this.showProjectPlan();
                        break;
                    case 'blockTask':
                        await this.projectPlan.blockTask(msg.taskId, msg.reason);
                        panel.dispose();
                        this.showProjectPlan();
                        break;
                    case 'unblockTask':
                        await this.projectPlan.unblockTask(msg.taskId);
                        panel.dispose();
                        this.showProjectPlan();
                        break;
                    case 'openProjectManagerExtension':
                        vscode.window.showInformationMessage('Professional Project Manager extension provides advanced PMP-compliant project management features. ' +
                            'Visit the marketplace to learn more and install the extension.');
                        break;
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to show project plan: ' + error);
        }
    }
    async generateDashboard() {
        const dashboard = this.getDashboardData();
        const planValidation = {
            status: 'in_progress',
            ruleResults: ['Dashboard validation passed'],
            llmResults: { score: 85, grade: 'B+', summary: 'Dashboard is well-structured', suggestions: ['Add more metrics'] },
            recommendations: ['Continue development'],
            llmIsCurrent: true,
            llmTimestamp: new Date()
        };
        return await this.generateWebviewContent(dashboard, planValidation);
    }
    async generateChartData(dashboard, planValidation) {
        try {
            // Update action log in chart data service
            this.chartDataService.setActionLog(this.actionLog);
            // Get real data from chart data service
            const [progressData, activityData, performanceData, issuesData] = await Promise.all([
                this.chartDataService.getProgressData(),
                this.chartDataService.getActivityData(7),
                this.chartDataService.getPerformanceData(),
                this.chartDataService.getIssuesData()
            ]);
            return {
                progress: progressData,
                activity: activityData,
                performance: performanceData,
                issues: issuesData
            };
        }
        catch (error) {
            this.logger.error('Failed to generate chart data:', error);
            // Fallback to default data
            return this.getDefaultChartData(dashboard);
        }
    }
    getDefaultChartData(dashboard) {
        const { linearProgress } = dashboard;
        // Progress Chart Data
        const progressData = {
            labels: ['Completed', 'In Progress', 'Blocked', 'Not Started'],
            datasets: [{
                    data: [
                        linearProgress.completedTasks.length,
                        linearProgress.currentTask ? 1 : 0,
                        linearProgress.blockedTasks.length,
                        Math.max(0, this.getPlanTaskCount() - linearProgress.completedTasks.length - (linearProgress.currentTask ? 1 : 0) - linearProgress.blockedTasks.length)
                    ],
                    backgroundColor: [
                        '#28a745', // Green for completed
                        '#ffc107', // Yellow for in progress
                        '#dc3545', // Red for blocked
                        '#6c757d' // Gray for not started
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
        };
        // Activity Timeline Data (last 7 days)
        const activityLabels = [];
        const activityData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            activityLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            activityData.push(0); // Default to 0 instead of random data
        }
        const activityChartData = {
            labels: activityLabels,
            datasets: [{
                    label: 'Actions Performed',
                    data: activityData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
        };
        // Performance Metrics Data
        const performanceData = {
            labels: ['Completion Rate', 'Efficiency', 'Accuracy', 'Timeliness'],
            datasets: [{
                    label: 'Performance Score (%)',
                    data: [
                        Math.min(100, (linearProgress.completedTasks.length / Math.max(1, this.getPlanTaskCount())) * 100),
                        85, // Default efficiency
                        90, // Default accuracy
                        80 // Default timeliness
                    ],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(241, 196, 15, 0.8)'
                    ],
                    borderColor: [
                        '#3498db',
                        '#2ecc71',
                        '#9b59b6',
                        '#f1c40f'
                    ],
                    borderWidth: 1
                }]
        };
        // Issues & Blockers Data
        const issuesData = {
            labels: ['Technical Issues', 'Dependencies', 'Resource Constraints', 'Requirements Changes'],
            datasets: [{
                    data: [
                        linearProgress.blockedTasks.filter(t => t.blockers.some(b => b.includes('technical'))).length,
                        linearProgress.blockedTasks.filter(t => t.blockers.some(b => b.includes('dependency'))).length,
                        linearProgress.blockedTasks.filter(t => t.blockers.some(b => b.includes('resource'))).length,
                        linearProgress.blockedTasks.filter(t => t.blockers.some(b => b.includes('requirement'))).length
                    ],
                    backgroundColor: [
                        '#e74c3c',
                        '#f39c12',
                        '#9b59b6',
                        '#34495e'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
        };
        return {
            progress: progressData,
            activity: activityChartData,
            performance: performanceData,
            issues: issuesData
        };
    }
    getPlanTaskCount() {
        return this.projectPlan.getAllTasks().length;
    }
    async showProgressDetails() {
        try {
            const panel = vscode.window.createWebviewPanel('progressDetails', 'FailSafe Progress Details', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            const dashboard = this.getDashboardData();
            const progress = this.projectPlan.getProjectProgress();
            const linearState = this.projectPlan.getLinearProgressState();
            const accountability = this.projectPlan.getAccountabilityReport();
            const content = `
                <div class="progress-details-container">
                    <h1>📊 Progress Analysis</h1>
                    
                    <div class="progress-overview">
                        <div class="progress-card">
                            <h2>Overall Progress</h2>
                            <div class="progress-bar-large">
                                <div class="progress-fill" style="width: ${progress.progressPercentage}%"></div>
                            </div>
                            <div class="progress-stats">
                                <div class="stat">
                                    <span class="stat-value">${progress.progressPercentage}%</span>
                                    <span class="stat-label">Complete</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">${progress.completedTasks}</span>
                                    <span class="stat-label">Tasks Done</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">${progress.totalTasks}</span>
                                    <span class="stat-label">Total Tasks</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="task-breakdown">
                        <h2>Task Status Breakdown</h2>
                        <div class="task-grid">
                            <div class="task-status-card completed">
                                <h3>✅ Completed</h3>
                                <div class="task-count">${progress.completedTasks}</div>
                                <div class="task-list">
                                    ${linearState.completedTasks.map(task => `
                                        <div class="task-item">
                                            <span class="task-name">${task.name}</span>
                                            <span class="task-duration">${task.estimatedDuration}min</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="task-status-card in-progress">
                                <h3>🔄 In Progress</h3>
                                <div class="task-count">${progress.inProgressTasks}</div>
                                <div class="task-list">
                                    ${linearState.currentTask ? `
                                        <div class="task-item current">
                                            <span class="task-name">${linearState.currentTask.name}</span>
                                            <span class="task-duration">${linearState.currentTask.estimatedDuration}min</span>
                                        </div>
                                    ` : '<div class="no-tasks">No tasks in progress</div>'}
                                </div>
                            </div>
                            
                            <div class="task-status-card blocked">
                                <h3>🚫 Blocked</h3>
                                <div class="task-count">${progress.blockedTasks}</div>
                                <div class="task-list">
                                    ${linearState.blockedTasks.map(task => `
                                        <div class="task-item">
                                            <span class="task-name">${task.name}</span>
                                            <span class="task-blockers">${task.blockers.join(', ')}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="task-status-card pending">
                                <h3>⏳ Pending</h3>
                                <div class="task-count">${progress.totalTasks - progress.completedTasks - progress.inProgressTasks - progress.blockedTasks}</div>
                                <div class="task-list">
                                    ${linearState.nextTask ? `
                                        <div class="task-item next">
                                            <span class="task-name">${linearState.nextTask.name}</span>
                                            <span class="task-duration">${linearState.nextTask.estimatedDuration}min</span>
                                        </div>
                                    ` : '<div class="no-tasks">No pending tasks</div>'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="time-analysis">
                        <h2>⏱️ Time Analysis</h2>
                        <div class="time-grid">
                            <div class="time-card">
                                <h3>Estimated Remaining</h3>
                                <div class="time-value">${Math.round(progress.estimatedRemainingTime / 60)} hours</div>
                                <div class="time-detail">${progress.estimatedRemainingTime} minutes</div>
                            </div>
                            
                            <div class="time-card">
                                <h3>Current Task Duration</h3>
                                <div class="time-value">${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60) : 0} hours</div>
                                <div class="time-detail">${accountability.currentTaskDuration || 0} minutes</div>
                            </div>
                            
                            <div class="time-card">
                                <h3>Last Activity</h3>
                                <div class="time-value">${Math.round(accountability.timeSinceLastActivity / 60)} min ago</div>
                                <div class="time-detail">${accountability.lastActivity.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div class="deviations-section">
                        <h2>⚠️ Deviations & Issues</h2>
                        <div class="deviations-list">
                            ${linearState.deviations.length > 0 ?
                linearState.deviations.map(deviation => `
                                    <div class="deviation-item">
                                        <span class="deviation-icon">⚠️</span>
                                        <span class="deviation-text">${deviation}</span>
                                    </div>
                                `).join('') :
                '<div class="no-deviations">No deviations detected</div>'}
                        </div>
                    </div>

                    <div class="recommendations-section">
                        <h2>💡 Recommendations</h2>
                        <div class="recommendations-list">
                            ${accountability.recommendations.map(rec => `
                                <div class="recommendation-item">
                                    <span class="recommendation-icon">💡</span>
                                    <span class="recommendation-text">${rec}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Progress Details</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        
        .progress-details-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 30px;
            text-align: center;
            font-size: 2em;
        }
        
        h2 {
            color: #2c3e50;
            margin: 30px 0 20px 0;
            padding: 0 30px;
            font-size: 1.5em;
        }
        
        .progress-overview {
            padding: 30px;
        }
        
        .progress-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid #3498db;
        }
        
        .progress-bar-large {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        
        .progress-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            display: block;
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .task-breakdown {
            padding: 0 30px 30px;
        }
        
        .task-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .task-status-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid;
        }
        
        .task-status-card.completed {
            border-left-color: #28a745;
        }
        
        .task-status-card.in-progress {
            border-left-color: #ffc107;
        }
        
        .task-status-card.blocked {
            border-left-color: #dc3545;
        }
        
        .task-status-card.pending {
            border-left-color: #6c757d;
        }
        
        .task-status-card h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
        }
        
        .task-count {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .task-list {
            max-height: 200px;
            overflow-y: auto;
        }
        
        .task-item {
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f4;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .task-item.current {
            background: #fff3cd;
            border-radius: 6px;
            padding: 8px;
            margin: 4px 0;
        }
        
        .task-item.next {
            background: #e3f2fd;
            border-radius: 6px;
            padding: 8px;
            margin: 4px 0;
        }
        
        .task-name {
            font-weight: 500;
        }
        
        .task-duration, .task-blockers {
            font-size: 0.9em;
            color: #6c757d;
        }
        
        .no-tasks {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        .time-analysis {
            padding: 0 30px 30px;
        }
        
        .time-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .time-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
        }
        
        .time-card h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
            font-size: 1.1em;
        }
        
        .time-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        
        .time-detail {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .deviations-section, .recommendations-section {
            padding: 0 30px 30px;
        }
        
        .deviations-list, .recommendations-list {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .deviation-item, .recommendation-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .deviation-item:last-child, .recommendation-item:last-child {
            border-bottom: none;
        }
        
        .deviation-icon, .recommendation-icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        
        .deviation-text, .recommendation-text {
            flex: 1;
        }
        
        .no-deviations {
            text-align: center;
            color: #28a745;
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
`;
        }
        catch (error) {
            this.logger.error('Failed to show progress details:', error);
            vscode.window.showErrorMessage('Failed to show progress details: ' + error);
        }
    }
    async showAccountabilityReport() {
        try {
            const panel = vscode.window.createWebviewPanel('accountabilityReport', 'FailSafe Accountability Report', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            const accountability = this.projectPlan.getAccountabilityReport();
            const currentTask = this.projectPlan.getCurrentTask();
            const overdueTasks = accountability.overdueTasks;
            const actionLog = this.actionLog;
            const content = `
                <div class="accountability-container">
                    <h1>📋 Accountability Report</h1>
                    
                    <div class="current-status">
                        <h2>Current Status</h2>
                        <div class="status-grid">
                            <div class="status-card">
                                <h3>🕐 Last Activity</h3>
                                <div class="status-value">${Math.round(accountability.timeSinceLastActivity / 60)} minutes ago</div>
                                <div class="status-detail">${accountability.lastActivity.toLocaleString()}</div>
                            </div>
                            
                            <div class="status-card">
                                <h3>⏱️ Current Task Duration</h3>
                                <div class="status-value">${accountability.currentTaskDuration ? Math.round(accountability.currentTaskDuration / 60) : 0} hours</div>
                                <div class="status-detail">${accountability.currentTaskDuration || 0} minutes</div>
                            </div>
                            
                            <div class="status-card">
                                <h3>🚨 Overdue Tasks</h3>
                                <div class="status-value ${overdueTasks.length > 0 ? 'warning' : 'success'}">${overdueTasks.length}</div>
                                <div class="status-detail">${overdueTasks.length > 0 ? 'Action required' : 'All tasks on time'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="current-task-section">
                        <h2>Current Task</h2>
                        <div class="task-detail-card">
                            ${currentTask ? `
                                <div class="task-header">
                                    <h3>${currentTask.name}</h3>
                                    <span class="task-priority ${currentTask.priority}">${currentTask.priority.toUpperCase()}</span>
                                </div>
                                <p class="task-description">${currentTask.description}</p>
                                <div class="task-metrics">
                                    <div class="metric">
                                        <span class="metric-label">Estimated Duration:</span>
                                        <span class="metric-value">${currentTask.estimatedDuration} minutes</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-label">Actual Duration:</span>
                                        <span class="metric-value">${currentTask.actualDuration || 0} minutes</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-label">Start Time:</span>
                                        <span class="metric-value">${currentTask.startTime?.toLocaleString() || 'Not started'}</span>
                                    </div>
                                </div>
                            ` : `
                                <div class="no-task">
                                    <h3>No Active Task</h3>
                                    <p>No task is currently in progress. Consider starting the next task in your project plan.</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="overdue-tasks-section">
                        <h2>🚨 Overdue Tasks</h2>
                        <div class="overdue-tasks-list">
                            ${overdueTasks.length > 0 ?
                overdueTasks.map(task => `
                                    <div class="overdue-task-item">
                                        <div class="task-info">
                                            <h4>${task.name}</h4>
                                            <p>${task.description}</p>
                                        </div>
                                        <div class="task-overdue">
                                            <span class="overdue-badge">OVERDUE</span>
                                            <span class="overdue-time">${task.dueDate ? Math.round((new Date().getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0} days</span>
                                        </div>
                                    </div>
                                `).join('') :
                '<div class="no-overdue">No overdue tasks - great job staying on schedule!</div>'}
                        </div>
                    </div>

                    <div class="activity-log-section">
                        <h2>📝 Recent Activity Log</h2>
                        <div class="activity-log">
                            ${actionLog.length > 0 ?
                actionLog.slice(-10).reverse().map(log => `
                                    <div class="activity-item">
                                        <div class="activity-time">${new Date(log.timestamp).toLocaleString()}</div>
                                        <div class="activity-description">${log.description}</div>
                                    </div>
                                `).join('') :
                '<div class="no-activity">No recent activity logged</div>'}
                        </div>
                    </div>

                    <div class="recommendations-section">
                        <h2>💡 Recommendations</h2>
                        <div class="recommendations-list">
                            ${accountability.recommendations.map(rec => `
                                <div class="recommendation-item">
                                    <span class="recommendation-icon">💡</span>
                                    <span class="recommendation-text">${rec}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="action-button" onclick="vscode.postMessage({command: 'startNextTask'})">
                            🚀 Start Next Task
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'markCurrentComplete'})">
                            ✅ Mark Current Complete
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'logActivity'})">
                            📝 Log Activity
                        </button>
                    </div>
                </div>
            `;
            panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accountability Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        
        .accountability-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 30px;
            text-align: center;
            font-size: 2em;
        }
        
        h2 {
            color: #2c3e50;
            margin: 30px 0 20px 0;
            padding: 0 30px;
            font-size: 1.5em;
        }
        
        .current-status {
            padding: 0 30px;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
            text-align: center;
        }
        
        .status-card h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
            font-size: 1.1em;
        }
        
        .status-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        
        .status-value.warning {
            color: #e74c3c;
        }
        
        .status-value.success {
            color: #27ae60;
        }
        
        .status-detail {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .current-task-section {
            padding: 0 30px;
        }
        
        .task-detail-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
        }
        
        .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .task-header h3 {
            margin: 0;
            color: #2c3e50;
        }
        
        .task-priority {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .task-priority.high {
            background: #f8d7da;
            color: #721c24;
        }
        
        .task-priority.medium {
            background: #fff3cd;
            color: #856404;
        }
        
        .task-priority.low {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .task-priority.critical {
            background: #f5c6cb;
            color: #721c24;
        }
        
        .task-description {
            color: #6c757d;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .task-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .metric-label {
            font-weight: 500;
            color: #2c3e50;
        }
        
        .metric-value {
            color: #3498db;
            font-weight: 600;
        }
        
        .no-task {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        .overdue-tasks-section {
            padding: 0 30px;
        }
        
        .overdue-tasks-list {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .overdue-task-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #f1f3f4;
            background: #fff5f5;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .overdue-task-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .task-info h4 {
            margin: 0 0 5px 0;
            color: #2c3e50;
        }
        
        .task-info p {
            margin: 0;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .task-overdue {
            text-align: right;
        }
        
        .overdue-badge {
            display: block;
            background: #e74c3c;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .overdue-time {
            color: #e74c3c;
            font-weight: 600;
        }
        
        .no-overdue {
            text-align: center;
            color: #27ae60;
            font-style: italic;
            padding: 20px;
        }
        
        .activity-log-section {
            padding: 0 30px;
        }
        
        .activity-log {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-height: 300px;
            overflow-y: auto;
        }
        
        .activity-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-time {
            color: #6c757d;
            font-size: 0.9em;
            min-width: 150px;
        }
        
        .activity-description {
            flex: 1;
            margin-left: 15px;
        }
        
        .no-activity {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 20px;
        }
        
        .recommendations-section {
            padding: 0 30px;
        }
        
        .recommendations-list {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .recommendation-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .recommendation-item:last-child {
            border-bottom: none;
        }
        
        .recommendation-icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        
        .recommendation-text {
            flex: 1;
        }
        
        .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 30px;
        }
        
        .action-button {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
`;
            panel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'startNextTask':
                        // Implementation for starting next task
                        vscode.window.showInformationMessage('Starting next task...');
                        break;
                    case 'markCurrentComplete':
                        // Implementation for marking current task complete
                        vscode.window.showInformationMessage('Marking current task complete...');
                        break;
                    case 'logActivity':
                        // Implementation for logging activity
                        vscode.window.showInformationMessage('Logging activity...');
                        break;
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to show accountability report:', error);
            vscode.window.showErrorMessage('Failed to show accountability report: ' + error);
        }
    }
    async showFeasibilityAnalysis() {
        try {
            const panel = vscode.window.createWebviewPanel('feasibilityAnalysis', 'FailSafe Feasibility Analysis', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            const feasibility = this.projectPlan.analyzeFeasibility();
            const currentTask = this.projectPlan.getCurrentTask();
            const linearState = this.projectPlan.getLinearProgressState();
            const content = `
                <div class="feasibility-container">
                    <h1>🔍 Feasibility Analysis</h1>
                    
                    <div class="feasibility-overview">
                        <div class="feasibility-status ${feasibility.feasibility}">
                            <h2>Overall Feasibility</h2>
                            <div class="status-indicator">
                                <span class="status-icon">
                                    ${feasibility.feasibility === 'feasible' ? '✅' :
                feasibility.feasibility === 'questionable' ? '⚠️' : '❌'}
                                </span>
                                <span class="status-text">${feasibility.feasibility.toUpperCase()}</span>
                            </div>
                            <div class="impact-level">
                                <span class="impact-label">Estimated Impact:</span>
                                <span class="impact-value ${feasibility.estimatedImpact}">${feasibility.estimatedImpact.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="blockers-section">
                        <h2>🚫 Current Blockers</h2>
                        <div class="blockers-list">
                            ${feasibility.isBlocked ?
                feasibility.blockers.map(blocker => `
                                    <div class="blocker-item">
                                        <span class="blocker-icon">🚫</span>
                                        <span class="blocker-text">${blocker}</span>
                                    </div>
                                `).join('') :
                '<div class="no-blockers">No blockers detected - project is proceeding smoothly!</div>'}
                        </div>
                    </div>

                    <div class="task-analysis">
                        <h2>📋 Task Analysis</h2>
                        <div class="task-analysis-grid">
                            <div class="analysis-card">
                                <h3>Current Task</h3>
                                ${currentTask ? `
                                    <div class="task-analysis-item">
                                        <div class="task-name">${currentTask.name}</div>
                                        <div class="task-status ${currentTask.status}">${currentTask.status}</div>
                                        <div class="task-dependencies">
                                            <span class="dependencies-label">Dependencies:</span>
                                            <span class="dependencies-count">${currentTask.dependencies.length}</span>
                                        </div>
                                        <div class="task-blockers">
                                            <span class="blockers-label">Blockers:</span>
                                            <span class="blockers-count">${currentTask.blockers.length}</span>
                                        </div>
                                    </div>
                                ` : `
                                    <div class="no-current-task">
                                        <p>No task is currently active</p>
                                    </div>
                                `}
                            </div>
                            
                            <div class="analysis-card">
                                <h3>Blocked Tasks</h3>
                                <div class="blocked-tasks-count">${linearState.blockedTasks.length}</div>
                                <div class="blocked-tasks-list">
                                    ${linearState.blockedTasks.map(task => `
                                        <div class="blocked-task-item">
                                            <span class="task-name">${task.name}</span>
                                            <span class="blocker-count">${task.blockers.length} blockers</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>Next Task</h3>
                                ${linearState.nextTask ? `
                                    <div class="next-task-item">
                                        <div class="task-name">${linearState.nextTask.name}</div>
                                        <div class="task-readiness">
                                            <span class="readiness-label">Readiness:</span>
                                            <span class="readiness-status ${linearState.nextTask.dependencies.length === 0 ? 'ready' : 'waiting'}">
                                                ${linearState.nextTask.dependencies.length === 0 ? 'Ready' : 'Waiting'}
                                            </span>
                                        </div>
                                    </div>
                                ` : `
                                    <div class="no-next-task">
                                        <p>No next task identified</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <div class="recommendations-section">
                        <h2>💡 Recommendations</h2>
                        <div class="recommendations-list">
                            ${feasibility.recommendations.map(rec => `
                                <div class="recommendation-item">
                                    <span class="recommendation-icon">💡</span>
                                    <span class="recommendation-text">${rec}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="action-button" onclick="vscode.postMessage({command: 'resolveBlockers'})">
                            🔧 Resolve Blockers
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'skipBlockedTask'})">
                            ⏭️ Skip Blocked Task
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'reprioritizeTasks'})">
                            🔄 Reprioritize Tasks
                        </button>
                        <button class="action-button" onclick="vscode.postMessage({command: 'requestHelp'})">
                            🆘 Request Help
                        </button>
                    </div>
                </div>
            `;
            panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feasibility Analysis</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        
        .feasibility-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 30px;
            text-align: center;
            font-size: 2em;
        }
        
        h2 {
            color: #2c3e50;
            margin: 30px 0 20px 0;
            padding: 0 30px;
            font-size: 1.5em;
        }
        
        .feasibility-overview {
            padding: 0 30px;
        }
        
        .feasibility-status {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
            text-align: center;
        }
        
        .feasibility-status.feasible {
            border-left: 4px solid #28a745;
        }
        
        .feasibility-status.questionable {
            border-left: 4px solid #ffc107;
        }
        
        .feasibility-status.infeasible {
            border-left: 4px solid #dc3545;
        }
        
        .status-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        }
        
        .status-icon {
            font-size: 3em;
        }
        
        .status-text {
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .impact-level {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .impact-label {
            color: #6c757d;
            font-weight: 500;
        }
        
        .impact-value {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .impact-value.low {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .impact-value.medium {
            background: #fff3cd;
            color: #856404;
        }
        
        .impact-value.high {
            background: #f8d7da;
            color: #721c24;
        }
        
        .blockers-section {
            padding: 0 30px;
        }
        
        .blockers-list {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .blocker-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #f1f3f4;
            background: #fff5f5;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .blocker-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .blocker-icon {
            margin-right: 15px;
            font-size: 1.5em;
        }
        
        .blocker-text {
            flex: 1;
            font-weight: 500;
        }
        
        .no-blockers {
            text-align: center;
            color: #28a745;
            font-style: italic;
            padding: 20px;
        }
        
        .task-analysis {
            padding: 0 30px;
        }
        
        .task-analysis-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .analysis-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
        }
        
        .analysis-card h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
            font-size: 1.2em;
        }
        
        .task-analysis-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .task-name {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .task-status {
            font-weight: 500;
            color: #6c757d;
        }
        
        .task-dependencies, .task-blockers {
            font-size: 0.9em;
            color: #6c757d;
        }
        
        .no-current-task, .no-next-task {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        .recommendations-section {
            padding: 0 30px;
        }
        
        .recommendations-list {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .recommendation-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .recommendation-item:last-child {
            border-bottom: none;
        }
        
        .recommendation-icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        
        .recommendation-text {
            flex: 1;
        }
        
        .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 30px;
        }
        
        .action-button {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
`;
            panel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'resolveBlockers':
                        // Implementation for resolving blockers
                        vscode.window.showInformationMessage('Resolving blockers...');
                        break;
                    case 'skipBlockedTask':
                        // Implementation for skipping blocked task
                        vscode.window.showInformationMessage('Skipping blocked task...');
                        break;
                    case 'reprioritizeTasks':
                        // Implementation for reprioritizing tasks
                        vscode.window.showInformationMessage('Reprioritizing tasks...');
                        break;
                    case 'requestHelp':
                        // Implementation for requesting help
                        vscode.window.showInformationMessage('Requesting help...');
                        break;
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to show feasibility analysis:', error);
            vscode.window.showErrorMessage('Failed to show feasibility analysis: ' + error);
        }
    }
    async forceLinearProgression() {
        try {
            // Get current state
            const currentTask = this.projectPlan.getCurrentTask();
            const linearState = this.projectPlan.getLinearProgressState();
            const readyTasks = this.projectPlan.getReadyTasks();
            if (!currentTask && readyTasks.length > 0) {
                // No current task, start the first ready task
                const nextTask = readyTasks[0];
                await this.projectPlan.startTask(nextTask.id);
                this.actionLog.push({
                    timestamp: new Date().toISOString(),
                    description: `Forced linear progression: Started task "${nextTask.name}"`
                });
                vscode.window.showInformationMessage(`Started task: ${nextTask.name}`);
                this.refreshSidebar();
            }
            else if (currentTask && currentTask.status === 'blocked') {
                // Current task is blocked, try to unblock it
                if (currentTask.blockers.length > 0) {
                    const blocker = currentTask.blockers[0];
                    await this.projectPlan.unblockTask(currentTask.id);
                    this.actionLog.push({
                        timestamp: new Date().toISOString(),
                        description: `Forced linear progression: Unblocked task "${currentTask.name}"`
                    });
                    vscode.window.showInformationMessage(`Unblocked task: ${currentTask.name}`);
                    this.refreshSidebar();
                }
            }
            else if (currentTask && currentTask.status === 'in_progress') {
                // Check if current task should be completed
                const estimatedDuration = currentTask.estimatedDuration || 0;
                const actualDuration = currentTask.actualDuration || 0;
                if (actualDuration >= estimatedDuration * 1.2) { // 20% over estimated time
                    const shouldComplete = await vscode.window.showInformationMessage(`Task "${currentTask.name}" has exceeded estimated duration. Mark as complete?`, 'Yes', 'No');
                    if (shouldComplete === 'Yes') {
                        await this.projectPlan.completeTask(currentTask.id);
                        this.actionLog.push({
                            timestamp: new Date().toISOString(),
                            description: `Forced linear progression: Completed task "${currentTask.name}"`
                        });
                        vscode.window.showInformationMessage(`Completed task: ${currentTask.name}`);
                        this.refreshSidebar();
                    }
                }
                else {
                    vscode.window.showInformationMessage(`Task "${currentTask.name}" is still within estimated duration.`);
                }
            }
            else {
                vscode.window.showInformationMessage('No action needed for linear progression at this time.');
            }
        }
        catch (error) {
            this.logger.error('Failed to force linear progression:', error);
            vscode.window.showErrorMessage('Failed to force linear progression: ' + error);
        }
    }
    async autoAdvanceToNextTask() {
        try {
            const currentTask = this.projectPlan.getCurrentTask();
            const linearState = this.projectPlan.getLinearProgressState();
            const readyTasks = this.projectPlan.getReadyTasks();
            if (currentTask && currentTask.status === 'in_progress') {
                // Check if current task should be completed
                const estimatedDuration = currentTask.estimatedDuration || 0;
                const actualDuration = currentTask.actualDuration || 0;
                if (actualDuration >= estimatedDuration) {
                    // Complete current task
                    await this.projectPlan.completeTask(currentTask.id);
                    this.actionLog.push({
                        timestamp: new Date().toISOString(),
                        description: `Auto-advance: Completed task "${currentTask.name}"`
                    });
                    vscode.window.showInformationMessage(`Completed task: ${currentTask.name}`);
                }
                else {
                    vscode.window.showInformationMessage(`Task "${currentTask.name}" is still in progress (${actualDuration}/${estimatedDuration} minutes)`);
                    return;
                }
            }
            // Find next task to start
            let nextTask = null;
            // First, try to start the next task in linear progression
            if (linearState.nextTask && this.projectPlan.canStartTask(linearState.nextTask.id).canStart) {
                nextTask = linearState.nextTask;
            }
            else if (readyTasks.length > 0) {
                // If no next task in linear progression, find any ready task
                nextTask = readyTasks[0];
            }
            if (nextTask) {
                await this.projectPlan.startTask(nextTask.id);
                this.actionLog.push({
                    timestamp: new Date().toISOString(),
                    description: `Auto-advance: Started task "${nextTask.name}"`
                });
                vscode.window.showInformationMessage(`Auto-advanced to task: ${nextTask.name}`);
                this.refreshSidebar();
            }
            else {
                vscode.window.showInformationMessage('No ready tasks available for auto-advance.');
            }
        }
        catch (error) {
            this.logger.error('Failed to auto-advance to next task:', error);
            vscode.window.showErrorMessage('Failed to auto-advance to next task: ' + error);
        }
    }
    async showActionLog() {
        try {
            const panel = vscode.window.createWebviewPanel('actionLog', 'FailSafe Action Log', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            const actionLog = this.actionLog;
            const totalActions = actionLog.length;
            const todayActions = actionLog.filter(log => {
                const logDate = new Date(log.timestamp);
                const today = new Date();
                return logDate.toDateString() === today.toDateString();
            }).length;
            const content = `
                <div class="action-log-container">
                    <h1>📝 Action Log</h1>
                    
                    <div class="log-stats">
                        <div class="stat-card">
                            <h3>Total Actions</h3>
                            <div class="stat-value">${totalActions}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Today's Actions</h3>
                            <div class="stat-value">${todayActions}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Last Activity</h3>
                            <div class="stat-value">${actionLog.length > 0 ? new Date(actionLog[actionLog.length - 1].timestamp).toLocaleString() : 'None'}</div>
                        </div>
                    </div>

                    <div class="log-controls">
                        <button class="control-button" onclick="vscode.postMessage({command: 'clearLog'})">
                            🗑️ Clear Log
                        </button>
                        <button class="control-button" onclick="vscode.postMessage({command: 'exportLog'})">
                            📤 Export Log
                        </button>
                        <button class="control-button" onclick="vscode.postMessage({command: 'refreshLog'})">
                            🔄 Refresh
                        </button>
                    </div>

                    <div class="log-filters">
                        <input type="text" id="searchFilter" placeholder="Search actions..." onkeyup="filterLog()">
                        <select id="timeFilter" onchange="filterLog()">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>

                    <div class="action-log-list">
                        ${actionLog.length > 0 ?
                actionLog.slice().reverse().map((log, index) => `
                                <div class="action-item" data-timestamp="${log.timestamp}">
                                    <div class="action-time">${new Date(log.timestamp).toLocaleString()}</div>
                                    <div class="action-description">${log.description}</div>
                                    <div class="action-actions">
                                        <button class="action-btn" onclick="copyToClipboard('${log.description.replace(/'/g, "\\'")}')">
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                            `).join('') :
                '<div class="no-actions">No actions logged yet. Start using FailSafe features to see activity here!</div>'}
                    </div>
                </div>
            `;
            panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Log</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        
        .action-log-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 30px;
            text-align: center;
            font-size: 2em;
        }
        
        .log-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e9ecef;
            text-align: center;
        }
        
        .stat-card h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
            font-size: 1.1em;
        }
        
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #3498db;
        }
        
        .log-controls {
            display: flex;
            gap: 15px;
            padding: 0 30px 20px;
        }
        
        .control-button {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .control-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
        
        .log-filters {
            display: flex;
            gap: 15px;
            padding: 0 30px 20px;
        }
        
        #searchFilter {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }
        
        #timeFilter {
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            background: white;
        }
        
        .action-log-list {
            padding: 0 30px 30px;
            max-height: 600px;
            overflow-y: auto;
        }
        
        .action-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #f1f3f4;
            background: white;
            border-radius: 8px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        }
        
        .action-item:hover {
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transform: translateX(5px);
        }
        
        .action-time {
            min-width: 150px;
            color: #6c757d;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .action-description {
            flex: 1;
            margin: 0 20px;
            line-height: 1.5;
        }
        
        .action-actions {
            min-width: 80px;
        }
        
        .action-btn {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            color: #6c757d;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            transition: all 0.3s ease;
        }
        
        .action-btn:hover {
            background: #e9ecef;
            color: #495057;
        }
        
        .no-actions {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    ${content}
    
    <script>
        function filterLog() {
            const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
            const timeFilter = document.getElementById('timeFilter').value;
            const actionItems = document.querySelectorAll('.action-item');
            
            actionItems.forEach(item => {
                const description = item.querySelector('.action-description').textContent.toLowerCase();
                const timestamp = new Date(item.dataset.timestamp);
                const now = new Date();
                
                let timeMatch = true;
                if (timeFilter === 'today') {
                    timeMatch = timestamp.toDateString() === now.toDateString();
                } else if (timeFilter === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    timeMatch = timestamp >= weekAgo;
                } else if (timeFilter === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    timeMatch = timestamp >= monthAgo;
                }
                
                const searchMatch = description.includes(searchTerm);
                
                if (searchMatch && timeMatch) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }
        
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                // Show a brief notification
                const notification = document.createElement('div');
                notification.textContent = 'Copied to clipboard!';
                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            });
        }
    </script>
</body>
</html>
`;
            panel.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.command) {
                    case 'clearLog': {
                        const shouldClear = await vscode.window.showInformationMessage('Are you sure you want to clear the action log?', 'Yes', 'No');
                        if (shouldClear === 'Yes') {
                            this.actionLog = [];
                            vscode.window.showInformationMessage('Action log cleared');
                            panel.dispose();
                            this.showActionLog();
                        }
                        break;
                    }
                    case 'exportLog':
                        // Implementation for exporting log
                        vscode.window.showInformationMessage('Exporting action log...');
                        break;
                    case 'refreshLog':
                        panel.dispose();
                        this.showActionLog();
                        break;
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to show action log:', error);
            vscode.window.showErrorMessage('Failed to show action log: ' + error);
        }
    }
    async showFailsafeConfigPanel() {
        // Implementation for failsafe config panel
        const panel = vscode.window.createWebviewPanel('failsafeConfig', 'FailSafe Configuration', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>FailSafe Configuration</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .config-section { margin-bottom: 20px; }
                    .config-item { margin: 10px 0; }
                    label { display: block; margin-bottom: 5px; }
                    input, select { width: 100%; padding: 8px; }
                    button { padding: 10px 20px; margin: 5px; }
                </style>
            </head>
            <body>
                <h1>FailSafe Configuration</h1>
                <div class="config-section">
                    <h2>User Failsafes</h2>
                    <div id="failsafes-list">
                        ${this.userFailsafes.map(fs => `
                            <div class="config-item">
                                <label>${fs.name}</label>
                                <p>${fs.description}</p>
                                <input type="checkbox" ${fs.enabled ? 'checked' : ''} disabled>
                                <span>Enabled</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="config-section">
                    <h2>System Status</h2>
                    <p>Status: ${this.statusBarState}</p>
                    <p>Server Port: ${this.serverPort}</p>
                    <p>Events Connected: ${this.eventSource ? 'Yes' : 'No'}</p>
                </div>
            </body>
            </html>
        `;
    }
    async showConsole() {
        const panel = vscode.window.createWebviewPanel('failsafeConsole', 'FailSafe Console', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Get recent requests from the server
        let recentRequests = [];
        try {
            const response = await fetch(`http://localhost:${this.serverPort}/requests?recent=true&limit=200`);
            if (response.ok) {
                const data = await response.json();
                recentRequests = data.requests || [];
            }
        }
        catch (error) {
            this.logger.warn('Failed to fetch recent requests:', error);
        }
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>FailSafe Console</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                    .console-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
                    .action-btn { padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    .action-btn:hover { background: #005a9e; }
                    .action-btn.danger { background: #d73a49; }
                    .action-btn.danger:hover { background: #b31d28; }
                    .requests-section { margin-bottom: 30px; }
                    .requests-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .requests-table th, .requests-table td { padding: 8px; text-align: left; border-bottom: 1px solid #404040; }
                    .requests-table th { background: #2d2d30; font-weight: bold; }
                    .status-200 { color: #4caf50; }
                    .status-4xx, .status-5xx { color: #f44336; }
                    .events-section { margin-top: 30px; }
                    .event-item { padding: 10px; margin: 5px 0; background: #2d2d30; border-radius: 4px; border-left: 4px solid #007acc; }
                    .event-item.validation { border-left-color: #4caf50; }
                    .event-item.error { border-left-color: #f44336; }
                    .event-item.warning { border-left-color: #ff9800; }
                    .toast { position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 4px; color: white; z-index: 1000; }
                    .toast.success { background: #4caf50; }
                    .toast.error { background: #f44336; }
                    .toast.warning { background: #ff9800; }
                </style>
            </head>
            <body>
                <div class="console-header">
                    <h1>🖥️ FailSafe Console</h1>
                    <div class="status-indicator">
                        <span id="connection-status">${this.eventSource ? '🟢 Connected' : '🔴 Disconnected'}</span>
                    </div>
                </div>

                <div class="quick-actions">
                    <button class="action-btn" onclick="validateCurrent()">🔍 Validate Current File</button>
                    <button class="action-btn" onclick="validateAll()">🔍 Validate All Files</button>
                    <button class="action-btn" onclick="getStatus()">📊 Get Status</button>
                    <button class="action-btn" onclick="getDesignDoc()">📋 Get Design Doc</button>
                    <button class="action-btn danger" onclick="clearRequests()">🗑️ Clear Requests</button>
                </div>

                <div class="requests-section">
                    <h2>📋 Recent Requests (Last 200)</h2>
                    <table class="requests-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Method</th>
                                <th>URL</th>
                                <th>Status</th>
                                <th>Response Time</th>
                            </tr>
                        </thead>
                        <tbody id="requests-body">
                            ${recentRequests.map(req => `
                                <tr>
                                    <td>${new Date(req.timestamp).toLocaleTimeString()}</td>
                                    <td>${req.method}</td>
                                    <td>${req.url}</td>
                                    <td class="status-${req.statusCode >= 400 ? '4xx' : req.statusCode >= 500 ? '5xx' : '200'}">${req.statusCode}</td>
                                    <td>${req.responseTime}ms</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="events-section">
                    <h2>📡 Real-time Events</h2>
                    <div id="events-container">
                        ${this.realTimeEvents.map(event => `
                            <div class="event-item ${event.type}">
                                <strong>${event.type.toUpperCase()}</strong> - ${new Date(event.timestamp).toLocaleTimeString()}
                                <br><small>${JSON.stringify(event.data)}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let eventSource = null;

                    // Initialize SSE connection
                    function initSSE() {
                        try {
                            eventSource = new EventSource('http://localhost:${this.serverPort}/events');
                            eventSource.onmessage = function(event) {
                                const data = JSON.parse(event.data);
                                addEvent(data);
                                updateConnectionStatus(true);
                            };
                            eventSource.onerror = function() {
                                updateConnectionStatus(false);
                                setTimeout(initSSE, 5000);
                            };
                        } catch (error) {
                            console.error('SSE connection failed:', error);
                            updateConnectionStatus(false);
                        }
                    }

                    function updateConnectionStatus(connected) {
                        const status = document.getElementById('connection-status');
                        status.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
                        status.style.color = connected ? '#4caf50' : '#f44336';
                    }

                    function addEvent(event) {
                        const container = document.getElementById('events-container');
                        const eventDiv = document.createElement('div');
                        eventDiv.className = \`event-item \${event.type}\`;
                        eventDiv.innerHTML = \`
                            <strong>\${event.type.toUpperCase()}</strong> - \${new Date(event.timestamp).toLocaleTimeString()}
                            <br><small>\${JSON.stringify(event.data)}</small>
                        \`;
                        container.insertBefore(eventDiv, container.firstChild);
                        
                        // Keep only last 50 events
                        while (container.children.length > 50) {
                            container.removeChild(container.lastChild);
                        }
                    }

                    function showToast(message, type = 'success') {
                        const toast = document.createElement('div');
                        toast.className = \`toast \${type}\`;
                        toast.textContent = message;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3000);
                    }

                    async function validateCurrent() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/validate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ files: ['current'] })
                            });
                            const result = await response.json();
                            if (result.status === 'fail') {
                                showToast('Validation failed: ' + result.results.errors.join(', '), 'error');
                            } else {
                                showToast('Validation passed!', 'success');
                            }
                        } catch (error) {
                            showToast('Validation request failed: ' + error.message, 'error');
                        }
                    }

                    async function validateAll() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/validate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ files: ['all'] })
                            });
                            const result = await response.json();
                            if (result.status === 'fail') {
                                showToast('Validation failed: ' + result.results.errors.join(', '), 'error');
                            } else {
                                showToast('All files validated successfully!', 'success');
                            }
                        } catch (error) {
                            showToast('Validation request failed: ' + error.message, 'error');
                        }
                    }

                    async function getStatus() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/status');
                            const result = await response.json();
                            showToast('Status: ' + JSON.stringify(result), 'success');
                        } catch (error) {
                            showToast('Status request failed: ' + error.message, 'error');
                        }
                    }

                    async function getDesignDoc() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/design-doc');
                            const result = await response.text();
                            showToast('Design doc retrieved (' + result.length + ' chars)', 'success');
                        } catch (error) {
                            showToast('Design doc request failed: ' + error.message, 'error');
                        }
                    }

                    async function clearRequests() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/requests', {
                                method: 'DELETE'
                            });
                            const result = await response.json();
                            if (result.success) {
                                showToast('Requests cleared successfully!', 'success');
                                document.getElementById('requests-body').innerHTML = '';
                            } else {
                                showToast('Failed to clear requests', 'error');
                            }
                        } catch (error) {
                            showToast('Clear requests failed: ' + error.message, 'error');
                        }
                    }

                    // Initialize SSE on page load
                    initSSE();
                </script>
            </body>
            </html>
        `;
    }
    async showLogs() {
        const panel = vscode.window.createWebviewPanel('failsafeLogs', 'FailSafe Logs', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>FailSafe Logs</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                    .logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .log-controls { display: flex; gap: 10px; margin-bottom: 20px; }
                    .control-btn { padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    .control-btn:hover { background: #005a9e; }
                    .control-btn.danger { background: #d73a49; }
                    .control-btn.danger:hover { background: #b31d28; }
                    .log-entry { padding: 12px; margin: 8px 0; background: #2d2d30; border-radius: 4px; border-left: 4px solid #007acc; cursor: pointer; transition: background 0.2s; }
                    .log-entry:hover { background: #3d3d40; }
                    .log-entry.info { border-left-color: #007acc; }
                    .log-entry.warning { border-left-color: #ff9800; }
                    .log-entry.error { border-left-color: #f44336; }
                    .log-entry.critical { border-left-color: #9c27b0; }
                    .log-entry.success { border-left-color: #4caf50; }
                    .log-timestamp { color: #888; font-size: 0.9em; }
                    .log-type { font-weight: bold; margin-right: 10px; }
                    .log-message { margin-top: 5px; }
                    .log-data { background: #1e1e1e; padding: 8px; margin-top: 8px; border-radius: 3px; font-family: monospace; font-size: 0.9em; color: #ccc; }
                    .filter-section { margin-bottom: 20px; }
                    .filter-input { padding: 8px; background: #2d2d30; border: 1px solid #404040; color: #d4d4d4; border-radius: 4px; margin-right: 10px; }
                    .toast { position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 4px; color: white; z-index: 1000; }
                    .toast.success { background: #4caf50; }
                    .toast.error { background: #f44336; }
                </style>
            </head>
            <body>
                <div class="logs-header">
                    <h1>📋 FailSafe Logs</h1>
                    <div class="status-indicator">
                        <span id="log-status">🟢 Live Streaming</span>
                    </div>
                </div>

                <div class="filter-section">
                    <input type="text" id="log-filter" class="filter-input" placeholder="Filter logs..." onkeyup="filterLogs()">
                    <select id="severity-filter" class="filter-input" onchange="filterLogs()">
                        <option value="">All Severities</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="critical">Critical</option>
                    </select>
                    <button class="control-btn" onclick="clearLogs()">🗑️ Clear Logs</button>
                    <button class="control-btn" onclick="exportLogs()">📤 Export Logs</button>
                </div>

                <div class="log-controls">
                    <button class="control-btn" onclick="refreshLogs()">🔄 Refresh</button>
                    <button class="control-btn" onclick="toggleAutoScroll()">📌 Toggle Auto-scroll</button>
                    <button class="control-btn danger" onclick="clearAllLogs()">🗑️ Clear All</button>
                </div>

                <div id="logs-container">
                    ${this.actionLog.map(log => `
                        <div class="log-entry info" data-severity="info" data-timestamp="${log.timestamp}">
                            <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                            <div class="log-type">INFO</div>
                            <div class="log-message">${log.description}</div>
                        </div>
                    `).join('')}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let eventSource = null;
                    let autoScroll = true;

                    // Initialize SSE connection for log events
                    function initLogSSE() {
                        try {
                            eventSource = new EventSource('http://localhost:${this.serverPort}/events');
                            eventSource.onmessage = function(event) {
                                const data = JSON.parse(event.data);
                                addLogEntry(data);
                                updateLogStatus(true);
                            };
                            eventSource.onerror = function() {
                                updateLogStatus(false);
                                setTimeout(initLogSSE, 5000);
                            };
                        } catch (error) {
                            console.error('Log SSE connection failed:', error);
                            updateLogStatus(false);
                        }
                    }

                    function updateLogStatus(connected) {
                        const status = document.getElementById('log-status');
                        status.textContent = connected ? '🟢 Live Streaming' : '🔴 Disconnected';
                        status.style.color = connected ? '#4caf50' : '#f44336';
                    }

                    function addLogEntry(event) {
                        const container = document.getElementById('logs-container');
                        const logDiv = document.createElement('div');
                        logDiv.className = \`log-entry \${event.severity}\`;
                        logDiv.setAttribute('data-severity', event.severity);
                        logDiv.setAttribute('data-timestamp', event.timestamp);
                        
                        logDiv.innerHTML = \`
                            <div class="log-timestamp">\${new Date(event.timestamp).toLocaleString()}</div>
                            <div class="log-type">\${event.type.toUpperCase()}</div>
                            <div class="log-message">\${event.data.message || JSON.stringify(event.data)}</div>
                            \${event.data.details ? \`<div class="log-data">\${JSON.stringify(event.data.details, null, 2)}</div>\` : ''}
                        \`;
                        
                        // Add click handler for copy to clipboard
                        logDiv.onclick = function() {
                            copyToClipboard(logDiv.textContent);
                        };
                        
                        container.insertBefore(logDiv, container.firstChild);
                        
                        // Keep only last 500 log entries
                        while (container.children.length > 500) {
                            container.removeChild(container.lastChild);
                        }
                        
                        if (autoScroll) {
                            container.scrollTop = 0;
                        }
                    }

                    function copyToClipboard(text) {
                        navigator.clipboard.writeText(text).then(function() {
                            showToast('Log entry copied to clipboard!', 'success');
                        }).catch(function() {
                            showToast('Failed to copy to clipboard', 'error');
                        });
                    }

                    function showToast(message, type = 'success') {
                        const toast = document.createElement('div');
                        toast.className = \`toast \${type}\`;
                        toast.textContent = message;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3000);
                    }

                    function filterLogs() {
                        const filterText = document.getElementById('log-filter').value.toLowerCase();
                        const severityFilter = document.getElementById('severity-filter').value;
                        const entries = document.querySelectorAll('.log-entry');
                        
                        entries.forEach(entry => {
                            const text = entry.textContent.toLowerCase();
                            const severity = entry.getAttribute('data-severity');
                            const matchesText = filterText === '' || text.includes(filterText);
                            const matchesSeverity = severityFilter === '' || severity === severityFilter;
                            
                            entry.style.display = matchesText && matchesSeverity ? 'block' : 'none';
                        });
                    }

                    async function refreshLogs() {
                        try {
                            const response = await fetch('http://localhost:${this.serverPort}/events/recent?type=log&limit=100');
                            const data = await response.json();
                            const container = document.getElementById('logs-container');
                            container.innerHTML = '';
                            
                            data.events.forEach(event => {
                                addLogEntry(event);
                            });
                            
                            showToast('Logs refreshed!', 'success');
                        } catch (error) {
                            showToast('Failed to refresh logs: ' + error.message, 'error');
                        }
                    }

                    function toggleAutoScroll() {
                        autoScroll = !autoScroll;
                        showToast(autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled', 'success');
                    }

                    async function clearLogs() {
                        const container = document.getElementById('logs-container');
                        container.innerHTML = '';
                        showToast('Logs cleared!', 'success');
                    }

                    async function clearAllLogs() {
                        if (confirm('Are you sure you want to clear all logs?')) {
                            try {
                                await fetch('http://localhost:${this.serverPort}/requests', { method: 'DELETE' });
                                const container = document.getElementById('logs-container');
                                container.innerHTML = '';
                                showToast('All logs cleared!', 'success');
                            } catch (error) {
                                showToast('Failed to clear all logs: ' + error.message, 'error');
                            }
                        }
                    }

                    async function exportLogs() {
                        const entries = document.querySelectorAll('.log-entry');
                        const logs = Array.from(entries).map(entry => entry.textContent).join('\\n\\n');
                        
                        const blob = new Blob([logs], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'failsafe-logs-' + new Date().toISOString().split('T')[0] + '.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                        
                        showToast('Logs exported!', 'success');
                    }

                    // Initialize SSE on page load
                    initLogSSE();
                </script>
            </body>
            </html>
        `;
    }
    refreshSidebar() {
        if (this.sidebarProvider) {
            this.sidebarProvider.refresh();
        }
    }
    getSystemStatusText() {
        return this.statusBarState;
    }
}
exports.UI = UI;
//# sourceMappingURL=ui.js.map