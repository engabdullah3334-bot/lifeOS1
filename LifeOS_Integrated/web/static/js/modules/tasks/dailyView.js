/**
 * tasks/views/dailyView.js — Daily View Renderer (Week Strip + Task List)
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.daily = {
  init() {
    document.getElementById('ts-week-prev')?.addEventListener('click', () => {
      TS.state._weekOffset--;
      this.renderWeekStrip();
    });
    document.getElementById('ts-week-next')?.addEventListener('click', () => {
      TS.state._weekOffset++;
      this.renderWeekStrip();
    });
  },

  render() {
    this.renderWeekStrip();
    this.renderTaskList();
  },

  renderWeekStrip() {
    const grid = document.getElementById('ts-week-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Calculate start of week (Monday) with offset
    const today = new Date();
    const base  = new Date(today);
    const dayOfWeek = today.getDay(); // 0=Sun
    const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    base.setDate(today.getDate() + diffToMon + (TS.state._weekOffset * 7));

    const selStr = TS.utils.toDateStr(TS.state.selectedDate);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dStr = TS.utils.toDateStr(d);

      const isToday    = dStr === TS.utils.toDateStr(today);
      const isSelected = dStr === selStr;
      const dayTasks   = TS.taskMgr.getForDate(d);

      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

      const el = document.createElement('div');
      el.className = `ts-week-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
      el.innerHTML = `
        <span class="ts-wday-name">${dayNames[d.getDay()]}</span>
        <span class="ts-wday-num">${d.getDate()}</span>
        <div class="ts-wday-dots">
          ${dayTasks.slice(0,3).map(() => '<span class="ts-wday-dot"></span>').join('')}
        </div>
      `;
      el.addEventListener('click', () => {
        TS.state.selectedDate = d;
        this.renderWeekStrip();
        this.renderTaskList();
      });
      grid.appendChild(el);
    }
  },

  renderTaskList() {
    const list      = document.getElementById('ts-daily-list');
    const empty     = document.getElementById('ts-daily-empty');
    const titleEl   = document.getElementById('ts-daily-title');
    const countEl   = document.getElementById('ts-daily-count');
    if (!list) return;

    const d     = TS.state.selectedDate || new Date();
    const tasks = TS.taskMgr.getForDate(d);

    // Update header
    const today = new Date();
    const isToday = TS.utils.toDateStr(d) === TS.utils.toDateStr(today);
    if (titleEl) titleEl.textContent = isToday
      ? "Today's Tasks"
      : d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    if (countEl) countEl.textContent = tasks.length;

    list.innerHTML  = '';
    if (tasks.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tasks.forEach(task => {
      const isDone = task.status === 'completed';
      const proj   = TS.state.projects.find(p => p.project_id === task.project_id);

      const el = document.createElement('div');
      el.className = `ts-task-card p-${task.priority} ${isDone ? 'ts-done' : ''}`;
      el.dataset.taskId = task.task_id;
      el.innerHTML = `
        <div class="ts-check ${isDone ? 'checked' : ''}"
             data-action="complete" data-task-id="${task.task_id}">
          ${isDone ? '✓' : ''}
        </div>
        <div class="ts-task-body">
          <div class="ts-task-title">${this._esc(task.title)}</div>
          ${task.description
            ? `<div class="ts-task-desc">${this._esc(task.description.substring(0,60))}${task.description.length>60?'…':''}</div>`
            : ''}
          <div class="ts-task-meta">
            <span class="ts-priority-badge p-${task.priority}">${TS.utils.priorityLabel(task.priority)}</span>
            ${proj ? `<span class="ts-badge" style="border-left:3px solid ${proj.color};padding-left:6px">${proj.icon} ${this._esc(proj.name)}</span>` : ''}
          </div>
        </div>
        <div class="ts-task-actions">
          <button class="ts-task-action-btn" data-action="edit-task"   data-task-id="${task.task_id}" title="Edit">✏️</button>
          <button class="ts-task-action-btn delete" data-action="delete-task" data-task-id="${task.task_id}" title="Delete">🗑️</button>
        </div>
      `;

      el.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (btn.dataset.action === 'complete')    TS.taskMgr.complete(btn.dataset.taskId);
          if (btn.dataset.action === 'edit-task') {
            const t = TS.state.tasks.find(t => String(t.task_id) === String(btn.dataset.taskId));
            if (t) TS.modal.openTask(t);
          }
          if (btn.dataset.action === 'delete-task') TS.taskMgr.delete(btn.dataset.taskId);
        });
      });

      // Click card to edit
      el.addEventListener('click', e => {
        if (!e.target.closest('[data-action]')) {
          const t = TS.state.tasks.find(t => String(t.task_id) === String(task.task_id));
          if (t) TS.modal.openTask(t);
        }
      });

      list.appendChild(el);
    });
  },

  _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
