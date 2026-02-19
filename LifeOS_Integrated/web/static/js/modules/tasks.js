// --- Tasks Manager Logic ---

async function fetchTasks() {
    try {
        const res = await fetch(`${window.API_URL}/tasks`);
        window.state.tasks = await res.json();
        renderTasks();
        updateDashboard();
        updateStats();
    } catch(e) { console.error(e); }
}

async function createTask() {
    const title = document.getElementById('new-task-title').value;
    const description = document.getElementById('new-task-desc').value; 
    
    // Smart Addition: If a day is selected in Week Strip, use it as default start date if not provided
    let start_time = document.getElementById('new-task-start-date').value;
    if (!start_time && window.selectedDate) {
        start_time = window.selectedDate.toISOString().split('T')[0];
    }

    const due_date = document.getElementById('new-task-date').value;
    const priority = document.getElementById('new-task-priority').value;
    const category = "General"; 

    // Recurrence
    const recurrence = document.getElementById('new-task-recurrence').value;
    let recurrence_interval = 1;
    if(recurrence === 'custom') {
        recurrence_interval = document.getElementById('new-task-custom-interval').value;
    }

    if(!title) return alert("Title is required");

    try {
        const res = await fetch(`${window.API_URL}/tasks`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title, description, start_time, due_date, category, priority,
                recurrence: recurrence !== 'none' ? recurrence : null,
                recurrence_interval: recurrence === 'custom' ? recurrence_interval : null
            })
        });
        
        if(res.ok) {
            document.getElementById('task-modal').style.display = 'none';
            // Clear inputs
            document.getElementById('new-task-title').value = '';
            document.getElementById('new-task-desc').value = '';
            document.getElementById('new-task-start-date').value = '';
            document.getElementById('new-task-date').value = '';
            document.getElementById('new-task-recurrence').value = 'none';
            fetchTasks();
        }
    } catch(e) { console.error(e); }
}

async function updateTask(id, data) {
    try {
        const res = await fetch(`${window.API_URL}/tasks/${id}`, {
            method: 'PUT', // We need to add this route in backend
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) {
            fetchTasks();
            return true;
        }
    } catch(e) { console.error(e); return false; }
    return false;
}

async function completeTask(id) {
    try {
        const res = await fetch(`${window.API_URL}/tasks/${id}/complete`, {method: 'PUT'});
        if(res.ok) fetchTasks();
    } catch(e) { console.error(e); }
}

async function deleteTask(id) {
    if(!confirm("Delete this task?")) return;
    try {
        const res = await fetch(`${window.API_URL}/tasks/${id}`, {method: 'DELETE'});
        if(res.ok) fetchTasks();
    } catch(e) { console.error(e); }
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    if(!list) return;
    list.innerHTML = '';

    let filtered = window.state.tasks.filter(t => {
        if(window.state.filter === 'active') return t.status !== 'completed' && t.status !== 'done';
        if(window.state.filter === 'completed') return t.status === 'completed' || t.status === 'done';
        return true;
    });

    // Day Filter from Week Strip
    if (window.selectedDate) {
        const selStr = window.selectedDate.toDateString();
        filtered = filtered.filter(t => {
            // Match Start Date OR Due Date
            let match = false;
            if (t.start_time) {
                if(new Date(t.start_time).toDateString() === selStr) match = true;
            }
            if (t.due_date) {
                if(new Date(t.due_date).toDateString() === selStr) match = true;
            }
            // If task has no dates, maybe show it on "Today" or keep hidden? 
            // User request: "non-recurring tasks created on a day should appear there" based on start/creation.
            // Current login assumes start_time is set.
            return match;
        });
    }

    if(filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">No tasks for this selection.</div>';
        return;
    }

    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority || 'medium'}`;
        const isDone = task.status === 'completed' || task.status === 'done';
        
        // Make the whole card clickable for details (except buttons)
        card.addEventListener('click', (e) => {
            if(!e.target.closest('button') && !e.target.closest('.check-circle')) {
                openTaskDetails(task);
            }
        });

        const dateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Date';

        card.innerHTML = `
            <div class="task-info">
                <div class="task-main">
                    <div class="check-circle ${isDone ? 'checked' : ''}" onclick="completeTask('${task.task_id}')">
                        ${isDone ? '✓' : ''}
                    </div>
                    <div class="task-text">
                        <h4 class="${isDone ? 'completed-text' : ''}">${task.title}</h4>
                        <p>${task.description ? task.description.substring(0, 50) + (task.description.length>50?'...':'') : ''}</p>
                    </div>
                </div>
                <div class="task-meta">
                    <span class="badge category">${task.category || 'General'}</span>
                    <span class="badge date">${dateDisplay}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask('${task.task_id}')">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });
    
    // Also re-render calendar if visible
    if(document.getElementById('tasks-calendar-area').style.display !== 'none') {
        renderCalendar();
    }
}

