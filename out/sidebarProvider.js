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
exports.FailSafeSidebarProvider = exports.FailSafeTreeItem = void 0;
/// <reference types="vscode" />
const vscode = __importStar(require("vscode"));
class FailSafeTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
exports.FailSafeTreeItem = FailSafeTreeItem;
class FailSafeSidebarProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        try {
            if (element) {
                return Promise.resolve([]);
            }
            else {
                return Promise.resolve([
                    new FailSafeTreeItem('🚀 Open Dashboard', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.openDashboard',
                        title: 'Open FailSafe Dashboard',
                        arguments: []
                    }),
                    new FailSafeTreeItem('🔍 Validate Chat', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.validateChat',
                        title: 'Validate Chat Content',
                        arguments: []
                    }),
                    new FailSafeTreeItem('📝 Create Cursor Rule', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.createCursorrule',
                        title: 'Create Cursor Rule',
                        arguments: []
                    }),
                    new FailSafeTreeItem('📅 Create Sprint', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.createSprint',
                        title: 'Create Sprint',
                        arguments: []
                    }),
                    new FailSafeTreeItem('🔒 Manage Cursor Rules', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.manageCursorrules',
                        title: 'Manage Cursor Rules',
                        arguments: []
                    }),
                    new FailSafeTreeItem('📊 Sprint Metrics', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.showSprintMetrics',
                        title: 'Show Sprint Metrics',
                        arguments: []
                    }),
                    new FailSafeTreeItem('🔍 Check Version', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.checkVersionConsistency',
                        title: 'Check Version Consistency',
                        arguments: []
                    }),
                    new FailSafeTreeItem('🚀 Auto Bump Version', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.autoBumpVersion',
                        title: 'Auto Bump Version',
                        arguments: []
                    }),
                    new FailSafeTreeItem('📋 Version Log', vscode.TreeItemCollapsibleState.None, {
                        command: 'failsafe.viewVersionLog',
                        title: 'View Version Log',
                        arguments: []
                    })
                ]);
            }
        }
        catch (error) {
            console.error('Error in sidebar provider getChildren:', error);
            return Promise.resolve([
                new FailSafeTreeItem('❌ Error Loading Items', vscode.TreeItemCollapsibleState.None)
            ]);
        }
    }
}
exports.FailSafeSidebarProvider = FailSafeSidebarProvider;
//# sourceMappingURL=sidebarProvider.js.map