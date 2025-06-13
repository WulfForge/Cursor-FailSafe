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
exports.TaskEngine = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
class TaskEngine {
    constructor(projectPlan, logger) {
        this.isActive = false;
        this.checkInterval = null;
        this.CHECK_INTERVAL_MS = 30000; // 30 seconds
        this.OVERDUE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
        this.STALL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
        this.MAX_RETRY_ATTEMPTS = 3;
        this.AUTO_RETRY_DELAY_MS = 5000; // 5 seconds
        // Track task execution contexts
        this.executionContexts = new Map();
        this.projectPlan = projectPlan;
        this.logger = logger;
    }
    async initialize() {
        this.logger.info('Task engine initializing...');
        await this.projectPlan.initialize();
        // Start monitoring if there's an active task
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            this.startTaskMonitoring(currentTask.id);
        }
    }
    start() {
        if (this.isActive) {
            return;
        }
        this.isActive = true;
        this.checkInterval = setInterval(() => {
            this.checkTasks();
        }, this.CHECK_INTERVAL_MS);
        this.logger.info('Task engine started');
    }
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isActive = false;
        this.logger.info('Task engine stopped');
    }
    async checkTasks() {
        try {
            const tasks = this.projectPlan.getAllTasks();
            const nudges = [];
            // Check for overdue tasks
            const overdueNudges = this.checkOverdueTasks(tasks);
            nudges.push(...overdueNudges);
            // Check for stalled tasks
            const stalledNudges = this.checkStalledTasks(tasks);
            nudges.push(...stalledNudges);
            // Check for ready tasks
            const readyNudges = this.checkReadyTasks();
            nudges.push(...readyNudges);
            // Check for blocked tasks
            const blockedNudges = this.checkBlockedTasks(tasks);
            nudges.push(...blockedNudges);
            // Process nudges
            await this.processNudges(nudges);
        }
        catch (error) {
            this.logger.error('Error checking tasks', error);
        }
    }
    checkOverdueTasks(tasks) {
        const nudges = [];
        const now = Date.now();
        tasks.forEach(task => {
            if (task.status === types_1.TaskStatus.IN_PROGRESS && task.startTime) {
                const elapsed = now - task.startTime.getTime();
                const estimatedDuration = task.estimatedDuration * 60 * 1000;
                if (elapsed > estimatedDuration + this.OVERDUE_THRESHOLD_MS) {
                    nudges.push({
                        taskId: task.id,
                        type: 'overdue',
                        message: `Task "${task.name}" is overdue by ${Math.round((elapsed - estimatedDuration) / 60000)} minutes`,
                        action: 'mark_complete',
                        priority: 'high'
                    });
                }
            }
        });
        return nudges;
    }
    checkStalledTasks(tasks) {
        const nudges = [];
        const now = Date.now();
        tasks.forEach(task => {
            if (task.status === types_1.TaskStatus.IN_PROGRESS && task.startTime) {
                const elapsed = now - task.startTime.getTime();
                if (elapsed > this.STALL_THRESHOLD_MS) {
                    nudges.push({
                        taskId: task.id,
                        type: 'stalled',
                        message: `Task "${task.name}" appears to be stalled (${Math.round(elapsed / 60000)} minutes elapsed)`,
                        action: 'retry',
                        priority: 'medium'
                    });
                }
            }
        });
        return nudges;
    }
    checkReadyTasks() {
        const nudges = [];
        const readyTasks = this.projectPlan.getReadyTasks();
        readyTasks.forEach(task => {
            nudges.push({
                taskId: task.id,
                type: 'dependency_ready',
                message: `Task "${task.name}" is ready to start`,
                action: 'explain',
                priority: 'low'
            });
        });
        return nudges;
    }
    checkBlockedTasks(tasks) {
        const nudges = [];
        tasks.forEach(task => {
            if (task.status === types_1.TaskStatus.BLOCKED && task.blockers.length > 0) {
                nudges.push({
                    taskId: task.id,
                    type: 'blocked',
                    message: `Task "${task.name}" is blocked: ${task.blockers.join(', ')}`,
                    action: 'explain',
                    priority: 'high'
                });
            }
        });
        return nudges;
    }
    async processNudges(nudges) {
        for (const nudge of nudges) {
            try {
                await this.showNudge(nudge);
            }
            catch (error) {
                this.logger.error('Error processing nudge', { nudge, error });
            }
        }
    }
    async showNudge(nudge) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === nudge.taskId);
        if (!task) {
            return;
        }
        const actions = this.getNudgeActions(nudge);
        const selected = await vscode.window.showWarningMessage(nudge.message, ...actions.map(action => action.label));
        if (selected) {
            const action = actions.find(a => a.label === selected);
            if (action) {
                await this.executeNudgeAction(nudge, action.action);
            }
        }
    }
    getNudgeActions(nudge) {
        const actions = [];
        switch (nudge.action) {
            case 'retry':
                actions.push({ label: 'Retry', action: 'retry' });
                actions.push({ label: 'Skip', action: 'skip' });
                break;
            case 'mark_complete':
                actions.push({ label: 'Mark Complete', action: 'mark_complete' });
                actions.push({ label: 'Continue', action: 'continue' });
                break;
            case 'explain':
                actions.push({ label: 'View Details', action: 'explain' });
                actions.push({ label: 'Start Task', action: 'start' });
                break;
            default:
                actions.push({ label: 'OK', action: 'dismiss' });
        }
        actions.push({ label: 'Dismiss', action: 'dismiss' });
        return actions;
    }
    async executeNudgeAction(nudge, action) {
        try {
            switch (action) {
                case 'retry':
                    await this.retryTask(nudge.taskId);
                    break;
                case 'skip':
                    await this.skipTask(nudge.taskId);
                    break;
                case 'mark_complete':
                    await this.projectPlan.completeTask(nudge.taskId);
                    break;
                case 'start':
                    await this.projectPlan.startTask(nudge.taskId);
                    break;
                case 'explain':
                    await this.explainTask(nudge.taskId);
                    break;
                case 'continue':
                    // Just continue, no action needed
                    break;
                case 'dismiss':
                    // Dismiss, no action needed
                    break;
            }
            this.logger.info('Nudge action executed', { nudge, action });
        }
        catch (error) {
            this.logger.error('Error executing nudge action', { nudge, action, error });
            vscode.window.showErrorMessage(`Failed to execute action: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async retryTask(taskId) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const executionContext = this.executionContexts.get(taskId);
        if (executionContext && executionContext.attempts >= executionContext.maxAttempts) {
            throw new Error(`Maximum retry attempts (${executionContext.maxAttempts}) exceeded for task ${taskId}`);
        }
        if (task.status === types_1.TaskStatus.IN_PROGRESS) {
            // Reset the task to not started so it can be restarted
            task.status = types_1.TaskStatus.NOT_STARTED;
            task.startTime = undefined;
            task.blockers = [];
            // Update execution context
            if (executionContext) {
                executionContext.attempts++;
                executionContext.lastActivity = new Date();
            }
            this.logger.info('Task reset for retry', { taskId, taskName: task.name, attempts: executionContext?.attempts });
            // Record retry activity
            this.projectPlan.recordActivity(`Task retry: ${task.name} (attempt ${executionContext?.attempts})`, taskId);
        }
    }
    async skipTask(taskId) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // Mark as completed to skip it
        await this.projectPlan.completeTask(taskId);
        this.logger.info('Task skipped', { taskId, taskName: task.name });
    }
    async explainTask(taskId) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const details = [
            `**Task: ${task.name}**`,
            `**Description:** ${task.description}`,
            `**Status:** ${task.status}`,
            `**Priority:** ${task.priority}`,
            `**Estimated Duration:** ${task.estimatedDuration} minutes`,
            `**Dependencies:** ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`,
            `**Blockers:** ${task.blockers.length > 0 ? task.blockers.join(', ') : 'None'}`
        ];
        if (task.startTime) {
            const elapsed = Math.round((Date.now() - task.startTime.getTime()) / 60000);
            details.push(`**Elapsed Time:** ${elapsed} minutes`);
        }
        const content = details.join('\n\n');
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(document);
    }
    getTaskSuggestions() {
        const readyTasks = this.projectPlan.getReadyTasks();
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            return [currentTask];
        }
        // Filter tasks by feasibility and sort by priority
        const feasibleTasks = readyTasks.filter(task => {
            const feasibility = this.projectPlan.analyzeFeasibility(task.description);
            return feasibility.feasibility !== 'infeasible';
        });
        return feasibleTasks.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return a.name.localeCompare(b.name);
        });
    }
    /**
     * Enhanced project status with linear progression awareness
     */
    getProjectStatus() {
        const currentTask = this.projectPlan.getCurrentTask();
        const nextTask = this.getNextReadyTask();
        const progress = this.projectPlan.getProjectProgress();
        const suggestions = this.getTaskSuggestions();
        const linearState = this.projectPlan.getLinearProgressState();
        const accountability = this.projectPlan.getAccountabilityReport();
        return {
            currentTask,
            nextTask,
            progress,
            suggestions,
            linearState,
            accountability
        };
    }
    /**
     * Auto-advance to next task when current task completes
     */
    async autoAdvanceToNextTask() {
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            // Don't auto-advance if there's still a current task
            return null;
        }
        const nextTask = this.getNextReadyTask();
        if (nextTask) {
            const result = await this.executeTask(nextTask.id);
            if (result.success) {
                this.logger.info('Auto-advanced to next task', { taskId: nextTask.id, taskName: nextTask.name });
                return nextTask;
            }
            else {
                this.logger.warn('Failed to auto-advance to next task', { taskId: nextTask.id, error: result.error });
            }
        }
        return null;
    }
    /**
     * Get workflow recommendations based on current state
     */
    getWorkflowRecommendations() {
        const recommendations = [];
        const currentTask = this.projectPlan.getCurrentTask();
        const nextTask = this.getNextReadyTask();
        const linearState = this.projectPlan.getLinearProgressState();
        // Check if current task is overdue
        if (currentTask && !linearState.isOnTrack) {
            recommendations.push({
                action: 'Complete current task',
                reason: `Task "${currentTask.name}" is behind schedule`,
                priority: 'high',
                taskId: currentTask.id
            });
        }
        // Check if next task is ready
        if (nextTask && !currentTask) {
            recommendations.push({
                action: 'Start next task',
                reason: `Task "${nextTask.name}" is ready to begin`,
                priority: 'medium',
                taskId: nextTask.id
            });
        }
        // Check for blocked tasks
        if (linearState.blockedTasks.length > 0) {
            recommendations.push({
                action: 'Resolve blockers',
                reason: `${linearState.blockedTasks.length} task(s) are blocked`,
                priority: 'high'
            });
        }
        // Check for deviations
        if (linearState.deviations.length > 0) {
            recommendations.push({
                action: 'Address deviations',
                reason: `Project has ${linearState.deviations.length} deviation(s)`,
                priority: 'medium'
            });
        }
        return recommendations;
    }
    /**
     * Force linear progression by completing current task and starting next
     */
    async forceLinearProgression() {
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            // Complete current task
            await this.completeTask(currentTask.id);
            this.logger.info('Forced completion of current task', { taskId: currentTask.id, taskName: currentTask.name });
        }
        // Start next task
        return await this.autoAdvanceToNextTask();
    }
    /**
     * Get execution context for a task
     */
    getTaskExecutionContext(taskId) {
        return this.executionContexts.get(taskId) || null;
    }
    /**
     * Update task activity to prevent timeout
     */
    updateTaskActivity(taskId) {
        const executionContext = this.executionContexts.get(taskId);
        if (executionContext) {
            executionContext.lastActivity = new Date();
            this.projectPlan.recordActivity(`Task activity updated: ${taskId}`, taskId);
        }
    }
    /**
     * Get all active execution contexts
     */
    getActiveExecutions() {
        return Array.from(this.executionContexts.values());
    }
    /**
     * Enhanced task execution with linear progression enforcement
     */
    async executeTask(taskId, context) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            return {
                success: false,
                duration: 0,
                error: `Task not found: ${taskId}`,
                warnings: []
            };
        }
        // Check feasibility before execution
        const feasibility = this.projectPlan.analyzeFeasibility(context || task.description);
        if (feasibility.feasibility === 'infeasible') {
            return {
                success: false,
                duration: 0,
                error: `Task execution blocked: ${feasibility.blockers.join(', ')}`,
                warnings: feasibility.recommendations
            };
        }
        // Check if task can be started
        const canStart = this.projectPlan.canStartTask(taskId);
        if (!canStart.canStart) {
            return {
                success: false,
                duration: 0,
                error: canStart.reason || 'Cannot start task',
                warnings: []
            };
        }
        const startTime = Date.now();
        const executionContext = {
            taskId,
            startTime: new Date(),
            lastActivity: new Date(),
            attempts: 1,
            maxAttempts: this.MAX_RETRY_ATTEMPTS,
            autoRetry: true,
            timeout: task.estimatedDuration * 60 * 1000
        };
        this.executionContexts.set(taskId, executionContext);
        this.startTaskMonitoring(taskId);
        try {
            // Start the task
            await this.projectPlan.startTask(taskId);
            // Record activity
            this.projectPlan.recordActivity(`Task execution started: ${task.name}`, taskId);
            return {
                success: true,
                duration: Date.now() - startTime,
                warnings: feasibility.feasibility === 'questionable' ? feasibility.recommendations : []
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.executionContexts.delete(taskId);
            return {
                success: false,
                duration,
                error: error instanceof Error ? error.message : String(error),
                warnings: feasibility.recommendations
            };
        }
    }
    /**
     * Complete task execution with validation
     */
    async completeTask(taskId, result) {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            return {
                success: false,
                duration: 0,
                error: `Task not found: ${taskId}`,
                warnings: []
            };
        }
        const executionContext = this.executionContexts.get(taskId);
        const duration = executionContext ? Date.now() - executionContext.startTime.getTime() : 0;
        try {
            await this.projectPlan.completeTask(taskId);
            this.executionContexts.delete(taskId);
            // Record completion activity
            this.projectPlan.recordActivity(`Task completed: ${task.name}`, taskId);
            // Check if next task is ready
            const nextTask = this.getNextReadyTask();
            if (nextTask) {
                this.logger.info('Next task ready', { nextTaskId: nextTask.id, nextTaskName: nextTask.name });
            }
            return {
                success: true,
                duration,
                warnings: []
            };
        }
        catch (error) {
            return {
                success: false,
                duration,
                error: error instanceof Error ? error.message : String(error),
                warnings: []
            };
        }
    }
    /**
     * Get the next task that's ready to execute
     */
    getNextReadyTask() {
        const readyTasks = this.projectPlan.getReadyTasks();
        if (readyTasks.length === 0) {
            return null;
        }
        // Sort by priority and return the highest priority task
        return readyTasks.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return a.name.localeCompare(b.name);
        })[0];
    }
    /**
     * Start monitoring a specific task
     */
    startTaskMonitoring(taskId) {
        const executionContext = this.executionContexts.get(taskId);
        if (!executionContext) {
            return;
        }
        // Set up timeout monitoring
        setTimeout(() => {
            this.checkTaskTimeout(taskId);
        }, executionContext.timeout);
    }
    /**
     * Check if a task has exceeded its timeout
     */
    async checkTaskTimeout(taskId) {
        const executionContext = this.executionContexts.get(taskId);
        if (!executionContext) {
            return;
        }
        const elapsed = Date.now() - executionContext.startTime.getTime();
        if (elapsed > executionContext.timeout) {
            this.logger.warn('Task timeout detected', { taskId, elapsed, timeout: executionContext.timeout });
            // Auto-retry if enabled and attempts remaining
            if (executionContext.autoRetry && executionContext.attempts < executionContext.maxAttempts) {
                await this.retryTask(taskId);
            }
            else {
                // Block the task due to timeout
                await this.projectPlan.blockTask(taskId, `Task timed out after ${Math.round(elapsed / 60000)} minutes`);
            }
        }
    }
}
exports.TaskEngine = TaskEngine;
//# sourceMappingURL=taskEngine.js.map