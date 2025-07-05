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
exports.DataStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class DataStore {
    constructor(logger) {
        this.logger = logger;
        this.failsafeDir = this.getFailsafeDir();
        this.ensureFailsafeDir();
    }
    getFailsafeDir() {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            throw new Error('No workspace found');
        }
        return path.join(workspacePath, '.failsafe');
    }
    ensureFailsafeDir() {
        if (!fs.existsSync(this.failsafeDir)) {
            fs.mkdirSync(this.failsafeDir, { recursive: true });
            this.logger.info(`Created .failsafe directory at ${this.failsafeDir}`);
        }
    }
    getFilePath(filename) {
        return path.join(this.failsafeDir, filename);
    }
    readJsonFile(filename) {
        const filePath = this.getFilePath(filename);
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            this.logger.error(`Failed to read ${filename}:`, error);
        }
        return [];
    }
    writeJsonFile(filename, data) {
        const filePath = this.getFilePath(filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            this.logger.info(`Successfully wrote ${filename}`);
        }
        catch (error) {
            this.logger.error(`Failed to write ${filename}:`, error);
            throw error;
        }
    }
    // Rules CRUD operations
    getRules() {
        return this.readJsonFile('rules.json');
    }
    saveRule(rule) {
        const rules = this.getRules();
        const existingIndex = rules.findIndex(r => r.id === rule.id);
        if (existingIndex >= 0) {
            rules[existingIndex] = rule;
        }
        else {
            rules.push(rule);
        }
        this.writeJsonFile('rules.json', rules);
    }
    addRule(rule) {
        const rules = this.getRules();
        rules.push(rule);
        this.writeJsonFile('rules.json', rules);
        return rule;
    }
    updateRule(id, updates) {
        const rules = this.getRules();
        const ruleIndex = rules.findIndex(r => r.id === id);
        if (ruleIndex >= 0) {
            rules[ruleIndex] = { ...rules[ruleIndex], ...updates };
            this.writeJsonFile('rules.json', rules);
            return rules[ruleIndex];
        }
        return null;
    }
    deleteRule(id) {
        const rules = this.getRules();
        const filteredRules = rules.filter(r => r.id !== id);
        if (filteredRules.length !== rules.length) {
            this.writeJsonFile('rules.json', filteredRules);
            return true;
        }
        return false;
    }
    // Sprints CRUD operations
    getSprints() {
        return this.readJsonFile('sprints.json');
    }
    saveSprint(sprint) {
        const sprints = this.getSprints();
        const existingIndex = sprints.findIndex(s => s.id === sprint.id);
        if (existingIndex >= 0) {
            sprints[existingIndex] = sprint;
        }
        else {
            sprints.push(sprint);
        }
        this.writeJsonFile('sprints.json', sprints);
    }
    addSprint(sprint) {
        const sprints = this.getSprints();
        sprints.push(sprint);
        this.writeJsonFile('sprints.json', sprints);
        return sprint;
    }
    updateSprint(id, updates) {
        const sprints = this.getSprints();
        const sprintIndex = sprints.findIndex(s => s.id === id);
        if (sprintIndex >= 0) {
            sprints[sprintIndex] = { ...sprints[sprintIndex], ...updates };
            this.writeJsonFile('sprints.json', sprints);
            return sprints[sprintIndex];
        }
        return null;
    }
    deleteSprint(id) {
        const sprints = this.getSprints();
        const filteredSprints = sprints.filter(s => s.id !== id);
        if (filteredSprints.length !== sprints.length) {
            this.writeJsonFile('sprints.json', filteredSprints);
            return true;
        }
        return false;
    }
    // Tasks CRUD operations
    getTasks() {
        return this.readJsonFile('tasks.json');
    }
    saveTask(task) {
        const tasks = this.getTasks();
        const existingIndex = tasks.findIndex(t => t.id === task.id);
        if (existingIndex >= 0) {
            tasks[existingIndex] = task;
        }
        else {
            tasks.push(task);
        }
        this.writeJsonFile('tasks.json', tasks);
    }
    addTask(task) {
        const tasks = this.getTasks();
        tasks.push(task);
        this.writeJsonFile('tasks.json', tasks);
        return task;
    }
    updateTask(id, updates) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex >= 0) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            this.writeJsonFile('tasks.json', tasks);
            return tasks[taskIndex];
        }
        return null;
    }
    deleteTask(id) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== id);
        if (filteredTasks.length !== tasks.length) {
            this.writeJsonFile('tasks.json', filteredTasks);
            return true;
        }
        return false;
    }
    getTasksBySprint(sprintId) {
        return this.getTasks().filter(task => task.sprintId === sprintId);
    }
    // Logs operations
    getLogs() {
        return this.readJsonFile('logs.json');
    }
    addLog(logEntry) {
        const logs = this.getLogs();
        logs.push(logEntry);
        // Keep only last 1000 log entries to prevent file bloat
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        this.writeJsonFile('logs.json', logs);
    }
    getLogsByLevel(level) {
        return this.getLogs().filter(log => log.level === level);
    }
    getLogsBySource(source) {
        return this.getLogs().filter(log => log.source === source);
    }
    getLogsByTimeRange(startTime, endTime) {
        return this.getLogs().filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
    }
    // Utility methods
    getFailsafeDirectory() {
        return this.failsafeDir;
    }
    backupData() {
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
    restoreData(backupTimestamp) {
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
exports.DataStore = DataStore;
//# sourceMappingURL=dataStore.js.map