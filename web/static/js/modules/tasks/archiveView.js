/**
 * tasks/views/archiveView.js — Archive View Renderer
 * Modern card layout for archived tasks & projects (isArchived: true)
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.archive = {
  render() {
    const container = document.getElementById('ts-archive-container');
    if (!container) return;

    const archivedTasks = TS.state.archivedTasks || [];
    const archivedProjects = TS.state.archivedProjects || [];
    const isEmpty = archivedTasks.length === 0 && archivedProjects.length === 0;

    if (isEmpty) {
      container.innerHTML = `
        <div class="ts-archive-empty ts-animate-in">
          <div class="ts-archive-empty-icon">📦</div>
          <h3>Your archive is empty</h3>
          <p>Completed or old tasks and projects can be moved here to keep your workspace clean.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    if (archivedProjects.length > 0) {
      const projSection = document.createElement('div');
      projSection.className = 'ts-archive-section ts-animate-in';
      projSection.innerHTML = `
        <h2 class="ts-archive-section-title">Archived Projects</h2>
        <div class="ts-archive-grid ts-archive-projects-grid">
          ${archivedProjects.map(p => this._projectCard(p)).join('')}
        </div>
      `;
      container.appendChild(projSection);
    }

    if (archivedTasks.length > 0) {
      const taskSection = document.createElement('div');
      taskSection.className = 'ts-archive-section ts-animate-in';
      taskSection.innerHTML = `
        <h2 class="ts-archive-section-title">Archived Tasks</h2>
        <div class="ts-archive-grid">
          ${archivedTasks.map(t => this._taskCard(t)).join('')}
        </div>
      `;
      container.appendChild(taskSection);
    }

    this._bindEvents(container);
  },

  _projectCard(project) {
    const taskCount = (TS.state.archivedTasks || []).filter(t => String(t.project_id) === String(project.project_id)).length;
    return `
      <div class="ts-archive-card ts-archive-project-card" data-project-id="${project.project_id}">
        <div class="ts-archive-card-header">
          <span class="ts-archive-dot" style="background:${project.color}"></span>
          <span class="ts-archive-project-name">${this._esc(project.name)}</span>
        </div>
        <div class="ts-archive-card-body">
          <span class="ts-archive-meta">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="ts-archive-actions">
          <button class="ts-btn ts-btn-outline ts-btn-sm" data-action="unarchive-project" data-project-id="${project.project_id}">Restore</button>
          <button class="ts-btn ts-btn-danger ts-btn-sm" data-action="delete-project-permanent" data-project-id="${project.project_id}">Delete</button>
        </div>
      </div>
    `;
  },

  _taskCard(task) {
    const allProjects = [...(TS.state.projects || []), ...(TS.state.archivedProjects || [])];
    const project = allProjects.find(p => String(p.project_id) === String(task.project_id)) || { name: 'No Project', color: '#666' };
    const dateStr = task.execution_day || task.end_date || '';

    return `
      <div class="ts-archive-card ts-archive-task-card" data-task-id="${task.task_id}">
        <div class="ts-archive-card-header">
          <span class="ts-archive-project" style="color:${project.color}">${this._esc(project.name)}</span>
          ${dateStr ? `<span class="ts-archive-date">📅 ${TS.utils.formatDate(dateStr)}</span>` : ''}
        </div>
        <div class="ts-archive-card-body">
          <div class="ts-archive-title">${this._esc(task.title)}</div>
          ${task.description ? `<div class="ts-archive-desc">${this._esc(task.description.substring(0, 80))}${task.description.length > 80 ? '…' : ''}</div>` : ''}
        </div>
        <div class="ts-archive-actions">
          <button class="ts-btn ts-btn-outline ts-btn-sm" data-action="unarchive" data-task-id="${task.task_id}">Restore</button>
          <button class="ts-btn ts-btn-danger ts-btn-sm" data-action="delete-permanent" data-task-id="${task.task_id}">Delete</button>
        </div>
      </div>
    `;
  },

  _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  _bindEvents(container) {
    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const tid = btn.dataset.taskId;
      const pid = btn.dataset.projectId;

      if (action === 'unarchive') {
        TS.taskMgr.unarchive(tid);
      } else if (action === 'delete-permanent') {
        TS.taskMgr.delete(tid);
      } else if (action === 'unarchive-project') {
        TS.taskMgr.unarchiveProject(pid);
      } else if (action === 'delete-project-permanent') {
        TS.taskMgr.deleteProject(pid);
      }
    });
  }
};
