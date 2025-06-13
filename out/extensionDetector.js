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
exports.ExtensionDetector = void 0;
const vscode = __importStar(require("vscode"));
class ExtensionDetector {
    constructor(logger) {
        this.installedExtensions = new Map();
        this.extensionCommands = new Map();
        this.logger = logger;
        this.detectInstalledExtensions();
    }
    /**
     * Detect all installed extensions and their capabilities
     */
    detectInstalledExtensions() {
        try {
            const extensions = vscode.extensions.all;
            for (const extension of extensions) {
                const info = {
                    id: extension.id,
                    name: extension.packageJSON.name || extension.id,
                    version: extension.packageJSON.version || 'unknown',
                    publisher: extension.packageJSON.publisher || 'unknown',
                    description: extension.packageJSON.description,
                    isActive: extension.isActive
                };
                // Extract commands from package.json
                if (extension.packageJSON.contributes?.commands) {
                    const commandList = extension.packageJSON.contributes.commands;
                    const commands = commandList.map(cmd => cmd.command);
                    this.extensionCommands.set(extension.id, commands);
                    info.commands = commands.map(cmd => ({ command: cmd, title: cmd }));
                }
                this.installedExtensions.set(extension.id, info);
            }
            this.logger.info(`Detected ${this.installedExtensions.size} installed extensions`);
        }
        catch (error) {
            this.logger.error('Failed to detect extensions', error);
        }
    }
    /**
     * Check if a specific extension is installed
     */
    isExtensionInstalled(extensionId) {
        return this.installedExtensions.has(extensionId);
    }
    /**
     * Get information about a specific extension
     */
    getExtensionInfo(extensionId) {
        return this.installedExtensions.get(extensionId);
    }
    /**
     * Check if a specific command is available from any extension
     */
    isCommandAvailable(commandId) {
        for (const [extensionId, commands] of this.extensionCommands) {
            if (commands.includes(commandId)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get which extension provides a specific command
     */
    getCommandProvider(commandId) {
        for (const [extensionId, commands] of this.extensionCommands) {
            if (commands.includes(commandId)) {
                return extensionId;
            }
        }
        return undefined;
    }
    /**
     * Get all available commands from installed extensions
     */
    getAllAvailableCommands() {
        return new Map(this.extensionCommands);
    }
    /**
     * Validate that a request uses only available extensions and commands
     */
    validateExtensionUsage(request) {
        const issues = [];
        const suggestions = [];
        const availableExtensions = [];
        const missingExtensions = [];
        // Common extension patterns to look for
        const extensionPatterns = [
            /typescript\.\w+/g,
            /cursor\.\w+/g,
            /github\.\w+/g,
            /microsoft\.\w+/g,
            /[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+/g
        ];
        // Extract potential extension references
        const foundExtensions = new Set();
        const foundCommands = new Set();
        for (const pattern of extensionPatterns) {
            const matches = request.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match.includes('.')) {
                        foundExtensions.add(match);
                        foundCommands.add(match);
                    }
                });
            }
        }
        // Validate each found extension/command
        for (const extensionOrCommand of foundExtensions) {
            if (this.isExtensionInstalled(extensionOrCommand)) {
                availableExtensions.push(extensionOrCommand);
            }
            else if (this.isCommandAvailable(extensionOrCommand)) {
                const provider = this.getCommandProvider(extensionOrCommand);
                if (provider) {
                    availableExtensions.push(provider);
                }
            }
            else {
                missingExtensions.push(extensionOrCommand);
                issues.push(`Extension or command '${extensionOrCommand}' is not available`);
                suggestions.push(`Check if '${extensionOrCommand}' is installed and enabled`);
            }
        }
        // Special validation for TypeScript extension
        if (request.toLowerCase().includes('typescript') || request.toLowerCase().includes('ts')) {
            if (!this.isExtensionInstalled('ms-vscode.vscode-typescript-next')) {
                issues.push('TypeScript extension is not installed');
                suggestions.push('Install the TypeScript extension to use TypeScript capabilities');
            }
            else {
                const tsInfo = this.getExtensionInfo('ms-vscode.vscode-typescript-next');
                if (tsInfo && !tsInfo.isActive) {
                    issues.push('TypeScript extension is installed but not active');
                    suggestions.push('Enable the TypeScript extension in VS Code');
                }
                else {
                    // Add TypeScript to available extensions if it's mentioned and available
                    if (!availableExtensions.includes('ms-vscode.vscode-typescript-next')) {
                        availableExtensions.push('ms-vscode.vscode-typescript-next');
                    }
                }
            }
        }
        return {
            isValid: issues.length === 0,
            issues,
            suggestions,
            availableExtensions,
            missingExtensions
        };
    }
    /**
     * Get a summary of installed extensions for validation
     */
    getExtensionSummary() {
        const extensionList = Array.from(this.installedExtensions.values());
        const activeExtensions = extensionList.filter(ext => ext.isActive).length;
        return {
            totalExtensions: extensionList.length,
            activeExtensions,
            extensionList
        };
    }
    /**
     * Refresh extension detection (useful when extensions are installed/removed)
     */
    refreshExtensions() {
        this.installedExtensions.clear();
        this.extensionCommands.clear();
        this.detectInstalledExtensions();
    }
}
exports.ExtensionDetector = ExtensionDetector;
//# sourceMappingURL=extensionDetector.js.map