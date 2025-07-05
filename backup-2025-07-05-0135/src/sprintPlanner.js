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
exports.SprintPlanner = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
class SprintPlanner {
    constructor(logger) {
        this.currentSprint = null;
        this.sprintHistory = [];
        this.templates = [];
        this.logger = logger;
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.sprintFile = path.join(workspacePath, '.failsafe', 'sprints.json');
        this.templatesFile = path.join(workspacePath, '.failsafe', 'sprint-templates.json');
        this.initializeStorage();
    }
    initializeStorage() {
        try {
            const failsafeDir = path.dirname(this.sprintFile);
            if (!fs.existsSync(failsafeDir)) {
                fs.mkdirSync(failsafeDir, { recursive: true });
            }
            this.loadSprints();
            this.loadTemplates();
            this.logger.info('Sprint planner storage initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize sprint planner storage', error);
        }
    }
    loadSprints() {
        try {
            if (fs.existsSync(this.sprintFile)) {
                const content = fs.readFileSync(this.sprintFile, 'utf8');
                const data = JSON.parse(content);
                // Convert dates back to Date objects
                if (data.currentSprint) {
                    data.currentSprint.startDate = new Date(data.currentSprint.startDate);
                    data.currentSprint.endDate = new Date(data.currentSprint.endDate);
                    data.currentSprint.createdAt = new Date(data.currentSprint.createdAt);
                    data.currentSprint.updatedAt = new Date(data.currentSprint.updatedAt);
                    // Convert task dates
                    data.currentSprint.tasks.forEach((task) => {
                        if (task.startTime)
                            task.startTime = new Date(task.startTime);
                        if (task.endTime)
                            task.endTime = new Date(task.endTime);
                    });
                }
                if (data.sprintHistory) {
                    data.sprintHistory.forEach((sprint) => {
                        sprint.startDate = new Date(sprint.startDate);
                        sprint.endDate = new Date(sprint.endDate);
                        sprint.createdAt = new Date(sprint.createdAt);
                        sprint.updatedAt = new Date(sprint.updatedAt);
                        sprint.tasks.forEach((task) => {
                            if (task.startTime)
                                task.startTime = new Date(task.startTime);
                            if (task.endTime)
                                task.endTime = new Date(task.endTime);
                        });
                    });
                }
                this.currentSprint = data.currentSprint || null;
                this.sprintHistory = data.sprintHistory || [];
                this.logger.info('Sprint data loaded', {
                    currentSprint: this.currentSprint?.id,
                    historyCount: this.sprintHistory.length
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to load sprint data', error);
        }
    }
    loadTemplates() {
        try {
            if (fs.existsSync(this.templatesFile)) {
                const content = fs.readFileSync(this.templatesFile, 'utf8');
                this.templates = JSON.parse(content);
                this.logger.info('Sprint templates loaded', { templateCount: this.templates.length });
            }
            else {
                this.createDefaultTemplates();
            }
        }
        catch (error) {
            this.logger.error('Failed to load sprint templates', error);
            this.createDefaultTemplates();
        }
    }
    createDefaultTemplates() {
        this.templates = [
            {
                id: 'standard-2-week',
                name: 'Standard 2-Week Sprint',
                description: 'Standard agile sprint with 2-week duration',
                duration: 14,
                velocity: 20,
                capacity: 8,
                teamSize: 4,
                defaultTasks: [
                    {
                        name: 'Sprint Planning',
                        description: 'Plan and estimate sprint tasks',
                        storyPoints: 2,
                        estimatedHours: 4,
                        priority: types_1.TaskPriority.high,
                        riskLevel: 'low'
                    },
                    {
                        name: 'Daily Standups',
                        description: 'Daily team synchronization',
                        storyPoints: 1,
                        estimatedHours: 2,
                        priority: types_1.TaskPriority.medium,
                        riskLevel: 'low'
                    },
                    {
                        name: 'Sprint Review',
                        description: 'Review completed work with stakeholders',
                        storyPoints: 3,
                        estimatedHours: 4,
                        priority: types_1.TaskPriority.high,
                        riskLevel: 'medium'
                    },
                    {
                        name: 'Sprint Retrospective',
                        description: 'Team reflection and improvement planning',
                        storyPoints: 2,
                        estimatedHours: 3,
                        priority: types_1.TaskPriority.medium,
                        riskLevel: 'low'
                    }
                ],
                tags: ['agile', 'standard', '2-week']
            },
            {
                id: 'quick-1-week',
                name: 'Quick 1-Week Sprint',
                description: 'Fast-paced sprint for urgent projects',
                duration: 7,
                velocity: 10,
                capacity: 8,
                teamSize: 3,
                defaultTasks: [
                    {
                        name: 'Quick Planning',
                        description: 'Rapid task planning and estimation',
                        storyPoints: 1,
                        estimatedHours: 2,
                        priority: types_1.TaskPriority.high,
                        riskLevel: 'medium'
                    },
                    {
                        name: 'Daily Sync',
                        description: 'Brief daily team synchronization',
                        storyPoints: 1,
                        estimatedHours: 1,
                        priority: types_1.TaskPriority.medium,
                        riskLevel: 'low'
                    }
                ],
                tags: ['quick', 'urgent', '1-week']
            }
        ];
        this.saveTemplates();
    }
    saveSprints() {
        try {
            const data = {
                currentSprint: this.currentSprint,
                sprintHistory: this.sprintHistory,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.sprintFile, JSON.stringify(data, null, 2));
            this.logger.debug('Sprint data saved');
        }
        catch (error) {
            this.logger.error('Failed to save sprint data', error);
        }
    }
    saveTemplates() {
        try {
            fs.writeFileSync(this.templatesFile, JSON.stringify(this.templates, null, 2));
            this.logger.debug('Sprint templates saved');
        }
        catch (error) {
            this.logger.error('Failed to save sprint templates', error);
        }
    }
    async createSprint(templateId) {
        try {
            const template = templateId ? this.templates.find(t => t.id === templateId) : this.templates[0];
            const name = await vscode.window.showInputBox({
                prompt: 'Enter sprint name',
                placeHolder: template?.name || 'Sprint 1',
                validateInput: (value) => value.trim().length > 0 ? null : 'Sprint name is required'
            });
            if (!name)
                return null;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter sprint description (optional)',
                placeHolder: 'Brief description of sprint goals'
            });
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (template?.duration || 14));
            const sprint = {
                id: this.generateSprintId(),
                name: name.trim(),
                description: description || '',
                startDate,
                endDate,
                duration: template?.duration || 14,
                tasks: template?.defaultTasks.map((task, index) => ({
                    ...task,
                    id: `task-${Date.now()}-${index}`,
                    name: task.name || 'Unnamed Task',
                    description: task.description || '',
                    sprintId: this.generateSprintId(),
                    sprintPosition: index,
                    status: types_1.TaskStatus.notStarted,
                    startTime: undefined,
                    endTime: undefined,
                    dependencies: [],
                    blockers: [],
                    acceptanceCriteria: [],
                    definitionOfDone: [],
                    storyPoints: task.storyPoints || 1,
                    estimatedHours: task.estimatedHours || 4,
                    estimatedDuration: task.estimatedDuration || 240,
                    priority: task.priority || types_1.TaskPriority.medium,
                    riskLevel: task.riskLevel || 'medium',
                    assignee: task.assignee || 'User'
                })) || [],
                status: 'planning',
                velocity: template?.velocity || 20,
                capacity: template?.capacity || 8,
                teamSize: template?.teamSize || 4,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'User',
                version: '1.0',
                metadata: {
                    sprintNumber: this.sprintHistory.length + 1,
                    projectId: 'default',
                    tags: template?.tags || [],
                    notes: ''
                }
            };
            this.currentSprint = sprint;
            this.saveSprints();
            this.logger.info('Sprint created', { sprintId: sprint.id, name: sprint.name });
            return sprint;
        }
        catch (error) {
            this.logger.error('Failed to create sprint', error);
            return null;
        }
    }
    async addTaskToSprint(task) {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No active sprint found. Please create a sprint first.');
            return false;
        }
        try {
            const sprintTask = {
                id: task.id || `task-${Date.now()}`,
                name: task.name || 'New Task',
                description: task.description || '',
                status: task.status || types_1.TaskStatus.notStarted,
                priority: task.priority || types_1.TaskPriority.medium,
                storyPoints: task.storyPoints || 1,
                sprintId: this.currentSprint.id,
                estimatedHours: task.estimatedHours || 4,
                sprintPosition: this.currentSprint.tasks.length,
                dependencies: task.dependencies || [],
                blockers: task.blockers || [],
                riskLevel: task.riskLevel || 'medium',
                acceptanceCriteria: task.acceptanceCriteria || [],
                definitionOfDone: task.definitionOfDone || [],
                startTime: task.startTime,
                endTime: task.endTime,
                estimatedDuration: task.estimatedDuration || 60,
                assignee: task.assignee || 'User'
            };
            this.currentSprint.tasks.push(sprintTask);
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            this.logger.info('Task added to sprint', {
                taskId: sprintTask.id,
                sprintId: this.currentSprint.id
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to add task to sprint', error);
            return false;
        }
    }
    async updateTask(taskId, updatedTask) {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No active sprint found.');
            return false;
        }
        try {
            const taskIndex = this.currentSprint.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                vscode.window.showErrorMessage('Task not found in current sprint.');
                return false;
            }
            this.currentSprint.tasks[taskIndex] = { ...this.currentSprint.tasks[taskIndex], ...updatedTask };
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            this.logger.info('Task updated in sprint', {
                taskId,
                sprintId: this.currentSprint.id
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to update task in sprint', error);
            return false;
        }
    }
    async removeTaskFromSprint(taskId) {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No active sprint found.');
            return false;
        }
        try {
            const taskIndex = this.currentSprint.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                vscode.window.showErrorMessage('Task not found in current sprint.');
                return false;
            }
            const removedTask = this.currentSprint.tasks.splice(taskIndex, 1)[0];
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            this.logger.info('Task removed from sprint', {
                taskId,
                taskName: removedTask.name,
                sprintId: this.currentSprint.id
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to remove task from sprint', error);
            return false;
        }
    }
    async startSprint() {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No sprint to start');
            return false;
        }
        if (this.currentSprint.status !== 'planning') {
            vscode.window.showErrorMessage('Sprint is not in planning status');
            return false;
        }
        try {
            this.currentSprint.status = 'active';
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            this.logger.info('Sprint started', { sprintId: this.currentSprint.id });
            vscode.window.showInformationMessage(`Sprint "${this.currentSprint.name}" started successfully!`);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to start sprint', error);
            return false;
        }
    }
    async completeSprint() {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No active sprint to complete');
            return false;
        }
        if (this.currentSprint.status !== 'active') {
            vscode.window.showErrorMessage('Sprint is not active');
            return false;
        }
        try {
            this.currentSprint.status = 'completed';
            this.currentSprint.updatedAt = new Date();
            // Move to history
            this.sprintHistory.push(this.currentSprint);
            this.currentSprint = null;
            this.saveSprints();
            this.logger.info('Sprint completed', { sprintId: this.sprintHistory[this.sprintHistory.length - 1].id });
            vscode.window.showInformationMessage('Sprint completed successfully!');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to complete sprint', error);
            return false;
        }
    }
    getCurrentSprint() {
        return this.currentSprint;
    }
    getSprintHistory() {
        return this.sprintHistory;
    }
    getSprintMetrics(sprintId) {
        const sprint = sprintId ?
            this.sprintHistory.find(s => s.id === sprintId) :
            this.currentSprint;
        if (!sprint)
            return null;
        const totalStoryPoints = sprint.tasks.reduce((sum, task) => sum + task.storyPoints, 0);
        const completedTasks = sprint.tasks.filter(task => task.status === types_1.TaskStatus.completed);
        const completedStoryPoints = completedTasks.reduce((sum, task) => sum + task.storyPoints, 0);
        const inProgressTasks = sprint.tasks.filter(task => task.status === types_1.TaskStatus.inProgress);
        const blockedTasks = sprint.tasks.filter(task => task.status === types_1.TaskStatus.blocked);
        const progressPercentage = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;
        const velocity = sprint.duration > 0 ? totalStoryPoints / sprint.duration : 0;
        const teamVelocity = sprint.teamSize > 0 ? velocity / sprint.teamSize : 0;
        const capacityUtilization = sprint.capacity > 0 ?
            (sprint.tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0) / (sprint.capacity * sprint.duration)) * 100 : 0;
        const burndownData = this.calculateBurndownData(sprint);
        const riskAssessment = this.assessSprintRisks(sprint);
        return {
            totalStoryPoints,
            completedStoryPoints,
            totalTasks: sprint.tasks.length,
            completedTasks: completedTasks.length,
            inProgressTasks: inProgressTasks.length,
            blockedTasks: blockedTasks.length,
            progressPercentage,
            velocity,
            burndownData,
            teamVelocity,
            capacityUtilization,
            riskAssessment
        };
    }
    calculateBurndownData(sprint) {
        const points = [];
        const totalStoryPoints = sprint.tasks.reduce((sum, task) => sum + task.storyPoints, 0);
        let remainingStoryPoints = totalStoryPoints;
        let remainingTasks = sprint.tasks.length;
        let completedStoryPoints = 0;
        let completedTasks = 0;
        // Add initial point
        points.push({
            date: sprint.startDate,
            remainingStoryPoints,
            remainingTasks,
            completedStoryPoints,
            completedTasks
        });
        // Add daily points
        const currentDate = new Date(sprint.startDate);
        while (currentDate <= sprint.endDate) {
            // Simulate daily progress (in real implementation, this would come from actual task updates)
            const dailyCompletedTasks = sprint.tasks.filter(task => task.status === types_1.TaskStatus.completed &&
                task.endTime &&
                task.endTime.toDateString() === currentDate.toDateString());
            completedTasks += dailyCompletedTasks.length;
            completedStoryPoints += dailyCompletedTasks.reduce((sum, task) => sum + task.storyPoints, 0);
            remainingTasks = sprint.tasks.length - completedTasks;
            remainingStoryPoints = totalStoryPoints - completedStoryPoints;
            points.push({
                date: new Date(currentDate),
                remainingStoryPoints,
                remainingTasks,
                completedStoryPoints,
                completedTasks
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return points;
    }
    assessSprintRisks(sprint) {
        const highRiskTasks = sprint.tasks.filter(task => task.riskLevel === 'high' ||
            task.status === types_1.TaskStatus.blocked ||
            (task.estimatedHours && task.estimatedHours > 16));
        const mediumRiskTasks = sprint.tasks.filter(task => task.riskLevel === 'medium' ||
            (task.dependencies && task.dependencies.length > 2));
        const blockedTasks = sprint.tasks.filter(task => task.status === types_1.TaskStatus.blocked);
        const overdueTasks = sprint.tasks.filter(task => task.status !== types_1.TaskStatus.completed &&
            task.endTime &&
            task.endTime < new Date());
        const recommendations = [];
        if (highRiskTasks.length > 0) {
            recommendations.push(`Address ${highRiskTasks.length} high-risk tasks immediately`);
        }
        if (blockedTasks.length > 0) {
            recommendations.push(`Resolve blockers for ${blockedTasks.length} blocked tasks`);
        }
        if (overdueTasks.length > 0) {
            recommendations.push(`Review and update ${overdueTasks.length} overdue tasks`);
        }
        const overallRisk = highRiskTasks.length > 2 ? 'high' :
            highRiskTasks.length > 0 || mediumRiskTasks.length > 3 ? 'medium' : 'low';
        return {
            highRiskTasks,
            mediumRiskTasks,
            blockedTasks,
            overdueTasks,
            recommendations,
            overallRisk
        };
    }
    getTemplates() {
        return this.templates;
    }
    async createTemplate() {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter template name',
                placeHolder: 'Custom Sprint Template',
                validateInput: (value) => value.trim().length > 0 ? null : 'Template name is required'
            });
            if (!name)
                return null;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter template description (optional)',
                placeHolder: 'Description of when to use this template'
            });
            const durationInput = await vscode.window.showInputBox({
                prompt: 'Enter sprint duration in days',
                placeHolder: '14',
                validateInput: (value) => {
                    const num = parseInt(value);
                    return num > 0 && num <= 30 ? null : 'Duration must be between 1 and 30 days';
                }
            });
            if (!durationInput)
                return null;
            const template = {
                id: `template-${Date.now()}`,
                name: name.trim(),
                description: description || '',
                duration: parseInt(durationInput),
                velocity: 20,
                capacity: 8,
                teamSize: 4,
                defaultTasks: [],
                tags: []
            };
            this.templates.push(template);
            this.saveTemplates();
            this.logger.info('Sprint template created', { templateId: template.id, name: template.name });
            return template;
        }
        catch (error) {
            this.logger.error('Failed to create sprint template', error);
            return null;
        }
    }
    generateSprintId() {
        return `sprint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async exportSprintData(format = 'json') {
        try {
            const data = {
                currentSprint: this.currentSprint,
                sprintHistory: this.sprintHistory,
                templates: this.templates,
                exportDate: new Date().toISOString()
            };
            switch (format) {
                case 'json':
                    return JSON.stringify(data, null, 2);
                case 'csv':
                    return this.convertToCSV();
                case 'markdown':
                    return this.convertToMarkdown(data);
                default:
                    return JSON.stringify(data, null, 2);
            }
        }
        catch (error) {
            this.logger.error('Failed to export sprint data', error);
            return '';
        }
    }
    convertToCSV() {
        const csvLines = [];
        // Add export metadata
        csvLines.push('Export Date,' + new Date().toISOString());
        csvLines.push('');
        // Export current sprint if exists
        if (this.currentSprint) {
            csvLines.push('=== CURRENT SPRINT ===');
            csvLines.push(this.sprintToCSV(this.currentSprint));
            csvLines.push('');
        }
        // Export sprint history
        if (this.sprintHistory.length > 0) {
            csvLines.push('=== SPRINT HISTORY ===');
            this.sprintHistory.forEach((sprint, index) => {
                csvLines.push(`--- Sprint ${index + 1}: ${sprint.name} ---`);
                csvLines.push(this.sprintToCSV(sprint));
                csvLines.push('');
            });
        }
        // Export templates
        if (this.templates.length > 0) {
            csvLines.push('=== SPRINT TEMPLATES ===');
            csvLines.push('Template Name,Description,Duration (days),Velocity (SP/day),Capacity (hours/day),Team Size,Tags');
            this.templates.forEach(template => {
                const tags = template.tags.join(';');
                csvLines.push(`"${template.name}","${template.description}",${template.duration},${template.velocity},${template.capacity},${template.teamSize},"${tags}"`);
            });
            csvLines.push('');
        }
        return csvLines.join('\n');
    }
    sprintToCSV(sprint) {
        const csvLines = [];
        // Sprint overview
        csvLines.push('Sprint Overview');
        csvLines.push('Name,Description,Status,Start Date,End Date,Duration,Velocity,Capacity,Team Size,Created By');
        csvLines.push(`"${sprint.name}","${sprint.description}",${sprint.status},${sprint.startDate.toISOString().split('T')[0]},${sprint.endDate.toISOString().split('T')[0]},${sprint.duration},${sprint.velocity},${sprint.capacity},${sprint.teamSize},"${sprint.createdBy}"`);
        csvLines.push('');
        // Tasks
        if (sprint.tasks.length > 0) {
            csvLines.push('Tasks');
            csvLines.push('Name,Description,Status,Story Points,Estimated Hours,Actual Hours,Priority,Risk Level,Sprint Position,Dependencies,Blockers,Acceptance Criteria,Definition of Done');
            sprint.tasks.forEach(task => {
                const dependencies = task.dependencies.join(';');
                const blockers = task.blockers.join(';');
                const acceptanceCriteria = task.acceptanceCriteria.join(';');
                const definitionOfDone = task.definitionOfDone.join(';');
                const actualHours = task.actualHours || '';
                csvLines.push(`"${task.name}","${task.description || ''}",${task.status || 'Not Started'},${task.storyPoints || 0},${task.estimatedHours || 0},${actualHours},${task.priority || 'Medium'},${task.riskLevel || 'Low'},${task.sprintPosition || 0},"${dependencies}","${blockers}","${acceptanceCriteria}","${definitionOfDone}"`);
            });
            csvLines.push('');
            // Task details (one task per section for better readability)
            csvLines.push('Task Details');
            sprint.tasks.forEach((task, index) => {
                csvLines.push(`--- Task ${index + 1}: ${task.name} ---`);
                csvLines.push('Property,Value');
                csvLines.push(`Name,"${task.name}"`);
                csvLines.push(`Description,"${task.description || 'No description'}"`);
                csvLines.push(`Status,${task.status || 'Not Started'}`);
                csvLines.push(`Story Points,${task.storyPoints || 0}`);
                csvLines.push(`Estimated Hours,${task.estimatedHours || 0}`);
                csvLines.push(`Actual Hours,${task.actualHours || 'Not tracked'}`);
                csvLines.push(`Priority,${task.priority || 'Medium'}`);
                csvLines.push(`Risk Level,${task.riskLevel || 'Low'}`);
                csvLines.push(`Sprint Position,${task.sprintPosition || 0}`);
                if (task.dependencies.length > 0) {
                    csvLines.push(`Dependencies,"${task.dependencies.join('; ')}"`);
                }
                if (task.blockers.length > 0) {
                    csvLines.push(`Blockers,"${task.blockers.join('; ')}"`);
                }
                if (task.acceptanceCriteria.length > 0) {
                    csvLines.push(`Acceptance Criteria,"${task.acceptanceCriteria.join('; ')}"`);
                }
                if (task.definitionOfDone.length > 0) {
                    csvLines.push(`Definition of Done,"${task.definitionOfDone.join('; ')}"`);
                }
                csvLines.push('');
            });
        }
        // Sprint metrics
        const metrics = this.getSprintMetrics(sprint.id);
        if (metrics) {
            csvLines.push('Sprint Metrics');
            csvLines.push('Metric,Value');
            csvLines.push(`Progress,${metrics.progressPercentage.toFixed(1)}%`);
            csvLines.push(`Completed Tasks,${metrics.completedTasks}/${metrics.totalTasks}`);
            csvLines.push(`Completed Story Points,${metrics.completedStoryPoints}/${metrics.totalStoryPoints}`);
            csvLines.push(`In Progress Tasks,${metrics.inProgressTasks}`);
            csvLines.push(`Blocked Tasks,${metrics.blockedTasks}`);
            csvLines.push(`Velocity,${metrics.velocity.toFixed(1)} story points/day`);
            csvLines.push(`Capacity Utilization,${(metrics.capacityUtilization * 100).toFixed(1)}%`);
            csvLines.push(`Overall Risk,${metrics.riskAssessment.overallRisk}`);
            csvLines.push('');
            if (metrics.riskAssessment.recommendations.length > 0) {
                csvLines.push('Risk Recommendations');
                metrics.riskAssessment.recommendations.forEach((rec, index) => {
                    csvLines.push(`Recommendation ${index + 1},"${rec}"`);
                });
                csvLines.push('');
            }
            // Burndown data
            if (metrics.burndownData.length > 0) {
                csvLines.push('Burndown Data');
                csvLines.push('Date,Remaining Story Points,Remaining Tasks,Completed Story Points,Completed Tasks');
                metrics.burndownData.forEach(point => {
                    csvLines.push(`${point.date.toISOString().split('T')[0]},${point.remainingStoryPoints},${point.remainingTasks},${point.completedStoryPoints},${point.completedTasks}`);
                });
                csvLines.push('');
            }
        }
        return csvLines.join('\n');
    }
    convertToMarkdown(data) {
        let markdown = '# FailSafe Sprint Export\n\n';
        markdown += `**Export Date:** ${new Date().toLocaleString()}\n\n`;
        // Current Sprint
        if (data.currentSprint) {
            markdown += '## Current Sprint\n\n';
            markdown += this.generateSprintMarkdown(data.currentSprint);
        }
        // Sprint History
        if (data.sprintHistory && data.sprintHistory.length > 0) {
            markdown += '\n## Sprint History\n\n';
            data.sprintHistory.forEach((sprint, index) => {
                markdown += `### ${index + 1}. ${sprint.name}\n\n`;
                markdown += this.generateSprintMarkdown(sprint);
                markdown += '\n---\n\n';
            });
        }
        // Templates
        if (data.templates && data.templates.length > 0) {
            markdown += '## Sprint Templates\n\n';
            data.templates.forEach((template) => {
                markdown += `### ${template.name}\n\n`;
                markdown += `- **Description:** ${template.description}\n`;
                markdown += `- **Duration:** ${template.duration} days\n`;
                markdown += `- **Velocity:** ${template.velocity} story points/day\n`;
                markdown += `- **Capacity:** ${template.capacity} hours/day\n`;
                markdown += `- **Team Size:** ${template.teamSize} members\n\n`;
            });
        }
        return markdown;
    }
    generateSprintMarkdown(sprint) {
        let markdown = '';
        // Sprint Overview
        markdown += `**Status:** ${sprint.status}\n`;
        markdown += `**Duration:** ${sprint.duration} days\n`;
        markdown += `**Start Date:** ${sprint.startDate.toLocaleDateString()}\n`;
        markdown += `**End Date:** ${sprint.endDate.toLocaleDateString()}\n`;
        markdown += `**Velocity:** ${sprint.velocity} story points/day\n`;
        markdown += `**Capacity:** ${sprint.capacity} hours/day\n`;
        markdown += `**Team Size:** ${sprint.teamSize} members\n\n`;
        // Tasks
        if (sprint.tasks && sprint.tasks.length > 0) {
            markdown += '### Tasks\n\n';
            markdown += '| Task | Status | Story Points | Hours | Priority | Risk |\n';
            markdown += '|------|--------|--------------|-------|----------|------|\n';
            sprint.tasks.forEach((task) => {
                const status = task.status || 'Not Started';
                const storyPoints = task.storyPoints || 0;
                const hours = task.estimatedHours || 0;
                const priority = task.priority || 'Medium';
                const risk = task.riskLevel || 'Low';
                markdown += `| ${task.name} | ${status} | ${storyPoints} | ${hours} | ${priority} | ${risk} |\n`;
            });
            markdown += '\n';
            // Task Details
            markdown += '### Task Details\n\n';
            sprint.tasks.forEach((task) => {
                markdown += `#### ${task.name}\n\n`;
                markdown += `**Description:** ${task.description || 'No description'}\n\n`;
                markdown += `**Status:** ${task.status || 'Not Started'}\n`;
                markdown += `**Story Points:** ${task.storyPoints || 0}\n`;
                markdown += `**Estimated Hours:** ${task.estimatedHours || 0}\n`;
                if (task.actualHours) {
                    markdown += `**Actual Hours:** ${task.actualHours}\n`;
                }
                markdown += `**Priority:** ${task.priority || 'Medium'}\n`;
                markdown += `**Risk Level:** ${task.riskLevel || 'Low'}\n\n`;
                if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
                    markdown += '**Acceptance Criteria:**\n';
                    task.acceptanceCriteria.forEach((criteria) => {
                        markdown += `- ${criteria}\n`;
                    });
                    markdown += '\n';
                }
                if (task.definitionOfDone && task.definitionOfDone.length > 0) {
                    markdown += '**Definition of Done:**\n';
                    task.definitionOfDone.forEach((done) => {
                        markdown += `- ${done}\n`;
                    });
                    markdown += '\n';
                }
                if (task.dependencies && task.dependencies.length > 0) {
                    markdown += '**Dependencies:**\n';
                    task.dependencies.forEach((dep) => {
                        markdown += `- ${dep}\n`;
                    });
                    markdown += '\n';
                }
                if (task.blockers && task.blockers.length > 0) {
                    markdown += '**Blockers:**\n';
                    task.blockers.forEach((blocker) => {
                        markdown += `- ${blocker}\n`;
                    });
                    markdown += '\n';
                }
                markdown += '---\n\n';
            });
        }
        // Metrics
        const metrics = this.getSprintMetrics(sprint.id);
        if (metrics) {
            markdown += '### Sprint Metrics\n\n';
            markdown += `**Progress:** ${metrics.progressPercentage.toFixed(1)}%\n`;
            markdown += `**Completed Tasks:** ${metrics.completedTasks}/${metrics.totalTasks}\n`;
            markdown += `**Completed Story Points:** ${metrics.completedStoryPoints}/${metrics.totalStoryPoints}\n`;
            markdown += `**In Progress Tasks:** ${metrics.inProgressTasks}\n`;
            markdown += `**Blocked Tasks:** ${metrics.blockedTasks}\n`;
            markdown += `**Velocity:** ${metrics.velocity.toFixed(1)} story points/day\n`;
            markdown += `**Capacity Utilization:** ${(metrics.capacityUtilization * 100).toFixed(1)}%\n`;
            markdown += `**Overall Risk:** ${metrics.riskAssessment.overallRisk}\n\n`;
            if (metrics.riskAssessment.recommendations.length > 0) {
                markdown += '**Recommendations:**\n';
                metrics.riskAssessment.recommendations.forEach((rec) => {
                    markdown += `- ${rec}\n`;
                });
                markdown += '\n';
            }
        }
        return markdown;
    }
    async toggleTask(taskIndex) {
        try {
            if (!this.currentSprint) {
                throw new Error('No active sprint found');
            }
            if (taskIndex < 0 || taskIndex >= this.currentSprint.tasks.length) {
                throw new Error('Invalid task index');
            }
            const task = this.currentSprint.tasks[taskIndex];
            task.completed = !task.completed;
            if (task.completed) {
                task.endTime = new Date();
                task.status = types_1.TaskStatus.completed;
            }
            else {
                task.endTime = undefined;
                task.status = types_1.TaskStatus.pending;
            }
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            this.logger.info('Task toggled', {
                taskId: task.id,
                taskName: task.name,
                completed: task.completed
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to toggle task', error);
            return false;
        }
    }
    // ===============================
    // SPRINT IMPORT/EXPORT SYSTEM
    // ===============================
    /**
     * Export sprint data in standardized JSON format
     */
    async exportSprintToJSON(exportType = 'full_sprint', taskId) {
        try {
            const exportData = {
                version: '2.0.0',
                exportDate: new Date().toISOString(),
                exportType: exportType
            };
            if (exportType === 'single_task' && taskId) {
                const task = this.findTaskById(taskId);
                if (!task) {
                    throw new Error(`Task with ID ${taskId} not found`);
                }
                exportData.task = this.serializeTask(task);
            }
            else if (exportType === 'partial_sprint') {
                if (!this.currentSprint) {
                    throw new Error('No current sprint to export');
                }
                exportData.sprint = this.serializeSprintPartial(this.currentSprint);
            }
            else {
                // full_sprint
                if (!this.currentSprint) {
                    throw new Error('No current sprint to export');
                }
                exportData.sprint = this.serializeSprint(this.currentSprint);
            }
            const jsonString = JSON.stringify(exportData, null, 2);
            this.logger.info('Sprint exported successfully', {
                exportType,
                taskId,
                dataSize: jsonString.length
            });
            return jsonString;
        }
        catch (error) {
            this.logger.error('Failed to export sprint', error);
            throw error;
        }
    }
    /**
     * Import sprint data from JSON format
     */
    async importSprintFromJSON(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            // Validate import format
            const validation = this.validateImportFormat(importData);
            if (!validation.isValid) {
                return { success: false, message: validation.error || 'Invalid import format' };
            }
            const { version, exportType, sprint, task } = importData;
            if (exportType === 'single_task' && task) {
                return await this.importSingleTask(task);
            }
            else if (exportType === 'partial_sprint' && sprint) {
                return await this.importPartialSprint(sprint);
            }
            else if (exportType === 'full_sprint' && sprint) {
                return await this.importFullSprint(sprint);
            }
            else {
                return { success: false, message: 'Invalid export type or missing data' };
            }
        }
        catch (error) {
            this.logger.error('Failed to import sprint', error);
            return {
                success: false,
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Import single task into current sprint
     */
    async importSingleTask(taskData) {
        try {
            if (!this.currentSprint) {
                return { success: false, message: 'No current sprint to import task into' };
            }
            const task = this.deserializeTask(taskData);
            task.sprintId = this.currentSprint.id;
            task.sprintPosition = this.currentSprint.tasks.length + 1;
            // Check if task already exists
            const existingTaskIndex = this.currentSprint.tasks.findIndex(t => t.id === task.id);
            if (existingTaskIndex >= 0) {
                // Update existing task
                this.currentSprint.tasks[existingTaskIndex] = task;
                this.logger.info('Task updated during import', { taskId: task.id });
            }
            else {
                // Add new task
                this.currentSprint.tasks.push(task);
                this.logger.info('Task added during import', { taskId: task.id });
            }
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            return {
                success: true,
                message: 'Task imported successfully',
                importedData: { taskId: task.id, taskName: task.name }
            };
        }
        catch (error) {
            this.logger.error('Failed to import single task', error);
            return {
                success: false,
                message: `Failed to import task: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Import partial sprint data (update existing sprint)
     */
    async importPartialSprint(sprintData) {
        try {
            if (!this.currentSprint) {
                return { success: false, message: 'No current sprint to update' };
            }
            const updatedSprint = this.deserializeSprintPartial(sprintData);
            // Update only provided fields
            if (updatedSprint.name)
                this.currentSprint.name = updatedSprint.name;
            if (updatedSprint.description)
                this.currentSprint.description = updatedSprint.description;
            if (updatedSprint.startDate)
                this.currentSprint.startDate = updatedSprint.startDate;
            if (updatedSprint.endDate)
                this.currentSprint.endDate = updatedSprint.endDate;
            if (updatedSprint.duration)
                this.currentSprint.duration = updatedSprint.duration;
            if (updatedSprint.status)
                this.currentSprint.status = updatedSprint.status;
            if (updatedSprint.velocity)
                this.currentSprint.velocity = updatedSprint.velocity;
            if (updatedSprint.capacity)
                this.currentSprint.capacity = updatedSprint.capacity;
            if (updatedSprint.teamSize)
                this.currentSprint.teamSize = updatedSprint.teamSize;
            if (updatedSprint.metadata)
                this.currentSprint.metadata = { ...this.currentSprint.metadata, ...updatedSprint.metadata };
            // Update tasks if provided
            if (updatedSprint.tasks && Array.isArray(updatedSprint.tasks)) {
                for (const taskData of updatedSprint.tasks) {
                    const task = this.deserializeTask(taskData);
                    task.sprintId = this.currentSprint.id;
                    const existingTaskIndex = this.currentSprint.tasks.findIndex(t => t.id === task.id);
                    if (existingTaskIndex >= 0) {
                        this.currentSprint.tasks[existingTaskIndex] = task;
                    }
                    else {
                        task.sprintPosition = this.currentSprint.tasks.length + 1;
                        this.currentSprint.tasks.push(task);
                    }
                }
            }
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            return {
                success: true,
                message: 'Sprint updated successfully',
                importedData: { sprintId: this.currentSprint.id, sprintName: this.currentSprint.name }
            };
        }
        catch (error) {
            this.logger.error('Failed to import partial sprint', error);
            return {
                success: false,
                message: `Failed to update sprint: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Import full sprint (replace current sprint)
     */
    async importFullSprint(sprintData) {
        try {
            const newSprint = this.deserializeSprint(sprintData);
            // If there's a current sprint, move it to history
            if (this.currentSprint) {
                this.sprintHistory.push(this.currentSprint);
            }
            // Set as current sprint
            this.currentSprint = newSprint;
            this.saveSprints();
            return {
                success: true,
                message: 'Sprint imported successfully',
                importedData: { sprintId: newSprint.id, sprintName: newSprint.name, taskCount: newSprint.tasks.length }
            };
        }
        catch (error) {
            this.logger.error('Failed to import full sprint', error);
            return {
                success: false,
                message: `Failed to import sprint: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Validate import JSON format
     */
    validateImportFormat(data) {
        if (!data || typeof data !== 'object') {
            return { isValid: false, error: 'Invalid JSON data' };
        }
        if (!data.version || !data.exportType) {
            return { isValid: false, error: 'Missing required fields: version, exportType' };
        }
        if (!['full_sprint', 'partial_sprint', 'single_task'].includes(data.exportType)) {
            return { isValid: false, error: 'Invalid export type' };
        }
        if (data.exportType === 'single_task' && !data.task) {
            return { isValid: false, error: 'Single task export missing task data' };
        }
        if ((data.exportType === 'partial_sprint' || data.exportType === 'full_sprint') && !data.sprint) {
            return { isValid: false, error: 'Sprint export missing sprint data' };
        }
        return { isValid: true };
    }
    /**
     * Serialize sprint for export
     */
    serializeSprint(sprint) {
        return {
            id: sprint.id,
            name: sprint.name,
            description: sprint.description,
            startDate: sprint.startDate.toISOString(),
            endDate: sprint.endDate.toISOString(),
            duration: sprint.duration,
            status: sprint.status,
            velocity: sprint.velocity,
            capacity: sprint.capacity,
            teamSize: sprint.teamSize,
            createdAt: sprint.createdAt.toISOString(),
            updatedAt: sprint.updatedAt.toISOString(),
            createdBy: sprint.createdBy,
            version: sprint.version,
            metadata: sprint.metadata,
            tasks: sprint.tasks.map(task => this.serializeTask(task))
        };
    }
    /**
     * Serialize partial sprint for export
     */
    serializeSprintPartial(sprint) {
        return {
            name: sprint.name,
            description: sprint.description,
            startDate: sprint.startDate.toISOString(),
            endDate: sprint.endDate.toISOString(),
            duration: sprint.duration,
            status: sprint.status,
            velocity: sprint.velocity,
            capacity: sprint.capacity,
            teamSize: sprint.teamSize,
            metadata: sprint.metadata,
            tasks: sprint.tasks.map(task => this.serializeTask(task))
        };
    }
    /**
     * Serialize task for export
     */
    serializeTask(task) {
        return {
            id: task.id,
            name: task.name,
            description: task.description,
            status: task.status,
            startTime: task.startTime?.toISOString(),
            endTime: task.endTime?.toISOString(),
            estimatedDuration: task.estimatedDuration,
            estimatedHours: task.estimatedHours,
            actualDuration: task.actualDuration,
            dueDate: task.dueDate?.toISOString(),
            completionTime: task.completionTime?.toISOString(),
            dependencies: task.dependencies,
            blockers: task.blockers,
            priority: task.priority,
            parentTaskId: task.parentTaskId,
            completedAt: task.completedAt,
            storyPoints: task.storyPoints,
            actualHours: task.actualHours,
            sprintPosition: task.sprintPosition,
            riskLevel: task.riskLevel,
            acceptanceCriteria: task.acceptanceCriteria,
            definitionOfDone: task.definitionOfDone,
            completed: task.completed,
            assignee: task.assignee
        };
    }
    /**
     * Deserialize sprint from import
     */
    deserializeSprint(sprintData) {
        return {
            id: sprintData.id || this.generateSprintId(),
            name: sprintData.name,
            description: sprintData.description,
            startDate: new Date(sprintData.startDate),
            endDate: new Date(sprintData.endDate),
            duration: sprintData.duration,
            status: sprintData.status,
            velocity: sprintData.velocity,
            capacity: sprintData.capacity,
            teamSize: sprintData.teamSize,
            createdAt: new Date(sprintData.createdAt),
            updatedAt: new Date(sprintData.updatedAt),
            createdBy: sprintData.createdBy,
            version: sprintData.version,
            metadata: sprintData.metadata,
            tasks: sprintData.tasks.map((taskData) => this.deserializeTask(taskData))
        };
    }
    /**
     * Deserialize partial sprint from import
     */
    deserializeSprintPartial(sprintData) {
        return {
            name: sprintData.name,
            description: sprintData.description,
            startDate: sprintData.startDate ? new Date(sprintData.startDate) : undefined,
            endDate: sprintData.endDate ? new Date(sprintData.endDate) : undefined,
            duration: sprintData.duration,
            status: sprintData.status,
            velocity: sprintData.velocity,
            capacity: sprintData.capacity,
            teamSize: sprintData.teamSize,
            metadata: sprintData.metadata,
            tasks: sprintData.tasks?.map((taskData) => this.deserializeTask(taskData))
        };
    }
    /**
     * Deserialize task from import
     */
    deserializeTask(taskData) {
        return {
            id: taskData.id || this.generateTaskId(taskData.name),
            name: taskData.name,
            description: taskData.description,
            status: taskData.status || types_1.TaskStatus.notStarted,
            startTime: taskData.startTime ? new Date(taskData.startTime) : undefined,
            endTime: taskData.endTime ? new Date(taskData.endTime) : undefined,
            estimatedDuration: taskData.estimatedDuration || 0,
            estimatedHours: taskData.estimatedHours || 0,
            actualDuration: taskData.actualDuration,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            completionTime: taskData.completionTime ? new Date(taskData.completionTime) : undefined,
            dependencies: taskData.dependencies || [],
            blockers: taskData.blockers || [],
            priority: taskData.priority || types_1.TaskPriority.medium,
            parentTaskId: taskData.parentTaskId,
            completedAt: taskData.completedAt,
            storyPoints: taskData.storyPoints || 0,
            sprintId: taskData.sprintId || '',
            actualHours: taskData.actualHours,
            sprintPosition: taskData.sprintPosition || 0,
            riskLevel: taskData.riskLevel || 'low',
            acceptanceCriteria: taskData.acceptanceCriteria || [],
            definitionOfDone: taskData.definitionOfDone || [],
            completed: taskData.completed || false,
            assignee: taskData.assignee || 'User'
        };
    }
    /**
     * Find task by ID across all sprints
     */
    findTaskById(taskId) {
        // Check current sprint
        if (this.currentSprint) {
            const task = this.currentSprint.tasks.find(t => t.id === taskId);
            if (task)
                return task;
        }
        // Check sprint history
        for (const sprint of this.sprintHistory) {
            const task = sprint.tasks.find(t => t.id === taskId);
            if (task)
                return task;
        }
        return null;
    }
    /**
     * Generate unique task ID
     */
    generateTaskId(taskName) {
        const timestamp = Date.now();
        const sanitizedName = taskName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return `task-${sanitizedName}-${timestamp}`;
    }
}
exports.SprintPlanner = SprintPlanner;
//# sourceMappingURL=sprintPlanner.js.map