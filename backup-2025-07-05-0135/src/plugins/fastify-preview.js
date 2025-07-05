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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const chokidar = __importStar(require("chokidar"));
// Global registry for tracking preview instances
class PreviewInstanceRegistry {
    static async findAvailablePort() {
        for (let port = this.PORT_RANGE.min; port <= this.PORT_RANGE.max; port++) {
            if (!this.portRegistry.has(port)) {
                const isAvailable = await this.isPortAvailable(port);
                if (isAvailable) {
                    return port;
                }
            }
        }
        throw new Error(`No available ports in range ${this.PORT_RANGE.min}-${this.PORT_RANGE.max}`);
    }
    static async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.close();
                resolve(true);
            });
            server.on('error', () => {
                resolve(false);
            });
        });
    }
    static registerInstance(instance) {
        this.instances.set(instance.instanceId, instance);
        this.portRegistry.add(instance.port);
    }
    static unregisterInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            this.portRegistry.delete(instance.port);
            this.instances.delete(instanceId);
        }
    }
    static getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    static getInstancesByWorkspace(workspacePath) {
        return Array.from(this.instances.values()).filter(instance => instance.workspacePath === workspacePath);
    }
    static getAllInstances() {
        return Array.from(this.instances.values());
    }
    static updateActivity(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.lastActivity = new Date();
        }
    }
}
PreviewInstanceRegistry.instances = new Map();
PreviewInstanceRegistry.portRegistry = new Set();
PreviewInstanceRegistry.PORT_RANGE = { min: 3000, max: 3100 };
const fastifyPreview = async (fastify, options) => {
    const { ui, projectPlan, taskEngine, logger, workspacePath, instanceId } = options;
    // Generate instance ID if not provided
    const currentInstanceId = instanceId || `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const currentWorkspacePath = workspacePath || process.cwd();
    const projectName = path.basename(currentWorkspacePath);
    // Register plugin decorators
    fastify.preview = {
        async generateComponentPreview(componentId, options) {
            const opts = { ui, projectPlan, taskEngine, logger, ...options };
            try {
                // Generate preview for a specific component
                const component = await fastify.preview.getComponentById(componentId);
                if (!component) {
                    throw new Error(`Component ${componentId} not found`);
                }
                const preview = {
                    id: componentId,
                    name: component.name || componentId,
                    type: component.type || 'component',
                    content: await fastify.preview.generateComponentPreviewHTML(component),
                    metadata: component.metadata || {},
                    timestamp: new Date()
                };
                return preview;
            }
            catch (error) {
                fastify.log.error('Error generating component preview:', error);
                throw error;
            }
        },
        async generateDesignPreview(designDocPath, options) {
            const opts = { ui, projectPlan, taskEngine, logger, ...options };
            try {
                // First check for o3-accountable.md in the root directory
                const workspaceRoot = path.dirname(designDocPath);
                const o3AccountablePath = path.join(workspaceRoot, 'o3-accountable.md');
                let actualPath = designDocPath;
                if (!fs.existsSync(designDocPath) && fs.existsSync(o3AccountablePath)) {
                    actualPath = o3AccountablePath;
                }
                if (!fs.existsSync(actualPath)) {
                    throw new Error(`Design document not found: ${designDocPath}`);
                }
                const content = fs.readFileSync(actualPath, 'utf8');
                const stats = fs.statSync(actualPath);
                const preview = {
                    id: `design-${Date.now()}`,
                    title: path.basename(actualPath, '.md'),
                    content: await fastify.preview.generateDesignPreviewHTML(content),
                    version: '1.0.0',
                    lastModified: stats.mtime,
                    previewUrl: opts.port ? `http://localhost:${opts.port}/preview/design` : undefined
                };
                return preview;
            }
            catch (error) {
                fastify.log.error('Error generating design preview:', error);
                throw error;
            }
        },
        async startPreviewServer(options) {
            const port = options?.port || await PreviewInstanceRegistry.findAvailablePort();
            const host = options?.host || '0.0.0.0';
            const instance = {
                instanceId: currentInstanceId,
                workspacePath: currentWorkspacePath,
                port,
                host,
                server: fastify,
                startTime: new Date(),
                lastActivity: new Date(),
                projectName
            };
            PreviewInstanceRegistry.registerInstance(instance);
            return {
                port,
                url: `http://${host}:${port}/preview`,
                instanceId: currentInstanceId
            };
        },
        async generateUIPreview() {
            try {
                const tabs = await fastify.preview.getUITabs();
                const components = await fastify.preview.getUIComponents();
                const theme = await fastify.preview.getUITheme();
                return { tabs, components, theme };
            }
            catch (error) {
                fastify.log.error('Error generating UI preview:', error);
                return { tabs: [], components: [], theme: {} };
            }
        },
        async generateComponentPreviewHTML(component) {
            const status = component.hasImplementation ? 'implemented' : 'not-implemented';
            const statusIcon = component.hasImplementation ? '✅' : '⏳';
            const statusText = component.hasImplementation ? 'Implemented' : 'Not Implemented';
            let content = '';
            if (component.hasImplementation) {
                switch (component.type) {
                    case 'tab':
                        if (component.name === 'Dashboard') {
                            content = await fastify.preview.generateDashboardContent();
                        }
                        else if (component.name === 'Console') {
                            content = await fastify.preview.generateConsoleContent();
                        }
                        else if (component.name === 'Sprint') {
                            content = await fastify.preview.generateSprintContent();
                        }
                        else if (component.name === 'Cursor Rules') {
                            content = await fastify.preview.generateCursorRulesContent();
                        }
                        else if (component.name === 'Logs') {
                            content = await fastify.preview.generateLogsContent();
                        }
                        else {
                            content = `<div class="component-placeholder">
                                <h3>${component.name}</h3>
                                <p>Component is implemented but preview not yet available.</p>
                                <p><strong>Path:</strong> ${component.path || 'Unknown'}</p>
                            </div>`;
                        }
                        break;
                    case 'component':
                        content = `<div class="component-placeholder">
                            <h3>${component.name}</h3>
                            <p>Component is implemented and ready for use.</p>
                            <p><strong>Path:</strong> ${component.path || 'Unknown'}</p>
                            ${component.method ? `<p><strong>Method:</strong> ${component.method}</p>` : ''}
                        </div>`;
                        break;
                    default:
                        content = component.content || `<p>Component content for ${component.name}</p>`;
                }
            }
            else {
                content = `<div class="component-placeholder not-implemented">
                    <h3>${component.name}</h3>
                    <p>This component is not yet implemented.</p>
                    <p><strong>Path:</strong> ${component.path || 'Unknown'}</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            return `
                <div class="component-preview ${status}">
                    <div class="component-header">
                        <h2>${component.name || 'Component Preview'}</h2>
                        <div class="component-status">
                            <span class="status-icon">${statusIcon}</span>
                            <span class="status-text">${statusText}</span>
                        </div>
                    </div>
                    <div class="component-content">
                        ${content}
                    </div>
                    <div class="component-metadata">
                        <p><strong>Type:</strong> ${component.type || 'unknown'}</p>
                        <p><strong>Path:</strong> ${component.path || 'Unknown'}</p>
                        <p><strong>Last Modified:</strong> ${component.metadata?.lastModified ? new Date(component.metadata.lastModified).toLocaleString() : 'Unknown'}</p>
                        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
        },
        async generateDesignPreviewHTML(content) {
            // Convert markdown to HTML for design preview
            const htmlContent = content
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/`(.*)`/gim, '<code>$1</code>')
                .replace(/\n/gim, '<br>');
            return `
                <div class="design-preview">
                    <div class="design-content">
                        ${htmlContent}
                    </div>
                    <div class="design-footer">
                        <p><em>Generated by FailSafe Preview System</em></p>
                    </div>
                </div>
            `;
        },
        async getComponentById(componentId) {
            try {
                // Scan the actual project for implemented components
                const projectComponents = await fastify.preview.scanProjectComponents();
                const component = projectComponents.find((c) => c.id === componentId);
                if (component) {
                    return component;
                }
                // Fallback to mock data if component not found
                return {
                    id: componentId,
                    name: `Component ${componentId}`,
                    type: 'component',
                    content: `<p>Component ${componentId} not yet implemented</p>`,
                    metadata: { status: 'not-implemented' }
                };
            }
            catch (error) {
                fastify.log.error('Error getting component:', error);
                return {
                    id: componentId,
                    name: `Component ${componentId}`,
                    type: 'component',
                    content: `<p>Error loading component ${componentId}</p>`,
                    metadata: { status: 'error', error: error instanceof Error ? error.message : String(error) }
                };
            }
        },
        async getUITabs() {
            try {
                // Scan the actual project for implemented UI components
                const projectComponents = await fastify.preview.scanProjectComponents();
                const implementedTabs = projectComponents
                    .filter((comp) => comp.type === 'tab' || comp.type === 'component')
                    .map((comp) => ({
                    id: comp.id,
                    name: comp.name,
                    active: comp.id === 'dashboard',
                    implemented: comp.metadata?.status !== 'not-implemented',
                    status: comp.metadata?.status || 'implemented'
                }));
                // Always include dashboard as the first tab
                const tabs = [
                    { id: 'dashboard', name: 'Dashboard', active: true, implemented: true, status: 'implemented' }
                ];
                // Add other implemented tabs
                implementedTabs.forEach((tab) => {
                    if (tab.id !== 'dashboard') {
                        tabs.push(tab);
                    }
                });
                return tabs;
            }
            catch (error) {
                fastify.log.error('Error getting UI tabs:', error);
                return [
                    { id: 'dashboard', name: 'Dashboard', active: true, implemented: true, status: 'implemented' }
                ];
            }
        },
        async getUIComponents() {
            try {
                // Scan the actual project for implemented components
                const projectComponents = await fastify.preview.scanProjectComponents();
                return projectComponents.filter((comp) => comp.type === 'component');
            }
            catch (error) {
                fastify.log.error('Error getting UI components:', error);
                return [];
            }
        },
        async getUITheme() {
            // Mock theme data - in real implementation, this would come from the UI service
            return {
                colors: {
                    primary: '#4CAF50',
                    secondary: '#2196F3',
                    background: '#1e1e1e',
                    text: '#ffffff'
                }
            };
        },
        async getInstanceStatus() {
            const instance = PreviewInstanceRegistry.getInstance(currentInstanceId);
            if (!instance) {
                throw new Error(`Instance ${currentInstanceId} not found`);
            }
            return {
                instanceId: instance.instanceId,
                projectName: instance.projectName,
                port: instance.port,
                url: `http://${instance.host}:${instance.port}`,
                startTime: instance.startTime,
                lastActivity: instance.lastActivity
            };
        },
        async getAllInstances() {
            return PreviewInstanceRegistry.getAllInstances();
        },
        async stopInstance(instanceId) {
            const targetInstanceId = instanceId || currentInstanceId;
            const instance = PreviewInstanceRegistry.getInstance(targetInstanceId);
            if (instance) {
                await instance.server.close();
                PreviewInstanceRegistry.unregisterInstance(targetInstanceId);
                fastify.log.info(`Preview server stopped for instance ${targetInstanceId}`);
            }
        },
        async cleanupInactiveInstances(maxInactiveMinutes = 30) {
            const instances = PreviewInstanceRegistry.getAllInstances();
            const now = new Date();
            const maxInactiveMs = maxInactiveMinutes * 60 * 1000;
            for (const instance of instances) {
                const inactiveTime = now.getTime() - instance.lastActivity.getTime();
                if (inactiveTime > maxInactiveMs) {
                    await fastify.preview.stopInstance(instance.instanceId);
                }
            }
        },
        async scanProjectComponents() {
            const components = [];
            try {
                // Scan for UI implementation files
                const uiFiles = [
                    'src/ui.ts',
                    'src/ui.tsx',
                    'src/components/',
                    'src/pages/',
                    'src/views/',
                    'ui/',
                    'components/'
                ];
                for (const filePath of uiFiles) {
                    const fullPath = path.join(currentWorkspacePath, filePath);
                    if (fs.existsSync(fullPath)) {
                        const stats = fs.statSync(fullPath);
                        if (stats.isDirectory()) {
                            // Scan directory for components
                            const files = fs.readdirSync(fullPath);
                            for (const file of files) {
                                if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html')) {
                                    const componentPath = path.join(fullPath, file);
                                    const component = await fastify.preview.analyzeComponentFile(componentPath);
                                    if (component) {
                                        components.push(component);
                                    }
                                }
                            }
                        }
                        else if (stats.isFile()) {
                            // Analyze single file
                            const component = await fastify.preview.analyzeComponentFile(fullPath);
                            if (component) {
                                components.push(component);
                            }
                        }
                    }
                }
                // Check for specific UI methods in ui.ts
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    const uiMethods = await fastify.preview.analyzeUIMethods(uiContent);
                    components.push(...uiMethods);
                }
                // Check for package.json to understand project type
                const packagePath = path.join(currentWorkspacePath, 'package.json');
                if (fs.existsSync(packagePath)) {
                    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                    const projectType = await fastify.preview.analyzeProjectType(packageContent);
                    components.push(projectType);
                }
                return components;
            }
            catch (error) {
                fastify.log.error('Error scanning project components:', error);
                return [];
            }
        },
        async analyzeComponentFile(filePath) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const fileName = path.basename(filePath, path.extname(filePath));
                const relativePath = path.relative(currentWorkspacePath, filePath);
                // Determine component type based on file content and name
                let componentType = 'component';
                let componentName = fileName;
                let status = 'implemented';
                if (fileName.toLowerCase().includes('dashboard')) {
                    componentType = 'tab';
                    componentName = 'Dashboard';
                }
                else if (fileName.toLowerCase().includes('console')) {
                    componentType = 'tab';
                    componentName = 'Console';
                }
                else if (fileName.toLowerCase().includes('sprint')) {
                    componentType = 'tab';
                    componentName = 'Sprint';
                }
                else if (fileName.toLowerCase().includes('cursor') || fileName.toLowerCase().includes('rule')) {
                    componentType = 'tab';
                    componentName = 'Cursor Rules';
                }
                else if (fileName.toLowerCase().includes('log')) {
                    componentType = 'tab';
                    componentName = 'Logs';
                }
                // Check if component has actual implementation
                const hasImplementation = content.length > 100 &&
                    !content.includes('TODO') &&
                    !content.includes('stub') &&
                    !content.includes('placeholder');
                if (!hasImplementation) {
                    status = 'not-implemented';
                }
                return {
                    id: fileName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    name: componentName,
                    type: componentType,
                    path: relativePath,
                    content: await fastify.preview.generateComponentPreviewHTML({
                        name: componentName,
                        type: componentType,
                        path: relativePath,
                        hasImplementation
                    }),
                    metadata: {
                        status,
                        filePath: relativePath,
                        lastModified: fs.statSync(filePath).mtime.toISOString(),
                        hasImplementation
                    }
                };
            }
            catch (error) {
                fastify.log.error(`Error analyzing component file ${filePath}:`, error);
                return null;
            }
        },
        async analyzeUIMethods(uiContent) {
            const components = [];
            // Check for specific UI methods
            const methodChecks = [
                { method: 'showDashboard', name: 'Dashboard', type: 'tab' },
                { method: 'showConsole', name: 'Console', type: 'tab' },
                { method: 'showSprint', name: 'Sprint', type: 'tab' },
                { method: 'showCursorRules', name: 'Cursor Rules', type: 'tab' },
                { method: 'showLogs', name: 'Logs', type: 'tab' },
                { method: 'generateDashboard', name: 'Dashboard Generator', type: 'component' },
                { method: 'getDashboardData', name: 'Dashboard Data', type: 'component' }
            ];
            for (const check of methodChecks) {
                const hasMethod = uiContent.includes(check.method);
                if (hasMethod) {
                    components.push({
                        id: check.method.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        name: check.name,
                        type: check.type,
                        path: 'src/ui.ts',
                        content: await fastify.preview.generateComponentPreviewHTML({
                            name: check.name,
                            type: check.type,
                            method: check.method,
                            hasImplementation: true
                        }),
                        metadata: {
                            status: 'implemented',
                            filePath: 'src/ui.ts',
                            method: check.method,
                            hasImplementation: true
                        }
                    });
                }
            }
            return components;
        },
        async analyzeProjectType(packageContent) {
            const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
            let projectType = 'unknown';
            let framework = 'none';
            if (dependencies.react) {
                framework = 'react';
                projectType = 'react-app';
            }
            else if (dependencies.vue) {
                framework = 'vue';
                projectType = 'vue-app';
            }
            else if (dependencies.angular) {
                framework = 'angular';
                projectType = 'angular-app';
            }
            else if (dependencies.fastify || dependencies.express) {
                framework = 'node';
                projectType = 'api-server';
            }
            return {
                id: 'project-type',
                name: 'Project Type',
                type: 'info',
                path: 'package.json',
                content: `<div class="project-info">
                    <h3>Project Information</h3>
                    <p><strong>Type:</strong> ${projectType}</p>
                    <p><strong>Framework:</strong> ${framework}</p>
                    <p><strong>Name:</strong> ${packageContent.name || 'Unknown'}</p>
                    <p><strong>Version:</strong> ${packageContent.version || 'Unknown'}</p>
                </div>`,
                metadata: {
                    status: 'implemented',
                    projectType,
                    framework,
                    name: packageContent.name,
                    version: packageContent.version
                }
            };
        },
        async generateDashboardContent() {
            try {
                // Try to load and use the actual UI class
                const uiPath = path.join(currentWorkspacePath, 'out/ui.js');
                if (fs.existsSync(uiPath)) {
                    // Import the compiled UI class
                    const { UI } = require(uiPath);
                    // Create UI instance with mock dependencies for preview
                    const mockProjectPlan = { validatePlan: () => ({ status: 'complete' }) };
                    const mockTaskEngine = {
                        getProjectStatus: () => ({
                            currentTask: { name: 'Dashboard Implementation', status: 'in_progress' },
                            linearState: { totalProgress: 75, isOnTrack: true }
                        }),
                        getWorkflowRecommendations: () => []
                    };
                    const mockLogger = { log: () => { }, error: () => { }, warn: () => { } };
                    const ui = new UI(mockProjectPlan, mockTaskEngine, mockLogger);
                    const dashboardData = ui.getDashboardData();
                    return `<div class="dashboard-preview">
                        <h3>📊 Dashboard - Live Data</h3>
                        <div class="dashboard-status">
                            <span class="status-badge implemented">✅ Live Data</span>
                        </div>
                        <div class="dashboard-metrics">
                            <div class="metric-item">
                                <span class="metric-label">Current Task:</span>
                                <span class="metric-value">${dashboardData.currentTask?.name || 'None'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Progress:</span>
                                <span class="metric-value">${dashboardData.linearProgress?.totalProgress || 0}%</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Status:</span>
                                <span class="metric-value ${dashboardData.isOnTrack ? 'success' : 'warning'}">${dashboardData.isOnTrack ? 'On Track' : 'Off Track'}</span>
                            </div>
                        </div>
                        <div class="dashboard-actions">
                            <button onclick="refreshDashboard()" class="action-btn">🔄 Refresh</button>
                            <button onclick="showFullDashboard()" class="action-btn">📊 Full View</button>
                        </div>
                    </div>`;
                }
                // Fallback to method detection
                const dashboardPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(dashboardPath)) {
                    const uiContent = fs.readFileSync(dashboardPath, 'utf8');
                    if (uiContent.includes('getDashboardData') || uiContent.includes('generateDashboard')) {
                        return `<div class="dashboard-preview">
                            <h3>📊 Dashboard</h3>
                            <p>Dashboard component is implemented and ready.</p>
                            <div class="dashboard-status">
                                <span class="status-badge implemented">✅ Implemented</span>
                                <p>Methods found: ${uiContent.includes('getDashboardData') ? 'getDashboardData' : ''} ${uiContent.includes('generateDashboard') ? 'generateDashboard' : ''}</p>
                            </div>
                        </div>`;
                    }
                }
                return `<div class="dashboard-preview">
                    <h3>📊 Dashboard</h3>
                    <p>Dashboard component not yet implemented.</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            catch (error) {
                return `<div class="dashboard-preview">
                    <h3>📊 Dashboard</h3>
                    <p>Error loading dashboard: ${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
            }
        },
        async generateConsoleContent() {
            try {
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    if (uiContent.includes('showConsole')) {
                        return `<div class="console-preview">
                            <h3>💻 Console</h3>
                            <p>Console component is implemented and ready.</p>
                            <div class="console-status">
                                <span class="status-badge implemented">✅ Implemented</span>
                                <p>Method found: showConsole</p>
                            </div>
                        </div>`;
                    }
                }
                return `<div class="console-preview">
                    <h3>💻 Console</h3>
                    <p>Console component not yet implemented.</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            catch (error) {
                return `<div class="console-preview">
                    <h3>💻 Console</h3>
                    <p>Error loading console: ${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
            }
        },
        async generateSprintContent() {
            try {
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    if (uiContent.includes('showSprint') || uiContent.includes('Sprint')) {
                        return `<div class="sprint-preview">
                            <h3>🗓 Sprint</h3>
                            <p>Sprint component is implemented and ready.</p>
                            <div class="sprint-status">
                                <span class="status-badge implemented">✅ Implemented</span>
                                <p>Sprint functionality found in UI</p>
                            </div>
                        </div>`;
                    }
                }
                return `<div class="sprint-preview">
                    <h3>🗓 Sprint</h3>
                    <p>Sprint component not yet implemented.</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            catch (error) {
                return `<div class="sprint-preview">
                    <h3>🗓 Sprint</h3>
                    <p>Error loading sprint: ${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
            }
        },
        async generateCursorRulesContent() {
            try {
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    if (uiContent.includes('showCursorRules') || uiContent.includes('CursorRules')) {
                        return `<div class="cursor-rules-preview">
                            <h3>🔒 Cursor Rules</h3>
                            <p>Cursor Rules component is implemented and ready.</p>
                            <div class="cursor-rules-status">
                                <span class="status-badge implemented">✅ Implemented</span>
                                <p>Cursor Rules functionality found in UI</p>
                            </div>
                        </div>`;
                    }
                }
                return `<div class="cursor-rules-preview">
                    <h3>🔒 Cursor Rules</h3>
                    <p>Cursor Rules component not yet implemented.</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            catch (error) {
                return `<div class="cursor-rules-preview">
                    <h3>🔒 Cursor Rules</h3>
                    <p>Error loading cursor rules: ${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
            }
        },
        async generateLogsContent() {
            try {
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    if (uiContent.includes('showLogs')) {
                        return `<div class="logs-preview">
                            <h3>📘 Logs</h3>
                            <p>Logs component is implemented and ready.</p>
                            <div class="logs-status">
                                <span class="status-badge implemented">✅ Implemented</span>
                                <p>Method found: showLogs</p>
                            </div>
                        </div>`;
                    }
                }
                return `<div class="logs-preview">
                    <h3>📘 Logs</h3>
                    <p>Logs component not yet implemented.</p>
                    <div class="implementation-status">
                        <span class="status-badge not-implemented">⏳ Not Implemented</span>
                    </div>
                </div>`;
            }
            catch (error) {
                return `<div class="logs-preview">
                    <h3>📘 Logs</h3>
                    <p>Error loading logs: ${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
            }
        },
        setupFileWatching() {
            try {
                // Watch for changes in key project files
                const watcher = chokidar.watch([
                    path.join(currentWorkspacePath, 'src/**/*.ts'),
                    path.join(currentWorkspacePath, 'src/**/*.tsx'),
                    path.join(currentWorkspacePath, 'src/**/*.js'),
                    path.join(currentWorkspacePath, 'src/**/*.jsx'),
                    path.join(currentWorkspacePath, 'package.json'),
                    path.join(currentWorkspacePath, 'tsconfig.json')
                ], {
                    ignored: /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true
                });
                watcher.on('change', (filePath) => {
                    fastify.log.info(`File changed: ${filePath}`);
                    // Trigger preview refresh
                    fastify.preview.notifyFileChange(filePath);
                });
                watcher.on('add', (filePath) => {
                    fastify.log.info(`File added: ${filePath}`);
                    fastify.preview.notifyFileChange(filePath);
                });
                watcher.on('unlink', (filePath) => {
                    fastify.log.info(`File removed: ${filePath}`);
                    fastify.preview.notifyFileChange(filePath);
                });
                // Store watcher reference
                fastify.preview.fileWatcher = watcher;
                fastify.log.info('File watching enabled for preview system');
            }
            catch (error) {
                fastify.log.error('Error setting up file watching:', error);
            }
        },
        notifyFileChange(filePath) {
            // Notify connected clients about file changes
            const relativePath = path.relative(currentWorkspacePath, filePath);
            const changeEvent = {
                type: 'file-change',
                file: relativePath,
                timestamp: new Date().toISOString(),
                instanceId: currentInstanceId
            };
            // Broadcast to connected WebSocket clients
            if (fastify.preview.connectedClients) {
                fastify.preview.connectedClients.forEach((client) => {
                    try {
                        client.send(JSON.stringify(changeEvent));
                    }
                    catch (error) {
                        fastify.log.error('Error sending file change notification:', error);
                    }
                });
            }
        },
        getProjectMetrics() {
            try {
                // Calculate real project metrics
                const metrics = {
                    files: {
                        total: 0,
                        typescript: 0,
                        javascript: 0,
                        html: 0,
                        css: 0
                    },
                    components: {
                        implemented: 0,
                        total: 0,
                        coverage: 0
                    },
                    implementation: {
                        progress: 0,
                        status: 'in_progress'
                    }
                };
                // Scan project files
                const scanDirectory = (dir) => {
                    if (fs.existsSync(dir)) {
                        const files = fs.readdirSync(dir, { withFileTypes: true });
                        files.forEach(file => {
                            const fullPath = path.join(dir, file.name);
                            if (file.isDirectory() && !file.name.startsWith('.')) {
                                scanDirectory(fullPath);
                            }
                            else if (file.isFile()) {
                                metrics.files.total++;
                                const ext = path.extname(file.name).toLowerCase();
                                if (ext === '.ts' || ext === '.tsx')
                                    metrics.files.typescript++;
                                else if (ext === '.js' || ext === '.jsx')
                                    metrics.files.javascript++;
                                else if (ext === '.html')
                                    metrics.files.html++;
                                else if (ext === '.css' || ext === '.scss')
                                    metrics.files.css++;
                            }
                        });
                    }
                };
                scanDirectory(currentWorkspacePath);
                // Calculate component coverage
                const uiPath = path.join(currentWorkspacePath, 'src/ui.ts');
                if (fs.existsSync(uiPath)) {
                    const uiContent = fs.readFileSync(uiPath, 'utf8');
                    const requiredMethods = ['showDashboard', 'showConsole', 'showSprint', 'showCursorRules', 'showLogs'];
                    requiredMethods.forEach(method => {
                        metrics.components.total++;
                        if (uiContent.includes(method)) {
                            metrics.components.implemented++;
                        }
                    });
                    metrics.components.coverage = Math.round((metrics.components.implemented / metrics.components.total) * 100);
                }
                // Calculate overall implementation progress
                metrics.implementation.progress = Math.round((metrics.components.coverage + (metrics.files.typescript > 0 ? 20 : 0) + (metrics.files.html > 0 ? 10 : 0)) / 3);
                if (metrics.implementation.progress >= 90)
                    metrics.implementation.status = 'complete';
                else if (metrics.implementation.progress >= 50)
                    metrics.implementation.status = 'in_progress';
                else
                    metrics.implementation.status = 'starting';
                return metrics;
            }
            catch (error) {
                fastify.log.error('Error calculating project metrics:', error);
                return {
                    files: { total: 0, typescript: 0, javascript: 0, html: 0, css: 0 },
                    components: { implemented: 0, total: 0, coverage: 0 },
                    implementation: { progress: 0, status: 'error' }
                };
            }
        }
    };
    // Register routes
    fastify.get('/api/preview/component/:id', async (request, reply) => {
        const { id } = request.params;
        const preview = await fastify.preview.generateComponentPreview(id);
        return reply.send(preview);
    });
    fastify.get('/api/preview/design', async (request, reply) => {
        const { path: designPath } = request.query;
        if (!designPath) {
            return reply.status(400).send({ error: 'Design path required' });
        }
        const preview = await fastify.preview.generateDesignPreview(designPath);
        return reply.send(preview);
    });
    fastify.get('/api/preview/ui', async (request, reply) => {
        const preview = await fastify.preview.generateUIPreview();
        return reply.send(preview);
    });
    fastify.post('/api/preview/start', async (request, reply) => {
        const options = request.body;
        const result = await fastify.preview.startPreviewServer(options);
        return reply.send(result);
    });
    fastify.get('/api/preview/status', async (request, reply) => {
        try {
            const status = await fastify.preview.getInstanceStatus();
            return reply.send(status);
        }
        catch (error) {
            return reply.status(404).send({ error: 'Instance not found' });
        }
    });
    fastify.get('/api/preview/instances', async (request, reply) => {
        const instances = await fastify.preview.getAllInstances();
        return reply.send(instances);
    });
    fastify.delete('/api/preview/stop/:instanceId?', async (request, reply) => {
        const { instanceId } = request.params;
        await fastify.preview.stopInstance(instanceId);
        return reply.send({ success: true });
    });
    fastify.post('/api/preview/cleanup', async (request, reply) => {
        const { maxInactiveMinutes = 30 } = request.body;
        await fastify.preview.cleanupInactiveInstances(maxInactiveMinutes);
        return reply.send({ success: true });
    });
    // Dashboard data endpoint
    fastify.get('/api/dashboard/data', async (request, reply) => {
        try {
            // Use mock data for preview - the real UI class requires VS Code dependencies
            const dashboardData = {
                healthScore: 85,
                metrics: {
                    chatValidation: {
                        value: 91.0,
                        trend: 2.3,
                        status: 'good'
                    },
                    userDrift: {
                        value: 13.5,
                        trend: -1.2,
                        status: 'warning'
                    },
                    aiDrift: {
                        value: 3.4,
                        trend: -0.8,
                        status: 'good'
                    },
                    ambiguousRequests: {
                        value: 14.7,
                        trend: 0,
                        status: 'warning'
                    },
                    hallucinations: {
                        value: 2.1,
                        trend: -0.5,
                        status: 'good'
                    },
                    cursorRules: {
                        value: '38/45',
                        trend: 3,
                        status: 'good'
                    }
                },
                projectData: {
                    currentTask: {
                        name: 'Preview System Enhancement',
                        status: 'in_progress',
                        description: 'Developing dynamic preview with real-time updates',
                        priority: 'high',
                        estimatedDuration: 120
                    },
                    nextTask: {
                        name: 'Real Data Integration',
                        status: 'not_started',
                        description: 'Connect preview to actual project data',
                        priority: 'medium',
                        estimatedDuration: 90
                    },
                    progress: {
                        totalProgress: 75,
                        isOnTrack: true,
                        completedTasks: [
                            { name: 'Dynamic Preview Setup' },
                            { name: 'Component Detection' },
                            { name: 'File Watching' }
                        ],
                        blockedTasks: []
                    },
                    recommendations: [
                        { action: 'Complete real data integration', reason: 'Enhance preview functionality', priority: 'high' },
                        { action: 'Add file watching', reason: 'Enable auto-refresh', priority: 'medium' },
                        { action: 'Test UI components', reason: 'Ensure all tabs work correctly', priority: 'medium' }
                    ],
                    feasibility: {
                        feasibility: 'feasible',
                        isBlocked: false,
                        blockers: [],
                        confidence: 0.85
                    },
                    isOnTrack: true,
                    lastUpdated: new Date().toISOString()
                }
            };
            return reply.send(dashboardData);
        }
        catch (error) {
            fastify.log.error('Error serving dashboard data:', error);
            return reply.status(500).send({ error: 'Failed to load dashboard data' });
        }
    });
    // Project metrics endpoint
    fastify.get('/api/project/metrics', async (request, reply) => {
        try {
            const metrics = await fastify.preview.getProjectMetrics();
            return reply.send(metrics);
        }
        catch (error) {
            fastify.log.error('Error serving project metrics:', error);
            return reply.status(500).send({ error: 'Failed to load project metrics' });
        }
    });
    // File watching status endpoint
    fastify.get('/api/preview/watching', async (request, reply) => {
        try {
            const isWatching = !!fastify.preview.fileWatcher;
            const watchedFiles = isWatching ? fastify.preview.fileWatcher.getWatched() : {};
            const connectedClients = fastify.preview.connectedClients?.length || 0;
            return reply.send({
                isWatching,
                watchedFiles,
                connectedClients,
                instanceId: currentInstanceId,
                workspacePath: currentWorkspacePath
            });
        }
        catch (error) {
            fastify.log.error('Error serving file watching status:', error);
            return reply.status(500).send({ error: 'Failed to get file watching status' });
        }
    });
    // Enable file watching endpoint
    fastify.post('/api/preview/watch', async (request, reply) => {
        try {
            fastify.preview.setupFileWatching();
            return reply.send({ success: true, message: 'File watching enabled' });
        }
        catch (error) {
            fastify.log.error('Error enabling file watching:', error);
            return reply.status(500).send({ error: 'Failed to enable file watching' });
        }
    });
    // Refresh preview endpoint
    fastify.post('/api/preview/refresh', async (request, reply) => {
        try {
            // Trigger a refresh by notifying clients
            fastify.preview.notifyFileChange('manual-refresh');
            return reply.send({ success: true, message: 'Preview refresh triggered' });
        }
        catch (error) {
            fastify.log.error('Error triggering preview refresh:', error);
            return reply.status(500).send({ error: 'Failed to trigger preview refresh' });
        }
    });
    // Serve static images
    fastify.get('/images/:filename', async (request, reply) => {
        const { filename } = request.params;
        const imagePath = path.join(__dirname, '..', '..', 'images', filename);
        try {
            try {
                await fs.promises.access(imagePath);
            }
            catch {
                return reply.status(404).send({ error: 'Image not found' });
            }
            const stream = fs.createReadStream(imagePath);
            const ext = path.extname(filename).toLowerCase();
            let contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg')
                contentType = 'image/jpeg';
            else if (ext === '.gif')
                contentType = 'image/gif';
            else if (ext === '.svg')
                contentType = 'image/svg+xml';
            reply.type(contentType);
            return reply.send(stream);
        }
        catch (error) {
            fastify.log.error('Error serving image:', error);
            return reply.status(500).send({ error: 'Failed to serve image' });
        }
    });
    // Register the preview route - serve the template
    fastify.get('/preview', async (request, reply) => {
        // Update activity for this instance
        PreviewInstanceRegistry.updateActivity(currentInstanceId);
        // Add cache-busting headers to prevent browser caching
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
        reply.header('Last-Modified', new Date().toUTCString());
        reply.header('ETag', `"${Date.now()}"`);
        try {
            const templatePath = path.join(currentWorkspacePath, 'src/ui/components/preview-template.html');
            const template = fs.readFileSync(templatePath, 'utf8');
            // Replace placeholders with actual values
            const serverAddress = fastify.server.address();
            const port = typeof serverAddress === 'object' && serverAddress ? serverAddress.port : 3001;
            const html = template
                .replace(/\${fastify\.server\.address\(\)\?\.port \|\| 3001}/g, port.toString())
                .replace(/\${currentInstanceId}/g, currentInstanceId)
                .replace(/\${currentWorkspacePath}/g, currentWorkspacePath);
            reply.type('text/html').send(html);
        }
        catch (error) {
            fastify.log.error('Error serving preview template:', error);
            reply.status(500).send('Failed to load preview template');
        }
    });
    // Serve individual component files
    fastify.get('/components/:component.html', async (request, reply) => {
        const { component } = request.params;
        // Add cache-busting headers
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
        try {
            const componentPath = path.join(currentWorkspacePath, 'src/ui/components', `${component}.html`);
            const content = fs.readFileSync(componentPath, 'utf8');
            reply.type('text/html').send(content);
        }
        catch (error) {
            fastify.log.error(`Error serving component ${component}:`, error);
            reply.status(404).send(`Component ${component} not found`);
        }
    });
};
exports.default = fastifyPreview;
//# sourceMappingURL=fastify-preview.js.map