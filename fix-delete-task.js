const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/commands.ts', 'utf8');

// Replace the placeholder implementation
const fixedContent = content.replace(
    `                // For now, just show a message (in real implementation, this would delete the task)
                vscode.window.showInformationMessage(\`Task "\${task.name}" would be deleted\`);
                await this.refreshDashboard();`,
    `                // Remove the task from the sprint
                currentSprint.tasks.splice(index, 1);
                currentSprint.updatedAt = new Date();
                vscode.window.showInformationMessage(\`Task "\${task.name}" deleted successfully!\`);
                await this.refreshDashboard();`
);

// Write the fixed content back
fs.writeFileSync('src/commands.ts', fixedContent);

console.log('deleteTask function fixed successfully!'); 