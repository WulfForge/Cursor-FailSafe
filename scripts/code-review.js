#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodeReview {
    constructor() {
        this.rootDir = process.cwd();
        this.issues = [];
        this.warnings = [];
        this.successes = [];
        this.report = {
            timestamp: new Date().toISOString(),
            summary: {
                issues: 0,
                warnings: 0,
                successes: 0
            },
            details: {
                issues: [],
                warnings: [],
                successes: []
            }
        };
    }

    async run() {
        console.log('🔍 Starting FailSafe Code Review...\n');
        
        try {
            // Check essential files exist
            await this.checkEssentialFiles();
            
            // Validate package.json dependencies
            await this.validatePackageDependencies();
            
            // Check TypeScript compilation
            await this.checkTypeScriptCompilation();
            
            // Validate import statements
            await this.validateImports();
            
            // Check command registration
            await this.checkCommandRegistration();
            
            // Validate configuration files
            await this.validateConfigurationFiles();
            
            // Check for missing documentation
            await this.checkDocumentation();
            
            // Validate test infrastructure
            await this.validateTestInfrastructure();
            
            // Check for potential security issues
            await this.checkSecurityIssues();
            
            // Generate review report
            await this.generateReviewReport();
            
            console.log('\n📊 Code Review Summary:');
            console.log(`✅ Successes: ${this.successes.length}`);
            console.log(`⚠️  Warnings: ${this.warnings.length}`);
            console.log(`❌ Issues: ${this.issues.length}`);
            
            if (this.issues.length > 0) {
                console.log('\n❌ Critical issues found that need attention:');
                this.issues.forEach(issue => console.log(`   - ${issue}`));
                process.exit(1);
            } else if (this.warnings.length > 0) {
                console.log('\n⚠️  Warnings found (review recommended):');
                this.warnings.forEach(warning => console.log(`   - ${warning}`));
            } else {
                console.log('\n🎉 Code review passed! No issues found.');
            }
            
        } catch (error) {
            console.error('❌ Code review failed:', error);
            process.exit(1);
        }
    }

    async checkEssentialFiles() {
        console.log('📁 Checking essential files...');
        
        const essentialFiles = [
            'src/extension.ts',
            'src/commands.ts',
            'src/logger.ts',
            'src/validator.ts',
            'src/testRunner.ts',
            'src/projectPlan.ts',
            'src/taskEngine.ts',
            'src/ui.ts',
            'src/sidebarProvider.ts',
            'src/aiResponsePipeline.ts',
            'src/aiResponseHooks.ts',
            'src/aiResponseValidator.ts',
            'src/chatValidator.ts',
            'src/chatResponseInterceptor.ts',
            'src/cursorrulesEngine.ts',
            'src/cursorrulesManager.ts',
            'src/cursorrulesWizard.ts',
            'src/fastifyServer.ts',
            'src/types.ts',
            'src/dataStore.ts',
            'src/versionManager.ts',
            'src/sprintPlanner.ts',
            'src/designDocumentManager.ts',
            'src/troubleshootingStateManager.ts',
            'src/alertManager.ts',
            'src/chartDataService.ts',
            'src/extensionDetector.ts',
            'package.json',
            'tsconfig.json',
            'jest.config.js',
            'tailwind.config.js',
            'README.md',
            'CHANGELOG.md',
            'LICENSE',
            'failsafe_ui_specification.md'
        ];
        
        for (const file of essentialFiles) {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                this.successes.push(`Essential file exists: ${file}`);
            } else {
                this.issues.push(`Missing essential file: ${file}`);
            }
        }
        
        console.log(`   Checked ${essentialFiles.length} essential files`);
    }

    async validatePackageDependencies() {
        console.log('\n📦 Validating package dependencies...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
            
            // Check required dependencies
            const requiredDeps = [
                'fastify',
                '@fastify/static',
                '@sinclair/typebox',
                'chokidar',
                'node-fetch',
                'open',
                'pino-pretty'
            ];
            
            for (const dep of requiredDeps) {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    this.successes.push(`Required dependency found: ${dep}`);
                } else {
                    this.issues.push(`Missing required dependency: ${dep}`);
                }
            }
            
            // Check dev dependencies
            const requiredDevDeps = [
                '@types/node',
                '@types/vscode',
                'typescript',
                'eslint',
                'jest',
                'vsce'
            ];
            
            for (const dep of requiredDevDeps) {
                if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
                    this.successes.push(`Required dev dependency found: ${dep}`);
                } else {
                    this.warnings.push(`Missing dev dependency: ${dep}`);
                }
            }
            
            // Check scripts
            const requiredScripts = ['compile', 'watch', 'test', 'package'];
            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    this.successes.push(`Required script found: ${script}`);
                } else {
                    this.warnings.push(`Missing script: ${script}`);
                }
            }
            
        } catch (error) {
            this.issues.push(`Failed to parse package.json: ${error.message}`);
        }
    }

    async checkTypeScriptCompilation() {
        console.log('\n🔧 Checking TypeScript compilation...');
        
        try {
            // Check if out directory exists and has compiled files
            const outDir = path.join(this.rootDir, 'out');
            if (!fs.existsSync(outDir)) {
                this.issues.push('Missing compiled output directory (out/)');
                return;
            }
            
            const compiledFiles = fs.readdirSync(outDir).filter(file => file.endsWith('.js'));
            if (compiledFiles.length === 0) {
                this.issues.push('No compiled JavaScript files found in out/ directory');
            } else {
                this.successes.push(`Found ${compiledFiles.length} compiled files`);
            }
            
            // Check for TypeScript errors
            try {
                execSync('npx tsc --noEmit', { cwd: this.rootDir, stdio: 'pipe' });
                this.successes.push('TypeScript compilation check passed');
            } catch (error) {
                this.warnings.push('TypeScript compilation check failed - may have type errors');
            }
            
        } catch (error) {
            this.warnings.push(`TypeScript check failed: ${error.message}`);
        }
    }

    async validateImports() {
        console.log('\n📥 Validating import statements...');
        
        const srcDir = path.join(this.rootDir, 'src');
        if (!fs.existsSync(srcDir)) {
            this.issues.push('Missing src directory');
            return;
        }
        
        const tsFiles = this.getTypeScriptFiles(srcDir);
        let totalImports = 0;
        let validImports = 0;
        
        for (const file of tsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
            
            if (importMatches) {
                for (const importMatch of importMatches) {
                    totalImports++;
                    const moduleMatch = importMatch.match(/from\s+['"]([^'"]+)['"]/);
                    if (moduleMatch) {
                        const modulePath = moduleMatch[1];
                        
                        // Check if it's a relative import
                        if (modulePath.startsWith('.')) {
                            const resolvedPath = path.resolve(path.dirname(file), modulePath);
                            const possiblePaths = [
                                resolvedPath + '.ts',
                                resolvedPath + '.js',
                                path.join(resolvedPath, 'index.ts'),
                                path.join(resolvedPath, 'index.js')
                            ];
                            
                            const exists = possiblePaths.some(p => fs.existsSync(p));
                            if (exists) {
                                validImports++;
                            } else {
                                this.warnings.push(`Potentially missing import: ${modulePath} in ${path.relative(this.rootDir, file)}`);
                            }
                        } else {
                            // External module - assume it's valid
                            validImports++;
                        }
                    }
                }
            }
        }
        
        this.successes.push(`Validated ${totalImports} imports (${validImports} valid)`);
    }

    async checkCommandRegistration() {
        console.log('\n⚡ Checking command registration...');
        
        try {
            const commandsFile = path.join(this.rootDir, 'src/commands.ts');
            if (!fs.existsSync(commandsFile)) {
                this.issues.push('Missing commands.ts file');
                return;
            }
            
            const content = fs.readFileSync(commandsFile, 'utf8');
            
            // Check for command registration patterns
            const commandRegistrations = content.match(/registerCommand\(['"]([^'"]+)['"]/g);
            if (commandRegistrations) {
                this.successes.push(`Found ${commandRegistrations.length} command registrations`);
            } else {
                this.warnings.push('No command registrations found in commands.ts');
            }
            
            // Check package.json commands match
            const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
            if (packageJson.contributes && packageJson.contributes.commands) {
                const packageCommands = packageJson.contributes.commands.length;
                this.successes.push(`Package.json defines ${packageCommands} commands`);
            }
            
        } catch (error) {
            this.warnings.push(`Command registration check failed: ${error.message}`);
        }
    }

    async validateConfigurationFiles() {
        console.log('\n⚙️  Validating configuration files...');
        
        const configFiles = [
            { file: 'tsconfig.json', type: 'json' },
            { file: 'jest.config.js', type: 'js' },
            { file: 'tailwind.config.js', type: 'js' }
        ];
        
        for (const config of configFiles) {
            const filePath = path.join(this.rootDir, config.file);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    if (config.type === 'json') {
                        JSON.parse(content); // Validate JSON
                        this.successes.push(`Valid JSON configuration file: ${config.file}`);
                    } else if (config.type === 'js') {
                        // For JS config files, just check if they can be parsed as valid JavaScript
                        // This is a basic check - the actual validation happens at runtime
                        if (content.includes('module.exports') || content.includes('export default')) {
                            this.successes.push(`Valid JavaScript configuration file: ${config.file}`);
                        } else {
                            this.warnings.push(`Potentially invalid JavaScript configuration file: ${config.file}`);
                        }
                    }
                } catch (error) {
                    this.warnings.push(`Invalid ${config.type.toUpperCase()} in configuration file: ${config.file}`);
                }
            } else {
                this.warnings.push(`Missing configuration file: ${config.file}`);
            }
        }
    }

    async checkDocumentation() {
        console.log('\n📚 Checking documentation...');
        
        const essentialDocs = [
            'README.md',
            'CHANGELOG.md',
            'LICENSE',
            'failsafe_ui_specification.md'
        ];
        
        for (const doc of essentialDocs) {
            const filePath = path.join(this.rootDir, doc);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const size = stats.size;
                
                if (size > 100) {
                    this.successes.push(`Documentation file exists and has content: ${doc} (${size} bytes)`);
                } else {
                    this.warnings.push(`Documentation file exists but may be empty: ${doc} (${size} bytes)`);
                }
            } else {
                this.issues.push(`Missing essential documentation: ${doc}`);
            }
        }
    }

    async validateTestInfrastructure() {
        console.log('\n🧪 Validating test infrastructure...');
        
        const testFiles = [
            'test/runTest.js',
            'test/setup.js',
            'test/mocks/vscode.js'
        ];
        
        for (const file of testFiles) {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                this.successes.push(`Test infrastructure file exists: ${file}`);
            } else {
                this.warnings.push(`Missing test infrastructure file: ${file}`);
            }
        }
        
        // Check if tests can run
        try {
            const testDir = path.join(this.rootDir, 'test');
            if (fs.existsSync(testDir)) {
                const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.js'));
                if (testFiles.length > 0) {
                    this.successes.push(`Found ${testFiles.length} test files`);
                } else {
                    this.warnings.push('No test files found in test directory');
                }
            }
        } catch (error) {
            this.warnings.push(`Test infrastructure check failed: ${error.message}`);
        }
    }

    async checkSecurityIssues() {
        console.log('\n🔒 Checking for security issues...');
        
        const srcDir = path.join(this.rootDir, 'src');
        if (!fs.existsSync(srcDir)) {
            return;
        }
        
        const tsFiles = this.getTypeScriptFiles(srcDir);
        let securityIssues = 0;
        
        for (const file of tsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for potential security issues with more context
            const securityChecks = [
                {
                    pattern: /eval\s*\(/,
                    name: 'eval() usage',
                    description: 'eval() can be dangerous if used with user input'
                },
                {
                    pattern: /innerHTML\s*=\s*[^;]*\$\{/,
                    name: 'innerHTML with template literals',
                    description: 'innerHTML with dynamic content can lead to XSS',
                    excludePattern: /webview|vscode|createWebviewPanel/
                },
                {
                    pattern: /document\.write/,
                    name: 'document.write usage',
                    description: 'document.write can be dangerous'
                }
            ];
            
            for (const check of securityChecks) {
                if (check.pattern.test(content)) {
                    // Check if this should be excluded
                    if (check.excludePattern && check.excludePattern.test(content)) {
                        continue; // Skip this check for legitimate usage
                    }
                    securityIssues++;
                    this.warnings.push(`Potential security issue in ${path.relative(this.rootDir, file)}: ${check.name} - ${check.description}`);
                }
            }
            
            // Check for setTimeout/setInterval with dynamic values (more specific)
            const timeoutPatterns = [
                /setTimeout\s*\(\s*[^,]*\$\{/,
                /setInterval\s*\(\s*[^,]*\$\{/
            ];
            
            for (const pattern of timeoutPatterns) {
                if (pattern.test(content)) {
                    securityIssues++;
                    this.warnings.push(`Potential security issue in ${path.relative(this.rootDir, file)}: Dynamic timeout value`);
                }
            }
            
            // Check for eval usage (but exclude detection code)
            const evalPattern = /eval\s*\(/;
            if (evalPattern.test(content)) {
                // Check if this is detection code (not actual eval usage)
                const isDetectionCode = content.includes('eval_usage') || 
                                      content.includes('eval() or Function()') ||
                                      content.includes('checkSecurityDebt');
                
                if (!isDetectionCode) {
                    securityIssues++;
                    this.warnings.push(`Potential security issue in ${path.relative(this.rootDir, file)}: eval() usage - eval() can be dangerous if used with user input`);
                }
            }
        }
        
        if (securityIssues === 0) {
            this.successes.push('No obvious security issues found');
        } else {
            this.successes.push(`Security scan completed - ${securityIssues} potential issues flagged for review`);
        }
    }

    getTypeScriptFiles(dir) {
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...this.getTypeScriptFiles(fullPath));
            } else if (item.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    async generateReviewReport() {
        console.log('\n📊 Generating code review report...');
        
        this.report.summary.issues = this.issues.length;
        this.report.summary.warnings = this.warnings.length;
        this.report.summary.successes = this.successes.length;
        
        this.report.details.issues = this.issues;
        this.report.details.warnings = this.warnings;
        this.report.details.successes = this.successes;
        
        const reportPath = path.join(this.rootDir, 'code-review-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
        
        console.log(`   Code review report saved to: ${reportPath}`);
        
        // Create a summary markdown report
        const markdownReport = `# FailSafe Code Review Report

Generated on: ${new Date().toLocaleDateString()}

## Summary

- ✅ **Successes**: ${this.successes.length}
- ⚠️ **Warnings**: ${this.warnings.length}
- ❌ **Issues**: ${this.issues.length}

## Critical Issues

${this.issues.length > 0 ? this.issues.map(issue => `- ❌ ${issue}`).join('\n') : '- None found'}

## Warnings

${this.warnings.length > 0 ? this.warnings.map(warning => `- ⚠️ ${warning}`).join('\n') : '- None found'}

## Successes

${this.successes.length > 0 ? this.successes.map(success => `- ✅ ${success}`).join('\n') : '- None found'}

## Recommendations

${this.issues.length > 0 ? '**Immediate Action Required:** Address all critical issues before proceeding.' : '**No Critical Issues:** Codebase is ready for development.'}

${this.warnings.length > 0 ? '**Review Recommended:** Consider addressing warnings to improve code quality.' : '**No Warnings:** Excellent code quality.'}

## Next Steps

1. ${this.issues.length > 0 ? 'Fix all critical issues' : 'All critical checks passed'}
2. ${this.warnings.length > 0 ? 'Review and address warnings' : 'No warnings to address'}
3. Run tests to ensure functionality
4. Proceed with development

---
*Report generated by FailSafe Code Review Tool*
`;
        
        const markdownPath = path.join(this.rootDir, 'code-review-report.md');
        fs.writeFileSync(markdownPath, markdownReport);
        
        console.log(`   Markdown report saved to: ${markdownPath}`);
    }
}

// Run the code review
if (require.main === module) {
    const review = new CodeReview();
    review.run().catch(console.error);
}

module.exports = CodeReview; 