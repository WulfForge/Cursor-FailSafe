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
const fastifySpecGate = async (fastify, options) => {
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
        fastify.get('/spec-validation', async (request, reply) => {
            return {
                status: validationResult.hasErrors ? 'failed' : 'passed',
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                requiredComponents: requiredComponents.length,
                timestamp: new Date().toISOString()
            };
        });
        fastify.log.info(`Spec gate initialized with ${requiredComponents.length} required components`);
    }
    catch (error) {
        fastify.log.error('Failed to initialize spec gate:', error);
        if (strict) {
            throw error;
        }
    }
};
function extractRequiredComponents(specContent) {
    const components = [];
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
function validateUIComponents(requiredComponents) {
    const errors = [];
    const warnings = [];
    // Check if UI.ts exists and has required methods
    const uiPath = path.join(process.cwd(), 'src', 'ui.ts');
    if (!fs.existsSync(uiPath)) {
        errors.push('UI.ts file not found');
        return { hasErrors: true, errors, warnings, requiredComponents };
    }
    const uiContent = fs.readFileSync(uiPath, 'utf-8');
    // Validate each required component
    requiredComponents.forEach(component => {
        switch (component) {
            case '📊 Dashboard':
                if (!uiContent.includes('generateDashboard') && !uiContent.includes('Dashboard')) {
                    errors.push('Dashboard component not implemented');
                }
                else if (!uiContent.includes('Chart.js') && !uiContent.includes('chart')) {
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
exports.default = fastifySpecGate;
//# sourceMappingURL=fastify-spec-gate.js.map