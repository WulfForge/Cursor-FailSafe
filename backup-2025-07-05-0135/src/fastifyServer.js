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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailSafeServer = void 0;
/// <reference types="node" />
const fastify_1 = __importDefault(require("fastify"));
const dataStore_1 = require("./dataStore");
const chartDataService_1 = require("./chartDataService");
const schemas_1 = require("./schemas");
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fastify_spec_gate_1 = __importDefault(require("./plugins/fastify-spec-gate"));
const fastify_event_bus_1 = __importDefault(require("./plugins/fastify-event-bus"));
const fastify_health_1 = __importDefault(require("./plugins/fastify-health"));
const fastify_metrics_1 = __importDefault(require("./plugins/fastify-metrics"));
const fastify_request_logger_1 = __importDefault(require("./plugins/fastify-request-logger"));
const fastify_spec_heatmap_1 = __importDefault(require("./plugins/fastify-spec-heatmap"));
const fastify_snapshot_validator_1 = __importDefault(require("./plugins/fastify-snapshot-validator"));
const fastify_auto_stub_1 = __importDefault(require("./plugins/fastify-auto-stub"));
const fastify_preview_1 = __importDefault(require("./plugins/fastify-preview"));
class FailSafeServer {
    constructor(logger, taskEngine, projectPlan) {
        this.port = 0; // Will be set dynamically
        this.isRunning = false;
        this.activeValidations = 0;
        this.logger = logger;
        this.taskEngine = taskEngine;
        this.projectPlan = projectPlan;
        this.dataStore = new dataStore_1.DataStore(logger);
        this.chartDataService = new chartDataService_1.RealChartDataService(taskEngine, projectPlan, logger);
        this.server = (0, fastify_1.default)({
            logger: {
                level: 'info'
            }
        });
        // Register TypeBox schemas
        this.registerSchemas();
    }
    registerSchemas() {
        // Register all schemas with Fastify
        Object.entries(schemas_1.schemas).forEach(([name, schema]) => {
            this.server.addSchema({
                $id: name,
                ...schema
            });
        });
    }
    async findAvailablePort(startPort) {
        const net = await Promise.resolve().then(() => __importStar(require('net')));
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(startPort, () => {
                const address = server.address();
                const port = typeof address === 'string' ? parseInt(address.split(':')[1]) : address?.port;
                server.close(() => {
                    if (port) {
                        resolve(port);
                    }
                    else {
                        reject(new Error('Could not determine port'));
                    }
                });
            });
            server.on('error', () => {
                this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
            });
        });
    }
    async initialize() {
        try {
            this.logger.info('Initializing FailSafe Fastify server...');
            // Find available port
            this.port = await this.findAvailablePort(3000);
            this.logger.info(`Found available port: ${this.port}`);
            // Register core plugins
            await this.registerPlugins();
            // Register core routes
            await this.registerRoutes();
            // Start the server
            await this.start();
            this.logger.info(`FailSafe server started on port ${this.port}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize FailSafe server:', error);
            throw error;
        }
    }
    async registerPlugins() {
        try {
            // Get the path to the UI specification
            const specPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'failsafe_ui_specification.md');
            // Register spec gate plugin
            await this.server.register(fastify_spec_gate_1.default, {
                specPath,
                strict: true
            });
            // Register event bus plugin
            await this.server.register(fastify_event_bus_1.default, {
                maxListeners: 100,
                enableSSE: true
            });
            // Register health check plugin
            await this.server.register(fastify_health_1.default, {
                includeDetails: true,
                customChecks: [
                    async () => ({
                        name: 'failsafe-server',
                        status: 'healthy',
                        details: { port: this.port, uptime: process.uptime() }
                    })
                ]
            });
            // Register metrics plugin
            await this.server.register(fastify_metrics_1.default, {
                storagePath: '.failsafe/metrics.json',
                retentionDays: 30
            });
            // Register request logger plugin
            await this.server.register(fastify_request_logger_1.default, {
                maxRequests: 200,
                includeHeaders: false,
                includeBody: false
            });
            // Register Phase 4 - Preventive Innovations plugins
            await this.server.register(fastify_spec_heatmap_1.default, {
                logger: this.logger,
                specPath: path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'failsafe_ui_specification.md')
            });
            await this.server.register(fastify_snapshot_validator_1.default, { logger: this.logger });
            await this.server.register(fastify_auto_stub_1.default, { logger: this.logger });
            // Only register preview plugin if UI is available
            if (this.ui) {
                await this.server.register(fastify_preview_1.default, {
                    ui: this.ui,
                    projectPlan: this.projectPlan,
                    taskEngine: this.taskEngine,
                    logger: this.logger
                });
            }
            // Auto-load additional plugins from plugins directory
            await this.autoLoadPlugins();
            this.logger.info('All Fastify plugins registered successfully');
        }
        catch (error) {
            this.logger.error('Failed to register Fastify plugins:', error);
            throw error;
        }
    }
    async autoLoadPlugins() {
        try {
            const pluginsDir = path.join(__dirname, 'plugins');
            // Try multiple paths for plugins directory
            const possiblePluginDirs = [
                pluginsDir,
                path.join(__dirname, '..', 'src', 'plugins'),
                path.join(process.cwd(), 'src', 'plugins')
            ];
            let actualPluginsDir = null;
            for (const testDir of possiblePluginDirs) {
                if (fs.existsSync(testDir)) {
                    actualPluginsDir = testDir;
                    break;
                }
            }
            if (!actualPluginsDir) {
                this.logger.warn('Plugins directory not found, skipping auto-load');
                return;
            }
            const pluginFiles = fs.readdirSync(actualPluginsDir)
                .filter(file => file.endsWith('.ts') && !file.startsWith('fastify-'))
                .map(file => file.replace('.ts', ''));
            this.logger.info(`Found ${pluginFiles.length} plugins to auto-load`);
            for (const pluginName of pluginFiles) {
                try {
                    const pluginPath = path.join(actualPluginsDir, `${pluginName}.ts`);
                    // Validate plugin file exists and is readable
                    if (!fs.existsSync(pluginPath)) {
                        this.logger.warn(`Plugin file not found: ${pluginPath}`);
                        continue;
                    }
                    const pluginModule = await Promise.resolve(`${pluginPath}`).then(s => __importStar(require(s)));
                    const plugin = pluginModule.default || pluginModule;
                    if (typeof plugin === 'function') {
                        await this.server.register(plugin);
                        this.logger.info(`Auto-loaded plugin: ${pluginName}`);
                    }
                    else {
                        this.logger.warn(`Plugin ${pluginName} is not a function`);
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to auto-load plugin ${pluginName}:`, error);
                    // Continue loading other plugins
                }
            }
        }
        catch (error) {
            this.logger.warn('Failed to auto-load plugins:', error);
            // Don't throw - server can continue without plugins
        }
    }
    async registerRoutes() {
        // Core API routes as specified in the design document
        this.server.get('/status', {
            schema: {
                response: {
                    status200: {
                        type: 'object',
                        properties: {
                            version: { type: 'string' },
                            port: { type: 'number' },
                            activeValidations: { type: 'number' }
                        }
                    }
                }
            }
        }, async () => {
            return {
                version: '2.5.2',
                port: this.port,
                activeValidations: this.activeValidations
            };
        });
        this.server.get('/design-doc', async (request, reply) => {
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspacePath) {
                return reply.status(404).send({ error: 'No workspace found' });
            }
            // First check for o3-accountable.md in the root directory
            const o3AccountablePath = path.join(workspacePath, 'o3-accountable.md');
            const designDocPath = path.join(workspacePath, '.failsafe', 'design-doc.md');
            try {
                let actualPath = null;
                if (fs.existsSync(o3AccountablePath)) {
                    actualPath = o3AccountablePath;
                }
                else if (fs.existsSync(designDocPath)) {
                    actualPath = designDocPath;
                }
                if (actualPath) {
                    const content = fs.readFileSync(actualPath, 'utf-8');
                    return content;
                }
                else {
                    return reply.status(404).send({ error: 'Design document not found' });
                }
            }
            catch (error) {
                return reply.status(500).send({ error: 'Failed to read design document' });
            }
        });
        // Validation endpoint
        this.server.post('/validate', {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        files: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    },
                    required: ['files']
                },
                response: {
                    status200: { $ref: 'validationResult' }
                }
            }
        }, async (request) => {
            const { files } = request.body;
            // Emit validation event
            if (this.server.emitEvent) {
                this.server.emitEvent({
                    type: 'validation',
                    data: { files, timestamp: new Date().toISOString() },
                    severity: 'info'
                });
            }
            // Add log entry
            this.dataStore.addLog({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Validation requested for ${files.length} files`,
                source: 'validation'
            });
            this.logger.info('Files listed successfully');
            return {
                files,
                timestamp: new Date().toISOString()
            };
        });
        // Rules endpoints with full CRUD
        this.server.get('/rules', {
            schema: {
                response: {
                    status200: {
                        type: 'array',
                        items: { $ref: 'rule' }
                    }
                }
            }
        }, async () => {
            return this.dataStore.getRules();
        });
        this.server.post('/rules', {
            schema: {
                body: { $ref: 'rule' },
                response: {
                    status200: { $ref: 'rule' }
                }
            }
        }, async (request) => {
            const rule = request.body;
            const newRule = this.dataStore.addRule(rule);
            // Add log entry
            this.dataStore.addLog({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Rule "${rule.name}" created`,
                source: 'rules'
            });
            this.logger.info('Rule created successfully');
            return newRule;
        });
        this.server.patch('/rules/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    }
                },
                body: {
                    type: 'object',
                    additionalProperties: true
                },
                response: {
                    status200: { $ref: 'rule' },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const updates = request.body;
            const updatedRule = this.dataStore.updateRule(id, updates);
            if (updatedRule) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Rule "${updatedRule.name}" updated`,
                    source: 'rules'
                });
                this.logger.info('Rule updated successfully');
                return updatedRule;
            }
            else {
                return reply.status(404).send({ error: 'Rule not found' });
            }
        });
        this.server.delete('/rules/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    }
                },
                response: {
                    status200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' }
                        }
                    },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const success = this.dataStore.deleteRule(id);
            if (success) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Rule deleted`,
                    source: 'rules'
                });
                this.logger.info('Rule deleted successfully');
                return { success: true };
            }
            else {
                return reply.status(404).send({ error: 'Rule not found' });
            }
        });
        // Sprints endpoints with full CRUD
        this.server.get('/sprints', {
            schema: {
                response: {
                    status200: {
                        type: 'array',
                        items: { $ref: 'sprint' }
                    }
                }
            }
        }, async () => {
            return this.dataStore.getSprints();
        });
        this.server.post('/sprints', {
            schema: {
                body: { $ref: 'sprint' },
                response: {
                    status200: { $ref: 'sprint' }
                }
            }
        }, async (request) => {
            const sprint = request.body;
            const newSprint = this.dataStore.addSprint(sprint);
            // Add log entry
            this.dataStore.addLog({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Sprint "${sprint.name}" created`,
                source: 'sprints'
            });
            this.logger.info('Sprint created successfully');
            return newSprint;
        });
        this.server.patch('/sprints/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: ['id']
                },
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        start: { type: 'string' },
                        end: { type: 'string' },
                        status: { type: 'string' },
                        velocity: { type: 'number' }
                    }
                },
                response: {
                    status200: { $ref: 'sprint' },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const updates = request.body;
            const updatedSprint = this.dataStore.updateSprint(id, updates);
            if (updatedSprint) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Sprint updated: ${updatedSprint.name}`,
                    source: 'sprints'
                });
                return updatedSprint;
            }
            else {
                return reply.status(404).send({ error: 'Sprint not found' });
            }
        });
        this.server.delete('/sprints/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: ['id']
                },
                response: {
                    status200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' }
                        }
                    },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const success = this.dataStore.deleteSprint(id);
            if (success) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Sprint deleted: ${id}`,
                    source: 'sprints'
                });
                return { success: true };
            }
            else {
                return reply.status(404).send({ error: 'Sprint not found' });
            }
        });
        // Tasks endpoints with full CRUD
        this.server.get('/tasks', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        sprintId: { type: 'string' }
                    }
                },
                response: {
                    status200: {
                        type: 'array',
                        items: { $ref: 'task' }
                    }
                }
            }
        }, async (request) => {
            const { sprintId } = request.query;
            if (sprintId) {
                return this.dataStore.getTasksBySprint(sprintId);
            }
            else {
                return this.dataStore.getTasks();
            }
        });
        this.server.post('/tasks', {
            schema: {
                body: { $ref: 'task' },
                response: {
                    status200: { $ref: 'task' }
                }
            }
        }, async (request) => {
            const taskData = request.body;
            const task = {
                id: taskData.id,
                sprintId: taskData.sprintId,
                name: taskData.name,
                status: taskData.status,
                dependsOn: taskData.dependsOn || [],
                completedAt: taskData.completedAt
            };
            const newTask = this.dataStore.addTask(task);
            // Add log entry
            this.dataStore.addLog({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Task "${task.name}" created`,
                source: 'tasks'
            });
            this.logger.info('Task created successfully');
            return newTask;
        });
        this.server.patch('/tasks/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    }
                },
                body: {
                    type: 'object',
                    additionalProperties: true
                },
                response: {
                    status200: { $ref: 'task' },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const updates = request.body;
            const updatedTask = this.dataStore.updateTask(id, updates);
            if (updatedTask) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Task "${updatedTask.name}" updated`,
                    source: 'tasks'
                });
                this.logger.info('Task updated successfully');
                return updatedTask;
            }
            else {
                return reply.status(404).send({ error: 'Task not found' });
            }
        });
        this.server.delete('/tasks/:id', {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: ['id']
                },
                response: {
                    status200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' }
                        }
                    },
                    status404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            const { id } = request.params;
            const success = this.dataStore.deleteTask(id);
            if (success) {
                // Add log entry
                this.dataStore.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Task deleted: ${id}`,
                    source: 'tasks'
                });
                return { success: true };
            }
            else {
                return reply.status(404).send({ error: 'Task not found' });
            }
        });
        // Logs endpoint
        this.server.get('/logs', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        level: { type: 'string' },
                        source: { type: 'string' },
                        limit: { type: 'number', default: 100 }
                    }
                },
                response: {
                    status200: {
                        type: 'array',
                        items: { $ref: 'logEntry' }
                    }
                }
            }
        }, async (request) => {
            const { level, source, limit = 100 } = request.query;
            let logs = this.dataStore.getLogs();
            if (level) {
                logs = logs.filter(log => log.level === level);
            }
            if (source) {
                logs = logs.filter(log => log.source === source);
            }
            // Return most recent logs up to limit
            return logs.slice(-limit);
        });
        // Note: /events route is handled by fastify-event-bus plugin
        // Removed duplicate route registration to prevent conflicts
        this.logger.info('All core routes registered successfully');
    }
    async start() {
        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
        }
        catch (error) {
            this.logger.error('Failed to start server:', error);
            throw error;
        }
    }
    async stop() {
        if (this.isRunning) {
            try {
                await this.server.close();
                this.isRunning = false;
                this.logger.info('FailSafe server stopped');
            }
            catch (error) {
                this.logger.error('Failed to stop server:', error);
            }
        }
    }
    getServer() {
        return this.server;
    }
    getPort() {
        return this.port;
    }
    isServerRunning() {
        return this.isRunning;
    }
    async emitEvent(event) {
        if (this.server.emitEvent) {
            this.server.emitEvent(event);
        }
    }
    getDataStore() {
        return this.dataStore;
    }
    getChartDataService() {
        return this.chartDataService;
    }
    // Method to set UI after construction
    setUI(ui) {
        this.ui = ui;
    }
}
exports.FailSafeServer = FailSafeServer;
//# sourceMappingURL=fastifyServer.js.map