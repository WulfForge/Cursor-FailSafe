import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

interface FailureReplayOptions {
    logger: Logger;
    eventsPath?: string;
    logsPath?: string;
}

interface ReplayEvent {
    id: string;
    timestamp: string;
    type: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    source: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string;
    context?: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    tags: string[];
}

interface ReplaySession {
    id: string;
    name: string;
    startTime: string;
    endTime?: string;
    events: ReplayEvent[];
    currentIndex: number;
    filters: ReplayFilters;
    status: 'active' | 'paused' | 'completed' | 'failed';
}

interface ReplayFilters {
    severity?: string[];
    category?: string[];
    source?: string[];
    tags?: string[];
    timeRange?: {
        start: string;
        end: string;
    };
}

interface ReplayStep {
    event: ReplayEvent;
    index: number;
    total: number;
    timeFromStart: number;
    timeFromPrevious: number;
}

const fastifyFailureReplay: FastifyPluginAsync<FailureReplayOptions> = async (fastify, options) => {
    const { logger, eventsPath = '.failsafe/events.json', logsPath = '.failsafe/logs.json' } = options;

    // Ensure directories exist
    const eventsDir = path.dirname(path.join(process.cwd(), eventsPath));
    const logsDir = path.dirname(path.join(process.cwd(), logsPath));
    
    if (!fs.existsSync(eventsDir)) {
        fs.mkdirSync(eventsDir, { recursive: true });
    }
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Store active replay sessions
    const activeSessions = new Map<string, ReplaySession>();

    // Decorate fastify with failure replay functionality
    fastify.decorate('failureReplay', {
        async createReplaySession(name: string, filters?: ReplayFilters): Promise<ReplaySession> {
            try {
                const sessionId = `replay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const events = await loadEvents();
                
                // Apply filters
                const filteredEvents = applyFilters(events, filters || {});
                
                const session: ReplaySession = {
                    id: sessionId,
                    name,
                    startTime: new Date().toISOString(),
                    events: filteredEvents,
                    currentIndex: 0,
                    filters: filters || {},
                    status: 'active'
                };
                
                activeSessions.set(sessionId, session);
                
                logger.info(`Replay session created: ${sessionId} with ${filteredEvents.length} events`);
                return session;
                
            } catch (error) {
                logger.error('Failed to create replay session:', error);
                throw error;
            }
        },

        async getReplaySession(sessionId: string): Promise<ReplaySession | null> {
            return activeSessions.get(sessionId) || null;
        },

        async stepForward(sessionId: string): Promise<ReplayStep | null> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return null;
            }
            
            if (session.currentIndex >= session.events.length - 1) {
                session.status = 'completed';
                session.endTime = new Date().toISOString();
                return null;
            }
            
            session.currentIndex++;
            const event = session.events[session.currentIndex];
            const previousEvent = session.currentIndex > 0 ? session.events[session.currentIndex - 1] : null;
            
            const timeFromStart = new Date(event.timestamp).getTime() - new Date(session.events[0].timestamp).getTime();
            const timeFromPrevious = previousEvent ? 
                new Date(event.timestamp).getTime() - new Date(previousEvent.timestamp).getTime() : 0;
            
            return {
                event,
                index: session.currentIndex,
                total: session.events.length,
                timeFromStart,
                timeFromPrevious
            };
        },

        async stepBackward(sessionId: string): Promise<ReplayStep | null> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return null;
            }
            
            if (session.currentIndex <= 0) {
                return null;
            }
            
            session.currentIndex--;
            const event = session.events[session.currentIndex];
            const nextEvent = session.currentIndex < session.events.length - 1 ? session.events[session.currentIndex + 1] : null;
            
            const timeFromStart = new Date(event.timestamp).getTime() - new Date(session.events[0].timestamp).getTime();
            const timeFromPrevious = nextEvent ? 
                new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime() : 0;
            
            return {
                event,
                index: session.currentIndex,
                total: session.events.length,
                timeFromStart,
                timeFromPrevious
            };
        },

        async jumpToEvent(sessionId: string, eventIndex: number): Promise<ReplayStep | null> {
            const session = activeSessions.get(sessionId);
            if (!session || eventIndex < 0 || eventIndex >= session.events.length) {
                return null;
            }
            
            session.currentIndex = eventIndex;
            const event = session.events[eventIndex];
            
            const timeFromStart = new Date(event.timestamp).getTime() - new Date(session.events[0].timestamp).getTime();
            
            return {
                event,
                index: session.currentIndex,
                total: session.events.length,
                timeFromStart,
                timeFromPrevious: 0
            };
        },

        async pauseSession(sessionId: string): Promise<boolean> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            
            session.status = 'paused';
            return true;
        },

        async resumeSession(sessionId: string): Promise<boolean> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            
            session.status = 'active';
            return true;
        },

        async closeSession(sessionId: string): Promise<boolean> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            
            session.status = 'completed';
            session.endTime = new Date().toISOString();
            activeSessions.delete(sessionId);
            
            return true;
        },

        async getEventTimeline(sessionId: string): Promise<ReplayEvent[]> {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return [];
            }
            
            return session.events;
        },

        async getEventDetails(eventId: string): Promise<ReplayEvent | null> {
            try {
                const events = await loadEvents();
                return events.find(e => e.id === eventId) || null;
            } catch (error) {
                logger.error('Failed to get event details:', error);
                return null;
            }
        },

        async addEvent(event: Omit<ReplayEvent, 'id' | 'timestamp'>): Promise<string> {
            try {
                const events = await loadEvents();
                const newEvent: ReplayEvent = {
                    ...event,
                    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString()
                };
                
                events.push(newEvent);
                await saveEvents(events);
                
                // Emit to active sessions
                for (const session of activeSessions.values()) {
                    if (session.status === 'active' && matchesFilters(newEvent, session.filters)) {
                        session.events.push(newEvent);
                    }
                }
                
                logger.info(`Event added: ${newEvent.id}`);
                return newEvent.id;
                
            } catch (error) {
                logger.error('Failed to add event:', error);
                throw error;
            }
        }
    });

    // Register routes
    fastify.post('/failure-replay/sessions', {
        schema: {
            body: Type.Object({
                name: Type.String(),
                filters: Type.Optional(Type.Object({
                    severity: Type.Optional(Type.Array(Type.String())),
                    category: Type.Optional(Type.Array(Type.String())),
                    source: Type.Optional(Type.Array(Type.String())),
                    tags: Type.Optional(Type.Array(Type.String())),
                    timeRange: Type.Optional(Type.Object({
                        start: Type.String(),
                        end: Type.String()
                    }))
                }))
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    session: Type.Object({
                        id: Type.String(),
                        name: Type.String(),
                        startTime: Type.String(),
                        events: Type.Array(Type.Object({
                            id: Type.String(),
                            timestamp: Type.String(),
                            type: Type.String(),
                            message: Type.String(),
                            source: Type.String(),
                            severity: Type.String(),
                            category: Type.String(),
                            tags: Type.Array(Type.String())
                        })),
                        currentIndex: Type.Number(),
                        status: Type.String()
                    }),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { name, filters } = request.body as { name: string; filters?: ReplayFilters };
            const session = await (fastify as any).failureReplay.createReplaySession(name, filters);
            
            return {
                success: true,
                session: {
                    id: session.id,
                    name: session.name,
                    startTime: session.startTime,
                    events: session.events.map((e: ReplayEvent) => ({
                        id: e.id,
                        timestamp: e.timestamp,
                        type: e.type,
                        message: e.message,
                        source: e.source,
                        severity: e.severity,
                        category: e.category,
                        tags: e.tags
                    })),
                    currentIndex: session.currentIndex,
                    status: session.status
                },
                message: 'Replay session created successfully'
            };
        } catch (error) {
            logger.error('Failed to create replay session:', error);
            reply.status(500).send({ error: 'Failed to create replay session' });
        }
    });

    fastify.get('/failure-replay/sessions/:id', {
        schema: {
            params: Type.Object({
                id: Type.String()
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    session: Type.Object({
                        id: Type.String(),
                        name: Type.String(),
                        startTime: Type.String(),
                        endTime: Type.Optional(Type.String()),
                        currentIndex: Type.Number(),
                        status: Type.String(),
                        totalEvents: Type.Number()
                    })
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const session = await (fastify as any).failureReplay.getReplaySession(id);
            
            if (!session) {
                reply.status(404).send({ error: 'Session not found' });
                return;
            }
            
            return {
                success: true,
                session: {
                    id: session.id,
                    name: session.name,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    currentIndex: session.currentIndex,
                    status: session.status,
                    totalEvents: session.events.length
                }
            };
        } catch (error) {
            logger.error('Failed to get replay session:', error);
            reply.status(500).send({ error: 'Failed to get replay session' });
        }
    });

    fastify.post('/failure-replay/sessions/:id/step-forward', {
        schema: {
            params: Type.Object({
                id: Type.String()
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    step: Type.Optional(Type.Object({
                        event: Type.Object({
                            id: Type.String(),
                            timestamp: Type.String(),
                            type: Type.String(),
                            message: Type.String(),
                            source: Type.String(),
                            file: Type.Optional(Type.String()),
                            line: Type.Optional(Type.Number()),
                            column: Type.Optional(Type.Number()),
                            severity: Type.String(),
                            category: Type.String(),
                            tags: Type.Array(Type.String()),
                            context: Type.Optional(Type.Record(Type.String(), Type.Any()))
                        }),
                        index: Type.Number(),
                        total: Type.Number(),
                        timeFromStart: Type.Number(),
                        timeFromPrevious: Type.Number()
                    })),
                    completed: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const step = await (fastify as any).failureReplay.stepForward(id);
            
            return {
                success: true,
                step,
                completed: !step,
                message: step ? 'Stepped forward' : 'Replay completed'
            };
        } catch (error) {
            logger.error('Failed to step forward:', error);
            reply.status(500).send({ error: 'Failed to step forward' });
        }
    });

    fastify.post('/failure-replay/sessions/:id/step-backward', {
        schema: {
            params: Type.Object({
                id: Type.String()
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    step: Type.Optional(Type.Object({
                        event: Type.Object({
                            id: Type.String(),
                            timestamp: Type.String(),
                            type: Type.String(),
                            message: Type.String(),
                            source: Type.String(),
                            file: Type.Optional(Type.String()),
                            line: Type.Optional(Type.Number()),
                            column: Type.Optional(Type.Number()),
                            severity: Type.String(),
                            category: Type.String(),
                            tags: Type.Array(Type.String()),
                            context: Type.Optional(Type.Record(Type.String(), Type.Any()))
                        }),
                        index: Type.Number(),
                        total: Type.Number(),
                        timeFromStart: Type.Number(),
                        timeFromPrevious: Type.Number()
                    })),
                    atBeginning: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const step = await (fastify as any).failureReplay.stepBackward(id);
            
            return {
                success: true,
                step,
                atBeginning: !step,
                message: step ? 'Stepped backward' : 'At beginning'
            };
        } catch (error) {
            logger.error('Failed to step backward:', error);
            reply.status(500).send({ error: 'Failed to step backward' });
        }
    });

    fastify.get('/failure-replay/events/:id', {
        schema: {
            params: Type.Object({
                id: Type.String()
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    event: Type.Optional(Type.Object({
                        id: Type.String(),
                        timestamp: Type.String(),
                        type: Type.String(),
                        message: Type.String(),
                        source: Type.String(),
                        file: Type.Optional(Type.String()),
                        line: Type.Optional(Type.Number()),
                        column: Type.Optional(Type.Number()),
                        stack: Type.Optional(Type.String()),
                        context: Type.Optional(Type.Record(Type.String(), Type.Any())),
                        severity: Type.String(),
                        category: Type.String(),
                        tags: Type.Array(Type.String())
                    }))
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const event = await (fastify as any).failureReplay.getEventDetails(id);
            
            return {
                success: true,
                event
            };
        } catch (error) {
            logger.error('Failed to get event details:', error);
            reply.status(500).send({ error: 'Failed to get event details' });
        }
    });

    // Helper functions
    async function loadEvents(): Promise<ReplayEvent[]> {
        const fullEventsPath = path.join(process.cwd(), options.eventsPath || '.failsafe/events.json');
        
        if (!fs.existsSync(fullEventsPath)) {
            return [];
        }
        
        try {
            const content = fs.readFileSync(fullEventsPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            logger.error('Failed to load events:', error);
            return [];
        }
    }

    async function saveEvents(events: ReplayEvent[]): Promise<void> {
        const fullEventsPath = path.join(process.cwd(), options.eventsPath || '.failsafe/events.json');
        fs.writeFileSync(fullEventsPath, JSON.stringify(events, null, 2));
    }

    function applyFilters(events: ReplayEvent[], filters: ReplayFilters): ReplayEvent[] {
        return events.filter(event => matchesFilters(event, filters));
    }

    function matchesFilters(event: ReplayEvent, filters: ReplayFilters): boolean {
        if (filters.severity && !filters.severity.includes(event.severity)) {
            return false;
        }
        
        if (filters.category && !filters.category.includes(event.category)) {
            return false;
        }
        
        if (filters.source && !filters.source.includes(event.source)) {
            return false;
        }
        
        if (filters.tags && filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some(tag => event.tags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }
        
        if (filters.timeRange) {
            const eventTime = new Date(event.timestamp).getTime();
            const startTime = new Date(filters.timeRange.start).getTime();
            const endTime = new Date(filters.timeRange.end).getTime();
            
            if (eventTime < startTime || eventTime > endTime) {
                return false;
            }
        }
        
        return true;
    }
};

export default fastifyFailureReplay; 