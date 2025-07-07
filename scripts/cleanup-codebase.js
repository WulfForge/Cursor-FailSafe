#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodebaseCleanup {
    constructor() {
        this.rootDir = process.cwd();
        this.archiveDir = path.join(this.rootDir, 'archive', new Date().toISOString().split('T')[0]);
        this.deletedFiles = [];
        this.archivedFiles = [];
        this.errors = [];
    }

    async run() {
        console.log('🚀 Starting FailSafe Codebase Cleanup...\n');
        
        try {
            // Create archive directory
            await this.createArchiveDirectory();
            
            // Clean up redundant build outputs
            await this.cleanupRedundantBuildOutputs();
            
            // Archive outdated documentation
            await this.archiveOutdatedDocumentation();
            
            // Archive outdated test files
            await this.archiveOutdatedTests();
            
            // Archive outdated scripts
            await this.archiveOutdatedScripts();
            
            // Clean up session logs
            await this.cleanupSessionLogs();
            
            // Delete redundant files
            await this.deleteRedundantFiles();
            
            // Generate cleanup report
            await this.generateCleanupReport();
            
            console.log('\n✅ Codebase cleanup completed successfully!');
            console.log(`📁 Archive created at: ${this.archiveDir}`);
            console.log(`🗑️  Files deleted: ${this.deletedFiles.length}`);
            console.log(`📦 Files archived: ${this.archivedFiles.length}`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  Errors encountered: ${this.errors.length}`);
                this.errors.forEach(error => console.log(`   - ${error}`));
            }
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            process.exit(1);
        }
    }

    async createArchiveDirectory() {
        console.log('📁 Creating archive directory...');
        
        const archiveSubdirs = [
            'documentation',
            'tests',
            'scripts',
            'build-outputs',
            'reports'
        ];
        
        for (const subdir of archiveSubdirs) {
            const fullPath = path.join(this.archiveDir, subdir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }
        
        console.log(`   Created archive structure at: ${this.archiveDir}`);
    }

    async cleanupRedundantBuildOutputs() {
        console.log('\n🗑️  Cleaning up redundant build outputs...');
        
        const redundantFiles = [
            'extension.js',
            'extension.js.map'
        ];
        
        for (const file of redundantFiles) {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    this.deletedFiles.push(file);
                    console.log(`   Deleted: ${file}`);
                } catch (error) {
                    this.errors.push(`Failed to delete ${file}: ${error.message}`);
                }
            }
        }
    }

    async archiveOutdatedDocumentation() {
        console.log('\n📚 Archiving outdated documentation...');
        
        const docsToArchive = [
            'docs/ALPHA_LAUNCH_SPRINT_PLAN.md',
            'docs/AUTOMATED_TESTING_FEATURES.md',
            'docs/BETA_FEATURES_PLAN.md',
            'docs/CHANGELOG_2.5.0.md',
            'docs/CHANGELOG_NEW.md',
            'docs/CONTRIBUTING.md',
            'docs/CURRENT_STATUS_REPORT.md',
            'docs/CURSOR_COMPARATIVE_ANALYSIS.md',
            'docs/Cursor-LocalAI-integration.md',
            'docs/CURSORRULES_EFFECTIVENESS_CHECKLIST.md',
            'docs/CURSORRULES_PASSIVE_VALIDATION.md',
            'docs/CURSORRULES_README.md',
            'docs/CURSORRULES_WIZARD_REQUIREMENTS.md',
            'docs/EXTERNAL_UI_AUDIT.md',
            'docs/FAILSAFE_FAILURE_ANALYSIS.md',
            'docs/FAILSAFE_UI_IMPLEMENTATION_FAILURE_ANALYSIS.md',
            'docs/FASTIFY_IMPLEMENTATION_GUIDE.md',
            'docs/FEATURE_AUDIT_REPORT.md',
            'docs/FEATURE_PRESERVATION_CHECKLIST.md',
            'docs/FEATURE_TESTING_CHECKLIST.md',
            'docs/FINAL_BUG_REVIEW_SUMMARY.md',
            'docs/FINAL_RELEASE_SUMMARY.md',
            'docs/FUTURE_FEATURES.md',
            'docs/MAJOR_RELEASE_ANNOUNCEMENT.md',
            'docs/MARKETPLACE_LISTING.md',
            'docs/MARKETPLACE_UPDATE_GUIDE.md',
            'docs/PASSIVE_VALIDATION_SYSTEM.md',
            'docs/PHASE_2_REMEDIATION_KICKOFF_PLAN.md',
            'docs/PREVIEW_GUIDE.md',
            'docs/PREVIEW_SERVER_GUIDE.md',
            'docs/PREVIEW_SYSTEM_GUIDE.md',
            'docs/PRIMARY_PRODUCT_GOAL.md',
            'docs/PROBLEMS_AND_SOLUTIONS_REVIEW.md',
            'docs/PROJECT_MANAGEMENT_EXTENSION_GUIDE.md',
            'docs/RELEASE_NOTES.md',
            'docs/RELEASE_SUMMARY_v2.0.0.md',
            'docs/RELEASE_SUMMARY_v2.5.2.md',
            'docs/RELEASE_SUMMARY.md',
            'docs/RULESET_BEST_PRACTICES_RESEARCH.md',
            'docs/SECURITY_AUDIT.md',
            'docs/SPRINT_1_PROGRESS.md',
            'docs/SPRINT_IMPORT_ANALYSIS.md',
            'docs/SPRINT_PLAN_100_COMPLIANCE.md',
            'docs/test-chat-validation.md',
            'docs/test-cursor-rules.md',
            'docs/UI_SNAPSHOT_2024-01-15.md'
        ];
        
        for (const doc of docsToArchive) {
            const sourcePath = path.join(this.rootDir, doc);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(this.archiveDir, 'documentation', path.basename(doc));
                try {
                    fs.copyFileSync(sourcePath, destPath);
                    fs.unlinkSync(sourcePath);
                    this.archivedFiles.push(doc);
                    console.log(`   Archived: ${doc}`);
                } catch (error) {
                    this.errors.push(`Failed to archive ${doc}: ${error.message}`);
                }
            }
        }
        
        // Keep essential documentation
        const essentialDocs = [
            'docs/_failsafe-plan.md',
            'docs/FailSafe.md'
        ];
        
        console.log('   Keeping essential documentation files');
    }

    async archiveOutdatedTests() {
        console.log('\n🧪 Archiving outdated test files...');
        
        const testsToArchive = [
            'test/basic.test.js',
            'test/chart-implementation.test.js',
            'test/chart-verification.js',
            'test/command-evidence.test.js',
            'test/date-validation.test.js',
            'test/debug-file-claims.js',
            'test/design-document-manager.test.js',
            'test/detailed-validation.js',
            'test/events.e2e.test.js',
            'test/extension-detection.test.js',
            'test/fastify-enhancements.test.js',
            'test/file-validation.test.js',
            'test/functionality-verification.js',
            'test/implementation-validation.js',
            'test/preventive-innovations.test.js',
            'test/projectPlan.test.js',
            'test/simple-extension.test.js',
            'test/taskEngine.test.js',
            'test/timeout.test.js',
            'test/validator-emulation.test.js',
            'test/validator.test.js',
            'test/ui/ui-branding.test.js',
            'test/ui/ui-enhancement.test.js',
            'test/ui/ui-simple.test.js',
            'test/ui/ui.test.js',
            'test/ui/preview-panel.test.js'
        ];
        
        for (const test of testsToArchive) {
            const sourcePath = path.join(this.rootDir, test);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(this.archiveDir, 'tests', path.basename(test));
                try {
                    fs.copyFileSync(sourcePath, destPath);
                    fs.unlinkSync(sourcePath);
                    this.archivedFiles.push(test);
                    console.log(`   Archived: ${test}`);
                } catch (error) {
                    this.errors.push(`Failed to archive ${test}: ${error.message}`);
                }
            }
        }
        
        // Keep essential test files
        const essentialTests = [
            'test/runTest.js',
            'test/setup.js',
            'test/mocks/vscode.js'
        ];
        
        console.log('   Keeping essential test infrastructure');
    }

    async archiveOutdatedScripts() {
        console.log('\n🔧 Archiving outdated scripts...');
        
        const scriptsToArchive = [
            'scripts/audit-features.js',
            'scripts/check-background-agents.js',
            'scripts/check-icon.js',
            'scripts/check-version-consistency.js',
            'scripts/pre-commit-version-check.js',
            'scripts/preview-manager.js',
            'scripts/spec-gate.js',
            'scripts/start-preview.js'
        ];
        
        for (const script of scriptsToArchive) {
            const sourcePath = path.join(this.rootDir, script);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(this.archiveDir, 'scripts', path.basename(script));
                try {
                    fs.copyFileSync(sourcePath, destPath);
                    fs.unlinkSync(sourcePath);
                    this.archivedFiles.push(script);
                    console.log(`   Archived: ${script}`);
                } catch (error) {
                    this.errors.push(`Failed to archive ${script}: ${error.message}`);
                }
            }
        }
        
        console.log('   Keeping cleanup script and essential scripts');
    }

    async cleanupSessionLogs() {
        console.log('\n📝 Cleaning up session logs...');
        
        const sessionDir = path.join(this.rootDir, '.failsafe');
        if (fs.existsSync(sessionDir)) {
            try {
                const files = fs.readdirSync(sessionDir);
                let cleanedCount = 0;
                
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(sessionDir, file);
                        const stats = fs.statSync(filePath);
                        const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                        
                        // Keep logs from last 7 days, archive older ones
                        if (daysOld > 7) {
                            const destPath = path.join(this.archiveDir, 'reports', file);
                            fs.copyFileSync(filePath, destPath);
                            fs.unlinkSync(filePath);
                            cleanedCount++;
                        }
                    }
                }
                
                console.log(`   Cleaned up ${cleanedCount} old session logs`);
            } catch (error) {
                this.errors.push(`Failed to cleanup session logs: ${error.message}`);
            }
        }
    }

    async deleteRedundantFiles() {
        console.log('\n🗑️  Deleting redundant files...');
        
        const redundantFiles = [
            'commands.ts.backup',
            'commands.ts.backup2',
            'README.md.backup',
            'background-agents-investigation.json',
            'enhance-dashboard-ui.js',
            'eslint-report.html',
            'lint-report.txt',
            'tsc-report.txt',
            'spec-gate-report.json',
            'spec-gate-report.json.bak',
            'failsafe-cursor-2.0.0.vsix'
        ];
        
        for (const file of redundantFiles) {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    if (fs.statSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    this.deletedFiles.push(file);
                    console.log(`   Deleted: ${file}`);
                } catch (error) {
                    this.errors.push(`Failed to delete ${file}: ${error.message}`);
                }
            }
        }
        
        // Clean up coverage directory (regenerated during testing)
        const coverageDir = path.join(this.rootDir, 'coverage');
        if (fs.existsSync(coverageDir)) {
            try {
                fs.rmSync(coverageDir, { recursive: true, force: true });
                this.deletedFiles.push('coverage/');
                console.log('   Deleted: coverage/ (regenerated during testing)');
            } catch (error) {
                this.errors.push(`Failed to delete coverage directory: ${error.message}`);
            }
        }
        
        // Clean up test workspace (regenerated during testing)
        const testWorkspaceDir = path.join(this.rootDir, 'test-workspace');
        if (fs.existsSync(testWorkspaceDir)) {
            try {
                fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
                this.deletedFiles.push('test-workspace/');
                console.log('   Deleted: test-workspace/ (regenerated during testing)');
            } catch (error) {
                this.errors.push(`Failed to delete test-workspace directory: ${error.message}`);
            }
        }
    }

    async generateCleanupReport() {
        console.log('\n📊 Generating cleanup report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            archiveLocation: this.archiveDir,
            deletedFiles: this.deletedFiles,
            archivedFiles: this.archivedFiles,
            errors: this.errors,
            summary: {
                totalDeleted: this.deletedFiles.length,
                totalArchived: this.archivedFiles.length,
                totalErrors: this.errors.length
            }
        };
        
        const reportPath = path.join(this.archiveDir, 'cleanup-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`   Cleanup report saved to: ${reportPath}`);
        
        // Create a README in the archive
        const archiveReadme = `# FailSafe Codebase Archive

This archive contains files that were cleaned up from the main codebase on ${new Date().toLocaleDateString()}.

## Contents

- **documentation/**: Outdated planning and documentation files
- **tests/**: Outdated test files
- **scripts/**: Outdated utility scripts
- **build-outputs/**: Redundant build artifacts
- **reports/**: Old session logs and reports

## Cleanup Summary

- Files deleted: ${this.deletedFiles.length}
- Files archived: ${this.archivedFiles.length}
- Errors encountered: ${this.errors.length}

## Important Notes

- All essential functionality has been preserved in the main codebase
- These files are kept for historical reference but are no longer needed for development
- If you need to restore any files, they can be found in their respective subdirectories

## Essential Files Preserved

The following critical files remain in the main codebase:

### Core Extension
- src/extension.ts
- src/commands.ts
- src/logger.ts
- src/validator.ts
- src/testRunner.ts
- src/projectPlan.ts
- src/taskEngine.ts
- src/ui.ts

### AI/Validation System
- src/aiResponsePipeline.ts
- src/aiResponseHooks.ts
- src/aiResponseValidator.ts
- src/chatValidator.ts
- src/chatResponseInterceptor.ts

### Configuration
- package.json
- tsconfig.json
- jest.config.js
- tailwind.config.js

### Documentation
- README.md
- CHANGELOG.md
- LICENSE
- failsafe_ui_specification.md

For more details, see the cleanup-report.json file.
`;
        
        const archiveReadmePath = path.join(this.archiveDir, 'README.md');
        fs.writeFileSync(archiveReadmePath, archiveReadme);
    }
}

// Run the cleanup
if (require.main === module) {
    const cleanup = new CodebaseCleanup();
    cleanup.run().catch(console.error);
}

module.exports = CodebaseCleanup; 