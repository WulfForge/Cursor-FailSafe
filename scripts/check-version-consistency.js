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
    'README.md'
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
        pattern: /### v(\d+\.\d+\.\d+)/,
        description: 'README.md version history'
    }
};

// Badge URL pattern in package.json
const BADGE_PATTERN = /version-(\d+\.\d+\.\d+)/;

class VersionChecker {
    constructor() {
        this.issues = [];
        this.recommendations = [];
        this.versions = new Map();
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

            const match = content.match(pattern.pattern);
            if (match) {
                this.versions.set(filePath, match[1]);
                console.log(`✅ ${pattern.description}: ${match[1]}`);
            } else {
                this.issues.push(`No version found in ${filePath}`);
            }
        } catch (error) {
            this.issues.push(`Error reading ${filePath}: ${error.message}`);
        }
    }

    async checkBadgeVersion() {
        try {
            const content = fs.readFileSync('package.json', 'utf8');
            const packageJson = JSON.parse(content);
            const badgeUrl = packageJson.badges?.[0]?.url || '';
            
            const match = badgeUrl.match(BADGE_PATTERN);
            if (match) {
                this.versions.set('badge', match[1]);
                console.log(`✅ Badge URL version: ${match[1]}`);
            } else {
                this.issues.push('No version found in badge URL');
            }
        } catch (error) {
            this.issues.push(`Error checking badge version: ${error.message}`);
        }
    }

    validateConsistency() {
        const versions = Array.from(this.versions.values());
        const uniqueVersions = [...new Set(versions)];

        if (uniqueVersions.length > 1) {
            this.issues.push(`Version mismatch detected: ${uniqueVersions.join(', ')}`);
            this.recommendations.push('All version references must match');
        }

        // Check if package.json version is the latest
        const packageVersion = this.versions.get('package.json');
        const changelogVersion = this.versions.get('CHANGELOG.md');
        
        if (packageVersion && changelogVersion && packageVersion !== changelogVersion) {
            this.recommendations.push('Update CHANGELOG.md to match package.json version');
        }

        if (packageVersion && this.versions.get('README.md') && packageVersion !== this.versions.get('README.md')) {
            this.recommendations.push('Update README.md version history to match package.json version');
        }

        if (packageVersion && this.versions.get('badge') && packageVersion !== this.versions.get('badge')) {
            this.recommendations.push('Update badge URL in package.json to match current version');
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

        const packageVersion = this.versions.get('package.json');
        if (!packageVersion) {
            console.log('❌ Cannot auto-fix: No package.json version found');
            return false;
        }

        try {
            // Fix CHANGELOG.md
            await this.fixChangelogVersion(packageVersion);
            
            // Fix README.md
            await this.fixReadmeVersion(packageVersion);
            
            // Fix badge URL
            await this.fixBadgeVersion(packageVersion);

            console.log('✅ Version consistency issues auto-fixed!');
            return true;
        } catch (error) {
            console.log(`❌ Auto-fix failed: ${error.message}`);
            return false;
        }
    }

    async fixChangelogVersion(version) {
        try {
            let content = fs.readFileSync('CHANGELOG.md', 'utf8');
            content = content.replace(/## \[(\d+\.\d+\.\d+)\]/g, `## [${version}]`);
            fs.writeFileSync('CHANGELOG.md', content);
            console.log(`✅ Updated CHANGELOG.md to version ${version}`);
        } catch (error) {
            throw new Error(`Failed to update CHANGELOG.md: ${error.message}`);
        }
    }

    async fixReadmeVersion(version) {
        try {
            let content = fs.readFileSync('README.md', 'utf8');
            content = content.replace(/### v(\d+\.\d+\.\d+)/g, `### v${version}`);
            fs.writeFileSync('README.md', content);
            console.log(`✅ Updated README.md to version ${version}`);
        } catch (error) {
            throw new Error(`Failed to update README.md: ${error.message}`);
        }
    }

    async fixBadgeVersion(version) {
        try {
            const content = fs.readFileSync('package.json', 'utf8');
            const packageJson = JSON.parse(content);
            
            if (packageJson.badges && packageJson.badges.length > 0) {
                packageJson.badges[0].url = `https://img.shields.io/badge/version-${version}-blue.svg`;
                fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
                console.log(`✅ Updated badge URL to version ${version}`);
            }
        } catch (error) {
            throw new Error(`Failed to update badge URL: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const checker = new VersionChecker();
    const shouldFix = process.argv.includes('--fix');

    const isConsistent = await checker.checkConsistency();

    if (!isConsistent && shouldFix) {
        await checker.autoFix();
        // Re-check after fixing
        await checker.checkConsistency();
    }

    // Exit with error code if issues remain
    process.exit(isConsistent ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Version check failed:', error.message);
        process.exit(1);
    });
}

module.exports = VersionChecker; 