/// <reference types="vscode" />
import * as vscode from 'vscode';
import { UI } from './ui';
import { ProjectPlan } from './projectPlan';
import { TaskStatus } from './types';

export class FailSafeTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState?: vscode.TreeItemCollapsibleState,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.command = command;
    }
}

export class FailSafeSidebarProvider implements vscode.TreeDataProvider<FailSafeTreeItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<FailSafeTreeItem | undefined | null | void> = new vscode.EventEmitter<FailSafeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FailSafeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private readonly context: vscode.ExtensionContext) {
        const logger = new (require('./logger').Logger)();
        this.projectPlan = new ProjectPlan(logger);
        this.ui = new UI(this.projectPlan, new (require('./taskEngine').TaskEngine)(this.projectPlan, logger), logger, context);
    }

    private readonly ui: UI;
    private readonly projectPlan: ProjectPlan;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FailSafeTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FailSafeTreeItem): Promise<FailSafeTreeItem[]> {
        if (!element) {
            const items: FailSafeTreeItem[] = [];

            // Get plan validation status
            const planValidation = await this.projectPlan.validatePlan();

            // FailSafe Status
            let statusIcon = '🟢';
            let statusText = this.ui.statusBarState.toUpperCase();
            
            switch (this.ui.statusBarState) {
                case 'active':
                    statusIcon = '🟢';
                    statusText = 'ACTIVE';
                    break;
                case 'validating':
                    statusIcon = '🟡';
                    statusText = 'VALIDATING';
                    break;
                case 'blocked':
                    statusIcon = '🔴';
                    statusText = 'BLOCKED';
                    break;
            }

            items.push(new FailSafeTreeItem(`${statusIcon} FailSafe Status: ${statusText}`));

            // Project State
            const dashboard = this.ui.getDashboardData();
            const currentTask = dashboard.currentTask;
            let projectState = 'No active task';
            let projectIcon = '⚪';

            if (currentTask) {
                projectState = currentTask.name;
                switch (currentTask.status) {
                    case TaskStatus.notStarted:
                        projectIcon = '⏳';
                        break;
                    case TaskStatus.completed:
                        projectIcon = '✅';
                        break;
                    case TaskStatus.blocked:
                        projectIcon = '❌';
                        break;
                    case TaskStatus.delayed:
                        projectIcon = '⚠️';
                        break;
                    default:
                        projectIcon = '⏳';
                }
            }

            items.push(new FailSafeTreeItem(`${projectIcon} Project State: ${projectState}`));

            // Plan Status
            let planIcon = '🟢';
            let planText = planValidation.status.toUpperCase();
            
            if (planValidation.status === 'missing') {
                planIcon = '🔴';
                planText = 'MISSING';
            } else if (planValidation.status === 'invalid') {
                planIcon = '🔴';
                planText = 'INVALID';
            } else if (planValidation.status === 'empty') {
                planIcon = '🟡';
                planText = 'READY TO START';
            } else if (planValidation.status === 'complete') {
                planIcon = '🟢';
                planText = 'COMPLETE';
            } else if (planValidation.status === 'in_progress') {
                planIcon = '🟡';
                planText = 'IN PROGRESS';
            }

            items.push(new FailSafeTreeItem(`${planIcon} Plan Status: ${planText}`));

            // Dashboard link
            items.push(new FailSafeTreeItem('📊 Launch Dashboard', vscode.TreeItemCollapsibleState.None, {
                command: 'failsafe.showDashboard',
                title: 'Launch Dashboard',
                arguments: []
            }));

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }
}

interface FailSafeTreeItemData {
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
    command?: vscode.Command;
    children?: FailSafeTreeItemData[];
} 