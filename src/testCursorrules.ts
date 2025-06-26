import * as vscode from 'vscode';
import { CursorrulesEngine } from './cursorrulesEngine';
import { CursorrulesWizard } from './cursorrulesWizard';
import { Logger } from './logger';

export async function testCursorrules(context: vscode.ExtensionContext): Promise<void> {
    const logger = new Logger();
    const engine = new CursorrulesEngine(context, logger);
    const wizard = new CursorrulesWizard(engine, logger, context);

    try {
        // Test 1: Create a simple rule
        logger.info('Testing Cursorrules creation...');
        
        const testRule = {
            name: 'Test Security Rule',
            description: 'Detects secrets',
            purpose: 'security',
            severity: 'error' as const,
            patternType: 'regex' as const,
            pattern: 'secret',
            message: 'Secret detected',
            response: 'block' as const,
            enabled: true,
            scope: { fileTypes: ['*'], projectTypes: ['*'], userRoles: ['*'] },
            createdBy: 'test',
            override: { allowed: false, requiresJustification: false }
        };

        const rule = engine.createRule(testRule);
        logger.info(`Created test rule with ID: ${rule.id}`);

        // Test 2: Validate content with the rule
        logger.info('Testing content validation...');
        
        const testContent = `
            const config = {
                password = "secret123",
                username = "admin"
            };
        `;

        const results = engine.evaluateContent(testContent);

        logger.info(`Validation results: ${results.length} violations found`);
        results.forEach((result: any, index: number) => {
            logger.info(`Violation ${index + 1}: ${result.message}`);
        });

        // Test 3: Get all rules
        logger.info('Testing rule retrieval...');
        const allRules = engine.getAllRules();
        logger.info(`Total rules: ${allRules.length}`);

        // Test 4: Test rule management
        logger.info('Testing rule management...');
        const retrievedRule = engine.getRule(rule.id);
        if (retrievedRule) {
            logger.info(`Retrieved rule: ${retrievedRule.name}`);
            
            // Test update
            engine.updateRule(rule.id, { enabled: false });
            logger.info('Rule disabled');
            
            // Test re-enable
            engine.updateRule(rule.id, { enabled: true });
            logger.info('Rule re-enabled');
        }

        // Test 5: Test override recording
        logger.info('Testing override recording...');
        engine.recordOverride(rule.id);
        logger.info('Override recorded');

        // Test 6: Test rule deletion
        logger.info('Testing rule deletion...');
        engine.deleteRule(rule.id);
        logger.info('Test rule deleted');

        vscode.window.showInformationMessage('Cursorrules test completed successfully! Check the output panel for details.');

    } catch (error) {
        logger.error('Cursorrules test failed', error);
        vscode.window.showErrorMessage('Cursorrules test failed. Check the output panel for details.');
    }
} 