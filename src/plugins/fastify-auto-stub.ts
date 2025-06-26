import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

interface AutoStubOptions {
    logger: Logger;
    stubDir?: string;
}

interface StubComponent {
    name: string;
    type: 'component' | 'route' | 'plugin' | 'command';
    path: string;
    template: string;
    dependencies: string[];
}

interface StubGenerationResult {
    success: boolean;
    generated: string[];
    errors: string[];
    warnings: string[];
}

const fastifyAutoStub: FastifyPluginAsync<AutoStubOptions> = async (fastify, options) => {
    const { logger, stubDir = 'src/stubs' } = options;

    // Ensure stub directory exists
    const fullStubDir = path.join(process.cwd(), stubDir);
    if (!fs.existsSync(fullStubDir)) {
        fs.mkdirSync(fullStubDir, { recursive: true });
    }

    // Decorate fastify with auto-stub functionality
    fastify.decorate('autoStub', {
        async generateStubsForMissingComponents(): Promise<StubGenerationResult> {
            try {
                // Get spec-gate validation result
                const validationResult = await getSpecGateValidation();
                
                if (!validationResult.hasErrors && validationResult.errors.length === 0) {
                    return {
                        success: true,
                        generated: [],
                        errors: [],
                        warnings: ['No missing components detected']
                    };
                }
                
                const generated: string[] = [];
                const errors: string[] = [];
                const warnings: string[] = [];
                
                // Generate stubs for missing components
                for (const error of validationResult.errors) {
                    try {
                        const stubPath = await generateStubForError(error);
                        if (stubPath) {
                            generated.push(stubPath);
                        }
                    } catch (stubError) {
                        errors.push(`Failed to generate stub for ${error}: ${stubError}`);
                    }
                }
                
                // Generate stubs for missing routes
                const missingRoutes = await identifyMissingRoutes();
                for (const route of missingRoutes) {
                    try {
                        const stubPath = await generateRouteStub(route);
                        if (stubPath) {
                            generated.push(stubPath);
                        }
                    } catch (stubError) {
                        errors.push(`Failed to generate route stub for ${route}: ${stubError}`);
                    }
                }
                
                // Generate stubs for missing plugins
                const missingPlugins = await identifyMissingPlugins();
                for (const plugin of missingPlugins) {
                    try {
                        const stubPath = await generatePluginStub(plugin);
                        if (stubPath) {
                            generated.push(stubPath);
                        }
                    } catch (stubError) {
                        errors.push(`Failed to generate plugin stub for ${plugin}: ${stubError}`);
                    }
                }
                
                return {
                    success: errors.length === 0,
                    generated,
                    errors,
                    warnings
                };
                
            } catch (error) {
                logger.error('Auto-stub generation failed:', error);
                return {
                    success: false,
                    generated: [],
                    errors: [`Auto-stub generation failed: ${error}`],
                    warnings: []
                };
            }
        },

        async generateStubForComponent(componentName: string, componentType: string): Promise<string | null> {
            const stubComponent = getStubTemplate(componentName, componentType);
            if (!stubComponent) {
                return null;
            }
            
            const stubPath = path.join(fullStubDir, stubComponent.path);
            const stubDir = path.dirname(stubPath);
            
            if (!fs.existsSync(stubDir)) {
                fs.mkdirSync(stubDir, { recursive: true });
            }
            
            fs.writeFileSync(stubPath, stubComponent.template);
            logger.info(`Generated stub: ${stubPath}`);
            
            return stubPath;
        },

        async cleanupStubs(): Promise<void> {
            if (fs.existsSync(fullStubDir)) {
                fs.rmSync(fullStubDir, { recursive: true, force: true });
                logger.info('Cleaned up stub directory');
            }
        }
    });

    // Register routes
    fastify.post('/auto-stub/generate', {
        schema: {
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    generated: Type.Array(Type.String()),
                    errors: Type.Array(Type.String()),
                    warnings: Type.Array(Type.String()),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const result = await (fastify as any).autoStub.generateStubsForMissingComponents();
            
            return {
                ...result,
                message: result.success ? 'Stubs generated successfully' : 'Stub generation completed with errors'
            };
        } catch (error) {
            logger.error('Auto-stub generation failed:', error);
            reply.status(500).send({ error: 'Auto-stub generation failed' });
        }
    });

    fastify.post('/auto-stub/cleanup', {
        schema: {
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            await (fastify as any).autoStub.cleanupStubs();
            
            return {
                success: true,
                message: 'Stubs cleaned up successfully'
            };
        } catch (error) {
            logger.error('Stub cleanup failed:', error);
            reply.status(500).send({ error: 'Stub cleanup failed' });
        }
    });

    fastify.get('/auto-stub/status', {
        schema: {
            response: {
                200: Type.Object({
                    stubDir: Type.String(),
                    stubCount: Type.Number(),
                    stubs: Type.Array(Type.String())
                })
            }
        }
    }, async (request, reply) => {
        try {
            const stubs = await getStubFiles();
            
            return {
                stubDir: fullStubDir,
                stubCount: stubs.length,
                stubs
            };
        } catch (error) {
            logger.error('Stub status check failed:', error);
            reply.status(500).send({ error: 'Stub status check failed' });
        }
    });

    // Helper functions
    async function getSpecGateValidation(): Promise<{
        hasErrors: boolean;
        errors: string[];
        warnings: string[];
    }> {
        try {
            // Import spec-gate validation logic
            const { validateUIComponents, extractRequiredComponents } = require('../../scripts/spec-gate.js');
            
            // Read the UI specification
            const specPath = path.join(process.cwd(), 'failsafe_ui_specification.md');
            
            if (!fs.existsSync(specPath)) {
                return {
                    hasErrors: true,
                    errors: ['UI specification file not found'],
                    warnings: []
                };
            }
            
            const specContent = fs.readFileSync(specPath, 'utf-8');
            const requiredComponents = extractRequiredComponents(specContent);
            const validationResult = validateUIComponents(requiredComponents);
            
            return validationResult;
        } catch (error) {
            logger.error('Spec-gate validation failed:', error);
            return {
                hasErrors: false,
                errors: [],
                warnings: []
            };
        }
    }

    async function generateStubForError(error: string): Promise<string | null> {
        // Parse error to determine component type and name
        const componentMatch = error.match(/(\w+)\s+(component|route|plugin|command)/i);
        if (!componentMatch) {
            return null;
        }
        
        const [, componentName, componentType] = componentMatch;
        return await (fastify as any).autoStub.generateStubForComponent(componentName, componentType);
    }

    async function identifyMissingRoutes(): Promise<string[]> {
        const missingRoutes: string[] = [];
        
        // Check for common missing routes
        const expectedRoutes = [
            '/dashboard',
            '/console',
            '/logs',
            '/sprint',
            '/config',
            '/metrics',
            '/health',
            '/events'
        ];
        
        for (const route of expectedRoutes) {
            const routeExists = await checkRouteExists(route);
            if (!routeExists) {
                missingRoutes.push(route);
            }
        }
        
        return missingRoutes;
    }

    async function identifyMissingPlugins(): Promise<string[]> {
        const missingPlugins: string[] = [];
        
        // Check for common missing plugins
        const expectedPlugins = [
            'fastify-spec-gate',
            'fastify-event-bus',
            'fastify-health',
            'fastify-metrics',
            'fastify-request-logger',
            'fastify-spec-heatmap',
            'fastify-snapshot-validator',
            'fastify-auto-stub',
            'fastify-preview'
        ];
        
        for (const plugin of expectedPlugins) {
            const pluginExists = await checkPluginExists(plugin);
            if (!pluginExists) {
                missingPlugins.push(plugin);
            }
        }
        
        return missingPlugins;
    }

    async function generateRouteStub(route: string): Promise<string | null> {
        const routeName = route.replace(/^\//, '').replace(/\//g, '-');
        const stubPath = `routes/${routeName}.ts`;
        
        const template = `import { FastifyPluginAsync } from 'fastify';

// TODO: AUTO-GENERATED STUB - Implement ${route} route
// This stub was generated because the route was missing from the implementation
// Replace this with actual route implementation before shipping

const ${routeName}Route: FastifyPluginAsync = async (fastify) => {
    fastify.get('${route}', async (request, reply) => {
        // TODO: Implement ${route} GET handler
        return { message: '${route} route - TODO: Implement actual functionality' };
    });
    
    // TODO: Add other HTTP methods as needed (POST, PUT, DELETE, etc.)
};

export default ${routeName}Route;
`;
        
        const fullPath = path.join(fullStubDir, stubPath);
        const stubDir = path.dirname(fullPath);
        
        if (!fs.existsSync(stubDir)) {
            fs.mkdirSync(stubDir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, template);
        logger.info(`Generated route stub: ${fullPath}`);
        
        return fullPath;
    }

    async function generatePluginStub(plugin: string): Promise<string | null> {
        const pluginName = plugin.replace(/^fastify-/, '');
        const stubPath = `plugins/${plugin}.ts`;
        
        const template = `import { FastifyPluginAsync } from 'fastify';

// TODO: AUTO-GENERATED STUB - Implement ${plugin} plugin
// This stub was generated because the plugin was missing from the implementation
// Replace this with actual plugin implementation before shipping

interface ${pluginName}Options {
    // TODO: Define plugin options
}

const ${plugin}: FastifyPluginAsync<${pluginName}Options> = async (fastify, options) => {
    // TODO: Implement ${plugin} plugin functionality
    
    // Example: Register routes, decorators, hooks, etc.
    fastify.log.info('${plugin} plugin loaded (stub)');
    
    // TODO: Add actual plugin implementation
    // - Register routes
    // - Add decorators
    // - Set up hooks
    // - Configure options
};

export default ${plugin};
`;
        
        const fullPath = path.join(fullStubDir, stubPath);
        const stubDir = path.dirname(fullPath);
        
        if (!fs.existsSync(stubDir)) {
            fs.mkdirSync(stubDir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, template);
        logger.info(`Generated plugin stub: ${fullPath}`);
        
        return fullPath;
    }

    function getStubTemplate(componentName: string, componentType: string): StubComponent | null {
        const templates: Record<string, StubComponent> = {
            'dashboard': {
                name: 'Dashboard',
                type: 'component',
                path: 'components/Dashboard.tsx',
                template: `import React from 'react';

// TODO: AUTO-GENERATED STUB - Implement Dashboard component
// This stub was generated because the Dashboard component was missing from the implementation
// Replace this with actual component implementation before shipping

interface DashboardProps {
    // TODO: Define component props
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
    return (
        <div className="dashboard-stub">
            <h2>Dashboard Component</h2>
            <p>TODO: Implement actual dashboard functionality</p>
            <div className="stub-warning">
                ⚠️ This is an auto-generated stub. Replace with real implementation.
            </div>
        </div>
    );
};

export default Dashboard;
`,
                dependencies: ['react']
            },
            'console': {
                name: 'Console',
                type: 'component',
                path: 'components/Console.tsx',
                template: `import React from 'react';

// TODO: AUTO-GENERATED STUB - Implement Console component
// This stub was generated because the Console component was missing from the implementation
// Replace this with actual component implementation before shipping

interface ConsoleProps {
    // TODO: Define component props
}

export const Console: React.FC<ConsoleProps> = (props) => {
    return (
        <div className="console-stub">
            <h2>Console Component</h2>
            <p>TODO: Implement actual console functionality</p>
            <div className="stub-warning">
                ⚠️ This is an auto-generated stub. Replace with real implementation.
            </div>
        </div>
    );
};

export default Console;
`,
                dependencies: ['react']
            }
        };
        
        return templates[componentName.toLowerCase()] || null;
    }

    async function checkRouteExists(route: string): Promise<boolean> {
        // Check if route is implemented in the server
        const serverFile = path.join(process.cwd(), 'src/fastifyServer.ts');
        if (fs.existsSync(serverFile)) {
            const content = fs.readFileSync(serverFile, 'utf-8');
            return content.includes(route);
        }
        return false;
    }

    async function checkPluginExists(plugin: string): Promise<boolean> {
        // Check if plugin file exists
        const pluginFile = path.join(process.cwd(), `src/plugins/${plugin}.ts`);
        return fs.existsSync(pluginFile);
    }

    async function getStubFiles(): Promise<string[]> {
        const stubs: string[] = [];
        
        function scanDirectory(dir: string, relativePath = '') {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativeItemPath = path.join(relativePath, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    scanDirectory(fullPath, relativeItemPath);
                } else if (stats.isFile() && item.endsWith('.ts')) {
                    stubs.push(relativeItemPath);
                }
            }
        }
        
        scanDirectory(fullStubDir);
        return stubs;
    }
};

export default fastifyAutoStub;
