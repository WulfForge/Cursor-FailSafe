import { FastifyInstance } from 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        autoStub: {
            generateStubsForMissingComponents(): Promise<{
                success: boolean;
                generated: string[];
                errors: string[];
                warnings: string[];
            }>;
            generateStubForComponent(componentName: string, componentType: string): Promise<string | null>;
            cleanupStubs(): Promise<void>;
        };
        
        preview: {
            generateComponentPreview(componentId: string, options?: any): Promise<any>;
            generateDesignPreview(designDocPath: string, options?: any): Promise<any>;
            startPreviewServer(options?: any): Promise<{ port: number; url: string }>;
            generateUIPreview(): Promise<any>;
            generatePreviewHTML(component: any): Promise<string>;
            generateDesignPreviewHTML(content: string): Promise<string>;
            getComponentById(componentId: string): Promise<any>;
            getUITabs(): Promise<any[]>;
            getUIComponents(): Promise<any[]>;
            getUITheme(): Promise<any>;
        };
        
        snapshotValidator: {
            validateSnapshot(previousSnapshotId?: string): Promise<{
                added: string[];
                removed: string[];
                modified: string[];
                uiChanges: {
                    componentsAdded: string[];
                    componentsRemoved: string[];
                    methodsAdded: string[];
                    methodsRemoved: string[];
                    routesAdded: string[];
                    routesRemoved: string[];
                };
            }>;
            createSnapshot(): Promise<any>;
            getLatestSnapshot(): Promise<any>;
            compareSnapshots(snapshot1: any, snapshot2: any): Promise<any>;
            scanUIComponents(): Promise<any[]>;
            buildStructureSnapshot(components: any[]): any;
            calculateSnapshotChecksum(components: any[], structure: any): string;
            cleanOldSnapshots(): Promise<void>;
            extractComponentsFromFile(content: string, file: string): any[];
            isUIComponent(name: string): boolean;
            getComponentType(name: string): string;
            extractComponentProperties(content: string, methodName: string): any;
            extractComponentChildren(content: string, methodName: string): any[];
            extractClassProperties(content: string, className: string): any;
            extractClassChildren(content: string, className: string): any[];
            listSnapshots(): Promise<{ id: string; timestamp: string; size: number }[]>;
            rollbackToSnapshot(snapshotId: string): Promise<boolean>;
        };
        
        specHeatmap: {
            generateHeatmap(): Promise<any>;
            checkSectionImplementation(sectionId: string, title: string): Promise<any>;
            getImplementationDetails(sectionId: string): Promise<any>;
            getMissingDetails(sectionId: string): Promise<any>;
        };
    }
} 