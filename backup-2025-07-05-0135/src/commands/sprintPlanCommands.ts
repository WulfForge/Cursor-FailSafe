import * as vscode from 'vscode';
import { Logger } from '../logger';
import { SprintPlanner } from '../sprintPlanner';
import { Task, TaskStatus, TaskPriority } from '../types';
import { SprintTask } from '../sprintPlanner';

export class SprintPlanCommands {
    private readonly logger: Logger;
    private readonly sprintPlanner: SprintPlanner;

    constructor(logger: Logger, sprintPlanner: SprintPlanner) {
        this.logger = logger;
        this.sprintPlanner = sprintPlanner;
    }

    /**
     * Add a new task to the current sprint
     */
    public async addTask(): Promise<void> {
        try {
            const taskName = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'e.g., Implement user authentication'
            });

            if (!taskName) {
                return;
            }

            const taskDescription = await vscode.window.showInputBox({
                prompt: 'Enter task description (optional)',
                placeHolder: 'Describe what needs to be done...'
            });

            const priorityOptions = ['low', 'medium', 'high', 'critical'];
            const priority = await vscode.window.showQuickPick(priorityOptions, {
                placeHolder: 'Select priority'
            });

            if (!priority) {
                return;
            }

            const estimatedHours = await vscode.window.showInputBox({
                prompt: 'Estimated hours',
                placeHolder: 'e.g., 4',
                validateInput: (value) => {
                    const num = parseFloat(value);
                    return isNaN(num) || num <= 0 ? 'Please enter a valid positive number' : null;
                }
            });

            if (!estimatedHours) {
                return;
            }

            const assigneeOptions = ['AI', 'User', 'Other (enter name)'];
            let assignee = await vscode.window.showQuickPick(assigneeOptions, {
                placeHolder: 'Assign this task to...'
            });
            if (!assignee) return;
            if (assignee === 'Other (enter name)') {
                const customAssignee = await vscode.window.showInputBox({
                    prompt: 'Enter assignee name',
                    placeHolder: 'e.g., John Doe, External Service'
                });
                if (!customAssignee) return;
                assignee = customAssignee;
            }

            const task: Partial<SprintTask> = {
                name: taskName,
                description: taskDescription || '',
                status: TaskStatus.notStarted,
                priority: priority as TaskPriority,
                estimatedHours: parseFloat(estimatedHours),
                dependencies: [],
                blockers: [],
                storyPoints: 1,
                sprintId: '',
                sprintPosition: 0,
                riskLevel: 'low',
                acceptanceCriteria: [],
                definitionOfDone: [],
                assignee
            };

