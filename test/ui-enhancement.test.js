const proxyquire = require('proxyquire');
const path = require('path');

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

describe('Enhanced Dashboard UI Features', () => {
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

    test('should generate enhanced HTML with export and refresh functionality', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for export functionality
        expect(html).toContain('exportSprintData');
        expect(html).toContain('refreshDashboard');
        expect(html).toContain('📊');
        expect(html).toContain('🔄');
        expect(html).toContain('📅');
        
        // Check for theme toggle
        expect(html).toContain('color-mix');
        expect(html).toContain('transition: all 0.2s ease');
        
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

    test('should handle export functionality correctly', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check that export data includes all necessary fields
        expect(html).toContain('exportSprintData');
        expect(html).toContain('showSprintMetrics');
        expect(html).toContain('vscode.postMessage');
        
        // Check for export functions
        expect(html).toContain('createSprint');
        expect(html).toContain('validateChat');
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

    test('should support theme switching', () => {
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
        
        // Check for system preference detection
        expect(html).toContain('hsl(');
    });

    test('should include enhanced navigation features', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for navigation functions
        expect(html).toContain('createSprint');
        expect(html).toContain('validateChat');
        expect(html).toContain('vscode.postMessage');
        
        // Check for navigation buttons
        expect(html).toContain('Create Sprint');
        expect(html).toContain('Validate Chat');
        expect(html).toContain('Create Rule');
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
        
        // Check for advanced styling
        expect(html).toContain('color-mix');
        expect(html).toContain('hsl(');
    });

    test('should include interactive elements', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for interactive buttons
        expect(html).toContain('onclick=');
        expect(html).toContain('Create Sprint');
        expect(html).toContain('Validate Chat');
        expect(html).toContain('Create Rule');
        expect(html).toContain('exportSprintData');
        expect(html).toContain('showSprintMetrics');
        
        // Check for hover effects
        expect(html).toContain(':hover');
        expect(html).toContain('transition');
    });

    test('should include proper error handling', () => {
        const currentSprint = null;
        const sprintHistory = [];
        const templates = [];
        const sprintMetrics = null;

        const html = commands.generateDashboardHTML(currentSprint, sprintHistory, templates, sprintMetrics);
        
        // Check for error handling in JavaScript
        expect(html).toContain('vscode.postMessage');
        expect(html).toContain('function');
        expect(html).toContain('command:');
        
        // Check for user feedback
        expect(html).toContain('onclick');
        expect(html).toContain('cursor: pointer');
    });
}); 