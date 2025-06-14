#!/usr/bin/env node

/**
 * Pre-commit Version Check Script
 * 
 * This script runs before commits to ensure version consistency
 * across all project files.
 * 
 * Usage:
 *   node scripts/pre-commit-version-check.js
 * 
 * Exit codes:
 *   0 - All versions are consistent
 *   1 - Version inconsistencies found
 *   2 - Error occurred during check
 */

const fs = require('fs');
const path = require('path');

class PreCommitVersionChecker {
    constructor() {
        this.workspaceRoot = process.cwd();
        this.exitCode = 0;
    }

    async run() {
        console.log('🔍 Pre-commit Version Check');
        console.log('='.repeat(40));

        try {
            const consistency = await this.checkVersionConsistency();
            
            if (consistency.isConsistent) {
                console.log('✅ All versions are consistent');
                this.exitCode = 0;
            } else {
                console.log('❌ Version inconsistencies detected:');
                consistency.issues.forEach(issue => {
                    console.log(`  • ${issue}`);
                });
                
                console.log('\n💡 Recommendations:');
                consistency.recommendations.forEach(rec => {
                    console.log(`  • ${rec}`);
                });

                console.log('\n📋 File Status:');
                consistency.files.forEach(file => {
                    const status = file.status === 'consistent' ? '✅' : 
                                 file.status === 'missing' ? '❌' : '⚠️';
                    console.log(`  ${status} ${file.name}: ${file.version}`);
                });

                // Check if auto-fix is enabled
                const autoFix = process.argv.includes('--auto-fix');
                if (autoFix) {
                    console.log('\n🔧 Attempting auto-fix...');
                    const fixResult = await this.autoFixVersionIssues();
                    
                    if (fixResult.fixed > 0) {
                        console.log(`✅ Fixed ${fixResult.fixed} issues`);
                        if (fixResult.errors.length > 0) {
                            console.log('⚠️ Some issues could not be auto-fixed:');
                            fixResult.errors.forEach(error => {
                                console.log(`  • ${error}`);
                            });
                        }
                        
                        // Re-check after auto-fix
                        const recheck = await this.checkVersionConsistency();
                        if (recheck.isConsistent) {
                            console.log('✅ All versions are now consistent');
                            this.exitCode = 0;
                        } else {
                            console.log('❌ Some issues remain after auto-fix');
                            this.exitCode = 1;
                        }
                    } else {
                        console.log('⚠️ No issues could be auto-fixed');
                        this.exitCode = 1;
                    }
                } else {
                    console.log('\n💡 To auto-fix issues, run with --auto-fix flag');
                    this.exitCode = 1;
                }
            }

        } catch (error) {
            console.error('❌ Error during version check:', error.message);
            this.exitCode = 2;
        }

        console.log('\n' + '='.repeat(40));
        process.exit(this.exitCode);
    }

