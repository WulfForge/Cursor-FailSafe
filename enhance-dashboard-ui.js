const fs = require('fs');
const path = require('path');

// Read the commands.ts file
const commandsPath = path.join(__dirname, 'src', 'commands.ts');
let content = fs.readFileSync(commandsPath, 'utf8');

// Find the generateDashboardHTML method and replace it with enhanced version
const enhancedHTML = `
    private generateDashboardHTML(
        currentSprint: any,
        sprintHistory: any[],
        templates: any[],
        sprintMetrics: any
    ): string {
        return \`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FailSafe Dashboard</title>
                <style>
                    :root {
                        --primary: hsl(180, 100%, 50%);
                        --primary-foreground: hsl(240, 5.9%, 10%);
                        --background: hsl(240, 10%, 3.9%);
                        --foreground: hsl(0, 0%, 98%);
                        --card: hsl(240, 10%, 6%);
                        --card-foreground: hsl(0, 0%, 98%);
                        --muted: hsl(240, 3.7%, 15.9%);
                        --muted-foreground: hsl(240, 5% 64.9%);
                        --accent: hsl(240, 3.7%, 15.9%);
                        --accent-foreground: hsl(0, 0%, 98%);
                        --border: hsl(240, 3.7%, 15.9%);
                        --destructive: hsl(0, 62.8%, 30.6%);
                        --destructive-foreground: hsl(0, 0%, 98%);
                        --success: hsl(142, 76%, 36%);
                        --warning: hsl(38, 92%, 50%);
                        --radius: 0.5rem;
                    }

                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }

                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: var(--background);
                        color: var(--foreground);
                        line-height: 1.6;
                        padding: 1rem;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }

                    .container {
                        max-width: 1400px;
                        margin: 0 auto;
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 2rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid var(--border);
                    }

                    .header h1 {
                        font-size: 2rem;
                        font-weight: 700;
                        color: var(--primary);
                    }

                    .btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        white-space: nowrap;
                        border-radius: var(--radius);
                        font-size: 0.875rem;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        cursor: pointer;
                        border: none;
                        outline: none;
                        text-decoration: none;
                        user-select: none;
                        padding: 0.5rem 1rem;
                    }

                    .btn:focus-visible {
                        outline: 2px solid var(--primary);
                        outline-offset: 2px;
                    }

                    .btn-primary {
                        background: var(--primary);
                        color: var(--primary-foreground);
                    }

                    .btn-primary:hover {
                        background: color-mix(in srgb, var(--primary) 90%, black);
                    }

                    .btn-outline {
                        background: transparent;
                        color: var(--foreground);
                        border: 1px solid var(--border);
                    }

                    .btn-outline:hover {
                        background: var(--accent);
                        color: var(--accent-foreground);
                    }

                    .btn-sm {
                        padding: 0.25rem 0.5rem;
                        font-size: 0.75rem;
                    }

                    .btn-success {
                        background: var(--success);
                        color: white;
                    }

                    .btn-success:hover {
                        background: color-mix(in srgb, var(--success) 90%, black);
                    }

                    .btn-warning {
                        background: var(--warning);
                        color: black;
                    }

                    .btn-warning:hover {
                        background: color-mix(in srgb, var(--warning) 90%, black);
                    }

                    .btn-destructive {
                        background: var(--destructive);
                        color: var(--destructive-foreground);
                    }

                    .btn-destructive:hover {
                        background: color-mix(in srgb, var(--destructive) 90%, black);
                    }

                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 1.5rem;
                        margin-bottom: 2rem;
                    }

                    .card {
                        background: var(--card);
                        border: 1px solid var(--border);
                        border-radius: var(--radius);
                        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
                    }

                    .card-header {
                        padding: 1.5rem;
                        border-bottom: 1px solid var(--border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .card-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        line-height: 1.2;
                        letter-spacing: -0.025em;
                    }

                    .card-content {
                        padding: 1.5rem;
                    }

                    .card-footer {
                        padding: 1.5rem;
                        border-top: 1px solid var(--border);
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .badge {
                        display: inline-flex;
                        align-items: center;
                        border-radius: 9999px;
                        font-size: 0.75rem;
                        font-weight: 500;
                        padding: 0.125rem 0.5rem;
                        white-space: nowrap;
                    }

                    .badge-primary {
                        background: var(--primary);
                        color: var(--primary-foreground);
                    }

                    .badge-success {
                        background: var(--success);
                        color: white;
                    }

                    .badge-warning {
                        background: var(--warning);
                        color: black;
                    }

                    .badge-destructive {
                        background: var(--destructive);
                        color: var(--destructive-foreground);
                    }

                    .progress-bar {
                        width: 100%;
                        height: 8px;
                        background: var(--muted);
                        border-radius: 4px;
                        overflow: hidden;
                        margin: 0.5rem 0;
                    }

                    .progress-fill {
                        height: 100%;
                        background: var(--primary);
                        transition: width 0.3s ease;
                    }

                    .metric-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 1rem;
                        margin: 1rem 0;
                    }

                    .metric {
                        text-align: center;
                        padding: 1rem;
                        background: var(--accent);
                        border-radius: var(--radius);
                    }

                    .metric-value {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: var(--primary);
                    }

                    .metric-label {
                        font-size: 0.75rem;
                        color: var(--muted-foreground);
                        margin-top: 0.25rem;
                    }

                    .task-list {
                        list-style: none;
                        margin: 0;
                        padding: 0;
                    }

                    .task-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0.75rem;
                        border-bottom: 1px solid var(--border);
                        transition: background-color 0.2s ease;
                    }

                    .task-item:hover {
                        background: var(--accent);
                    }

                    .task-item:last-child {
                        border-bottom: none;
                    }

                    .task-item.dragging {
                        opacity: 0.5;
                        background: var(--accent);
                    }

                    .task-item.drag-over {
                        border-top: 2px solid var(--primary);
                    }

                    .task-info {
                        flex: 1;
                        min-width: 0;
                    }

                    .task-name {
                        font-weight: 500;
                        margin-bottom: 0.25rem;
                        color: var(--foreground);
                    }

                    .task-description {
                        font-size: 0.875rem;
                        color: var(--muted-foreground);
                        margin-bottom: 0.5rem;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }

                    .task-meta {
                        display: flex;
                        gap: 1rem;
                        font-size: 0.75rem;
                        color: var(--muted-foreground);
                    }

                    .task-actions {
                        display: flex;
                        gap: 0.25rem;
                        flex-shrink: 0;
                    }

                    .task-drag-handle {
                        cursor: grab;
                        padding: 0.25rem;
                        color: var(--muted-foreground);
                        margin-right: 0.5rem;
                    }

                    .task-drag-handle:active {
                        cursor: grabbing;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 3rem 1rem;
                        color: var(--muted-foreground);
                    }

                    .empty-state h3 {
                        margin-bottom: 0.5rem;
                        color: var(--foreground);
                    }

                    .actions {
                        display: flex;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                    }

                    .task-status-indicator {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        margin-right: 0.5rem;
                        flex-shrink: 0;
                    }

                    .status-not-started { background: var(--muted-foreground); }
                    .status-in-progress { background: var(--primary); }
                    .status-completed { background: var(--success); }
                    .status-blocked { background: var(--destructive); }
                    .status-delayed { background: var(--warning); }

                    .task-priority {
                        font-size: 0.75rem;
                        padding: 0.125rem 0.375rem;
                        border-radius: 4px;
                        font-weight: 500;
                    }

                    .priority-low { background: var(--success); color: white; }
                    .priority-medium { background: var(--warning); color: black; }
                    .priority-high { background: var(--destructive); color: white; }
                    .priority-critical { background: #dc2626; color: white; }

                    .task-list-container {
                        max-height: 400px;
                        overflow-y: auto;
                        border: 1px solid var(--border);
                        border-radius: var(--radius);
                    }

                    .task-filters {
                        display: flex;
                        gap: 1rem;
                        margin-bottom: 1rem;
                        flex-wrap: wrap;
                    }

                    .filter-btn {
                        padding: 0.25rem 0.75rem;
                        border-radius: 9999px;
                        font-size: 0.75rem;
                        background: var(--accent);
                        color: var(--accent-foreground);
                        border: 1px solid var(--border);
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .filter-btn.active {
                        background: var(--primary);
                        color: var(--primary-foreground);
                    }

                    .filter-btn:hover {
                        background: var(--primary);
                        color: var(--primary-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚀 FailSafe Dashboard</h1>
                        <div class="actions">
                            <button class="btn btn-outline" onclick="refreshDashboard()">🔄 Refresh</button>
                            <button class="btn btn-primary" onclick="createSprint()">📅 New Sprint</button>
                        </div>
                    </div>

                    <div class="grid">
                        <!-- Current Sprint -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">📅 Current Sprint</h2>
                            </div>
                            <div class="card-content">
                                \${currentSprint ? \`
                                    <h3>\${currentSprint.name}</h3>
                                    <p>\${currentSprint.description || 'No description'}</p>
                                    <div class="badge badge-\${currentSprint.status === 'active' ? 'success' : currentSprint.status === 'completed' ? 'primary' : 'warning'}">
                                        \${currentSprint.status}
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: \${sprintMetrics ? sprintMetrics.progressPercentage : 0}%"></div>
                                    </div>
                                    <p>\${sprintMetrics ? Math.round(sprintMetrics.progressPercentage) : 0}% Complete</p>
                                    <div class="actions">
                                        <button class="btn btn-outline" onclick="showSprintMetrics()">📊 Metrics</button>
                                        <button class="btn btn-outline" onclick="exportSprintData()">📤 Export</button>
                                    </div>
                                \` : \`
                                    <div class="empty-state">
                                        <h3>No Active Sprint</h3>
                                        <p>Create a new sprint to get started</p>
                                        <button class="btn btn-primary" onclick="createSprint()">Create Sprint</button>
                                    </div>
                                \`}
                            </div>
                        </div>

                        <!-- Sprint Metrics -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">📊 Sprint Metrics</h2>
                            </div>
                            <div class="card-content">
                                \${sprintMetrics ? \`
                                    <div class="metric-grid">
                                        <div class="metric">
                                            <div class="metric-value">\${sprintMetrics.completedTasks}/\${sprintMetrics.totalTasks}</div>
                                            <div class="metric-label">Tasks</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-value">\${sprintMetrics.completedStoryPoints}/\${sprintMetrics.totalStoryPoints}</div>
                                            <div class="metric-label">Story Points</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-value">\${sprintMetrics.velocity.toFixed(1)}</div>
                                            <div class="metric-label">Velocity</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-value">\${sprintMetrics.blockedTasks}</div>
                                            <div class="metric-label">Blocked</div>
                                        </div>
                                    </div>
                                    <div class="badge badge-\${sprintMetrics.riskAssessment.overallRisk === 'low' ? 'success' : sprintMetrics.riskAssessment.overallRisk === 'medium' ? 'warning' : 'destructive'}">
                                        Risk: \${sprintMetrics.riskAssessment.overallRisk}
                                    </div>
                                \` : \`
                                    <div class="empty-state">
                                        <h3>No Metrics Available</h3>
                                        <p>Start a sprint to see metrics</p>
                                    </div>
                                \`}
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">⚡ Quick Actions</h2>
                            </div>
                            <div class="card-content">
                                <div class="actions">
                                    <button class="btn btn-primary" onclick="validateChat()">🔍 Validate Chat</button>
                                    <button class="btn btn-outline" onclick="createCursorrule()">📝 Create Rule</button>
                                    <button class="btn btn-outline" onclick="validatePlanWithAI()">🤖 AI Validation</button>
                                </div>
                            </div>
                        </div>

                        <!-- Sprint History -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">📚 Sprint History</h2>
                            </div>
                            <div class="card-content">
                                \${sprintHistory.length > 0 ? \`
                                    <ul class="task-list">
                                        \${sprintHistory.slice(0, 5).map(sprint => \`
                                            <li class="task-item">
                                                <div class="task-info">
                                                    <div class="task-name">\${sprint.name}</div>
                                                    <div class="task-meta">\${sprint.status} • \${sprint.tasks.length} tasks</div>
                                                </div>
                                                <div class="badge badge-\${sprint.status === 'completed' ? 'success' : sprint.status === 'active' ? 'primary' : 'warning'}">
                                                    \${sprint.status}
                                                </div>
                                            </li>
                                        \`).join('')}
                                    </ul>
                                    \${sprintHistory.length > 5 ? \`<p class="text-muted">+\${sprintHistory.length - 5} more sprints</p>\` : ''}
                                \` : \`
                                    <div class="empty-state">
                                        <h3>No Sprint History</h3>
                                        <p>Complete sprints to see history</p>
                                    </div>
                                \`}
                            </div>
                        </div>

                        <!-- Templates -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">📋 Sprint Templates</h2>
                            </div>
                            <div class="card-content">
                                \${templates.length > 0 ? \`
                                    <ul class="task-list">
                                        \${templates.slice(0, 3).map(template => \`
                                            <li class="task-item">
                                                <div class="task-info">
                                                    <div class="task-name">\${template.name}</div>
                                                    <div class="task-meta">\${template.duration} days • \${template.velocity} SP/day</div>
                                                </div>
                                            </li>
                                        \`).join('')}
                                    </ul>
                                    \${templates.length > 3 ? \`<p class="text-muted">+\${templates.length - 3} more templates</p>\` : ''}
                                \` : \`
                                    <div class="empty-state">
                                        <h3>No Templates</h3>
                                        <p>Create templates for quick sprint setup</p>
                                    </div>
                                \`}
                            </div>
                        </div>

                        <!-- Project Health -->
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">🏥 Project Health</h2>
                            </div>
                            <div class="card-content">
                                <div class="metric-grid">
                                    <div class="metric">
                                        <div class="metric-value">\${sprintHistory.filter(s => s.status === 'completed').length}</div>
                                        <div class="metric-label">Completed</div>
                                    </div>
                                    <div class="metric">
                                        <div class="metric-value">\${templates.length}</div>
                                        <div class="metric-label">Templates</div>
                                    </div>
                                    <div class="metric">
                                        <div class="metric-value">\${sprintMetrics ? sprintMetrics.blockedTasks : 0}</div>
                                        <div class="metric-label">Blocked</div>
                                    </div>
                                    <div class="metric">
                                        <div class="metric-value">\${sprintHistory.length}</div>
                                        <div class="metric-label">Total</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Task Management Section -->
                    \${currentSprint ? \`
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">📋 Task Management</h2>
                                <button class="btn btn-primary btn-sm" onclick="addTask()">➕ Add Task</button>
                            </div>
                            <div class="card-content">
                                <div class="task-filters">
                                    <button class="filter-btn active" onclick="filterTasks('all')">All</button>
                                    <button class="filter-btn" onclick="filterTasks('not-started')">Not Started</button>
                                    <button class="filter-btn" onclick="filterTasks('in-progress')">In Progress</button>
                                    <button class="filter-btn" onclick="filterTasks('completed')">Completed</button>
                                    <button class="filter-btn" onclick="filterTasks('blocked')">Blocked</button>
                                </div>
                                
                                <div class="task-list-container" id="taskList">
                                    \${currentSprint.tasks && currentSprint.tasks.length > 0 ? \`
                                        \${currentSprint.tasks.map((task, index) => \`
                                            <div class="task-item" data-task-id="\${task.id}" data-status="\${task.status}" draggable="true">
                                                <div class="task-drag-handle" title="Drag to reorder">⋮⋮</div>
                                                <div class="task-status-indicator status-\${task.status.replace('_', '-')}"></div>
                                                <div class="task-info">
                                                    <div class="task-name">\${task.name}</div>
                                                    <div class="task-description">\${task.description || 'No description'}</div>
                                                    <div class="task-meta">
                                                        <span class="task-priority priority-\${task.priority}">\${task.priority}</span>
                                                        <span>\${task.estimatedHours || 0}h</span>
                                                        <span>\${task.storyPoints || 0} SP</span>
                                                        \${task.status === 'completed' && task.endTime ? \`<span>Completed \${new Date(task.endTime).toLocaleDateString()}</span>\` : ''}
                                                    </div>
                                                </div>
                                                <div class="task-actions">
                                                    \${task.status !== 'completed' ? \`
                                                        <button class="btn btn-success btn-sm" onclick="markTaskComplete('\${task.id}')" title="Mark Complete">✓</button>
                                                    \` : ''}
                                                    <button class="btn btn-outline btn-sm" onclick="editTask('\${task.id}')" title="Edit">✏️</button>
                                                    <button class="btn btn-warning btn-sm" onclick="duplicateTask('\${task.id}')" title="Duplicate">📋</button>
                                                    <button class="btn btn-destructive btn-sm" onclick="deleteTask('\${task.id}')" title="Delete">🗑️</button>
                                                </div>
                                            </div>
                                        \`).join('')}
                                    \` : \`
                                        <div class="empty-state">
                                            <h3>No Tasks</h3>
                                            <p>Add tasks to your sprint to get started</p>
                                            <button class="btn btn-primary" onclick="addTask()">Add First Task</button>
                                        </div>
                                    \`}
                                </div>
                            </div>
                        </div>
                    \` : ''}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let draggedElement = null;

                    function createSprint() {
                        vscode.postMessage({ command: 'createSprint' });
                    }

                    function exportSprintData() {
                        vscode.postMessage({ command: 'exportSprintData' });
                    }

                    function showSprintMetrics() {
                        vscode.postMessage({ command: 'showSprintMetrics' });
                    }

                    function validateChat() {
                        vscode.postMessage({ command: 'validateChat' });
                    }

                    function createCursorrule() {
                        vscode.postMessage({ command: 'createCursorrule' });
                    }

                    function validatePlanWithAI() {
                        vscode.postMessage({ command: 'validatePlanWithAI' });
                    }

                    function refreshDashboard() {
                        vscode.postMessage({ command: 'refreshDashboard' });
                    }

                    function addTask() {
                        vscode.postMessage({ command: 'addTask' });
                    }

                    function editTask(taskId) {
                        vscode.postMessage({ command: 'editTask', taskId: taskId });
                    }

                    function deleteTask(taskId) {
                        if (confirm('Are you sure you want to delete this task?')) {
                            vscode.postMessage({ command: 'deleteTask', taskId: taskId });
                        }
                    }

                    function duplicateTask(taskId) {
                        vscode.postMessage({ command: 'duplicateTask', taskId: taskId });
                    }

                    function markTaskComplete(taskId) {
                        vscode.postMessage({ command: 'markTaskComplete', taskId: taskId });
                    }

                    function filterTasks(status) {
                        const taskItems = document.querySelectorAll('.task-item');
                        const filterBtns = document.querySelectorAll('.filter-btn');
                        
                        // Update active filter button
                        filterBtns.forEach(btn => btn.classList.remove('active'));
                        event.target.classList.add('active');
                        
                        // Filter tasks
                        taskItems.forEach(item => {
                            if (status === 'all' || item.dataset.status === status) {
                                item.style.display = 'flex';
                            } else {
                                item.style.display = 'none';
                            }
                        });
                    }

                    // Drag and Drop functionality
                    document.addEventListener('DOMContentLoaded', function() {
                        const taskList = document.getElementById('taskList');
                        if (!taskList) return;

                        taskList.addEventListener('dragstart', function(e) {
                            if (e.target.classList.contains('task-item')) {
                                draggedElement = e.target;
                                e.target.classList.add('dragging');
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/html', e.target.outerHTML);
                            }
                        });

                        taskList.addEventListener('dragend', function(e) {
                            if (e.target.classList.contains('task-item')) {
                                e.target.classList.remove('dragging');
                                draggedElement = null;
                            }
                        });

                        taskList.addEventListener('dragover', function(e) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            
                            const taskItem = e.target.closest('.task-item');
                            if (taskItem && taskItem !== draggedElement) {
                                taskItem.classList.add('drag-over');
                            }
                        });

                        taskList.addEventListener('dragleave', function(e) {
                            const taskItem = e.target.closest('.task-item');
                            if (taskItem) {
                                taskItem.classList.remove('drag-over');
                            }
                        });

                        taskList.addEventListener('drop', function(e) {
                            e.preventDefault();
                            
                            const taskItem = e.target.closest('.task-item');
                            if (taskItem && draggedElement && taskItem !== draggedElement) {
                                taskItem.classList.remove('drag-over');
                                
                                // Get all task IDs in new order
                                const taskItems = Array.from(taskList.querySelectorAll('.task-item'));
                                const taskIds = taskItems.map(item => item.dataset.taskId);
                                
                                // Send reorder message
                                vscode.postMessage({ 
                                    command: 'reorderTasksByDragDrop', 
                                    taskIds: taskIds 
                                });
                            }
                        });
                    });
                </script>
            </body>
            </html>
        \`;
    }`;

// Replace the existing generateDashboardHTML method
const methodStart = content.indexOf('private generateDashboardHTML(');
const methodEnd = content.indexOf('};', methodStart) + 2;

if (methodStart !== -1 && methodEnd !== -1) {
    const beforeMethod = content.substring(0, methodStart);
    const afterMethod = content.substring(methodEnd);
    content = beforeMethod + enhancedHTML + afterMethod;
}

// Write the enhanced content back
fs.writeFileSync(commandsPath, content, 'utf8');

console.log('Dashboard UI enhanced with comprehensive task management!'); 