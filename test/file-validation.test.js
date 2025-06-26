const { ChatValidator } = require('../out/chatValidator');
const { Logger } = require('../out/logger');
const fs = require('fs');
const path = require('path');

describe('Enhanced File Validation', () => {
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

    test('should validate text files with enhanced checks', async () => {
        // Create test files
        const validJsonFile = path.join(testWorkspaceRoot, 'valid.json');
        const invalidJsonFile = path.join(testWorkspaceRoot, 'invalid.json');
        const jsFileWithIssues = path.join(testWorkspaceRoot, 'test.js');
        const envFile = path.join(testWorkspaceRoot, '.env');

        fs.writeFileSync(validJsonFile, JSON.stringify({ name: 'test', version: '1.0.0' }));
        fs.writeFileSync(invalidJsonFile, '{ name: "test", version: "1.0.0" }'); // Missing quotes
        fs.writeFileSync(jsFileWithIssues, `
            console.log('debug info');
            eval('dangerous code');
            const password = 'secret123';
            process.env.NODE_ENV;
        `);
        fs.writeFileSync(envFile, 'PASSWORD=secret123\nAPI_KEY=abc123');

        // Test valid JSON
        const validResult = await chatValidator.validateFileContent(validJsonFile);
        expect(validResult.isValid).toBe(true);
        expect(validResult.errors).toHaveLength(0);

        // Test invalid JSON
        const invalidResult = await chatValidator.validateFileContent(invalidJsonFile);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.some(e => e.category === 'invalid_json')).toBe(true);

        // Test JS file with issues
        const jsResult = await chatValidator.validateFileContent(jsFileWithIssues);
        expect(jsResult.warnings.some(w => w.category === 'debug_code')).toBe(true);
        expect(jsResult.errors.some(e => e.category === 'dangerous_code')).toBe(true);
        expect(jsResult.errors.some(e => e.category === 'hardcoded_credentials')).toBe(true);

        // Test env file
        const envResult = await chatValidator.validateFileContent(envFile);
        expect(envResult.errors.some(e => e.category === 'sensitive_data')).toBe(true);
    });

    test('should validate binary files', async () => {
        // Create a mock PNG file (valid signature)
        const pngFile = path.join(testWorkspaceRoot, 'test.png');
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        fs.writeFileSync(pngFile, pngSignature);

        // Create a file with invalid signature
        const invalidFile = path.join(testWorkspaceRoot, 'invalid.png');
        const invalidSignature = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        fs.writeFileSync(invalidFile, invalidSignature);

        // Test valid PNG
        const validResult = await chatValidator.validateFileContent(pngFile);
        expect(validResult.isValid).toBe(true);
        expect(validResult.warnings.some(w => w.category === 'file_hash')).toBe(true);

        // Test invalid signature
        const invalidResult = await chatValidator.validateFileContent(invalidFile);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.some(e => e.category === 'invalid_file_signature')).toBe(true);
    });

    test('should detect encoding issues', async () => {
        const encodingFile = path.join(testWorkspaceRoot, 'encoding.txt');
        
        // Create file with null bytes
        const contentWithNulls = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x57, 0x6F, 0x72, 0x6C, 0x64]);
        fs.writeFileSync(encodingFile, contentWithNulls);

        const result = await chatValidator.validateFileContent(encodingFile);
        expect(result.warnings.some(w => w.category === 'encoding_issues')).toBe(true);
    });

    test('should validate file-specific formats', async () => {
        // Test YAML with tabs
        const yamlFile = path.join(testWorkspaceRoot, 'test.yml');
        fs.writeFileSync(yamlFile, 'name:\ttest\nversion:\t1.0.0');

        // Test Markdown with TODO
        const mdFile = path.join(testWorkspaceRoot, 'test.md');
        fs.writeFileSync(mdFile, '# Test\n\nTODO: Complete this documentation');

        const yamlResult = await chatValidator.validateFileContent(yamlFile);
        expect(yamlResult.warnings.some(w => w.category === 'yaml_formatting')).toBe(true);

        const mdResult = await chatValidator.validateFileContent(mdFile);
        expect(mdResult.warnings.some(w => w.category === 'incomplete_documentation')).toBe(true);
    });

    test('should handle large files', async () => {
        // Create a large file (> 10MB)
        const largeFile = path.join(testWorkspaceRoot, 'large.txt');
        const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
        fs.writeFileSync(largeFile, largeContent);

        const result = await chatValidator.validateFileContent(largeFile);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.category === 'file_too_large')).toBe(true);
    });

    test('should calculate content hashes', async () => {
        const testFile = path.join(testWorkspaceRoot, 'hash-test.txt');
        const content = 'Hello, World!';
        fs.writeFileSync(testFile, content);

        const result = await chatValidator.validateFileContent(testFile);
        expect(result.warnings.some(w => w.category === 'content_hash')).toBe(true);
        
        // The hash should be consistent for the same content
        const result2 = await chatValidator.validateFileContent(testFile);
        const hash1 = result.warnings.find(w => w.category === 'content_hash').message;
        const hash2 = result2.warnings.find(w => w.category === 'content_hash').message;
        expect(hash1).toBe(hash2);
    });

    test('should detect suspicious binary patterns', async () => {
        // Create a file with suspicious patterns
        const suspiciousFile = path.join(testWorkspaceRoot, 'suspicious.bin');
        const suspiciousPattern = Buffer.from([0x90, 0x90, 0x90]); // NOP sled
        fs.writeFileSync(suspiciousFile, suspiciousPattern);

        const result = await chatValidator.validateFileContent(suspiciousFile);
        expect(result.warnings.some(w => w.category === 'suspicious_binary_content')).toBe(true);
    });

    test('should validate file system claims in chat content', async () => {
        // Create a test file
        const testFile = path.join(testWorkspaceRoot, 'test.txt');
        fs.writeFileSync(testFile, 'Hello, World!');

        // Test chat content with file claims
        const chatContent = `
            I created a new file called test.txt with the content "Hello, World!".
            I also modified the package.json file to add new dependencies.
            I verified that the src/main.ts file exists and is properly formatted.
        `;

        const context = {
            workspaceRoot: testWorkspaceRoot,
            currentFile: testFile,
            projectType: 'typescript',
            techStack: ['node', 'typescript']
        };

        // Debug: Let's see what claims are being extracted
        console.log('Chat content:', chatContent);
        
        // Call the public method for debugging
        const claims = chatValidator.extractFileClaims(chatContent);
        console.log('Extracted claims:', JSON.stringify(claims, null, 2));

        const result = await chatValidator.validateFileSystemClaims(chatContent, context);
        
        console.log('Validation result errors:', result.errors.map(e => ({ category: e.category, message: e.message })));
        
        // Should detect the false claims about package.json and src/main.ts
        expect(result.errors.some(e => e.category === 'false_modification_claim')).toBe(true);
        expect(result.errors.some(e => e.category === 'false_verification_claim')).toBe(true);
    });
}); 