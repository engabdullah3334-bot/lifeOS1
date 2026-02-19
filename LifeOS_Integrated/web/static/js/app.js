const API_URL = "http://localhost:5000/api";

// --- State ---
let tasks = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
});

// --- API Calls ---
async function fetchTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('API not available');
        tasks = await response.json();
        renderTasks();
        updateStats();
    } catch (error) {
        console.error("Failed to fetch tasks:", error);
        // Fallback for demo purposes if backend is down
        console.warn("Backend offline. Using demo mode.");
        // renderEmptyState(); or keep empty
    }
}

async function createTask() {
    const titleInp = document.getElementById('new-task-title');
    const priorityInp = document.getElementById('new-task-priority');
    const dateInp = document.getElementById('new-task-date');

    const newTask = {
        title: titleInp.value,
        priority: priorityInp.value,
        status: "todo",
        due_date: dateInp.value || null
    };

    if (!newTask.title) return alert("Task title is required");

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });
        
        if (response.ok) {
            closeTaskModal();
            titleInp.value = ''; // Reset
            fetchTasks(); // Reload
        }
    } catch (error) {
        console.error("Error creating task:", error);
    }
}

async function updateTaskStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_URL}/tasks/${id}/complete`, {
             method: 'PUT' 
        });
        if (response.ok) {
            fetchTasks(); 
        }
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

async function deleteTask(id) {
    try {
        await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// --- UI Rendering ---
function renderTasks(filter = 'all') {
    // Clear columns
    document.querySelector('#col-high .task-list-area').innerHTML = '';
    document.querySelector('#col-medium .task-list-area').innerHTML = '';
    document.querySelector('#col-low .task-list-area').innerHTML = '';

    const colHigh = document.querySelector('#col-high .task-list-area');
    const colMedium = document.querySelector('#col-medium .task-list-area');
    const colLow = document.querySelector('#col-low .task-list-area');

    tasks.forEach(task => {
        // Filter logic if added later
        
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority}`;
        card.draggable = true;
        
        // Simple HTML construction
        card.innerHTML = `
            <div class="card-header">
                <span class="tag">${task.category || 'General'}</span>
                <button class="more-btn" onclick="deleteTask(${task.id})">×</button>
            </div>
            <h4>${task.title}</h4>
            <p class="due-date">${task.due_date ? 'Due: ' + task.due_date.split('T')[0] : 'No Date'}</p>
            <div class="card-footer">
                <div class="avatars">
                    <div class="avatar-sm"></div>
                </div>
                <!-- Clicking circle completes task -->
                <div class="status-indicator ${task.status === 'done' ? 'completed' : ''}" 
                     onclick="updateTaskStatus(${task.id}, 'done')"></div>
            </div>
        `;

        // Append to correct column
        if (task.priority === 'high') colHigh.appendChild(card);
        else if (task.priority === 'medium') colMedium.appendChild(card);
        else colLow.appendChild(card);
    });
    
    document.getElementById('task-count').textContent = `${tasks.length} Active`;
}

// --- Utils ---
function openTaskModal() {
    document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
}

function updateStats() {
    // optional: update dashboard stats dynamically too

    const completedTasks = tasks.filter(task => task.status === 'done');
    document.getElementById('completed-count').textContent = `${completedTasks.length} Completed`;
    
    
}
