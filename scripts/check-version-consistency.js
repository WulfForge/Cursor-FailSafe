#!/usr/bin/env node

/**
 * Version Consistency Checker
 * 
 * This script checks that all version references across the project are consistent.
 * It can be used as a pre-commit hook or run manually.
 * 
 * Usage:
 *   node scripts/check-version-consistency.js
 *   node scripts/check-version-consistency.js --fix
 */

const fs = require('fs');
const path = require('path');

// Files to check for version consistency
const FILES_TO_CHECK = [
    'package.json',
    'CHANGELOG.md',
    'README.md',
    'src/ui.ts',
    'FEATURE_TESTING_CHECKLIST.md',
    'ALPHA_LAUNCH_SPRINT_PLAN.md'
];

// Version patterns to match
const VERSION_PATTERNS = {
    'package.json': {
        pattern: /"version":\s*"(\d+\.\d+\.\d+)"/,
        description: 'package.json version field'
    },
    'CHANGELOG.md': {
        pattern: /## \[(\d+\.\d+\.\d+)\]/,
        description: 'CHANGELOG.md latest version'
    },
    'README.md': {
        pattern: /version-(\d+\.\d+\.\d+)/,
        description: 'README.md version badge'
    },
    'src/ui.ts': {
        pattern: /(\d+\.\d+\.\d+)/,
        description: 'src/ui.ts version references',
        multiple: true
    },
    'FEATURE_TESTING_CHECKLIST.md': {
        pattern: /\*\*Version:\*\*\s*(\d+\.\d+\.\d+)/,
        description: 'FEATURE_TESTING_CHECKLIST.md version'
    },
    'ALPHA_LAUNCH_SPRINT_PLAN.md': {
        pattern: /(\d+\.\d+\.\d+)/,
        description: 'ALPHA_LAUNCH_SPRINT_PLAN.md version references',
        multiple: true
    }
};

// Badge URL pattern in package.json
const BADGE_PATTERN = /version-(\d+\.\d+\.\d+)/;

class VersionChecker {
    constructor() {
        this.issues = [];
        this.recommendations = [];
        this.versions = new Map();
        this.versionLocations = new Map();
    }

    async checkConsistency() {
        console.log('🔍 Checking version consistency...\n');

        // Extract versions from all files
        for (const file of FILES_TO_CHECK) {
            await this.extractVersion(file);
        }

        // Check badge URL in package.json
        await this.checkBadgeVersion();

        // Validate consistency
        this.validateConsistency();

        // Report results
        this.reportResults();

        return this.issues.length === 0;
    }

