const fs = require('fs');
const path = require('path');

// Read the commands.ts file
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let content = fs.readFileSync(commandsPath, 'utf8');

// Find the message handler and add task management commands
const messageHandlerPattern = /case 'validatePlanWithAI':\s*await this\.validatePlanWithAI\(\);\s*break;\s*case 'refreshDashboard':/;
const replacement = `case 'validatePlanWithAI':
                            await this.validatePlanWithAI();
                            break;
                        case 'addTask':
                            await this.addTask();
                            break;
                        case 'editTask':
                            await this.editTask(message.taskId);
                            break;
                        case 'deleteTask':
                            await this.deleteTask(message.taskId);
                            break;
                        case 'duplicateTask':
                            await this.duplicateTask(message.taskId);
                            break;
                        case 'markTaskComplete':
                            await this.markTaskComplete(message.taskId);
                            break;
                        case 'reorderTasksByDragDrop':
                            await this.reorderTasksByDragDrop(message.taskIds);
                            break;
                        case 'refreshDashboard':`;

// Replace the pattern
content = content.replace(messageHandlerPattern, replacement);

// Write the updated content back
fs.writeFileSync(commandsPath, content, 'utf8');

console.log('Message handler updated with task management commands!'); 