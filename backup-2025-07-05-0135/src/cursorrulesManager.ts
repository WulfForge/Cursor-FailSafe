import * as vscode from 'vscode';
import { Cursorrule, CursorrulesEngine } from './cursorrulesEngine';
import { CursorrulesWizard } from './cursorrulesWizard';
import { Commands } from './commands';

export class CursorrulesManager {
    private readonly engine: CursorrulesEngine;
    private readonly logger: any;
    private readonly wizard: any;
    private readonly context: vscode.ExtensionContext;

    constructor(engine: CursorrulesEngine, logger: any, context: vscode.ExtensionContext) {
        this.engine = engine;
        this.logger = logger;
        this.context = context;
    }

    public async manageRules(): Promise<void> {
        const action = await vscode.window.showQuickPick([
            { label: 'Create New Rule', value: 'create' },
            { label: 'Edit Existing Rule', value: 'edit' },
            { label: 'Delete Rule', value: 'delete' },
            { label: 'View All Rules', value: 'view' }
        ], {
            placeHolder: 'Select an action...'
        });

        if (action) {
            switch (action.value) {
                case 'create': {
                    const newRule = await this.createRule();
                    if (newRule) {
                        this.engine.createRule(newRule);
                        vscode.window.showInformationMessage('Cursorrule created successfully');
                    }
                    break;
                }
                case 'edit': {
                    const rules = this.engine.getAllRules();
                    const selectedRule = await this.selectRule(rules);
                    if (selectedRule) {
                        const updatedRule = await this.editRule();
                        if (updatedRule) {
                            this.engine.updateRule(selectedRule.id, updatedRule);
                            vscode.window.showInformationMessage('Cursorrule updated successfully');
                        }
                    }
                    break;
                }
                case 'delete': {
                    const rules = this.engine.getAllRules();
                    const selectedRule = await this.selectRule(rules);
                    if (selectedRule) {
                        const confirmed = await vscode.window.showWarningMessage(
                            `Are you sure you want to delete the rule "${selectedRule.name}"?`,
                            'Yes', 'No'
                        );
                        if (confirmed === 'Yes') {
                            this.engine.deleteRule(selectedRule.id);
                            vscode.window.showInformationMessage('Cursorrule deleted successfully');
                        }
                    }
                    break;
                }
                case 'view': {
                    await this.showRulesList();
                    break;
                }
            }
        }
    }

