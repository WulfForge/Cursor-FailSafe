/// <reference types="node" />
import * as vscode from 'vscode';
import { ProjectPlan } from './projectPlan';
import { Logger } from './logger';
import { Task, TaskStatus, TaskNudge, TaskPriority, TaskDependency } from './types';
import { DataStore } from './dataStore';

export interface TaskExecutionContext {
    taskId: string;
    startTime: Date;
    lastActivity: Date;
    attempts: number;
    maxAttempts: number;
    autoRetry: boolean;
    timeout: number;
}

export interface TaskExecutionResult {
    success: boolean;
    duration: number;
    error?: string;
    warnings: string[];
    nextAction?: 'continue' | 'retry' | 'skip' | 'block';
}

interface TaskContext {
    projectPlan: ProjectPlan;
    logger: Logger;
    dataStore: DataStore;
}

export class TaskEngine {
    private readonly projectPlan: ProjectPlan;
    private readonly logger: Logger;
    private readonly ui?: unknown;
    private isActive = false;
    private checkIntervalMs: ReturnType<typeof setInterval> | null = null; // 30 seconds
    private readonly overdueThresholdMs = 300000; // 5 minutes
    private readonly stallThresholdMs = 600000; // 10 minutes
    private readonly maxRetryAttempts = 3;
    private readonly autoRetryDelayMs = 5000; // 5 seconds
    private readonly hangupThresholdMs = 1800000; // 30 minutes
    private readonly hangupCheckIntervalMs = 60000; // 1 minute

    // Track task execution contexts
    private readonly executionContexts: Map<string, TaskExecutionContext> = new Map();

    constructor(projectPlan: ProjectPlan, logger: Logger, ui?: unknown) {
        this.projectPlan = projectPlan;
        this.logger = logger;
        this.ui = ui;
    }

    public async initialize(): Promise<void> {
        this.logger.info('Task engine initializing...');
        await this.projectPlan.initialize();
        
        // Start monitoring if there's an active task
        const currentTask = this.projectPlan.getCurrentTask();
        if (currentTask) {
            this.startTaskMonitoring(currentTask.id);
        }
    }

    public start(): void {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        this.checkIntervalMs = setInterval(() => {
            this.checkTasks();
        }, 30000);

        this.logger.info('Task engine started');
    }

    public stop(): void {
        if (this.checkIntervalMs) {
            clearInterval(this.checkIntervalMs);
            this.checkIntervalMs = null;
        }
        this.isActive = false;
        this.logger.info('Task engine stopped');
    }

    private async checkTasks(): Promise<void> {
        try {
            const tasks = this.projectPlan.getAllTasks();
            const nudges: TaskNudge[] = [];

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

            // Check for hangup detection
            await this.detectHangup();

            // Process nudges
            await this.processNudges(nudges);

        } catch (error) {
            this.logger.error('Error checking tasks', error);
        }
    }

