const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/commands.ts', 'utf8');

// Add drag-and-drop CSS after .sprint-task.current
const dragDropCSS = `
                    /* Drag and Drop Styles */
                    .sprint-task.dragging {
                        opacity: 0.5;
                        transform: rotate(2deg);
                        box-shadow: 0 8px 25px rgba(110, 203, 255, 0.4);
                        z-index: 1000;
                    }
                    
                    .sprint-task.drag-over {
                        border-color: var(--primary-glow);
                        background: rgba(110, 203, 255, 0.15);
                        transform: scale(1.02);
                        box-shadow: 0 0 20px rgba(110, 203, 255, 0.3);
                    }
                    
                    .task-drag-handle {
                        cursor: grab;
                        color: var(--muted-foreground);
                        font-size: 1.2rem;
                        margin-right: 0.75rem;
                        padding: 0.25rem;
                        border-radius: 0.25rem;
                        transition: all 0.2s ease;
                        user-select: none;
                    }
                    
                    .task-drag-handle:hover {
                        color: var(--primary-glow);
                        background: rgba(110, 203, 255, 0.1);
                    }
                    
                    .task-drag-handle:active {
                        cursor: grabbing;
                        transform: scale(1.1);
                    }
                    
                    .tasks-list {
                        position: relative;
                    }
                    
                    .tasks-list.drag-active {
                        min-height: 200px;
                    }
                    
                    .drag-placeholder {
                        height: 80px;
                        border: 2px dashed var(--primary-glow);
                        border-radius: var(--radius);
                        background: rgba(110, 203, 255, 0.05);
                        margin: 0.5rem 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--muted-foreground);
                        font-style: italic;
                    }
                    
`;

// Add drag-and-drop JavaScript functions
const dragDropJS = `
                    // Drag and Drop Functions
                    let draggedElement = null;
                    let draggedIndex = null;
                    
                    function handleDragStart(event, index) {
                        draggedElement = event.target;
                        draggedIndex = index;
                        event.target.classList.add('dragging');
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/html', event.target.outerHTML);
                        
                        // Add drag-active class to tasks list
                        const tasksList = document.getElementById('tasks-list');
                        if (tasksList) {
                            tasksList.classList.add('drag-active');
                        }
                    }
                    
                    function handleDragOver(event) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                    }
                    
                    function handleDragEnter(event) {
                        event.preventDefault();
                        if (event.target.classList.contains('sprint-task') && event.target !== draggedElement) {
                            event.target.classList.add('drag-over');
                        }
                    }
                    
                    function handleDragLeave(event) {
                        if (event.target.classList.contains('sprint-task')) {
                            event.target.classList.remove('drag-over');
                        }
                    }
                    
                    function handleDrop(event, dropIndex) {
                        event.preventDefault();
                        
                        // Remove drag-over class from all tasks
                        document.querySelectorAll('.sprint-task').forEach(task => {
                            task.classList.remove('drag-over');
                        });
                        
                        // Remove drag-active class from tasks list
                        const tasksList = document.getElementById('tasks-list');
                        if (tasksList) {
                            tasksList.classList.remove('drag-active');
                        }
                        
                        if (draggedElement && draggedIndex !== null && draggedIndex !== dropIndex) {
                            // Send reorder command to VS Code
                            vscode.postMessage({ 
                                command: 'reorderTasks', 
                                fromIndex: draggedIndex, 
                                toIndex: dropIndex 
                            });
                        }
                        
                        // Reset drag state
                        if (draggedElement) {
                            draggedElement.classList.remove('dragging');
                        }
                        draggedElement = null;
                        draggedIndex = null;
                    }
                    
`;

// Update the content
let updatedContent = content.replace(
    '.sprint-task.current {',
    dragDropCSS + '                    .sprint-task.current {'
);

// Add JavaScript functions after deleteTask
updatedContent = updatedContent.replace(
    'function deleteTask(index) {',
    'function deleteTask(index) {' + dragDropJS
);

// Write the updated content back
fs.writeFileSync('src/commands.ts', updatedContent);

console.log('Drag-and-drop functionality added successfully!'); 