const assert = require('assert');
const proxyquire = require('proxyquire');
const path = require('path');
const fs = require('fs');

const mockVscode = {
    workspace: {
        workspaceFolders: [{
            uri: {
                fsPath: __dirname + '/../test-workspace'
            }
        }],
        getConfiguration: () => ({ get: () => 'info' }),
        openTextDocument: async (options) => ({ content: options.content }),
        showTextDocument: async () => {}
    },
    window: {
        showWarningMessage: async () => 'Dismiss',
        showErrorMessage: async () => 'OK',
        showInformationMessage: async () => 'OK',
        createWebviewPanel: (viewType, title, column, options) => ({
            webview: {
                html: '',
                onDidReceiveMessage: (callback) => ({
                    dispose: () => {}
                }),
                postMessage: () => {}
            },
            onDidDispose: (callback) => ({
                dispose: () => {}
            }),
            dispose: () => {}
        }),
        createStatusBarItem: () => ({
            text: '',
            tooltip: '',
            command: '',
            show: () => {},
            hide: () => {}
        })
    },
    ViewColumn: {
        One: 1,
        Two: 2
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: async () => {}
    },
    ExtensionContext: class {
        constructor() {
            this.subscriptions = [];
        }
    }
};

const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });
const { SprintPlanner } = proxyquire('../out/sprintPlanner', { vscode: mockVscode, '../out/logger': { Logger } });
const { Commands } = proxyquire('../out/commands', { 
    vscode: mockVscode, 
    '../out/logger': { Logger },
    '../out/sprintPlanner': { SprintPlanner }
});

