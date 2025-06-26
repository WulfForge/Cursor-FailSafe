import { FastifyPluginAsync } from 'fastify';
import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface PreviewOptions {
    port?: number;
    host?: string;
    open?: boolean;
}

interface ComponentPreview {
    id: string;
    name: string;
    type: 'tab' | 'panel' | 'component' | 'form';
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
}

interface DesignPreview {
    id: string;
    title: string;
    content: string;
    version: string;
    lastModified: Date;
    previewUrl?: string;
}

const fastifyPreview: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // Register plugin decorators
    fastify.decorate('preview', {
        async generateComponentPreview(componentId: string, options: PreviewOptions = {}): Promise<ComponentPreview> {
            try {
                // Generate preview for a specific component
                const component = await (fastify as any).preview.getComponentById(componentId);
                if (!component) {
                    throw new Error(`Component ${componentId} not found`);
                }

                const preview: ComponentPreview = {
                    id: componentId,
                    name: component.name || componentId,
                    type: component.type || 'component',
                    content: await (fastify as any).preview.generatePreviewHTML(component),
                    metadata: component.metadata || {},
                    timestamp: new Date()
                };

                return preview;
            } catch (error) {
                fastify.log.error('Error generating component preview:', error);
                throw error;
            }
        },

        async generateDesignPreview(designDocPath: string, options: PreviewOptions = {}): Promise<DesignPreview> {
            try {
                if (!fs.existsSync(designDocPath)) {
                    throw new Error(`Design document not found: ${designDocPath}`);
                }

                const content = fs.readFileSync(designDocPath, 'utf8');
                const stats = fs.statSync(designDocPath);

                const preview: DesignPreview = {
                    id: `design-${Date.now()}`,
                    title: path.basename(designDocPath, '.md'),
                    content: await (fastify as any).preview.generateDesignPreviewHTML(content),
                    version: '1.0.0',
                    lastModified: stats.mtime,
                    previewUrl: options.port ? `http://localhost:${options.port}/preview/design` : undefined
                };

                return preview;
            } catch (error) {
                fastify.log.error('Error generating design preview:', error);
                throw error;
            }
        },

        async startPreviewServer(options: PreviewOptions = {}): Promise<{ port: number; url: string }> {
            try {
                const port = options.port || 3001;
                const host = options.host || 'localhost';

                // Start a simple preview server
                const previewServer = (fastify as any).createServer();
                
                // Register preview routes
                await previewServer.register(async (instance: any) => {
                    instance.get('/preview/component/:id', async (request: any, reply: any) => {
                        const { id } = request.params as { id: string };
                        const preview = await (fastify as any).preview.generateComponentPreview(id, options);
                        return reply.send(preview);
                    });

                    instance.get('/preview/design', async (request: any, reply: any) => {
                        const { path: designPath } = request.query as { path: string };
                        if (!designPath) {
                            return reply.status(400).send({ error: 'Design path required' });
                        }
                        const preview = await (fastify as any).preview.generateDesignPreview(designPath, options);
                        return reply.send(preview);
                    });

                    instance.get('/preview/ui', async (request: any, reply: any) => {
                        const uiPreview = await (fastify as any).preview.generateUIPreview();
                        return reply.send(uiPreview);
                    });
                });

                await previewServer.listen({ port, host });
                
                const url = `http://${host}:${port}`;
                fastify.log.info(`Preview server started at ${url}`);

                return { port, url };
            } catch (error) {
                fastify.log.error('Error starting preview server:', error);
                throw error;
            }
        },

        async generateUIPreview(): Promise<{ tabs: any[]; components: any[]; theme: any }> {
            try {
                // Generate a complete UI preview
                const tabs = await (fastify as any).preview.getUITabs();
                const components = await (fastify as any).preview.getUIComponents();
                const theme = await (fastify as any).preview.getUITheme();

                return {
                    tabs: tabs.map((tab: any) => ({
                        id: tab.id,
                        name: tab.name,
                        icon: tab.icon,
                        content: tab.content
                    })),
                    components: components.map((comp: any) => ({
                        id: comp.id,
                        name: comp.name,
                        type: comp.type,
                        props: comp.props
                    })),
                    theme: {
                        colors: theme.colors,
                        fonts: theme.fonts,
                        spacing: theme.spacing
                    }
                };
            } catch (error) {
                fastify.log.error('Error generating UI preview:', error);
                throw error;
            }
        },

        async generatePreviewHTML(component: any): Promise<string> {
            try {
                // Generate HTML preview for a component
                const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${component.name} Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .preview-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .preview-header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            border-bottom: 1px solid #34495e;
        }
        .preview-content {
            padding: 20px;
        }
        .component-preview {
            border: 2px dashed #bdc3c7;
            border-radius: 4px;
            padding: 20px;
            margin: 10px 0;
            background: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>${component.name}</h1>
            <p>Component Type: ${component.type}</p>
        </div>
        <div class="preview-content">
            <div class="component-preview">
                ${component.content || '<p>Component content will be rendered here</p>'}
            </div>
        </div>
    </div>
</body>
</html>`;

                return template;
            } catch (error) {
                fastify.log.error('Error generating preview HTML:', error);
                return '<p>Error generating preview</p>';
            }
        },

        async generateDesignPreviewHTML(content: string): Promise<string> {
            try {
                // Convert markdown content to HTML preview
                const htmlContent = content
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                    .replace(/\*(.*)\*/gim, '<em>$1</em>')
                    .replace(/\n/gim, '<br>');

                const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design Document Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }
        .preview-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .preview-header {
            background: #3498db;
            color: white;
            padding: 20px;
            border-bottom: 1px solid #2980b9;
        }
        .preview-content {
            padding: 30px;
        }
        h1, h2, h3 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h1 { font-size: 2.5em; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        p { margin-bottom: 15px; }
        strong { color: #e74c3c; }
        em { color: #27ae60; }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>Design Document Preview</h1>
            <p>Live preview of your design document</p>
        </div>
        <div class="preview-content">
            ${htmlContent}
        </div>
    </div>
</body>
</html>`;

                return template;
            } catch (error) {
                fastify.log.error('Error generating design preview HTML:', error);
                return '<p>Error generating design preview</p>';
            }
        },

        async getComponentById(componentId: string): Promise<any> {
            // Mock implementation - in real scenario, this would fetch from component registry
            return {
                id: componentId,
                name: componentId,
                type: 'component',
                content: `<div>Preview of ${componentId}</div>`,
                metadata: {}
            };
        },

        async getUITabs(): Promise<any[]> {
            // Mock implementation - in real scenario, this would fetch from UI registry
            return [
                { id: 'dashboard', name: 'Dashboard', icon: '📊', content: 'Dashboard content' },
                { id: 'console', name: 'Console', icon: '💻', content: 'Console content' },
                { id: 'sprint-plan', name: 'Sprint Plan', icon: '🗓', content: 'Sprint plan content' },
                { id: 'cursor-rules', name: 'Cursor Rules', icon: '🔒', content: 'Cursor rules content' },
                { id: 'logs', name: 'Logs', icon: '📘', content: 'Logs content' }
            ];
        },

        async getUIComponents(): Promise<any[]> {
            // Mock implementation - in real scenario, this would fetch from component registry
            return [
                { id: 'status-card', name: 'Status Card', type: 'card', props: { title: 'Status', value: 'Active' } },
                { id: 'chart', name: 'Chart', type: 'chart', props: { type: 'line', data: [] } },
                { id: 'table', name: 'Table', type: 'table', props: { columns: [], data: [] } }
            ];
        },

        async getUITheme(): Promise<any> {
            // Mock implementation - in real scenario, this would fetch from theme registry
            return {
                colors: {
                    primary: '#3498db',
                    secondary: '#2ecc71',
                    accent: '#e74c3c',
                    background: '#f5f5f5',
                    surface: '#ffffff'
                },
                fonts: {
                    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    monospace: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                },
                spacing: {
                    xs: '4px',
                    sm: '8px',
                    md: '16px',
                    lg: '24px',
                    xl: '32px'
                }
            };
        }
    });

    // Register routes
    fastify.get('/api/preview/component/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const preview = await (fastify as any).preview.generateComponentPreview(id);
        return reply.send(preview);
    });

    fastify.get('/api/preview/design', async (request, reply) => {
        const { path: designPath } = request.query as { path: string };
        if (!designPath) {
            return reply.status(400).send({ error: 'Design path required' });
        }
        const preview = await (fastify as any).preview.generateDesignPreview(designPath);
        return reply.send(preview);
    });

    fastify.get('/api/preview/ui', async (request, reply) => {
        const preview = await (fastify as any).preview.generateUIPreview();
        return reply.send(preview);
    });

    fastify.post('/api/preview/start', async (request, reply) => {
        const options = request.body as PreviewOptions;
        const result = await (fastify as any).preview.startPreviewServer(options);
        return reply.send(result);
    });
};

export default fastifyPreview;
