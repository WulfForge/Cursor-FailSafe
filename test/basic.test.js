// Basic test file for FailSafe extension
const assert = require('assert');

describe('FailSafe Extension', () => {
    describe('Basic Functionality', () => {
        it('should have proper configuration', () => {
            const config = require('../config.json');
            assert.ok(config.timeout > 0, 'Timeout should be positive');
            assert.ok(typeof config.validationEnabled === 'boolean', 'Validation should be boolean');
            assert.ok(config.testRunner, 'Test runner should be defined');
        });

        it('should have proper package.json', () => {
            const packageJson = require('../package.json');
            assert.ok(packageJson.name === 'failsafe-cursor', 'Package name should be correct');
            assert.ok(packageJson.displayName === 'FailSafe', 'Display name should be correct');
            assert.ok(packageJson.engines.vscode, 'VS Code engine should be defined');
        });

        it('should have all required source files', () => {
            const fs = require('fs');
            const path = require('path');
            
            const requiredFiles = [
                'src/extension.ts',
                'src/commands.ts',
                'src/validator.ts',
                'src/testRunner.ts',
                'src/logger.ts',
                'src/projectPlan.ts',
                'src/taskEngine.ts',
                'src/ui.ts',
                'src/types.ts'
            ];

            requiredFiles.forEach(file => {
                const filePath = path.join(__dirname, '..', file);
                assert.ok(fs.existsSync(filePath), `File ${file} should exist`);
            });
        });
    });

    describe('Extension Structure', () => {
        it('should have proper command registration', () => {
            const packageJson = require('../package.json');
            const commands = packageJson.contributes.commands;
            
            assert.ok(commands.length > 0, 'Should have at least one command');
            
            const commandIds = commands.map(cmd => cmd.command);
            assert.ok(commandIds.includes('failsafe.openDashboard'), 'Should have openDashboard command');
            assert.ok(commandIds.includes('failsafe.showDashboard'), 'Should have showDashboard command');
            assert.ok(commandIds.includes('failsafe.validate'), 'Should have validate command');
        });

        it('should have proper configuration schema', () => {
            const packageJson = require('../package.json');
            const config = packageJson.contributes.configuration;
            
            assert.ok(config, 'Should have configuration schema');
            assert.ok(config.properties, 'Should have configuration properties');
            assert.ok(config.properties['failsafe.enabled'], 'Should have enabled setting');
            assert.ok(config.properties['failsafe.passiveValidation.enabled'], 'Should have passive validation setting');
        });
    });
}); 