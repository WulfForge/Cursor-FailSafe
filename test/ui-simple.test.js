const fs = require('fs');
const path = require('path');
const proxyquire = require('proxyquire');

const mockVscode = {
    window: {
        createWebviewPanel: () => ({
            webview: {
                html: '',
                onDidReceiveMessage: () => ({ dispose: () => {} })
            },
            onDidDispose: () => ({ dispose: () => {} })
        }),
        showInformationMessage: async () => 'OK',
        showErrorMessage: async () => 'OK'
    },
    ViewColumn: { One: 1 },
    commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: async () => {}
    },
    ExtensionContext: class {
        constructor() {
            this.subscriptions = [];
        }
    }
};

const { Logger } = proxyquire('../out/logger', { vscode: mockVscode });
const { SprintPlanner } = proxyquire('../out/sprintPlanner', { vscode: mockVscode, '../out/logger': { Logger } });
const { Commands } = proxyquire('../out/commands', { 
    vscode: mockVscode, 
    '../out/logger': { Logger },
    '../out/sprintPlanner': { SprintPlanner }
});

describe('Enhanced Dashboard UI Generation', () => {
    let commands;
    let logger;
    let context;

    beforeEach(() => {
        logger = new Logger();
        context = new mockVscode.ExtensionContext();
        commands = new Commands(
            logger,
            __dirname + '/../test-workspace',
            context
        );
    });

    test('should generate HTML with enhanced features', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for enhanced UI features in the generated HTML
        expect(html).toContain('refreshDashboard');
        expect(html).toContain('createSprint');
        expect(html).toContain('📊');
        expect(html).toContain('🔄');
        expect(html).toContain('📅');
        
        // Check for accessibility features
        expect(html).toContain('focus-visible');
        expect(html).toContain('user-select: none');
        
        // Check for enhanced styling
        expect(html).toContain('--primary:');
        expect(html).toContain('--background:');
        expect(html).toContain('--foreground:');
        
        // Check for status indicators (only present when there's data)
        expect(html).toContain('badge-success');
        expect(html).toContain('badge-warning');
    });

    test('should include theme switching functionality', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for theme variables
        expect(html).toContain('--primary:');
        expect(html).toContain('--background:');
        expect(html).toContain('--foreground:');
        
        // Check for theme toggle functionality
        expect(html).toContain('color-mix');
        expect(html).toContain('transition: all 0.2s ease');
    });

    test('should include export functionality', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for export data structure
        expect(html).toContain('exportSprintData');
        expect(html).toContain('showSprintMetrics');
        
        // Check for file export handling
        expect(html).toContain('vscode.postMessage');
    });

    test('should include accessibility improvements', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for keyboard navigation
        expect(html).toContain('focus-visible');
        expect(html).toContain('outline: 2px solid');
        expect(html).toContain('outline-offset: 2px');
        
        // Check for focus management
        expect(html).toContain('cursor: pointer');
        expect(html).toContain('user-select: none');
        
        // Check for ARIA-like features
        expect(html).toContain('lang="en"');
        expect(html).toContain('title>');
    });

    test('should include responsive design features', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for responsive grid
        expect(html).toContain('grid-template-columns: repeat(auto-fit');
        expect(html).toContain('minmax(300px, 1fr)');
        expect(html).toContain('minmax(120px, 1fr)');
        
        // Check for flexible layouts
        expect(html).toContain('flex');
        expect(html).toContain('flex-wrap');
    });

    test('should include modern CSS features', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for CSS custom properties
        expect(html).toContain('--primary:');
        expect(html).toContain('--background:');
        expect(html).toContain('--foreground:');
        
        // Check for modern CSS features
        expect(html).toContain('border-radius: var(--radius)');
        expect(html).toContain('transition: all 0.2s ease');
        expect(html).toContain('box-shadow: 0 1px 3px 0');
    });
}); 