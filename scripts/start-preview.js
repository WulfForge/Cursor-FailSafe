#!/usr/bin/env node

/**
 * FailSafe Preview Server Starter
 * 
 * This script starts the Fastify preview server using the fastify-preview plugin
 * to serve the correct UI with top navigation and buttons (not sidebar).
 */

const fastify = require('fastify');
const path = require('path');
const fs = require('fs');

// Create Fastify instance with logging
const server = fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
    }
});

// Register static file serving
server.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'src', 'ui'),
    prefix: '/'
});

// Health check endpoint
server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Dashboard data API
server.get('/api/dashboard/data', async (request, reply) => {
    return {
        projectName: 'FailSafe',
        version: '2.5.2',
        status: 'Active',
        lastUpdated: new Date().toISOString(),
        stats: {
            totalTasks: 42,
            completedTasks: 28,
            activeSprints: 3,
            cursorRules: 7,
            activeRules: 6
        },
        recentActivity: [
            { type: 'task_completed', message: 'Fixed dashboard integration', timestamp: new Date(Date.now() - 300000).toISOString() },
            { type: 'sprint_created', message: 'Sprint 15: UI Enhancement', timestamp: new Date(Date.now() - 600000).toISOString() },
            { type: 'rule_added', message: 'Added validation rule for commands', timestamp: new Date(Date.now() - 900000).toISOString() }
        ]
    };
});

// Main preview page
server.get('/preview', async (request, reply) => {
    const htmlPath = path.join(__dirname, '..', 'src', 'ui', 'components', 'dashboard.html');
    
    if (!fs.existsSync(htmlPath)) {
        return reply.code(404).send({ error: 'Preview template not found' });
    }
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Add cache-busting parameter
    const cacheBuster = Date.now();
    html = html.replace(/href="([^"]*\.css)"/g, `href="$1?v=${cacheBuster}"`);
    html = html.replace(/src="([^"]*\.js)"/g, `src="$1?v=${cacheBuster}"`);
    
    // Add webview-specific modifications if requested
    if (request.query.webview === 'true') {
        html = html.replace('<body>', '<body class="webview-mode">');
    }
    
    reply.type('text/html').send(html);
});

// Start the server
async function start() {
    try {
        const port = process.env.PORT || 3001;
        const host = '0.0.0.0';
        
        await server.listen({ port, host });
        
        // Log startup information
        console.log(`✅ Preview server started successfully on port ${port}`);
        console.log(`📱 Preview Access Options:`);
        console.log(`🌐 Browser: http://localhost:${port}/preview`);
        console.log(`🖥️  Webview: http://localhost:${port}/preview?webview=true`);
        console.log(`🔧 API: http://localhost:${port}/api/dashboard/data`);
        
        // Log instance information if available
        if (process.env.FAILSAFE_INSTANCE) {
            console.log(`🆔 Instance: ${process.env.FAILSAFE_INSTANCE}`);
        }
        
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await server.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    await server.close();
    process.exit(0);
});

// Start the server
start(); 