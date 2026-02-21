/**
 * tasks/views/archiveView.js — Archive View Renderer
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.archive = {
  render() {
    const container = document.getElementById('ts-archive-container');
    if (!container) return;

    container.innerHTML = '';

    // Get only archived tasks
    const archivedTasks = TS.state.tasks.filter(t => t.status === 'archived');
    
    if (archivedTasks.length === 0) {
      container.innerHTML = `
        <div class="ts-empty">
          <div class="ts-empty-icon">📦</div>
          <h3>Your archive is empty</h3>
          <p>Completed or old tasks can be moved here to keep your workspace clean.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'ts-archive-grid';
    grid.innerHTML = archivedTasks.map(t => this._archiveCard(t)).join('');

    container.appendChild(grid);
    this._bindEvents(container);
  },

  _archiveCard(task) {
    const project = TS.state.projects.find(p => p.project_id === task.project_id) || { name: 'No Project', color: '#666' };
    const dateStr = task.execution_day || task.end_date || '';

    return `
      <div class="ts-archive-card" data-task-id="${task.task_id}">
        <div class="ts-archive-card-header">
           <span class="ts-archive-project" style="color: ${project.color}">${project.name}</span>
           <span class="ts-archive-date">${dateStr ? '📅 ' + TS.utils.formatDate(dateStr) : ''}</span>
        </div>
        <div class="ts-archive-card-body">
          <div class="ts-archive-title">${task.title}</div>
          <div class="ts-archive-desc">${task.description || ''}</div>
        </div>
        <div class="ts-archive-actions">
          <button class="ts-btn ts-btn-outline ts-btn-sm" data-action="unarchive" data-task-id="${task.task_id}">Restore</button>
          <button class="ts-btn ts-btn-danger ts-btn-sm" data-action="delete-permanent" data-task-id="${task.task_id}">Delete</button>
        </div>
      </div>
    `;
  },

  _bindEvents(container) {
    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const tid    = btn.dataset.taskId;

      if (action === 'unarchive') {
        TS.taskMgr.unarchive(tid);
      } else if (action === 'delete-permanent') {
        TS.taskMgr.delete(tid); // taskMgr.delete has a confirmation modal
      }
    });
  }
};
