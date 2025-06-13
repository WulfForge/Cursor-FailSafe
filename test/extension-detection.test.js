const assert = require('assert');
const proxyquire = require('proxyquire');
const path = require('path');

// Mock vscode with some extensions
const mockVscode = {
    extensions: {
        all: [
            {
                id: 'v0-dev',
                packageJSON: {
                    name: 'v0-dev',
                    version: '1.0.0',
                    publisher: 'v0-dev',
                    description: 'v0 development extension',
                    contributes: {
                        commands: [
                            { command: 'v0-dev.helloWorld', title: 'Hello World' },
                            { command: 'v0-dev.openBrowser', title: 'Open Browser' }
                        ]
                    }
                },
                isActive: true
            },
            {
                id: 'ms-vscode.vscode-typescript-next',
                packageJSON: {
                    name: 'TypeScript',
                    version: '5.0.0',
                    publisher: 'Microsoft',
                    description: 'TypeScript support',
                    contributes: {
                        commands: [
                            { command: 'typescript.restartTsServer', title: 'Restart TS Server' }
                        ]
                    }
                },
                isActive: true
            }
        ]
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: __dirname + '/../test-workspace' }
        }],
        getConfiguration: () => ({
            get: () => 'info'
        })
    },
    window: {
        showInformationMessage: () => Promise.resolve('OK')
    }
};

const { ExtensionDetector } = proxyquire('../out/extensionDetector', { vscode: mockVscode });
const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });

describe('FailSafe Extension Detection', () => {
    let extensionDetector;
    let logger;

    beforeEach(() => {
        logger = new Logger();
        extensionDetector = new ExtensionDetector(logger);
    });

    describe('Extension Detection', () => {
        it('should detect installed extensions', () => {
            const summary = extensionDetector.getExtensionSummary();
            
            assert.strictEqual(summary.totalExtensions, 2);
            assert.strictEqual(summary.activeExtensions, 2);
            assert.ok(summary.extensionList.some(ext => ext.id === 'v0-dev'));
            assert.ok(summary.extensionList.some(ext => ext.id === 'ms-vscode.vscode-typescript-next'));
        });

        it('should check if specific extension is installed', () => {
            assert.strictEqual(extensionDetector.isExtensionInstalled('v0-dev'), true);
            assert.strictEqual(extensionDetector.isExtensionInstalled('nonexistent-extension'), false);
        });

        it('should get extension information', () => {
            const v0Info = extensionDetector.getExtensionInfo('v0-dev');
            
            assert.ok(v0Info);
            assert.strictEqual(v0Info.name, 'v0-dev');
            assert.strictEqual(v0Info.version, '1.0.0');
            assert.strictEqual(v0Info.isActive, true);
        });
    });

    describe('Command Detection', () => {
        it('should detect available commands', () => {
            assert.strictEqual(extensionDetector.isCommandAvailable('v0-dev.helloWorld'), true);
            assert.strictEqual(extensionDetector.isCommandAvailable('v0-dev.openBrowser'), true);
            assert.strictEqual(extensionDetector.isCommandAvailable('typescript.restartTsServer'), true);
            assert.strictEqual(extensionDetector.isCommandAvailable('nonexistent.command'), false);
        });

        it('should identify command providers', () => {
            assert.strictEqual(extensionDetector.getCommandProvider('v0-dev.helloWorld'), 'v0-dev');
            assert.strictEqual(extensionDetector.getCommandProvider('typescript.restartTsServer'), 'ms-vscode.vscode-typescript-next');
            assert.strictEqual(extensionDetector.getCommandProvider('nonexistent.command'), undefined);
        });
    });

    describe('Extension Usage Validation', () => {
        it('should validate legitimate TypeScript extension usage', () => {
            const result = extensionDetector.validateExtensionUsage('use typescript.restartTsServer to restart the server');
            
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.issues.length, 0);
            assert.ok(result.availableExtensions.includes('ms-vscode.vscode-typescript-next'));
        });

        it('should detect missing extension usage', () => {
            const result = extensionDetector.validateExtensionUsage('use github.copilot to generate code');
            
            assert.strictEqual(result.isValid, false);
            assert.ok(result.issues.some(issue => issue.includes('github.copilot')));
            assert.ok(result.suggestions.some(suggestion => suggestion.includes('Check if')));
        });

        it('should detect unavailable commands', () => {
            const result = extensionDetector.validateExtensionUsage('use typescript.nonexistentCommand');
            
            assert.strictEqual(result.isValid, false);
            assert.ok(result.issues.some(issue => issue.includes('typescript.nonexistentCommand')));
        });

        it('should handle mixed valid and invalid usage', () => {
            const result = extensionDetector.validateExtensionUsage('use typescript.restartTsServer and github.copilot');
            
            assert.strictEqual(result.isValid, false);
            assert.ok(result.availableExtensions.includes('ms-vscode.vscode-typescript-next'));
            assert.ok(result.missingExtensions.includes('github.copilot'));
        });
    });

    describe('TypeScript Extension Specific Validation', () => {
        it('should validate TypeScript extension specifically', () => {
            const result = extensionDetector.validateExtensionUsage('use TypeScript to compile code');
            
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.issues.length, 0);
        });

        it('should detect when TypeScript extension is not installed', () => {
            // Create detector without TypeScript
            const mockVscodeWithoutTS = {
                ...mockVscode,
                extensions: {
                    all: mockVscode.extensions.all.filter(ext => ext.id !== 'ms-vscode.vscode-typescript-next')
                }
            };
            
            const { ExtensionDetector: ExtensionDetectorWithoutTS } = proxyquire('../out/extensionDetector', { vscode: mockVscodeWithoutTS });
            const detectorWithoutTS = new ExtensionDetectorWithoutTS(logger);
            
            const result = detectorWithoutTS.validateExtensionUsage('use TypeScript to compile code');
            
            assert.strictEqual(result.isValid, false);
            assert.ok(result.issues.some(issue => issue.toLowerCase().includes('typescript')));
        });
    });
}); 