function updateDashboard() {
    const count = window.state.tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length;
    const countEl = document.getElementById('task-count');
    if(countEl) countEl.textContent = `${count} Active`;
    renderDashboardTasks();
}

function renderDashboardTasks() {
    const list = document.getElementById('dashboard-tasks-list');
    if(!list) return;
    list.innerHTML = '';

    const todayTasks = window.state.tasks.filter(t => {
        return (t.status !== 'completed' && t.status !== 'done');
    }).slice(0, 5);

    if(todayTasks.length === 0) {
        list.innerHTML = '<p style="color:#666; padding:10px; font-size:13px;">No pending tasks.</p>';
        return;
    }

    todayTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'mini-task-item';
        item.innerHTML = `
            <div class="check-circle" onclick="completeTask(${task.task_id})"></div>
            <span>${task.title}</span>
        `;
        list.appendChild(item);
    });
}

function updateStats() {
    const total = window.state.tasks.length;
    if(total === 0) return;

    const completed = window.state.tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const percentage = Math.round((completed / total) * 100);

    const fill = document.getElementById('productivity-fill');
    const text = document.getElementById('productivity-text');

    if(fill) fill.style.width = `${percentage}%`;
    if(text) text.textContent = `${percentage}% Daily Goal`;
}

// --- Calendar & Week Strip Logic ---
let currentDate = new Date();
let calendarMode = 'month'; 
window.selectedDate = new Date(); // Default to today for Week Strip

function initTaskViews() {
    // Week Strip Init
    renderWeekStrip();
    
    // Nav Buttons for Week Strip
    document.getElementById('prev-week-btn')?.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeekStrip();
    });
    document.getElementById('next-week-btn')?.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeekStrip();
    });

    // View Toggles
    const listViewBtn = document.getElementById('view-list-btn');
    const calViewBtn = document.getElementById('view-calendar-btn');
    const listArea = document.getElementById('tasks-list');
    const wkStrip = document.getElementById('week-strip-container');
    const calArea = document.getElementById('tasks-calendar-area');

    if(listViewBtn && calViewBtn) {
        listViewBtn.addEventListener('click', () => {
            listArea.style.display = 'flex';
            wkStrip.style.display = 'flex'; // Show strip in list view
            calArea.style.display = 'none';
            listViewBtn.classList.add('active');
            calViewBtn.classList.remove('active');
        });

        calViewBtn.addEventListener('click', () => {
            listArea.style.display = 'none';
            wkStrip.style.display = 'none'; // Hide strip in calendar view
            calArea.style.display = 'block';
            listViewBtn.classList.remove('active');
            calViewBtn.classList.add('active');
            renderCalendar();
        });
    }

    // New Task Custom Recurrence Toggle
    document.getElementById('new-task-recurrence')?.addEventListener('change', (e) => {
        const customGroup = document.getElementById('custom-recurrence-group');
        if(e.target.value === 'custom') customGroup.style.display = 'block';
        else customGroup.style.display = 'none';
    });

    // Details Modal Actions
    document.getElementById('close-details-modal')?.addEventListener('click', closeModal);
    
    // Edit Mode Toggles
    document.getElementById('edit-task-btn')?.addEventListener('click', enableEditMode);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', disableEditMode);
    document.getElementById('save-edit-btn')?.addEventListener('click', saveEditedTask);
}

