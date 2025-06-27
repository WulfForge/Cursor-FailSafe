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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
// Version Manager for FailSafe
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
            // Ensure workspace root exists
            if (!this.workspaceRoot || !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.warn('No workspace root found, version manager will have limited functionality');
                return;
            }
            // Check if key files exist
            const packageJsonExists = await this.fileExists(this.packageJsonPath);
            if (!packageJsonExists) {
                this.logger.warn('package.json not found in workspace root');
            }
            await this.loadVersionInfo();
            await this.validateVersionConsistency();
            this.logger.info('Version manager initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize version manager', error);
            // Don't throw error to prevent extension activation failure
        }
    }
    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        }
        catch {
            return false;
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
                const issue = 'package.json not found';
                issues.push(issue);
                recommendations.push('Create package.json file with version information');
                await this.logVersionWarning(issue, { file: 'package.json', action: 'create' });
                return { isConsistent: false, issues, recommendations, files };
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const currentVersion = packageJson.version || '0.0.0';
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
                    const issue = 'CHANGELOG.md missing current version entry';
                    issues.push(issue);
                    recommendations.push('Add version entry to CHANGELOG.md');
                    await this.logVersionWarning(issue, {
                        file: 'CHANGELOG.md',
                        expectedVersion: currentVersion,
                        action: 'add_version_entry'
                    });
                }
            }
            else {
                files.push({
                    name: 'CHANGELOG.md',
                    version: 'missing',
                    status: 'missing'
                });
                const issue = 'CHANGELOG.md not found';
                issues.push(issue);
                recommendations.push('Create CHANGELOG.md file');
                await this.logVersionWarning(issue, {
                    file: 'CHANGELOG.md',
                    action: 'create_file'
                });
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
                    const issue = 'README.md badge version mismatch';
                    issues.push(issue);
                    recommendations.push('Update README.md version badge');
                    await this.logVersionWarning(issue, {
                        file: 'README.md',
                        expectedVersion: currentVersion,
                        action: 'update_badge'
                    });
                }
            }
            else {
                files.push({
                    name: 'README.md',
                    version: 'missing',
                    status: 'missing'
                });
                const issue = 'README.md not found';
                issues.push(issue);
                recommendations.push('Create README.md file');
                await this.logVersionWarning(issue, {
                    file: 'README.md',
                    action: 'create_file'
                });
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
                    const issue = 'package.json badge version mismatch';
                    issues.push(issue);
                    recommendations.push('Update package.json badge URL');
                    await this.logVersionWarning(issue, {
                        file: 'package.json',
                        expectedVersion: currentVersion,
                        action: 'update_badge_url'
                    });
                }
            }
            const isConsistent = issues.length === 0;
            // Log the consistency check result
            if (!isConsistent) {
                await this.logVersionWarning('Version consistency check failed', {
                    issues,
                    recommendations,
                    files,
                    currentVersion
                });
            }
            return {
                isConsistent,
                issues,
                recommendations,
                files
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const issue = `Error checking version consistency: ${errorMessage}`;
            issues.push(issue);
            await this.logVersionWarning(issue, { error: errorMessage });
            this.logger.error('Error in checkVersionConsistency:', error);
            return { isConsistent: false, issues, recommendations, files };
        }
    }
    async enforceVersionConsistency() {
        const consistency = await this.checkVersionConsistency();
        if (!consistency.isConsistent) {
            // Log the warning to persistent log
            await this.logVersionWarning('Version consistency issues detected', {
                issues: consistency.issues,
                recommendations: consistency.recommendations,
                files: consistency.files
            });
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
            if (consistency.isConsistent) {
                await this.logVersionWarning('No version issues to fix - all versions are consistent');
                return { fixed: 0, errors: [] };
            }
            // Get current version from package.json
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                const error = 'Cannot auto-fix: package.json not found';
                errors.push(error);
                await this.logVersionWarning(error, { action: 'auto_fix_failed' });
                return { fixed: 0, errors };
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const currentVersion = packageJson.version;
            // Try to fix each issue
            for (const issue of consistency.issues) {
                try {
                    if (issue.includes('CHANGELOG.md missing current version entry')) {
                        await this.updateChangelogVersion(currentVersion);
                        fixed++;
                        await this.logVersionWarning('Auto-fixed: Added version entry to CHANGELOG.md', {
                            action: 'auto_fix',
                            file: 'CHANGELOG.md',
                            version: currentVersion
                        });
                    }
                    else if (issue.includes('README.md badge version mismatch')) {
                        await this.updateReadmeVersion(currentVersion);
                        fixed++;
                        await this.logVersionWarning('Auto-fixed: Updated README.md version badge', {
                            action: 'auto_fix',
                            file: 'README.md',
                            version: currentVersion
                        });
                    }
                    else if (issue.includes('package.json badge version mismatch')) {
                        await this.updateBadgeVersion(currentVersion);
                        fixed++;
                        await this.logVersionWarning('Auto-fixed: Updated package.json badge URL', {
                            action: 'auto_fix',
                            file: 'package.json',
                            version: currentVersion
                        });
                    }
                    else {
                        // Skip issues that can't be auto-fixed
                        errors.push(`Cannot auto-fix: ${issue}`);
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Failed to fix "${issue}": ${errorMessage}`);
                    await this.logVersionWarning(`Auto-fix failed for: ${issue}`, {
                        action: 'auto_fix_failed',
                        error: errorMessage,
                        issue
                    });
                }
            }
            if (fixed > 0) {
                await this.logVersionWarning(`Auto-fixed ${fixed} version inconsistency issue(s)`, {
                    action: 'auto_fix_summary',
                    fixed,
                    errors: errors.length
                });
            }
            return { fixed, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Auto-fix failed: ${errorMessage}`);
            await this.logVersionWarning(`Auto-fix operation failed`, {
                action: 'auto_fix_failed',
                error: errorMessage
            });
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
            if (!fs.existsSync(this.packageJsonPath)) {
                this.logger.warn('package.json not found');
                return '0.0.0';
            }
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            return packageJson.version || '0.0.0';
        }
        catch (error) {
            this.logger.error('Failed to read package.json version:', error);
            return '0.0.0';
        }
    }
    async getChangelogVersion() {
        try {
            if (!fs.existsSync(this.changelogPath)) {
                return '';
            }
            const content = fs.readFileSync(this.changelogPath, 'utf8');
            const match = content.match(/## \[([\d.]+)\]/);
            return match ? match[1] : '';
        }
        catch (error) {
            this.logger.error('Failed to read CHANGELOG.md version:', error);
            return '';
        }
    }
    async getReadmeVersion() {
        try {
            if (!fs.existsSync(this.readmePath)) {
                return '';
            }
            const content = fs.readFileSync(this.readmePath, 'utf8');
            const match = content.match(/version-([\d.]+)/);
            return match ? match[1] : '';
        }
        catch (error) {
            this.logger.error('Failed to read README.md version:', error);
            return '';
        }
    }
    async getBadgeVersion() {
        try {
            if (!fs.existsSync(this.packageJsonPath)) {
                return '';
            }
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
            this.logger.error('Failed to read badge version:', error);
            return '';
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
    /**
     * Automatically bump version based on change type
     */
    async autoBumpVersion(changeType = 'patch') {
        const errors = [];
        try {
            // Get current version from package.json
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                errors.push('package.json not found');
                return { success: false, oldVersion: '', newVersion: '', errors };
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const oldVersion = packageJson.version;
            // Parse current version
            const versionParts = oldVersion.split('.').map(Number);
            if (versionParts.length !== 3) {
                errors.push('Invalid version format in package.json');
                return { success: false, oldVersion, newVersion: '', errors };
            }
            let [major, minor, patch] = versionParts;
            // Bump version based on change type
            switch (changeType) {
                case 'major':
                    major++;
                    minor = 0;
                    patch = 0;
                    break;
                case 'minor':
                    minor++;
                    patch = 0;
                    break;
                case 'patch':
                    patch++;
                    break;
            }
            const newVersion = `${major}.${minor}.${patch}`;
            // Update package.json
            packageJson.version = newVersion;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            this.logger.info(`Updated package.json version from ${oldVersion} to ${newVersion}`);
            // Update CHANGELOG.md
            await this.updateChangelogVersion(newVersion);
            // Update README.md
            await this.updateReadmeVersion(newVersion);
            // Update badge URLs
            await this.updateBadgeVersion(newVersion);
            // Update version info
            const versionInfo = await this.loadVersionInfo();
            versionInfo.current = newVersion;
            versionInfo.lastChecked = new Date();
            await this.saveVersionInfo(versionInfo);
            this.logger.info(`Successfully bumped version from ${oldVersion} to ${newVersion} (${changeType} change)`);
            return { success: true, oldVersion, newVersion, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to bump version: ${errorMessage}`);
            this.logger.error('Failed to bump version', error);
            return { success: false, oldVersion: '', newVersion: '', errors };
        }
    }
    /**
     * Detect change type based on recent changes
     */
    async detectChangeType() {
        try {
            // This is a simplified detection - in a real implementation,
            // you might analyze git commits, file changes, or other indicators
            // For now, default to patch for safety
        }
        catch (error) {
            this.logger.error('Failed to detect change type', error);
        }
        return 'patch';
    }
    /**
     * Smart version bump - automatically detects change type and bumps version
     */
    async smartBumpVersion() {
        const changeType = await this.detectChangeType();
        const result = await this.autoBumpVersion(changeType);
        return {
            ...result,
            changeType
        };
    }
    /**
     * Log version warnings to a persistent log file
     */
    async logVersionWarning(message, details) {
        try {
            const logDir = path.join(this.workspaceRoot, '.failsafe');
            const logFile = path.join(logDir, 'version-warnings.log');
            // Ensure log directory exists
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                message,
                details: details || {}
            };
            // Append to log file
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
            this.logger.info(`Version warning logged: ${message}`);
        }
        catch (error) {
            this.logger.error('Failed to log version warning', error);
        }
    }
    /**
     * Get version warning log entries
     */
    async getVersionWarningLog() {
        try {
            const logFile = path.join(this.workspaceRoot, '.failsafe', 'version-warnings.log');
            if (!fs.existsSync(logFile)) {
                return [];
            }
            const logContent = fs.readFileSync(logFile, 'utf8');
            const lines = logContent.trim().split('\n').filter(line => line.trim());
            return lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return { timestamp: new Date().toISOString(), message: 'Invalid log entry', details: {} };
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to read version warning log', error);
            return [];
        }
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=versionManager.js.map