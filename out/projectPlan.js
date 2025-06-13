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
exports.ProjectPlan = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
class ProjectPlan {
    constructor(logger) {
        this.tasks = new Map();
        this.currentTaskId = null;
        this.linearMode = true; // Enforce linear progression
        this.lastActivity = new Date();
        this.lastLLMValidation = { result: null, timestamp: null, planHash: null };
        this.logger = logger;
        this.projectFile = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe', 'project.json');
        this.initializeDefaultTasks();
    }
    async initialize() {
        try {
            await this.loadProject();
            this.logger.info('Project plan initialized', { taskCount: this.tasks.size });
        }
        catch (error) {
            this.logger.error('Failed to initialize project plan', error);
            // Continue with default tasks
        }
    }
    initializeDefaultTasks() {
        const defaultTasks = [
            {
                id: 'setup',
                name: 'Project Setup',
                description: 'Initialize development environment and project structure',
                status: types_1.TaskStatus.IN_PROGRESS,
                startTime: new Date(),
                estimatedDuration: 60,
                dependencies: [],
                blockers: [],
                priority: types_1.TaskPriority.HIGH
            },
            {
                id: 'core-features',
                name: 'Core Features Implementation',
                description: 'Implement timeout watchdog, validator, and test runner',
                status: types_1.TaskStatus.NOT_STARTED,
                estimatedDuration: 240,
                dependencies: ['setup'],
                blockers: [],
                priority: types_1.TaskPriority.CRITICAL
            },
            {
                id: 'ui-integration',
                name: 'UI Integration',
                description: 'Build Cursor v0 UI components and project tracker',
                status: types_1.TaskStatus.NOT_STARTED,
                estimatedDuration: 180,
                dependencies: ['core-features'],
                blockers: [],
                priority: types_1.TaskPriority.HIGH
            },
            {
                id: 'testing',
                name: 'Testing & QA',
                description: 'Comprehensive testing and quality assurance',
                status: types_1.TaskStatus.NOT_STARTED,
                estimatedDuration: 120,
                dependencies: ['ui-integration'],
                blockers: [],
                priority: types_1.TaskPriority.MEDIUM
            },
            {
                id: 'deployment',
                name: 'Deployment',
                description: 'Package and publish to Cursor extension registry',
                status: types_1.TaskStatus.NOT_STARTED,
                estimatedDuration: 60,
                dependencies: ['testing'],
                blockers: [],
                priority: types_1.TaskPriority.MEDIUM
            }
        ];
        defaultTasks.forEach(task => {
            this.tasks.set(task.id, task);
            // Set currentTaskId if this is the first IN_PROGRESS task
            if (task.status === types_1.TaskStatus.IN_PROGRESS && !this.currentTaskId) {
                this.currentTaskId = task.id;
            }
        });
    }
    async loadProject() {
        try {
            if (fs.existsSync(this.projectFile)) {
                const content = fs.readFileSync(this.projectFile, 'utf8');
                const data = JSON.parse(content);
                if (data.tasks) {
                    data.tasks.forEach((taskData) => {
                        const task = {
                            ...taskData,
                            startTime: taskData.startTime ? new Date(taskData.startTime) : undefined,
                            endTime: taskData.endTime ? new Date(taskData.endTime) : undefined
                        };
                        this.tasks.set(task.id, task);
                    });
                }
                this.currentTaskId = data.currentTaskId || null;
                this.logger.info('Project loaded from file', { taskCount: this.tasks.size });
            }
        }
        catch (error) {
            this.logger.error('Failed to load project file', error);
        }
    }
    async saveProject() {
        try {
            const projectDir = path.dirname(this.projectFile);
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }
            const data = {
                currentTaskId: this.currentTaskId,
                tasks: Array.from(this.tasks.values()),
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.projectFile, JSON.stringify(data, null, 2));
            this.logger.debug('Project saved to file');
        }
        catch (error) {
            this.logger.error('Failed to save project file', error);
        }
    }
    getCurrentTask() {
        if (!this.currentTaskId) {
            return null;
        }
        return this.tasks.get(this.currentTaskId) || null;
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }
    getReadyTasks() {
        return Array.from(this.tasks.values()).filter(task => {
            if (task.status !== types_1.TaskStatus.NOT_STARTED) {
                return false;
            }
            // Check if all dependencies are completed
            return task.dependencies.every(depId => {
                const depTask = this.tasks.get(depId);
                return depTask && depTask.status === types_1.TaskStatus.COMPLETED;
            });
        });
    }
    async startTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // Check linear progression constraints
        const canStart = this.canStartTask(taskId);
        if (!canStart.canStart) {
            throw new Error(canStart.reason || 'Cannot start task');
        }
        if (task.status !== types_1.TaskStatus.NOT_STARTED) {
            throw new Error(`Task ${taskId} is not ready to start`);
        }
        // Check dependencies
        const uncompletedDeps = task.dependencies.filter(depId => {
            const depTask = this.tasks.get(depId);
            return !depTask || depTask.status !== types_1.TaskStatus.COMPLETED;
        });
        if (uncompletedDeps.length > 0) {
            throw new Error(`Task ${taskId} has uncompleted dependencies: ${uncompletedDeps.join(', ')}`);
        }
        task.status = types_1.TaskStatus.IN_PROGRESS;
        task.startTime = new Date();
        this.currentTaskId = taskId;
        // Enforce linear progression
        this.enforceLinearProgression();
        // Record activity
        this.recordActivity(`Started task: ${task.name}`, taskId);
        this.logger.info('Task started', { taskId, taskName: task.name });
        await this.saveProject();
    }
    async completeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (task.status !== types_1.TaskStatus.IN_PROGRESS) {
            throw new Error(`Task ${taskId} is not in progress`);
        }
        task.status = types_1.TaskStatus.COMPLETED;
        task.endTime = new Date();
        if (this.currentTaskId === taskId) {
            this.currentTaskId = null;
        }
        // Record activity
        this.recordActivity(`Completed task: ${task.name}`, taskId);
        this.logger.info('Task completed', { taskId, taskName: task.name });
        await this.saveProject();
    }
    async blockTask(taskId, reason) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        task.status = types_1.TaskStatus.BLOCKED;
        task.blockers.push(reason);
        // If this is the current task, clear it
        if (this.currentTaskId === taskId) {
            this.currentTaskId = null;
        }
        // Record activity
        this.recordActivity(`Blocked task: ${task.name} - ${reason}`, taskId);
        this.logger.warn('Task blocked', { taskId, taskName: task.name, reason });
        await this.saveProject();
    }
    async unblockTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (task.status === types_1.TaskStatus.BLOCKED) {
            task.status = types_1.TaskStatus.NOT_STARTED;
            task.blockers = [];
        }
        this.logger.info('Task unblocked', { taskId, taskName: task.name });
        await this.saveProject();
    }
    getProjectProgress() {
        const allTasks = Array.from(this.tasks.values());
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === types_1.TaskStatus.COMPLETED).length;
        const inProgressTasks = allTasks.filter(t => t.status === types_1.TaskStatus.IN_PROGRESS).length;
        const blockedTasks = allTasks.filter(t => t.status === types_1.TaskStatus.BLOCKED).length;
        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        // Calculate estimated remaining time
        const remainingTasks = allTasks.filter(t => t.status === types_1.TaskStatus.NOT_STARTED || t.status === types_1.TaskStatus.IN_PROGRESS);
        const estimatedRemainingTime = remainingTasks.reduce((total, task) => {
            if (task.status === types_1.TaskStatus.IN_PROGRESS && task.startTime) {
                const elapsed = Date.now() - task.startTime.getTime();
                const remaining = Math.max(0, task.estimatedDuration * 60 * 1000 - elapsed);
                return total + remaining;
            }
            return total + (task.estimatedDuration * 60 * 1000);
        }, 0);
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
        const criticalTasks = [];
        const visited = new Set();
        const visit = (taskId) => {
            if (visited.has(taskId)) {
                return;
            }
            visited.add(taskId);
            const task = this.tasks.get(taskId);
            if (!task) {
                return;
            }
            if (task.priority === types_1.TaskPriority.CRITICAL) {
                criticalTasks.push(task);
            }
            // Visit dependencies
            task.dependencies.forEach(depId => visit(depId));
        };
        // Start from all tasks and find critical path
        Array.from(this.tasks.keys()).forEach(taskId => visit(taskId));
        return criticalTasks.sort((a, b) => {
            if (a.priority === b.priority) {
                return a.name.localeCompare(b.name);
            }
            return b.priority.localeCompare(a.priority);
        });
    }
    addTask(task) {
        this.tasks.set(task.id, task);
        this.logger.info('Task added', { taskId: task.id, taskName: task.name });
    }
    removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.delete(taskId);
            this.logger.info('Task removed', { taskId, taskName: task.name });
        }
    }
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        Object.assign(task, updates);
        this.logger.info('Task updated', { taskId, updates });
    }
    /**
     * Enforces linear progression - only one task can be active at a time
     */
    enforceLinearProgression() {
        if (!this.linearMode)
            return;
        const inProgressTasks = this.getTasksByStatus(types_1.TaskStatus.IN_PROGRESS);
        if (inProgressTasks.length > 1) {
            // Keep only the current task, block others
            inProgressTasks.forEach(task => {
                if (task.id !== this.currentTaskId) {
                    this.blockTask(task.id, 'Linear progression enforced - another task is active');
                }
            });
        }
    }
    /**
     * Analyzes if a requested functionality is feasible given current project state
     */
    analyzeFeasibility(request, context) {
        const blockers = [];
        const recommendations = [];
        let feasibility = 'feasible';
        let estimatedImpact = 'low';
        // Check current task status
        const currentTask = this.getCurrentTask();
        if (!currentTask) {
            blockers.push('No active task - project may not be initialized');
            feasibility = 'questionable';
        }
        // Check for common infeasible requests
        const infeasiblePatterns = [
            /create.*api.*key/i,
            /generate.*real.*data/i,
            /connect.*to.*production/i,
            /deploy.*to.*live/i,
            /access.*external.*service/i
        ];
        const questionablePatterns = [
            /mock.*data/i,
            /fake.*api/i,
            /simulate.*response/i,
            /test.*with.*dummy/i
        ];
        if (infeasiblePatterns.some(pattern => pattern.test(request))) {
            blockers.push('Request appears to ask for real external resources or production access');
            feasibility = 'infeasible';
            estimatedImpact = 'high';
            recommendations.push('Consider using mock data or test environments instead');
        }
        if (questionablePatterns.some(pattern => pattern.test(request))) {
            blockers.push('Request may involve mock/hallucinated data');
            feasibility = 'questionable';
            estimatedImpact = 'medium';
            recommendations.push('Verify if real data is needed or if mock data is acceptable');
        }
        // Check project dependencies
        const readyTasks = this.getReadyTasks();
        if (readyTasks.length === 0 && currentTask?.status === types_1.TaskStatus.BLOCKED) {
            blockers.push('No tasks are ready to proceed - current task is blocked');
            feasibility = 'questionable';
        }
        // Check for technical blockers
        if (request.includes('database') && !this.hasDatabaseSetup()) {
            blockers.push('Database functionality requested but no database setup detected');
            recommendations.push('Set up database connection or use in-memory storage');
        }
        if (request.includes('authentication') && !this.hasAuthSetup()) {
            blockers.push('Authentication requested but no auth system detected');
            recommendations.push('Implement basic auth or use development mode');
        }
        return {
            isBlocked: blockers.length > 0,
            blockers,
            feasibility,
            recommendations,
            estimatedImpact
        };
    }
    /**
     * Gets comprehensive linear progress state for visibility
     */
    getLinearProgressState() {
        const currentTask = this.getCurrentTask();
        const allTasks = this.getAllTasks();
        const completedTasks = this.getTasksByStatus(types_1.TaskStatus.COMPLETED);
        const blockedTasks = this.getTasksByStatus(types_1.TaskStatus.BLOCKED);
        // Find next task in linear sequence
        let nextTask = null;
        if (currentTask) {
            const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
            if (currentIndex < allTasks.length - 1) {
                nextTask = allTasks[currentIndex + 1];
            }
        }
        else {
            const readyTasks = this.getReadyTasks();
            nextTask = readyTasks.length > 0 ? readyTasks[0] : null;
        }
        // Calculate progress
        const totalProgress = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;
        // Estimate completion time
        let estimatedCompletion = null;
        if (currentTask && currentTask.startTime && currentTask.estimatedDuration) {
            const estimatedEnd = new Date(currentTask.startTime.getTime() + currentTask.estimatedDuration * 60 * 1000);
            estimatedCompletion = estimatedEnd;
        }
        // Check if on track
        const isOnTrack = this.isProjectOnTrack();
        const deviations = this.getProjectDeviations();
        return {
            currentTask,
            nextTask,
            blockedTasks,
            completedTasks,
            totalProgress,
            estimatedCompletion,
            lastActivity: this.lastActivity,
            isOnTrack,
            deviations
        };
    }
    /**
     * Checks if project is on track based on estimated timelines
     */
    isProjectOnTrack() {
        const currentTask = this.getCurrentTask();
        if (!currentTask || !currentTask.startTime || !currentTask.estimatedDuration) {
            return true; // No current task, consider on track
        }
        const elapsed = Date.now() - currentTask.startTime.getTime();
        const estimated = currentTask.estimatedDuration * 60 * 1000;
        const progress = elapsed / estimated;
        // Consider on track if within 20% of estimated time
        return progress <= 1.2;
    }
    /**
     * Identifies project deviations and issues
     */
    getProjectDeviations() {
        const deviations = [];
        const currentTask = this.getCurrentTask();
        if (currentTask) {
            const elapsed = Date.now() - currentTask.startTime.getTime();
            const estimated = currentTask.estimatedDuration * 60 * 1000;
            if (elapsed > estimated * 1.5) {
                deviations.push(`Task "${currentTask.name}" is significantly behind schedule`);
            }
        }
        const blockedTasks = this.getTasksByStatus(types_1.TaskStatus.BLOCKED);
        if (blockedTasks.length > 0) {
            deviations.push(`${blockedTasks.length} task(s) are currently blocked`);
        }
        const inProgressTasks = this.getTasksByStatus(types_1.TaskStatus.IN_PROGRESS);
        if (inProgressTasks.length > 1) {
            deviations.push('Multiple tasks in progress - violates linear progression');
        }
        return deviations;
    }
    /**
     * Validates if a task can be started without breaking linear progression
     */
    canStartTask(taskId) {
        if (!this.linearMode) {
            return { canStart: true };
        }
        const currentTask = this.getCurrentTask();
        if (currentTask && currentTask.id !== taskId) {
            return {
                canStart: false,
                reason: `Cannot start task "${taskId}" while "${currentTask.name}" is in progress`
            };
        }
        const task = this.tasks.get(taskId);
        if (!task) {
            return { canStart: false, reason: `Task "${taskId}" not found` };
        }
        if (task.status !== types_1.TaskStatus.NOT_STARTED) {
            return { canStart: false, reason: `Task "${taskId}" is not ready to start` };
        }
        // Check dependencies
        const uncompletedDeps = task.dependencies.filter(depId => {
            const depTask = this.tasks.get(depId);
            return !depTask || depTask.status !== types_1.TaskStatus.COMPLETED;
        });
        if (uncompletedDeps.length > 0) {
            return {
                canStart: false,
                reason: `Task "${taskId}" has uncompleted dependencies: ${uncompletedDeps.join(', ')}`
            };
        }
        return { canStart: true };
    }
    /**
     * Records activity for accountability tracking
     */
    recordActivity(activity, taskId) {
        this.lastActivity = new Date();
        this.logger.info('Project activity recorded', { activity, taskId, timestamp: this.lastActivity });
    }
    /**
     * Gets accountability report for current project state
     */
    getAccountabilityReport() {
        const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
        const currentTask = this.getCurrentTask();
        let currentTaskDuration = null;
        if (currentTask && currentTask.startTime) {
            currentTaskDuration = Date.now() - currentTask.startTime.getTime();
        }
        const overdueTasks = this.getOverdueTasks();
        const recommendations = this.generateRecommendations();
        return {
            lastActivity: this.lastActivity,
            timeSinceLastActivity,
            currentTaskDuration,
            overdueTasks,
            recommendations
        };
    }
    /**
     * Identifies overdue tasks
     */
    getOverdueTasks() {
        const now = Date.now();
        return Array.from(this.tasks.values()).filter(task => {
            if (task.status !== types_1.TaskStatus.IN_PROGRESS || !task.startTime || !task.estimatedDuration) {
                return false;
            }
            const elapsed = now - task.startTime.getTime();
            const estimated = task.estimatedDuration * 60 * 1000;
            return elapsed > estimated * 1.2; // 20% over estimated time
        });
    }
    /**
     * Generates recommendations based on current project state
     */
    generateRecommendations() {
        const recommendations = [];
        const currentTask = this.getCurrentTask();
        const overdueTasks = this.getOverdueTasks();
        const blockedTasks = this.getTasksByStatus(types_1.TaskStatus.BLOCKED);
        if (overdueTasks.length > 0) {
            recommendations.push('Consider breaking down overdue tasks into smaller subtasks');
        }
        if (blockedTasks.length > 0) {
            recommendations.push('Review and resolve blockers to maintain project momentum');
        }
        if (!currentTask) {
            const readyTasks = this.getReadyTasks();
            if (readyTasks.length > 0) {
                recommendations.push(`Start next task: "${readyTasks[0].name}"`);
            }
        }
        return recommendations;
    }
    // Helper methods for feasibility checking
    hasDatabaseSetup() {
        // Check for database-related files or configurations
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath)
            return false;
        const dbFiles = ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle'];
        return dbFiles.some(file => {
            const filePath = path.join(workspacePath, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                return /database|sql|mongodb|postgres|mysql/i.test(content);
            }
            return false;
        });
    }
    hasAuthSetup() {
        // Check for authentication-related files or configurations
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath)
            return false;
        const authFiles = ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle'];
        return authFiles.some(file => {
            const filePath = path.join(workspacePath, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                return /auth|jwt|oauth|passport/i.test(content);
            }
            return false;
        });
    }
    getPlanHash(tasks) {
        // Simple hash: JSON string of task ids, names, and statuses
        return JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, status: t.status })));
    }
    getLLMValidationState() {
        const allTasks = Array.from(this.tasks.values());
        const currentHash = this.getPlanHash(allTasks);
        return {
            isCurrent: this.lastLLMValidation.planHash === currentHash,
            lastTimestamp: this.lastLLMValidation.timestamp,
            result: this.lastLLMValidation.result
        };
    }
    async validatePlanWithLLM() {
        const allTasks = Array.from(this.tasks.values());
        const planHash = this.getPlanHash(allTasks);
        const llmResults = await this.llmReviewPlan(allTasks);
        this.lastLLMValidation = {
            result: llmResults,
            timestamp: new Date(),
            planHash
        };
    }
    // Update validatePlan to use lastLLMValidation if current
    async validatePlan() {
        // Rule-based checks
        const allTasks = Array.from(this.tasks.values());
        const ruleResults = [];
        let status = 'in_progress';
        if (allTasks.length === 0) {
            status = 'missing';
            ruleResults.push('No project plan found.');
        }
        else if (allTasks.every(t => t.status === types_1.TaskStatus.COMPLETED)) {
            status = 'complete';
            ruleResults.push('All tasks are complete.');
        }
        else if (allTasks.some(t => !t.name || !t.description)) {
            status = 'invalid';
            ruleResults.push('Some tasks are missing names or descriptions.');
        }
        else if (allTasks.length > 0 && allTasks.every(t => t.status === types_1.TaskStatus.NOT_STARTED)) {
            status = 'empty';
            ruleResults.push('Project plan exists but no tasks have been started.');
        }
        else {
            status = 'in_progress';
            ruleResults.push('Project plan is in progress.');
        }
        // Use last LLM validation if current
        const llmState = this.getLLMValidationState();
        const llmResults = llmState.isCurrent ? llmState.result : null;
        const llmIsCurrent = llmState.isCurrent;
        const llmTimestamp = llmState.lastTimestamp;
        // Recommendations (combine rule and LLM suggestions)
        const recommendations = [
            ...this.generateRecommendations(),
            ...(llmResults ? llmResults.suggestions : [])
        ];
        return { status, ruleResults, llmResults, recommendations, llmIsCurrent, llmTimestamp };
    }
    // Placeholder for LLM review
    async llmReviewPlan(tasks) {
        // In production, call your LLM API here
        // For now, return a mock result
        if (tasks.length === 0) {
            return {
                score: 0,
                grade: 'F',
                summary: 'No plan to review.',
                suggestions: ['Create a project plan to begin.']
            };
        }
        // Example: if all tasks are complete, give A+
        if (tasks.every(t => t.status === types_1.TaskStatus.COMPLETED)) {
            return {
                score: 100,
                grade: 'A+',
                summary: 'All tasks are complete. Project finished successfully.',
                suggestions: []
            };
        }
        // Otherwise, return a generic review
        return {
            score: 80,
            grade: 'B',
            summary: 'Plan is generally good, but could be improved. Consider reviewing task dependencies and clarity.',
            suggestions: ['Review task dependencies for possible improvements.', 'Clarify task descriptions where needed.']
        };
    }
}
exports.ProjectPlan = ProjectPlan;
//# sourceMappingURL=projectPlan.js.map