function renderWeekStrip() {
    const grid = document.getElementById('week-strip-grid');
    const label = document.getElementById('current-week-label');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    // Calculate Start of Week (Saturday)
    // Day: 0=Sun, 1=Mon, ..., 6=Sat
    // If today is Sunday(0), prev Sat is -1 day.
    // If today is Sat(6), start is today.
    // Logic: diff = (day + 1) % 7.  Sat(6) -> 0. Sun(0) -> 1. Fri(5) -> 6.
    
    const curr = new Date(currentDate);
    const day = curr.getDay();
    // Move to Saturday
    // 0(Sun) -> want -1 (Sat). 
    // 6(Sat) -> want 0.
    // 5(Fri) -> want -6.
    // Formula for Sat start:
    const dist = (day + 1) % 7; 
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dist);

    // Label: Month Year
    label.textContent = startOfWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    for(let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day-card';
        
        // Check selection
        if(window.selectedDate && d.toDateString() === window.selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }
        
        // Check if Today
        const now = new Date();
        if(d.toDateString() === now.toDateString()) {
            dayEl.classList.add('today-marker');
        }

        // Days: Sat, Sun...
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        dayEl.innerHTML = `
            <span class="wd-name">${dayNames[d.getDay()]}</span>
            <span class="wd-num">${d.getDate()}</span>
        `;
        
        dayEl.onclick = () => {
            window.selectedDate = d;
            
            // Switch to List View on click
            const listViewBtn = document.getElementById('view-list-btn');
            const calViewBtn = document.getElementById('view-calendar-btn');
            const listArea = document.getElementById('tasks-list');
            const wkStrip = document.getElementById('week-strip-container');
            const calArea = document.getElementById('tasks-calendar-area');
            
            listArea.style.display = 'flex';
            wkStrip.style.display = 'flex';
            calArea.style.display = 'none';
            
            listViewBtn.classList.add('active');
            calViewBtn.classList.remove('active');

            renderWeekStrip();
            renderTasks(); 
        };
        
        grid.appendChild(dayEl);
    }
}

// ... (Rest of Calendar Logic same, just variable names match) ...

function changePeriod(delta) {
    if (calendarMode === 'month') {
        currentDate.setMonth(currentDate.getMonth() + delta);
    } else {
        currentDate.setDate(currentDate.getDate() + (delta * 7));
    }
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('tasks-calendar-grid');
    const label = document.getElementById('current-period-label');
    if(!grid || !label) return;

    grid.innerHTML = '';
    
    // Set Grid Columns based on mode
    grid.className = `calendar-grid ${calendarMode}-view`;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    if (calendarMode === 'month') {
        label.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayIndex = firstDay.getDay(); // 0 = Sunday
        const daysInMonth = lastDay.getDate();

        // Month View Logic
        for (let i = 0; i < startDayIndex; i++) {
            grid.appendChild(createDayCell(null)); // Empty slots
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            grid.appendChild(createDayCell(date, today));
        }
    } else {
        // Week View Logic
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start on Sunday
        
        label.textContent = `Week of ${startOfWeek.toLocaleDateString()}`;

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            grid.appendChild(createDayCell(date, today));
        }
    }
}

function createDayCell(date, today) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    if (!date) {
        cell.classList.add('empty');
        return cell;
    }

    const isToday = today && date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    if (isToday) cell.classList.add('today');

    // Add Hover Title
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    cell.title = dayName;

    // Make Cell Interactive
    cell.onclick = () => {
        window.selectedDate = date;
        
        // Switch to List View
        const listViewBtn = document.getElementById('view-list-btn');
        const calViewBtn = document.getElementById('view-calendar-btn');
        const listArea = document.getElementById('tasks-list');
        const wkStrip = document.getElementById('week-strip-container');
        const calArea = document.getElementById('tasks-calendar-area');
        
        listArea.style.display = 'flex';
        wkStrip.style.display = 'flex';
        calArea.style.display = 'none';
        
        listViewBtn.classList.add('active');
        calViewBtn.classList.remove('active');

        renderWeekStrip();
        renderTasks();
    };

    // Day Header
    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = date.getDate();
    if(calendarMode === 'week') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        header.textContent = `${days[date.getDay()]} ${date.getDate()}`;
    }
    cell.appendChild(header);

    // Tasks for this Day
    const dayTasks = window.state.tasks.filter(t => {
        if (!t.due_date && !t.start_time) return false;
        
        // Simple check: is this date between start and due? OR just matches one?
        // Let's match Start Date OR Due Date for now.
        const d = new Date(date).setHours(0,0,0,0);
        
        let match = false;
        if (t.start_time) {
            const start = new Date(t.start_time).setHours(0,0,0,0);
            if(d === start) match = true;
        }
        if (t.due_date) {
            const due = new Date(t.due_date).setHours(0,0,0,0);
            if(d === due) match = true;
        }
        return match;
    });

    dayTasks.forEach(task => {
        const pill = document.createElement('div');
        pill.className = `task-pill priority-${task.priority}`;
        pill.textContent = task.title;
        pill.onclick = (e) => {
            e.stopPropagation();
            openTaskDetails(task);
        };
        cell.appendChild(pill);
    });

    return cell;
}

