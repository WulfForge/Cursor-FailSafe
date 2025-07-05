#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PreviewManager {
    constructor() {
        this.process = null;
        this.port = 3001;
        this.logFile = path.join(os.tmpdir(), 'failsafe-preview.log');
        this.pidFile = path.join(os.tmpdir(), 'failsafe-preview.pid');
        this.isRunning = false;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level}: ${message}\n`;
        
        // Write to log file
        fs.appendFileSync(this.logFile, logEntry);
        
        // Console output for user feedback
        if (level === 'ERROR') {
            console.error(`❌ ${message}`);
        } else if (level === 'WARN') {
            console.warn(`⚠️  ${message}`);
        } else {
            console.log(`ℹ️  ${message}`);
        }
    }

    getStatus() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                const isAlive = this.isProcessAlive(pid);
                return { running: isAlive, pid: isAlive ? pid : null };
            }
        } catch (error) {
            this.log(`Error checking status: ${error.message}`, 'ERROR');
        }
        return { running: false, pid: null };
    }

    isProcessAlive(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch {
            return false;
        }
    }

    async start(options = {}) {
        try {
            // Check if server is already running
            const isRunning = await this.checkServerHealth();
            if (isRunning) {
                console.log('⚠️  Preview server is already running');
                return;
            }

            console.log('ℹ️  🚀 Starting FailSafe Preview Server...');

            // Create a unique instance ID
            const instanceId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Set environment variables for silent operation
            const env = {
                ...process.env,
                NODE_ENV: 'production',
                FAILSAFE_PREVIEW: 'true',
                FAILSAFE_INSTANCE: instanceId
            };

            // Use a different approach to run truly in background
            const serverProcess = spawn('node', ['scripts/start-preview.js'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: true,
                windowsHide: true,
                env: env
            });

            // Store process info
            const pid = serverProcess.pid;
            const logFile = path.join(os.tmpdir(), 'failsafe-preview.log');
            
            // Write process info to a temporary file for management
            const processInfo = {
                pid: pid,
                instanceId: instanceId,
                logFile: logFile,
                startTime: new Date().toISOString(),
                port: 3001
            };
            
            fs.writeFileSync(path.join(os.tmpdir(), 'failsafe-preview-pid.json'), JSON.stringify(processInfo, null, 2));

            // Redirect output to log file
            const logStream = fs.createWriteStream(logFile, { flags: 'a' });
            serverProcess.stdout.pipe(logStream);
            serverProcess.stderr.pipe(logStream);

            // Wait for server to be ready
            let attempts = 0;
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                try {
                    const isReady = await this.checkServerHealth();
                    if (isReady) {
                        console.log('✅ Preview server started successfully on port 3001');
                        console.log('📱 Preview Access Options:');
                        console.log('🌐 Browser: http://localhost:3001/preview');
                        console.log('🖥️  Webview: http://localhost:3001/preview?webview=true');
                        console.log('🔧 API: http://localhost:3001/api/dashboard/data');
                        console.log(`📋 Logs: ${logFile}`);
                        console.log(`🆔 PID: ${pid}`);
                        
                        // Launch browser if requested
                        if (options.browser) {
                            try {
                                const open = (await import('open')).default;
                                await open('http://localhost:3001/preview');
                                console.log('ℹ️  🌐 Opened preview in browser');
                            } catch (browserError) {
                                console.log('⚠️  Could not open browser automatically');
                                console.log('🌐 Please open: http://localhost:3001/preview');
                            }
                        }
                        
                        return;
                    }
                } catch (error) {
                    // Ignore health check errors during startup
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
            
            throw new Error('Server failed to start within 30 seconds');
            
        } catch (error) {
            console.error('❌ Failed to start preview server:', error.message);
            process.exit(1);
        }
    }

    async checkServerHealth() {
        const http = require('http');
        
        try {
            const res = await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${this.port}/health`, (res) => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    } else {
                        reject(new Error(`Server responded with status ${res.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.setTimeout(1000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
            return res;
        } catch (error) {
            return false;
        }
    }

    showAccessInfo(port, openBrowser, openWebview) {
        const urls = {
            browser: `http://localhost:${port}/preview`,
            webview: `http://localhost:${port}/preview?webview=true`,
            api: `http://localhost:${port}/api/dashboard/data`
        };

        console.log('\n📱 Preview Access Options:');
        console.log(`🌐 Browser: ${urls.browser}`);
        console.log(`🖥️  Webview: ${urls.webview}`);
        console.log(`🔧 API: ${urls.api}`);
        console.log(`📋 Logs: ${this.logFile}`);
        console.log(`🆔 PID: ${this.getStatus().pid}`);

        if (openBrowser) {
            this.openBrowser(urls.browser);
        }

        if (openWebview) {
            this.openWebview(urls.webview);
        }
    }

    openBrowser(url) {
        const platform = os.platform();
        let command;
        
        switch (platform) {
            case 'win32':
                command = `start "${url}"`;
                break;
            case 'darwin':
                command = `open "${url}"`;
                break;
            default:
                command = `xdg-open "${url}"`;
        }

        exec(command, (error) => {
            if (error) {
                this.log(`Failed to open browser: ${error.message}`, 'WARN');
            } else {
                this.log('🌐 Opened preview in browser');
            }
        });
    }

    openWebview(url) {
        // This would integrate with VS Code's webview API
        // For now, we'll just log the webview URL
        this.log(`🖥️  Webview URL: ${url}`);
        this.log('💡 To open in VS Code webview, use the "Open Preview" command');
    }

    async stop() {
        try {
            const pidFile = path.join(os.tmpdir(), 'failsafe-preview-pid.json');
            
            if (!fs.existsSync(pidFile)) {
                console.log('⚠️  Preview server is not running');
                return;
            }
            
            const processInfo = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
            const { pid } = processInfo;
            
            try {
                process.kill(pid, 'SIGTERM');
                console.log(`✅ Stopped preview server (PID: ${pid})`);
            } catch (error) {
                if (error.code === 'ESRCH') {
                    console.log('⚠️  Preview server process not found (may have already stopped)');
                } else {
                    throw error;
                }
            }
            
            // Clean up PID file
            try {
                fs.unlinkSync(pidFile);
            } catch (error) {
                // Ignore if file doesn't exist
            }
            
        } catch (error) {
            console.error('❌ Failed to stop preview server:', error.message);
        }
    }

    async status() {
        try {
            const pidFile = path.join(os.tmpdir(), 'failsafe-preview-pid.json');
            
            if (!fs.existsSync(pidFile)) {
                console.log('📊 Preview Server Status: Not Running');
                return;
            }
            
            const processInfo = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
            const { pid, instanceId, startTime, port, logFile } = processInfo;
            
            // Check if process is actually running
            try {
                process.kill(pid, 0); // Signal 0 just checks if process exists
                const isHealthy = await this.checkServerHealth();
                
                console.log('📊 Preview Server Status: Running');
                console.log(`🆔 Instance: ${instanceId}`);
                console.log(`🆔 PID: ${pid}`);
                console.log(`🚀 Started: ${new Date(startTime).toLocaleString()}`);
                console.log(`🌐 Port: ${port}`);
                console.log(`📋 Logs: ${logFile}`);
                console.log(`💚 Health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
                console.log('\n📱 Access URLs:');
                console.log(`🌐 Browser: http://localhost:${port}/preview`);
                console.log(`🖥️  Webview: http://localhost:${port}/preview?webview=true`);
                console.log(`🔧 API: http://localhost:${port}/api/dashboard/data`);
                
            } catch (error) {
                console.log('📊 Preview Server Status: Process Dead');
                console.log(`🆔 Last PID: ${pid}`);
                console.log(`🚀 Started: ${new Date(startTime).toLocaleString()}`);
                console.log('💡 Run "node scripts/preview-manager.js cleanup" to remove stale PID file');
            }
            
        } catch (error) {
            console.error('❌ Failed to get status:', error.message);
        }
    }

    async logs(lines = 50) {
        try {
            const pidFile = path.join(os.tmpdir(), 'failsafe-preview-pid.json');
            
            if (!fs.existsSync(pidFile)) {
                console.log('⚠️  Preview server is not running');
                return;
            }
            
            const processInfo = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
            const { logFile } = processInfo;
            
            if (!fs.existsSync(logFile)) {
                console.log('⚠️  Log file not found');
                return;
            }
            
            const logContent = fs.readFileSync(logFile, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim());
            const recentLines = logLines.slice(-lines);
            
            console.log(`📋 Last ${recentLines.length} log entries:`);
            console.log('─'.repeat(50));
            recentLines.forEach(line => console.log(line));
            
        } catch (error) {
            console.error('❌ Failed to read logs:', error.message);
        }
    }

    async cleanup() {
        try {
            const pidFile = path.join(os.tmpdir(), 'failsafe-preview-pid.json');
            
            if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile);
                console.log('✅ Cleaned up stale PID file');
            } else {
                console.log('ℹ️  No PID file found to clean up');
            }
            
        } catch (error) {
            console.error('❌ Failed to cleanup:', error.message);
        }
    }

    async restart() {
        console.log('🔄 Restarting preview server...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for cleanup
        await this.start();
    }
}

// Command line interface
async function main() {
    const command = process.argv[2];
    const options = {
        browser: process.argv.includes('--browser'),
        webview: process.argv.includes('--webview')
    };

    const manager = new PreviewManager();

    switch (command) {
        case 'start':
            await manager.start(options);
            break;
        case 'stop':
            await manager.stop();
            break;
        case 'restart':
            await manager.restart();
            break;
        case 'status':
            await manager.status();
            break;
        case 'logs':
            const lines = parseInt(process.argv[3]) || 50;
            await manager.logs(lines);
            break;
        case 'cleanup':
            await manager.cleanup();
            break;
        default:
            showHelp();
            process.exit(1);
    }
}

// CLI Interface
if (require.main === module) {
    main();
}

module.exports = PreviewManager; 