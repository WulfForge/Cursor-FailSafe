/// <reference types="vscode" />
import * as vscode from 'vscode';
import { UI } from './ui';

export class FailSafeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}

export class FailSafeSidebarProvider implements vscode.TreeDataProvider<FailSafeTreeItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<FailSafeTreeItem | undefined | null | void> = new vscode.EventEmitter<FailSafeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FailSafeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FailSafeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FailSafeTreeItem): vscode.ProviderResult<FailSafeTreeItem[]> {
        try {
            if (element) {
                return Promise.resolve([]);
            } else {
                return Promise.resolve([
                    new FailSafeTreeItem(
                        '🚀 Open Dashboard',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.openDashboard',
                            title: 'Open FailSafe Dashboard',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔍 Validate Chat',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.validateChat',
                            title: 'Validate Chat Content',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📝 Create Cursor Rule',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.createCursorrule',
                            title: 'Create Cursor Rule',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📅 Create Sprint',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.createSprint',
                            title: 'Create Sprint',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔒 Manage Cursor Rules',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.manageCursorrules',
                            title: 'Manage Cursor Rules',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📊 Sprint Metrics',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.showSprintMetrics',
                            title: 'Show Sprint Metrics',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🔍 Check Version',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.checkVersionConsistency',
                            title: 'Check Version Consistency',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '🚀 Auto Bump Version',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.autoBumpVersion',
                            title: 'Auto Bump Version',
                            arguments: []
                        }
                    ),
                    new FailSafeTreeItem(
                        '📋 Version Log',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'failsafe.viewVersionLog',
                            title: 'View Version Log',
                            arguments: []
                        }
                    )
                ]);
            }
        } catch (error) {
            console.error('Error in sidebar provider getChildren:', error);
            return Promise.resolve([
                new FailSafeTreeItem(
                    '❌ Error Loading Items',
                    vscode.TreeItemCollapsibleState.None
                )
            ]);
        }
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