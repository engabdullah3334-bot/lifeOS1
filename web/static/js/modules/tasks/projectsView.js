/**
 * tasks/views/projectsView.js — Projects View Renderer
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.projects = {
  // Tracks collapsed state per project
  _collapsed: {},

  render() {
    const container = document.getElementById('ts-projects-container');
    const empty     = document.getElementById('ts-projects-empty');
    if (!container) return;

    container.innerHTML = '';

    const projects = TS.state.projects;

    if (!Array.isArray(projects) || projects.length === 0) {
      container.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    container.style.display = 'flex';
    if (empty) empty.style.display = 'none';

    projects.forEach(project => {
      const tasks  = TS.taskMgr.getForProject(project.project_id);
      const total  = tasks.length;
      const done   = tasks.filter(t => t.status === 'completed').length;
      const pct    = total ? Math.round(done / total * 100) : 0;
      const isCollapsed = this._collapsed[project.project_id] || false;

      const card = document.createElement('div');
      card.className = `ts-project-card${isCollapsed ? ' collapsed' : ''}`;
      card.dataset.projectId = project.project_id;

      card.innerHTML = `
        <div class="ts-project-header">
          <div class="ts-project-color-dot" style="background:${project.color};box-shadow:0 0 8px ${project.color}55"></div>
          <span class="ts-project-icon">${project.icon}</span>
          <span class="ts-project-name">${this._esc(project.name)}</span>
          <div class="ts-project-meta">
            <div class="ts-project-progress-wrap">
              <div class="ts-progress-bar">
                <div class="ts-progress-fill" style="width:${pct}%;background:${project.color}"></div>
              </div>
              <span class="ts-progress-text">${pct}%</span>
            </div>
            <span class="ts-badge">${total} task${total !== 1 ? 's' : ''}</span>
            <div class="ts-project-actions">
              <button class="ts-icon-btn ts-btn-sm" data-action="add-task" title="Add Task">＋</button>
              <button class="ts-icon-btn ts-btn-sm" data-action="edit" title="Edit Project">✏️</button>
              ${['general','archive'].includes(project.project_id) ? '' : `<button class="ts-icon-btn ts-btn-sm" data-action="archive-project" title="Archive Project">📦</button>
              <button class="ts-icon-btn ts-btn-sm" data-action="delete" title="Delete Project">🗑️</button>`}
            </div>
            <span class="ts-project-chevron">▾</span>
          </div>
        </div>
        <div class="ts-project-body">
          <div class="ts-project-task-list" data-project-id="${project.project_id}">
            ${tasks.length === 0
              ? `<div class="ts-project-no-tasks">No tasks yet — add one below</div>`
              : tasks.map(t => this._taskCard(t)).join('')}
          </div>
          <div class="ts-project-quick-add">
            <input
              class="ts-quick-input"
              placeholder="Quick add task… (press Enter)"
              data-project-id="${project.project_id}"
            >
            <button class="ts-btn ts-btn-outline ts-btn-sm" data-action="quick-add" data-project-id="${project.project_id}">Add</button>
          </div>
        </div>
      `;

      this._bindCardEvents(card, project);
      container.appendChild(card);
    });

    // Rebind drag & drop after render
    TS.dnd.bindAll();
  },

  _taskCard(task) {
    const isDone     = task.status === 'completed';
    const isArchived = task.status === 'archived';
    const dateStr    = task.execution_day || task.end_date || task.start_date;
    const tags       = (task.tags || []).slice(0, 3);

    return `
      <div class="ts-task-card p-${task.priority} ${isDone ? 'ts-done' : ''} ${isArchived ? 'ts-archived' : ''}"
           data-task-id="${task.task_id}">
        <span class="ts-drag-handle" title="Drag to reorder">⠿</span>
        <div class="ts-check ${isDone ? 'checked' : ''}"
             data-action="complete" data-task-id="${task.task_id}"
             title="${isDone ? 'Mark incomplete' : 'Mark complete'}">
          ${isDone ? '✓' : ''}
        </div>
        <div class="ts-task-body">
          <div class="ts-task-title">${this._esc(task.title)}</div>
          ${task.description
            ? `<div class="ts-task-desc">${this._esc(task.description.substring(0,70))}${task.description.length > 70 ? '…' : ''}</div>`
            : ''}
          ${tags.length
            ? `<div class="ts-task-tags">${tags.map(t => `<span class="ts-tag">${this._esc(t)}</span>`).join('')}</div>`
            : ''}
          <div class="ts-task-meta">
            <span class="ts-priority-badge p-${task.priority}">${TS.utils.priorityLabel(task.priority)}</span>
            <span class="ts-status-badge s-${task.status}">${task.status.replace('_',' ')}</span>
            ${dateStr ? `<span class="ts-date-badge">📅 ${TS.utils.formatDate(dateStr)}</span>` : ''}
          </div>
        </div>
        <div class="ts-task-actions">
          <button class="ts-task-action-btn" data-action="edit-task" data-task-id="${task.task_id}" title="Edit">✏️</button>
          <button class="ts-task-action-btn" data-action="archive-task" data-task-id="${task.task_id}" title="Archive">📦</button>
          <button class="ts-task-action-btn delete" data-action="delete-task" data-task-id="${task.task_id}" title="Delete">🗑️</button>
        </div>
      </div>`;
  },

  _bindCardEvents(card, project) {
    // 1. Unified Click Listener on the whole Project Card
    card.addEventListener('click', e => {
      // Toggle collapse on header click
      if (e.target.closest('.ts-project-header') && !e.target.closest('[data-action]')) {
        this._collapsed[project.project_id] = !this._collapsed[project.project_id];
        card.classList.toggle('collapsed', this._collapsed[project.project_id]);
        TS.dnd.bindAll();
        return;
      }

      // Handle Action Buttons
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        e.stopPropagation();
        const action = actionEl.dataset.action;
        const pid    = actionEl.dataset.projectId || project.project_id;
        const tid    = actionEl.dataset.taskId;

        if (action === 'add-task')  TS.modal.openTask(null, pid);
        if (action === 'edit')      TS.modal.openProject(project);
        if (action === 'archive-project') TS.taskMgr.archiveProject(pid);
        if (action === 'delete')    TS.taskMgr.deleteProject(pid);
        if (action === 'complete')  TS.taskMgr.complete(tid);
        if (action === 'edit-task') {
          const task = TS.state.tasks.find(t => String(t.task_id) === String(tid));
          if (task) TS.modal.openTask(task);
        }
        if (action === 'archive-task') TS.taskMgr.archive(tid);
        if (action === 'delete-task')  TS.taskMgr.delete(tid);
        if (action === 'quick-add') {
          const input = card.querySelector(`.ts-quick-input[data-project-id="${pid}"]`);
          if (input) this._quickAdd(input, pid);
        }
        return;
      }

      // Click task card body to edit
      const taskCard = e.target.closest('.ts-task-card');
      if (taskCard) {
        const taskId = taskCard.dataset.taskId;
        const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
        if (task) TS.modal.openTask(task);
      }
    });

    // 2. Quick-add on Enter
    card.querySelectorAll('.ts-quick-input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._quickAdd(input, project.project_id);
      });
    });
  },

  async _quickAdd(input, projectId) {
    const title = input.value.trim();
    if (!title) return;
    try {
      await TS.api.createTask({ title, project_id: projectId });
      input.value = '';
      TS.notify.success('Task added');
      await TS.core.refresh();
    } catch(e) {
      TS.notify.error('Failed to add task');
    }
  },

  // Update only headers (task counts & progress) without full re-render
  updateProjectHeaders() {
    TS.state.projects.forEach(project => {
      const card  = document.querySelector(`.ts-project-card[data-project-id="${project.project_id}"]`);
      if (!card) return;
      const tasks = TS.taskMgr.getForProject(project.project_id);
      const total = tasks.length;
      const done  = tasks.filter(t => t.status === 'completed').length;
      const pct   = total ? Math.round(done / total * 100) : 0;

      const fill  = card.querySelector('.ts-progress-fill');
      const pctEl = card.querySelector('.ts-progress-text');
      const badge = card.querySelector('.ts-badge');
      if (fill)  { fill.style.width = `${pct}%`; fill.style.background = project.color; }
      if (pctEl) pctEl.textContent = `${pct}%`;
      if (badge) badge.textContent = `${total} task${total !== 1 ? 's' : ''}`;
    });
  },

  _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
