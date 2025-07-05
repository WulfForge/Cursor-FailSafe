/// <reference types="node" />
import { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface MetricsOptions {
  storagePath?: string;
  retentionDays?: number;
}

interface DailyMetrics {
  date: string;
  requests: number;
  errors: number;
  validations: number;
  ruleTriggers: number;
  taskEvents: number;
  avgResponseTime: number;
  uniqueUsers: number;
}

interface MetricsResponse {
  range: string;
  data: DailyMetrics[];
  summary: {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    errorRate: number;
    peakDay: string;
    peakRequests: number;
  };
}

const fastifyMetrics: FastifyPluginAsync<MetricsOptions> = async (fastify: FastifyInstance, options: MetricsOptions) => {
  const { storagePath = '.failsafe/metrics.json', retentionDays = 30 } = options;
  
  // Ensure storage directory exists
  const storageDir = path.dirname(storagePath);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  // Initialize metrics storage
  let metrics: DailyMetrics[] = [];
  try {
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8');
      metrics = JSON.parse(data);
    }
  } catch (error) {
    fastify.log.warn('Failed to load metrics, starting fresh:', error);
  }
  
  // Clean up old metrics
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  metrics = metrics.filter(m => new Date(m.date) > cutoffDate);
  
  // Save metrics helper
  const saveMetrics = () => {
    try {
      fs.writeFileSync(storagePath, JSON.stringify(metrics, null, 2));
    } catch (error) {
      fastify.log.error('Failed to save metrics:', error);
    }
  };
  
  // Update daily metrics helper
  const updateDailyMetrics = (type: keyof Omit<DailyMetrics, 'date'>, value = 1) => {
    const today = new Date().toISOString().split('T')[0];
    let dailyMetric = metrics.find(m => m.date === today);
    
    if (!dailyMetric) {
      dailyMetric = {
        date: today,
        requests: 0,
        errors: 0,
        validations: 0,
        ruleTriggers: 0,
        taskEvents: 0,
        avgResponseTime: 0,
        uniqueUsers: 0
      };
      metrics.push(dailyMetric);
    }
    
    if (type === 'avgResponseTime') {
      // Calculate running average
      const currentTotal = dailyMetric.avgResponseTime * (dailyMetric.requests - 1);
      dailyMetric.avgResponseTime = (currentTotal + value) / dailyMetric.requests;
    } else {
      (dailyMetric[type] ) += value;
    }
    
    saveMetrics();
  };
  
  // Metrics endpoint
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const { range = '7d' } = request.query as { range?: string };
    
    let days: number;
    switch (range) {
      case '1d':
        days = 1;
        break;
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      default:
        days = 7;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredMetrics = metrics.filter(m => new Date(m.date) >= cutoffDate);
    
    // Fill in missing dates with zero values
    const filledMetrics: DailyMetrics[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = filteredMetrics.find(m => m.date === dateStr);
      if (existing) {
        filledMetrics.unshift(existing);
      } else {
        filledMetrics.unshift({
          date: dateStr,
          requests: 0,
          errors: 0,
          validations: 0,
          ruleTriggers: 0,
          taskEvents: 0,
          avgResponseTime: 0,
          uniqueUsers: 0
        });
      }
    }
    
    // Calculate summary
    const totalRequests = filledMetrics.reduce((sum, m) => sum + m.requests, 0);
    const totalErrors = filledMetrics.reduce((sum, m) => sum + m.errors, 0);
    const avgResponseTime = filledMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / filledMetrics.length || 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    const peakDay = filledMetrics.reduce((peak, current) => 
      current.requests > peak.requests ? current : peak
    );
    
    const response: MetricsResponse = {
      range,
      data: filledMetrics,
      summary: {
        totalRequests,
        totalErrors,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        peakDay: peakDay.date,
        peakRequests: peakDay.requests
      }
    };
    
    return response;
  });
  
  // Hook to track requests
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    
    // Store start time on request for later use
    (request as any).startTime = startTime;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const responseTime = Date.now() - startTime;
      updateDailyMetrics('requests');
      updateDailyMetrics('avgResponseTime', responseTime);
      
      if (reply.statusCode >= 400) {
        updateDailyMetrics('errors');
      }
    }
  });
  
  // Decorate fastify with metrics helpers
  fastify.decorate('trackValidation', () => updateDailyMetrics('validations'));
  fastify.decorate('trackRuleTrigger', () => updateDailyMetrics('ruleTriggers'));
  fastify.decorate('trackTaskEvent', () => updateDailyMetrics('taskEvents'));
  
  fastify.log.info('Metrics plugin initialized');
};

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    trackValidation: () => void;
    trackRuleTrigger: () => void;
    trackTaskEvent: () => void;
  }
}

export default fastifyMetrics; 