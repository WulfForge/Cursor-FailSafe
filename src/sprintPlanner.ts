import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { Task, TaskStatus, TaskPriority } from './types';

export interface SprintPlan {
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    duration: number; // in days
    tasks: SprintTask[];
    status: 'planning' | 'active' | 'completed' | 'cancelled';
    velocity: number; // story points per day
    capacity: number; // hours per day
    teamSize: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    version: string;
    metadata: {
        sprintNumber: number;
        projectId: string;
        previousSprintId?: string;
        nextSprintId?: string;
        tags: string[];
        notes: string;
    };
}

export interface SprintTask extends Task {
    storyPoints: number;
    sprintId: string;
    estimatedHours: number;
    actualHours?: number;
    sprintPosition: number;
    dependencies: string[];
    blockers: string[];
    riskLevel: 'low' | 'medium' | 'high';
    acceptanceCriteria: string[];
    definitionOfDone: string[];
    completed?: boolean; // For UI toggle functionality
}

export interface SprintMetrics {
    totalStoryPoints: number;
    completedStoryPoints: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    progressPercentage: number;
    velocity: number;
    burndownData: BurndownPoint[];
    teamVelocity: number;
    capacityUtilization: number;
    riskAssessment: RiskAssessment;
}

export interface BurndownPoint {
    date: Date;
    remainingStoryPoints: number;
    remainingTasks: number;
    completedStoryPoints: number;
    completedTasks: number;
}

export interface RiskAssessment {
    highRiskTasks: SprintTask[];
    mediumRiskTasks: SprintTask[];
    blockedTasks: SprintTask[];
    overdueTasks: SprintTask[];
    recommendations: string[];
    overallRisk: 'low' | 'medium' | 'high';
}

export interface SprintTemplate {
    id: string;
    name: string;
    description: string;
    duration: number;
    velocity: number;
    capacity: number;
    teamSize: number;
    defaultTasks: Partial<SprintTask>[];
    tags: string[];
}

export class SprintPlanner {
    private readonly logger: Logger;
    private readonly sprintFile: string;
    private readonly templatesFile: string;
    private currentSprint: SprintPlan | null = null;
    private sprintHistory: SprintPlan[] = [];
    private templates: SprintTemplate[] = [];

    constructor(logger: Logger) {
        this.logger = logger;
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.sprintFile = path.join(workspacePath, '.failsafe', 'sprints.json');
        this.templatesFile = path.join(workspacePath, '.failsafe', 'sprint-templates.json');
        this.initializeStorage();
    }

    private initializeStorage(): void {
        try {
            const failsafeDir = path.dirname(this.sprintFile);
            if (!fs.existsSync(failsafeDir)) {
                fs.mkdirSync(failsafeDir, { recursive: true });
            }
            this.loadSprints();
            this.loadTemplates();
            this.logger.info('Sprint planner storage initialized');
        } catch (error) {
            this.logger.error('Failed to initialize sprint planner storage', error);
        }
    }

    private loadSprints(): void {
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
                    data.currentSprint.tasks.forEach((task: SprintTask) => {
                        if (task.startTime) task.startTime = new Date(task.startTime);
                        if (task.endTime) task.endTime = new Date(task.endTime);
                    });
                }
                
