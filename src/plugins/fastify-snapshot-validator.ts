import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface UISnapshot {
    id: string;
    timestamp: string;
    checksum: string;
    components: ComponentSnapshot[];
    structure: StructureSnapshot;
    metadata: SnapshotMetadata;
}

interface ComponentSnapshot {
    name: string;
    type: 'tab' | 'panel' | 'widget' | 'form';
    status: 'present' | 'missing' | 'modified';
    properties: Record<string, any>;
    children: string[];
    checksum: string;
}

interface StructureSnapshot {
    tabs: string[];
    panels: string[];
    widgets: string[];
    forms: string[];
    navigation: string[];
    actions: string[];
}

interface SnapshotMetadata {
    version: string;
    totalComponents: number;
    presentComponents: number;
    missingComponents: number;
    modifiedComponents: number;
}

interface SnapshotDiff {
    added: ComponentSnapshot[];
    removed: ComponentSnapshot[];
    modified: {
        component: string;
        changes: Record<string, { before: any; after: any }>;
    }[];
    structuralChanges: {
        type: 'addition' | 'deletion' | 'modification';
        path: string;
        description: string;
    }[];
}

const SnapshotSchema = Type.Object({
    id: Type.String(),
    timestamp: Type.String(),
    checksum: Type.String(),
    components: Type.Array(Type.Object({
        name: Type.String(),
        type: Type.Union([Type.Literal('tab'), Type.Literal('panel'), Type.Literal('widget'), Type.Literal('form')]),
        status: Type.Union([Type.Literal('present'), Type.Literal('missing'), Type.Literal('modified')]),
        properties: Type.Record(Type.String(), Type.Any()),
        children: Type.Array(Type.String()),
        checksum: Type.String()
    })),
    structure: Type.Object({
        tabs: Type.Array(Type.String()),
        panels: Type.Array(Type.String()),
        widgets: Type.Array(Type.String()),
        forms: Type.Array(Type.String()),
        navigation: Type.Array(Type.String()),
        actions: Type.Array(Type.String())
    }),
    metadata: Type.Object({
        version: Type.String(),
        totalComponents: Type.Number(),
        presentComponents: Type.Number(),
        missingComponents: Type.Number(),
        modifiedComponents: Type.Number()
    })
});

