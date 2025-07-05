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
exports.ProjectPlan = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
class ProjectPlan {
    constructor(logger) {
        this.currentPlan = null;
        this.linearMode = true;
        this.lastActivity = new Date();
        this.projectManagerExtension = null;
        this.logger = logger;
        this.projectFile = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe', 'basic-project.json');
        this.initializeProjectManagerIntegration();
    }
    async initializeProjectManagerIntegration() {
        try {
            // Check if Project Management Extension is available
            const extensions = vscode.extensions.all;
            const projectManagerExt = extensions.find(ext => ext.id === 'mythologiq.project-manager' ||
                ext.id.includes('project-manager'));
            if (projectManagerExt) {
                // Initialize integration with Project Management Extension
                this.logger.info('Project Management Extension found, initializing integration');
                // Basic extension-to-extension communication
                try {
                    // Try to activate the extension and get its API
                    if (!projectManagerExt.isActive) {
                        await projectManagerExt.activate();
                    }
                    // Attempt to communicate via commands
                    const commands = await vscode.commands.getCommands(true);
                    const hasProjectCommands = commands.some(cmd => cmd.includes('project') || cmd.includes('task') || cmd.includes('mythologiq'));
                    if (hasProjectCommands) {
                        this.logger.info('Project Management Extension commands detected, integration available');
                        // Set up basic integration
                        this.setupExtensionIntegration(projectManagerExt);
                    }
                    else {
                        this.logger.info('Project Management Extension found but no integration commands available');
                    }
                }
                catch (error) {
                    this.logger.warn('Failed to initialize extension integration, using basic mode', error);
                }
            }
            else {
                this.logger.info('No Project Management Extension found, using basic project tracking');
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize project manager integration', error);
        }
    }
    setupExtensionIntegration(extension) {
        // Set up basic integration with the project management extension
        this.logger.info('Setting up extension integration');
        // Register commands that can be called by the other extension
        vscode.commands.registerCommand('failsafe.getProjectStatus', () => {
            return this.getProjectStatus();
        });
        vscode.commands.registerCommand('failsafe.getCurrentTask', () => {
            return this.getCurrentTask();
        });
        vscode.commands.registerCommand('failsafe.recordActivity', (activity) => {
            this.recordActivity(activity);
        });
        this.logger.info('Extension integration commands registered');
    }
    async initialize() {
        try {
            await this.loadProject();
            this.logger.info('Basic project plan initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize basic project plan', error);
        }
    }
    async createBasicProject() {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'My Project',
                validateInput: (value) => value.trim().length > 0 ? null : 'Project name is required'
            });
            if (!name)
                return;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter project description (optional)',
                placeHolder: 'Brief description of the project'
            });
            const plan = {
                id: this.generateProjectId(),
                name: name.trim(),
                description: description || '',
                currentTask: null,
                tasks: this.generateBasicTasks(),
                lastUpdated: new Date(),
                createdBy: 'User',
                version: '1.0'
            };
            this.currentPlan = plan;
            await this.saveProject();
            this.logger.info('Basic project plan created', { planId: plan.id, name: plan.name });
        }
        catch (error) {
            this.logger.error('Failed to create basic project', error);
        }
    }
    generateProjectId() {
        return `basic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateBasicTasks() {
        return [
            {
                id: 'setup',
                name: 'Project Setup',
                description: 'Initialize development environment and project structure',
                status: types_1.TaskStatus.inProgress,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 60,
                dependencies: [],
                blockers: [],
                priority: types_1.TaskPriority.high
            },
            {
                id: 'development',
                name: 'Development',
                description: 'Main development work',
                status: types_1.TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 240,
                dependencies: ['setup'],
                blockers: [],
                priority: types_1.TaskPriority.critical
            },
            {
                id: 'testing',
                name: 'Testing & QA',
                description: 'Testing and quality assurance',
                status: types_1.TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 120,
                dependencies: ['development'],
                blockers: [],
                priority: types_1.TaskPriority.medium
            },
            {
                id: 'deployment',
                name: 'Deployment',
                description: 'Deploy and launch',
                status: types_1.TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 60,
                dependencies: ['testing'],
                blockers: [],
                priority: types_1.TaskPriority.medium
            }
        ];
    }
    async loadProject() {
        try {
            if (fs.existsSync(this.projectFile)) {
                const content = fs.readFileSync(this.projectFile, 'utf8');
                const data = JSON.parse(content);
                // Convert dates back to Date objects
                if (data.lastUpdated)
                    data.lastUpdated = new Date(data.lastUpdated);
                if (data.currentTask && data.currentTask.startTime) {
                    data.currentTask.startTime = new Date(data.currentTask.startTime);
                }
                if (data.currentTask && data.currentTask.endTime) {
                    data.currentTask.endTime = new Date(data.currentTask.endTime);
                }
                // Convert task dates
                if (data.tasks) {
                    data.tasks.forEach((task) => {
                        if (task.startTime)
                            task.startTime = new Date(task.startTime);
                        if (task.endTime)
                            task.endTime = new Date(task.endTime);
                    });
                }
                this.currentPlan = data;
                this.logger.info('Basic project plan loaded from file', { planId: data.id, name: data.name });
            }
        }
        catch (error) {
            this.logger.error('Failed to load project file', error);
        }
    }
    async saveProject() {
        if (!this.currentPlan)
            return;
        try {
            const projectDir = path.dirname(this.projectFile);
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }
            this.currentPlan.lastUpdated = new Date();
            fs.writeFileSync(this.projectFile, JSON.stringify(this.currentPlan, null, 2));
            this.logger.debug('Basic project plan saved to file');
        }
        catch (error) {
            this.logger.error('Failed to save project file', error);
        }
    }
    // Integration API for Project Management Extension
    getProjectIntegrationAPI() {
        return {
            getCurrentTask: () => this.getCurrentTask(),
            getProjectStatus: () => this.getProjectStatus(),
            validateTaskCompletion: () => this.validateTaskCompletion(),
            reportActivity: (activity) => this.recordActivity(activity),
            getProjectConstraints: () => this.getProjectConstraints(),
            checkProjectRisks: () => this.checkProjectRisks()
        };
    }
    getCurrentTask() {
        if (this.projectManagerExtension) {
            return this.projectManagerExtension.getCurrentTask();
        }
        return this.currentPlan?.currentTask || null;
    }
    getAllTasks() {
        if (this.projectManagerExtension) {
            // Get tasks from Project Management Extension
            return [];
        }
        return this.currentPlan?.tasks || [];
    }
    getTasksByStatus(status) {
        const tasks = this.getAllTasks();
        return tasks.filter(task => task.status === status);
    }
    getReadyTasks() {
        const tasks = this.getAllTasks();
        return tasks.filter(task => {
            if (task.status !== types_1.TaskStatus.notStarted) {
                return false;
            }
            // Check if all dependencies are completed
            return task.dependencies.every(depId => {
                const depTask = tasks.find(t => t.id === depId);
                return depTask && depTask.status === types_1.TaskStatus.completed;
            });
        });
    }
    async startTask(taskId) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task start to Project Management Extension');
            return;
        }
        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && this.currentPlan) {
            task.status = types_1.TaskStatus.inProgress;
            task.startTime = new Date();
            this.currentPlan.currentTask = task;
            await this.saveProject();
            this.logger.info(`Started task: ${task.name}`);
        }
    }
    async completeTask(taskId) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task completion to Project Management Extension');
            return;
        }
        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && this.currentPlan) {
            task.status = types_1.TaskStatus.completed;
            task.endTime = new Date();
            if (this.currentPlan.currentTask?.id === taskId) {
                this.currentPlan.currentTask = null;
            }
            await this.saveProject();
            this.logger.info(`Completed task: ${task.name}`);
        }
    }
    async blockTask(taskId, reason) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task blocking to Project Management Extension');
            return;
        }
        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = types_1.TaskStatus.blocked;
            task.blockers.push(reason);
            await this.saveProject();
            this.logger.info(`Blocked task: ${task.name} - ${reason}`);
        }
    }
    async unblockTask(taskId) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task unblocking to Project Management Extension');
            return;
        }
        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && task.status === types_1.TaskStatus.blocked) {
            task.status = types_1.TaskStatus.notStarted;
            task.blockers = [];
            await this.saveProject();
            this.logger.info(`Unblocked task: ${task.name}`);
        }
    }
    getProjectProgress() {
        const tasks = this.getAllTasks();
        const totalTasks = tasks.length;
        const inProgressTasks = tasks.filter(t => t.status === types_1.TaskStatus.inProgress).length;
        const blockedTasks = tasks.filter(t => t.status === types_1.TaskStatus.blocked).length;
        const completedTasks = tasks.filter(t => t.status === types_1.TaskStatus.completed).length;
        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        // Calculate estimated remaining time
        const remainingTasks = tasks.filter(t => t.status !== types_1.TaskStatus.completed);
        const estimatedRemainingTime = remainingTasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0);
        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            blockedTasks,
            progressPercentage,
            estimatedRemainingTime
        };
    }
    getCriticalPath() {
        // Simplified critical path for basic project tracking
        const tasks = this.getAllTasks();
        const inProgressTasks = tasks.filter(t => t.status === types_1.TaskStatus.inProgress);
        const blockedTasks = tasks.filter(t => t.status === types_1.TaskStatus.blocked);
        return [...inProgressTasks, ...blockedTasks];
    }
    addTask(task) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task addition to Project Management Extension');
            return;
        }
        if (this.currentPlan) {
            this.currentPlan.tasks.push(task);
            this.saveProject();
        }
    }
    removeTask(taskId) {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task removal to Project Management Extension');
            return;
        }
        if (this.currentPlan) {
            this.currentPlan.tasks = this.currentPlan.tasks.filter(task => task.id !== taskId);
            this.saveProject();
        }
    }
    updateTask(taskId, updates) {
        if (!this.currentPlan)
            return;
        const taskIndex = this.currentPlan.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.currentPlan.tasks[taskIndex] = { ...this.currentPlan.tasks[taskIndex], ...updates };
            this.currentPlan.lastUpdated = new Date();
            this.saveProject();
            this.logger.info('Task updated', { taskId, updates });
        }
    }
    async addSubtasks(parentTaskId, subtasks) {
        if (!this.currentPlan) {
            throw new Error('No project plan loaded');
        }
        const parentTask = this.currentPlan.tasks.find(t => t.id === parentTaskId);
        if (!parentTask) {
            throw new Error(`Parent task ${parentTaskId} not found`);
        }
        const addedSubtasks = [];
        for (const subtaskData of subtasks) {
            const subtask = {
                id: `${parentTaskId}-subtask-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: subtaskData.name || 'Unnamed Subtask',
                description: subtaskData.description || '',
                status: subtaskData.status || types_1.TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: (subtaskData.estimatedHours || 1) * 60, // Convert hours to minutes
                dependencies: subtaskData.dependencies || [],
                blockers: [],
                priority: subtaskData.priority || types_1.TaskPriority.medium,
                parentTaskId: parentTaskId
            };
            this.currentPlan.tasks.push(subtask);
            addedSubtasks.push(subtask);
        }
        this.currentPlan.lastUpdated = new Date();
        await this.saveProject();
        this.logger.info('Subtasks added', {
            parentTaskId,
            subtaskCount: addedSubtasks.length,
            subtaskIds: addedSubtasks.map(t => t.id)
        });
        return addedSubtasks;
    }
    enforceLinearProgression() {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating linear progression to Project Management Extension');
            return;
        }
        // Basic linear progression enforcement
        const tasks = this.getAllTasks();
        const inProgressTasks = tasks.filter(t => t.status === types_1.TaskStatus.inProgress);
        if (inProgressTasks.length > 1) {
            // Multiple tasks in progress - enforce linear progression
            inProgressTasks.slice(1).forEach(task => {
                task.status = types_1.TaskStatus.notStarted;
            });
            this.logger.info('Enforced linear progression - only one task in progress');
        }
    }
    analyzeFeasibility() {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating feasibility analysis to Project Management Extension');
            return {
                isBlocked: false,
                blockers: [],
                feasibility: 'feasible',
                recommendations: [],
                estimatedImpact: 'low'
            };
        }
        // Basic feasibility analysis
        const currentTask = this.getCurrentTask();
        const blockers = [];
        if (currentTask && currentTask.status === types_1.TaskStatus.blocked) {
            blockers.push(...currentTask.blockers);
        }
        const feasibility = blockers.length === 0 ? 'feasible' :
            blockers.length <= 2 ? 'questionable' : 'infeasible';
        return {
            isBlocked: blockers.length > 0,
            blockers,
            feasibility,
            recommendations: blockers.length > 0 ? ['Resolve blockers before proceeding'] : [],
            estimatedImpact: blockers.length === 0 ? 'low' : blockers.length <= 2 ? 'medium' : 'high'
        };
    }
    getLinearProgressState() {
        const tasks = this.getAllTasks();
        const currentTask = tasks.find(t => t.status === types_1.TaskStatus.inProgress) || null;
        const completedTasks = tasks.filter(t => t.status === types_1.TaskStatus.completed);
        const blockedTasks = tasks.filter(t => t.status === types_1.TaskStatus.blocked);
        const nextTask = tasks.find(t => t.status === types_1.TaskStatus.notStarted) || null;
        const totalProgress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
        return {
            currentTask,
            nextTask,
            blockedTasks,
            completedTasks,
            totalProgress,
            estimatedCompletion: null, // Basic version doesn't track end dates
            lastActivity: this.lastActivity,
            isOnTrack: true, // Basic version assumes on track
            deviations: []
        };
    }
    recordActivity(activity, taskId) {
        this.lastActivity = new Date();
        this.logger.info('Activity recorded', { activity, taskId, timestamp: this.lastActivity });
    }
    getAccountabilityReport() {
        const currentTask = this.getCurrentTask();
        const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
        let currentTaskDuration = null;
        if (currentTask && currentTask.startTime) {
            currentTaskDuration = Date.now() - currentTask.startTime.getTime();
        }
        const overdueTasks = [];
        const recommendations = [];
        if (currentTask && currentTaskDuration && currentTaskDuration > 4 * 60 * 60 * 1000) { // 4 hours
            recommendations.push('Current task has been in progress for over 4 hours. Consider taking a break or asking for help.');
        }
        if (timeSinceLastActivity > 30 * 60 * 1000) { // 30 minutes
            recommendations.push('No recent activity detected. Consider resuming work or updating task status.');
        }
        return {
            lastActivity: this.lastActivity,
            timeSinceLastActivity,
            currentTaskDuration,
            overdueTasks,
            recommendations
        };
    }
    async validatePlan() {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating plan validation to Project Management Extension');
            return {
                status: 'in_progress',
                ruleResults: ['Using Project Management Extension for validation'],
                llmResults: null,
                recommendations: ['Continue using Project Management Extension for detailed validation'],
                llmIsCurrent: false,
                llmTimestamp: null
            };
        }
        if (!this.currentPlan) {
            return {
                status: 'missing',
                ruleResults: ['No project plan found'],
                llmResults: null,
                recommendations: ['Create a basic project plan or install Project Management Extension'],
                llmIsCurrent: false,
                llmTimestamp: null
            };
        }
        const ruleResults = [];
        const recommendations = [];
        if (this.currentPlan.tasks.length === 0) {
            ruleResults.push('No tasks defined');
            recommendations.push('Add tasks to the project plan');
        }
        const completedTasks = this.currentPlan.tasks.filter(t => t.status === types_1.TaskStatus.completed).length;
        const totalTasks = this.currentPlan.tasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        let status;
        if (progress === 0) {
            status = 'empty';
        }
        else if (progress === 100) {
            status = 'complete';
        }
        else {
            status = 'in_progress';
        }
        return {
            status,
            ruleResults,
            llmResults: null,
            recommendations,
            llmIsCurrent: false,
            llmTimestamp: null
        };
    }
    canStartTask(taskId) {
        const task = this.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            return { canStart: false, reason: 'Task not found' };
        }
        if (task.status !== types_1.TaskStatus.notStarted) {
            return { canStart: false, reason: 'Task is not in NOT_STARTED status' };
        }
        // Check dependencies
        const tasks = this.getAllTasks();
        const unmetDependencies = task.dependencies.filter(depId => {
            const depTask = tasks.find(t => t.id === depId);
            return !depTask || depTask.status !== types_1.TaskStatus.completed;
        });
        if (unmetDependencies.length > 0) {
            return { canStart: false, reason: `Dependencies not met: ${unmetDependencies.join(', ')}` };
        }
        return { canStart: true };
    }
    // Helper methods for integration
    getProjectStatus() {
        const tasks = this.getAllTasks();
        const blockedTasks = tasks.filter(t => t.status === types_1.TaskStatus.blocked);
        const completedTasks = tasks.filter(t => t.status === types_1.TaskStatus.completed);
        if (blockedTasks.length > 0)
            return 'blocked';
        if (completedTasks.length === tasks.length)
            return 'complete';
        return 'active';
    }
    validateTaskCompletion() {
        const currentTask = this.getCurrentTask();
        return currentTask?.status === types_1.TaskStatus.completed;
    }
    getProjectConstraints() {
        // Basic constraints - could be enhanced
        return ['Time', 'Quality', 'Scope'];
    }
    checkProjectRisks() {
        // Basic risk checking - could be enhanced
        const tasks = this.getAllTasks();
        const blockedTasks = tasks.filter(t => t.status === types_1.TaskStatus.blocked);
        const risks = [];
        if (blockedTasks.length > 0) {
            risks.push('Blocked tasks may delay project completion');
        }
        const inProgressTasks = tasks.filter(t => t.status === types_1.TaskStatus.inProgress);
        if (inProgressTasks.length > 1) {
            risks.push('Multiple tasks in progress may indicate scope creep');
        }
        return risks;
    }
}
exports.ProjectPlan = ProjectPlan;
//# sourceMappingURL=projectPlan.js.map