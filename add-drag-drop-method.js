const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/commands.ts', 'utf8');

// Add the new method
const newMethod = `
    private async reorderTasksByDragDrop(fromIndex: number, toIndex: number): Promise<void> {
        try {
            const currentSprint = this.sprintPlanner.getCurrentSprint();
            if (!currentSprint) {
                vscode.window.showWarningMessage('No active sprint found. Please start a sprint first.');
                return;
            }

            if (!currentSprint.tasks || currentSprint.tasks.length === 0) {
                vscode.window.showInformationMessage('No tasks to reorder. Add some tasks first.');
                return;
            }

            if (fromIndex < 0 || fromIndex >= currentSprint.tasks.length || 
                toIndex < 0 || toIndex >= currentSprint.tasks.length) {
                vscode.window.showErrorMessage('Invalid task indices for reordering.');
                return;
            }

            // Reorder tasks
            const tasks = [...currentSprint.tasks];
            const [movedTask] = tasks.splice(fromIndex, 1);
            tasks.splice(toIndex, 0, movedTask);

            // Update sprint with reordered tasks
            currentSprint.tasks = tasks;
            currentSprint.updatedAt = new Date();

            // Save the updated sprint
            this.sprintPlanner['saveSprints']();

            vscode.window.showInformationMessage(\`Task "\${movedTask.name}" moved to position \${toIndex + 1}\`);
            await this.refreshDashboard();

        } catch (error) {
            this.logger.error('Error reordering tasks by drag-and-drop:', error);
            vscode.window.showErrorMessage('Failed to reorder tasks');
        }
    }
`;

// Update the content
const updatedContent = content.replace(
    '        } catch (error) {\n            this.logger.error(\'Error reordering tasks:\', error);\n            vscode.window.showErrorMessage(\'Failed to reorder tasks\');\n        }\n    }',
    '        } catch (error) {\n            this.logger.error(\'Error reordering tasks:\', error);\n            vscode.window.showErrorMessage(\'Failed to reorder tasks\');\n        }\n    }' + newMethod
);

// Write the updated content back
fs.writeFileSync('src/commands.ts', updatedContent);

console.log('reorderTasksByDragDrop method added successfully!'); 