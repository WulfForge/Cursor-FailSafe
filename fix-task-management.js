const fs = require('fs');
const path = require('path');

// Read the commands.ts file
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let content = fs.readFileSync(commandsPath, 'utf8');

// Fix 1: Remove the duplicate markTaskComplete method (lines 986-988)
const lines = content.split('\n');
const newLines = [];

let skipNextLines = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip the duplicate markTaskComplete method
    if (line.includes('public async markTaskComplete(): Promise<void> {') && 
        lines[i + 1]?.includes('vscode.window.showInformationMessage')) {
        skipNextLines = 2;
        continue;
    }
    
    if (skipNextLines > 0) {
        skipNextLines--;
        continue;
    }
    
    newLines.push(line);
}

// Fix 2: Update addTask method to use correct SprintPlanner API
content = newLines.join('\n');
content = content.replace(
    /await this\.sprintPlanner\.addTaskToSprint\(currentSprint\.id, task\);/g,
    'await this.sprintPlanner.addTaskToSprint(task);'
);

content = content.replace(
    /await this\.sprintPlanner\.addTaskToSprint\(currentSprint\.id, duplicatedTask\);/g,
    'await this.sprintPlanner.addTaskToSprint(duplicatedTask);'
);

// Fix 3: Replace missing SprintPlanner methods with direct sprint manipulation
content = content.replace(
    /await this\.sprintPlanner\.updateTaskInSprint\(currentSprint\.id, taskId, updatedTask\);/g,
    `// Update task directly in sprint
            const taskIndex = currentSprint.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                currentSprint.tasks[taskIndex] = updatedTask;
                this.sprintPlanner['saveSprints']();
            }`
);

content = content.replace(
    /await this\.sprintPlanner\.removeTaskFromSprint\(currentSprint\.id, taskId\);/g,
    `// Remove task directly from sprint
            const taskIndex = currentSprint.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                currentSprint.tasks.splice(taskIndex, 1);
                this.sprintPlanner['saveSprints']();
            }`
);

content = content.replace(
    /await this\.sprintPlanner\.reorderTasksInSprint\(currentSprint\.id, taskIds\);/g,
    `// Reorder tasks directly in sprint
            const reorderedTasks = taskIds.map((taskId, index) => {
                const task = currentSprint.tasks.find(t => t.id === taskId);
                if (task) {
                    return { ...task, sprintPosition: index };
                }
                return null;
            }).filter(Boolean);
            
            if (reorderedTasks.length === taskIds.length) {
                currentSprint.tasks = reorderedTasks;
                this.sprintPlanner['saveSprints']();
            }`
);

// Write the fixed content back
fs.writeFileSync(commandsPath, content, 'utf8');

console.log('Task management compilation errors fixed!'); 