    private checkOverdueTasks(tasks: Task[]): TaskNudge[] {
        const nudges: TaskNudge[] = [];
        const now = Date.now();

        tasks.forEach(task => {
            if (task.status === TaskStatus.inProgress && task.startTime) {
                const elapsed = now - task.startTime.getTime();
                const estimatedDuration = task.estimatedDuration * 60 * 1000;

                if (elapsed > estimatedDuration + this.overdueThresholdMs) {
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

    private checkStalledTasks(tasks: Task[]): TaskNudge[] {
        const nudges: TaskNudge[] = [];
        const now = Date.now();

        tasks.forEach(task => {
            if (task.status === TaskStatus.inProgress && task.startTime) {
                const elapsed = now - task.startTime.getTime();

                if (elapsed > this.stallThresholdMs) {
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

    private checkReadyTasks(): TaskNudge[] {
        const nudges: TaskNudge[] = [];
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

    private checkBlockedTasks(tasks: Task[]): TaskNudge[] {
        const nudges: TaskNudge[] = [];

        tasks.forEach(task => {
            if (task.status === TaskStatus.blocked && task.blockers.length > 0) {
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

    private async processNudges(nudges: TaskNudge[]): Promise<void> {
        for (const nudge of nudges) {
            try {
                await this.showNudge(nudge);
            } catch (error) {
                this.logger.error('Error processing nudge', { nudge, error });
            }
        }
    }

    private async showNudge(nudge: TaskNudge): Promise<void> {
        const task = this.projectPlan.getAllTasks().find(t => t.id === nudge.taskId);
        if (!task) {
            return;
        }

        const actions = this.getNudgeActions(nudge);
        const selected = await vscode.window.showWarningMessage(
            nudge.message,
            ...actions.map(action => action.label)
        );

        if (selected) {
            const action = actions.find(a => a.label === selected);
            if (action) {
                await this.executeNudgeAction(nudge, action.action);
            }
        }
    }

    private getNudgeActions(nudge: TaskNudge): Array<{ label: string; action: string }> {
        const actions: Array<{ label: string; action: string }> = [];

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

    private async executeNudgeAction(nudge: TaskNudge, action: string): Promise<void> {
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
        } catch (error) {
            this.logger.error('Error executing nudge action', { nudge, action, error });
            vscode.window.showErrorMessage(`Failed to execute action: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async retryTask(taskId: string): Promise<void> {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        const executionContext = this.executionContexts.get(taskId);
        if (executionContext && executionContext.attempts >= executionContext.maxAttempts) {
            throw new Error(`Maximum retry attempts (${executionContext.maxAttempts}) exceeded for task ${taskId}`);
        }

        if (task.status === TaskStatus.inProgress) {
            // Reset the task to not started so it can be restarted
            task.status = TaskStatus.notStarted;
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

    private async skipTask(taskId: string): Promise<void> {
        const task = this.projectPlan.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        // Mark as completed to skip it
        await this.projectPlan.completeTask(taskId);
        this.logger.info('Task skipped', { taskId, taskName: task.name });
    }

    private async explainTask(taskId: string): Promise<void> {
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

    public getTaskSuggestions(): Task[] {
        const readyTasks = this.projectPlan.getReadyTasks();
        const currentTask = this.projectPlan.getCurrentTask();

        if (currentTask) {
            return [currentTask];
        }

        // Filter tasks by feasibility and sort by priority
        const feasibleTasks = readyTasks.filter(task => {
            const feasibility = this.projectPlan.analyzeFeasibility();
            return feasibility.feasibility !== 'infeasible';
        });

        return feasibleTasks.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Enhanced project status with linear progression awareness
     */
    public getProjectStatus(): {
        currentTask: Task | null;
        nextTask: Task | null;
        progress: {
            totalTasks: number;
            completedTasks: number;
            inProgressTasks: number;
            blockedTasks: number;
            progressPercentage: number;
            estimatedRemainingTime: number;
        };
        suggestions: Task[];
        linearState: {
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
    } {
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
    public async autoAdvanceToNextTask(): Promise<Task | null> {
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
            } else {
                this.logger.warn('Failed to auto-advance to next task', { taskId: nextTask.id, error: result.error });
            }
        }

        return null;
    }

    /**
     * Get workflow recommendations based on current state
     */
    public getWorkflowRecommendations(): {
        action: string;
        reason: string;
        priority: 'low' | 'medium' | 'high';
        taskId?: string;
    }[] {
        const recommendations: Array<{
            action: string;
            reason: string;
            priority: 'low' | 'medium' | 'high';
            taskId?: string;
        }> = [];

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
    public async forceLinearProgression(): Promise<Task | null> {
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
    public getTaskExecutionContext(taskId: string): TaskExecutionContext | null {
        return this.executionContexts.get(taskId) || null;
    }

    /**
     * Update task activity to prevent timeout
     */
    public updateTaskActivity(taskId: string): void {
        const executionContext = this.executionContexts.get(taskId);
        if (executionContext) {
            executionContext.lastActivity = new Date();
            this.projectPlan.recordActivity(`Task activity updated: ${taskId}`, taskId);
        }
    }

    /**
     * Get all active execution contexts
     */
    public getActiveExecutions(): TaskExecutionContext[] {
        return Array.from(this.executionContexts.values());
    }

    /**
     * Enhanced task execution with linear progression enforcement
     */
    public async executeTask(taskId: string, context?: string): Promise<TaskExecutionResult> {
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
        const feasibility = this.projectPlan.analyzeFeasibility();
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
        const executionContext: TaskExecutionContext = {
            taskId,
            startTime: new Date(),
            lastActivity: new Date(),
            attempts: 1,
            maxAttempts: this.maxRetryAttempts,
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

        } catch (error) {
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
    public async completeTask(taskId: string): Promise<TaskExecutionResult> {
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

        } catch (error) {
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
    public getNextReadyTask(): Task | null {
        const readyTasks = this.projectPlan.getReadyTasks();
        if (readyTasks.length === 0) {
            return null;
        }

        // Sort by priority and return the highest priority task
        return readyTasks.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return a.name.localeCompare(b.name);
        })[0];
    }

    /**
     * Start monitoring a specific task
     */
    private startTaskMonitoring(taskId: string): void {
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
    private async checkTaskTimeout(taskId: string): Promise<void> {
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
            } else {
                // Block the task due to timeout
                await this.projectPlan.blockTask(taskId, `Task timed out after ${Math.round(elapsed / 60000)} minutes`);
            }
        }
    }

    private async detectHangup(): Promise<void> {
        const currentTask = this.projectPlan.getCurrentTask();
        if (!currentTask || !currentTask.startTime) return;

        const taskDuration = Date.now() - currentTask.startTime.getTime();
        const isDocumentationTask = this.isDocumentationTask(currentTask);
        const hangupThreshold = isDocumentationTask ? this.hangupThresholdMs : this.stallThresholdMs;

        if (taskDuration > hangupThreshold) {
            const hangupType = isDocumentationTask ? 'documentation' : 'general';
            this.logger.warn(`Potential hangup detected on ${hangupType} task: ${currentTask.name}`, {
                taskId: currentTask.id,
                duration: taskDuration,
                threshold: hangupThreshold
            });

            // Log to action log
            (this.ui as any).actionLog.push({
                timestamp: new Date().toISOString(),
                description: `🚨 Hangup detected on ${currentTask.name} (${Math.round(taskDuration / 60000)} minutes)`
            });

            // Show notification
            vscode.window.showWarningMessage(
                `FailSafe detected potential hangup on task: ${currentTask.name}. Consider taking a break or asking for help.`,
                'Take Break', 'Ask for Help', 'Continue'
            ).then(choice => {
                switch (choice) {
                    case 'Take Break':
                        this.suggestBreak();
                        break;
                    case 'Ask for Help':
                        this.suggestHelp(currentTask);
                        break;
                    case 'Continue':
                        this.logger.info('User chose to continue despite hangup warning');
                        break;
                }
            });

            // Update status bar
            (this.ui as any).updateStatusBar('blocked');
        }
    }

    private isDocumentationTask(task: Task): boolean {
        const documentationKeywords = [
            'documentation', 'changelog', 'readme', 'docs', 'comment', 'update',
            'write', 'edit', 'format', 'style', 'polish', 'finalize'
        ];
        
        const taskText = `${task.name} ${task.description}`.toLowerCase();
        return documentationKeywords.some(keyword => taskText.includes(keyword));
    }

    private suggestBreak(): void {
        vscode.window.showInformationMessage(
            'Taking a short break can help clear your mind and improve productivity.',
            'OK'
        );
        
        (this.ui as any).actionLog.push({
            timestamp: new Date().toISOString(),
            description: '💡 Break suggested due to hangup detection'
        });
    }

    private suggestHelp(task: Task): void {
        const helpOptions = [
            'Ask AI for guidance',
            'Review similar tasks',
            'Break task into smaller parts',
            'Check documentation'
        ];

        vscode.window.showQuickPick(helpOptions, {
            placeHolder: 'Choose help option for: ' + task.name
        }).then(choice => {
            if (choice) {
                (this.ui as any).actionLog.push({
                    timestamp: new Date().toISOString(),
                    description: `🆘 Help requested: ${choice} for ${task.name}`
                });
                
                // Execute appropriate help action
                switch (choice) {
                    case 'Ask AI for guidance':
                        vscode.commands.executeCommand('failsafe.askAI');
                        break;
                    case 'Review similar tasks':
                        vscode.commands.executeCommand('failsafe.showPlan');
                        break;
                    case 'Break task into smaller parts':
                        this.suggestTaskBreakdown(task);
                        break;
                    case 'Check documentation':
                        vscode.commands.executeCommand('failsafe.showPlan');
                        break;
                }
            }
        });
    }

    private suggestTaskBreakdown(task: Task): void {
        vscode.window.showInformationMessage(
            `Consider breaking "${task.name}" into smaller, more manageable subtasks.`,
            'Create Subtasks', 'OK'
        ).then(choice => {
            if (choice === 'Create Subtasks') {
                this.createTaskBreakdown(task);
            }
        });
    }

    private async createTaskBreakdown(task: Task): Promise<void> {
        try {
            // Get user input for subtask creation
            const subtaskCount = await vscode.window.showInputBox({
                prompt: 'How many subtasks would you like to create?',
                placeHolder: '3-5',
                value: '3'
            });

            if (!subtaskCount) return;

            const count = parseInt(subtaskCount);
            if (isNaN(count) || count < 2 || count > 10) {
                vscode.window.showErrorMessage('Please enter a number between 2 and 10');
                return;
            }

            // Create subtasks based on task complexity
            const subtasks: Partial<Task>[] = [];
            const taskKeywords = this.extractTaskKeywords(task);
            
            for (let i = 1; i <= count; i++) {
                const subtaskName = await vscode.window.showInputBox({
                    prompt: `Subtask ${i} name:`,
                    placeHolder: `Part ${i} of ${task.name}`,
                    value: this.generateSubtaskName(task, i, count, taskKeywords)
                });

                if (!subtaskName) break;

                const subtaskDescription = await vscode.window.showInputBox({
                    prompt: `Subtask ${i} description:`,
                    placeHolder: `Detailed description for ${subtaskName}`,
                    value: this.generateSubtaskDescription(task, i, count, subtaskName)
                });

                subtasks.push({
                    name: subtaskName,
                    description: subtaskDescription || `Subtask ${i} of ${task.name}`,
                    priority: task.priority,
                    estimatedHours: Math.max(0.5, (task.estimatedHours || 2) / count),
                    dependencies: i > 1 ? [`${task.id}-subtask-${i-1}`] : [],
                    status: i === 1 ? TaskStatus.notStarted : TaskStatus.blocked
                });
            }

            if (subtasks.length > 0) {
                // Add subtasks to project plan
                const addedSubtasks = await this.projectPlan.addSubtasks(task.id, subtasks);
                
                // Block the original task
                await this.projectPlan.blockTask(task.id, 'Task broken down into subtasks');
                
                vscode.window.showInformationMessage(
                    `Created ${addedSubtasks.length} subtasks for "${task.name}". Original task is now blocked.`,
                    'View Subtasks', 'OK'
                ).then(choice => {
                    if (choice === 'View Subtasks') {
                        vscode.commands.executeCommand('failsafe.showPlan');
                    }
                });

                this.logger.info('Task breakdown completed', {
                    originalTaskId: task.id,
                    subtaskCount: addedSubtasks.length,
                    subtaskIds: addedSubtasks.map(t => t.id)
                });
            }

        } catch (error) {
            this.logger.error('Failed to create task breakdown', error);
            vscode.window.showErrorMessage('Failed to create task breakdown. Please try again.');
        }
    }

    private extractTaskKeywords(task: Task): string[] {
        const text = `${task.name} ${task.description}`.toLowerCase();
        const keywords = [];
        
        // Extract common development keywords
        const devKeywords = [
            'implement', 'create', 'build', 'develop', 'design', 'test', 'debug',
            'refactor', 'optimize', 'document', 'deploy', 'configure', 'setup',
            'install', 'update', 'fix', 'resolve', 'analyze', 'review'
        ];

        for (const keyword of devKeywords) {
            if (text.includes(keyword)) {
                keywords.push(keyword);
            }
        }

        return keywords;
    }

    private generateSubtaskName(task: Task, index: number, total: number, keywords: string[]): string {
        const baseName = task.name;
        
        if (keywords.length > 0) {
            const keyword = keywords[0];
            return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} ${baseName} (${index}/${total})`;
        }

        const phases = ['Setup', 'Implementation', 'Testing', 'Documentation', 'Deployment'];
        const phaseIndex = Math.min(index - 1, phases.length - 1);
        return `${phases[phaseIndex]} ${baseName} (${index}/${total})`;
    }

    private generateSubtaskDescription(task: Task, index: number, total: number, subtaskName: string): string {
        const baseDescription = task.description || task.name;
        
        if (index === 1) {
            return `Initial setup and preparation for ${baseDescription}`;
        } else if (index === total) {
            return `Final completion and verification of ${baseDescription}`;
        } else {
            return `Core implementation phase ${index} of ${total} for ${baseDescription}`;
        }
    }
} 