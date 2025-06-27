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
const fastifyFailureReplay = async (fastify, options) => {
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
    const activeSessions = new Map();
    // Decorate fastify with failure replay functionality
    fastify.decorate('failureReplay', {
        async createReplaySession(name, filters) {
            try {
                const sessionId = `replay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const events = await loadEvents();
                // Apply filters
                const filteredEvents = applyFilters(events, filters || {});
                const session = {
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
            }
            catch (error) {
                logger.error('Failed to create replay session:', error);
                throw error;
            }
        },
        async getReplaySession(sessionId) {
            return activeSessions.get(sessionId) || null;
        },
        async stepForward(sessionId) {
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
        async stepBackward(sessionId) {
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
        async jumpToEvent(sessionId, eventIndex) {
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
        async pauseSession(sessionId) {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            session.status = 'paused';
            return true;
        },
        async resumeSession(sessionId) {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            session.status = 'active';
            return true;
        },
        async closeSession(sessionId) {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return false;
            }
            session.status = 'completed';
            session.endTime = new Date().toISOString();
            activeSessions.delete(sessionId);
            return true;
        },
        async getEventTimeline(sessionId) {
            const session = activeSessions.get(sessionId);
            if (!session) {
                return [];
            }
            return session.events;
        },
        async getEventDetails(eventId) {
            try {
                const events = await loadEvents();
                return events.find(e => e.id === eventId) || null;
            }
            catch (error) {
                logger.error('Failed to get event details:', error);
                return null;
            }
        },
        async addEvent(event) {
            try {
                const events = await loadEvents();
                const newEvent = {
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
            }
            catch (error) {
                logger.error('Failed to add event:', error);
                throw error;
            }
        }
    });
    // Register routes
    fastify.post('/failure-replay/sessions', {
        schema: {
            body: typebox_1.Type.Object({
                name: typebox_1.Type.String(),
                filters: typebox_1.Type.Optional(typebox_1.Type.Object({
                    severity: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
                    category: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
                    source: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
                    tags: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
                    timeRange: typebox_1.Type.Optional(typebox_1.Type.Object({
                        start: typebox_1.Type.String(),
                        end: typebox_1.Type.String()
                    }))
                }))
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    session: typebox_1.Type.Object({
                        id: typebox_1.Type.String(),
                        name: typebox_1.Type.String(),
                        startTime: typebox_1.Type.String(),
                        events: typebox_1.Type.Array(typebox_1.Type.Object({
                            id: typebox_1.Type.String(),
                            timestamp: typebox_1.Type.String(),
                            type: typebox_1.Type.String(),
                            message: typebox_1.Type.String(),
                            source: typebox_1.Type.String(),
                            severity: typebox_1.Type.String(),
                            category: typebox_1.Type.String(),
                            tags: typebox_1.Type.Array(typebox_1.Type.String())
                        })),
                        currentIndex: typebox_1.Type.Number(),
                        status: typebox_1.Type.String()
                    }),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { name, filters } = request.body;
            const session = await fastify.failureReplay.createReplaySession(name, filters);
            return {
                success: true,
                session: {
                    id: session.id,
                    name: session.name,
                    startTime: session.startTime,
                    events: session.events.map((e) => ({
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
        }
        catch (error) {
            logger.error('Failed to create replay session:', error);
            reply.status(500).send({ error: 'Failed to create replay session' });
        }
    });
    fastify.get('/failure-replay/sessions/:id', {
        schema: {
            params: typebox_1.Type.Object({
                id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    session: typebox_1.Type.Object({
                        id: typebox_1.Type.String(),
                        name: typebox_1.Type.String(),
                        startTime: typebox_1.Type.String(),
                        endTime: typebox_1.Type.Optional(typebox_1.Type.String()),
                        currentIndex: typebox_1.Type.Number(),
                        status: typebox_1.Type.String(),
                        totalEvents: typebox_1.Type.Number()
                    })
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const session = await fastify.failureReplay.getReplaySession(id);
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
        }
        catch (error) {
            logger.error('Failed to get replay session:', error);
            reply.status(500).send({ error: 'Failed to get replay session' });
        }
    });
    fastify.post('/failure-replay/sessions/:id/step-forward', {
        schema: {
            params: typebox_1.Type.Object({
                id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    step: typebox_1.Type.Optional(typebox_1.Type.Object({
                        event: typebox_1.Type.Object({
                            id: typebox_1.Type.String(),
                            timestamp: typebox_1.Type.String(),
                            type: typebox_1.Type.String(),
                            message: typebox_1.Type.String(),
                            source: typebox_1.Type.String(),
                            file: typebox_1.Type.Optional(typebox_1.Type.String()),
                            line: typebox_1.Type.Optional(typebox_1.Type.Number()),
                            column: typebox_1.Type.Optional(typebox_1.Type.Number()),
                            severity: typebox_1.Type.String(),
                            category: typebox_1.Type.String(),
                            tags: typebox_1.Type.Array(typebox_1.Type.String()),
                            context: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()))
                        }),
                        index: typebox_1.Type.Number(),
                        total: typebox_1.Type.Number(),
                        timeFromStart: typebox_1.Type.Number(),
                        timeFromPrevious: typebox_1.Type.Number()
                    })),
                    completed: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const step = await fastify.failureReplay.stepForward(id);
            return {
                success: true,
                step,
                completed: !step,
                message: step ? 'Stepped forward' : 'Replay completed'
            };
        }
        catch (error) {
            logger.error('Failed to step forward:', error);
            reply.status(500).send({ error: 'Failed to step forward' });
        }
    });
    fastify.post('/failure-replay/sessions/:id/step-backward', {
        schema: {
            params: typebox_1.Type.Object({
                id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    step: typebox_1.Type.Optional(typebox_1.Type.Object({
                        event: typebox_1.Type.Object({
                            id: typebox_1.Type.String(),
                            timestamp: typebox_1.Type.String(),
                            type: typebox_1.Type.String(),
                            message: typebox_1.Type.String(),
                            source: typebox_1.Type.String(),
                            file: typebox_1.Type.Optional(typebox_1.Type.String()),
                            line: typebox_1.Type.Optional(typebox_1.Type.Number()),
                            column: typebox_1.Type.Optional(typebox_1.Type.Number()),
                            severity: typebox_1.Type.String(),
                            category: typebox_1.Type.String(),
                            tags: typebox_1.Type.Array(typebox_1.Type.String()),
                            context: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()))
                        }),
                        index: typebox_1.Type.Number(),
                        total: typebox_1.Type.Number(),
                        timeFromStart: typebox_1.Type.Number(),
                        timeFromPrevious: typebox_1.Type.Number()
                    })),
                    atBeginning: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const step = await fastify.failureReplay.stepBackward(id);
            return {
                success: true,
                step,
                atBeginning: !step,
                message: step ? 'Stepped backward' : 'At beginning'
            };
        }
        catch (error) {
            logger.error('Failed to step backward:', error);
            reply.status(500).send({ error: 'Failed to step backward' });
        }
    });
    fastify.get('/failure-replay/events/:id', {
        schema: {
            params: typebox_1.Type.Object({
                id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    event: typebox_1.Type.Optional(typebox_1.Type.Object({
                        id: typebox_1.Type.String(),
                        timestamp: typebox_1.Type.String(),
                        type: typebox_1.Type.String(),
                        message: typebox_1.Type.String(),
                        source: typebox_1.Type.String(),
                        file: typebox_1.Type.Optional(typebox_1.Type.String()),
                        line: typebox_1.Type.Optional(typebox_1.Type.Number()),
                        column: typebox_1.Type.Optional(typebox_1.Type.Number()),
                        stack: typebox_1.Type.Optional(typebox_1.Type.String()),
                        context: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any())),
                        severity: typebox_1.Type.String(),
                        category: typebox_1.Type.String(),
                        tags: typebox_1.Type.Array(typebox_1.Type.String())
                    }))
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const event = await fastify.failureReplay.getEventDetails(id);
            return {
                success: true,
                event
            };
        }
        catch (error) {
            logger.error('Failed to get event details:', error);
            reply.status(500).send({ error: 'Failed to get event details' });
        }
    });
    // Helper functions
    async function loadEvents() {
        const fullEventsPath = path.join(process.cwd(), options.eventsPath || '.failsafe/events.json');
        if (!fs.existsSync(fullEventsPath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(fullEventsPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            logger.error('Failed to load events:', error);
            return [];
        }
    }
    async function saveEvents(events) {
        const fullEventsPath = path.join(process.cwd(), options.eventsPath || '.failsafe/events.json');
        fs.writeFileSync(fullEventsPath, JSON.stringify(events, null, 2));
    }
    function applyFilters(events, filters) {
        return events.filter(event => matchesFilters(event, filters));
    }
    function matchesFilters(event, filters) {
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
exports.default = fastifyFailureReplay;
//# sourceMappingURL=fastify-failure-replay.js.map