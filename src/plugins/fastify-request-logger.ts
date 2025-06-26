/// <reference types="node" />
import { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RequestLogOptions {
  maxRequests?: number;
  includeHeaders?: boolean;
  includeBody?: boolean;
}

interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

class RequestRingBuffer {
  private buffer: RequestLogEntry[] = [];
  private readonly maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }
  
  add(entry: RequestLogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getAll(): RequestLogEntry[] {
    return [...this.buffer];
  }
  
  getRecent(limit: number): RequestLogEntry[] {
    return this.buffer.slice(-limit);
  }
  
  getByStatus(statusCode: number): RequestLogEntry[] {
    return this.buffer.filter(entry => entry.statusCode === statusCode);
  }
  
  getErrors(): RequestLogEntry[] {
    return this.buffer.filter(entry => entry.statusCode >= 400);
  }
  
  clear(): void {
    this.buffer = [];
  }
  
  getStats(): {
    total: number;
    errors: number;
    avgResponseTime: number;
    statusCodes: Record<number, number>;
  } {
    const total = this.buffer.length;
    const errors = this.buffer.filter(entry => entry.statusCode >= 400).length;
    const avgResponseTime = this.buffer.reduce((sum, entry) => sum + entry.responseTime, 0) / total || 0;
    
    const statusCodes: Record<number, number> = {};
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

const fastifyRequestLogger: FastifyPluginAsync<RequestLogOptions> = async (fastify: FastifyInstance, options: RequestLogOptions) => {
  const { maxRequests = 200, includeHeaders = false, includeBody = false } = options;
  
  const requestBuffer = new RequestRingBuffer(maxRequests);
  
  // Request logging hook
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Store request start time
    (request as any).startTime = startTime;
    (request as any).requestId = requestId;
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime;
    const requestId = (request as any).requestId;
    
    if (startTime && requestId) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const logEntry: RequestLogEntry = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime,
        userAgent: request.headers['user-agent'],
        ip: request.ip || request.headers['x-forwarded-for'] as string,
        error: reply.statusCode >= 400 ? 'Request failed' : undefined
      };
      
      // Include headers if requested
      if (includeHeaders) {
        logEntry.headers = request.headers as Record<string, string>;
      }
      
      // Include body if requested (be careful with sensitive data)
      if (includeBody && request.body && !request.url.includes('/auth')) {
        logEntry.body = request.body;
      }
      
      requestBuffer.add(logEntry);
    }
  });
  
  // Error logging hook
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const requestId = (request as any).requestId;
    if (requestId) {
      const existingEntry = requestBuffer.getAll().find(entry => entry.id === requestId);
      if (existingEntry) {
        existingEntry.error = error.message;
        existingEntry.statusCode = reply.statusCode;
      }
    }
  });
  
  // GET /requests endpoint
  fastify.get('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const { 
      limit, 
      status, 
      errors, 
      recent 
    } = request.query as { 
      limit?: string; 
      status?: string; 
      errors?: string; 
      recent?: string; 
    };
    
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
    } else if (limit) {
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
  fastify.get('/requests/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    return requestBuffer.getStats();
  });
  
  // DELETE /requests endpoint to clear buffer
  fastify.delete('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    requestBuffer.clear();
    return { success: true, message: 'Request buffer cleared' };
  });
  
  // Decorate fastify with request buffer access
  fastify.decorate('requestBuffer', requestBuffer);
  
  fastify.log.info(`Request logger initialized with ${maxRequests} request buffer`);
};

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    requestBuffer: RequestRingBuffer;
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default fastifyRequestLogger; 