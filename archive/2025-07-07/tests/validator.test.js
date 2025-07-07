const assert = require('assert');
const { Validator } = require('../out/validator');

const validator = new Validator();

describe('FailSafe Output Validator', () => {
    describe('Hallucination Detection', () => {
        it('should detect TODOs and placeholders', () => {
            const code = 'function foo() { /* TODO: implement */ }\nconst bar = "lorem ipsum";';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'hallucination'), 'Should detect hallucination');
        });
        it('should detect mock data and sample data', () => {
            const code = 'const data = mockData;\nconst test = "sample data";';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'hallucination'), 'Should detect mock/sample data');
        });
        it('should detect foo/bar/baz/abc/1234', () => {
            const code = 'let foo = 1; let bar = 2; let baz = 3; let abc = 4; let abcd = 5; let x = 1234;';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'hallucination'), 'Should detect foo/bar/baz/abc/1234');
        });
    });

    describe('Dangerous Code Detection', () => {
        it('should detect rm -rf and format', () => {
            const code = 'rm -rf /; format c:';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'safety'), 'Should detect dangerous operations');
        });
        it('should detect hardcoded secrets and tokens', () => {
            const code = 'const password = "1234"; const api_key = "abcd"; const secret = "hardcoded";';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'safety'), 'Should detect hardcoded secrets');
        });
        it('should detect use of eval, execSync, child_process, fs', () => {
            const code = 'eval("2+2"); require("child_process"); require("fs"); require("os");';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'safety'), 'Should detect eval/child_process/fs');
        });
    });

    describe('Syntax and Incomplete Code Detection', () => {
        it('should detect unmatched brackets', () => {
            const code = 'function test() { if (true) { return 1; }';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'syntax'), 'Should detect unmatched brackets');
        });
        it('should detect incomplete function/class', () => {
            const code = 'function foo() {';
            const result = validator.validateCode(code);
            assert.ok(result.errors.some(e => e.type === 'syntax'), 'Should detect incomplete function');
        });
    });

    describe('Suggestions', () => {
        it('should suggest removing console.log', () => {
            const code = 'console.log("debug");';
            const result = validator.validateCode(code);
            assert.ok(result.suggestions.some(s => s.includes('console.log')), 'Should suggest removing console.log');
        });
        it('should suggest addressing TODO/FIXME', () => {
            const code = '// TODO: fix this\n// FIXME: bug';
            const result = validator.validateCode(code);
            assert.ok(result.suggestions.some(s => s.includes('TODO')), 'Should suggest addressing TODO/FIXME');
        });
    });

    describe('Override Logic', () => {
        it('should not allow override for safety errors', () => {
            const code = 'rm -rf /';
            const result = validator.validateCode(code);
            const allow = validator.shouldAllowOverride(result, { allowOverride: true });
            assert.strictEqual(allow, false, 'Should not allow override for safety errors');
        });
        it('should allow override for only hallucination errors', () => {
            const code = 'let foo = 1; // TODO: fix';
            const result = validator.validateCode(code);
            const allow = validator.shouldAllowOverride(result, { allowOverride: true });
            assert.strictEqual(allow, true, 'Should allow override for hallucination errors');
        });
        it('should not allow override if config is false', () => {
            const code = 'let foo = 1; // TODO: fix';
            const result = validator.validateCode(code);
            const allow = validator.shouldAllowOverride(result, { allowOverride: false });
            assert.strictEqual(allow, false, 'Should not allow override if config is false');
        });
    });
}); 