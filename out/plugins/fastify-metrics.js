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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fastifyMetrics = async (fastify, options) => {
    const { storagePath = '.failsafe/metrics.json', retentionDays = 30 } = options;
    // Ensure storage directory exists
    const storageDir = path.dirname(storagePath);
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }
    // Initialize metrics storage
    let metrics = [];
    try {
        if (fs.existsSync(storagePath)) {
            const data = fs.readFileSync(storagePath, 'utf-8');
            metrics = JSON.parse(data);
        }
    }
    catch (error) {
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
        }
        catch (error) {
            fastify.log.error('Failed to save metrics:', error);
        }
    };
    // Update daily metrics helper
    const updateDailyMetrics = (type, value = 1) => {
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
        }
        else {
            (dailyMetric[type]) += value;
        }
        saveMetrics();
    };
    // Metrics endpoint
    fastify.get('/metrics', async (request, reply) => {
        const { range = '7d' } = request.query;
        let days;
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
        const filledMetrics = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const existing = filteredMetrics.find(m => m.date === dateStr);
            if (existing) {
                filledMetrics.unshift(existing);
            }
            else {
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
        const peakDay = filledMetrics.reduce((peak, current) => current.requests > peak.requests ? current : peak);
        const response = {
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
        request.startTime = startTime;
    });
    fastify.addHook('onResponse', async (request, reply) => {
        const startTime = request.startTime;
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
exports.default = fastifyMetrics;
//# sourceMappingURL=fastify-metrics.js.map