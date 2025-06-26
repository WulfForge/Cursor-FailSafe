# FailSafe Fastify Implementation Guide

## Overview

This guide provides detailed implementation instructions for the Fastify plugins and enhancements outlined in the sprint plan. Each plugin is designed to be lightweight, dependency-free, and immediately beneficial to the FailSafe extension.

---

## Phase 1: Immediate Fastify Course-Correction

### 1.1 Fastify Spec Gate Plugin

**File**: `src/plugins/fastify-spec-gate.ts`

**Purpose**: Validates UI components against the specification to prevent drift and provide immediate feedback.

```typescript
import { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface SpecGateOptions {
  specPath: string;
  strict?: boolean;
}

const fastifySpecGate: FastifyPluginAsync<SpecGateOptions> = async (fastify, options) => {
  const { specPath, strict = true } = options;
  
  // Read and parse the UI specification
  const specContent = fs.readFileSync(specPath, 'utf-8');
  
  // Extract required UI components from spec
  const requiredComponents = extractRequiredComponents(specContent);
  
  // Validate current UI implementation
  const validationResult = validateUIComponents(requiredComponents);
  
  if (validationResult.hasErrors && strict) {
    fastify.log.error('UI Specification validation failed:', validationResult.errors);
    throw new Error(`UI Specification validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Decorate fastify with spec validation
  fastify.decorate('specValidation', {
    validate: () => validationResult,
    requiredComponents,
    specContent
  });
  
  // Add validation endpoint
  fastify.get('/spec-validation', async (request, reply) => {
    return {
      status: validationResult.hasErrors ? 'failed' : 'passed',
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      requiredComponents: requiredComponents.length
    };
  });
};

