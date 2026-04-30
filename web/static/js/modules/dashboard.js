/**
 * dashboard.js — LifeOS Dashboard v2
 */
(function () {
  'use strict';

  const PRIORITY_COLOR = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#3b82f6' };

  function getGreeting() {
    const h = new Date().getHours();
    const name = window.__lifeosUser?.username || '';
    const s = name ? `، ${name}` : '';
    if (h < 5)  return `وقت النوم${s} 🌙`;
    if (h < 12) return `صباح الخير${s} 🌅`;
    if (h < 17) return `مساء النشاط${s} ☀️`;
    if (h < 21) return `مساء الخير${s} 🌆`;
    return `أوشك اليوم على الانتهاء${s} 🌙`;
  }

  function formatDateAr(dateStr) {
    if (!dateStr) return '';
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long' });
  }

  function renderAxes(projects, byProject) {
    const grid = document.getElementById('dash-axes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    projects.forEach(proj => {
      const tasks = byProject[proj.project_id] || [];
      const done  = tasks.filter(t => t.status === 'completed').length;
      const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;
      const range = proj.description ? proj.description : 'مشروع';
      const card  = document.createElement('div');
      card.className = 'dash-axis-card';
      card.dataset.id = proj.project_id;
      card.style.setProperty('--axis-color', proj.color || '#6366f1');
      card.innerHTML = `
        <div class="dash-axis-top">
          <span class="dash-axis-icon">${proj.icon || '📁'}</span>
          <div class="dash-axis-info">
            <span class="dash-axis-label">${proj.name}</span>
            <span class="dash-axis-range">${range}</span>
          </div>
          <span class="dash-axis-pct${pct>=100?' complete':''}">${tasks.length ? pct+'%' : '—'}</span>
        </div>
        <div class="dash-axis-bar-track">
          <div class="dash-axis-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="dash-axis-preview">
          ${tasks.length === 0
            ? '<span class="dash-axis-empty">لا توجد مهام</span>'
            : tasks.slice(0,3).map(t =>
                `<div class="dash-axis-task${t.status==='completed'?' done':''}">
                  <span class="dash-axis-dot" style="background:${PRIORITY_COLOR[t.priority]||'#6366f1'}"></span>
                  <span>${t.title}</span>
                </div>`).join('')}
          ${tasks.length > 3 ? `<span class="dash-axis-more">+${tasks.length-3} أخرى</span>` : ''}
        </div>`;
      
      let isDragging = false;
      card.addEventListener('mousedown', () => isDragging = false);
      card.addEventListener('mousemove', () => isDragging = true);
      card.addEventListener('click', (e) => {
          if (isDragging) {
              e.preventDefault();
              return;
          }
          window.loadView?.('tasks');
      });
      grid.appendChild(card);
    });
  }

  function renderTodayTasks(tasks) {
    const el = document.getElementById('dashboard-tasks-list');
    if (!el) return;
    if (!tasks?.length) { el.innerHTML = '<p class="dash-empty">لا توجد مهام لليوم 🎉</p>'; return; }
    const sorted = [...tasks].sort((a,b) => a.status==='completed' ? 1 : b.status==='completed' ? -1 : 0);
    el.innerHTML = sorted.slice(0,8).map(t => `
      <div class="dash-task-row${t.status==='completed'?' done':''}"
           style="--p-color:${PRIORITY_COLOR[t.priority]||'#6366f1'}"
           data-id="${t.task_id}" data-date="${t.execution_day||''}">
        <button class="dash-task-check" title="تبديل الحالة">${t.status==='completed'?'✓':''}</button>
        <span class="dash-task-name">${t.title}</span>
        ${t.estimated_hours ? `<span class="dash-task-time">${t.estimated_hours}h</span>` : ''}
      </div>`).join('');
    el.querySelectorAll('.dash-task-row').forEach(row => {
      row.querySelector('.dash-task-check')?.addEventListener('click', e => {
        e.stopPropagation();
        toggleTask(row.dataset.id, row.dataset.date, row.classList.contains('done'));
      });
    });
  }

  async function toggleTask(id, date, isDone) {
    const token = localStorage.getItem('lifeos_token');
    if (!token) return;
    try {
      await fetch(`${window.API_URL}/tasks/${date ? id+'|'+date : id}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ status: isDone ? 'pending' : 'completed' }),
      });
      loadDashboard();
    } catch(e) { console.error('Toggle failed', e); }
  }

  function updateStats(s) {
    const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('dash-stat-done',    s.done    ?? 0);
    set('dash-stat-pending', s.pending ?? 0);
    set('dash-stat-pct',    (s.pct    ?? 0) + '%');
    const fill = document.getElementById('dash-progress-fill');
    if (fill) requestAnimationFrame(() => setTimeout(() => { fill.style.width = (s.pct??0)+'%'; }, 80));
  }

  async function loadDashboard() {
    const token = localStorage.getItem('lifeos_token');
    if (!token) return;
    const greetEl = document.getElementById('dashboard-greeting');
    if (greetEl) greetEl.textContent = getGreeting();
    try {
      const res  = await fetch(`${window.API_URL}/dashboard`, { headers:{'Authorization':`Bearer ${token}`} });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const dateEl = document.getElementById('dash-date-label');
      if (dateEl) dateEl.textContent = formatDateAr(data.date);
      updateStats(data.stats || {});
      renderAxes(data.axes || [], data.tasks_by_axis || {});
      renderTodayTasks(data.today_tasks || []);
    } catch(e) { console.error('Dashboard load error', e); }
  }

  function setupQuickNote() {
    const area   = document.getElementById('quick-note-area');
    const btn    = document.getElementById('save-quick-note');
    const msg    = document.getElementById('dash-note-saved');
    if (!area || !btn) return;
    if (msg) msg.style.opacity = '0';
    area.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') save(); });
    btn.addEventListener('click', save);
    async function save() {
      const content = area.value.trim();
      if (!content) return;
      const token = localStorage.getItem('lifeos_token');
      if (!token) return;
      try {
        await fetch(`${window.API_URL}/notes/quick`, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
          body: JSON.stringify({ content }),
        });
        area.value = '';
        if (msg) { msg.style.opacity='1'; setTimeout(() => { msg.style.opacity='0'; }, 2000); }
      } catch(e) { console.error('Quick note error', e); }
    }
  }

  function setupDashboardSorting() {
    if (typeof Sortable === 'undefined') return;

    // 1. Reorder Projects
    const axesGrid = document.getElementById('dash-axes-grid');
    if (axesGrid) {
        Sortable.create(axesGrid, {
            animation: 180,
            ghostClass: 'sortable-ghost',
            filter: 'button, input, textarea',
            preventOnFilter: false,
            onEnd: async () => {
                const orderedIds = [...axesGrid.querySelectorAll('.dash-axis-card')]
                    .map(el => el.dataset.id)
                    .filter(id => id); // filter out skeletons if any
                
                if (orderedIds.length === 0) return;
                
                const token = localStorage.getItem('lifeos_token');
                if (!token) return;
                try {
                    await fetch(`${window.API_URL}/projects/reorder`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                        body: JSON.stringify({ ordered_ids: orderedIds })
                    });
                } catch(e) { console.error('Project reorder failed', e); }
            }
        });
    }

    // Generic helper for localStorage based sorting
    const setupLocalSorting = (containerId, childSelector, idAttr, storageKey) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Restore order first
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
            try {
                const orderArr = JSON.parse(savedOrder);
                const items = Array.from(container.querySelectorAll(childSelector));
                orderArr.forEach(id => {
                    const item = items.find(el => el.getAttribute(idAttr) === id);
                    if (item) container.appendChild(item);
                });
            } catch(e) { console.error('Failed to restore order for', containerId); }
        }

        // Init Sortable
        Sortable.create(container, {
            animation: 180,
            ghostClass: 'sortable-ghost',
            filter: containerId === 'dashboard' ? '.dash-axis-card, .dash-widget, .dash-action-btn, button, input, textarea' : 'button, input, textarea',
            preventOnFilter: false,
            onEnd: () => {
                const newOrder = [...container.querySelectorAll(childSelector)].map(el => el.getAttribute(idAttr));
                localStorage.setItem(storageKey, JSON.stringify(newOrder));
            }
        });
    };

    // 2. Reorder Bottom Grid Widgets
    setupLocalSorting('dash-bottom-grid', '.dash-widget', 'id', 'lifeos_dash_widgets_order');

    // 3. Reorder Quick Actions
    setupLocalSorting('dash-quick-actions', '.dash-action-btn', 'id', 'lifeos_dash_actions_order');

    // 4. Reorder Main Dashboard Sections
    setupLocalSorting('dashboard', '.dash-layout-block', 'id', 'lifeos_dash_main_layout');
  }

  window.updateDashboardStats = loadDashboard;

  document.addEventListener('DOMContentLoaded', () => {
    setupQuickNote();
    setupDashboardSorting();
    document.addEventListener('lifeos:pageChanged', e => {
      if (e.detail?.page === 'dashboard') loadDashboard();
    });
  });
})();
