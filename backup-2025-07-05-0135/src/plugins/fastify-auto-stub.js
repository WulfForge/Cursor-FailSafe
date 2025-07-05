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
const typebox_1 = require("@sinclair/typebox");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fastifyAutoStub = async (fastify, options) => {
    const { logger, stubDir = 'src/stubs' } = options;
    // Ensure stub directory exists
    const fullStubDir = path.join(process.cwd(), stubDir);
    if (!fs.existsSync(fullStubDir)) {
        fs.mkdirSync(fullStubDir, { recursive: true });
    }
    // Decorate fastify with auto-stub functionality
    fastify.decorate('autoStub', {
        async generateStubsForMissingComponents() {
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
                const generated = [];
                const errors = [];
                const warnings = [];
                // Generate stubs for missing components
                for (const error of validationResult.errors) {
                    try {
                        const stubPath = await generateStubForError(error);
                        if (stubPath) {
                            generated.push(stubPath);
                        }
                    }
                    catch (stubError) {
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
                    }
                    catch (stubError) {
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
                    }
                    catch (stubError) {
                        errors.push(`Failed to generate plugin stub for ${plugin}: ${stubError}`);
                    }
                }
                return {
                    success: errors.length === 0,
                    generated,
                    errors,
                    warnings
                };
            }
            catch (error) {
                logger.error('Auto-stub generation failed:', error);
                return {
                    success: false,
                    generated: [],
                    errors: [`Auto-stub generation failed: ${error}`],
                    warnings: []
                };
            }
        },
        async generateStubForComponent(componentName, componentType) {
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
        async cleanupStubs() {
            if (fs.existsSync(fullStubDir)) {
                fs.rmSync(fullStubDir, { recursive: true, force: true });
                logger.info('Cleaned up stub directory');
            }
        },
        async checkServerFile() {
            // Try multiple paths for server file
            const possiblePaths = [
                path.join(process.cwd(), 'src/fastifyServer.ts'),
                path.join(__dirname, '..', 'fastifyServer.js'),
                path.join(__dirname, '..', '..', 'src', 'fastifyServer.ts')
            ];
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    try {
                        const content = fs.readFileSync(testPath, 'utf-8');
                        return { exists: true, path: testPath, content };
                    }
                    catch (error) {
                        // Continue to next path
                    }
                }
            }
            return { exists: false, path: 'not found' };
        },
        async checkPluginFile(plugin) {
            // Try multiple paths for plugin file
            const possiblePaths = [
                path.join(process.cwd(), `src/plugins/${plugin}.ts`),
                path.join(__dirname, `${plugin}.js`),
                path.join(__dirname, '..', '..', 'src', 'plugins', `${plugin}.ts`)
            ];
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    try {
                        const content = fs.readFileSync(testPath, 'utf-8');
                        return { exists: true, path: testPath, content };
                    }
                    catch (error) {
                        // Continue to next path
                    }
                }
            }
            return { exists: false, path: 'not found' };
        }
    });
    // Register routes
    fastify.post('/auto-stub/generate', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    generated: typebox_1.Type.Array(typebox_1.Type.String()),
                    errors: typebox_1.Type.Array(typebox_1.Type.String()),
                    warnings: typebox_1.Type.Array(typebox_1.Type.String()),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const result = await fastify.autoStub.generateStubsForMissingComponents();
            return {
                ...result,
                message: result.success ? 'Stubs generated successfully' : 'Stub generation completed with errors'
            };
        }
        catch (error) {
            logger.error('Auto-stub generation failed:', error);
            reply.status(500).send({ error: 'Auto-stub generation failed' });
        }
    });
    fastify.post('/auto-stub/cleanup', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            await fastify.autoStub.cleanupStubs();
            return {
                success: true,
                message: 'Stubs cleaned up successfully'
            };
        }
        catch (error) {
            logger.error('Stub cleanup failed:', error);
            reply.status(500).send({ error: 'Stub cleanup failed' });
        }
    });
    fastify.get('/auto-stub/status', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    stubDir: typebox_1.Type.String(),
                    stubCount: typebox_1.Type.Number(),
                    stubs: typebox_1.Type.Array(typebox_1.Type.String())
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
        }
        catch (error) {
            logger.error('Stub status check failed:', error);
            reply.status(500).send({ error: 'Stub status check failed' });
        }
    });
    // Helper functions
    async function getSpecGateValidation() {
        try {
            // Try multiple paths for spec file
            const possibleSpecPaths = [
                path.join(process.cwd(), 'failsafe_ui_specification.md'),
                path.join(__dirname, '..', '..', 'failsafe_ui_specification.md'),
                path.join(process.cwd(), 'src', 'failsafe_ui_specification.md')
            ];
            let actualSpecPath = null;
            for (const testPath of possibleSpecPaths) {
                if (fs.existsSync(testPath)) {
                    actualSpecPath = testPath;
                    break;
                }
            }
            if (!actualSpecPath) {
                fastify.log.warn('Specification file not found, auto-stub functionality will be limited');
            }
            // Import spec-gate validation logic
            const { validateUIComponents, extractRequiredComponents } = require('../../scripts/spec-gate.js');
            // Read the UI specification
            const specPath = actualSpecPath || path.join(process.cwd(), 'failsafe_ui_specification.md');
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
        }
        catch (error) {
            logger.error('Spec-gate validation failed:', error);
            return {
                hasErrors: false,
                errors: [],
                warnings: []
            };
        }
    }
    async function generateStubForError(error) {
        // Parse error to determine component type and name
        const componentMatch = error.match(/(\w+)\s+(component|route|plugin|command)/i);
        if (!componentMatch) {
            return null;
        }
        const [, componentName, componentType] = componentMatch;
        return await fastify.autoStub.generateStubForComponent(componentName, componentType);
    }
    async function identifyMissingRoutes() {
        const missingRoutes = [];
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
    async function identifyMissingPlugins() {
        const missingPlugins = [];
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
    async function generateRouteStub(route) {
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
    async function generatePluginStub(plugin) {
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
    function getStubTemplate(componentName, componentType) {
        const templates = {
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
    async function checkRouteExists(route) {
        // Check if route is implemented in the server
        const serverFile = path.join(process.cwd(), 'src/fastifyServer.ts');
        if (fs.existsSync(serverFile)) {
            const content = fs.readFileSync(serverFile, 'utf-8');
            return content.includes(route);
        }
        return false;
    }
    async function checkPluginExists(plugin) {
        // Check if plugin file exists
        const pluginFile = path.join(process.cwd(), `src/plugins/${plugin}.ts`);
        return fs.existsSync(pluginFile);
    }
    async function getStubFiles() {
        const stubs = [];
        function scanDirectory(dir, relativePath = '') {
            if (!fs.existsSync(dir))
                return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativeItemPath = path.join(relativePath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    scanDirectory(fullPath, relativeItemPath);
                }
                else if (stats.isFile() && item.endsWith('.ts')) {
                    stubs.push(relativeItemPath);
                }
            }
        }
        scanDirectory(fullStubDir);
        return stubs;
    }
};
exports.default = fastifyAutoStub;
//# sourceMappingURL=fastify-auto-stub.js.map