function extractRequiredComponents(specContent: string): string[] {
  const components: string[] = [];
  
  // Extract tab requirements
  const tabMatches = specContent.match(/#### 📊 Dashboard|#### 💻 Console|#### 🗓 Sprint Plan|#### 🔒 Cursor Rules|#### 📘 Logs/g);
  if (tabMatches) {
    components.push(...tabMatches.map(tab => tab.replace('#### ', '')));
  }
  
  // Extract chart requirements
  if (specContent.includes('Chart.js') || specContent.includes('charts')) {
    components.push('ChartSystem');
  }
  
  // Extract message handling requirements
  if (specContent.includes('message') || specContent.includes('communication')) {
    components.push('MessageHandling');
  }
  
  return components;
}

function validateUIComponents(requiredComponents: string[]): {
  hasErrors: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if UI.ts exists and has required methods
  const uiPath = path.join(process.cwd(), 'src', 'ui.ts');
  if (!fs.existsSync(uiPath)) {
    errors.push('UI.ts file not found');
    return { hasErrors: true, errors, warnings };
  }
  
  const uiContent = fs.readFileSync(uiPath, 'utf-8');
  
  // Validate each required component
  requiredComponents.forEach(component => {
    switch (component) {
      case '📊 Dashboard':
        if (!uiContent.includes('generateDashboard') && !uiContent.includes('Dashboard')) {
          errors.push('Dashboard component not implemented');
        }
        break;
      case '💻 Console':
        if (!uiContent.includes('Console') && !uiContent.includes('console')) {
          errors.push('Console component not implemented');
        }
        break;
      case '🗓 Sprint Plan':
        if (!uiContent.includes('Sprint') && !uiContent.includes('sprint')) {
          errors.push('Sprint Plan component not implemented');
        }
        break;
      case '🔒 Cursor Rules':
        if (!uiContent.includes('Cursor') && !uiContent.includes('cursor')) {
          errors.push('Cursor Rules component not implemented');
        }
        break;
      case '📘 Logs':
        if (!uiContent.includes('Logs') && !uiContent.includes('logs')) {
          errors.push('Logs component not implemented');
        }
        break;
      case 'ChartSystem':
        if (!uiContent.includes('Chart.js') && !uiContent.includes('chart')) {
          warnings.push('Chart system not fully implemented');
        }
        break;
      case 'MessageHandling':
        if (!uiContent.includes('postMessage') && !uiContent.includes('onDidReceiveMessage')) {
          warnings.push('Message handling not fully implemented');
        }
        break;
    }
  });
  
  return {
    hasErrors: errors.length > 0,
    errors,
    warnings
  };
}

export default fastifySpecGate;
```

### 1.2 Fastify Event Bus Plugin

**File**: `src/plugins/fastify-event-bus.ts`

**Purpose**: Provides real-time event streaming via Server-Sent Events (SSE).

```typescript
import { FastifyPluginAsync } from 'fastify';
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

const fastifyEventBus: FastifyPluginAsync<EventBusOptions> = async (fastify, options) => {
  const { maxListeners = 100, enableSSE = true } = options;
  
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
    fastify.get('/events', async (request, reply) => {
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
  fastify.get('/events/recent', async (request, reply) => {
    const { limit = 50, type } = request.query as { limit?: number; type?: string };
    
    // In a real implementation, you'd store events in memory or database
    // For now, return empty array - events are streamed only
    return {
      events: [],
      total: 0,
      limit
    };
  });
};

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default fastifyEventBus;
```

### 1.3 Fastify Health Check Plugin

**File**: `src/plugins/fastify-health.ts`

**Purpose**: Provides health check endpoint for CI integration and monitoring.

```typescript
import { FastifyPluginAsync } from 'fastify';

interface HealthOptions {
  includeDetails?: boolean;
  customChecks?: Array<() => Promise<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>>;
}

const fastifyHealth: FastifyPluginAsync<HealthOptions> = async (fastify, options) => {
  const { includeDetails = false, customChecks = [] } = options;
  
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();
    
    // Basic server health
    const serverHealth = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Plugin health checks
    const pluginChecks = await checkPluginHealth(fastify);
    
    // Custom health checks
    const customHealthResults = await Promise.all(
      customChecks.map(async (check) => {
        try {
          return await check();
        } catch (error) {
          return {
            name: 'custom-check',
            status: 'unhealthy' as const,
            details: { error: error.message }
          };
        }
      })
    );
    
    // Overall health status
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
      }
    };
    
    // Include detailed information if requested
    if (includeDetails) {
      response.details = {
        version: process.env.npm_package_version || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      };
    }
    
    const statusCode = hasUnhealthy ? 503 : 200;
    reply.status(statusCode).send(response);
  });
  
  // Simple health check for load balancers
  fastify.get('/health/simple', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
};

async function checkPluginHealth(fastify: any): Promise<Array<{ name: string; status: 'healthy' | 'unhealthy'; details?: any }>> {
  const checks = [];
  
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
  
  return checks;
}

export default fastifyHealth;
```

---

## Phase 4: Opportunistic Fastify Enhancements

### 4.1 TypeBox Schema Export

**File**: `src/schemas/index.ts`

**Purpose**: Export typed DTOs to front-end for reduced runtime errors.

```typescript
import { Type, Static } from '@sinclair/typebox';

