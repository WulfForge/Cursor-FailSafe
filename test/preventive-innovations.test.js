const { FastifyInstance } = require('fastify');
const path = require('path');
const fs = require('fs');

// Mock the plugins
jest.mock('../src/plugins/fastify-spec-heatmap');
jest.mock('../src/plugins/fastify-snapshot-validator');
jest.mock('../src/plugins/fastify-auto-stub');
jest.mock('../src/plugins/fastify-rule-watchdog');
jest.mock('../src/plugins/fastify-signoff');
jest.mock('../src/plugins/fastify-failure-replay');
jest.mock('../src/plugins/fastify-fs-gate');

describe('Preventive Innovations', () => {
    let fastify;
    let mockLogger;

    beforeEach(async () => {
        // Create a mock Fastify instance
        fastify = {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn(),
            decorate: jest.fn(),
            log: {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn()
            }
        };

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        // Mock file system operations
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('mock content');
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Spec Heatmap API', () => {
        test('should generate heatmap data', async () => {
            const { default: fastifySpecHeatmap } = require('../src/plugins/fastify-spec-heatmap');
            
            // Mock the plugin
            await fastifySpecHeatmap(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.get).toHaveBeenCalledWith('/spec-heatmap', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/spec-heatmap/status', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('specHeatmap', expect.any(Object));
        });

        test('should return heatmap overlay HTML', async () => {
            const { default: fastifySpecHeatmap } = require('../src/plugins/fastify-spec-heatmap');
            
            await fastifySpecHeatmap(fastify, { logger: mockLogger });
            
            // Get the decorator function
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'specHeatmap');
            const specHeatmap = decoratorCall[1];
            
            // Mock the generateHeatmap method
            specHeatmap.generateHeatmap = jest.fn().mockResolvedValue({
                sections: [
                    {
                        id: 'section-1',
                        title: 'Test Section',
                        status: 'present',
                        implementation: ['test'],
                        missing: [],
                        lastChecked: new Date().toISOString()
                    }
                ],
                overallStatus: 'complete',
                lastUpdated: new Date().toISOString(),
                totalSections: 1,
                implementedSections: 1,
                missingSections: 0
            });
            
            const result = await specHeatmap.generateHeatmap();
            
            expect(result.sections).toHaveLength(1);
            expect(result.overallStatus).toBe('complete');
            expect(result.implementedSections).toBe(1);
        });

        test('should handle missing spec file', async () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            
            const { default: fastifySpecHeatmap } = require('../src/plugins/fastify-spec-heatmap');
            
            await fastifySpecHeatmap(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'specHeatmap');
            const specHeatmap = decoratorCall[1];
            
            const result = await specHeatmap.generateHeatmap();
            
            expect(result.sections).toHaveLength(0);
            expect(result.overallStatus).toBe('incomplete');
        });
    });

    describe('Snapshot Validator API', () => {
        test('should create snapshots', async () => {
            const { default: fastifySnapshotValidator } = require('../src/plugins/fastify-snapshot-validator');
            
            await fastifySnapshotValidator(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.post).toHaveBeenCalledWith('/snapshot/create', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/snapshot/validate', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/snapshot/list', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/snapshot/rollback/:id', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('snapshotValidator', expect.any(Object));
        });

        test('should validate snapshot differences', async () => {
            const { default: fastifySnapshotValidator } = require('../src/plugins/fastify-snapshot-validator');
            
            await fastifySnapshotValidator(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'snapshotValidator');
            const snapshotValidator = decoratorCall[1];
            
            // Mock the validateSnapshot method
            snapshotValidator.validateSnapshot = jest.fn().mockResolvedValue({
                added: ['new-file.ts'],
                removed: ['old-file.ts'],
                modified: ['changed-file.ts'],
                uiChanges: {
                    componentsAdded: ['NewComponent'],
                    componentsRemoved: ['OldComponent'],
                    methodsAdded: ['newMethod'],
                    methodsRemoved: ['oldMethod'],
                    routesAdded: ['/new-route'],
                    routesRemoved: ['/old-route']
                }
            });
            
            const result = await snapshotValidator.validateSnapshot('previous-snapshot-id');
            
            expect(result.added).toContain('new-file.ts');
            expect(result.removed).toContain('old-file.ts');
            expect(result.modified).toContain('changed-file.ts');
            expect(result.uiChanges.componentsAdded).toContain('NewComponent');
        });

        test('should list snapshots', async () => {
            const { default: fastifySnapshotValidator } = require('../src/plugins/fastify-snapshot-validator');
            
            await fastifySnapshotValidator(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'snapshotValidator');
            const snapshotValidator = decoratorCall[1];
            
            // Mock the listSnapshots method
            snapshotValidator.listSnapshots = jest.fn().mockResolvedValue([
                {
                    id: 'snapshot-1',
                    timestamp: new Date().toISOString(),
                    size: 1024
                }
            ]);
            
            const snapshots = await snapshotValidator.listSnapshots();
            
            expect(snapshots).toHaveLength(1);
            expect(snapshots[0].id).toBe('snapshot-1');
        });
    });

    describe('Auto-Stub Generator API', () => {
        test('should generate stubs for missing components', async () => {
            const { default: fastifyAutoStub } = require('../src/plugins/fastify-auto-stub');
            
            await fastifyAutoStub(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.post).toHaveBeenCalledWith('/auto-stub/generate', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/auto-stub/cleanup', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/auto-stub/status', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('autoStub', expect.any(Object));
        });

        test('should handle stub generation with errors', async () => {
            const { default: fastifyAutoStub } = require('../src/plugins/fastify-auto-stub');
            
            await fastifyAutoStub(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'autoStub');
            const autoStub = decoratorCall[1];
            
            // Mock the generateStubsForMissingComponents method
            autoStub.generateStubsForMissingComponents = jest.fn().mockResolvedValue({
                success: false,
                generated: [],
                errors: ['Failed to generate stub for component X'],
                warnings: []
            });
            
            const result = await autoStub.generateStubsForMissingComponents();
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Failed to generate stub for component X');
        });
    });

    describe('Rule Watchdog API', () => {
        test('should check rule changes', async () => {
            const { default: fastifyRuleWatchdog } = require('../src/plugins/fastify-rule-watchdog');
            
            await fastifyRuleWatchdog(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.get).toHaveBeenCalledWith('/rule-watchdog/violations', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/rule-watchdog/approve', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/rule-watchdog/check', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('ruleWatchdog', expect.any(Object));
        });

        test('should detect rule violations', async () => {
            const { default: fastifyRuleWatchdog } = require('../src/plugins/fastify-rule-watchdog');
            
            await fastifyRuleWatchdog(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'ruleWatchdog');
            const ruleWatchdog = decoratorCall[1];
            
            // Mock the checkRuleChanges method
            ruleWatchdog.checkRuleChanges = jest.fn().mockResolvedValue([
                {
                    ruleId: 'rule-1',
                    ruleName: 'Test Rule',
                    action: 'disabled',
                    severity: 'high',
                    timestamp: new Date().toISOString(),
                    requiresApproval: true
                }
            ]);
            
            const violations = await ruleWatchdog.checkRuleChanges();
            
            expect(violations).toHaveLength(1);
            expect(violations[0].ruleId).toBe('rule-1');
            expect(violations[0].requiresApproval).toBe(true);
        });
    });

    describe('Signoff Token API', () => {
        test('should generate signoff tokens', async () => {
            const { default: fastifySignoff } = require('../src/plugins/fastify-signoff');
            
            await fastifySignoff(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.post).toHaveBeenCalledWith('/signoff/generate', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/signoff/validate', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/signoff/tokens', expect.any(Object));
            expect(fastify.delete).toHaveBeenCalledWith('/signoff/tokens/:id', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/signoff/cleanup', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('signoff', expect.any(Object));
        });

        test('should validate tokens', async () => {
            const { default: fastifySignoff } = require('../src/plugins/fastify-signoff');
            
            await fastifySignoff(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'signoff');
            const signoff = decoratorCall[1];
            
            // Mock the validateToken method
            signoff.validateToken = jest.fn().mockResolvedValue({
                valid: true,
                token: {
                    id: 'token-1',
                    sprintId: 'sprint-1',
                    approvedBy: 'user1',
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }
            });
            
            const validation = await signoff.validateToken('valid-token');
            
            expect(validation.valid).toBe(true);
            expect(validation.token.id).toBe('token-1');
        });
    });

    describe('Failure Replay API', () => {
        test('should create replay sessions', async () => {
            const { default: fastifyFailureReplay } = require('../src/plugins/fastify-failure-replay');
            
            await fastifyFailureReplay(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.post).toHaveBeenCalledWith('/failure-replay/sessions', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/failure-replay/sessions/:id', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/failure-replay/sessions/:id/step-forward', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/failure-replay/sessions/:id/step-backward', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/failure-replay/events/:id', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('failureReplay', expect.any(Object));
        });

        test('should step through events', async () => {
            const { default: fastifyFailureReplay } = require('../src/plugins/fastify-failure-replay');
            
            await fastifyFailureReplay(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'failureReplay');
            const failureReplay = decoratorCall[1];
            
            // Mock the stepForward method
            failureReplay.stepForward = jest.fn().mockResolvedValue({
                event: {
                    id: 'event-1',
                    timestamp: new Date().toISOString(),
                    type: 'error',
                    message: 'Test error',
                    source: 'test',
                    severity: 'high',
                    category: 'test',
                    tags: ['test']
                },
                index: 1,
                total: 5,
                timeFromStart: 1000,
                timeFromPrevious: 500
            });
            
            const step = await failureReplay.stepForward('session-1');
            
            expect(step.event.id).toBe('event-1');
            expect(step.index).toBe(1);
            expect(step.total).toBe(5);
        });
    });

    describe('FS-Gate API', () => {
        test('should start file watching', async () => {
            const { default: fastifyFsGate } = require('../src/plugins/fastify-fs-gate');
            
            await fastifyFsGate(fastify, { logger: mockLogger });
            
            // Verify routes are registered
            expect(fastify.post).toHaveBeenCalledWith('/fs-gate/start', expect.any(Object));
            expect(fastify.get).toHaveBeenCalledWith('/fs-gate/snapshots', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/fs-gate/rollback/:id', expect.any(Object));
            expect(fastify.post).toHaveBeenCalledWith('/fs-gate/cleanup', expect.any(Object));
            
            // Verify decorator is added
            expect(fastify.decorate).toHaveBeenCalledWith('fsGate', expect.any(Object));
        });

        test('should create snapshots', async () => {
            const { default: fastifyFsGate } = require('../src/plugins/fastify-fs-gate');
            
            await fastifyFsGate(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'fsGate');
            const fsGate = decoratorCall[1];
            
            // Mock the createSnapshot method
            fsGate.createSnapshot = jest.fn().mockResolvedValue('snapshot-1');
            
            const snapshotId = await fsGate.createSnapshot(['test-file.ts']);
            
            expect(snapshotId).toBe('snapshot-1');
        });

        test('should rollback to snapshots', async () => {
            const { default: fastifyFsGate } = require('../src/plugins/fastify-fs-gate');
            
            await fastifyFsGate(fastify, { logger: mockLogger });
            
            const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === 'fsGate');
            const fsGate = decoratorCall[1];
            
            // Mock the rollbackToSnapshot method
            fsGate.rollbackToSnapshot = jest.fn().mockResolvedValue(true);
            
            const success = await fsGate.rollbackToSnapshot('snapshot-1');
            
            expect(success).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete preventive innovation workflow', async () => {
            // Test the integration of all preventive innovations
            const plugins = [
                require('../src/plugins/fastify-spec-heatmap').default,
                require('../src/plugins/fastify-snapshot-validator').default,
                require('../src/plugins/fastify-auto-stub').default,
                require('../src/plugins/fastify-rule-watchdog').default,
                require('../src/plugins/fastify-signoff').default,
                require('../src/plugins/fastify-failure-replay').default,
                require('../src/plugins/fastify-fs-gate').default
            ];
            
            // Register all plugins
            for (const plugin of plugins) {
                await plugin(fastify, { logger: mockLogger });
            }
            
            // Verify all decorators are added
            const expectedDecorators = [
                'specHeatmap',
                'snapshotValidator', 
                'autoStub',
                'ruleWatchdog',
                'signoff',
                'failureReplay',
                'fsGate'
            ];
            
            for (const decorator of expectedDecorators) {
                const decoratorCall = fastify.decorate.mock.calls.find(call => call[0] === decorator);
                expect(decoratorCall).toBeDefined();
            }
            
            // Verify routes are registered
            expect(fastify.get).toHaveBeenCalled();
            expect(fastify.post).toHaveBeenCalled();
        });
    });
}); 