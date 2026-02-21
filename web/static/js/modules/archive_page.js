/**
 * archive_page.js — Logic for Smart Archive Page
 */

const Archive = {
    data: {
        tasks: [],
        notes: [],
        note_projects: [],
        task_projects: []
    },
    filtered: {
        tasks: [],
        notes: []
    },

    async init() {
        console.log("[Archive] Initializing...");
        if (!window.LifeOSApi.getToken()) {
            console.warn("[Archive] No token found, redirecting...");
            window.location.href = '/';
            return;
        }
        await this.loadData();
        this.setupUserUI();
        this.bindEvents();
        this.render();
    },

    async loadData() {
        try {
            const response = await window.LifeOSApi.apiFetch(`${window.API_URL}/archive/all`);
            if (!response.ok) throw new Error("Failed to fetch archive");
            this.data = await response.json();
            this.filtered.tasks = [...this.data.tasks];
            this.filtered.notes = [...this.data.notes];
        } catch (e) {
            console.error(e);
        }
    },

    setupUserUI() {
        const user = JSON.parse(localStorage.getItem('lifeos_user') || '{}');
        const nameEl = document.getElementById('user-name');
        if (nameEl && user.full_name) nameEl.textContent = user.full_name;
        
        const logoutBtn = document.getElementById('btn-logout');
        logoutBtn?.addEventListener('click', () => {
            window.LifeOSApi.setToken(null);
            localStorage.removeItem('lifeos_user');
            window.location.href = '/';
        });
    },

    bindEvents() {
        // Search
        const searchInput = document.getElementById('archive-search');
        searchInput?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            this.filtered.tasks = this.data.tasks.filter(t => 
                t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
            );
            this.filtered.notes = this.data.notes.filter(n => 
                n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
            );
            this.render();
        });
    },

    render() {
        this.renderTasks();
        this.renderWriting();
        
        // Update counts
        document.getElementById('task-archive-count').textContent = this.filtered.tasks.length;
        document.getElementById('writing-archive-count').textContent = this.filtered.notes.length;
    },

    // ─── Task Rendering (Grouped by Project) ───
    renderTasks() {
        const container = document.getElementById('task-archive-container');
        if (!container) return;
        container.innerHTML = '';

        if (this.filtered.tasks.length === 0) {
            container.innerHTML = `<div class="ts-empty">No archived tasks found.</div>`;
            return;
        }

        // Group by project_id
        const groups = {};
        this.filtered.tasks.forEach(task => {
            const pid = task.project_id || 'unassigned';
            if (!groups[pid]) groups[pid] = [];
            groups[pid].push(task);
        });

        Object.keys(groups).forEach(pid => {
            const project = this.data.task_projects.find(p => p.project_id === pid) || { name: 'General', color: '#666' };
            const block = document.createElement('div');
            block.className = 'archive-group-block';
            block.innerHTML = `
                <div class="group-title" style="color: ${project.color}">${project.name}</div>
                <div class="group-items">
                    ${groups[pid].map(t => this._taskCardTemplate(t)).join('')}
                </div>
            `;
            container.appendChild(block);
        });
    },

    _taskCardTemplate(task) {
        const isDone = task.status === 'completed';
        return `
            <div class="archive-smart-card task-card" data-tid="${task.task_id}">
                <div class="card-header">
                    <div class="task-check-wrap">
                        <div class="archive-checkbox ${isDone ? 'checked' : ''}" onclick="Archive.toggleTask('${task.task_id}')"></div>
                        <span class="card-title archive-task-title ${isDone ? 'done' : ''}">${task.title}</span>
                    </div>
                    <span class="card-date">${task.execution_day || ''}</span>
                </div>
                ${task.description ? `<div class="card-snippet">${task.description}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-restore" onclick="Archive.restoreTask('${task.task_id}')">Restore</button>
                    <button class="btn-restore" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2);" onclick="Archive.deleteTask('${task.task_id}')">Delete</button>
                </div>
            </div>
        `;
    },

    // ─── Writing Rendering (Grouped by Tags) ───
    renderWriting() {
        const container = document.getElementById('writing-archive-container');
        if (!container) return;
        container.innerHTML = '';

        if (this.filtered.notes.length === 0) {
            container.innerHTML = `<div class="ts-empty">No archived notes found.</div>`;
            return;
        }

        // Group by primary tag (or "Untagged")
        const groups = {};
        this.filtered.notes.forEach(note => {
            const tag = (note.tags && note.tags.length > 0) ? note.tags[0] : 'General';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(note);
        });

        Object.keys(groups).forEach(tag => {
            const block = document.createElement('div');
            block.className = 'archive-group-block';
            block.innerHTML = `
                <div class="group-title">${tag}</div>
                <div class="group-items">
                    ${groups[tag].map(n => this._noteCardTemplate(n)).join('')}
                </div>
            `;
            container.appendChild(block);
        });
    },

    _noteCardTemplate(note) {
        const snippet = note.content ? note.content.substring(0, 120) + '...' : 'No content';
        return `
            <div class="archive-smart-card note-card" data-nid="${note.note_id}">
                <div class="card-header">
                    <span class="card-title">${note.title}</span>
                </div>
                <div class="card-snippet">${snippet}</div>
                <div class="card-tags">
                    ${(note.tags || []).map(t => `<span class="archive-tag">${t}</span>`).join('')}
                </div>
                <div class="card-actions">
                    <button class="btn-restore" onclick="Archive.restoreNote('${note.note_id}')">Restore</button>
                    <button class="btn-restore" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2);" onclick="Archive.deleteNote('${note.note_id}')">Delete</button>
                </div>
            </div>
        `;
    },

    // ─── Actions ───
    async toggleTask(tid) {
        const task = this.data.tasks.find(t => t.task_id === tid);
        if(!task) return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        await window.LifeOSApi.apiFetch(`${window.API_URL}/tasks/${tid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        task.status = newStatus;
        this.render();
    },

    async restoreTask(tid) {
        await window.LifeOSApi.apiFetch(`${window.API_URL}/tasks/${tid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending' })
        });
        this.data.tasks = this.data.tasks.filter(t => t.task_id !== tid);
        this.filtered.tasks = this.filtered.tasks.filter(t => t.task_id !== tid);
        this.render();
    },

    async deleteTask(tid) {
        if(!confirm("Are you sure you want to delete this task permanently?")) return;
        await window.LifeOSApi.apiFetch(`${window.API_URL}/tasks/${tid}`, {
            method: 'DELETE'
        });
        this.data.tasks = this.data.tasks.filter(t => t.task_id !== tid);
        this.filtered.tasks = this.filtered.tasks.filter(t => t.task_id !== tid);
        this.render();
    },

    async restoreNote(nid) {
        await window.LifeOSApi.apiFetch(`${window.API_URL}/notes/${nid}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: false })
        });
        this.data.notes = this.data.notes.filter(n => n.note_id !== nid);
        this.filtered.notes = this.filtered.notes.filter(n => n.note_id !== nid);
        this.render();
    },

    async deleteNote(nid) {
        if(!confirm("Are you sure you want to delete this note permanently?")) return;
        await window.LifeOSApi.apiFetch(`${window.API_URL}/notes/${nid}`, {
            method: 'DELETE'
        });
        this.data.notes = this.data.notes.filter(n => n.note_id !== nid);
        this.filtered.notes = this.filtered.notes.filter(n => n.note_id !== nid);
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Archive.init();
});
window.Archive = Archive; // Export for onclick handlers
