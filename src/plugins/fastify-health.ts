/// <reference types="node" />
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

interface HealthOptions {
  includeDetails?: boolean;
  customChecks?: Array<() => Promise<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>>;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  checks: {
    server: {
      status: string;
      uptime: number;
      memory: NodeJS.MemoryUsage;
      timestamp: string;
    };
    plugins: Array<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>;
    custom: Array<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>;
  };
  details?: {
    version: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

const fastifyHealth: FastifyPluginAsync<HealthOptions> = async (fastify, options) => {
  const { includeDetails = false, customChecks = [] } = options;
  
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();
    
    try {
      // Basic health checks
      const checks = {
        server: true,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        checks,
        responseTime: `${responseTime}ms`,
        version: process.env.npm_package_version ?? 'unknown'
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      reply.status(503);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    }
  });
  
  // Simple health check for load balancers
  fastify.get('/health/simple', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Detailed health check with all information
  fastify.get('/health/detailed', async (request, reply) => {
    const startTime = Date.now();
    
    const serverHealth = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };
    
    const pluginChecks = await checkPluginHealth(fastify);
    const customHealthResults = await Promise.all(
      customChecks.map(async (check) => {
        try {
          return await check();
        } catch (error) {
          return {
            name: 'custom-check',
            status: 'unhealthy' as const,
            details: { error: error instanceof Error ? error.message : String(error) }
          };
        }
      })
    );
    
    const allChecks = [...pluginChecks, ...customHealthResults];
    const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy');
    
    const response = {
      status: hasUnhealthy ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks: {
        server: serverHealth,
        plugins: pluginChecks,
        custom: customHealthResults
      },
      details: {
        version: process.env.npm_package_version || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        title: process.title,
        argv: process.argv,
        env: Object.keys(process.env).length
      }
    };
    
    const statusCode = hasUnhealthy ? 503 : 200;
    reply.status(statusCode).send(response);
  });
  
  fastify.log.info('Health check endpoints initialized');
};

async function checkPluginHealth(fastify: any): Promise<Array<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>> {
  const checks: Array<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }> = [];
  
  // Check if event bus is available
  if (fastify.eventBus) {
    checks.push({
      name: 'event-bus',
      status: 'healthy',
      details: { listeners: fastify.eventBus.listenerCount('failsafe-event') }
    });
  } else {
    checks.push({
      name: 'event-bus',
      status: 'unhealthy',
      details: { error: 'Event bus not available' }
    });
  }
  
  // Check if spec validation is available
  if (fastify.specValidation) {
    const validation = fastify.specValidation.validate();
    checks.push({
      name: 'spec-validation',
      status: validation.hasErrors ? 'unhealthy' : 'healthy',
      details: { errors: validation.errors, warnings: validation.warnings }
    });
  } else {
    checks.push({
      name: 'spec-validation',
      status: 'unhealthy',
      details: { error: 'Spec validation not available' }
    });
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryHealthy = memoryUsage.heapUsed < 150 * 1024 * 1024; // 150MB limit
  
  checks.push({
    name: 'memory-usage',
    status: memoryHealthy ? 'healthy' : 'unhealthy',
    details: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      limit: '150MB'
    }
  });
  
  // Check if fastify instance is healthy
  checks.push({
    name: 'fastify-instance',
    status: 'healthy',
    details: { 
      routes: fastify.routes ? fastify.routes.length : 0,
      plugins: fastify.plugins ? fastify.plugins.length : 0
    }
  });
  
  return checks;
}

export default fastifyHealth; 