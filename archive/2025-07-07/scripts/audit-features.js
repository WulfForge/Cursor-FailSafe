#!/usr/bin/env node

/**
 * FailSafe Feature Audit Script
 * 
 * This script audits all features mentioned in documentation and UI
 * to identify what's actually implemented vs what's missing.
 * 
 * Usage:
 *   node scripts/audit-features.js
 */

const fs = require('fs');
const path = require('path');

class FeatureAuditor {
    constructor() {
        this.auditResults = {
            implemented: [],
            missing: [],
            partiallyImplemented: [],
            mismatched: []
        };
    }

    async runAudit() {
        console.log('🔍 FailSafe Feature Audit\n');
        console.log('='.repeat(60));

        // Audit package.json commands vs actual implementation
        await this.auditCommands();
        
        // Audit README features vs implementation
        await this.auditReadmeFeatures();
        
        // Audit UI features vs implementation
        await this.auditUIFeatures();
        
        // Audit configuration options vs implementation
        await this.auditConfiguration();
        
        // Audit auto-versioning features
        await this.auditAutoVersioning();
        
        // Generate report
        this.generateReport();
    }

    async auditCommands() {
        console.log('\n📋 Auditing Commands...');
        
        // Read package.json commands
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const declaredCommands = packageJson.contributes.commands.map(cmd => cmd.command);
        
        // Read actual command implementations
        const commandsFile = fs.readFileSync('src/commands.ts', 'utf8');
        const uiFile = fs.readFileSync('src/ui.ts', 'utf8');
        
        // Check each declared command
        for (const command of declaredCommands) {
            const commandName = command.replace('failsafe.', '');
            const isImplemented = this.checkCommandImplementation(commandName, commandsFile, uiFile);
            
            if (isImplemented) {
                this.auditResults.implemented.push(`Command: ${command}`);
            } else {
                this.auditResults.missing.push(`Command: ${command} - Declared but not implemented`);
            }
        }

        // Check for commands mentioned in UI but not in package.json
        const uiCommands = this.extractUICommands(uiFile);
        for (const uiCommand of uiCommands) {
            if (!declaredCommands.includes(uiCommand)) {
                this.auditResults.mismatched.push(`UI Command: ${uiCommand} - Implemented but not declared in package.json`);
            }
        }
    }

    checkCommandImplementation(commandName, commandsFile, uiFile) {
        const patterns = [
            new RegExp(`async ${commandName.replace(/([A-Z])/g, '_$1').toLowerCase()}`),
            new RegExp(`async ${commandName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}`),
            new RegExp(`async ${commandName}`),
            new RegExp(`private async ${commandName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}`),
            new RegExp(`public async ${commandName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}`)
        ];

        return patterns.some(pattern => 
            pattern.test(commandsFile) || pattern.test(uiFile)
        );
    }

    extractUICommands(uiFile) {
        const commandMatches = uiFile.match(/async ([a-zA-Z]+)\(\)/g) || [];
        return commandMatches.map(match => {
            const commandName = match.match(/async ([a-zA-Z]+)\(\)/)[1];
            return `failsafe.${commandName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}`;
        });
    }

    async auditReadmeFeatures() {
        console.log('\n📖 Auditing README Features...');
        
        const readmeContent = fs.readFileSync('README.md', 'utf8');
        
        // Extract features mentioned in README
        const features = this.extractReadmeFeatures(readmeContent);
        
        for (const feature of features) {
            const isImplemented = this.checkFeatureImplementation(feature);
            
            if (isImplemented) {
                this.auditResults.implemented.push(`README Feature: ${feature}`);
            } else {
                this.auditResults.missing.push(`README Feature: ${feature} - Mentioned but not implemented`);
            }
        }
    }

    extractReadmeFeatures(readmeContent) {
        const features = [];
        
        // Extract bullet points and feature descriptions
        const bulletMatches = readmeContent.match(/- \*\*([^:]+):\*\* ([^\n]+)/g) || [];
        bulletMatches.forEach(match => {
            const featureName = match.match(/- \*\*([^:]+):\*\*/)[1];
            features.push(featureName.trim());
        });

        // Extract section headers
        const headerMatches = readmeContent.match(/### ([^\n]+)/g) || [];
        headerMatches.forEach(match => {
            const featureName = match.replace('### ', '').trim();
            features.push(featureName);
        });

        return [...new Set(features)]; // Remove duplicates
    }

    checkFeatureImplementation(feature) {
        const sourceFiles = [
            'src/commands.ts',
            'src/ui.ts',
            'src/projectPlan.ts',
            'src/taskEngine.ts',
            'src/validator.ts'
        ];

        for (const file of sourceFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.toLowerCase().includes(feature.toLowerCase())) {
                    return true;
                }
            }
        }

