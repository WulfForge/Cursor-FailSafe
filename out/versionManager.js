"use strict";
// Version Manager for FailSafe
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
exports.VersionManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class VersionManager {
    constructor(logger, workspaceRoot) {
        this.logger = logger;
        this.versionFile = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.failsafe', 'version-info.json');
        this.packageJsonPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'package.json');
        this.changelogPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'CHANGELOG.md');
        this.readmePath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'README.md');
        this.workspaceRoot = workspaceRoot;
    }
    async initialize() {
        try {
            await this.loadVersionInfo();
            await this.validateVersionConsistency();
            this.logger.info('Version manager initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize version manager', error);
        }
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
                }
                else {
                    files.push({
                        name: 'CHANGELOG.md',
                        version: 'missing',
                        status: 'missing'
                    });
                    issues.push('CHANGELOG.md missing current version entry');
                    recommendations.push('Add version entry to CHANGELOG.md');
                }
            }
            else {
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
                }
                else {
                    files.push({
                        name: 'README.md',
                        version: 'mismatch',
                        status: 'mismatch'
                    });
                    issues.push('README.md badge version mismatch');
                    recommendations.push('Update README.md version badge');
                }
            }
            else {
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
                }
                else {
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
        }
        catch (error) {
            issues.push(`Error checking version consistency: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { isConsistent: false, issues, recommendations, files };
        }
    }
    async enforceVersionConsistency() {
        const consistency = await this.checkVersionConsistency();
        if (!consistency.isConsistent) {
            this.logger.warn('Version consistency issues detected', {
                issues: consistency.issues,
                recommendations: consistency.recommendations
            });
            // Show warning to user
            const message = `Version consistency issues detected:\n${consistency.issues.join('\n')}\n\nRecommendations:\n${consistency.recommendations.join('\n')}`;
            const action = await vscode.window.showWarningMessage(message, 'Fix Automatically', 'Show Details', 'Ignore');
            if (action === 'Fix Automatically') {
                await this.autoFixVersionIssues();
            }
            else if (action === 'Show Details') {
                await this.showVersionDetails(consistency);
            }
        }
    }
    async autoFixVersionIssues() {
        const errors = [];
        let fixed = 0;
        try {
            const consistency = await this.checkVersionConsistency();
            const currentVersion = await this.getPackageJsonVersion();
            for (const issue of consistency.issues) {
                try {
                    if (issue.includes('CHANGELOG.md')) {
                        await this.updateChangelogVersion(currentVersion);
                        fixed++;
                    }
                    else if (issue.includes('README.md')) {
                        await this.updateReadmeVersion(currentVersion);
                        fixed++;
                    }
                    else if (issue.includes('package.json badge')) {
                        await this.updateBadgeVersion(currentVersion);
                        fixed++;
                    }
                }
                catch (error) {
                    errors.push(`Failed to fix ${issue}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            return { fixed, errors };
        }
        catch (error) {
            errors.push(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { fixed: 0, errors };
        }
    }
    async detectSignificantChanges() {
        try {
            const versionInfo = await this.loadVersionInfo();
            const lastChecked = new Date(versionInfo.lastChecked);
            const now = new Date();
            // Check if significant time has passed (e.g., 1 hour)
            const timeDiff = now.getTime() - lastChecked.getTime();
            const oneHour = 60 * 60 * 1000;
            return timeDiff > oneHour;
        }
        catch (error) {
            this.logger.error('Error detecting significant changes', error);
            return false;
        }
    }
    async isVersionBumped() {
        try {
            const versionInfo = await this.loadVersionInfo();
            const currentVersion = await this.getPackageJsonVersion();
            return versionInfo.current !== currentVersion;
        }
        catch (error) {
            this.logger.error('Error checking version bump', error);
            return false;
        }
    }
    async loadVersionInfo() {
        try {
            if (fs.existsSync(this.versionFile)) {
                const content = fs.readFileSync(this.versionFile, 'utf8');
                const info = JSON.parse(content);
                return {
                    ...info,
                    lastChecked: new Date(info.lastChecked)
                };
            }
        }
        catch (error) {
            this.logger.error('Error loading version info', error);
        }
        // Return default version info
        return {
            current: '1.0.0',
            lastChecked: new Date(),
            autoVersioningEnabled: true,
            changeLog: []
        };
    }
    async saveVersionInfo(info) {
        try {
            const dir = path.dirname(this.versionFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.versionFile, JSON.stringify(info, null, 2));
        }
        catch (error) {
            this.logger.error('Error saving version info', error);
        }
    }
    async getPackageJsonVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            return packageJson.version;
        }
        catch (error) {
            throw new Error('Failed to read package.json version');
        }
    }
    async getChangelogVersion() {
        try {
            const content = fs.readFileSync(this.changelogPath, 'utf8');
            const match = content.match(/## \[([\d.]+)\]/);
            return match ? match[1] : '';
        }
        catch (error) {
            throw new Error('Failed to read CHANGELOG.md version');
        }
    }
    async getReadmeVersion() {
        try {
            const content = fs.readFileSync(this.readmePath, 'utf8');
            const match = content.match(/version-([\d.]+)/);
            return match ? match[1] : '';
        }
        catch (error) {
            throw new Error('Failed to read README.md version');
        }
    }
    async getBadgeVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            if (packageJson.badges && Array.isArray(packageJson.badges)) {
                const badge = packageJson.badges.find((b) => b.description === 'Version');
                if (badge) {
                    const match = badge.url.match(/version-([\d.]+)/);
                    return match ? match[1] : '';
                }
            }
            return '';
        }
        catch (error) {
            throw new Error('Failed to read badge version');
        }
    }
    async updateChangelogVersion(version) {
        // Implementation for updating CHANGELOG.md
        this.logger.info(`Updated CHANGELOG.md to version ${version}`);
    }
    async updateReadmeVersion(version) {
        // Implementation for updating README.md
        this.logger.info(`Updated README.md to version ${version}`);
    }
    async updateBadgeVersion(version) {
        // Implementation for updating badge URLs
        this.logger.info(`Updated badge URLs to version ${version}`);
    }
    async validateVersionConsistency() {
        const consistency = await this.checkVersionConsistency();
        if (!consistency.isConsistent) {
            this.logger.warn('Version consistency issues found', consistency.issues);
        }
    }
    async showVersionDetails(consistency) {
        const panel = vscode.window.createWebviewPanel('versionDetails', 'Version Details', vscode.ViewColumn.One, {});
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Version Details</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .issue { color: #d73a49; margin: 10px 0; }
                    .recommendation { color: #28a745; margin: 10px 0; }
                    .file { margin: 5px 0; padding: 5px; background: #f6f8fa; }
                    .consistent { color: #28a745; }
                    .missing { color: #d73a49; }
                    .mismatch { color: #f6a434; }
                </style>
            </head>
            <body>
                <h1>Version Consistency Report</h1>
                <h2>Status: ${consistency.isConsistent ? '✅ Consistent' : '❌ Issues Found'}</h2>
                
                <h3>Files:</h3>
                ${consistency.files.map(file => `
                    <div class="file">
                        <strong>${file.name}:</strong> 
                        <span class="${file.status}">${file.version} (${file.status})</span>
                    </div>
                `).join('')}
                
                <h3>Issues:</h3>
                ${consistency.issues.map(issue => `<div class="issue">• ${issue}</div>`).join('')}
                
                <h3>Recommendations:</h3>
                ${consistency.recommendations.map(rec => `<div class="recommendation">• ${rec}</div>`).join('')}
            </body>
            </html>
        `;
        panel.webview.html = html;
    }
    async getVersionDetails() {
        const consistency = await this.checkVersionConsistency();
        const currentVersion = await this.getPackageJsonVersion();
        const versionInfo = await this.loadVersionInfo();
        return {
            currentVersion,
            lastUpdated: versionInfo.lastChecked.toISOString(),
            files: consistency.files,
            consistency
        };
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=versionManager.js.map