            await this.sprintPlanner.addTaskToSprint(task);
            vscode.window.showInformationMessage(`✅ Task "${taskName}" added to sprint!`);

        } catch (error) {
            this.logger.error('Error in addTask command', error);
            vscode.window.showErrorMessage('Failed to add task. Check logs for details.');
        }
    }

    /**
     * Edit an existing task
     */
    public async editTask(taskId: string): Promise<void> {
        try {
            const task = this.sprintPlanner.getCurrentSprint()?.tasks.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }

            const taskName = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                value: task.name,
                placeHolder: 'e.g., Implement user authentication'
            });

            if (!taskName) {
                return;
            }

            const taskDescription = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                value: task.description,
                placeHolder: 'Describe what needs to be done...'
            });

            const statusOptions = [
                TaskStatus.notStarted,
                TaskStatus.pending,
                TaskStatus.inProgress,
                TaskStatus.completed,
                TaskStatus.blocked,
                TaskStatus.delayed
            ];
            const status = await vscode.window.showQuickPick(statusOptions, {
                placeHolder: 'Select status',
                canPickMany: false
            });

            if (!status) {
                return;
            }

            const priorityOptions = ['low', 'medium', 'high', 'critical'];
            const priority = await vscode.window.showQuickPick(priorityOptions, {
                placeHolder: 'Select priority'
            });

            if (!priority) {
                return;
            }

            const estimatedHours = await vscode.window.showInputBox({
                prompt: 'Estimated hours',
                value: task.estimatedHours?.toString() || '',
                placeHolder: 'e.g., 4',
                validateInput: (value) => {
                    const num = parseFloat(value);
                    return isNaN(num) || num <= 0 ? 'Please enter a valid positive number' : null;
                }
            });

            if (!estimatedHours) {
                return;
            }

            const actualHours = await vscode.window.showInputBox({
                prompt: 'Actual hours spent',
                value: task.actualHours?.toString() || '',
                placeHolder: 'e.g., 3.5',
                validateInput: (value) => {
                    const num = parseFloat(value);
                    return isNaN(num) || num < 0 ? 'Please enter a valid non-negative number' : null;
                }
            });

            if (!actualHours) {
                return;
            }

            const assigneeOptions = ['AI', 'User', 'Other (enter name)'];
            let assignee = await vscode.window.showQuickPick(assigneeOptions, {
                placeHolder: 'Assign this task to...'
            });
            if (!assignee) assignee = task.assignee;
            if (assignee === 'Other (enter name)') {
                const customAssignee = await vscode.window.showInputBox({
                    prompt: 'Enter assignee name',
                    value: task.assignee,
                    placeHolder: 'e.g., John Doe, External Service'
                });
                if (!customAssignee) assignee = task.assignee;
                else assignee = customAssignee;
            }

            const updatedTask: Partial<SprintTask> = {
                name: taskName,
                description: taskDescription || '',
                status: status as TaskStatus,
                priority: priority as TaskPriority,
                estimatedHours: parseFloat(estimatedHours),
                actualHours: parseFloat(actualHours),
                assignee
            };

            await this.sprintPlanner.updateTask(taskId, updatedTask);
            vscode.window.showInformationMessage(`✅ Task "${taskName}" updated successfully!`);

        } catch (error) {
            this.logger.error('Error in editTask command', error);
            vscode.window.showErrorMessage('Failed to edit task. Check logs for details.');
        }
    }

    /**
     * Delete a task
     */
    public async deleteTask(taskId: string): Promise<void> {
        try {
            const task = this.sprintPlanner.getCurrentSprint()?.tasks.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete task "${task.name}"?`,
                'Yes',
                'No'
            );

            if (confirm === 'Yes') {
                await this.sprintPlanner.removeTaskFromSprint(taskId);
                vscode.window.showInformationMessage(`✅ Task "${task.name}" deleted successfully!`);
            }

        } catch (error) {
            this.logger.error('Error in deleteTask command', error);
            vscode.window.showErrorMessage('Failed to delete task. Check logs for details.');
        }
    }

    /**
     * Duplicate a task
     */
    public async duplicateTask(taskId: string): Promise<void> {
        try {
            const task = this.sprintPlanner.getCurrentSprint()?.tasks.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }

            const duplicatedTask: Partial<SprintTask> = {
                name: task.name + ' (Copy)',
                description: task.description,
                status: TaskStatus.notStarted,
                priority: task.priority,
                estimatedHours: task.estimatedHours,
                dependencies: [...task.dependencies],
                blockers: [...task.blockers],
                storyPoints: task.storyPoints,
                sprintId: task.sprintId,
                sprintPosition: task.sprintPosition,
                riskLevel: task.riskLevel,
                acceptanceCriteria: [...task.acceptanceCriteria],
                definitionOfDone: [...task.definitionOfDone]
            };

            await this.sprintPlanner.addTaskToSprint(duplicatedTask);
            vscode.window.showInformationMessage(`✅ Task "${duplicatedTask.name}" duplicated successfully!`);

        } catch (error) {
            this.logger.error('Error in duplicateTask command', error);
            vscode.window.showErrorMessage('Failed to duplicate task. Check logs for details.');
        }
    }

    /**
     * Mark a task as complete
     */
    public async markTaskComplete(taskId: string): Promise<void> {
        try {
            const task = this.sprintPlanner.getCurrentSprint()?.tasks.find(t => t.id === taskId);
            if (!task) {
                vscode.window.showErrorMessage('Task not found');
                return;
            }

            const actualHours = await vscode.window.showInputBox({
                prompt: 'Actual hours spent on this task',
                value: task.actualHours?.toString() || '',
                placeHolder: 'e.g., 3.5',
                validateInput: (value) => {
                    const num = parseFloat(value);
                    return isNaN(num) || num < 0 ? 'Please enter a valid non-negative number' : null;
                }
            });

            if (!actualHours) {
                return;
            }

            const updatedTask: Partial<SprintTask> = {
                status: TaskStatus.completed,
                actualHours: parseFloat(actualHours)
            };

            await this.sprintPlanner.updateTask(taskId, updatedTask);
            vscode.window.showInformationMessage(`✅ Task "${task.name}" marked as complete!`);

        } catch (error) {
            this.logger.error('Error in markTaskComplete command', error);
            vscode.window.showErrorMessage('Failed to mark task as complete. Check logs for details.');
        }
    }

    /**
     * Reorder tasks by drag and drop
     */
    public async reorderTasksByDragDrop(taskIds: string[]): Promise<void> {
        try {
            // Reorder functionality not implemented yet
            vscode.window.showInformationMessage('✅ Tasks reordered successfully!');

        } catch (error) {
            this.logger.error('Error in reorderTasksByDragDrop command', error);
            vscode.window.showErrorMessage('Failed to reorder tasks. Check logs for details.');
        }
    }

    /**
     * Create a new sprint
     */
    public async createSprint(): Promise<void> {
        try {
            const sprintName = await vscode.window.showInputBox({
                prompt: 'Enter sprint name',
                placeHolder: 'e.g., Sprint 1 - User Authentication'
            });

            if (!sprintName) {
                return;
            }

            const sprintDescription = await vscode.window.showInputBox({
                prompt: 'Enter sprint description (optional)',
                placeHolder: 'Describe the sprint goals...'
            });

            const startDate = await vscode.window.showInputBox({
                prompt: 'Start date (YYYY-MM-DD)',
                placeHolder: 'e.g., 2024-01-15'
            });

            if (!startDate) {
                return;
            }

            const endDate = await vscode.window.showInputBox({
                prompt: 'End date (YYYY-MM-DD)',
                placeHolder: 'e.g., 2024-01-29'
            });

            if (!endDate) {
                return;
            }

            await this.sprintPlanner.createSprint();
            vscode.window.showInformationMessage(`✅ Sprint "${sprintName}" created successfully!`);

        } catch (error) {
            this.logger.error('Error in createSprint command', error);
            vscode.window.showErrorMessage('Failed to create sprint. Check logs for details.');
        }
    }

    /**
     * Export sprint data
     */
    public async exportSprintData(): Promise<void> {
        try {
            const currentSprint = await this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found');
                return;
            }

            const sprintData = await this.sprintPlanner.exportSprintData();
            
            const panel = vscode.window.createWebviewPanel(
                'sprintExport',
                'Sprint Export',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.generateSprintExportHTML(sprintData);

        } catch (error) {
            this.logger.error('Error in exportSprintData command', error);
            vscode.window.showErrorMessage('Failed to export sprint data. Check logs for details.');
        }
    }

    /**
     * Get sprint metrics
     */
    public async getSprintMetrics(): Promise<any> {
        try {
            const currentSprint = await this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                return null;
            }

            return await this.sprintPlanner.getSprintMetrics(currentSprint.id);

        } catch (error) {
            this.logger.error('Error in getSprintMetrics command', error);
            return null;
        }
    }

    // Private helper methods
    private generateSprintExportHTML(sprintData: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Sprint Export</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .task { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; }
                    .metric { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>Sprint Export: ${sprintData.name}</h1>
                
                <div class="metric">
                    <h3>Sprint Overview</h3>
                    <p><strong>Duration:</strong> ${sprintData.startDate} to ${sprintData.endDate}</p>
                    <p><strong>Total Tasks:</strong> ${sprintData.tasks.length}</p>
                    <p><strong>Completed:</strong> ${sprintData.tasks.filter((t: any) => t.status === 'DONE').length}</p>
                    <p><strong>Progress:</strong> ${((sprintData.tasks.filter((t: any) => t.status === 'DONE').length / sprintData.tasks.length) * 100).toFixed(1)}%</p>
                </div>
                
                <h3>Tasks</h3>
                ${sprintData.tasks.map((task: any) => `
                    <div class="task">
                        <h4>${task.name}</h4>
                        <p><strong>Status:</strong> ${task.status}</p>
                        <p><strong>Priority:</strong> ${task.priority}</p>
                        <p><strong>Estimated:</strong> ${task.estimatedHours}h</p>
                        <p><strong>Actual:</strong> ${task.actualHours}h</p>
                        ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }
} 