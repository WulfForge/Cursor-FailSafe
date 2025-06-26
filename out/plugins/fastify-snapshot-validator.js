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
const crypto = __importStar(require("crypto"));
const SnapshotSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    timestamp: typebox_1.Type.String(),
    checksum: typebox_1.Type.String(),
    components: typebox_1.Type.Array(typebox_1.Type.Object({
        name: typebox_1.Type.String(),
        type: typebox_1.Type.Union([typebox_1.Type.Literal('tab'), typebox_1.Type.Literal('panel'), typebox_1.Type.Literal('widget'), typebox_1.Type.Literal('form')]),
        status: typebox_1.Type.Union([typebox_1.Type.Literal('present'), typebox_1.Type.Literal('missing'), typebox_1.Type.Literal('modified')]),
        properties: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()),
        children: typebox_1.Type.Array(typebox_1.Type.String()),
        checksum: typebox_1.Type.String()
    })),
    structure: typebox_1.Type.Object({
        tabs: typebox_1.Type.Array(typebox_1.Type.String()),
        panels: typebox_1.Type.Array(typebox_1.Type.String()),
        widgets: typebox_1.Type.Array(typebox_1.Type.String()),
        forms: typebox_1.Type.Array(typebox_1.Type.String()),
        navigation: typebox_1.Type.Array(typebox_1.Type.String()),
        actions: typebox_1.Type.Array(typebox_1.Type.String())
    }),
    metadata: typebox_1.Type.Object({
        version: typebox_1.Type.String(),
        totalComponents: typebox_1.Type.Number(),
        presentComponents: typebox_1.Type.Number(),
        missingComponents: typebox_1.Type.Number(),
        modifiedComponents: typebox_1.Type.Number()
    })
});
const fastifySnapshotValidator = async (fastify) => {
    const snapshotsDir = path.join(process.cwd(), '.failsafe', 'snapshots');
    // Ensure snapshots directory exists
    if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    // Decorate fastify with snapshot validator functionality
    fastify.decorate('snapshotValidator', {
        async createSnapshot() {
            const components = await fastify.snapshotValidator.scanUIComponents();
            const structure = fastify.snapshotValidator.buildStructureSnapshot(components);
            const checksum = fastify.snapshotValidator.calculateSnapshotChecksum(components, structure);
            const snapshot = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                checksum,
                components,
                structure,
                metadata: {
                    version: '1.0.0',
                    totalComponents: components.length,
                    presentComponents: components.filter((c) => c.status === 'present').length,
                    missingComponents: components.filter((c) => c.status === 'missing').length,
                    modifiedComponents: components.filter((c) => c.status === 'modified').length
                }
            };
            // Save snapshot
            const snapshotPath = path.join(snapshotsDir, `${snapshot.id}.json`);
            fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
            // Clean old snapshots (keep last 50)
            await fastify.snapshotValidator.cleanOldSnapshots();
            return snapshot;
        },
        async scanUIComponents() {
            const components = [];
            // Scan UI files for components
            const uiFiles = [
                'src/ui.ts',
                'src/commands.ts',
                'src/sidebarProvider.ts'
            ];
            for (const file of uiFiles) {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const fileComponents = fastify.snapshotValidator.extractComponentsFromFile(content, file);
                    components.push(...fileComponents);
                }
            }
            return components;
        },
        extractComponentsFromFile(content, filename) {
            const components = [];
            // Extract UI methods/classes
            const methodMatches = content.match(/public async (\w+)\(\)/g);
            if (methodMatches) {
                for (const match of methodMatches) {
                    const methodName = match.match(/public async (\w+)\(\)/)?.[1];
                    if (methodName && fastify.snapshotValidator.isUIComponent(methodName)) {
                        const componentType = fastify.snapshotValidator.getComponentType(methodName);
                        const properties = fastify.snapshotValidator.extractComponentProperties(content, methodName);
                        const children = fastify.snapshotValidator.extractComponentChildren(content, methodName);
                        components.push({
                            name: methodName,
                            type: componentType,
                            status: 'present',
                            properties,
                            children,
                            checksum: crypto.createHash('md5').update(methodName + JSON.stringify(properties)).digest('hex')
                        });
                    }
                }
            }
            // Extract class definitions
            const classMatches = content.match(/class (\w+)/g);
            if (classMatches) {
                for (const match of classMatches) {
                    const className = match.match(/class (\w+)/)?.[1];
                    if (className && fastify.snapshotValidator.isUIComponent(className)) {
                        const componentType = fastify.snapshotValidator.getComponentType(className);
                        const properties = fastify.snapshotValidator.extractClassProperties(content, className);
                        const children = fastify.snapshotValidator.extractClassChildren(content, className);
                        components.push({
                            name: className,
                            type: componentType,
                            status: 'present',
                            properties,
                            children,
                            checksum: crypto.createHash('md5').update(className + JSON.stringify(properties)).digest('hex')
                        });
                    }
                }
            }
            return components;
        },
        isUIComponent(name) {
            const uiComponents = [
                'showDashboard', 'showConsole', 'showLogs', 'showProjectPlan',
                'showProgressDetails', 'showAccountabilityReport', 'showFeasibilityAnalysis',
                'showActionLog', 'showFailsafeConfigPanel', 'UI', 'FailSafeSidebarProvider'
            ];
            return uiComponents.some(component => name.includes(component) || component.includes(name));
        },
        getComponentType(name) {
            if (name.includes('show') && (name.includes('Dashboard') || name.includes('Console') || name.includes('Logs'))) {
                return 'tab';
            }
            if (name.includes('Panel') || name.includes('Provider')) {
                return 'panel';
            }
            if (name.includes('Form') || name.includes('Config')) {
                return 'form';
            }
            return 'widget';
        },
        extractComponentProperties(content, methodName) {
            const properties = {};
            // Extract method signature and basic properties
            const methodRegex = new RegExp(`public async ${methodName}\\([^)]*\\)[^{]*{([^}]*)}`, 's');
            const match = content.match(methodRegex);
            if (match) {
                const methodBody = match[1];
                properties.hasWebview = methodBody.includes('createWebviewPanel');
                properties.hasSSE = methodBody.includes('EventSource');
                properties.hasFetch = methodBody.includes('fetch(');
                properties.hasToast = methodBody.includes('showToast');
            }
            return properties;
        },
        extractComponentChildren(content, methodName) {
            const children = [];
            // Look for child components called within this method
            const methodRegex = new RegExp(`public async ${methodName}\\([^)]*\\)[^{]*{([^}]*)}`, 's');
            const match = content.match(methodRegex);
            if (match) {
                const methodBody = match[1];
                const childMatches = methodBody.match(/this\.(\w+)\(/g);
                if (childMatches) {
                    for (const childMatch of childMatches) {
                        const childName = childMatch.match(/this\.(\w+)\(/)?.[1];
                        if (childName && childName !== methodName) {
                            children.push(childName);
                        }
                    }
                }
            }
            return children;
        },
        extractClassProperties(content, className) {
            const properties = {};
            // Extract class properties
            const classRegex = new RegExp(`class ${className}[^{]*{([^}]*)}`, 's');
            const match = content.match(classRegex);
            if (match) {
                const classBody = match[1];
                properties.hasPrivateMembers = classBody.includes('private readonly');
                properties.hasPublicMembers = classBody.includes('public readonly');
                properties.hasMethods = classBody.includes('public async') || classBody.includes('private async');
            }
            return properties;
        },
        extractClassChildren(content, className) {
            const children = [];
            // Look for methods in the class
            const classRegex = new RegExp(`class ${className}[^{]*{([^}]*)}`, 's');
            const match = content.match(classRegex);
            if (match) {
                const classBody = match[1];
                const methodMatches = classBody.match(/public async (\w+)\(/g);
                if (methodMatches) {
                    for (const methodMatch of methodMatches) {
                        const methodName = methodMatch.match(/public async (\w+)\(/)?.[1];
                        if (methodName) {
                            children.push(methodName);
                        }
                    }
                }
            }
            return children;
        },
        buildStructureSnapshot(components) {
            return {
                tabs: components.filter(c => c.type === 'tab').map(c => c.name),
                panels: components.filter(c => c.type === 'panel').map(c => c.name),
                widgets: components.filter(c => c.type === 'widget').map(c => c.name),
                forms: components.filter(c => c.type === 'form').map(c => c.name),
                navigation: components.filter(c => c.name.includes('Navigation') || c.name.includes('Sidebar')).map(c => c.name),
                actions: components.filter(c => c.name.includes('Action') || c.name.includes('Command')).map(c => c.name)
            };
        },
        calculateSnapshotChecksum(components, structure) {
            const data = JSON.stringify({ components, structure });
            return crypto.createHash('md5').update(data).digest('hex');
        },
        async compareSnapshots(snapshot1, snapshot2) {
            const diff = {
                added: [],
                removed: [],
                modified: [],
                structuralChanges: []
            };
            // Find added and removed components
            const components1 = new Map(snapshot1.components.map(c => [c.name, c]));
            const components2 = new Map(snapshot2.components.map(c => [c.name, c]));
            for (const [name, component] of components2) {
                if (!components1.has(name)) {
                    diff.added.push(component);
                }
            }
            for (const [name, component] of components1) {
                if (!components2.has(name)) {
                    diff.removed.push(component);
                }
            }
            // Find modified components
            for (const [name, component1] of components1) {
                const component2 = components2.get(name);
                if (component2 && component1.checksum !== component2.checksum) {
                    const changes = {};
                    // Compare properties
                    for (const [key, value] of Object.entries(component1.properties)) {
                        if (component2.properties[key] !== value) {
                            changes[key] = { before: value, after: component2.properties[key] };
                        }
                    }
                    if (Object.keys(changes).length > 0) {
                        diff.modified.push({
                            component: name,
                            changes
                        });
                    }
                }
            }
            // Find structural changes
            const structure1 = snapshot1.structure;
            const structure2 = snapshot2.structure;
            for (const [key, items1] of Object.entries(structure1)) {
                const items2 = structure2[key];
                const added = items2.filter((item) => !items1.includes(item));
                const removed = items1.filter((item) => !items2.includes(item));
                for (const item of added) {
                    diff.structuralChanges.push({
                        type: 'addition',
                        path: `${key}.${item}`,
                        description: `Added ${item} to ${key}`
                    });
                }
                for (const item of removed) {
                    diff.structuralChanges.push({
                        type: 'deletion',
                        path: `${key}.${item}`,
                        description: `Removed ${item} from ${key}`
                    });
                }
            }
            return diff;
        },
        async cleanOldSnapshots() {
            const files = fs.readdirSync(snapshotsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                name: file,
                path: path.join(snapshotsDir, file),
                mtime: fs.statSync(path.join(snapshotsDir, file)).mtime
            }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            // Keep only the last 50 snapshots
            if (files.length > 50) {
                for (let i = 50; i < files.length; i++) {
                    fs.unlinkSync(files[i].path);
                }
            }
        },
        async getLatestSnapshot() {
            const files = fs.readdirSync(snapshotsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                name: file,
                path: path.join(snapshotsDir, file),
                mtime: fs.statSync(path.join(snapshotsDir, file)).mtime
            }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            if (files.length === 0)
                return null;
            const latestFile = files[0];
            const content = fs.readFileSync(latestFile.path, 'utf-8');
            return JSON.parse(content);
        }
    });
    // Register routes
    fastify.post('/snapshot/create', {
        schema: {
            response: {
                200: SnapshotSchema
            }
        }
    }, async (request, reply) => {
        const snapshot = await fastify.snapshotValidator.createSnapshot();
        return snapshot;
    });
    fastify.get('/snapshot/latest', {
        schema: {
            response: {
                200: typebox_1.Type.Union([SnapshotSchema, typebox_1.Type.Null()])
            }
        }
    }, async (request, reply) => {
        const snapshot = await fastify.snapshotValidator.getLatestSnapshot();
        return snapshot;
    });
    fastify.post('/snapshot/compare', {
        schema: {
            body: typebox_1.Type.Object({
                snapshot1Id: typebox_1.Type.String(),
                snapshot2Id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    diff: typebox_1.Type.Object({
                        added: typebox_1.Type.Array(typebox_1.Type.Any()),
                        removed: typebox_1.Type.Array(typebox_1.Type.Any()),
                        modified: typebox_1.Type.Array(typebox_1.Type.Any()),
                        structuralChanges: typebox_1.Type.Array(typebox_1.Type.Any())
                    })
                })
            }
        }
    }, async (request, reply) => {
        const { snapshot1Id, snapshot2Id } = request.body;
        const snapshot1Path = path.join(snapshotsDir, `${snapshot1Id}.json`);
        const snapshot2Path = path.join(snapshotsDir, `${snapshot2Id}.json`);
        if (!fs.existsSync(snapshot1Path) || !fs.existsSync(snapshot2Path)) {
            throw new Error('One or both snapshots not found');
        }
        const snapshot1 = JSON.parse(fs.readFileSync(snapshot1Path, 'utf-8'));
        const snapshot2 = JSON.parse(fs.readFileSync(snapshot2Path, 'utf-8'));
        const diff = await fastify.snapshotValidator.compareSnapshots(snapshot1, snapshot2);
        return { diff };
    });
};
exports.default = fastifySnapshotValidator;
//# sourceMappingURL=fastify-snapshot-validator.js.map