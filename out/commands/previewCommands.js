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
exports.PreviewCommands = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class PreviewCommands {
    static registerCommands(context) {
        // Start preview for current workspace (auto-tracking)
        const startPreview = vscode.commands.registerCommand('failsafe.startPreview', async () => {
            await this.startPreviewForCurrentWorkspace();
        });
        // Start preview for specific workspace (manual selection)
        const startPreviewForWorkspace = vscode.commands.registerCommand('failsafe.startPreviewForWorkspace', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folders found');
                return;
            }
            if (workspaceFolders.length === 1) {
                await this.startPreviewInstance(workspaceFolders[0].uri.fsPath, false);
                return;
            }
            // Show workspace picker
            const items = workspaceFolders.map(folder => ({
                label: path.basename(folder.uri.fsPath),
                description: folder.uri.fsPath,
                folder
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select workspace to start preview for'
            });
            if (selected) {
                await this.startPreviewInstance(selected.folder.uri.fsPath, false);
            }
        });
        // List active preview instances
        const listPreviewInstances = vscode.commands.registerCommand('failsafe.listPreviewInstances', async () => {
            await this.showActiveInstances();
        });
        // Stop specific preview instance
        const stopPreviewInstance = vscode.commands.registerCommand('failsafe.stopPreviewInstance', async () => {
            await this.stopSpecificInstance();
        });
        // Stop all preview instances
        const stopAllPreviewInstances = vscode.commands.registerCommand('failsafe.stopAllPreviewInstances', async () => {
            await this.stopAllInstances();
        });
        // Open preview in browser
        const openPreviewInBrowser = vscode.commands.registerCommand('failsafe.openPreviewInBrowser', async () => {
            await this.openPreviewInBrowser();
        });
        // Toggle preview auto-tracking
        const togglePreviewAutoTracking = vscode.commands.registerCommand('failsafe.togglePreviewAutoTracking', async () => {
            await this.toggleAutoTracking();
        });
        // Open preview in webview
        const openPreviewInWebview = vscode.commands.registerCommand('failsafe.openPreviewInWebview', async () => {
            await this.openPreviewInWebview();
        });
        // Run start script in webview
        const runStartScriptInWebview = vscode.commands.registerCommand('failsafe.runStartScriptInWebview', async () => {
            await this.runStartScriptInWebview();
        });
        // Setup workspace change tracking
        this.setupWorkspaceTracking(context);
        context.subscriptions.push(startPreview, startPreviewForWorkspace, listPreviewInstances, stopPreviewInstance, stopAllPreviewInstances, openPreviewInBrowser, togglePreviewAutoTracking, openPreviewInWebview, runStartScriptInWebview);
    }
    static setupWorkspaceTracking(context) {
        // Track workspace changes
        this.workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
            console.log('Workspace folders changed:', event);
            // Only auto-track if enabled
            if (!this.autoTrackingEnabled) {
                console.log('Auto-tracking disabled, skipping workspace change');
                return;
            }
            // If we have a current workspace instance, stop it
            if (this.currentWorkspaceInstance && this.activeInstances.has(this.currentWorkspaceInstance)) {
                console.log('Stopping current workspace preview due to workspace change');
                await this.stopInstance(this.currentWorkspaceInstance);
                this.currentWorkspaceInstance = null;
            }
            // Start preview for new workspace if auto-tracking is enabled
            const currentWorkspace = vscode.workspace.workspaceFolders?.[0];
            if (currentWorkspace) {
                console.log('Starting preview for new workspace:', currentWorkspace.uri.fsPath);
                await this.startPreviewForCurrentWorkspace();
            }
        });
        // Initial setup for current workspace
        const currentWorkspace = vscode.workspace.workspaceFolders?.[0];
        if (currentWorkspace) {
            console.log('Initial workspace detected:', currentWorkspace.uri.fsPath);
        }
        context.subscriptions.push(this.workspaceChangeListener);
    }
    static async toggleAutoTracking() {
        this.autoTrackingEnabled = !this.autoTrackingEnabled;
        const status = this.autoTrackingEnabled ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Preview auto-tracking ${status}`);
        if (this.autoTrackingEnabled) {
            // If auto-tracking was re-enabled and we don't have a current instance, start one
            if (!this.currentWorkspaceInstance && vscode.workspace.workspaceFolders?.[0]) {
                await this.startPreviewForCurrentWorkspace();
            }
        }
        else {
            // If auto-tracking was disabled, stop the current workspace instance
            if (this.currentWorkspaceInstance && this.activeInstances.has(this.currentWorkspaceInstance)) {
                await this.stopInstance(this.currentWorkspaceInstance);
                this.currentWorkspaceInstance = null;
            }
        }
    }
    static async startPreviewForCurrentWorkspace() {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        // Stop existing current workspace instance if any
        if (this.currentWorkspaceInstance && this.activeInstances.has(this.currentWorkspaceInstance)) {
            console.log('Stopping existing current workspace preview');
            await this.stopInstance(this.currentWorkspaceInstance);
            this.currentWorkspaceInstance = null;
        }
        // Start new instance for current workspace (always mark as current workspace when manually started)
        await this.startPreviewInstance(workspacePath, true);
    }
    static async startPreviewInstance(workspacePath, isCurrentWorkspace = false) {
        const projectName = path.basename(workspacePath);
        const instanceId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting preview for ${projectName}${isCurrentWorkspace ? ' (auto-tracking)' : ''}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Initializing preview server...' });
                // Start the preview server using the new manager
                const child = (0, child_process_1.spawn)('node', ['scripts/preview-manager.js', 'start', '--browser'], {
                    cwd: workspacePath,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });
                // Store the child process
                const instance = {
                    child,
                    workspacePath,
                    projectName,
                    startTime: new Date(),
                    isCurrentWorkspace
                };
                this.activeInstances.set(instanceId, instance);
                // Track as current workspace instance if needed
                if (isCurrentWorkspace) {
                    this.currentWorkspaceInstance = instanceId;
                }
                // Listen for output to detect when server is ready
                let serverUrl = '';
                let serverPort = '';
                child.stdout?.on('data', (data) => {
                    const output = data.toString();
                    console.log(`Preview [${instanceId}]: ${output}`);
                    // Extract server URL from output
                    const urlMatch = output.match(/Open your browser to: (http:\/\/[^\s]+)/);
                    if (urlMatch && !serverUrl) {
                        serverUrl = urlMatch[1];
                        const portMatch = serverUrl.match(/:(\d+)/);
                        if (portMatch) {
                            serverPort = portMatch[1];
                        }
                    }
                    // Check if server is ready
                    if (output.includes('Preview server started!') && serverUrl) {
                        progress.report({ message: 'Preview server ready!' });
                        const statusText = isCurrentWorkspace ? ' (auto-tracking)' : '';
                        const actions = ['Open in Browser', 'Copy URL', 'View Instances'];
                        // Show success notification with options
                        vscode.window.showInformationMessage(`Preview started for ${projectName} on port ${serverPort}${statusText}`, ...actions).then(selection => {
                            if (selection === 'Open in Browser') {
                                vscode.env.openExternal(vscode.Uri.parse(serverUrl));
                            }
                            else if (selection === 'Copy URL') {
                                vscode.env.clipboard.writeText(serverUrl);
                                vscode.window.showInformationMessage('URL copied to clipboard');
                            }
                            else if (selection === 'View Instances') {
                                this.showActiveInstances();
                            }
                        });
                    }
                });
                child.stderr?.on('data', (data) => {
                    const error = data.toString();
                    console.error(`Preview [${instanceId}] Error: ${error}`);
                    if (error.includes('EADDRINUSE')) {
                        vscode.window.showErrorMessage(`Port already in use for ${projectName}. Try a different port or stop existing instances.`);
                    }
                });
                child.on('close', (code) => {
                    console.log(`Preview [${instanceId}] stopped with code ${code}`);
                    this.activeInstances.delete(instanceId);
                    // Clear current workspace instance if this was it
                    if (this.currentWorkspaceInstance === instanceId) {
                        this.currentWorkspaceInstance = null;
                    }
                });
                child.on('error', (error) => {
                    console.error(`Preview [${instanceId}] error:`, error);
                    vscode.window.showErrorMessage(`Failed to start preview for ${projectName}: ${error.message}`);
                    this.activeInstances.delete(instanceId);
                    // Clear current workspace instance if this was it
                    if (this.currentWorkspaceInstance === instanceId) {
                        this.currentWorkspaceInstance = null;
                    }
                });
                // Wait a bit for the server to start
                await new Promise(resolve => setTimeout(resolve, 3000));
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to start preview for ${projectName}: ${error}`);
        }
    }
    static async showActiveInstances() {
        if (this.activeInstances.size === 0) {
            const status = this.autoTrackingEnabled ? ' (Auto-tracking enabled)' : ' (Auto-tracking disabled)';
            vscode.window.showInformationMessage(`No active preview instances${status}`);
            return;
        }
        const items = Array.from(this.activeInstances.entries()).map(([instanceId, instance]) => ({
            label: `${instance.projectName} (${instanceId.substring(0, 8)}...)${instance.isCurrentWorkspace ? ' [Current]' : ''}`,
            description: `Started: ${instance.startTime.toLocaleTimeString()}${this.autoTrackingEnabled ? ' | Auto-tracking: ON' : ' | Auto-tracking: OFF'}`,
            detail: instance.workspacePath,
            instanceId,
            instance
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select preview instance to manage'
        });
        if (selected) {
            const actions = [
                { label: 'Stop Instance', action: () => this.stopInstance(selected.instanceId) },
                { label: 'Open in Browser', action: () => this.openInstanceInBrowser(selected.instance) },
                { label: 'Copy URL', action: () => this.copyInstanceUrl(selected.instance) }
            ];
            const actionLabels = actions.map(a => a.label);
            const action = await vscode.window.showQuickPick(actionLabels, {
                placeHolder: 'Select action'
            });
            if (action) {
                const selectedAction = actions.find(a => a.label === action);
                if (selectedAction) {
                    await selectedAction.action();
                }
            }
        }
    }
    static async stopSpecificInstance() {
        await this.showActiveInstances();
    }
    static async stopAllInstances() {
        if (this.activeInstances.size === 0) {
            vscode.window.showInformationMessage('No active preview instances to stop');
            return;
        }
        const result = await vscode.window.showWarningMessage(`Stop all ${this.activeInstances.size} preview instances?`, 'Yes', 'No');
        if (result === 'Yes') {
            const promises = Array.from(this.activeInstances.keys()).map(instanceId => this.stopInstance(instanceId));
            await Promise.all(promises);
            vscode.window.showInformationMessage('All preview instances stopped');
        }
    }
    static async stopInstance(instanceId) {
        const instance = this.activeInstances.get(instanceId);
        if (instance) {
            instance.child.kill('SIGINT');
            this.activeInstances.delete(instanceId);
            vscode.window.showInformationMessage(`Preview instance for ${instance.projectName} stopped`);
        }
    }
    static async openPreviewInBrowser() {
        if (this.activeInstances.size === 0) {
            vscode.window.showErrorMessage('No active preview instances');
            return;
        }
        if (this.activeInstances.size === 1) {
            const [instanceId, instance] = Array.from(this.activeInstances.entries())[0];
            await this.openInstanceInBrowser(instance);
            return;
        }
        // Show instance picker
        await this.showActiveInstances();
    }
    static async openInstanceInBrowser(instance) {
        // Try to construct the URL based on common patterns
        const possibleUrls = [
            `http://localhost:3001/preview`,
            `http://localhost:3000/preview`,
            `http://127.0.0.1:3001/preview`,
            `http://127.0.0.1:3000/preview`
        ];
        for (const url of possibleUrls) {
            try {
                await vscode.env.openExternal(vscode.Uri.parse(url));
                return;
            }
            catch (error) {
                // Continue to next URL
            }
        }
        vscode.window.showErrorMessage('Could not determine preview URL. Please check the terminal output.');
    }
    static async openPreviewInWebview() {
        // Check if preview server is running
        if (this.activeInstances.size === 0) {
            const startServer = await vscode.window.showInformationMessage('No preview server is running. Would you like to start one?', 'Start Preview Server');
            if (startServer) {
                await this.startPreviewForCurrentWorkspace();
                // Wait a moment for server to start
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            else {
                return;
            }
        }
        // Create webview panel
        const panel = vscode.window.createWebviewPanel('failsafePreviewWebview', 'FailSafe Preview', vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(__dirname, '..', '..', 'images'))
            ]
        });
        // Get the preview URL (try common ports)
        const possibleUrls = [
            'http://localhost:3001/preview',
            'http://localhost:3000/preview',
            'http://127.0.0.1:3001/preview',
            'http://127.0.0.1:3000/preview'
        ];
        let previewUrl = '';
        for (const url of possibleUrls) {
            try {
                // Simple check if server is responding
                const response = await fetch(url);
                if (response.ok) {
                    previewUrl = url;
                    break;
                }
            }
            catch (error) {
                // Continue to next URL
            }
        }
        if (!previewUrl) {
            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>FailSafe Preview</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                            padding: 20px; 
                            background: var(--vscode-editor-background);
                            color: var(--vscode-editor-foreground);
                        }
                        .error { 
                            color: #f44336; 
                            text-align: center; 
                            margin-top: 50px;
                        }
                        .retry-btn {
                            background: var(--vscode-button-background);
                            color: var(--vscode-button-foreground);
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>⚠️ Preview Server Not Found</h2>
                        <p>Could not connect to the preview server.</p>
                        <p>Please ensure the preview server is running on port 3001 or 3000.</p>
                        <button class="retry-btn" onclick="location.reload()">🔄 Retry</button>
                    </div>
                </body>
                </html>
            `;
            return;
        }
        // Set up the webview content with iframe
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>FailSafe Preview</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: var(--vscode-editor-background);
                        overflow: hidden;
                    }
                    iframe { 
                        width: 100%; 
                        height: 100vh; 
                        border: none; 
                        background: white;
                    }
                    .toolbar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: var(--vscode-toolbar-background);
                        border-bottom: 1px solid var(--vscode-toolbar-border);
                        padding: 8px 16px;
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .toolbar button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    .toolbar button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .url-display {
                        flex: 1;
                        font-family: monospace;
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-left: 10px;
                    }
                    .iframe-container {
                        margin-top: 40px;
                        height: calc(100vh - 40px);
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button onclick="refreshPreview()">🔄 Refresh</button>
                    <button onclick="openInBrowser()">🌐 Open in Browser</button>
                    <button onclick="reloadServer()">🚀 Restart Server</button>
                    <div class="url-display">${previewUrl}</div>
                </div>
                <div class="iframe-container">
                    <iframe src="${previewUrl}" id="previewFrame"></iframe>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function refreshPreview() {
                        document.getElementById('previewFrame').src = document.getElementById('previewFrame').src;
                    }
                    
                    function openInBrowser() {
                        vscode.postMessage({ command: 'openInBrowser', url: '${previewUrl}' });
                    }
                    
                    function reloadServer() {
                        vscode.postMessage({ command: 'reloadServer' });
                    }
                    
                    // Handle messages from VS Code
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'refresh') {
                            refreshPreview();
                        }
                    });
                </script>
            </body>
            </html>
        `;
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openInBrowser':
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                    break;
                case 'reloadServer':
                    this.restartPreviewServer();
                    break;
            }
        }, undefined);
    }
    static async restartPreviewServer() {
        // Stop all instances and restart
        await this.stopAllInstances();
        setTimeout(() => {
            this.startPreviewForCurrentWorkspace();
        }, 1000);
    }
    static async copyInstanceUrl(instance) {
        // Try to construct the URL based on common patterns
        const possibleUrls = [
            `http://localhost:3001/preview`,
            `http://localhost:3000/preview`,
            `http://127.0.0.1:3001/preview`,
            `http://127.0.0.1:3000/preview`
        ];
        for (const url of possibleUrls) {
            try {
                await vscode.env.clipboard.writeText(url);
                vscode.window.showInformationMessage('Preview URL copied to clipboard');
                return;
            }
            catch (error) {
                // Continue to next URL
            }
        }
        vscode.window.showErrorMessage('Could not determine preview URL. Please check the terminal output.');
    }
    static async runStartScriptInWebview() {
        // Create webview panel
        const panel = vscode.window.createWebviewPanel('failsafeStartScript', 'FailSafe Preview Server', vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Set initial content
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>FailSafe Preview Server</title>
                <style>
                    body { 
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        margin: 0;
                        padding: 20px;
                        line-height: 1.4;
                    }
                    .header {
                        background: var(--vscode-toolbar-background);
                        padding: 15px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        border: 1px solid var(--vscode-toolbar-border);
                    }
                    .controls {
                        margin-bottom: 20px;
                    }
                    .btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 10px;
                        font-size: 12px;
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .output {
                        background: var(--vscode-textBlockQuote-background);
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        border-radius: 4px;
                        padding: 15px;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 12px;
                        white-space: pre-wrap;
                        max-height: 400px;
                        overflow-y: auto;
                        margin-bottom: 20px;
                    }
                    .status {
                        padding: 10px;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        font-weight: bold;
                    }
                    .status.running {
                        background: var(--vscode-debugIcon-startForeground);
                        color: white;
                    }
                    .status.stopped {
                        background: var(--vscode-errorForeground);
                        color: white;
                    }
                    .status.ready {
                        background: var(--vscode-debugIcon-continueForeground);
                        color: white;
                    }
                    .url-info {
                        background: var(--vscode-textBlockQuote-background);
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        border-radius: 4px;
                        padding: 10px;
                        margin-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>🚀 FailSafe Preview Server</h2>
                    <p>Run the preview server with automatic port detection</p>
                </div>
                
                <div class="controls">
                    <button class="btn" id="startBtn" onclick="startServer()">▶️ Start Server</button>
                    <button class="btn" id="stopBtn" onclick="stopServer()" disabled>⏹️ Stop Server</button>
                    <button class="btn" onclick="clearOutput()">🗑️ Clear Output</button>
                    <button class="btn" onclick="openInBrowser()" id="openBtn" disabled>🌐 Open in Browser</button>
                </div>
                
                <div class="status" id="status">⏸️ Ready to start</div>
                
                <div class="output" id="output">Click "Start Server" to begin...</div>
                
                <div class="url-info" id="urlInfo" style="display: none;">
                    <strong>Preview URL:</strong> <span id="previewUrl"></span>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let serverRunning = false;
                    let previewUrl = '';
                    
                    function startServer() {
                        document.getElementById('startBtn').disabled = true;
                        document.getElementById('stopBtn').disabled = false;
                        document.getElementById('openBtn').disabled = true;
                        document.getElementById('status').textContent = '🔄 Starting server...';
                        document.getElementById('status').className = 'status running';
                        document.getElementById('output').textContent = '';
                        
                        vscode.postMessage({ command: 'startServer' });
                    }
                    
                    function stopServer() {
                        document.getElementById('startBtn').disabled = false;
                        document.getElementById('stopBtn').disabled = true;
                        document.getElementById('openBtn').disabled = true;
                        document.getElementById('status').textContent = '⏹️ Stopping server...';
                        document.getElementById('status').className = 'status stopped';
                        
                        vscode.postMessage({ command: 'stopServer' });
                    }
                    
                    function clearOutput() {
                        document.getElementById('output').textContent = '';
                    }
                    
                    function openInBrowser() {
                        if (previewUrl) {
                            vscode.postMessage({ command: 'openInBrowser', url: previewUrl });
                        }
                    }
                    
                    // Handle messages from VS Code
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'output':
                                const output = document.getElementById('output');
                                output.textContent += message.data;
                                output.scrollTop = output.scrollHeight;
                                break;
                                
                            case 'serverReady':
                                serverRunning = true;
                                previewUrl = message.url;
                                document.getElementById('status').textContent = '✅ Server ready!';
                                document.getElementById('status').className = 'status ready';
                                document.getElementById('openBtn').disabled = false;
                                document.getElementById('urlInfo').style.display = 'block';
                                document.getElementById('previewUrl').textContent = previewUrl;
                                break;
                                
                            case 'serverStopped':
                                serverRunning = false;
                                previewUrl = '';
                                document.getElementById('status').textContent = '⏸️ Server stopped';
                                document.getElementById('status').className = 'status stopped';
                                document.getElementById('urlInfo').style.display = 'none';
                                break;
                                
                            case 'error':
                                document.getElementById('status').textContent = '❌ Error: ' + message.error;
                                document.getElementById('status').className = 'status stopped';
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
        let childProcess = null;
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'startServer':
                    try {
                        // Start the batch file
                        const { spawn } = require('child_process');
                        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
                        childProcess = spawn('cmd', ['/c', 'start-preview.bat'], {
                            cwd: workspacePath,
                            stdio: ['pipe', 'pipe', 'pipe'],
                            shell: true
                        });
                        // Send output to webview
                        childProcess.stdout?.on('data', (data) => {
                            const output = data.toString();
                            panel.webview.postMessage({ command: 'output', data: output });
                            // Check if server is ready
                            if (output.includes('Preview server started!')) {
                                const urlMatch = output.match(/Open your browser to: (http:\/\/[^\s]+)/);
                                if (urlMatch) {
                                    panel.webview.postMessage({
                                        command: 'serverReady',
                                        url: urlMatch[1]
                                    });
                                }
                            }
                        });
                        childProcess.stderr?.on('data', (data) => {
                            const output = data.toString();
                            panel.webview.postMessage({ command: 'output', data: output });
                        });
                        childProcess.on('close', (code) => {
                            panel.webview.postMessage({ command: 'serverStopped' });
                            childProcess = null;
                        });
                        childProcess.on('error', (error) => {
                            panel.webview.postMessage({ command: 'error', error: error.message });
                            childProcess = null;
                        });
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        panel.webview.postMessage({ command: 'error', error: errorMessage });
                    }
                    break;
                case 'stopServer':
                    if (childProcess) {
                        childProcess.kill();
                        childProcess = null;
                    }
                    break;
                case 'openInBrowser':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
            }
        }, undefined);
        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            if (childProcess) {
                childProcess.kill();
            }
        });
    }
}
exports.PreviewCommands = PreviewCommands;
PreviewCommands.activeInstances = new Map();
PreviewCommands.currentWorkspaceInstance = null;
PreviewCommands.workspaceChangeListener = null;
PreviewCommands.autoTrackingEnabled = true;
//# sourceMappingURL=previewCommands.js.map