const fastifySnapshotValidator: FastifyPluginAsync = async (fastify) => {
    const snapshotsDir = path.join(process.cwd(), '.failsafe', 'snapshots');
    
    // Ensure snapshots directory exists
    if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    // Decorate fastify with snapshot validator functionality
    fastify.decorate('snapshotValidator', {
        async createSnapshot(): Promise<UISnapshot> {
            const components = await (fastify as any).snapshotValidator.scanUIComponents();
            const structure = (fastify as any).snapshotValidator.buildStructureSnapshot(components);
            const checksum = (fastify as any).snapshotValidator.calculateSnapshotChecksum(components, structure);
            
            const snapshot: UISnapshot = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                checksum,
                components,
                structure,
                metadata: {
                    version: '1.0.0',
                    totalComponents: components.length,
                    presentComponents: components.filter((c: any) => c.status === 'present').length,
                    missingComponents: components.filter((c: any) => c.status === 'missing').length,
                    modifiedComponents: components.filter((c: any) => c.status === 'modified').length
                }
            };

            // Save snapshot
            const snapshotPath = path.join(snapshotsDir, `${snapshot.id}.json`);
            fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

            // Clean old snapshots (keep last 50)
            await (fastify as any).snapshotValidator.cleanOldSnapshots();

            return snapshot;
        },

        async scanUIComponents(): Promise<ComponentSnapshot[]> {
            const components: ComponentSnapshot[] = [];
            
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
                    const fileComponents = (fastify as any).snapshotValidator.extractComponentsFromFile(content, file);
                    components.push(...fileComponents);
                }
            }

            return components;
        },

        extractComponentsFromFile(content: string, filename: string): ComponentSnapshot[] {
            const components: ComponentSnapshot[] = [];
            
            // Extract UI methods/classes
            const methodMatches = content.match(/public async (\w+)\(\)/g);
            if (methodMatches) {
                for (const match of methodMatches) {
                    const methodName = match.match(/public async (\w+)\(\)/)?.[1];
                    if (methodName && (fastify as any).snapshotValidator.isUIComponent(methodName)) {
                        const componentType = (fastify as any).snapshotValidator.getComponentType(methodName);
                        const properties = (fastify as any).snapshotValidator.extractComponentProperties(content, methodName);
                        const children = (fastify as any).snapshotValidator.extractComponentChildren(content, methodName);
                        
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
                    if (className && (fastify as any).snapshotValidator.isUIComponent(className)) {
                        const componentType = (fastify as any).snapshotValidator.getComponentType(className);
                        const properties = (fastify as any).snapshotValidator.extractClassProperties(content, className);
                        const children = (fastify as any).snapshotValidator.extractClassChildren(content, className);
                        
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

        isUIComponent(name: string): boolean {
            const uiComponents = [
                'showDashboard', 'showConsole', 'showLogs', 'showProjectPlan',
                'showProgressDetails', 'showAccountabilityReport', 'showFeasibilityAnalysis',
                'showActionLog', 'showFailsafeConfigPanel', 'UI', 'FailSafeSidebarProvider'
            ];
            return uiComponents.some(component => name.includes(component) || component.includes(name));
        },

        getComponentType(name: string): 'tab' | 'panel' | 'widget' | 'form' {
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

        extractComponentProperties(content: string, methodName: string): Record<string, any> {
            const properties: Record<string, any> = {};
            
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

        extractComponentChildren(content: string, methodName: string): string[] {
            const children: string[] = [];
            
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

        extractClassProperties(content: string, className: string): Record<string, any> {
            const properties: Record<string, any> = {};
            
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

        extractClassChildren(content: string, className: string): string[] {
            const children: string[] = [];
            
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

        buildStructureSnapshot(components: ComponentSnapshot[]): StructureSnapshot {
            return {
                tabs: components.filter(c => c.type === 'tab').map(c => c.name),
                panels: components.filter(c => c.type === 'panel').map(c => c.name),
                widgets: components.filter(c => c.type === 'widget').map(c => c.name),
                forms: components.filter(c => c.type === 'form').map(c => c.name),
                navigation: components.filter(c => c.name.includes('Navigation') || c.name.includes('Sidebar')).map(c => c.name),
                actions: components.filter(c => c.name.includes('Action') || c.name.includes('Command')).map(c => c.name)
            };
        },

        calculateSnapshotChecksum(components: ComponentSnapshot[], structure: StructureSnapshot): string {
            const data = JSON.stringify({ components, structure });
            return crypto.createHash('md5').update(data).digest('hex');
        },

        async compareSnapshots(snapshot1: UISnapshot, snapshot2: UISnapshot): Promise<SnapshotDiff> {
            const diff: SnapshotDiff = {
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
                    const changes: Record<string, { before: any; after: any }> = {};
                    
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
                const items2 = structure2[key as keyof StructureSnapshot] ;
                const added = items2.filter((item: string) => !items1.includes(item));
                const removed = items1.filter((item: string) => !items2.includes(item));

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

        async cleanOldSnapshots(): Promise<void> {
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

        async getLatestSnapshot(): Promise<UISnapshot | null> {
            const files = fs.readdirSync(snapshotsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(snapshotsDir, file),
                    mtime: fs.statSync(path.join(snapshotsDir, file)).mtime
                }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            if (files.length === 0) return null;

            const latestFile = files[0];
            const content = fs.readFileSync(latestFile.path, 'utf-8');
            return JSON.parse(content) as UISnapshot;
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
        const snapshot = await (fastify as any).snapshotValidator.createSnapshot();
        return snapshot;
    });

    fastify.get('/snapshot/latest', {
        schema: {
            response: {
                200: Type.Union([SnapshotSchema, Type.Null()])
            }
        }
    }, async (request, reply) => {
        const snapshot = await (fastify as any).snapshotValidator.getLatestSnapshot();
        return snapshot;
    });

    fastify.post('/snapshot/compare', {
        schema: {
            body: Type.Object({
                snapshot1Id: Type.String(),
                snapshot2Id: Type.String()
            }),
            response: {
                200: Type.Object({
                    diff: Type.Object({
                        added: Type.Array(Type.Any()),
                        removed: Type.Array(Type.Any()),
                        modified: Type.Array(Type.Any()),
                        structuralChanges: Type.Array(Type.Any())
                    })
                })
            }
        }
    }, async (request, reply) => {
        const { snapshot1Id, snapshot2Id } = request.body as { snapshot1Id: string; snapshot2Id: string };
        
        const snapshot1Path = path.join(snapshotsDir, `${snapshot1Id}.json`);
        const snapshot2Path = path.join(snapshotsDir, `${snapshot2Id}.json`);
        
        if (!fs.existsSync(snapshot1Path) || !fs.existsSync(snapshot2Path)) {
            throw new Error('One or both snapshots not found');
        }

        const snapshot1 = JSON.parse(fs.readFileSync(snapshot1Path, 'utf-8')) as UISnapshot;
        const snapshot2 = JSON.parse(fs.readFileSync(snapshot2Path, 'utf-8')) as UISnapshot;
        
        const diff = await (fastify as any).snapshotValidator.compareSnapshots(snapshot1, snapshot2);
        return { diff };
    });
};

export default fastifySnapshotValidator;