function openTaskDetails(task) {
    const modal = document.getElementById('task-details-modal');
    if(!modal) return;

    document.getElementById('detail-title').textContent = task.title;
    document.getElementById('detail-description').textContent = task.description || "No description provided.";
    
    // Removed Date Box logic
    // document.getElementById('detail-start-date').textContent = ...
    // document.getElementById('detail-due-date').textContent = ...
    
    document.getElementById('detail-priority-badge').textContent = task.priority;
    document.getElementById('detail-category-badge').textContent = task.category;
    
    if(task.recurrence) {
         const badge = document.getElementById('detail-recurrence-badge');
         badge.style.display = 'inline-block';
         badge.textContent = `🔁 ${task.recurrence}`;
    } else {
         document.getElementById('detail-recurrence-badge').style.display = 'none';
    }

    // Button actions
    const completeBtn = document.getElementById('detail-complete-btn');
    const deleteBtn = document.getElementById('detail-delete-btn');

    completeBtn.onclick = () => {
        completeTask(task.task_id);
        modal.style.display = 'none';
    };

    deleteBtn.onclick = () => {
        deleteTask(task.task_id);
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
    
    // Store current task for Edit
    window.currentTask = task;
    disableEditMode(); // Ensure view mode first
}

function enableEditMode() {
    if(!window.currentTask) return;
    const task = window.currentTask;
    
    document.getElementById('task-detail-view-mode').style.display = 'none';
    document.getElementById('task-detail-edit-mode').style.display = 'block';
    
    document.getElementById('detail-actions-view').style.display = 'none';
    document.getElementById('detail-actions-edit').style.display = 'flex';
    
    // Populate Inputs
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-desc').value = task.description || '';
    
    if(task.start_time) document.getElementById('edit-task-start').value = task.start_time.split('T')[0];
    else document.getElementById('edit-task-start').value = '';
    
    if(task.due_date) document.getElementById('edit-task-due').value = task.due_date.split('T')[0];
    else document.getElementById('edit-task-due').value = '';
    
    document.getElementById('edit-task-recurrence').value = task.recurrence || 'none';
}

function disableEditMode() {
    document.getElementById('task-detail-view-mode').style.display = 'block';
    document.getElementById('task-detail-edit-mode').style.display = 'none';
    
    document.getElementById('detail-actions-view').style.display = 'flex';
    document.getElementById('detail-actions-edit').style.display = 'none';
}

async function saveEditedTask() {
    if(!window.currentTask) return;
    
    const title = document.getElementById('edit-task-title').value;
    const description = document.getElementById('edit-task-desc').value;
    const start_time = document.getElementById('edit-task-start').value;
    const due_date = document.getElementById('edit-task-due').value;
    const recurrence = document.getElementById('edit-task-recurrence').value;
    
    const data = {
        title, description, start_time, due_date,
        recurrence: recurrence !== 'none' ? recurrence : null
    };
    
    const success = await updateTask(window.currentTask.task_id, data);
    if(success) {
        document.getElementById('task-details-modal').style.display = 'none';
    }
}

function closeModal() {
     document.getElementById('task-details-modal').style.display = 'none';
}

// Override original load to init views
const originalFetch = window.fetchTasks;
window.fetchTasks = async () => {
    await originalFetch();
    // After first fetch, init views if not done? 
    // actually safer to call initTaskViews() from main.js or here once
    if(!window.viewsInitialized) {
        initTaskViews();
        window.viewsInitialized = true;
    }
};

// Export to window
window.fetchTasks = fetchTasks;
window.createTask = createTask;
window.completeTask = completeTask;
window.deleteTask = deleteTask;
window.renderTasks = renderTasks;
window.updateDashboard = updateDashboard;
window.updateStats = updateStats;