    async extractVersion(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                this.issues.push(`File not found: ${filePath}`);
                return;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const pattern = VERSION_PATTERNS[filePath];
            
            if (!pattern) {
                this.issues.push(`No version pattern defined for: ${filePath}`);
                return;
            }

            if (pattern.multiple) {
                // Handle files with multiple version references
                const matches = content.matchAll(new RegExp(pattern.pattern, 'g'));
                const versions = [];
                for (const match of matches) {
                    versions.push(match[1]);
                }
                if (versions.length > 0) {
                    this.versions.set(filePath, versions);
                    this.versionLocations.set(filePath, versions);
                    console.log(`✅ ${pattern.description}: ${versions.join(', ')}`);
                } else {
                    this.issues.push(`No version found in ${filePath}`);
                }
            } else {
                const match = content.match(pattern.pattern);
                if (match) {
                    this.versions.set(filePath, match[1]);
                    this.versionLocations.set(filePath, [match[1]]);
                    console.log(`✅ ${pattern.description}: ${match[1]}`);
                } else {
                    this.issues.push(`No version found in ${filePath}`);
                }
            }
        } catch (error) {
            this.issues.push(`Error reading ${filePath}: ${error.message}`);
        }
    }

    async checkBadgeVersion() {
        try {
            const content = fs.readFileSync('package.json', 'utf8');
            const packageJson = JSON.parse(content);
            
            // Check badges array if it exists
            if (packageJson.badges && packageJson.badges.length > 0) {
                const badgeUrl = packageJson.badges[0].url || '';
                const match = badgeUrl.match(BADGE_PATTERN);
                if (match) {
                    this.versions.set('badge', match[1]);
                    this.versionLocations.set('badge', [match[1]]);
                    console.log(`✅ Badge URL version: ${match[1]}`);
                } else {
                    this.issues.push('No version found in badge URL');
                }
            }
        } catch (error) {
            this.issues.push(`Error checking badge version: ${error.message}`);
        }
    }

    validateConsistency() {
        const allVersions = [];
        
        // Collect all versions
        for (const [file, versions] of this.versions) {
            if (Array.isArray(versions)) {
                allVersions.push(...versions);
            } else {
                allVersions.push(versions);
            }
        }
        
        const uniqueVersions = [...new Set(allVersions)];

        if (uniqueVersions.length > 1) {
            this.issues.push(`Version mismatch detected: ${uniqueVersions.join(', ')}`);
            this.recommendations.push('All version references must match');
        }

        // Check specific file consistency
        const packageVersion = this.versions.get('package.json');
        
        for (const [file, versions] of this.versions) {
            if (file === 'package.json') continue;
            
            if (Array.isArray(versions)) {
                if (!versions.every(v => v === packageVersion)) {
                    this.recommendations.push(`Update ${file} to match package.json version ${packageVersion}`);
                }
            } else if (versions !== packageVersion) {
                this.recommendations.push(`Update ${file} to match package.json version ${packageVersion}`);
            }
        }
    }

    reportResults() {
        console.log('\n📊 Version Consistency Report');
        console.log('='.repeat(50));

        if (this.issues.length === 0) {
            console.log('✅ All versions are consistent!');
            return;
        }

        console.log('❌ Version consistency issues found:');
        this.issues.forEach(issue => {
            console.log(`  • ${issue}`);
        });

        if (this.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            this.recommendations.forEach(rec => {
                console.log(`  • ${rec}`);
            });
        }

        console.log('\n🔧 To fix automatically, run:');
        console.log('  node scripts/check-version-consistency.js --fix');
    }

    async autoFix() {
        console.log('🔧 Auto-fixing version consistency issues...\n');

        // Get package.json version directly
        let packageVersion;
        try {
            const packageContent = fs.readFileSync('package.json', 'utf8');
            const packageJson = JSON.parse(packageContent);
            packageVersion = packageJson.version;
        } catch (error) {
            console.log('❌ Cannot auto-fix: Error reading package.json version');
            return false;
        }

        if (!packageVersion) {
            console.log('❌ Cannot auto-fix: No package.json version found');
            return false;
        }

        console.log(`📦 Using package.json version: ${packageVersion}\n`);

        try {
            // Fix all files
            for (const file of FILES_TO_CHECK) {
                await this.fixFileVersion(file, packageVersion);
            }
            
            // Fix badge URL
            await this.fixBadgeVersion(packageVersion);

            console.log('✅ Version consistency issues auto-fixed!');
            return true;
        } catch (error) {
            console.log(`❌ Auto-fix failed: ${error.message}`);
            return false;
        }
    }

    async fixFileVersion(filePath, version) {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  File not found: ${filePath}`);
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');
            const pattern = VERSION_PATTERNS[filePath];
            
            if (!pattern) {
                console.log(`⚠️  No pattern defined for: ${filePath}`);
                return;
            }

            let updated = false;

            if (filePath === 'CHANGELOG.md') {
                // Fix changelog version headers
                const newContent = content.replace(/## \[(\d+\.\d+\.\d+)\]/g, (match, oldVersion) => {
                    if (oldVersion !== version) {
                        updated = true;
                        return `## [${version}]`;
                    }
                    return match;
                });
                if (updated) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Updated ${filePath} to version ${version}`);
                }
            } else if (filePath === 'README.md') {
                // Fix README badge
                const newContent = content.replace(/version-(\d+\.\d+\.\d+)/g, (match, oldVersion) => {
                    if (oldVersion !== version) {
                        updated = true;
                        return `version-${version}`;
                    }
                    return match;
                });
                if (updated) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Updated ${filePath} to version ${version}`);
                }
            } else if (filePath === 'src/ui.ts') {
                // Fix UI version references
                const newContent = content.replace(/(\d+\.\d+\.\d+)/g, (match, oldVersion) => {
                    if (oldVersion !== version) {
                        updated = true;
                        return version;
                    }
                    return match;
                });
                if (updated) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Updated ${filePath} to version ${version}`);
                }
            } else if (filePath === 'FEATURE_TESTING_CHECKLIST.md') {
                // Fix feature testing checklist version
                const newContent = content.replace(/\*\*Version:\*\*\s*(\d+\.\d+\.\d+)/g, (match, oldVersion) => {
                    if (oldVersion !== version) {
                        updated = true;
                        return `**Version:** ${version}`;
                    }
                    return match;
                });
                if (updated) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Updated ${filePath} to version ${version}`);
                }
            } else if (filePath === 'ALPHA_LAUNCH_SPRINT_PLAN.md') {
                // Fix sprint plan version references
                const newContent = content.replace(/(\d+\.\d+\.\d+)/g, (match, oldVersion) => {
                    if (oldVersion !== version) {
                        updated = true;
                        return version;
                    }
                    return match;
                });
                if (updated) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Updated ${filePath} to version ${version}`);
                }
            }
        } catch (error) {
            console.log(`❌ Failed to update ${filePath}: ${error.message}`);
        }
    }

    async fixBadgeVersion(version) {
        try {
            const content = fs.readFileSync('package.json', 'utf8');
            const packageJson = JSON.parse(content);
            
            if (packageJson.badges && packageJson.badges.length > 0) {
                const currentUrl = packageJson.badges[0].url;
                const newUrl = `https://img.shields.io/badge/version-${version}-blue.svg`;
                
                if (currentUrl !== newUrl) {
                    packageJson.badges[0].url = newUrl;
                    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
                    console.log(`✅ Updated badge URL to version ${version}`);
                }
            }
        } catch (error) {
            console.log(`❌ Failed to update badge URL: ${error.message}`);
        }
    }
}

async function main() {
    const checker = new VersionChecker();
    
    if (process.argv.includes('--fix')) {
        const success = await checker.autoFix();
        process.exit(success ? 0 : 1);
    } else {
        const isConsistent = await checker.checkConsistency();
        process.exit(isConsistent ? 0 : 1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = VersionChecker; 
