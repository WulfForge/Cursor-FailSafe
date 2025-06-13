import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SessionLog } from './types';

export class Logger {
    private logDir: string;
    private currentSessionId: string;

    constructor() {
        this.logDir = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe');
        this.currentSessionId = this.generateSessionId();
        this.ensureLogDirectory();
    }

    private generateSessionId(): string {
        const now = new Date();
        return `session-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    }

    private ensureLogDirectory(): void {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    private getLogLevel(): string {
        return vscode.workspace.getConfiguration('failsafe').get('logLevel', 'info');
    }

    private shouldLog(level: string): boolean {
        const configLevel = this.getLogLevel();
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(configLevel);
    }

    private writeToFile(level: string, message: string, data?: unknown): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            sessionId: this.currentSessionId
        };

        const logFile = path.join(this.logDir, `${this.currentSessionId}.json`);
        
        try {
            let logs: unknown[] = [];
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(content);
            }
            
            logs.push(logEntry);
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to write log entry:', error);
        }
    }

    public debug(message: string, data?: unknown): void {
        this.writeToFile('debug', message, data);
        console.debug(`[FailSafe] ${message}`, data);
    }

    public info(message: string, data?: unknown): void {
        this.writeToFile('info', message, data);
        console.info(`[FailSafe] ${message}`, data);
    }

    public warn(message: string, data?: unknown): void {
        this.writeToFile('warn', message, data);
        console.warn(`[FailSafe] ${message}`, data);
    }

    public error(message: string, error?: unknown): void {
        this.writeToFile('error', message, error);
        console.error(`[FailSafe] ${message}`, error);
    }

    public logSession(sessionLog: SessionLog): void {
        const logFile = path.join(this.logDir, `${this.currentSessionId}.json`);
        
        try {
            let logs: SessionLog[] = [];
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(content);
            }
            
            logs.push(sessionLog);
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to write session log:', error);
        }
    }

    public getSessionLogs(sessionId?: string): SessionLog[] {
        try {
            const targetSessionId = sessionId || this.currentSessionId;
            const logFile = path.join(this.logDir, `${targetSessionId}.json`);
            
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            this.error('Failed to read session logs', error);
        }
        
        return [];
    }

    public getRecentLogs(limit = 10): SessionLog[] {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse()
                .slice(0, limit);

            const allLogs: SessionLog[] = [];
            
            for (const file of files) {
                const logFile = path.join(this.logDir, file);
                const content = fs.readFileSync(logFile, 'utf8');
                const logs = JSON.parse(content);
                allLogs.push(...logs);
            }
            
            return allLogs.slice(-limit);
        } catch (error) {
            this.error('Failed to read recent logs', error);
            return [];
        }
    }

    public clearLogs(): void {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.json'));
            
            for (const file of files) {
                fs.unlinkSync(path.join(this.logDir, file));
            }
            
            this.info('Logs cleared successfully');
        } catch (error) {
            this.error('Failed to clear logs', error);
        }
    }
} 