// Core DTOs
export const TaskDTO = Type.Object({
  id: Type.String(),
  name: Type.String(),
  status: Type.Union([
    Type.Literal('not_started'),
    Type.Literal('in_progress'),
    Type.Literal('completed'),
    Type.Literal('blocked'),
    Type.Literal('delayed')
  ]),
  sprintId: Type.Optional(Type.String()),
  dependsOn: Type.Array(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
});

export const SprintDTO = Type.Object({
  id: Type.String(),
  name: Type.String(),
  start: Type.String({ format: 'date-time' }),
  end: Type.String({ format: 'date-time' }),
  status: Type.Union([
    Type.Literal('building'),
    Type.Literal('active'),
    Type.Literal('complete')
  ]),
  velocity: Type.Number()
});

export const RuleDTO = Type.Object({
  id: Type.String(),
  name: Type.String(),
  category: Type.Union([
    Type.Literal('lint'),
    Type.Literal('security'),
    Type.Literal('style'),
    Type.Literal('custom')
  ]),
  enabled: Type.Boolean(),
  triggerCount: Type.Number(),
  lastTriggered: Type.Optional(Type.String({ format: 'date-time' })),
  logic: Type.String()
});

export const ValidationResultDTO = Type.Object({
  status: Type.Union([Type.Literal('pass'), Type.Literal('fail')]),
  results: Type.Array(Type.Object({
    file: Type.String(),
    issues: Type.Array(Type.Object({
      line: Type.Number(),
      column: Type.Number(),
      message: Type.String(),
      severity: Type.Union([
        Type.Literal('info'),
        Type.Literal('warning'),
        Type.Literal('error')
      ])
    }))
  }))
});

// Export types for TypeScript
export type Task = Static<typeof TaskDTO>;
export type Sprint = Static<typeof SprintDTO>;
export type Rule = Static<typeof RuleDTO>;
export type ValidationResult = Static<typeof ValidationResultDTO>;

// Schema registry for Fastify
export const schemas = {
  TaskDTO,
  SprintDTO,
  RuleDTO,
  ValidationResultDTO
};
```

### 4.2 Fastify Plugin Autoloader

**File**: `src/plugins/fastify-plugin-autoloader.ts`

**Purpose**: Auto-load plugins from `src/plugins` directory.

```typescript
import { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface AutoloaderOptions {
  dir: string;
  ignore?: string[];
  prefix?: string;
}

const fastifyPluginAutoloader: FastifyPluginAsync<AutoloaderOptions> = async (fastify, options) => {
  const { dir, ignore = ['index.ts', 'autoloader.ts'], prefix = '' } = options;
  
  const pluginsDir = path.resolve(dir);
  
  if (!fs.existsSync(pluginsDir)) {
    fastify.log.warn(`Plugins directory not found: ${pluginsDir}`);
    return;
  }
  
  const pluginFiles = fs.readdirSync(pluginsDir)
    .filter(file => file.endsWith('.ts') && !ignore.includes(file))
    .sort();
  
  fastify.log.info(`Found ${pluginFiles.length} plugins to load from ${pluginsDir}`);
  
  for (const file of pluginFiles) {
    try {
      const pluginPath = path.join(pluginsDir, file);
      const pluginModule = require(pluginPath);
      
      // Handle both default exports and named exports
      const plugin = pluginModule.default || pluginModule;
      
      if (typeof plugin === 'function') {
        const pluginName = path.basename(file, '.ts');
        fastify.log.info(`Loading plugin: ${pluginName}`);
        
        await fastify.register(plugin, {
          prefix: prefix ? `${prefix}/${pluginName}` : undefined
        });
        
        fastify.log.info(`Successfully loaded plugin: ${pluginName}`);
      } else {
        fastify.log.warn(`Invalid plugin in ${file}: not a function`);
      }
    } catch (error) {
      fastify.log.error(`Failed to load plugin ${file}:`, error);
      // Continue loading other plugins
    }
  }
  
  fastify.log.info(`Plugin autoloading completed. Loaded ${pluginFiles.length} plugins.`);
};

export default fastifyPluginAutoloader;
```

### 4.3 Request Logging Ring Buffer

**File**: `src/plugins/fastify-request-logger.ts`

**Purpose**: Add request/response logging to Logs tab.

```typescript
import { FastifyPluginAsync } from 'fastify';

interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  requestBody?: any;
  responseBody?: any;
  userAgent?: string;
  ip?: string;
}

interface RequestLoggerOptions {
  maxEntries?: number;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  excludePaths?: string[];
}

class RingBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private size: number = 0;
  
  constructor(private maxSize: number) {
    this.buffer = new Array(maxSize);
  }
  
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    this.size = Math.min(this.size + 1, this.maxSize);
  }
  
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head - this.size + i + this.maxSize) % this.maxSize;
      result.push(this.buffer[index]);
    }
    return result;
  }
  
  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.head = 0;
    this.size = 0;
  }
}

