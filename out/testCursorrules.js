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
exports.testCursorrules = testCursorrules;
const vscode = __importStar(require("vscode"));
const cursorrulesEngine_1 = require("./cursorrulesEngine");
const cursorrulesWizard_1 = require("./cursorrulesWizard");
const logger_1 = require("./logger");
async function testCursorrules(context) {
    const logger = new logger_1.Logger();
    const engine = new cursorrulesEngine_1.CursorrulesEngine(context, logger);
    const wizard = new cursorrulesWizard_1.CursorrulesWizard(engine, logger, context);
    try {
        // Test 1: Create a simple rule
        logger.info('Testing Cursorrules creation...');
        const testRule = {
            name: 'Test Security Rule',
            description: 'Detects secrets',
            purpose: 'security',
            severity: 'error',
            patternType: 'regex',
            pattern: 'secret',
            message: 'Secret detected',
            response: 'block',
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
        results.forEach((result, index) => {
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
        engine.recordOverride(rule.id, 'Testing override functionality');
        logger.info('Override recorded');
        // Test 6: Test rule deletion
        logger.info('Testing rule deletion...');
        engine.deleteRule(rule.id);
        logger.info('Test rule deleted');
        vscode.window.showInformationMessage('Cursorrules test completed successfully! Check the output panel for details.');
    }
    catch (error) {
        logger.error('Cursorrules test failed', error);
        vscode.window.showErrorMessage('Cursorrules test failed. Check the output panel for details.');
    }
}
//# sourceMappingURL=testCursorrules.js.map