    private async selectRule(rules: any[]): Promise<any | undefined> {
        if (rules.length === 0) {
            vscode.window.showInformationMessage('No rules found');
            return undefined;
        }

        const items = rules.map(rule => ({
            label: rule.name,
            description: rule.description,
            detail: `Purpose: ${rule.purpose} | Severity: ${rule.severity}`,
            rule: rule
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a rule...',
            matchOnDescription: true,
            matchOnDetail: true
        });

        return selected?.rule;
    }

    public async createRule(): Promise<any | null> {
        try {
            // Integrate with the wizard to create a new rule
            const wizard = new CursorrulesWizard(this.engine, this.logger, this.context);
            const rule = await wizard.createRule();
            
            if (rule) {
                this.logger.info('Rule created via wizard', { ruleId: rule.id, ruleName: rule.name });
                return rule;
            } else {
                this.logger.info('Rule creation cancelled by user');
                return null;
            }
        } catch (error) {
            this.logger.error('Failed to create rule via wizard', error);
            return null;
        }
    }

    public async editRule(): Promise<any | null> {
        // This would integrate with the wizard
        return null;
    }

    private async showRulesList(): Promise<void> {
        const rules = this.engine.getAllRules();
        
        if (rules.length === 0) {
            vscode.window.showInformationMessage('No rules found');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'cursorrulesList',
            'Cursorrules List',
            vscode.ViewColumn.One,
            {}
        );

        const rulesHtml = rules.map(rule => `
            <div class="rule-item">
                <h3>${rule.name}</h3>
                <p><strong>Purpose:</strong> ${rule.purpose}</p>
                <p><strong>Severity:</strong> ${rule.severity}</p>
                <p><strong>Pattern:</strong> ${rule.pattern}</p>
                <p><strong>Message:</strong> ${rule.message}</p>
                <p><strong>Status:</strong> ${rule.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
        `).join('');

        panel.webview.html = await new Commands({} as vscode.ExtensionContext).applyCursorRulesToHtml(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
                    .rule-item { border: 1px solid #ccc; margin: 10px 0; padding: 15px; border-radius: 5px; }
                    .rule-item h3 { margin-top: 0; color: #333; }
                    .rule-item p { margin: 5px 0; }
                </style>
            </head>
            <body>
                <h1>Cursorrules (${rules.length})</h1>
                ${rulesHtml}
            </body>
            </html>
        `);
    }

    public async showManager(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'cursorrulesManager',
            'Manage Cursorrules',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = await new Commands({} as vscode.ExtensionContext).applyCursorRulesToHtml(this.getManagerHtml());

        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'getRules': {
                        const rules = this.engine.getAllRules();
                        panel.webview.postMessage({ command: 'rulesData', rules: rules });
                        break;
                    }
                    case 'toggleRule': {
                        const rule = this.engine.getRule(message.ruleId);
                        if (rule) {
                            this.engine.updateRule(message.ruleId, { enabled: !rule.enabled });
                            vscode.window.showInformationMessage(`Rule "${rule.name}" ${rule.enabled ? 'disabled' : 'enabled'}`);
                        }
                        break;
                    }
                    case 'deleteRule': {
                        const ruleToDelete = this.engine.getRule(message.ruleId);
                        if (ruleToDelete) {
                            const confirmed = await vscode.window.showWarningMessage(
                                `Are you sure you want to delete the rule "${ruleToDelete.name}"?`,
                                'Yes', 'No'
                            );
                            if (confirmed === 'Yes') {
                                this.engine.deleteRule(message.ruleId);
                                vscode.window.showInformationMessage(`Rule "${ruleToDelete.name}" deleted`);
                            }
                        }
                        break;
                    }
                    case 'editRule': {
                        // For now, just show rule details - full editing can be added later
                        const ruleToEdit = this.engine.getRule(message.ruleId);
                        if (ruleToEdit) {
                            this.showRuleDetails(ruleToEdit as any);
                        }
                        break;
                    }
                    case 'create': {
                        const newRule = await this.wizard.createRule();
                        if (newRule) {
                            this.engine.createRule(newRule);
                            vscode.window.showInformationMessage('Cursorrule created successfully');
                        }
                        break;
                    }
                    case 'edit': {
                        const rules = this.engine.getAllRules();
                        const selectedRule = await this.selectRule(rules);
                        if (selectedRule) {
                            const updatedRule = await this.wizard.editRule(selectedRule);
                            if (updatedRule) {
                                await this.engine.updateRule(selectedRule.id, updatedRule);
                                vscode.window.showInformationMessage('Cursorrule updated successfully');
                            }
                        }
                        break;
                    }
                    case 'delete': {
                        const rules = this.engine.getAllRules();
                        const selectedRule = await this.selectRule(rules);
                        if (selectedRule) {
                            const confirmed = await vscode.window.showWarningMessage(
                                `Are you sure you want to delete the rule "${selectedRule.name}"?`,
                                'Yes', 'No'
                            );
                            if (confirmed === 'Yes') {
                                await this.engine.deleteRule(selectedRule.id);
                                vscode.window.showInformationMessage('Cursorrule deleted successfully');
                            }
                        }
                        break;
                    }
                }
            }
        );
    }

    private showRuleDetails(rule: Cursorrule): void {
        const panel = vscode.window.createWebviewPanel(
            'cursorruleDetails',
            `Rule: ${rule.name}`,
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getRuleDetailsHtml(rule);
    }

    private getManagerHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Manage Cursorrules</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .container {
                        max-width: 1000px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                    }
                    .stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    .stat-card {
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                        text-align: center;
                    }
                    .stat-number {
                        font-size: 24px;
                        font-weight: bold;
                        color: var(--vscode-button-background);
                    }
                    .stat-label {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                    .rules-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    .rules-table th,
                    .rules-table td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    .rules-table th {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        font-weight: 500;
                    }
                    .rule-row:hover {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                    }
                    .status-badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .status-enabled {
                        background-color: var(--vscode-charts-green);
                        color: white;
                    }
                    .status-disabled {
                        background-color: var(--vscode-descriptionForeground);
                        color: white;
                    }
                    .severity-badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .severity-critical {
                        background-color: var(--vscode-errorForeground);
                        color: white;
                    }
                    .severity-high {
                        background-color: var(--vscode-warningForeground);
                        color: white;
                    }
                    .severity-medium {
                        background-color: var(--vscode-infoBar-foreground);
                        color: white;
                    }
                    .severity-low {
                        background-color: var(--vscode-descriptionForeground);
                        color: white;
                    }
                    .action-buttons {
                        display: flex;
                        gap: 5px;
                    }
                    .btn {
                        padding: 4px 8px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: background-color 0.3s;
                    }
                    .btn-primary {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .btn-primary:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .btn-secondary {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .btn-secondary:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                    .btn-danger {
                        background-color: var(--vscode-errorForeground);
                        color: white;
                    }
                    .btn-danger:hover {
                        background-color: var(--vscode-inputValidation-errorBackground);
                    }
                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .empty-state h3 {
                        margin-bottom: 10px;
                    }
                    .create-rule-btn {
                        margin-top: 20px;
                        padding: 12px 24px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .create-rule-btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Manage Cursorrules</h1>
                        <button class="create-rule-btn" onclick="createNewRule()">Create New Rule</button>
                    </div>

                    <div class="stats" id="stats">
                        <div class="stat-card">
                            <div class="stat-number" id="totalRules">-</div>
                            <div class="stat-label">Total Rules</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="enabledRules">-</div>
                            <div class="stat-label">Enabled Rules</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="totalTriggers">-</div>
                            <div class="stat-label">Total Triggers</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="totalOverrides">-</div>
                            <div class="stat-label">Total Overrides</div>
                        </div>
                    </div>

                    <div id="rulesContent">
                        <div class="empty-state">
                            <h3>No Cursorrules Found</h3>
                            <p>Create your first Cursorrule to get started with AI safety and validation.</p>
                            <button class="create-rule-btn" onclick="createNewRule()">Create Your First Rule</button>
                        </div>
                    </div>
                </div>

                <script>
                    // Load rules on page load
                    vscode.postMessage({ command: 'getRules' });

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'rulesData') {
                            displayRules(message.rules);
                        }
                    });

                    function displayRules(rules) {
                        const stats = calculateStats(rules);
                        updateStats(stats);

                        if (rules.length === 0) {
                            document.getElementById('rulesContent').innerHTML = \`
                                <div class="empty-state">
                                    <h3>No Cursorrules Found</h3>
                                    <p>Create your first Cursorrule to get started with AI safety and validation.</p>
                                    <button class="create-rule-btn" onclick="createNewRule()">Create Your First Rule</button>
                                </div>
                            \`;
                            return;
                        }

                        const tableHtml = \`
                            <table class="rules-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Purpose</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                        <th>Triggers</th>
                                        <th>Overrides</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${rules.map(rule => \`
                                        <tr class="rule-row">
                                            <td>
                                                <strong>\${rule.name}</strong><br>
                                                <small style="color: var(--vscode-descriptionForeground);">\${rule.description || 'No description'}</small>
                                            </td>
                                            <td>\${rule.purpose}</td>
                                            <td>
                                                <span class="severity-badge severity-\${rule.severity}">\${rule.severity}</span>
                                            </td>
                                            <td>
                                                <span class="status-badge \${rule.enabled ? 'status-enabled' : 'status-disabled'}">
                                                    \${rule.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td>\${rule.usageStats.triggers}</td>
                                            <td>\${rule.usageStats.overrides}</td>
                                            <td>
                                                <div class="action-buttons">
                                                    <button class="btn btn-secondary" onclick="toggleRule('\${rule.id}')">
                                                        \${rule.enabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button class="btn btn-primary" onclick="editRule('\${rule.id}')">Edit</button>
                                                    <button class="btn btn-danger" onclick="deleteRule('\${rule.id}')">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`;

                        document.getElementById('rulesContent').innerHTML = tableHtml;
                    }

                    function calculateStats(rules) {
                        return {
                            totalRules: rules.length,
                            enabledRules: rules.filter(r => r.enabled).length,
                            totalTriggers: rules.reduce((sum, r) => sum + r.usageStats.triggers, 0),
                            totalOverrides: rules.reduce((sum, r) => sum + r.usageStats.overrides, 0)
                        };
                    }

                    function updateStats(stats) {
                        document.getElementById('totalRules').textContent = stats.totalRules;
                        document.getElementById('enabledRules').textContent = stats.enabledRules;
                        document.getElementById('totalTriggers').textContent = stats.totalTriggers;
                        document.getElementById('totalOverrides').textContent = stats.totalOverrides;
                    }

                    function createNewRule() {
                        vscode.postMessage({ command: 'create' });
                    }

                    function toggleRule(ruleId) {
                        vscode.postMessage({ command: 'toggleRule', ruleId: ruleId });
                    }

                    function editRule(ruleId) {
                        vscode.postMessage({ command: 'edit', ruleId: ruleId });
                    }

                    function deleteRule(ruleId) {
                        vscode.postMessage({ command: 'delete', ruleId: ruleId });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private getRuleDetailsHtml(rule: Cursorrule): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rule Details</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .rule-header {
                        margin-bottom: 30px;
                    }
                    .rule-section {
                        margin-bottom: 25px;
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    .rule-section h3 {
                        margin-top: 0;
                        margin-bottom: 15px;
                        color: var(--vscode-editor-foreground);
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        padding: 8px 0;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    .detail-label {
                        font-weight: 500;
                        color: var(--vscode-editor-foreground);
                    }
                    .detail-value {
                        color: var(--vscode-descriptionForeground);
                    }
                    .badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .badge-enabled {
                        background-color: var(--vscode-charts-green);
                        color: white;
                    }
                    .badge-disabled {
                        background-color: var(--vscode-descriptionForeground);
                        color: white;
                    }
                    .badge-severity-critical {
                        background-color: var(--vscode-errorForeground);
                        color: white;
                    }
                    .badge-severity-high {
                        background-color: var(--vscode-warningForeground);
                        color: white;
                    }
                    .badge-severity-medium {
                        background-color: var(--vscode-infoBar-foreground);
                        color: white;
                    }
                    .badge-severity-low {
                        background-color: var(--vscode-descriptionForeground);
                        color: white;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .stat-item {
                        text-align: center;
                        padding: 10px;
                        background-color: var(--vscode-editor-background);
                        border-radius: 4px;
                    }
                    .stat-number {
                        font-size: 20px;
                        font-weight: bold;
                        color: var(--vscode-button-background);
                    }
                    .stat-label {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="rule-header">
                        <h1>${rule.name}</h1>
                        <p style="color: var(--vscode-descriptionForeground);">${rule.description || 'No description provided'}</p>
                    </div>

                    <div class="rule-section">
                        <h3>Basic Information</h3>
                        <div class="detail-row">
                            <span class="detail-label">Purpose:</span>
                            <span class="detail-value">${rule.purpose}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Severity:</span>
                            <span class="detail-value">
                                <span class="badge badge-severity-${rule.severity}">${rule.severity}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value">
                                <span class="badge ${rule.enabled ? 'badge-enabled' : 'badge-disabled'}">
                                    ${rule.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Response Type:</span>
                            <span class="detail-value">${rule.response}</span>
                        </div>
                    </div>

                    <div class="rule-section">
                        <h3>Detection Logic</h3>
                        <div class="detail-row">
                            <span class="detail-label">Pattern Type:</span>
                            <span class="detail-value">${rule.patternType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Pattern:</span>
                            <span class="detail-value"><code>${rule.pattern}</code></span>
                        </div>
                    </div>

                    <div class="rule-section">
                        <h3>User Message</h3>
                        <p style="margin: 0; padding: 10px; background-color: var(--vscode-editor-background); border-radius: 4px;">
                            ${rule.message}
                        </p>
                    </div>

                    <div class="rule-section">
                        <h3>Override Settings</h3>
                        <div class="detail-row">
                            <span class="detail-label">Override Allowed:</span>
                            <span class="detail-value">${rule.override.allowed ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Requires Justification:</span>
                            <span class="detail-value">${rule.override.requiresJustification ? 'Yes' : 'No'}</span>
                        </div>
                    </div>

                    <div class="rule-section">
                        <h3>Usage Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number">${rule.usageStats.triggers}</div>
                                <div class="stat-label">Total Triggers</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${rule.usageStats.overrides}</div>
                                <div class="stat-label">Total Overrides</div>
                            </div>
                        </div>
                        ${rule.usageStats.lastTriggered ? `
                            <div style="margin-top: 15px; color: var(--vscode-descriptionForeground);">
                                <strong>Last Triggered:</strong> ${new Date(rule.usageStats.lastTriggered).toLocaleString()}
                            </div>
                        ` : ''}
                    </div>

                    <div class="rule-section">
                        <h3>Metadata</h3>
                        <div class="detail-row">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${new Date(rule.createdAt).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Modified:</span>
                            <span class="detail-value">${new Date(rule.updatedAt).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Created By:</span>
                            <span class="detail-value">${rule.createdBy}</span>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
} 