const fastifyRequestLogger: FastifyPluginAsync<RequestLoggerOptions> = async (fastify, options) => {
  const {
    maxEntries = 1000,
    logRequestBody = false,
    logResponseBody = false,
    excludePaths = ['/health', '/events']
  } = options;
  
  const requestLog = new RingBuffer<RequestLogEntry>(maxEntries);
  
  // Decorate fastify with request log
  fastify.decorate('requestLog', {
    getEntries: () => requestLog.toArray(),
    clear: () => requestLog.clear(),
    getStats: () => ({
      totalRequests: requestLog.toArray().length,
      averageResponseTime: calculateAverageResponseTime(requestLog.toArray()),
      statusCodeDistribution: calculateStatusCodeDistribution(requestLog.toArray())
    })
  });
  
  // Add hook to log requests
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    
    // Skip excluded paths
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return;
    }
    
    // Store request start time for response logging
    (request as any).startTime = startTime;
  });
  
  // Add hook to log responses
  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (!startTime) return;
    
    const responseTime = Date.now() - startTime;
    
    const logEntry: RequestLogEntry = {
      id: generateRequestId(),
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    };
    
    // Add request body if enabled
    if (logRequestBody && request.body) {
      logEntry.requestBody = request.body;
    }
    
    // Add response body if enabled (be careful with large responses)
    if (logResponseBody && reply.payload) {
      const payload = reply.payload as string;
      if (payload.length < 10000) { // Limit response body size
        try {
          logEntry.responseBody = JSON.parse(payload);
        } catch {
          logEntry.responseBody = payload.substring(0, 1000); // Truncate if not JSON
        }
      }
    }
    
    requestLog.push(logEntry);
    
    // Emit event for real-time logging
    if (fastify.eventBus) {
      fastify.emitEvent({
        type: 'system',
        data: {
          message: `${request.method} ${request.url} - ${reply.statusCode} (${responseTime}ms)`,
          logEntry
        },
        severity: reply.statusCode >= 400 ? 'warning' : 'info'
      });
    }
  });
  
  // Add endpoint to get request logs
  fastify.get('/logs/requests', async (request, reply) => {
    const { limit = 100, statusCode, method } = request.query as {
      limit?: number;
      statusCode?: number;
      method?: string;
    };
    
    let entries = requestLog.toArray();
    
    // Apply filters
    if (statusCode) {
      entries = entries.filter(entry => entry.statusCode === statusCode);
    }
    
    if (method) {
      entries = entries.filter(entry => entry.method.toLowerCase() === method.toLowerCase());
    }
    
    // Apply limit
    entries = entries.slice(-limit);
    
    return {
      entries,
      total: entries.length,
      stats: fastify.requestLog.getStats()
    };
  });
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateAverageResponseTime(entries: RequestLogEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.responseTime, 0);
  return Math.round(total / entries.length);
}

