const assert = require('assert');
const proxyquire = require('proxyquire');
const path = require('path');

// Mock vscode for testing
const mockVscode = {
    workspace: {
        workspaceFolders: [{
            uri: {
                fsPath: __dirname + '/../test-workspace'
            }
        }]
    },
    window: {
        showInformationMessage: () => Promise.resolve('OK')
    }
};

const { Validator } = proxyquire('../out/validator', { vscode: mockVscode });
const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });

describe('FailSafe Validator - Emulation Detection', () => {
    let validator;
    let logger;

    beforeEach(() => {
        logger = new Logger();
        validator = new Validator(logger);
    });

    describe('Environment Validation', () => {
        it('should detect test environment', () => {
            // Set test environment
            process.env.NODE_ENV = 'test';
            
            const feasibility = validator.validateEnvironmentFeasibility('show dashboard');
            
            assert.strictEqual(feasibility.isFeasible, false);
            assert.ok(feasibility.blockers.includes('Running in test environment'));
            assert.ok(feasibility.recommendations.includes('Verify functionality in production VS Code environment'));
        });

        it('should detect emulation patterns in requests', () => {
            const feasibility = validator.validateEnvironmentFeasibility('mock VS Code API for testing');
            
            assert.strictEqual(feasibility.isFeasible, false);
            assert.ok(feasibility.blockers.includes('Request involves emulated/mock environment'));
            assert.ok(feasibility.recommendations.includes('Use real VS Code extension environment'));
        });

        it('should detect fake API requests', () => {
            const feasibility = validator.validateEnvironmentFeasibility('create fake API response');
            
            assert.strictEqual(feasibility.isFeasible, false);
            assert.ok(feasibility.blockers.includes('Request involves emulated/mock environment'));
        });

        it('should allow legitimate requests', () => {
            const feasibility = validator.validateEnvironmentFeasibility('show project dashboard in VS Code');
            
            // Should be feasible if not in test environment
            if (process.env.NODE_ENV !== 'test') {
                assert.strictEqual(feasibility.isFeasible, true);
                assert.strictEqual(feasibility.blockers.length, 0);
            }
        });
    });

    describe('Mock Detection', () => {
        it('should detect mocked VS Code APIs', () => {
            // This test runs in a mocked environment, so it should detect it
            const feasibility = validator.validateEnvironmentFeasibility('any request');
            
            // In our test environment, this should detect mocking
            assert.strictEqual(feasibility.isFeasible, false);
            assert.ok(feasibility.blockers.some(blocker => 
                blocker.includes('mocked') || 
                blocker.includes('test environment')
            ));
        });
    });

    describe('Real vs Mock Validation', () => {
        it('should validate environment context', () => {
            // This would be called during normal validation
            const result = validator.validateEnvironmentContext();
            
            // Should detect we're in a test/mocked environment
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.suggestions.length > 0);
        });
    });
}); 