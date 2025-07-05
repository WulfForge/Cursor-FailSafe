import { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';

interface EventBusOptions {
  maxListeners?: number;
  enableSSE?: boolean;
}

interface FailSafeEvent {
  id: string;
  type: 'validation' | 'rule_trigger' | 'task_event' | 'system' | 'drift' | 'version';
  timestamp: string;
  data: any;
  severity: 'info' | 'warning' | 'critical';
}

// Extend FastifyInstance to include our custom methods
declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EventEmitter;
    emitEvent: (event: Omit<FailSafeEvent, 'id' | 'timestamp'>) => FailSafeEvent;
  }
}

const fastifyEventBus: FastifyPluginAsync<EventBusOptions> = async (fastify: FastifyInstance, options: EventBusOptions) => {
  const { maxListeners = 100, enableSSE = true } = options;
  
  // Check if event bus is already registered to prevent conflicts
  if (fastify.hasDecorator('eventBus')) {
    fastify.log.warn('Event bus already registered, skipping duplicate registration');
    return;
  }
  
  // Create event emitter
  const eventBus = new EventEmitter();
  eventBus.setMaxListeners(maxListeners);
  
  // Decorate fastify with event bus
  fastify.decorate('eventBus', eventBus);
  
  // Add event emission helper
  fastify.decorate('emitEvent', (event: Omit<FailSafeEvent, 'id' | 'timestamp'>) => {
    const fullEvent: FailSafeEvent = {
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
    fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      const sendEvent = (event: FailSafeEvent) => {
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
      const eventHandler = (event: FailSafeEvent) => {
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
  fastify.get('/events/recent', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 50, type } = request.query as { limit?: number; type?: string };
    
    // In a real implementation, you'd store events in memory or database
    // For now, return empty array - events are streamed only
    return {
      events: [],
      total: 0,
      limit
    };
  });
  
  // Test event emission endpoint
  fastify.post('/events/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type = 'system', data = {}, severity = 'info' } = request.body as any;
    
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

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default fastifyEventBus; 