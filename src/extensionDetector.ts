import * as vscode from 'vscode';
import { Logger } from './logger';

export interface ExtensionInfo {
    id: string;
    name: string;
    version: string;
    publisher: string;
    description?: string;
    commands?: vscode.Command[];
    contributes?: any;
    isActive: boolean;
}

export interface ExtensionCapability {
    extensionId: string;
    capability: string;
    available: boolean;
    details?: string;
}

export class ExtensionDetector {
    private logger: Logger;
    private installedExtensions: Map<string, ExtensionInfo> = new Map();
    private extensionCommands: Map<string, string[]> = new Map();

    constructor(logger: Logger) {
        this.logger = logger;
        this.detectInstalledExtensions();
    }

    /**
     * Detect all installed extensions and their capabilities
     */
    private detectInstalledExtensions(): void {
        try {
            const extensions = vscode.extensions.all;
            
            for (const extension of extensions) {
                const info: ExtensionInfo = {
                    id: extension.id,
                    name: extension.packageJSON.name || extension.id,
                    version: extension.packageJSON.version || 'unknown',
                    publisher: extension.packageJSON.publisher || 'unknown',
                    description: extension.packageJSON.description,
                    isActive: extension.isActive
                };

                // Extract commands from package.json
                if (extension.packageJSON.contributes?.commands) {
                    const commandList = extension.packageJSON.contributes.commands as Array<{ command: string; title?: string }>;
                    const commands = commandList.map(cmd => cmd.command);
                    this.extensionCommands.set(extension.id, commands);
                    info.commands = commands.map(cmd => ({ command: cmd, title: cmd }));
                }

                this.installedExtensions.set(extension.id, info);
            }

            this.logger.info(`Detected ${this.installedExtensions.size} installed extensions`);
        } catch (error) {
            this.logger.error('Failed to detect extensions', error);
        }
    }

    /**
     * Check if a specific extension is installed
     */
    public isExtensionInstalled(extensionId: string): boolean {
        return this.installedExtensions.has(extensionId);
    }

    /**
     * Get information about a specific extension
     */
    public getExtensionInfo(extensionId: string): ExtensionInfo | undefined {
        return this.installedExtensions.get(extensionId);
    }

    /**
     * Check if a specific command is available from any extension
     */
    public isCommandAvailable(commandId: string): boolean {
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
    public getCommandProvider(commandId: string): string | undefined {
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
    public getAllAvailableCommands(): Map<string, string[]> {
        return new Map(this.extensionCommands);
    }

    /**
     * Validate that a request uses only available extensions and commands
     */
    public validateExtensionUsage(request: string): {
        isValid: boolean;
        issues: string[];
        suggestions: string[];
        availableExtensions: string[];
        missingExtensions: string[];
    } {
        const issues: string[] = [];
        const suggestions: string[] = [];
        const availableExtensions: string[] = [];
        const missingExtensions: string[] = [];

        // Common extension patterns to look for
        const extensionPatterns = [
            /typescript\.\w+/g,
            /cursor\.\w+/g,
            /github\.\w+/g,
            /microsoft\.\w+/g,
            /[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+/g
        ];

        // Extract potential extension references
        const foundExtensions = new Set<string>();
        const foundCommands = new Set<string>();

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
            } else if (this.isCommandAvailable(extensionOrCommand)) {
                const provider = this.getCommandProvider(extensionOrCommand);
                if (provider) {
                    availableExtensions.push(provider);
                }
            } else {
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
            } else {
                const tsInfo = this.getExtensionInfo('ms-vscode.vscode-typescript-next');
                if (tsInfo && !tsInfo.isActive) {
                    issues.push('TypeScript extension is installed but not active');
                    suggestions.push('Enable the TypeScript extension in VS Code');
                } else {
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
    public getExtensionSummary(): {
        totalExtensions: number;
        activeExtensions: number;
        extensionList: ExtensionInfo[];
    } {
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
    public refreshExtensions(): void {
        this.installedExtensions.clear();
        this.extensionCommands.clear();
        this.detectInstalledExtensions();
    }
} 