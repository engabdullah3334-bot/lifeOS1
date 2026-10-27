/**
 * archive_page.js — Archive Hub Module
 * Tasks grouped by project; Writing/Notes grouped by tags.
 * Checkbox toggle (complete), Restore, Search, Delete.
 * English language version.
 */

const Archive = {
    data: {
        tasks: [],
        notes: [],
        note_projects: [],
        task_projects: []
    },
    filtered: { tasks: [], notes: [], note_projects: [] },
    initialized: false,

    async init() {
        // If we're inside the SPA, we don't need to check token here as main.js/auth.js handles it.
        // But we do need to ensure the container is visible if called directly.
        const container = document.getElementById('archive');
        if (container && container.style.display === 'none') {
            // If called from main.js loadView, it should already be block/flex.
        }

        await this.loadData();
        if (!this.initialized) {
            this.setupUserUI();
            this.bindEvents();
            this._bindCardActions();
            this.initialized = true;
        }
        this.render();
    },

    async loadData() {
        try {
            // Call the correct API endpoint
            const response = await this._fetch(`${window.API_URL}/archive`);
            if (!response.ok) throw new Error('Failed to fetch archive');
            const json = await response.json();
            
            this.data = {
                tasks: Array.isArray(json.tasks) ? json.tasks : [],
                notes: Array.isArray(json.notes) ? json.notes : [],
                note_projects: Array.isArray(json.note_projects) ? json.note_projects : [],
                task_projects: Array.isArray(json.task_projects) ? json.task_projects : []
            };
            
            this.filtered.tasks = [...this.data.tasks];
            this.filtered.notes = [...this.data.notes];
            this.filtered.note_projects = [...this.data.note_projects];
        } catch (e) {
            console.error('[Archive]', e);
        }
    },

    _fetch(url, opts = {}) {
        const token = localStorage.getItem('lifeos_token') || (window.LifeOSApi?.getToken?.());
        const headers = { 
            'Content-Type': 'application/json',
            ...opts.headers 
        };
        if (token) headers.Authorization = 'Bearer ' + token;
        return fetch(url, { ...opts, headers });
    },

    setupUserUI() {
        // Handled by main.js in SPA mode, but keeping for compatibility
        const auth = JSON.parse(localStorage.getItem('lifeos_auth') || '{}');
        const nameEl = document.getElementById('user-name');
        if (nameEl && auth.username) nameEl.textContent = auth.username;
    },

    bindEvents() {
        const searchInput = document.getElementById('archive-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = (e.target.value || '').toLowerCase().trim();
                if (!q) {
                    this.filtered.tasks = [...this.data.tasks];
                    this.filtered.notes = [...this.data.notes];
                    this.filtered.note_projects = [...this.data.note_projects];
                } else {
                    const projNames = {};
                    this.data.task_projects.forEach(p => { projNames[p.project_id] = (p.name || '').toLowerCase(); });
                    
                    this.filtered.tasks = this.data.tasks.filter(t =>
                        (t.title || '').toLowerCase().includes(q) ||
                        (t.description || '').toLowerCase().includes(q) ||
                        (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
                        projNames[t.project_id]?.includes(q)
                    );
                    
                    this.filtered.notes = this.data.notes.filter(n =>
                        (n.title || '').toLowerCase().includes(q) ||
                        (n.content || '').toLowerCase().includes(q) ||
                        (n.description || '').toLowerCase().includes(q) ||
                        (n.tags || []).some(tag => tag.toLowerCase().includes(q))
                    );
                    
                    this.filtered.note_projects = this.data.note_projects.filter(p =>
                        (p.name || '').toLowerCase().includes(q)
                    );
                }
                this.render();
            });
        }
    },

    render() {
        this.renderTasks();
        this.renderWriting();
    },

    _esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _dateStr(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (_) { return iso; }
    },

    // ─── Tasks: group by project_id
    renderTasks() {
        const container = document.getElementById('task-archive-container');
        const emptyEl = document.getElementById('archive-tasks-empty');
        if (!container) return;

        if (this.filtered.tasks.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        const byProject = {};
        this.filtered.tasks.forEach(t => {
            const pid = t.project_id || 'general';
            if (!byProject[pid]) byProject[pid] = [];
            byProject[pid].push(t);
        });

        container.innerHTML = '';
        Object.keys(byProject).forEach(pid => {
            const project = this.data.task_projects.find(p => p.project_id === pid) || { name: 'General', color: '#6b7280' };
            const tasks = byProject[pid];
            
            const block = document.createElement('div');
            block.className = 'archive-group-block';
            block.innerHTML = `
                <div class="group-title" style="color:${project.color}">${this._esc(project.name)}</div>
                <div class="group-items">
                    ${tasks.map(t => this._taskCard(t)).join('')}
                </div>
            `;
            container.appendChild(block);
        });
    },

    _taskCard(task) {
        const isDone = task.status === 'completed';
        const dateLabel = task.last_updated || task.execution_day || task.created_at;
        return `
            <div class="archive-smart-card task-card" data-tid="${task.task_id}">
                <div class="card-header">
                    <div class="task-check-wrap">
                        <div class="archive-checkbox ${isDone ? 'checked' : ''}" data-action="toggle" data-tid="${task.task_id}" role="button" aria-pressed="${isDone}"></div>
                        <span class="card-title archive-task-title ${isDone ? 'done' : ''}">${this._esc(task.title)}</span>
                    </div>
                    <span class="card-date">${this._dateStr(dateLabel)}</span>
                </div>
                ${task.description ? `<div class="card-snippet">${this._esc(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                <div class="card-actions">
                    <button type="button" class="btn-restore" data-action="restore-task" data-tid="${task.task_id}">Restore</button>
                    <button type="button" class="btn-delete" data-action="delete-task" data-tid="${task.task_id}">Delete Permanently</button>
                </div>

            </div>
        `;
    },

    // ─── Writing: group by first tag, then note_projects as separate block
    renderWriting() {
        const container = document.getElementById('writing-archive-container');
        const emptyEl = document.getElementById('archive-writing-empty');
        if (!container) return;

        const hasNotes = this.filtered.notes.length > 0;
        const hasProjects = this.filtered.note_projects.length > 0;

        if (!hasNotes && !hasProjects) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        container.innerHTML = '';

        if (hasProjects) {
            const block = document.createElement('div');
            block.className = 'archive-group-block';
            block.innerHTML = `
                <div class="group-title">Archived Writing Projects</div>
                <div class="group-items">
                    ${this.filtered.note_projects.map(p => this._noteProjectCard(p)).join('')}
                </div>
            `;
            container.appendChild(block);
        }

        if (hasNotes) {
            const byTag = {};
            this.filtered.notes.forEach(n => {
                const tag = (n.tags && n.tags.length > 0) ? n.tags[0] : 'No Tags';
                if (!byTag[tag]) byTag[tag] = [];
                byTag[tag].push(n);
            });
            Object.keys(byTag).forEach(tag => {
                const block = document.createElement('div');
                block.className = 'archive-group-block';
                block.innerHTML = `
                    <div class="group-title">${this._esc(tag)}</div>
                    <div class="group-items">
                        ${byTag[tag].map(n => this._noteCard(n)).join('')}
                    </div>
                `;
                container.appendChild(block);
            });
        }
    },

    _noteProjectCard(project) {
        return `
            <div class="archive-smart-card note-project-card" data-pid="${project.project_id}">
                <div class="card-header">
                    <span class="card-title">${this._esc(project.name)}</span>
                    <span class="card-date">${this._dateStr(project.created_at)}</span>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn-restore" data-action="restore-note-project" data-pid="${project.project_id}">Restore</button>
                    <button type="button" class="btn-delete" data-action="delete-note-project" data-pid="${project.project_id}">Delete Permanently</button>
                </div>
            </div>
        `;
    },

    _noteCard(note) {
        const raw = (note.content || '').replace(/<[^>]+>/g, ' ').trim();
        const snippet = raw ? raw.substring(0, 100) + (raw.length > 100 ? '...' : '') : 'No content';
        const tags = (note.tags || []).slice(0, 4);
        return `
            <div class="archive-smart-card note-card" data-nid="${note.note_id}">
                <div class="card-header">
                    <span class="card-title">${this._esc(note.title || note.filename || 'Untitled')}</span>
                    <span class="card-date">${this._dateStr(note.last_updated)}</span>
                </div>
                <div class="card-snippet">${this._esc(snippet)}</div>
                ${tags.length ? `<div class="card-tags">${tags.map(t => `<span class="archive-tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
                <div class="card-actions">
                    <button type="button" class="btn-restore" data-action="restore-note" data-nid="${note.note_id}">Restore</button>
                    <button type="button" class="btn-delete" data-action="delete-note" data-nid="${note.note_id}">Delete Permanently</button>
                </div>
            </div>
        `;
    },

    _bindCardActions() {
        const main = document.getElementById('archive');
        if (!main) return;
        main.addEventListener('click', (e) => {
            const t = e.target.closest('[data-action]');
            if (!t) return;
            const action = t.dataset.action;
            const tid = t.dataset.tid;
            const nid = t.dataset.nid;
            const pid = t.dataset.pid;

            if (action === 'toggle' && tid) this.toggleTask(tid);
            if (action === 'restore-task' && tid) this.restoreTask(tid);
            if (action === 'delete-task' && tid) this.deleteTask(tid);
            if (action === 'restore-note' && nid) this.restoreNote(nid);
            if (action === 'delete-note' && nid) this.deleteNote(nid);
            if (action === 'restore-note-project' && pid) this.restoreNoteProject(pid);
            if (action === 'delete-note-project' && pid) this.deleteNoteProject(pid);
        });
    },

    async toggleTask(tid) {
        const task = this.data.tasks.find(t => t.task_id === tid);
        if (!task) return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            const r = await this._fetch(`${window.API_URL}/tasks/${tid}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            if (r.ok) {
                task.status = newStatus;
                const f = this.filtered.tasks.find(t => t.task_id === tid);
                if (f) f.status = newStatus;
                this.renderTasks();
            }
        } catch (e) { console.error(e); }
    },

    async restoreTask(tid) {
        try {
            const r = await this._fetch(`${window.API_URL}/tasks/${tid}`, {
                method: 'PUT',
                body: JSON.stringify({ isArchived: false })
            });
            if (r.ok) {
                this.data.tasks = this.data.tasks.filter(t => t.task_id !== tid);
                this.filtered.tasks = this.filtered.tasks.filter(t => t.task_id !== tid);
                this.render();
            }
        } catch (e) { console.error(e); }
    },

    async deleteTask(tid) {
        if (!confirm('Permanently delete this task?')) return;
        try {
            const r = await this._fetch(`${window.API_URL}/tasks/${tid}`, { method: 'DELETE' });
            if (r.ok) {
                this.data.tasks = this.data.tasks.filter(t => t.task_id !== tid);
                this.filtered.tasks = this.filtered.tasks.filter(t => t.task_id !== tid);
                this.render();
            }
        } catch (e) { console.error(e); }
    },

    async restoreNote(nid) {
        try {
            const r = await this._fetch(`${window.API_URL}/notes/${nid}/archive`, {
                method: 'PUT',
                body: JSON.stringify({ archived: false })
            });
            if (r.ok) {
                this.data.notes = this.data.notes.filter(n => n.note_id !== nid);
                this.filtered.notes = this.filtered.notes.filter(n => n.note_id !== nid);
                this.render();
            }
        } catch (e) { console.error(e); }
    },

    async deleteNote(nid) {
        if (!confirm('Permanently delete this note?')) return;
        try {
            const r = await this._fetch(`${window.API_URL}/notes/${nid}`, { method: 'DELETE' });
            if (r.ok) {
                this.data.notes = this.data.notes.filter(n => n.note_id !== nid);
                this.filtered.notes = this.filtered.notes.filter(n => n.note_id !== nid);
                this.render();
            }
        } catch (e) { console.error(e); }
    },

    async restoreNoteProject(pid) {
        try {
            const r = await this._fetch(`${window.API_URL}/writing/projects/${pid}/archive`, {
                method: 'PUT',
                body: JSON.stringify({ archived: false })
            });
            if (r.ok) {
                this.data.note_projects = this.data.note_projects.filter(p => p.project_id !== pid);
                this.filtered.note_projects = this.filtered.note_projects.filter(p => p.project_id !== pid);
                this.render();
            }
        } catch (e) { console.error(e); }
    },

    async deleteNoteProject(pid) {
        if (!confirm('Permanently delete this project and all its notes?')) return;
        try {
            const r = await this._fetch(`${window.API_URL}/writing/projects/${pid}`, { method: 'DELETE' });
            if (r.ok) {
                this.data.note_projects = this.data.note_projects.filter(p => p.project_id !== pid);
                this.filtered.note_projects = this.filtered.note_projects.filter(p => p.project_id !== pid);
                this.render();
            }
        } catch (e) { console.error(e); }
    }
};

// Auto-init if we are on the standalone archive page, 
// otherwise main.js calls Archive.init() when switching views.
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/archive' && !document.getElementById('app-container')) {
        Archive.init();
    }
});

window.Archive = Archive;
