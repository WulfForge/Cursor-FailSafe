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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TestRunner {
    constructor() {
        this.config = vscode.workspace.getConfiguration('failsafe');
    }
    async runTests() {
        const startTime = Date.now();
        const testCommand = this.config.get('testRunner', 'npm test');
        try {
            const result = await this.executeTestCommand(testCommand);
            const duration = Date.now() - startTime;
            return {
                passed: result.exitCode === 0,
                totalTests: result.totalTests,
                passedTests: result.passedTests,
                failedTests: result.failedTests,
                output: result.output,
                errors: result.errors,
                duration
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                output: '',
                errors: [error instanceof Error ? error.message : String(error)],
                duration
            };
        }
    }
    async executeTestCommand(command) {
        return new Promise((resolve, reject) => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                reject(new Error('No workspace folder found'));
                return;
            }
            const [cmd, ...args] = command.split(' ');
            const process = child_process.spawn(cmd, args, {
                cwd: workspaceRoot,
                shell: true,
                timeout: 30000 // 30 second timeout
            });
            let output = '';
            const errors = [];
            process.stdout?.on('data', (data) => {
                output += data.toString();
            });
            process.stderr?.on('data', (data) => {
                const errorText = data.toString();
                errors.push(errorText);
                output += errorText; // Include stderr in output for parsing
            });
            process.on('close', (code) => {
                const exitCode = code || 0;
                const parsedResult = this.parseTestOutput(output);
                resolve({
                    exitCode,
                    output,
                    errors,
                    ...parsedResult
                });
            });
            process.on('error', (error) => {
                reject(error);
            });
            process.on('timeout', () => {
                process.kill();
                reject(new Error('Test execution timed out'));
            });
        });
    }
    parseTestOutput(output) {
        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        // Parse Jest output
        const jestPatterns = [
            /Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/,
            /(\d+)\s+passing/,
            /(\d+)\s+failing/
        ];
        jestPatterns.forEach(pattern => {
            const match = output.match(pattern);
            if (match) {
                if (pattern.source.includes('passed')) {
                    passedTests = parseInt(match[1]) || 0;
                    failedTests = parseInt(match[2]) || 0;
                    totalTests = passedTests + failedTests;
                }
                else if (pattern.source.includes('passing')) {
                    passedTests = parseInt(match[1]) || 0;
                }
                else if (pattern.source.includes('failing')) {
                    failedTests = parseInt(match[1]) || 0;
                }
            }
        });
        // Parse Mocha output
        const mochaPatterns = [
            /(\d+)\s+passing/,
            /(\d+)\s+failing/
        ];
        mochaPatterns.forEach(pattern => {
            const match = output.match(pattern);
            if (match) {
                if (pattern.source.includes('passing')) {
                    passedTests = parseInt(match[1]) || 0;
                }
                else if (pattern.source.includes('failing')) {
                    failedTests = parseInt(match[1]) || 0;
                }
            }
        });
        // Parse generic test output
        if (totalTests === 0) {
            const genericPatterns = [
                /(\d+)\s+tests?\s+run/,
                /(\d+)\s+passed/,
                /(\d+)\s+failed/
            ];
            genericPatterns.forEach(pattern => {
                const match = output.match(pattern);
                if (match) {
                    if (pattern.source.includes('tests? run')) {
                        totalTests = parseInt(match[1]) || 0;
                    }
                    else if (pattern.source.includes('passed')) {
                        passedTests = parseInt(match[1]) || 0;
                    }
                    else if (pattern.source.includes('failed')) {
                        failedTests = parseInt(match[1]) || 0;
                    }
                }
            });
        }
        // If we still don't have totals, estimate from exit code
        if (totalTests === 0) {
            if (output.includes('PASS') || output.includes('✓')) {
                passedTests = 1;
                totalTests = 1;
            }
            else if (output.includes('FAIL') || output.includes('✗')) {
                failedTests = 1;
                totalTests = 1;
            }
        }
        return {
            totalTests,
            passedTests,
            failedTests
        };
    }
    async runSpecificTest(testPath) {
        const testCommand = `npm test -- ${testPath}`;
        return this.runTests();
    }
    async runTestsWithCoverage() {
        const testCommand = 'npm test -- --coverage';
        return this.runTests();
    }
    isTestFrameworkAvailable() {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false;
        }
        try {
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return packageJson.scripts && packageJson.scripts.test;
            }
        }
        catch (error) {
            // Ignore errors
        }
        return false;
    }
    getAvailableTestCommands() {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return [];
        }
        const commands = [];
        try {
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts) {
                    Object.keys(packageJson.scripts).forEach(script => {
                        if (script.includes('test')) {
                            commands.push(`npm run ${script}`);
                        }
                    });
                }
            }
        }
        catch (error) {
            // Ignore errors
        }
        return commands;
    }
}
exports.TestRunner = TestRunner;
//# sourceMappingURL=testRunner.js.map