        return false;
    }

    async auditUIFeatures() {
        console.log('\n🎨 Auditing UI Features...');
        
        const uiFile = fs.readFileSync('src/ui.ts', 'utf8');
        
        // Extract UI methods
        const uiMethods = uiFile.match(/public async ([a-zA-Z]+)\(\)/g) || [];
        
        for (const method of uiMethods) {
            const methodName = method.match(/public async ([a-zA-Z]+)\(\)/)[1];
            const isExposed = this.checkUIMethodExposure(methodName);
            
            if (isExposed) {
                this.auditResults.implemented.push(`UI Method: ${methodName}`);
            } else {
                this.auditResults.partiallyImplemented.push(`UI Method: ${methodName} - Implemented but not exposed via command`);
            }
        }
    }

    checkUIMethodExposure(methodName) {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const declaredCommands = packageJson.contributes.commands.map(cmd => cmd.command);
        
        const commandName = `failsafe.${methodName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}`;
        return declaredCommands.includes(commandName);
    }

    async auditConfiguration() {
        console.log('\n⚙️ Auditing Configuration...');
        
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const configOptions = packageJson.contributes.configuration.properties;
        
        for (const [key, config] of Object.entries(configOptions)) {
            const isImplemented = this.checkConfigImplementation(key);
            
            if (isImplemented) {
                this.auditResults.implemented.push(`Config: ${key}`);
            } else {
                this.auditResults.missing.push(`Config: ${key} - Declared but not used in code`);
            }
        }
    }

    checkConfigImplementation(configKey) {
        const sourceFiles = [
            'src/commands.ts',
            'src/ui.ts',
            'src/projectPlan.ts',
            'src/taskEngine.ts'
        ];

        for (const file of sourceFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes(configKey)) {
                    return true;
                }
            }
        }

        return false;
    }

    async auditAutoVersioning() {
        console.log('\n🔄 Auditing Auto-Versioning...');
        
        const autoVersioningFeatures = [
            'VersionManager class',
            'checkVersionConsistency',
            'enforceVersionConsistency',
            'autoFixVersionIssues',
            'pre-commit script',
            'version consistency checking'
        ];

        for (const feature of autoVersioningFeatures) {
            const isImplemented = this.checkAutoVersioningImplementation(feature);
            
            if (isImplemented) {
                this.auditResults.implemented.push(`Auto-Versioning: ${feature}`);
            } else {
                this.auditResults.missing.push(`Auto-Versioning: ${feature} - Mentioned but not implemented`);
            }
        }
    }

    checkAutoVersioningImplementation(feature) {
        const files = [
            'src/versionManager.ts',
            'scripts/check-version-consistency.js',
            'package.json'
        ];

        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.toLowerCase().includes(feature.toLowerCase())) {
                    return true;
                }
            }
        }

        return false;
    }

    generateReport() {
        console.log('\n📊 AUDIT REPORT');
        console.log('='.repeat(60));

        console.log(`\n✅ IMPLEMENTED (${this.auditResults.implemented.length}):`);
        this.auditResults.implemented.forEach(item => {
            console.log(`  • ${item}`);
        });

        console.log(`\n❌ MISSING (${this.auditResults.missing.length}):`);
        this.auditResults.missing.forEach(item => {
            console.log(`  • ${item}`);
        });

        console.log(`\n⚠️ PARTIALLY IMPLEMENTED (${this.auditResults.partiallyImplemented.length}):`);
        this.auditResults.partiallyImplemented.forEach(item => {
            console.log(`  • ${item}`);
        });

        console.log(`\n🔀 MISMATCHED (${this.auditResults.mismatched.length}):`);
        this.auditResults.mismatched.forEach(item => {
            console.log(`  • ${item}`);
        });

        console.log('\n📈 SUMMARY:');
        const total = this.auditResults.implemented.length + this.auditResults.missing.length + 
                     this.auditResults.partiallyImplemented.length + this.auditResults.mismatched.length;
        
        console.log(`  Total Features: ${total}`);
        console.log(`  Implemented: ${this.auditResults.implemented.length} (${Math.round(this.auditResults.implemented.length/total*100)}%)`);
        console.log(`  Missing: ${this.auditResults.missing.length} (${Math.round(this.auditResults.missing.length/total*100)}%)`);
        console.log(`  Partially Implemented: ${this.auditResults.partiallyImplemented.length} (${Math.round(this.auditResults.partiallyImplemented.length/total*100)}%)`);
        console.log(`  Mismatched: ${this.auditResults.mismatched.length} (${Math.round(this.auditResults.mismatched.length/total*100)}%)`);

        if (this.auditResults.missing.length > 0) {
            console.log('\n🚨 CRITICAL: Missing features detected!');
            console.log('These features are mentioned in documentation but not implemented.');
        }

        if (this.auditResults.mismatched.length > 0) {
            console.log('\n⚠️ WARNING: Mismatched features detected!');
            console.log('These features are implemented but not properly declared.');
        }
    }
}

// Main execution
async function main() {
    const auditor = new FeatureAuditor();
    await auditor.runAudit();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Feature audit failed:', error.message);
        process.exit(1);
    });
}

module.exports = FeatureAuditor; 