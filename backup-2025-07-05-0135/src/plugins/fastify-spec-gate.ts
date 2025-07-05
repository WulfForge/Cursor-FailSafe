import { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface SpecGateOptions {
  specPath: string;
  strict?: boolean;
}

interface ValidationResult {
  hasErrors: boolean;
  errors: string[];
  warnings: string[];
  requiredComponents: string[];
}

const fastifySpecGate: FastifyPluginAsync<SpecGateOptions> = async (fastify: FastifyInstance, options: SpecGateOptions) => {
  const { specPath, strict = true } = options;
  
  try {
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
    fastify.get('/spec-validation', async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: validationResult.hasErrors ? 'failed' : 'passed',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        requiredComponents: requiredComponents.length,
        timestamp: new Date().toISOString()
      };
    });
    
    fastify.log.info(`Spec gate initialized with ${requiredComponents.length} required components`);
  } catch (error) {
    fastify.log.error('Failed to initialize spec gate:', error);
    if (strict) {
      throw error;
    }
  }
};

function extractRequiredComponents(specContent: string): string[] {
  const components: string[] = [];
  
  // Extract tab requirements
  const tabMatches = specContent.match(/#### 📊 Dashboard|#### 💻 Console|#### 🗓 Sprint Plan|#### 🔒 Cursor Rules|#### 📘 Logs/g);
  if (tabMatches) {
    components.push(...tabMatches.map(tab => tab.replace('#### ', '')));
  }
  
  // Extract chart requirements
  if (specContent.includes('Chart.js') || specContent.includes('charts') || specContent.includes('Effectiveness Charts')) {
    components.push('ChartSystem');
  }
  
  // Extract message handling requirements
  if (specContent.includes('message') || specContent.includes('communication') || specContent.includes('WebView')) {
    components.push('MessageHandling');
  }
  
  // Extract design document requirements
  if (specContent.includes('Design Document') || specContent.includes('design-doc')) {
    components.push('DesignDocument');
  }
  
  // Extract task management requirements
  if (specContent.includes('Task') || specContent.includes('Sprint') || specContent.includes('task')) {
    components.push('TaskManagement');
  }
  
  return components;
}

function validateUIComponents(requiredComponents: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Try multiple paths for ui.js file
  const possiblePaths = [
    path.join(process.cwd(), 'out', 'ui.js'),
    path.join(__dirname, '..', 'ui.js'),
    path.join(process.cwd(), 'src', 'ui.ts')
  ];
  
  let uiPath: string | null = null;
  let uiContent = '';
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      uiPath = testPath;
      try {
        uiContent = fs.readFileSync(testPath, 'utf-8');
        break;
      } catch (error) {
        // Continue to next path
      }
    }
  }
  
  if (!uiPath || !uiContent) {
    errors.push('ui.js file not found in any expected location');
    return { hasErrors: true, errors, warnings, requiredComponents };
  }
  
  // Validate each required component
  requiredComponents.forEach(component => {
    switch (component) {
      case '📊 Dashboard':
        if (!uiContent.includes('generateDashboard') && !uiContent.includes('Dashboard')) {
          errors.push('Dashboard component not implemented');
        } else if (!uiContent.includes('Chart.js') && !uiContent.includes('chart')) {
          warnings.push('Dashboard charts not fully implemented');
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
      case 'DesignDocument':
        if (!uiContent.includes('DesignDocument') && !uiContent.includes('design-doc')) {
          warnings.push('Design document integration not fully implemented');
        }
        break;
      case 'TaskManagement':
        if (!uiContent.includes('Task') && !uiContent.includes('task')) {
          warnings.push('Task management not fully implemented');
        }
        break;
    }
  });
  
  return {
    hasErrors: errors.length > 0,
    errors,
    warnings,
    requiredComponents
  };
}

export default fastifySpecGate; 