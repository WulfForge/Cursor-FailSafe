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
        getConfiguration: () => ({ get: () => 'info' })
    }
};

const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });
const { ProjectPlan } = proxyquire('../out/projectPlan', { vscode: mockVscode, '../out/logger': { Logger } });

describe('FailSafe Project Plan', () => {
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
    });

    describe('Linear Progression', () => {
        it('should enforce linear progression - only one task active at a time', async () => {
            // The setup task is already in progress by default
            assert.strictEqual(projectPlan.getCurrentTask()?.id, 'setup');

            // Try to start another task - should fail
            try {
                await projectPlan.startTask('core-features');
                assert.fail('Should not allow starting multiple tasks');
            } catch (error) {
                assert.ok(error.message.includes('Cannot start task'));
            }
        });

        it('should validate task start feasibility', () => {
            // setup is already in progress, so it can't be started again
            const canStart = projectPlan.canStartTask('setup');
            assert.strictEqual(canStart.canStart, false);
            assert.ok(canStart.reason.includes('not ready to start'));

            // core-features can't start because setup is in progress (linear progression)
            const cannotStart = projectPlan.canStartTask('core-features');
            assert.strictEqual(cannotStart.canStart, false);
            assert.ok(cannotStart.reason.includes('in progress'));
        });
    });

    describe('Feasibility Analysis', () => {
        it('should detect infeasible requests', () => {
            const analysis = projectPlan.analyzeFeasibility('create API key for production database');
            assert.strictEqual(analysis.feasibility, 'infeasible');
            assert.ok(analysis.blockers.length > 0);
            assert.ok(analysis.recommendations.length > 0);
        });

        it('should detect questionable requests', () => {
            const analysis = projectPlan.analyzeFeasibility('generate mock data for testing');
            assert.strictEqual(analysis.feasibility, 'questionable');
            assert.ok(analysis.blockers.length > 0);
        });

        it('should identify feasible requests', () => {
            const analysis = projectPlan.analyzeFeasibility('add a simple function to calculate sum');
            // This should be feasible since we have an active task
            assert.strictEqual(analysis.feasibility, 'feasible');
        });
    });

    describe('Linear Progress State', () => {
        it('should provide comprehensive progress state', () => {
            const state = projectPlan.getLinearProgressState();
            
            assert.ok(state.currentTask !== undefined);
            assert.ok(state.nextTask !== undefined);
            assert.ok(Array.isArray(state.blockedTasks));
            assert.ok(Array.isArray(state.completedTasks));
            assert.ok(typeof state.totalProgress === 'number');
            assert.ok(state.lastActivity instanceof Date);
            assert.ok(typeof state.isOnTrack === 'boolean');
            assert.ok(Array.isArray(state.deviations));
        });

        it('should track project deviations', async () => {
            // setup task is already in progress, so we can check deviations
            const state = projectPlan.getLinearProgressState();
            assert.ok(Array.isArray(state.deviations));
        });
    });

    describe('Accountability Tracking', () => {
        it('should record activity', () => {
            projectPlan.recordActivity('Test activity', 'setup');
            
            const report = projectPlan.getAccountabilityReport();
            assert.ok(report.lastActivity instanceof Date);
            assert.ok(typeof report.timeSinceLastActivity === 'number');
            assert.ok(Array.isArray(report.recommendations));
        });

        it('should provide accountability report', () => {
            const report = projectPlan.getAccountabilityReport();
            
            assert.ok(report.lastActivity instanceof Date);
            assert.ok(typeof report.timeSinceLastActivity === 'number');
            assert.ok(report.currentTaskDuration === null || typeof report.currentTaskDuration === 'number');
            assert.ok(Array.isArray(report.overdueTasks));
            assert.ok(Array.isArray(report.recommendations));
        });
    });

    describe('Task Management', () => {
        it('should get ready tasks', () => {
            const readyTasks = projectPlan.getReadyTasks();
            assert.ok(Array.isArray(readyTasks));
            // No tasks should be ready because setup is in progress but not completed
            assert.strictEqual(readyTasks.length, 0);
        });

        it('should block and unblock tasks', async () => {
            await projectPlan.blockTask('setup', 'Test blocker');
            const task = projectPlan.getAllTasks().find(t => t.id === 'setup');
            assert.strictEqual(task?.status, 'blocked');
            assert.ok(task?.blockers.includes('Test blocker'));

            await projectPlan.unblockTask('setup');
            const unblockedTask = projectPlan.getAllTasks().find(t => t.id === 'setup');
            assert.strictEqual(unblockedTask?.status, 'not_started');
            assert.strictEqual(unblockedTask?.blockers.length, 0);
        });
    });
}); 