describe('FailSafe Dashboard UI', () => {
    let commands;
    let logger;
    let context;

    beforeEach(() => {
        // Clean up any persisted project state
        const failsafeDir = path.join(__dirname, '../test-workspace/.failsafe');
        const projectFile = path.join(failsafeDir, 'project.json');
        if (fs.existsSync(projectFile)) fs.unlinkSync(projectFile);
        if (fs.existsSync(failsafeDir)) fs.rmdirSync(failsafeDir, { recursive: true });

        logger = new Logger();
        context = new mockVscode.ExtensionContext();
        commands = new Commands(
            logger,
            __dirname + '/../test-workspace',
            context
        );
    });

    describe('Dashboard Initialization', () => {
        it('should initialize Commands with required dependencies', () => {
            assert.ok(commands, 'Commands should be initialized');
            assert.ok(commands.logger, 'Logger should be available');
            assert.ok(commands.sprintPlanner, 'SprintPlanner should be available');
        });

        it('should register commands successfully', async () => {
            // Should not throw error
            await commands.registerCommands(context);
            assert.ok(true, 'Commands should register without error');
        });
    });

    describe('Dashboard Generation', () => {
        it('should generate dashboard HTML', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            assert.ok(typeof html === 'string', 'Should generate HTML string');
            assert.ok(html.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
            assert.ok(html.includes('<title>FailSafe Dashboard</title>'), 'Should include title');
            assert.ok(html.includes('FailSafe Dashboard'), 'Should include dashboard title');
        });

        it('should include all required dashboard sections', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            const requiredSections = [
                'Current Sprint',
                'Cursor Rules',
                'Quick Actions',
                'Sprint History',
                'Sprint Templates',
                'Project Health'
            ];

            for (const section of requiredSections) {
                assert.ok(html.includes(section), `Dashboard missing section: ${section}`);
            }
        });

        it('should include interactive buttons', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            // Check for interactive elements that actually exist
            assert.ok(html.includes('onclick='), 'Should include onclick handlers');
            assert.ok(html.includes('Create Sprint'), 'Should include Create Sprint button');
            assert.ok(html.includes('Validate Chat'), 'Should include Validate Chat button');
            assert.ok(html.includes('Create Rule'), 'Should include Create Rule button');
        });

        it('should include proper CSS styling', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            // Check for CSS variables and styling
            assert.ok(html.includes('--primary:'), 'Should include CSS variables');
            assert.ok(html.includes('background: var(--background)'), 'Should include background styling');
            assert.ok(html.includes('border-radius: var(--radius)'), 'Should include border radius');
            assert.ok(html.includes('.btn'), 'Should include button styling');
            assert.ok(html.includes('.card'), 'Should include card styling');
        });
    });

    describe('Dashboard Functionality', () => {
        it('should show dashboard without error', async () => {
            // Should not throw error
            await commands.showDashboard();
            assert.ok(true, 'Dashboard should show without error');
        });

        it('should handle dashboard refresh', async () => {
            // Should not throw error
            await commands.showDashboard();
            assert.ok(true, 'Dashboard refresh should work without error');
        });
    });

    describe('Sprint Management', () => {
        it('should create sprint without error', async () => {
            // Should not throw error
            await commands.createSprint();
            assert.ok(true, 'Sprint creation should work without error');
        });

        it('should export sprint data without error', async () => {
            // Should not throw error
            await commands.exportSprintData();
            assert.ok(true, 'Sprint export should work without error');
        });

        it('should show sprint metrics without error', async () => {
            // Should not throw error
            await commands.showSprintMetrics();
            assert.ok(true, 'Sprint metrics should show without error');
        });
    });

    describe('Validation Tools', () => {
        it('should validate chat without error', async () => {
            // Should not throw error
            await commands.validateChat();
            assert.ok(true, 'Chat validation should work without error');
        });

        it('should create cursorrule without error', async () => {
            // Should not throw error
            await commands.createCursorrule();
            assert.ok(true, 'Cursorrule creation should work without error');
        });

        it('should validate plan with AI without error', async () => {
            // Should not throw error
            await commands.validatePlanWithAI();
            assert.ok(true, 'Plan validation should work without error');
        });
    });

    describe('Project Management', () => {
        it('should mark task complete without error', async () => {
            // Should not throw error
            await commands.markTaskComplete();
            assert.ok(true, 'Task completion should work without error');
        });

        it('should view session log without error', async () => {
            // Should not throw error
            await commands.viewSessionLog();
            assert.ok(true, 'Session log should show without error');
        });

        it('should evaluate tech debt without error', async () => {
            // Should not throw error
            await commands.evaluateTechDebt();
            assert.ok(true, 'Tech debt evaluation should work without error');
        });

        it('should show version details without error', async () => {
            // Should not throw error
            await commands.showVersionDetails();
            assert.ok(true, 'Version details should show without error');
        });

        it('should show restore points without error', async () => {
            // Should not throw error
            await commands.showRestorePoints();
            assert.ok(true, 'Restore points should show without error');
        });

        it('should show action log without error', async () => {
            // Should not throw error
            await commands.showActionLog();
            assert.ok(true, 'Action log should show without error');
        });
    });

    describe('Dashboard Regression Protection', () => {
        it('should include all key dashboard sections', () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            const requiredSections = [
                'Current Sprint',
                'Cursor Rules',
                'Quick Actions',
                'Sprint History',
                'Sprint Templates',
                'Project Health'
            ];

            for (const section of requiredSections) {
                assert.ok(html.includes(section), `Dashboard missing critical section: ${section}`);
            }
        });

        it('should maintain responsive design', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            // Check for responsive design elements that actually exist
            assert.ok(html.includes('grid-template-columns: repeat(auto-fit'), 'Should include responsive grid');
            assert.ok(html.includes('minmax(300px, 1fr)'), 'Should include responsive minmax');
            assert.ok(html.includes('minmax(120px, 1fr)'), 'Should include metric grid responsive design');
        });

        it('should maintain accessibility features', async () => {
            const currentSprint = null;
            const sprintHistory = [];
            const templates = [];
            const sprintMetrics = null;

            const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
            
            // Check for accessibility features that actually exist
            assert.ok(html.includes('lang="en"'), 'Should include language attribute');
            assert.ok(html.includes('focus-visible'), 'Should include focus styles');
            assert.ok(html.includes('user-select: none'), 'Should include user interaction styles');
        });
    });
}); 