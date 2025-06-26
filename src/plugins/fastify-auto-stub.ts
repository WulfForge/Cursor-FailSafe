import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';

interface MissingComponent {
    name: string;
    type: 'tab' | 'panel' | 'widget' | 'form' | 'command' | 'route';
    specSection: string;
    description: string;
    requiredMethods: string[];
    requiredProperties: string[];
}

interface StubGenerationResult {
    success: boolean;
    generatedFiles: string[];
    errors: string[];
    warnings: string[];
    missingComponents: MissingComponent[];
}

const StubGenerationSchema = Type.Object({
    success: Type.Boolean(),
    generatedFiles: Type.Array(Type.String()),
    errors: Type.Array(Type.String()),
    warnings: Type.Array(Type.String()),
    missingComponents: Type.Array(Type.Object({
        name: Type.String(),
        type: Type.Union([Type.Literal('tab'), Type.Literal('panel'), Type.Literal('widget'), Type.Literal('form'), Type.Literal('command'), Type.Literal('route')]),
        specSection: Type.String(),
        description: Type.String(),
        requiredMethods: Type.Array(Type.String()),
        requiredProperties: Type.Array(Type.String())
    }))
});

const fastifyAutoStub: FastifyPluginAsync = async (fastify) => {
    // Decorate fastify with auto-stub functionality
    fastify.decorate('autoStub', {
        async generateStubs(): Promise<StubGenerationResult> {
            const result: StubGenerationResult = {
                success: true,
                generatedFiles: [],
                errors: [],
                warnings: [],
                missingComponents: []
            };

            try {
                // Analyze spec document for required components
                const missingComponents = await (fastify as any).autoStub.analyzeMissingComponents();
                result.missingComponents = missingComponents;

                if (missingComponents.length === 0) {
                    result.warnings.push('No missing components detected');
                    return result;
                }

                // Generate stubs for each missing component
                for (const component of missingComponents) {
                    try {
                        const generatedFile = await (fastify as any).autoStub.generateComponentStub(component);
                        if (generatedFile) {
                            result.generatedFiles.push(generatedFile);
                        }
                    } catch (error) {
                        result.errors.push(`Failed to generate stub for ${component.name}: ${error}`);
                        result.success = false;
                    }
                }

                // Update commands registration if needed
                if (missingComponents.some((c: any) => c.type === 'command')) {
                    await (fastify as any).autoStub.updateCommandsRegistration(missingComponents.filter((c: any) => c.type === 'command'));
                }

                // Update UI registration if needed
                if (missingComponents.some((c: any) => c.type === 'tab' || c.type === 'panel')) {
                    await (fastify as any).autoStub.updateUIRegistration(missingComponents.filter((c: any) => c.type === 'tab' || c.type === 'panel'));
                }

            } catch (error) {
                result.errors.push(`Auto-stub generation failed: ${error}`);
                result.success = false;
            }

            return result;
        },

        async analyzeMissingComponents(): Promise<MissingComponent[]> {
            const missingComponents: MissingComponent[] = [];
            
            // Check for missing UI tabs
            const requiredTabs = ['Dashboard', 'Console', 'Logs', 'ProjectPlan', 'ProgressDetails', 'AccountabilityReport', 'FeasibilityAnalysis', 'ActionLog', 'FailsafeConfigPanel'];
            const existingTabs = await (fastify as any).autoStub.getExistingTabs();
            
            for (const tab of requiredTabs) {
                if (!existingTabs.includes(tab)) {
                    missingComponents.push({
                        name: `show${tab}`,
                        type: 'tab',
                        specSection: '7. UI Binding',
                        description: `Missing ${tab} tab implementation`,
                        requiredMethods: ['showWebview', 'handleMessages', 'updateContent'],
                        requiredProperties: ['panel', 'webview', 'disposables']
                    });
                }
            }

            // Check for missing commands
            const requiredCommands = ['showDashboard', 'showConsole', 'showLogs', 'showProjectPlan', 'showProgressDetails', 'showAccountabilityReport', 'showFeasibilityAnalysis', 'showActionLog', 'showFailsafeConfigPanel'];
            const existingCommands = await (fastify as any).autoStub.getExistingCommands();
            
            for (const command of requiredCommands) {
                if (!existingCommands.includes(command)) {
                    missingComponents.push({
                        name: command,
                        type: 'command',
                        specSection: '5. API Surface',
                        description: `Missing ${command} command implementation`,
                        requiredMethods: ['execute', 'validate', 'handleError'],
                        requiredProperties: ['commandId', 'title', 'category']
                    });
                }
            }

            // Check for missing routes
            const requiredRoutes = ['/validate', '/rules', '/sprints', '/tasks', '/status', '/events', '/metrics', '/design-doc'];
            const existingRoutes = await (fastify as any).autoStub.getExistingRoutes();
            
            for (const route of requiredRoutes) {
                if (!existingRoutes.includes(route)) {
                    missingComponents.push({
                        name: route,
                        type: 'route',
                        specSection: '5. API Surface',
                        description: `Missing ${route} route implementation`,
                        requiredMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
                        requiredProperties: ['schema', 'handler', 'validation']
                    });
                }
            }

            return missingComponents;
        },

        async getExistingTabs(): Promise<string[]> {
            const tabs: string[] = [];
            
            // Check UI file for existing tab methods
            const uiPath = path.join(process.cwd(), 'src/ui.ts');
            if (fs.existsSync(uiPath)) {
                const content = fs.readFileSync(uiPath, 'utf-8');
                const methodMatches = content.match(/public async show(\w+)\(\)/g);
                if (methodMatches) {
                    for (const match of methodMatches) {
                        const tabName = match.match(/public async show(\w+)\(\)/)?.[1];
                        if (tabName) {
                            tabs.push(tabName);
                        }
                    }
                }
            }

            return tabs;
        },

        async getExistingCommands(): Promise<string[]> {
            const commands: string[] = [];
            
            // Check commands file for existing command registrations
            const commandsPath = path.join(process.cwd(), 'src/commands.ts');
            if (fs.existsSync(commandsPath)) {
                const content = fs.readFileSync(commandsPath, 'utf-8');
                const commandMatches = content.match(/failsafe\.(\w+)/g);
                if (commandMatches) {
                    for (const match of commandMatches) {
                        const commandName = match.match(/failsafe\.(\w+)/)?.[1];
                        if (commandName) {
                            commands.push(commandName);
                        }
                    }
                }
            }

            return commands;
        },

        async getExistingRoutes(): Promise<string[]> {
            const routes: string[] = [];
            
            // Check Fastify server file for existing routes
            const serverPath = path.join(process.cwd(), 'src/fastifyServer.ts');
            if (fs.existsSync(serverPath)) {
                const content = fs.readFileSync(serverPath, 'utf-8');
                const routeMatches = content.match(/\.get\(['"`]([^'"`]+)['"`]/g);
                if (routeMatches) {
                    for (const match of routeMatches) {
                        const route = match.match(/\.get\(['"`]([^'"`]+)['"`]/)?.[1];
                        if (route) {
                            routes.push(route);
                        }
                    }
                }
            }

            return routes;
        },

        async generateComponentStub(component: MissingComponent): Promise<string | null> {
            const stubDir = path.join(process.cwd(), 'src/stubs');
            if (!fs.existsSync(stubDir)) {
                fs.mkdirSync(stubDir, { recursive: true });
            }

            let stubContent = '';
            let fileName = '';

            switch (component.type) {
                case 'tab':
                    fileName = `${component.name}.ts`;
                    stubContent = (fastify as any).autoStub.generateTabStub(component);
                    break;
                case 'command':
                    fileName = `${component.name}Command.ts`;
                    stubContent = (fastify as any).autoStub.generateCommandStub(component);
                    break;
                case 'route':
                    fileName = `${component.name}Route.ts`;
                    stubContent = (fastify as any).autoStub.generateRouteStub(component);
                    break;
                default:
                    fileName = `${component.name}Stub.ts`;
                    stubContent = (fastify as any).autoStub.generateGenericStub(component);
            }

            const filePath = path.join(stubDir, fileName);
            fs.writeFileSync(filePath, stubContent);
            return filePath;
        },

        generateTabStub(component: MissingComponent): string {
            return `/**
 * TODO: AUTO-GENERATED STUB - ${component.name}
 * 
 * This component was automatically generated because it was missing from the implementation.
 * Please implement the actual functionality according to the design document section: ${component.specSection}
 * 
 * Required methods: ${component.requiredMethods.join(', ')}
 * Required properties: ${component.requiredProperties.join(', ')}
 * 
 * Description: ${component.description}
 */

import * as vscode from 'vscode';

export class ${component.name}Tab {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        // TODO: Initialize tab
    }

    public async showWebview(): Promise<void> {
        // TODO: Implement webview creation
        this.panel = vscode.window.createWebviewPanel(
            '${component.name.toLowerCase()}',
            '${component.name}',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = \`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${component.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .stub-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="stub-notice">
                    <h2>⚠️ AUTO-GENERATED STUB</h2>
                    <p>This ${component.name} tab is a placeholder. Please implement the actual functionality.</p>
                    <p><strong>Spec Section:</strong> ${component.specSection}</p>
                    <p><strong>Description:</strong> ${component.description}</p>
                </div>
                <h1>${component.name}</h1>
                <p>Implementation required.</p>
            </body>
            </html>
        \`;

        this.panel.onDidDispose(() => {
            this.dispose();
        });
    }

    public handleMessages(message: any): void {
        // TODO: Implement message handling
        console.log('Message received:', message);
    }

    public updateContent(): void {
        // TODO: Implement content updates
        if (this.panel) {
            // Update webview content
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
`;
        },

        generateCommandStub(component: MissingComponent): string {
            return `/**
 * TODO: AUTO-GENERATED STUB - ${component.name} Command
 * 
 * This command was automatically generated because it was missing from the implementation.
 * Please implement the actual functionality according to the design document section: ${component.specSection}
 * 
 * Required methods: ${component.requiredMethods.join(', ')}
 * Required properties: ${component.requiredProperties.join(', ')}
 * 
 * Description: ${component.description}
 */

import * as vscode from 'vscode';

export class ${component.name}Command {
    private commandId = 'failsafe.${component.name.toLowerCase()}';
    private title = '${component.name}';
    private category = 'FailSafe';

    constructor() {
        // TODO: Initialize command
    }

    public async execute(): Promise<void> {
        // TODO: Implement command execution
        vscode.window.showInformationMessage('${component.name} command executed (stub)');
        
        // TODO: Add actual implementation
        // - Validate input
        // - Execute business logic
        // - Handle errors
        // - Update UI
    }

    public async validate(): Promise<boolean> {
        // TODO: Implement validation logic
        return true;
    }

    public async handleError(error: Error): Promise<void> {
        // TODO: Implement error handling
        vscode.window.showErrorMessage(\`${component.name} command failed: \${error.message}\`);
    }

    public register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand(this.commandId, this.execute.bind(this));
    }
}
`;
        },

        generateRouteStub(component: MissingComponent): string {
            return `/**
 * TODO: AUTO-GENERATED STUB - ${component.name} Route
 * 
 * This route was automatically generated because it was missing from the implementation.
 * Please implement the actual functionality according to the design document section: ${component.specSection}
 * 
 * Required methods: ${component.requiredMethods.join(', ')}
 * Required properties: ${component.requiredProperties.join(', ')}
 * 
 * Description: ${component.description}
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const ${component.name.replace(/[^a-zA-Z0-9]/g, '')}Schema = Type.Object({
    // TODO: Define request/response schema
    message: Type.String()
});

const fastify${component.name.replace(/[^a-zA-Z0-9]/g, '')}: FastifyPluginAsync = async (fastify) => {
    // TODO: Implement route handlers
    
    fastify.get('${component.name}', {
        schema: {
            response: {
                200: ${component.name.replace(/[^a-zA-Z0-9]/g, '')}Schema
            }
        }
    }, async (request, reply) => {
        // TODO: Implement GET handler
        return {
            message: '${component.name} route stub - implementation required',
            specSection: '${component.specSection}',
            description: '${component.description}'
        };
    });

    fastify.post('${component.name}', {
        schema: {
            body: ${component.name.replace(/[^a-zA-Z0-9]/g, '')}Schema,
            response: {
                200: ${component.name.replace(/[^a-zA-Z0-9]/g, '')}Schema
            }
        }
    }, async (request, reply) => {
        // TODO: Implement POST handler
        return {
            message: '${component.name} route stub - implementation required',
            specSection: '${component.specSection}',
            description: '${component.description}'
        };
    });
};

export default fastify${component.name.replace(/[^a-zA-Z0-9]/g, '')};
`;
        },

        generateGenericStub(component: MissingComponent): string {
            return `/**
 * TODO: AUTO-GENERATED STUB - ${component.name}
 * 
 * This component was automatically generated because it was missing from the implementation.
 * Please implement the actual functionality according to the design document section: ${component.specSection}
 * 
 * Required methods: ${component.requiredMethods.join(', ')}
 * Required properties: ${component.requiredProperties.join(', ')}
 * 
 * Description: ${component.description}
 */

export class ${component.name} {
    constructor() {
        // TODO: Initialize component
    }

    // TODO: Implement required methods
    ${component.requiredMethods.map(method => `
    public async ${method}(): Promise<void> {
        // TODO: Implement ${method}
        console.log('${method} called on ${component.name} (stub)');
    }`).join('\n')}

    // TODO: Implement required properties
    ${component.requiredProperties.map(prop => `
    private ${prop}: any; // TODO: Define proper type`).join('\n')}
}
`;
        },

        async updateCommandsRegistration(missingCommands: MissingComponent[]): Promise<void> {
            const commandsPath = path.join(process.cwd(), 'src/commands.ts');
            if (!fs.existsSync(commandsPath)) {
                return;
            }

            let content = fs.readFileSync(commandsPath, 'utf-8');
            
            // Add import statements for missing commands
            const importSection = missingCommands.map(cmd => 
                `import { ${cmd.name}Command } from './stubs/${cmd.name}Command';`
            ).join('\n');

            if (importSection) {
                // Find the last import statement and add after it
                const lastImportIndex = content.lastIndexOf('import');
                const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
                content = content.slice(0, nextLineIndex) + importSection + '\n' + content.slice(nextLineIndex);
            }

            // Add command registrations
            const registrationSection = missingCommands.map(cmd => 
                `            vscode.commands.registerCommand('failsafe.${cmd.name.toLowerCase()}', this.${cmd.name.toLowerCase()}.bind(this)),`
            ).join('\n');

            if (registrationSection) {
                // Find the commands array and add to it
                const commandsArrayIndex = content.indexOf('const commands = [');
                if (commandsArrayIndex !== -1) {
                    const arrayEndIndex = content.indexOf('];', commandsArrayIndex);
                    content = content.slice(0, arrayEndIndex) + '\n' + registrationSection + content.slice(arrayEndIndex);
                }
            }

            // Add command methods
            const methodSection = missingCommands.map(cmd => `
    private async ${cmd.name.toLowerCase()}(): Promise<void> {
        try {
            await this.${cmd.name.toLowerCase()}Command.execute();
        } catch (error) {
            this.logger.error('Error in ${cmd.name.toLowerCase()} command', error);
            vscode.window.showErrorMessage('Failed to execute ${cmd.name.toLowerCase()}. Check logs for details.');
        }
    }`).join('\n');

            if (methodSection) {
                // Add methods before the closing brace of the class
                const classEndIndex = content.lastIndexOf('}');
                content = content.slice(0, classEndIndex) + methodSection + '\n' + content.slice(classEndIndex);
            }

            fs.writeFileSync(commandsPath, content);
        },

        async updateUIRegistration(missingComponents: MissingComponent[]): Promise<void> {
            const uiPath = path.join(process.cwd(), 'src/ui.ts');
            if (!fs.existsSync(uiPath)) {
                return;
            }

            let content = fs.readFileSync(uiPath, 'utf-8');
            
            // Add import statements for missing components
            const importSection = missingComponents.map(comp => 
                `import { ${comp.name}Tab } from './stubs/${comp.name}';`
            ).join('\n');

            if (importSection) {
                // Find the last import statement and add after it
                const lastImportIndex = content.lastIndexOf('import');
                const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
                content = content.slice(0, nextLineIndex) + importSection + '\n' + content.slice(nextLineIndex);
            }

            // Add component methods
            const methodSection = missingComponents.map(comp => `
    public async ${comp.name}(): Promise<void> {
        try {
            const tab = new ${comp.name}Tab();
            await tab.showWebview();
        } catch (error) {
            this.logger.error('Error showing ${comp.name}', error);
            vscode.window.showErrorMessage('Failed to show ${comp.name}. Check logs for details.');
        }
    }`).join('\n');

            if (methodSection) {
                // Add methods before the closing brace of the class
                const classEndIndex = content.lastIndexOf('}');
                content = content.slice(0, classEndIndex) + methodSection + '\n' + content.slice(classEndIndex);
            }

            fs.writeFileSync(uiPath, content);
        }
    });

    // Register routes
    fastify.post('/auto-stub/generate', {
        schema: {
            response: {
                200: StubGenerationSchema
            }
        }
    }, async (request, reply) => {
        const result = await (fastify as any).autoStub.generateStubs();
        return result;
    });

    fastify.get('/auto-stub/status', {
        schema: {
            response: {
                200: Type.Object({
                    hasStubs: Type.Boolean(),
                    stubCount: Type.Number(),
                    stubFiles: Type.Array(Type.String())
                })
            }
        }
    }, async (request, reply) => {
        const stubDir = path.join(process.cwd(), 'src/stubs');
        const hasStubs = fs.existsSync(stubDir);
        const stubFiles = hasStubs ? fs.readdirSync(stubDir).filter(file => file.endsWith('.ts')) : [];
        
        return {
            hasStubs,
            stubCount: stubFiles.length,
            stubFiles
        };
    });
};

export default fastifyAutoStub;