    async checkVersionConsistency() {
        const issues = [];
        const recommendations = [];
        const files = [];

        try {
            // Get current version from package.json
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                issues.push('package.json not found');
                return { isConsistent: false, issues, recommendations, files };
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const currentVersion = packageJson.version;

            files.push({
                name: 'package.json',
                version: currentVersion,
                status: 'consistent'
            });

            // Check CHANGELOG.md
            const changelogPath = path.join(this.workspaceRoot, 'CHANGELOG.md');
            if (fs.existsSync(changelogPath)) {
                const changelogContent = fs.readFileSync(changelogPath, 'utf8');
                if (changelogContent.includes(`## [${currentVersion}]`)) {
                    files.push({
                        name: 'CHANGELOG.md',
                        version: currentVersion,
                        status: 'consistent'
                    });
                } else {
                    files.push({
                        name: 'CHANGELOG.md',
                        version: 'missing',
                        status: 'missing'
                    });
                    issues.push('CHANGELOG.md missing current version entry');
                    recommendations.push('Add version entry to CHANGELOG.md');
                }
            } else {
                files.push({
                    name: 'CHANGELOG.md',
                    version: 'missing',
                    status: 'missing'
                });
                issues.push('CHANGELOG.md not found');
                recommendations.push('Create CHANGELOG.md file');
            }

            // Check README.md badge
            const readmePath = path.join(this.workspaceRoot, 'README.md');
            if (fs.existsSync(readmePath)) {
                const readmeContent = fs.readFileSync(readmePath, 'utf8');
                if (readmeContent.includes(`version-${currentVersion}`)) {
                    files.push({
                        name: 'README.md',
                        version: currentVersion,
                        status: 'consistent'
                    });
                } else {
                    files.push({
                        name: 'README.md',
                        version: 'mismatch',
                        status: 'mismatch'
                    });
                    issues.push('README.md badge version mismatch');
                    recommendations.push('Update README.md version badge');
                }
            } else {
                files.push({
                    name: 'README.md',
                    version: 'missing',
                    status: 'missing'
                });
                issues.push('README.md not found');
                recommendations.push('Create README.md file');
            }

            // Check package.json badge
            if (packageJson.badges && Array.isArray(packageJson.badges)) {
                const badge = packageJson.badges.find((b) => b.description === 'Version');
                if (badge && badge.url.includes(`version-${currentVersion}`)) {
                    files.push({
                        name: 'package.json badge',
                        version: currentVersion,
                        status: 'consistent'
                    });
                } else {
                    files.push({
                        name: 'package.json badge',
                        version: 'mismatch',
                        status: 'mismatch'
                    });
                    issues.push('package.json badge version mismatch');
                    recommendations.push('Update package.json badge URL');
                }
            }

            const isConsistent = issues.length === 0;

            return {
                isConsistent,
                issues,
                recommendations,
                files
            };

        } catch (error) {
            issues.push(`Error checking version consistency: ${error.message}`);
            return { isConsistent: false, issues, recommendations, files };
        }
    }

    async autoFixVersionIssues() {
        const errors = [];
        let fixed = 0;

        try {
            const consistency = await this.checkVersionConsistency();
            
            if (consistency.isConsistent) {
                return { fixed: 0, errors };
            }

            // Get current version
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const currentVersion = packageJson.version;

            // Fix CHANGELOG.md
            const changelogPath = path.join(this.workspaceRoot, 'CHANGELOG.md');
            if (fs.existsSync(changelogPath)) {
                const changelogContent = fs.readFileSync(changelogPath, 'utf8');
                if (!changelogContent.includes(`## [${currentVersion}]`)) {
                    try {
                        const newEntry = `\n## [${currentVersion}] - ${new Date().toISOString().split('T')[0]}\n\n### Added\n- Version consistency enforcement\n\n`;
                        const updatedContent = changelogContent.replace('# Changelog', `# Changelog${newEntry}`);
                        fs.writeFileSync(changelogPath, updatedContent);
                        fixed++;
                    } catch (error) {
                        errors.push(`Failed to fix CHANGELOG.md: ${error.message}`);
                    }
                }
            }

            // Fix README.md badge
            const readmePath = path.join(this.workspaceRoot, 'README.md');
            if (fs.existsSync(readmePath)) {
                const readmeContent = fs.readFileSync(readmePath, 'utf8');
                if (!readmeContent.includes(`version-${currentVersion}`)) {
                    try {
                        const updatedContent = readmeContent.replace(
                            /version-\d+\.\d+\.\d+/g,
                            `version-${currentVersion}`
                        );
                        fs.writeFileSync(readmePath, updatedContent);
                        fixed++;
                    } catch (error) {
                        errors.push(`Failed to fix README.md: ${error.message}`);
                    }
                }
            }

            // Fix package.json badge
            if (packageJson.badges && Array.isArray(packageJson.badges)) {
                const badge = packageJson.badges.find((b) => b.description === 'Version');
                if (badge && !badge.url.includes(`version-${currentVersion}`)) {
                    try {
                        badge.url = badge.url.replace(/version-\d+\.\d+\.\d+/, `version-${currentVersion}`);
                        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                        fixed++;
                    } catch (error) {
                        errors.push(`Failed to fix package.json badge: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            errors.push(`Error during auto-fix: ${error.message}`);
        }

        return { fixed, errors };
    }
}

// Main execution
async function main() {
    const checker = new PreCommitVersionChecker();
    await checker.run();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Pre-commit version check failed:', error.message);
        process.exit(2);
    });
}

module.exports = PreCommitVersionChecker; 