                if (data.sprintHistory) {
                    data.sprintHistory.forEach((sprint: SprintPlan) => {
                        sprint.startDate = new Date(sprint.startDate);
                        sprint.endDate = new Date(sprint.endDate);
                        sprint.createdAt = new Date(sprint.createdAt);
                        sprint.updatedAt = new Date(sprint.updatedAt);
                        
                        sprint.tasks.forEach((task: SprintTask) => {
                            if (task.startTime) task.startTime = new Date(task.startTime);
                            if (task.endTime) task.endTime = new Date(task.endTime);
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
        } catch (error) {
            this.logger.error('Failed to load sprint data', error);
        }
    }

    private loadTemplates(): void {
        try {
            if (fs.existsSync(this.templatesFile)) {
                const content = fs.readFileSync(this.templatesFile, 'utf8');
                this.templates = JSON.parse(content);
                this.logger.info('Sprint templates loaded', { templateCount: this.templates.length });
            } else {
                this.createDefaultTemplates();
            }
        } catch (error) {
            this.logger.error('Failed to load sprint templates', error);
            this.createDefaultTemplates();
        }
    }

    private createDefaultTemplates(): void {
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
                        priority: TaskPriority.high,
                        riskLevel: 'low'
                    },
                    {
                        name: 'Daily Standups',
                        description: 'Daily team synchronization',
                        storyPoints: 1,
                        estimatedHours: 2,
                        priority: TaskPriority.medium,
                        riskLevel: 'low'
                    },
                    {
                        name: 'Sprint Review',
                        description: 'Review completed work with stakeholders',
                        storyPoints: 3,
                        estimatedHours: 4,
                        priority: TaskPriority.high,
                        riskLevel: 'medium'
                    },
                    {
                        name: 'Sprint Retrospective',
                        description: 'Team reflection and improvement planning',
                        storyPoints: 2,
                        estimatedHours: 3,
                        priority: TaskPriority.medium,
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
                        priority: TaskPriority.high,
                        riskLevel: 'medium'
                    },
                    {
                        name: 'Daily Sync',
                        description: 'Brief daily team synchronization',
                        storyPoints: 1,
                        estimatedHours: 1,
                        priority: TaskPriority.medium,
                        riskLevel: 'low'
                    }
                ],
                tags: ['quick', 'urgent', '1-week']
            }
        ];
        this.saveTemplates();
    }

    private saveSprints(): void {
        try {
            const data = {
                currentSprint: this.currentSprint,
                sprintHistory: this.sprintHistory,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.sprintFile, JSON.stringify(data, null, 2));
            this.logger.debug('Sprint data saved');
        } catch (error) {
            this.logger.error('Failed to save sprint data', error);
        }
    }

    private saveTemplates(): void {
        try {
            fs.writeFileSync(this.templatesFile, JSON.stringify(this.templates, null, 2));
            this.logger.debug('Sprint templates saved');
        } catch (error) {
            this.logger.error('Failed to save sprint templates', error);
        }
    }

    public async createSprint(templateId?: string): Promise<SprintPlan | null> {
        try {
            const template = templateId ? this.templates.find(t => t.id === templateId) : this.templates[0];
            
            const name = await vscode.window.showInputBox({
                prompt: 'Enter sprint name',
                placeHolder: template?.name || 'Sprint 1',
                validateInput: (value) => value.trim().length > 0 ? null : 'Sprint name is required'
            });
            if (!name) return null;

            const description = await vscode.window.showInputBox({
                prompt: 'Enter sprint description (optional)',
                placeHolder: 'Brief description of sprint goals'
            });

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (template?.duration || 14));

            const sprint: SprintPlan = {
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
                    status: TaskStatus.notStarted,
                    startTime: undefined,
                    endTime: undefined,
                    dependencies: [],
                    blockers: [],
                    acceptanceCriteria: [],
                    definitionOfDone: [],
                    storyPoints: task.storyPoints || 1,
                    estimatedHours: task.estimatedHours || 4,
                    estimatedDuration: task.estimatedDuration || 240,
                    priority: task.priority || TaskPriority.medium,
                    riskLevel: task.riskLevel || 'medium'
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
        } catch (error) {
            this.logger.error('Failed to create sprint', error);
            return null;
        }
    }

    public async addTaskToSprint(task: Partial<SprintTask>): Promise<boolean> {
        if (!this.currentSprint) {
            vscode.window.showErrorMessage('No active sprint found. Please create a sprint first.');
            return false;
        }

        try {
            const sprintTask: SprintTask = {
                id: task.id || `task-${Date.now()}`,
                name: task.name || 'New Task',
                description: task.description || '',
                status: task.status || TaskStatus.notStarted,
                priority: task.priority || TaskPriority.medium,
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
                estimatedDuration: task.estimatedDuration || 60
            };

            this.currentSprint.tasks.push(sprintTask);
            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            
            this.logger.info('Task added to sprint', { 
                taskId: sprintTask.id, 
                sprintId: this.currentSprint.id 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to add task to sprint', error);
            return false;
        }
    }

    public async updateTask(taskId: string, updatedTask: SprintTask): Promise<boolean> {
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
        } catch (error) {
            this.logger.error('Failed to update task in sprint', error);
            return false;
        }
    }

    public async removeTaskFromSprint(taskId: string): Promise<boolean> {
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
        } catch (error) {
            this.logger.error('Failed to remove task from sprint', error);
            return false;
        }
    }

    public async startSprint(): Promise<boolean> {
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
        } catch (error) {
            this.logger.error('Failed to start sprint', error);
            return false;
        }
    }

    public async completeSprint(): Promise<boolean> {
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
        } catch (error) {
            this.logger.error('Failed to complete sprint', error);
            return false;
        }
    }

    public getCurrentSprint(): SprintPlan | null {
        return this.currentSprint;
    }

    public getSprintHistory(): SprintPlan[] {
        return this.sprintHistory;
    }

    public getSprintMetrics(sprintId?: string): SprintMetrics | null {
        const sprint = sprintId ? 
            this.sprintHistory.find(s => s.id === sprintId) : 
            this.currentSprint;
        
        if (!sprint) return null;

        const totalStoryPoints = sprint.tasks.reduce((sum, task) => sum + task.storyPoints, 0);
        const completedTasks = sprint.tasks.filter(task => task.status === TaskStatus.completed);
        const completedStoryPoints = completedTasks.reduce((sum, task) => sum + task.storyPoints, 0);
        const inProgressTasks = sprint.tasks.filter(task => task.status === TaskStatus.inProgress);
        const blockedTasks = sprint.tasks.filter(task => task.status === TaskStatus.blocked);

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

    private calculateBurndownData(sprint: SprintPlan): BurndownPoint[] {
        const points: BurndownPoint[] = [];
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
            const dailyCompletedTasks = sprint.tasks.filter(task => 
                task.status === TaskStatus.completed && 
                task.endTime && 
                task.endTime.toDateString() === currentDate.toDateString()
            );

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

    private assessSprintRisks(sprint: SprintPlan): RiskAssessment {
        const highRiskTasks = sprint.tasks.filter(task => 
            task.riskLevel === 'high' || 
            task.status === TaskStatus.blocked ||
            (task.estimatedHours && task.estimatedHours > 16)
        );

        const mediumRiskTasks = sprint.tasks.filter(task => 
            task.riskLevel === 'medium' ||
            (task.dependencies && task.dependencies.length > 2)
        );

        const blockedTasks = sprint.tasks.filter(task => task.status === TaskStatus.blocked);
        
        const overdueTasks = sprint.tasks.filter(task => 
            task.status !== TaskStatus.completed && 
            task.endTime && 
            task.endTime < new Date()
        );

        const recommendations: string[] = [];
        
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

    public getTemplates(): SprintTemplate[] {
        return this.templates;
    }

    public async createTemplate(): Promise<SprintTemplate | null> {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter template name',
                placeHolder: 'Custom Sprint Template',
                validateInput: (value) => value.trim().length > 0 ? null : 'Template name is required'
            });
            if (!name) return null;

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
            if (!durationInput) return null;

            const template: SprintTemplate = {
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
        } catch (error) {
            this.logger.error('Failed to create sprint template', error);
            return null;
        }
    }

    private generateSprintId(): string {
        return `sprint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    public async exportSprintData(format: 'json' | 'csv' | 'markdown' = 'json'): Promise<string> {
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
        } catch (error) {
            this.logger.error('Failed to export sprint data', error);
            return '';
        }
    }

    private convertToCSV(): string {
        const csvLines: string[] = [];
        
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
    
    private sprintToCSV(sprint: SprintPlan): string {
        const csvLines: string[] = [];
        
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

    private convertToMarkdown(data: any): string {
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
            data.sprintHistory.forEach((sprint: any, index: number) => {
                markdown += `### ${index + 1}. ${sprint.name}\n\n`;
                markdown += this.generateSprintMarkdown(sprint);
                markdown += '\n---\n\n';
            });
        }

        // Templates
        if (data.templates && data.templates.length > 0) {
            markdown += '## Sprint Templates\n\n';
            data.templates.forEach((template: any) => {
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

    private generateSprintMarkdown(sprint: any): string {
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
            
            sprint.tasks.forEach((task: any) => {
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
            sprint.tasks.forEach((task: any) => {
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
                    task.acceptanceCriteria.forEach((criteria: string) => {
                        markdown += `- ${criteria}\n`;
                    });
                    markdown += '\n';
                }

                if (task.definitionOfDone && task.definitionOfDone.length > 0) {
                    markdown += '**Definition of Done:**\n';
                    task.definitionOfDone.forEach((done: string) => {
                        markdown += `- ${done}\n`;
                    });
                    markdown += '\n';
                }

                if (task.dependencies && task.dependencies.length > 0) {
                    markdown += '**Dependencies:**\n';
                    task.dependencies.forEach((dep: string) => {
                        markdown += `- ${dep}\n`;
                    });
                    markdown += '\n';
                }

                if (task.blockers && task.blockers.length > 0) {
                    markdown += '**Blockers:**\n';
                    task.blockers.forEach((blocker: string) => {
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
                metrics.riskAssessment.recommendations.forEach((rec: string) => {
                    markdown += `- ${rec}\n`;
                });
                markdown += '\n';
            }
        }

        return markdown;
    }

    public async toggleTask(taskIndex: number): Promise<boolean> {
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
                task.status = TaskStatus.completed;
            } else {
                task.endTime = undefined;
                task.status = TaskStatus.pending;
            }

            this.currentSprint.updatedAt = new Date();
            this.saveSprints();
            
            this.logger.info('Task toggled', { 
                taskId: task.id, 
                taskName: task.name, 
                completed: task.completed 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to toggle task', error);
            return false;
        }
    }
}
