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
const ui_1 = require("./ui");
const projectPlan_1 = require("./projectPlan");
const types_1 = require("./types");
class FailSafeTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        this.command = command;
    }
}
exports.FailSafeTreeItem = FailSafeTreeItem;
class FailSafeSidebarProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        const logger = new (require('./logger').Logger)();
        this.projectPlan = new projectPlan_1.ProjectPlan(logger);
        this.ui = new ui_1.UI(this.projectPlan, new (require('./taskEngine').TaskEngine)(this.projectPlan, logger), logger, context);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            const items = [];
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
                    case types_1.TaskStatus.notStarted:
                        projectIcon = '⏳';
                        break;
                    case types_1.TaskStatus.completed:
                        projectIcon = '✅';
                        break;
                    case types_1.TaskStatus.blocked:
                        projectIcon = '❌';
                        break;
                    case types_1.TaskStatus.delayed:
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
            }
            else if (planValidation.status === 'invalid') {
                planIcon = '🔴';
                planText = 'INVALID';
            }
            else if (planValidation.status === 'empty') {
                planIcon = '🟡';
                planText = 'READY TO START';
            }
            else if (planValidation.status === 'complete') {
                planIcon = '🟢';
                planText = 'COMPLETE';
            }
            else if (planValidation.status === 'in_progress') {
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
exports.FailSafeSidebarProvider = FailSafeSidebarProvider;
//# sourceMappingURL=sidebarProvider.js.map