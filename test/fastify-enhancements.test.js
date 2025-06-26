const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fastify = require('fastify');
const fastifyMetrics = require('../src/plugins/fastify-metrics').default;
const fastifyRequestLogger = require('../src/plugins/fastify-request-logger').default;
const fastifyEventBus = require('../src/plugins/fastify-event-bus').default;

describe('Fastify Enhancements', () => {
  let app;

  beforeEach(async () => {
    app = fastify();
    
    // Register plugins
    await app.register(fastifyMetrics, {
      storagePath: '.failsafe/test-metrics.json',
      retentionDays: 7
    });
    
    await app.register(fastifyRequestLogger, {
      maxRequests: 50,
      includeHeaders: false,
      includeBody: false
    });
    
    await app.register(fastifyEventBus, {
      maxListeners: 10,
      enableSSE: true
    });
    
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Metrics Plugin', () => {
    test('GET /metrics should return metrics data', async () => {
      // Make some requests to generate metrics
      await app.inject({
        method: 'GET',
        url: '/test'
      });

      await app.inject({
        method: 'GET',
        url: '/test2'
      });

      const response = await app.inject({
        method: 'GET',
        url: '/metrics?range=7d'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      
      expect(data).toHaveProperty('range', '7d');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('totalRequests');
      expect(data.summary).toHaveProperty('totalErrors');
      expect(data.summary).toHaveProperty('avgResponseTime');
      expect(data.summary).toHaveProperty('errorRate');
      expect(data.summary).toHaveProperty('peakDay');
      expect(data.summary).toHaveProperty('peakRequests');
    });

    test('GET /metrics should handle different ranges', async () => {
      const ranges = ['1d', '7d', '30d'];
      
      for (const range of ranges) {
        const response = await app.inject({
          method: 'GET',
          url: `/metrics?range=${range}`
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.range).toBe(range);
      }
    });

    test('should track validation events', async () => {
      app.trackValidation();
      app.trackValidation();
      
      const response = await app.inject({
        method: 'GET',
        url: '/metrics?range=1d'
      });

      const data = JSON.parse(response.payload);
      const today = new Date().toISOString().split('T')[0];
      const todayMetrics = data.data.find(m => m.date === today);
      
      expect(todayMetrics.validations).toBe(2);
    });

    test('should track rule triggers', async () => {
      app.trackRuleTrigger();
      
      const response = await app.inject({
        method: 'GET',
        url: '/metrics?range=1d'
      });

      const data = JSON.parse(response.payload);
      const today = new Date().toISOString().split('T')[0];
      const todayMetrics = data.data.find(m => m.date === today);
      
      expect(todayMetrics.ruleTriggers).toBe(1);
    });

    test('should track task events', async () => {
      app.trackTaskEvent();
      app.trackTaskEvent();
      app.trackTaskEvent();
      
      const response = await app.inject({
        method: 'GET',
        url: '/metrics?range=1d'
      });

      const data = JSON.parse(response.payload);
      const today = new Date().toISOString().split('T')[0];
      const todayMetrics = data.data.find(m => m.date === today);
      
      expect(todayMetrics.taskEvents).toBe(3);
    });
  });

  describe('Request Logger Plugin', () => {
    test('GET /requests should return request logs', async () => {
      // Make some test requests
      await app.inject({
        method: 'GET',
        url: '/test1'
      });

      await app.inject({
        method: 'POST',
        url: '/test2',
        payload: { test: 'data' }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/requests'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      
      expect(data).toHaveProperty('requests');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('timestamp');
      expect(data.requests.length).toBeGreaterThan(0);
    });

    test('GET /requests/stats should return statistics', async () => {
      // Make some requests
      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'GET', url: '/test2' });
      await app.inject({ method: 'POST', url: '/test3' });

      const response = await app.inject({
        method: 'GET',
        url: '/requests/stats'
      });

      expect(response.statusCode).toBe(200);
      const stats = JSON.parse(response.payload);
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('statusCodes');
      expect(stats.total).toBeGreaterThan(0);
    });

    test('GET /requests should filter by status code', async () => {
      // Make requests with different status codes
      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'GET', url: '/nonexistent' }); // 404

      const response = await app.inject({
        method: 'GET',
        url: '/requests?status=404'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      
      // All returned requests should have status 404
      data.requests.forEach(req => {
        expect(req.statusCode).toBe(404);
      });
    });

    test('GET /requests should filter errors only', async () => {
      // Make some requests including errors
      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'GET', url: '/nonexistent' }); // 404
      await app.inject({ method: 'GET', url: '/test2' });

      const response = await app.inject({
        method: 'GET',
        url: '/requests?errors=true'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      
      // All returned requests should be errors (4xx, 5xx)
      data.requests.forEach(req => {
        expect(req.statusCode).toBeGreaterThanOrEqual(400);
      });
    });

    test('DELETE /requests should clear the buffer', async () => {
      // Make some requests
      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'GET', url: '/test2' });

      // Verify requests exist
      let response = await app.inject({
        method: 'GET',
        url: '/requests'
      });
      let data = JSON.parse(response.payload);
      expect(data.requests.length).toBeGreaterThan(0);

      // Clear buffer
      response = await app.inject({
        method: 'DELETE',
        url: '/requests'
      });
      expect(response.statusCode).toBe(200);
      
      const clearResult = JSON.parse(response.payload);
      expect(clearResult.success).toBe(true);

      // Verify buffer is cleared
      response = await app.inject({
        method: 'GET',
        url: '/requests'
      });
      data = JSON.parse(response.payload);
      expect(data.requests.length).toBe(0);
    });
  });

  describe('Event Bus Plugin', () => {
    test('POST /events/test should emit test events', async () => {
      const testEvent = {
        type: 'system',
        data: { message: 'Test event' },
        severity: 'info'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events/test',
        payload: testEvent
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(result.event).toHaveProperty('id');
      expect(result.event).toHaveProperty('timestamp');
      expect(result.event.type).toBe(testEvent.type);
      expect(result.event.data).toEqual(testEvent.data);
      expect(result.event.severity).toBe(testEvent.severity);
    });

    test('GET /events/recent should return recent events', async () => {
      // Emit some test events
      await app.inject({
        method: 'POST',
        url: '/events/test',
        payload: { type: 'validation', data: {}, severity: 'info' }
      });

      await app.inject({
        method: 'POST',
        url: '/events/test',
        payload: { type: 'task_event', data: {}, severity: 'warning' }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/events/recent?limit=10'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data.limit).toBe(10);
    });

    test('should emit events through fastify.emitEvent', async () => {
      const event = {
        type: 'validation',
        data: { isValid: true },
        severity: 'info'
      };

      const emittedEvent = app.emitEvent(event);
      
      expect(emittedEvent).toHaveProperty('id');
      expect(emittedEvent).toHaveProperty('timestamp');
      expect(emittedEvent.type).toBe(event.type);
      expect(emittedEvent.data).toEqual(event.data);
      expect(emittedEvent.severity).toBe(event.severity);
    });
  });

  describe('Integration Tests', () => {
    test('should track metrics for all requests', async () => {
      // Make various types of requests
      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'POST', url: '/test2' });
      await app.inject({ method: 'PUT', url: '/test3' });
      await app.inject({ method: 'DELETE', url: '/test4' });

      // Track some events
      app.trackValidation();
      app.trackRuleTrigger();
      app.trackTaskEvent();

      // Check metrics
      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/metrics?range=1d'
      });

      const metrics = JSON.parse(metricsResponse.payload);
      const today = new Date().toISOString().split('T')[0];
      const todayMetrics = metrics.data.find(m => m.date === today);
      
      expect(todayMetrics.requests).toBeGreaterThan(0);
      expect(todayMetrics.validations).toBe(1);
      expect(todayMetrics.ruleTriggers).toBe(1);
      expect(todayMetrics.taskEvents).toBe(1);

      // Check request logs
      const requestsResponse = await app.inject({
        method: 'GET',
        url: '/requests'
      });

      const requests = JSON.parse(requestsResponse.payload);
      expect(requests.requests.length).toBeGreaterThan(0);
      expect(requests.stats.total).toBeGreaterThan(0);
    });

    test('should handle concurrent requests', async () => {
      const promises = [];
      
      // Make 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          app.inject({
            method: 'GET',
            url: `/concurrent-test-${i}`
          })
        );
      }

      await Promise.all(promises);

      // Check that all requests were logged
      const response = await app.inject({
        method: 'GET',
        url: '/requests'
      });

      const data = JSON.parse(response.payload);
      expect(data.requests.length).toBeGreaterThanOrEqual(10);
    });
  });
}); 