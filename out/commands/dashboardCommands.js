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
exports.DashboardCommands = void 0;
const vscode = __importStar(require("vscode"));
class DashboardCommands {
    constructor(logger, sprintPlanner, cursorrulesEngine, versionManager, projectPlan, taskEngine, extensionContext) {
        this.logger = logger;
        this.sprintPlanner = sprintPlanner;
        this.cursorrulesEngine = cursorrulesEngine;
        this.versionManager = versionManager;
        this.projectPlan = projectPlan;
        this.taskEngine = taskEngine;
        this.extensionContext = extensionContext;
    }
    /**
     * Export comprehensive dashboard report
     */
    async exportDashboardReport() {
        try {
            const reportData = await this.generateDashboardReport();
            const panel = vscode.window.createWebviewPanel('dashboardReport', 'Dashboard Report', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateDashboardReportHTML(reportData);
        }
        catch (error) {
            this.logger.error('Error in exportDashboardReport command', error);
            vscode.window.showErrorMessage('Failed to export dashboard report. Check logs for details.');
        }
    }
    /**
     * Export sprint report with custom visuals
     */
    async exportSprintReport() {
        try {
            const currentSprint = await this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found');
                return;
            }
            const sprintData = await this.sprintPlanner.exportSprintData();
            const sprintMetrics = await this.sprintPlanner.getSprintMetrics(currentSprint.id);
            const panel = vscode.window.createWebviewPanel('sprintReport', 'Sprint Report', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateSprintReportHTML(sprintData, sprintMetrics);
        }
        catch (error) {
            this.logger.error('Error in exportSprintReport command', error);
            vscode.window.showErrorMessage('Failed to export sprint report. Check logs for details.');
        }
    }
    /**
     * Export cursor rules report
     */
    async exportCursorRulesReport() {
        try {
            const rules = this.cursorrulesEngine.getAllRules();
            const stats = this.cursorrulesEngine.getStats();
            const panel = vscode.window.createWebviewPanel('cursorRulesReport', 'Cursor Rules Report', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateCursorRulesReportHTML(rules, stats);
        }
        catch (error) {
            this.logger.error('Error in exportCursorRulesReport command', error);
            vscode.window.showErrorMessage('Failed to export cursor rules report. Check logs for details.');
        }
    }
    /**
     * Export project health report
     */
    async exportProjectHealthReport() {
        try {
            const healthData = await this.generateProjectHealthData();
            const panel = vscode.window.createWebviewPanel('projectHealthReport', 'Project Health Report', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateProjectHealthReportHTML(healthData);
        }
        catch (error) {
            this.logger.error('Error in exportProjectHealthReport command', error);
            vscode.window.showErrorMessage('Failed to export project health report. Check logs for details.');
        }
    }
    /**
     * Customize dashboard theme
     */
    async customizeDashboardTheme() {
        try {
            const themes = [
                { name: 'Default', value: 'default' },
                { name: 'Dark', value: 'dark' },
                { name: 'Light', value: 'light' },
                { name: 'High Contrast', value: 'high-contrast' },
                { name: 'Custom', value: 'custom' }
            ];
            const selectedTheme = await vscode.window.showQuickPick(themes.map(t => t.name), {
                placeHolder: 'Select dashboard theme'
            });
            if (!selectedTheme) {
                return;
            }
            const theme = themes.find(t => t.name === selectedTheme);
            if (!theme) {
                return;
            }
            if (theme.value === 'custom') {
                await this.showCustomThemeEditor();
            }
            else {
                await this.applyTheme(theme.value);
                vscode.window.showInformationMessage(`✅ Dashboard theme changed to "${selectedTheme}"`);
            }
        }
        catch (error) {
            this.logger.error('Error in customizeDashboardTheme command', error);
            vscode.window.showErrorMessage('Failed to customize dashboard theme. Check logs for details.');
        }
    }
    /**
     * Customize dashboard layout
     */
    async customizeDashboardLayout() {
        try {
            const layouts = [
                { name: 'Default', value: 'default' },
                { name: 'Compact', value: 'compact' },
                { name: 'Expanded', value: 'expanded' },
                { name: 'Grid', value: 'grid' },
                { name: 'List', value: 'list' }
            ];
            const selectedLayout = await vscode.window.showQuickPick(layouts.map(l => l.name), {
                placeHolder: 'Select dashboard layout'
            });
            if (!selectedLayout) {
                return;
            }
            const layout = layouts.find(l => l.name === selectedLayout);
            if (!layout) {
                return;
            }
            await this.applyLayout(layout.value);
            vscode.window.showInformationMessage(`✅ Dashboard layout changed to "${selectedLayout}"`);
        }
        catch (error) {
            this.logger.error('Error in customizeDashboardLayout command', error);
            vscode.window.showErrorMessage('Failed to customize dashboard layout. Check logs for details.');
        }
    }
    /**
     * Configure dashboard widgets
     */
    async configureDashboardWidgets() {
        try {
            const widgets = [
                { name: 'Sprint Progress', enabled: true, position: 'top-left' },
                { name: 'Task Overview', enabled: true, position: 'top-right' },
                { name: 'Cursor Rules Status', enabled: true, position: 'bottom-left' },
                { name: 'System Health', enabled: false, position: 'bottom-right' },
                { name: 'Recent Activity', enabled: true, position: 'center' },
                { name: 'Version Status', enabled: true, position: 'sidebar' }
            ];
            const panel = vscode.window.createWebviewPanel('configureWidgets', 'Configure Dashboard Widgets', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateWidgetConfigurationHTML(widgets);
        }
        catch (error) {
            this.logger.error('Error in configureDashboardWidgets command', error);
            vscode.window.showErrorMessage('Failed to configure dashboard widgets. Check logs for details.');
        }
    }
    /**
     * Export dashboard as PDF
     */
    async exportDashboardAsPDF() {
        try {
            vscode.window.showInformationMessage('PDF export feature coming soon! For now, use the HTML export and convert to PDF manually.');
        }
        catch (error) {
            this.logger.error('Error in exportDashboardAsPDF command', error);
            vscode.window.showErrorMessage('Failed to export dashboard as PDF. Check logs for details.');
        }
    }
    /**
     * Share dashboard snapshot
     */
    async shareDashboardSnapshot() {
        try {
            const snapshot = await this.createDashboardSnapshot();
            const panel = vscode.window.createWebviewPanel('dashboardSnapshot', 'Dashboard Snapshot', vscode.ViewColumn.One, { enableScripts: true });
            panel.webview.html = this.generateDashboardSnapshotHTML(snapshot);
        }
        catch (error) {
            this.logger.error('Error in shareDashboardSnapshot command', error);
            vscode.window.showErrorMessage('Failed to create dashboard snapshot. Check logs for details.');
        }
    }
    // Private helper methods
    async generateDashboardReport() {
        const currentSprint = await this.sprintPlanner.getCurrentSprint();
        const rules = this.cursorrulesEngine.getAllRules();
        const stats = this.cursorrulesEngine.getStats();
        const versionInfo = await this.versionManager.getVersionDetails();
        const projectTasks = this.projectPlan.getAllTasks();
        return {
            timestamp: new Date(),
            sprint: currentSprint,
            cursorRules: {
                total: stats.totalRules,
                enabled: stats.enabledRules,
                triggers: stats.totalTriggers,
                overrides: stats.totalOverrides
            },
            version: versionInfo,
            tasks: projectTasks,
            systemHealth: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                activeExtensions: vscode.extensions.all.length
            }
        };
    }
    async generateProjectHealthData() {
        const currentSprint = await this.sprintPlanner.getCurrentSprint();
        const sprintMetrics = currentSprint ? await this.sprintPlanner.getSprintMetrics(currentSprint.id) : null;
        const rules = this.cursorrulesEngine.getAllRules();
        const versionInconsistencies = await this.versionManager.checkVersionConsistency();
        return {
            sprintHealth: sprintMetrics ? {
                progress: sprintMetrics.progressPercentage,
                velocity: sprintMetrics.velocity,
                burndown: sprintMetrics.burndownData.length > 0 ? sprintMetrics.burndownData[sprintMetrics.burndownData.length - 1].remainingStoryPoints : 0
            } : null,
            codeQuality: {
                totalRules: rules.length,
                enabledRules: rules.filter(r => r.enabled).length,
                activeRules: rules.filter(r => r.usageStats && r.usageStats.triggers > 0).length
            },
            versionHealth: {
                inconsistencies: versionInconsistencies.issues.length,
                isConsistent: versionInconsistencies.issues.length === 0
            },
            systemHealth: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };
    }
    async showCustomThemeEditor() {
        const panel = vscode.window.createWebviewPanel('customThemeEditor', 'Custom Theme Editor', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = this.generateCustomThemeEditorHTML();
    }
    async applyTheme(theme) {
        this.logger.info(`Applying theme: ${theme}`);
    }
    async applyLayout(layout) {
        this.logger.info(`Applying layout: ${layout}`);
    }
    async createDashboardSnapshot() {
        const reportData = await this.generateDashboardReport();
        return {
            ...reportData,
            snapshotId: `snapshot_${Date.now()}`,
            createdAt: new Date()
        };
    }
    // HTML generation methods
    generateDashboardReportHTML(reportData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Dashboard Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 4px; }
                    .chart { width: 100%; height: 300px; background: #e3f2fd; margin: 10px 0; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                    .export-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin: 10px 5px; 
                    }
                </style>
            </head>
            <body>
                <h1>FailSafe Dashboard Report</h1>
                <p><strong>Generated:</strong> ${reportData.timestamp.toLocaleString()}</p>
                
                <div class="section">
                    <h2>Sprint Overview</h2>
                    ${reportData.sprint ? `
                        <div class="metric">
                            <h3>${reportData.sprint.name}</h3>
                            <p><strong>Progress:</strong> ${reportData.sprint.progress || 0}%</p>
                            <p><strong>Tasks:</strong> ${reportData.sprint.tasks?.length || 0}</p>
                        </div>
                    ` : '<p>No active sprint</p>'}
                </div>
                
                <div class="section">
                    <h2>Cursor Rules Status</h2>
                    <div class="metric">
                        <h3>Total Rules</h3>
                        <p>${reportData.cursorRules.total}</p>
                    </div>
                    <div class="metric">
                        <h3>Enabled Rules</h3>
                        <p>${reportData.cursorRules.enabled}</p>
                    </div>
                    <div class="metric">
                        <h3>Total Triggers</h3>
                        <p>${reportData.cursorRules.triggers}</p>
                    </div>
                    <div class="metric">
                        <h3>Total Overrides</h3>
                        <p>${reportData.cursorRules.overrides}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>System Health</h2>
                    <div class="metric">
                        <h3>Uptime</h3>
                        <p>${Math.floor(reportData.systemHealth.uptime / 3600)}h ${Math.floor((reportData.systemHealth.uptime % 3600) / 60)}m</p>
                    </div>
                    <div class="metric">
                        <h3>Memory Usage</h3>
                        <p>${Math.round(reportData.systemHealth.memoryUsage.rss / 1024 / 1024)} MB</p>
                    </div>
                    <div class="metric">
                        <h3>Active Extensions</h3>
                        <p>${reportData.systemHealth.activeExtensions}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Charts & Visualizations</h2>
                    <div class="chart">
                        <p>Sprint Progress Chart</p>
                    </div>
                    <div class="chart">
                        <p>Cursor Rules Activity Chart</p>
                    </div>
                    <div class="chart">
                        <p>System Performance Chart</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <button class="export-btn" onclick="exportAsPDF()">Export as PDF</button>
                    <button class="export-btn" onclick="exportAsHTML()">Export as HTML</button>
                    <button class="export-btn" onclick="shareSnapshot()">Share Snapshot</button>
                </div>
                
                <script>
                    function exportAsPDF() {
                        alert('PDF export feature coming soon!');
                    }
                    
                    function exportAsHTML() {
                        const htmlContent = document.documentElement.outerHTML;
                        const blob = new Blob([htmlContent], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'failsafe-dashboard-report.html';
                        a.click();
                    }
                    
                    function shareSnapshot() {
                        alert('Snapshot sharing feature coming soon!');
                    }
                </script>
            </body>
            </html>
        `;
    }
    generateSprintReportHTML(sprintData, sprintMetrics) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Sprint Report: ${sprintData.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .task { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .chart { width: 100%; height: 200px; background: #e3f2fd; margin: 10px 0; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                </style>
            </head>
            <body>
                <h1>Sprint Report: ${sprintData.name}</h1>
                <p><strong>Duration:</strong> ${sprintData.startDate} to ${sprintData.endDate}</p>
                
                <div class="section">
                    <h2>Sprint Metrics</h2>
                    <p><strong>Progress:</strong> ${sprintMetrics?.progress || 0}%</p>
                    <p><strong>Velocity:</strong> ${sprintMetrics?.velocity || 0} points/day</p>
                    <p><strong>Burndown:</strong> ${sprintMetrics?.burndown || 0}%</p>
                </div>
                
                <div class="section">
                    <h2>Tasks Overview</h2>
                    <p><strong>Total Tasks:</strong> ${sprintData.tasks.length}</p>
                    <p><strong>Completed:</strong> ${sprintData.tasks.filter((t) => t.status === 'DONE').length}</p>
                    <p><strong>In Progress:</strong> ${sprintData.tasks.filter((t) => t.status === 'IN_PROGRESS').length}</p>
                    <p><strong>Blocked:</strong> ${sprintData.tasks.filter((t) => t.status === 'BLOCKED').length}</p>
                </div>
                
                <div class="section">
                    <h2>Charts</h2>
                    <div class="chart">
                        <p>Sprint Burndown Chart</p>
                    </div>
                    <div class="chart">
                        <p>Task Status Distribution</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Task Details</h2>
                    ${sprintData.tasks.map((task) => `
                        <div class="task">
                            <h4>${task.name}</h4>
                            <p><strong>Status:</strong> ${task.status}</p>
                            <p><strong>Priority:</strong> ${task.priority}</p>
                            <p><strong>Estimated:</strong> ${task.estimatedHours}h</p>
                            <p><strong>Actual:</strong> ${task.actualHours}h</p>
                            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `;
    }
    generateCursorRulesReportHTML(rules, stats) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Cursor Rules Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .rule { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .enabled { border-left: 4px solid #4caf50; }
                    .disabled { border-left: 4px solid #9e9e9e; opacity: 0.7; }
                </style>
            </head>
            <body>
                <h1>Cursor Rules Report</h1>
                
                <div class="section">
                    <h2>Summary Statistics</h2>
                    <p><strong>Total Rules:</strong> ${stats.totalRules}</p>
                    <p><strong>Enabled Rules:</strong> ${stats.enabledRules}</p>
                    <p><strong>Total Triggers:</strong> ${stats.totalTriggers}</p>
                    <p><strong>Total Overrides:</strong> ${stats.totalOverrides}</p>
                </div>
                
                <div class="section">
                    <h2>Rules by Purpose</h2>
                    ${this.groupRulesByPurpose(rules).map(group => `
                        <h3>${group.purpose} (${group.rules.length})</h3>
                        ${group.rules.map((rule) => `
                            <div class="rule ${rule.enabled ? 'enabled' : 'disabled'}">
                                <h4>${rule.name}</h4>
                                <p><strong>Severity:</strong> ${rule.severity}</p>
                                <p><strong>Triggers:</strong> ${rule.usageStats?.triggers || 0}</p>
                                <p><strong>Overrides:</strong> ${rule.usageStats?.overrides || 0}</p>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            </body>
            </html>
        `;
    }
    generateProjectHealthReportHTML(healthData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Project Health Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 4px; }
                    .status-good { border-left: 4px solid #4caf50; }
                    .status-warning { border-left: 4px solid #ff9800; }
                    .status-error { border-left: 4px solid #f44336; }
                </style>
            </head>
            <body>
                <h1>Project Health Report</h1>
                
                <div class="section">
                    <h2>Sprint Health</h2>
                    ${healthData.sprintHealth ? `
                        <div class="metric status-good">
                            <h3>Progress</h3>
                            <p>${healthData.sprintHealth.progress}%</p>
                        </div>
                        <div class="metric status-good">
                            <h3>Velocity</h3>
                            <p>${healthData.sprintHealth.velocity} points/day</p>
                        </div>
                    ` : '<p>No active sprint</p>'}
                </div>
                
                <div class="section">
                    <h2>Code Quality</h2>
                    <div class="metric status-good">
                        <h3>Total Rules</h3>
                        <p>${healthData.codeQuality.totalRules}</p>
                    </div>
                    <div class="metric status-good">
                        <h3>Enabled Rules</h3>
                        <p>${healthData.codeQuality.enabledRules}</p>
                    </div>
                    <div class="metric status-warning">
                        <h3>Active Rules</h3>
                        <p>${healthData.codeQuality.activeRules}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Version Health</h2>
                    <div class="metric ${healthData.versionHealth.isConsistent ? 'status-good' : 'status-error'}">
                        <h3>Consistency</h3>
                        <p>${healthData.versionHealth.isConsistent ? 'Consistent' : 'Inconsistent'}</p>
                    </div>
                    <div class="metric ${healthData.versionHealth.inconsistencies === 0 ? 'status-good' : 'status-warning'}">
                        <h3>Inconsistencies</h3>
                        <p>${healthData.versionHealth.inconsistencies}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>System Health</h2>
                    <div class="metric status-good">
                        <h3>Uptime</h3>
                        <p>${Math.floor(healthData.systemHealth.uptime / 3600)}h ${Math.floor((healthData.systemHealth.uptime % 3600) / 60)}m</p>
                    </div>
                    <div class="metric status-good">
                        <h3>Memory Usage</h3>
                        <p>${Math.round(healthData.systemHealth.memoryUsage.rss / 1024 / 1024)} MB</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    generateWidgetConfigurationHTML(widgets) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Configure Dashboard Widgets</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .widget { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .widget-header { display: flex; justify-content: space-between; align-items: center; }
                    .toggle { position: relative; display: inline-block; width: 60px; height: 34px; }
                    .toggle input { opacity: 0; width: 0; height: 0; }
                    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
                    .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                    input:checked + .slider { background-color: #2196F3; }
                    input:checked + .slider:before { transform: translateX(26px); }
                    .position-select { padding: 5px; margin: 5px; }
                    .save-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin: 10px 0; 
                    }
                </style>
            </head>
            <body>
                <h1>Configure Dashboard Widgets</h1>
                <p>Customize which widgets are displayed and their positions on the dashboard.</p>
                
                ${widgets.map(widget => `
                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <h3>${widget.name}</h3>
                                <p>Position: 
                                    <select class="position-select">
                                        <option value="top-left" ${widget.position === 'top-left' ? 'selected' : ''}>Top Left</option>
                                        <option value="top-right" ${widget.position === 'top-right' ? 'selected' : ''}>Top Right</option>
                                        <option value="bottom-left" ${widget.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                                        <option value="bottom-right" ${widget.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                                        <option value="center" ${widget.position === 'center' ? 'selected' : ''}>Center</option>
                                        <option value="sidebar" ${widget.position === 'sidebar' ? 'selected' : ''}>Sidebar</option>
                                    </select>
                                </p>
                            </div>
                            <div>
                                <label class="toggle">
                                    <input type="checkbox" ${widget.enabled ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                `).join('')}
                
                <button class="save-btn" onclick="saveConfiguration()">Save Configuration</button>
                
                <script>
                    function saveConfiguration() {
                        alert('Widget configuration saved!');
                    }
                </script>
            </body>
            </html>
        `;
    }
    generateCustomThemeEditorHTML() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Custom Theme Editor</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .color-picker { margin: 10px 0; }
                    .preview { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 4px; }
                    .save-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                    }
                </style>
            </head>
            <body>
                <h1>Custom Theme Editor</h1>
                <p>Create your own custom dashboard theme by adjusting colors and styles.</p>
                
                <div class="color-picker">
                    <label>Primary Color: <input type="color" id="primaryColor" value="#007acc"></label>
                </div>
                
                <div class="color-picker">
                    <label>Secondary Color: <input type="color" id="secondaryColor" value="#4caf50"></label>
                </div>
                
                <div class="color-picker">
                    <label>Background Color: <input type="color" id="backgroundColor" value="#ffffff"></label>
                </div>
                
                <div class="color-picker">
                    <label>Text Color: <input type="color" id="textColor" value="#333333"></label>
                </div>
                
                <div class="preview">
                    <h3>Theme Preview</h3>
                    <p>This is how your custom theme will look on the dashboard.</p>
                    <button style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px;">Sample Button</button>
                </div>
                
                <button class="save-btn" onclick="saveTheme()">Save Theme</button>
                
                <script>
                    function saveTheme() {
                        alert('Theme saved! (Implementation coming soon)');
                    }
                </script>
            </body>
            </html>
        `;
    }
    generateDashboardSnapshotHTML(snapshot) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Dashboard Snapshot</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .snapshot-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    .share-btn { 
                        background: #007acc; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin: 10px 5px; 
                    }
                </style>
            </head>
            <body>
                <h1>Dashboard Snapshot</h1>
                
                <div class="snapshot-info">
                    <h3>Snapshot Details</h3>
                    <p><strong>Snapshot ID:</strong> ${snapshot.snapshotId}</p>
                    <p><strong>Created:</strong> ${snapshot.createdAt.toLocaleString()}</p>
                    <p><strong>Sprint:</strong> ${snapshot.sprint?.name || 'No active sprint'}</p>
                    <p><strong>Cursor Rules:</strong> ${snapshot.cursorRules.total} total, ${snapshot.cursorRules.enabled} enabled</p>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <button class="share-btn" onclick="shareViaEmail()">Share via Email</button>
                    <button class="share-btn" onclick="shareViaSlack()">Share via Slack</button>
                    <button class="share-btn" onclick="copyLink()">Copy Link</button>
                    <button class="share-btn" onclick="downloadSnapshot()">Download Snapshot</button>
                </div>
                
                <script>
                    function shareViaEmail() {
                        alert('Email sharing feature coming soon!');
                    }
                    
                    function shareViaSlack() {
                        alert('Slack sharing feature coming soon!');
                    }
                    
                    function copyLink() {
                        const link = \`https://failsafe.dev/snapshot/${snapshot.snapshotId}\`;
                        navigator.clipboard.writeText(link).then(() => {
                            alert('Snapshot link copied to clipboard!');
                        });
                    }
                    
                    function downloadSnapshot() {
                        const snapshotData = JSON.stringify(snapshot, null, 2);
                        const blob = new Blob([snapshotData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = \`failsafe-snapshot-\${snapshot.snapshotId}.json\`;
                        a.click();
                    }
                </script>
            </body>
            </html>
        `;
    }
    groupRulesByPurpose(rules) {
        const groups = {};
        rules.forEach(rule => {
            if (!groups[rule.purpose]) {
                groups[rule.purpose] = [];
            }
            groups[rule.purpose].push(rule);
        });
        return Object.keys(groups).map(purpose => ({
            purpose,
            rules: groups[purpose]
        }));
    }
}
exports.DashboardCommands = DashboardCommands;
//# sourceMappingURL=dashboardCommands.js.map