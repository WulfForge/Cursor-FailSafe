"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fastifyEventBus = async (fastify, options) => {
    const { maxListeners = 100, enableSSE = true } = options;
    // Create event emitter
    const eventBus = new events_1.EventEmitter();
    eventBus.setMaxListeners(maxListeners);
    // Decorate fastify with event bus
    fastify.decorate('eventBus', eventBus);
    // Add event emission helper
    fastify.decorate('emitEvent', (event) => {
        const fullEvent = {
            ...event,
            id: generateEventId(),
            timestamp: new Date().toISOString()
        };
        eventBus.emit('failsafe-event', fullEvent);
        fastify.log.info(`Event emitted: ${fullEvent.type}`, fullEvent);
        return fullEvent;
    });
    // SSE endpoint for real-time events
    if (enableSSE) {
        fastify.get('/events', async (request, reply) => {
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            const sendEvent = (event) => {
                const sseData = `data: ${JSON.stringify(event)}\n\n`;
                reply.raw.write(sseData);
            };
            // Send initial connection event
            sendEvent({
                id: generateEventId(),
                type: 'system',
                timestamp: new Date().toISOString(),
                data: { message: 'SSE connection established' },
                severity: 'info'
            });
            // Listen for events
            const eventHandler = (event) => {
                sendEvent(event);
            };
            eventBus.on('failsafe-event', eventHandler);
            // Clean up on connection close
            request.raw.on('close', () => {
                eventBus.off('failsafe-event', eventHandler);
            });
            // Keep connection alive
            const keepAlive = setInterval(() => {
                if (reply.raw.destroyed) {
                    clearInterval(keepAlive);
                    return;
                }
                reply.raw.write(': keepalive\n\n');
            }, 30000);
            request.raw.on('close', () => {
                clearInterval(keepAlive);
            });
        });
    }
    // Get recent events endpoint
    fastify.get('/events/recent', async (request, reply) => {
        const { limit = 50, type } = request.query;
        // In a real implementation, you'd store events in memory or database
        // For now, return empty array - events are streamed only
        return {
            events: [],
            total: 0,
            limit
        };
    });
    // Test event emission endpoint
    fastify.post('/events/test', async (request, reply) => {
        const { type = 'system', data = {}, severity = 'info' } = request.body;
        const event = fastify.emitEvent({
            type,
            data,
            severity
        });
        return {
            success: true,
            event
        };
    });
    fastify.log.info('Event bus initialized with SSE support');
};
function generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
exports.default = fastifyEventBus;
//# sourceMappingURL=fastify-event-bus.js.map