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
exports.Logger = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    constructor() {
        this.logDir = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe');
        this.currentSessionId = this.generateSessionId();
        this.ensureLogDirectory();
    }
    generateSessionId() {
        const now = new Date();
        return `session-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    }
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    getLogLevel() {
        return vscode.workspace.getConfiguration('failsafe').get('logLevel', 'info');
    }
    shouldLog(level) {
        const configLevel = this.getLogLevel();
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(configLevel);
    }
    writeToFile(level, message, data) {
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
            let logs = [];
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(content);
            }
            logs.push(logEntry);
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        }
        catch (error) {
            console.error('Failed to write log entry:', error);
        }
    }
    debug(message, data) {
        this.writeToFile('debug', message, data);
        console.debug(`[FailSafe] ${message}`, data);
    }
    info(message, data) {
        this.writeToFile('info', message, data);
        console.info(`[FailSafe] ${message}`, data);
    }
    warn(message, data) {
        this.writeToFile('warn', message, data);
        console.warn(`[FailSafe] ${message}`, data);
    }
    error(message, error) {
        this.writeToFile('error', message, error);
        console.error(`[FailSafe] ${message}`, error);
    }
    logSession(sessionLog) {
        const logFile = path.join(this.logDir, `${this.currentSessionId}.json`);
        try {
            let logs = [];
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(content);
            }
            logs.push(sessionLog);
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        }
        catch (error) {
            console.error('Failed to write session log:', error);
        }
    }
    getSessionLogs(sessionId) {
        try {
            const targetSessionId = sessionId || this.currentSessionId;
            const logFile = path.join(this.logDir, `${targetSessionId}.json`);
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            this.error('Failed to read session logs', error);
        }
        return [];
    }
    getRecentLogs(limit = 10) {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse()
                .slice(0, limit);
            const allLogs = [];
            for (const file of files) {
                const logFile = path.join(this.logDir, file);
                const content = fs.readFileSync(logFile, 'utf8');
                const logs = JSON.parse(content);
                allLogs.push(...logs);
            }
            return allLogs.slice(-limit);
        }
        catch (error) {
            this.error('Failed to read recent logs', error);
            return [];
        }
    }
    clearLogs() {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.json'));
            for (const file of files) {
                fs.unlinkSync(path.join(this.logDir, file));
            }
            this.info('Logs cleared successfully');
        }
        catch (error) {
            this.error('Failed to clear logs', error);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map