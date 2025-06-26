const { ChatValidator } = require('../out/chatValidator');
const { Logger } = require('../out/logger');
const fs = require('fs');
const path = require('path');

describe('Command Execution Evidence Tracking', () => {
    let chatValidator;
    let testWorkspaceRoot;

    beforeEach(() => {
        testWorkspaceRoot = path.join(__dirname, 'test-workspace');
        if (!fs.existsSync(testWorkspaceRoot)) {
            fs.mkdirSync(testWorkspaceRoot, { recursive: true });
        }
        
        const logger = new Logger();
        chatValidator = new ChatValidator(logger, testWorkspaceRoot);
    });

    afterEach(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspaceRoot)) {
            fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
        }
    });

    test('should track command execution', () => {
        const command = 'npm install lodash';
        const output = 'added 1 package in 2.3s';
        const exitCode = 0;

        chatValidator.trackCommandExecution(command, output, exitCode);

        const terminalOutputPath = path.join(testWorkspaceRoot, '.failsafe', 'terminal-output.json');
        expect(fs.existsSync(terminalOutputPath)).toBe(true);

        const terminalData = JSON.parse(fs.readFileSync(terminalOutputPath, 'utf8'));
        expect(terminalData).toHaveLength(1);
        expect(terminalData[0]).toMatchObject({
            command: 'npm install lodash',
            output: 'added 1 package in 2.3s',
            exitCode: 0,
            workspaceRoot: testWorkspaceRoot
        });
    });

    test('should detect command execution evidence', () => {
        // First, track a command execution
        const command = 'npm test';
        chatValidator.trackCommandExecution(command, 'PASS', 0);

        // Then check if evidence exists
        const claim = { command: 'npm test', executed: true };
        const hasEvidence = chatValidator.hasExecutionEvidence(claim);
        
        expect(hasEvidence).toBe(true);
    });

    test('should not find evidence for untracked commands', () => {
        const claim = { command: 'nonexistent-command', executed: true };
        const hasEvidence = chatValidator.hasExecutionEvidence(claim);
        
        expect(hasEvidence).toBe(false);
    });

    test('should validate command claims in chat content', () => {
        // Track a command first
        chatValidator.trackCommandExecution('npm install', 'success', 0);

        // Create chat content with command claims
        const chatContent = `
        I ran \`npm install\` and it completed successfully.
        Then I executed \`npm test\` and all tests passed.
        `;

        const result = chatValidator.validateChatContent(chatContent);

        // Should find evidence for 'npm install' but not for 'npm test'
        const npmInstallErrors = result.errors.filter(e => e.message.includes('npm install'));
        const npmTestErrors = result.errors.filter(e => e.message.includes('npm test'));

        expect(npmInstallErrors).toHaveLength(0); // Should have evidence
        expect(npmTestErrors.length).toBeGreaterThan(0); // Should not have evidence
    });

    test('should limit terminal output records to prevent bloat', () => {
        // Add more than 1000 records
        for (let i = 0; i < 1100; i++) {
            chatValidator.trackCommandExecution(`command-${i}`, `output-${i}`, 0);
        }

        const terminalOutputPath = path.join(testWorkspaceRoot, '.failsafe', 'terminal-output.json');
        const terminalData = JSON.parse(fs.readFileSync(terminalOutputPath, 'utf8'));

        // Should only keep last 1000 records
        expect(terminalData).toHaveLength(1000);
        expect(terminalData[0].command).toBe('command-100');
        expect(terminalData[999].command).toBe('command-1099');
    });

    test('should handle file system evidence for build commands', () => {
        // Create a package.json file to simulate npm install evidence
        const packageJsonPath = path.join(testWorkspaceRoot, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test-project' }));

        // Create a node_modules directory to simulate npm install
        const nodeModulesPath = path.join(testWorkspaceRoot, 'node_modules');
        fs.mkdirSync(nodeModulesPath, { recursive: true });

        const claim = { command: 'npm install lodash', executed: true };
        const hasEvidence = chatValidator.hasExecutionEvidence(claim);
        
        // Should find file system evidence
        expect(hasEvidence).toBe(true);
    });
});

console.log('✅ Command execution evidence tracking tests completed'); 