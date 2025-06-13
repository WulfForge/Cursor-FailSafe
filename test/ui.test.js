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
        createStatusBarItem: () => ({
            text: '',
            tooltip: '',
            command: '',
            show: () => {},
            hide: () => {}
        })
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    commands: {
        registerCommand: () => ({ dispose: () => {} })
    }
};

const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });
const { ProjectPlan } = proxyquire('../out/projectPlan', { vscode: mockVscode, '../out/logger': { Logger } });
const { TaskEngine } = proxyquire('../out/taskEngine', { vscode: mockVscode, '../out/logger': { Logger }, '../out/projectPlan': { ProjectPlan } });
const { UI } = proxyquire('../out/ui', { vscode: mockVscode, '../out/logger': { Logger }, '../out/projectPlan': { ProjectPlan }, '../out/taskEngine': { TaskEngine } });

describe('FailSafe UI', () => {
    let ui;
    let taskEngine;
    let projectPlan;
    let logger;

    beforeEach(() => {
        // Clean up any persisted project state
        const failsafeDir = path.join(__dirname, '../test-workspace/.failsafe');
        const projectFile = path.join(failsafeDir, 'project.json');
        if (fs.existsSync(projectFile)) fs.unlinkSync(projectFile);
        if (fs.existsSync(failsafeDir)) fs.rmdirSync(failsafeDir, { recursive: true });

        logger = new Logger();
        projectPlan = new ProjectPlan(logger);
        taskEngine = new TaskEngine(projectPlan, logger);
        ui = new UI(projectPlan, taskEngine, logger);
    });

    describe('UI Initialization', () => {
        it('should initialize UI components', async () => {
            await ui.initialize();
            // Should not throw error
            assert.ok(true);
        });

        it('should set up status bar items', async () => {
            await ui.initialize();
            // Should not throw error
            assert.ok(true);
        });
    });

    describe('Dashboard', () => {
        it('should generate dashboard data', async () => {
            await ui.initialize();
            
            // Access private method for testing
            const dashboardData = ui.getDashboardData();
            
            assert.ok(dashboardData.currentTask !== undefined);
            assert.ok(dashboardData.nextTask !== undefined);
            assert.ok(dashboardData.linearProgress !== undefined);
            assert.ok(dashboardData.accountability !== undefined);
            assert.ok(Array.isArray(dashboardData.recommendations));
            assert.ok(dashboardData.feasibility !== undefined);
            assert.ok(Array.isArray(dashboardData.deviations));
            assert.ok(typeof dashboardData.isOnTrack === 'boolean');
        });

        it('should generate dashboard content', async () => {
            await ui.initialize();
            
            const dashboardData = ui.getDashboardData();
            const content = ui.generateDashboardContent(dashboardData);
            
            assert.ok(typeof content === 'string');
            assert.ok(content.includes('🛡️ FailSafe Dashboard'));
            assert.ok(content.includes('Current Task'));
            assert.ok(content.includes('Next Task'));
            assert.ok(content.includes('Progress Overview'));
        });

        it('should show dashboard', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.showDashboard();
            assert.ok(true);
        });
    });

    describe('Progress Tracking', () => {
        it('should show progress details', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.showProgressDetails();
            assert.ok(true);
        });

        it('should create progress bar', async () => {
            await ui.initialize();
            
            // Test progress bar creation
            const progressBar = ui.createProgressBar(50);
            assert.ok(typeof progressBar === 'string');
            assert.ok(progressBar.includes('█'));
            assert.ok(progressBar.includes('░'));
        });
    });

    describe('Accountability', () => {
        it('should show accountability report', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.showAccountabilityReport();
            assert.ok(true);
        });
    });

    describe('Feasibility Analysis', () => {
        it('should show feasibility analysis', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.showFeasibilityAnalysis();
            assert.ok(true);
        });
    });

    describe('Workflow Actions', () => {
        it('should force linear progression', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.forceLinearProgression();
            assert.ok(true);
        });

        it('should auto-advance to next task', async () => {
            await ui.initialize();
            
            // Should not throw error
            await ui.autoAdvanceToNextTask();
            assert.ok(true);
        });
    });

    describe('Status Bar Updates', () => {
        it('should update main status', async () => {
            await ui.initialize();
            
            const currentTask = projectPlan.getCurrentTask();
            const linearState = projectPlan.getLinearProgressState();
            
            // Should not throw error
            ui.updateMainStatus(currentTask, linearState);
            assert.ok(true);
        });

        it('should update progress bar', async () => {
            await ui.initialize();
            
            const progress = projectPlan.getProjectProgress();
            const linearState = projectPlan.getLinearProgressState();
            
            // Should not throw error
            ui.updateProgressBar(progress, linearState);
            assert.ok(true);
        });

        it('should update accountability item', async () => {
            await ui.initialize();
            
            const accountability = projectPlan.getAccountabilityReport();
            const linearState = projectPlan.getLinearProgressState();
            
            // Should not throw error
            ui.updateAccountabilityItem(accountability, linearState);
            assert.ok(true);
        });
    });

    describe('Status Icons', () => {
        it('should return correct status icons', async () => {
            await ui.initialize();
            
            const TaskStatus = require('../out/types').TaskStatus;
            
            assert.strictEqual(ui.getStatusIcon(TaskStatus.NOT_STARTED), '⏳');
            assert.strictEqual(ui.getStatusIcon(TaskStatus.IN_PROGRESS), '🔄');
            assert.strictEqual(ui.getStatusIcon(TaskStatus.COMPLETED), '✅');
            assert.strictEqual(ui.getStatusIcon(TaskStatus.BLOCKED), '❌');
            assert.strictEqual(ui.getStatusIcon(TaskStatus.DELAYED), '⚠️');
        });
    });

    describe('UI Cleanup', () => {
        it('should dispose UI components', async () => {
            await ui.initialize();
            
            // Should not throw error
            ui.dispose();
            assert.ok(true);
        });
    });
}); 