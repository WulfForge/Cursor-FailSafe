import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { TestResult } from './types';

export class TestRunner {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('failsafe');
    }

    public async runTests(): Promise<TestResult> {
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
        } catch (error) {
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

    private async executeTestCommand(command: string): Promise<{
        exitCode: number;
        output: string;
        errors: string[];
        totalTests: number;
        passedTests: number;
        failedTests: number;
    }> {
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
            let errors: string[] = [];

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

    private parseTestOutput(output: string): {
        totalTests: number;
        passedTests: number;
        failedTests: number;
    } {
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
                } else if (pattern.source.includes('passing')) {
                    passedTests = parseInt(match[1]) || 0;
                } else if (pattern.source.includes('failing')) {
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
                } else if (pattern.source.includes('failing')) {
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
                    } else if (pattern.source.includes('passed')) {
                        passedTests = parseInt(match[1]) || 0;
                    } else if (pattern.source.includes('failed')) {
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
            } else if (output.includes('FAIL') || output.includes('✗')) {
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

    public async runSpecificTest(testPath: string): Promise<TestResult> {
        const testCommand = `npm test -- ${testPath}`;
        return this.runTests();
    }

    public async runTestsWithCoverage(): Promise<TestResult> {
        const testCommand = 'npm test -- --coverage';
        return this.runTests();
    }

    public isTestFrameworkAvailable(): boolean {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false;
        }

        try {
            const fs = require('fs');
            const packageJsonPath = require('path').join(workspaceRoot, 'package.json');
            
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return packageJson.scripts && packageJson.scripts.test;
            }
        } catch (error) {
            // Ignore errors
        }

        return false;
    }

    public getAvailableTestCommands(): string[] {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return [];
        }

        const commands: string[] = [];
        
        try {
            const fs = require('fs');
            const packageJsonPath = require('path').join(workspaceRoot, 'package.json');
            
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
        } catch (error) {
            // Ignore errors
        }

        return commands;
    }
} 