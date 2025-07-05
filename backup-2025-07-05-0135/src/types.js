"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskPriority = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["notStarted"] = "not_started";
    TaskStatus["pending"] = "pending";
    TaskStatus["inProgress"] = "in_progress";
    TaskStatus["completed"] = "completed";
    TaskStatus["blocked"] = "blocked";
    TaskStatus["delayed"] = "delayed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["low"] = "low";
    TaskPriority["medium"] = "medium";
    TaskPriority["high"] = "high";
    TaskPriority["critical"] = "critical";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
//# sourceMappingURL=types.js.map