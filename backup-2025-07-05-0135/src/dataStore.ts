import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';
import { Rule, Sprint, Task, LogEntry } from './schemas';

export class DataStore {
    private readonly logger: Logger;
    private readonly failsafeDir: string;

    constructor(logger: Logger) {
        this.logger = logger;
        this.failsafeDir = this.getFailsafeDir();
        this.ensureFailsafeDir();
    }

    private getFailsafeDir(): string {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            throw new Error('No workspace found');
        }
        return path.join(workspacePath, '.failsafe');
    }

    private ensureFailsafeDir(): void {
        if (!fs.existsSync(this.failsafeDir)) {
            fs.mkdirSync(this.failsafeDir, { recursive: true });
            this.logger.info(`Created .failsafe directory at ${this.failsafeDir}`);
        }
    }

    private getFilePath(filename: string): string {
        return path.join(this.failsafeDir, filename);
    }

    private readJsonFile<T>(filename: string): T[] {
        const filePath = this.getFilePath(filename);
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(content) as T[];
            }
        } catch (error) {
            this.logger.error(`Failed to read ${filename}:`, error);
        }
        return [];
    }

    private writeJsonFile<T>(filename: string, data: T[]): void {
        const filePath = this.getFilePath(filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            this.logger.info(`Successfully wrote ${filename}`);
        } catch (error) {
            this.logger.error(`Failed to write ${filename}:`, error);
            throw error;
        }
    }

    // Rules CRUD operations
    public getRules(): Rule[] {
        return this.readJsonFile<Rule>('rules.json');
    }

    public saveRule(rule: Rule): void {
        const rules = this.getRules();
        const existingIndex = rules.findIndex(r => r.id === rule.id);
        
        if (existingIndex >= 0) {
            rules[existingIndex] = rule;
        } else {
            rules.push(rule);
        }
        
        this.writeJsonFile('rules.json', rules);
    }

    public addRule(rule: Rule): Rule {
        const rules = this.getRules();
        rules.push(rule);
        this.writeJsonFile('rules.json', rules);
        return rule;
    }

    public updateRule(id: string, updates: Partial<Rule>): Rule | null {
        const rules = this.getRules();
        const ruleIndex = rules.findIndex(r => r.id === id);
        
        if (ruleIndex >= 0) {
            rules[ruleIndex] = { ...rules[ruleIndex], ...updates };
            this.writeJsonFile('rules.json', rules);
            return rules[ruleIndex];
        }
        
        return null;
    }

    public deleteRule(id: string): boolean {
        const rules = this.getRules();
        const filteredRules = rules.filter(r => r.id !== id);
        
        if (filteredRules.length !== rules.length) {
            this.writeJsonFile('rules.json', filteredRules);
            return true;
        }
        
        return false;
    }

    // Sprints CRUD operations
    public getSprints(): Sprint[] {
        return this.readJsonFile<Sprint>('sprints.json');
    }

    public saveSprint(sprint: Sprint): void {
        const sprints = this.getSprints();
        const existingIndex = sprints.findIndex(s => s.id === sprint.id);
        
        if (existingIndex >= 0) {
            sprints[existingIndex] = sprint;
        } else {
            sprints.push(sprint);
        }
        
        this.writeJsonFile('sprints.json', sprints);
    }

    public addSprint(sprint: Sprint): Sprint {
        const sprints = this.getSprints();
        sprints.push(sprint);
        this.writeJsonFile('sprints.json', sprints);
        return sprint;
    }

    public updateSprint(id: string, updates: Partial<Sprint>): Sprint | null {
        const sprints = this.getSprints();
        const sprintIndex = sprints.findIndex(s => s.id === id);
        
        if (sprintIndex >= 0) {
            sprints[sprintIndex] = { ...sprints[sprintIndex], ...updates };
            this.writeJsonFile('sprints.json', sprints);
            return sprints[sprintIndex];
        }
        
        return null;
    }

    public deleteSprint(id: string): boolean {
        const sprints = this.getSprints();
        const filteredSprints = sprints.filter(s => s.id !== id);
        
        if (filteredSprints.length !== sprints.length) {
            this.writeJsonFile('sprints.json', filteredSprints);
            return true;
        }
        
        return false;
    }

    // Tasks CRUD operations
    public getTasks(): Task[] {
        return this.readJsonFile<Task>('tasks.json');
    }

    public saveTask(task: Task): void {
        const tasks = this.getTasks();
        const existingIndex = tasks.findIndex(t => t.id === task.id);
        
        if (existingIndex >= 0) {
            tasks[existingIndex] = task;
        } else {
            tasks.push(task);
        }
        
        this.writeJsonFile('tasks.json', tasks);
    }

    public addTask(task: Task): Task {
        const tasks = this.getTasks();
        tasks.push(task);
        this.writeJsonFile('tasks.json', tasks);
        return task;
    }

    public updateTask(id: string, updates: Partial<Task>): Task | null {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === id);
        
        if (taskIndex >= 0) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            this.writeJsonFile('tasks.json', tasks);
            return tasks[taskIndex];
        }
        
        return null;
    }

    public deleteTask(id: string): boolean {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== id);
        
        if (filteredTasks.length !== tasks.length) {
            this.writeJsonFile('tasks.json', filteredTasks);
            return true;
        }
        
        return false;
    }

    public getTasksBySprint(sprintId: string): Task[] {
        return this.getTasks().filter(task => task.sprintId === sprintId);
    }

    // Logs operations
    public getLogs(): LogEntry[] {
        return this.readJsonFile<LogEntry>('logs.json');
    }

    public addLog(logEntry: LogEntry): void {
        const logs = this.getLogs();
        logs.push(logEntry);
        
        // Keep only last 1000 log entries to prevent file bloat
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        this.writeJsonFile('logs.json', logs);
    }

    public getLogsByLevel(level: 'info' | 'warning' | 'error' | 'debug'): LogEntry[] {
        return this.getLogs().filter(log => log.level === level);
    }

    public getLogsBySource(source: string): LogEntry[] {
        return this.getLogs().filter(log => log.source === source);
    }

    public getLogsByTimeRange(startTime: string, endTime: string): LogEntry[] {
        return this.getLogs().filter(log => 
            log.timestamp >= startTime && log.timestamp <= endTime
        );
    }

    // Utility methods
    public getFailsafeDirectory(): string {
        return this.failsafeDir;
    }

    public backupData(): void {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.failsafeDir, 'backups', timestamp);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const files = ['rules.json', 'sprints.json', 'tasks.json', 'logs.json'];
        
        files.forEach(filename => {
            const sourcePath = this.getFilePath(filename);
            const backupPath = path.join(backupDir, filename);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, backupPath);
            }
        });
        
        this.logger.info(`Data backup created at ${backupDir}`);
    }

    public restoreData(backupTimestamp: string): void {
        const backupDir = path.join(this.failsafeDir, 'backups', backupTimestamp);
        
        if (!fs.existsSync(backupDir)) {
            throw new Error(`Backup not found: ${backupTimestamp}`);
        }
        
        const files = ['rules.json', 'sprints.json', 'tasks.json', 'logs.json'];
        
        files.forEach(filename => {
            const backupPath = path.join(backupDir, filename);
            const targetPath = this.getFilePath(filename);
            
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, targetPath);
            }
        });
        
        this.logger.info(`Data restored from backup: ${backupTimestamp}`);
    }
} 