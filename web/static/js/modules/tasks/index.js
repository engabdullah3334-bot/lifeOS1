/**
 * tasks/index.js — Task System Entry Point
 * Initializes all modules, wires toolbar events, and bootstraps the app.
 * Exposes: window.TS.core
 */
console.log("Executing tasks/index.js script body");

var TS = window.TS = window.TS || {};

TS.core = {
  async init() {
    // 1. Load saved preferences
    try { TS.state.load(); } catch(e) { console.error(e); }

    // 2. Apply theme
    TS.theme.init();

    // 3. Init modals & close handlers
    TS.modal.init();

    // 4. Init view-specific listeners
    TS.views.daily.init();
    TS.views.monthly.init();

    // 5. Wire toolbar controls
    this._bindToolbar();

    // 6. Fetch data and render
    await this.loadData();
    this.switchView(TS.state.currentView, true);
    this._updateDashboard();

    // 7. Check reminders
    try { TS.notify.checkReminders(); } catch(e) { console.error(e); }
  },

  // ── Data Loading ─────────────────────────────────────────
  async loadData() {
    try {
      const [projects, tasks] = await Promise.all([
        TS.api.getProjects(),
        TS.api.getTasks({
          sort:   TS.state.sortBy,
          status: TS.state.filterStatus,
          search: TS.state.searchQuery,
        }),
      ]);
      TS.state.projects = projects;
      TS.state.tasks    = tasks;

      // Keep legacy window.state.tasks in sync for dashboard widget
      if (window.state) window.state.tasks = tasks;
    } catch(e) {
      console.error('[TS] Failed to load data:', e);
      TS.notify.error('Could not load tasks. Is the server running?');
    }
  },

  // ── Refresh — reload data & re-render current view ───────
  async refresh() {
    await this.loadData();
    this._renderCurrentView();
    this._updateDashboard();
  },

  // ── View Switching ────────────────────────────────────────
  switchView(view, initial = false) {
    if (!['projects','daily','monthly'].includes(view)) view = 'projects';

    TS.state.currentView = view;
    TS.state.save();

    // Hide all panels
    ['projects','daily','monthly'].forEach(v => {
      const panel = document.getElementById(`ts-panel-${v}`);
      if (panel) panel.style.display = 'none';
    });

    // Show target panel
    const target = document.getElementById(`ts-panel-${view}`);
    if (target) target.style.display = 'block';

    // Update tab active state
    document.querySelectorAll('.ts-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === view);
    });

    if (!initial) this._renderCurrentView();
    else          this._renderCurrentView();
  },

  _renderCurrentView() {
    const v = TS.state.currentView;
    if (v === 'projects') TS.views.projects.render();
    if (v === 'daily')    TS.views.daily.render();
    if (v === 'monthly')  TS.views.monthly.render();
  },

  // ── Toolbar Wiring ────────────────────────────────────────
  _bindToolbar() {
    // View tabs
    document.getElementById('ts-view-tabs')?.addEventListener('click', e => {
      const tab = e.target.closest('.ts-tab');
      if (tab?.dataset.view) this.switchView(tab.dataset.view);
    });

    // Search (debounced)
    let _searchTimer;
    document.getElementById('ts-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(async () => {
        TS.state.searchQuery = e.target.value.trim();
        await this.refresh();
      }, 300);
    });

    // Sort
    document.getElementById('ts-sort')?.addEventListener('change', async e => {
      TS.state.sortBy = e.target.value;
      TS.state.save();
      await this.refresh();
    });

    // Filter by status
    document.getElementById('ts-filter-status')?.addEventListener('change', async e => {
      TS.state.filterStatus = e.target.value;
      await this.refresh();
    });

    // Restore saved sort/filter selections in UI
    const sortEl    = document.getElementById('ts-sort');
    const filterEl  = document.getElementById('ts-filter-status');
    if (sortEl)   sortEl.value   = TS.state.sortBy;
    if (filterEl) filterEl.value = TS.state.filterStatus || '';
  },

  // ── Dashboard Update ──────────────────────────────────────
  _updateDashboard() {
    // Task count badge (legacy dashboard)
    const taskCount = TS.state.tasks.filter(t =>
      t.status !== 'completed' && t.status !== 'archived'
    ).length;
    const el = document.getElementById('task-count');
    if (el) el.textContent = `${taskCount} Active`;

    // Dashboard mini-list — Focus Tasks: highest priority + due today
    const dashList = document.getElementById('dashboard-tasks-list');
    if (dashList) {
      dashList.innerHTML = '';
      const todayStr = TS.utils.toDateStr(new Date());
      const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

      const focusTasks = TS.state.tasks
        .filter(t => t.status !== 'completed' && t.status !== 'archived')
        .filter(t => {
          const due = t.execution_day || t.end_date;
          return due && due === todayStr;
        })
        .sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0))
        .slice(0, 6);

      if (focusTasks.length === 0) {
        dashList.innerHTML = '<p class="dash-empty-msg">No tasks due today. Add one or focus on what matters.</p>';
        return;
      }

      focusTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `mini-task-item p-${task.priority}`;
        item.innerHTML = `
          <div class="mini-task-check" onclick="TS.taskMgr.complete('${task.task_id}'); window.updateDashboard?.()"></div>
          <span class="mini-task-title">${task.title}</span>
          <span class="mini-task-priority">${TS.utils.priorityLabel(task.priority)}</span>
        `;
        dashList.appendChild(item);
      });
    }

    // Productivity bar
    const total     = TS.state.tasks.length;
    const completed = TS.state.tasks.filter(t => t.status === 'completed').length;
    const pct       = total ? Math.round(completed / total * 100) : 0;
    const fill      = document.getElementById('productivity-fill');
    const text      = document.getElementById('productivity-text');
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}% Daily Goal`;

    // Update stats header
    if (window.updateDashboardStats) window.updateDashboardStats();
  },
};

// ── Boot on DOMContentLoaded ──────────────────────────────────
// (called from main.js after the section is loaded)
window.initTaskSystem = async () => {
    console.log("index.js: initTaskSystem called");
    try {
        await TS.core.init();
    } catch(e) {
        console.error("TASK SYSTEM INIT ERROR:", e);
        alert("INIT ERROR: " + e.message + "\n" + e.stack);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initTaskSystem === 'function') {
        window.initTaskSystem();
    }
});

// Legacy compatibility — other parts of app can still call these
window.fetchTasks    = () => TS.core.refresh();
window.renderTasks   = () => TS.core._renderCurrentView();
window.updateDashboard = () => TS.core._updateDashboard();
