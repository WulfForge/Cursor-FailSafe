const { Validator } = require('../out/validator');
const { ProjectPlan } = require('../out/projectPlan');
const { Logger } = require('../out/logger');

// Mock VS Code API
global.vscode = {
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test' } }]
    }
};

describe('Date Validation', () => {
    let validator;
    let projectPlan;
    let logger;

    beforeEach(() => {
        logger = new Logger();
        projectPlan = new ProjectPlan(logger);
        validator = new Validator(logger, projectPlan);
    });

    test('should catch incorrect date format in changelog', async () => {
        const content = `
## [1.4.0] - 2025-01-13

### Added
- New feature
        `;

        const result = await validator.validateRequest(content);
        
        // Should detect that 2025-01-13 is incorrect (should be 2025-06-13)
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.message.includes('Date too far in future'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('realistic date'))).toBe(true);
    });

    test('should accept correct date format', async () => {
        const content = `
## [1.4.0] - 2025-06-13

### Added
- New feature
        `;

        const result = await validator.validateRequest(content);
        
        // Should accept the correct date
        expect(result.errors.filter(e => e.category === 'date')).toHaveLength(0);
    });

    test('should catch invalid month', async () => {
        const content = `
## [1.4.0] - 2025-13-13

### Added
- New feature
        `;

        const result = await validator.validateRequest(content);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.message.includes('Invalid month'))).toBe(true);
    });

    test('should catch invalid day', async () => {
        const content = `
## [1.4.0] - 2025-06-32

### Added
- New feature
        `;

        const result = await validator.validateRequest(content);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.message.includes('Invalid day'))).toBe(true);
    });
}); 