function calculateStatusCodeDistribution(entries: RequestLogEntry[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  entries.forEach(entry => {
    distribution[entry.statusCode] = (distribution[entry.statusCode] || 0) + 1;
  });
  return distribution;
}

export default fastifyRequestLogger;
```

---

## Integration Instructions

### 1. Update extension.ts

Add the following to your `src/extension.ts` file:

```typescript
// Import plugins
import fastifySpecGate from './plugins/fastify-spec-gate';
import fastifyEventBus from './plugins/fastify-event-bus';
import fastifyHealth from './plugins/fastify-health';
import fastifyPluginAutoloader from './plugins/fastify-plugin-autoloader';
import fastifyRequestLogger from './plugins/fastify-request-logger';

// In your extension activation
private async initializeFastifyPlugins(): Promise<void> {
  try {
    // Register core plugins first
    await this.fastify.register(fastifySpecGate, {
      specPath: path.join(this.context.extensionPath, 'failsafe_ui_specification.md'),
      strict: true
    });
    
    await this.fastify.register(fastifyEventBus, {
      maxListeners: 100,
      enableSSE: true
    });
    
    await this.fastify.register(fastifyHealth, {
      includeDetails: true,
      customChecks: [
        async () => ({
          name: 'task-engine',
          status: this.taskEngine ? 'healthy' : 'unhealthy',
          details: { initialized: !!this.taskEngine }
        }),
        async () => ({
          name: 'project-plan',
          status: this.projectPlan ? 'healthy' : 'unhealthy',
          details: { initialized: !!this.projectPlan }
        })
      ]
    });
    
    // Register autoloader for additional plugins
    await this.fastify.register(fastifyPluginAutoloader, {
      dir: path.join(this.context.extensionPath, 'src', 'plugins')
    });
    
    // Register request logger
    await this.fastify.register(fastifyRequestLogger, {
      maxEntries: 1000,
      logRequestBody: false,
      logResponseBody: false,
      excludePaths: ['/health', '/events', '/events/recent']
    });
    
    this.logger.info('Fastify plugins initialized successfully');
  } catch (error) {
    this.logger.error('Failed to initialize Fastify plugins:', error);
    throw error;
  }
}
```

### 2. Update UI Integration

Add event streaming to your UI webview:

```typescript
// In your UI.ts generateWebviewContent method
private setupEventStreaming(webview: vscode.Webview): void {
  const eventSource = new EventSource('/events');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    webview.postMessage({
      command: 'updateLogs',
      data: data
    });
  };
  
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
  };
}
```

### 3. Add Schema Validation

Update your existing endpoints to use TypeBox schemas:

```typescript
// In your route definitions
fastify.post('/tasks', {
  schema: {
    body: TaskDTO,
    response: {
      200: TaskDTO
    }
  }
}, async (request, reply) => {
  const task = request.body as Task;
  // Your task creation logic
  return createdTask;
});
```

---

## Testing Instructions

### 1. Plugin Testing

Create test files for each plugin:

```typescript
// test/plugins/fastify-spec-gate.test.ts
import { test } from 'tap';
import fastify from 'fastify';
import fastifySpecGate from '../../src/plugins/fastify-spec-gate';

test('fastify-spec-gate', async (t) => {
  const app = fastify();
  
  await app.register(fastifySpecGate, {
    specPath: './failsafe_ui_specification.md'
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/spec-validation'
  });
  
  t.equal(response.statusCode, 200);
  t.ok(response.json().status);
});
```

### 2. Integration Testing

Test the complete plugin integration:

```typescript
// test/integration/plugins.test.ts
import { test } from 'tap';
import { FailSafeExtension } from '../../src/extension';

test('plugin integration', async (t) => {
  const extension = new FailSafeExtension(mockContext);
  await extension.activate();
  
  // Test health endpoint
  const healthResponse = await extension.fastify.inject({
    method: 'GET',
    url: '/health'
  });
  
  t.equal(healthResponse.statusCode, 200);
  t.ok(healthResponse.json().status);
});
```

---

## Performance Considerations

1. **Event Bus**: Limit event listeners and implement cleanup
2. **Request Logging**: Use ring buffer to prevent memory leaks
3. **Spec Validation**: Cache validation results
4. **Health Checks**: Implement timeouts for custom checks

## Security Considerations

1. **SSE Endpoints**: Implement rate limiting
2. **Request Logging**: Sanitize sensitive data
3. **Health Checks**: Don't expose sensitive information
4. **Plugin Loading**: Validate plugin integrity

---

This implementation guide provides all the necessary code and instructions to implement the Fastify enhancements outlined in the sprint plan. Each plugin is designed to be lightweight, dependency-free, and immediately beneficial to the FailSafe extension. 