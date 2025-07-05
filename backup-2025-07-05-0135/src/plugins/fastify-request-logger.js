"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestRingBuffer {
    constructor(maxSize) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    add(entry) {
        this.buffer.push(entry);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    getAll() {
        return [...this.buffer];
    }
    getRecent(limit) {
        return this.buffer.slice(-limit);
    }
    getByStatus(statusCode) {
        return this.buffer.filter(entry => entry.statusCode === statusCode);
    }
    getErrors() {
        return this.buffer.filter(entry => entry.statusCode >= 400);
    }
    clear() {
        this.buffer = [];
    }
    getStats() {
        const total = this.buffer.length;
        const errors = this.buffer.filter(entry => entry.statusCode >= 400).length;
        const avgResponseTime = this.buffer.reduce((sum, entry) => sum + entry.responseTime, 0) / total || 0;
        const statusCodes = {};
        this.buffer.forEach(entry => {
            statusCodes[entry.statusCode] = (statusCodes[entry.statusCode] || 0) + 1;
        });
        return {
            total,
            errors,
            avgResponseTime: Math.round(avgResponseTime),
            statusCodes
        };
    }
}
const fastifyRequestLogger = async (fastify, options) => {
    const { maxRequests = 200, includeHeaders = false, includeBody = false } = options;
    const requestBuffer = new RequestRingBuffer(maxRequests);
    // Request logging hook
    fastify.addHook('onRequest', async (request, reply) => {
        const startTime = Date.now();
        const requestId = generateRequestId();
        // Store request start time
        request.startTime = startTime;
        request.requestId = requestId;
    });
    fastify.addHook('onResponse', async (request, reply) => {
        const startTime = request.startTime;
        const requestId = request.requestId;
        if (startTime && requestId) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const logEntry = {
                id: requestId,
                timestamp: new Date().toISOString(),
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                responseTime,
                userAgent: request.headers['user-agent'],
                ip: request.ip || request.headers['x-forwarded-for'],
                error: reply.statusCode >= 400 ? 'Request failed' : undefined
            };
            // Include headers if requested
            if (includeHeaders) {
                logEntry.headers = request.headers;
            }
            // Include body if requested (be careful with sensitive data)
            if (includeBody && request.body && !request.url.includes('/auth')) {
                logEntry.body = request.body;
            }
            requestBuffer.add(logEntry);
        }
    });
    // Error logging hook
    fastify.addHook('onError', async (request, reply, error) => {
        const requestId = request.requestId;
        if (requestId) {
            const existingEntry = requestBuffer.getAll().find(entry => entry.id === requestId);
            if (existingEntry) {
                existingEntry.error = error.message;
                existingEntry.statusCode = reply.statusCode;
            }
        }
    });
    // GET /requests endpoint
    fastify.get('/requests', async (request, reply) => {
        const { limit, status, errors, recent } = request.query;
        let requests = requestBuffer.getAll();
        // Filter by status code
        if (status) {
            const statusCode = parseInt(status);
            if (!isNaN(statusCode)) {
                requests = requests.filter(req => req.statusCode === statusCode);
            }
        }
        // Filter errors only
        if (errors === 'true') {
            requests = requests.filter(req => req.statusCode >= 400);
        }
        // Get recent requests
        if (recent === 'true') {
            const recentLimit = limit ? parseInt(limit) : 10;
            requests = requestBuffer.getRecent(recentLimit);
        }
        else if (limit) {
            const limitNum = parseInt(limit);
            if (!isNaN(limitNum)) {
                requests = requests.slice(-limitNum);
            }
        }
        const stats = requestBuffer.getStats();
        return {
            requests,
            stats,
            total: requests.length,
            timestamp: new Date().toISOString()
        };
    });
    // GET /requests/stats endpoint
    fastify.get('/requests/stats', async (request, reply) => {
        return requestBuffer.getStats();
    });
    // DELETE /requests endpoint to clear buffer
    fastify.delete('/requests', async (request, reply) => {
        requestBuffer.clear();
        return { success: true, message: 'Request buffer cleared' };
    });
    // Decorate fastify with request buffer access
    fastify.decorate('requestBuffer', requestBuffer);
    fastify.log.info(`Request logger initialized with ${maxRequests} request buffer`);
};
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
exports.default = fastifyRequestLogger;
//# sourceMappingURL=fastify-request-logger.js.map