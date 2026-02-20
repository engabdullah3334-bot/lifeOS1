/**
 * tasks/modal.js — Task & Project Modal Logic
 */

var TS = window.TS = window.TS || {};

TS.modal = {
  // ── Close helpers ─────────────────────────────────────────
  init() {
    // Close buttons with data-close attr
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.close;
        this.close(id);
      });
    });
    // Click overlay to close
    document.querySelectorAll('.ts-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.close(overlay.id);
      });
    });
    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.ts-modal-overlay').forEach(el => {
          if (el.style.display !== 'none') this.close(el.id);
        });
      }
    });

    // Task modal save
    document.getElementById('ts-task-save-btn')?.addEventListener('click', () => this.saveTask());

    // Project modal save
    document.getElementById('ts-proj-save-btn')?.addEventListener('click', () => this.saveProject());

    // Color picker
    document.getElementById('ts-proj-color-picker')?.addEventListener('click', e => {
      const swatch = e.target.closest('.ts-color-swatch');
      if (!swatch) return;
      document.querySelectorAll('.ts-color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      document.getElementById('ts-proj-color').value = swatch.dataset.color;
    });

    // Stats button
    document.getElementById('ts-stats-btn')?.addEventListener('click', () => this.openStats());

    // Toolbar + empty state buttons
    document.getElementById('ts-new-task-btn')?.addEventListener('click', () => this.openTask());
    document.getElementById('ts-new-project-btn')?.addEventListener('click', () => this.openProject());
    document.getElementById('ts-empty-add-project')?.addEventListener('click', () => this.openProject());
  },

  open(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  // ── Task Modal ────────────────────────────────────────────
  openTask(task = null, defaultProjectId = null) {
    const isEdit = !!task;
    document.getElementById('ts-task-modal-title').textContent = isEdit ? 'Edit Task' : 'New Task';
    document.getElementById('ts-task-save-btn').textContent    = isEdit ? 'Save Changes' : 'Create Task';
    document.getElementById('ts-task-editing-id').value        = task ? task.task_id : '';

    // Populate project dropdown
    const projSelect = document.getElementById('ts-task-project');
    projSelect.innerHTML = '';
    TS.state.projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.project_id;
      opt.textContent = `${p.icon} ${p.name}`;
      projSelect.appendChild(opt);
    });

    // Fill fields
    const get = id => document.getElementById(id);
    get('ts-task-title').value      = task?.title       || '';
    get('ts-task-desc').value       = task?.description || '';
    get('ts-task-project').value    = task?.project_id  || defaultProjectId || (TS.state.projects[0]?.project_id || '');
    get('ts-task-priority').value   = task?.priority    || 'medium';
    get('ts-task-status').value     = task?.status      || 'pending';
    get('ts-task-start').value      = task?.start_date  || '';
    get('ts-task-end').value        = task?.end_date    || '';
    get('ts-task-exec-day').value   = task?.execution_day || '';
    get('ts-task-reminder').value   = task?.reminder    || '';
    get('ts-task-tags').value       = (task?.tags || []).join(', ');
    get('ts-task-notes').value      = task?.notes       || '';

    this.open('ts-task-modal');
    get('ts-task-title').focus();
  },

  async saveTask() {
    const get = id => document.getElementById(id);
    const title = get('ts-task-title').value.trim();
    if (!title) {
      get('ts-task-title').classList.add('ts-input-error');
      setTimeout(() => get('ts-task-title').classList.remove('ts-input-error'), 2000);
      TS.notify.error('Title is required');
      return;
    }

    const tagsRaw = get('ts-task-tags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      title,
      description:   get('ts-task-desc').value.trim(),
      project_id:    get('ts-task-project').value,
      priority:      get('ts-task-priority').value,
      status:        get('ts-task-status').value,
      start_date:    get('ts-task-start').value    || null,
      end_date:      get('ts-task-end').value      || null,
      execution_day: get('ts-task-exec-day').value || null,
      reminder:      get('ts-task-reminder').value || null,
      tags,
      notes:         get('ts-task-notes').value.trim(),
    };

    const editingId = get('ts-task-editing-id').value;

    try {
      if (editingId) {
        await TS.api.updateTask(editingId, payload);
        TS.notify.success('Task updated');
      } else {
        await TS.api.createTask(payload);
        TS.notify.success('Task created');
      }
      this.close('ts-task-modal');
      TS.core.refresh();
    } catch(e) {
      TS.notify.error('Failed to save task');
      console.error(e);
    }
  },

  // ── Project Modal ─────────────────────────────────────────
  openProject(project = null) {
    const isEdit = !!project;
    document.getElementById('ts-project-modal-title').textContent = isEdit ? 'Edit Project' : 'New Project';
    document.getElementById('ts-proj-save-btn').textContent       = isEdit ? 'Save Changes' : 'Create Project';
    document.getElementById('ts-proj-editing-id').value           = project?.project_id || '';

    const get = id => document.getElementById(id);
    get('ts-proj-name').value = project?.name        || '';
    get('ts-proj-icon').value = project?.icon        || '📁';
    get('ts-proj-desc').value = project?.description || '';

    const color = project?.color || '#6366f1';
    get('ts-proj-color').value = color;
    document.querySelectorAll('.ts-color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });

    this.open('ts-project-modal');
    get('ts-proj-name').focus();
  },

  async saveProject() {
    const get = id => document.getElementById(id);
    const name = get('ts-proj-name').value.trim();
    if (!name) {
      TS.notify.error('Project name is required');
      return;
    }

    const payload = {
      name,
      icon:        get('ts-proj-icon').value.trim() || '📁',
      color:       get('ts-proj-color').value || '#6366f1',
      description: get('ts-proj-desc').value.trim(),
    };

    const editingId = get('ts-proj-editing-id').value;

    try {
      if (editingId) {
        await TS.api.updateProject(editingId, payload);
        TS.notify.success('Project updated');
      } else {
        await TS.api.createProject(payload);
        TS.notify.success('Project created');
      }
      this.close('ts-project-modal');
      TS.core.refresh();
    } catch(e) {
      TS.notify.error('Failed to save project');
      console.error(e);
    }
  },

  // ── Confirm Delete Modal ──────────────────────────────────
  openConfirm(title, msg, onConfirm) {
    document.getElementById('ts-confirm-title').textContent = title;
    document.getElementById('ts-confirm-msg').textContent   = msg;

    const btn = document.getElementById('ts-confirm-ok-btn');
    const newBtn = btn.cloneNode(true); // Remove old listeners
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      onConfirm();
      this.close('ts-confirm-modal');
    });

    this.open('ts-confirm-modal');
  },

  // ── Stats Panel ───────────────────────────────────────────
  openStats() {
    const tasks = TS.state.tasks;
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const pct     = total ? Math.round(done / total * 100) : 0;

    document.getElementById('ts-stat-total').textContent      = total;
    document.getElementById('ts-stat-done').textContent       = done;
    document.getElementById('ts-stat-pending').textContent    = pending;
    document.getElementById('ts-stat-progress-pct').textContent = `${pct}%`;
    document.getElementById('ts-overall-fill').style.width    = `${pct}%`;

    // Priority breakdown
    const container = document.getElementById('ts-priority-breakdown');
    container.innerHTML = '';
    const priorities = ['critical','high','medium','low'];
    const colors     = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#3b82f6' };
    priorities.forEach(p => {
      const count = tasks.filter(t => t.priority === p).length;
      const barPct = total ? Math.round(count / total * 100) : 0;
      container.innerHTML += `
        <div class="ts-priority-row">
          <span class="ts-priority-row-label">${p}</span>
          <div class="ts-progress-bar">
            <div class="ts-progress-fill" style="width:${barPct}%;background:${colors[p]}"></div>
          </div>
          <span class="ts-priority-row-count">${count}</span>
        </div>`;
    });

    this.open('ts-stats-modal');
  },
};
