/**
 * tasks/views/monthlyView.js — Monthly / Weekly Calendar Renderer
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.monthly = {
  init() {
    document.getElementById('ts-cal-prev')?.addEventListener('click',  () => this._shift(-1));
    document.getElementById('ts-cal-next')?.addEventListener('click',  () => this._shift(+1));
    document.getElementById('ts-cal-today')?.addEventListener('click', () => {
      TS.state.calDate = new Date();
      this.render();
    });
    document.getElementById('ts-cal-mode')?.addEventListener('change', e => {
      TS.state.calMode = e.target.value;
      TS.state.save();
      this._syncModeSelect();
      this.render();
    });
  },

  render() {
    this._syncModeSelect();
    if (TS.state.calMode === 'week') this._renderWeek();
    else                             this._renderMonth();
  },

  _syncModeSelect() {
    const sel = document.getElementById('ts-cal-mode');
    if (sel) sel.value = TS.state.calMode;

    // Show/hide day-name headers (only relevant for month view grid)
    const headers = document.getElementById('ts-cal-day-headers');
    if (headers) headers.style.display = '';
  },

  _shift(delta) {
    const d = TS.state.calDate;
    if (TS.state.calMode === 'month') {
      TS.state.calDate = new Date(d.getFullYear(), d.getMonth() + delta, 1);
    } else {
      TS.state.calDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7);
    }
    this.render();
  },

  _renderMonth() {
    const grid  = document.getElementById('ts-cal-grid');
    const label = document.getElementById('ts-cal-label');
    if (!grid) return;

    const d     = TS.state.calDate;
    const year  = d.getFullYear();
    const month = d.getMonth();
    const today = new Date();

    label.textContent = d.toLocaleDateString('en-US', { month:'long', year:'numeric' });

    const firstDay   = new Date(year, month, 1).getDay();   // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    grid.className = 'ts-cal-grid';
    grid.innerHTML = '';

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'ts-cal-cell empty';
      grid.appendChild(cell);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date    = new Date(year, month, day);
      const isToday = TS.utils.toDateStr(date) === TS.utils.toDateStr(today);
      grid.appendChild(this._buildCell(date, isToday));
    }
  },

  _renderWeek() {
    const grid  = document.getElementById('ts-cal-grid');
    const label = document.getElementById('ts-cal-label');
    if (!grid) return;

    grid.className = 'ts-cal-grid week-mode';
    grid.innerHTML = '';

    const base  = new Date(TS.state.calDate);
    const day   = base.getDay();
    base.setDate(base.getDate() - day); // start from Sunday

    label.textContent = `Week of ${base.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}`;

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d       = new Date(base);
      d.setDate(base.getDate() + i);
      const isToday = TS.utils.toDateStr(d) === TS.utils.toDateStr(today);
      grid.appendChild(this._buildCell(d, isToday));
    }
  },

  _buildCell(date, isToday) {
    const cell = document.createElement('div');
    cell.className = `ts-cal-cell${isToday ? ' today' : ''}`;

    // Date number
    const dateEl = document.createElement('div');
    dateEl.className = 'ts-cal-date';
    dateEl.textContent = date.getDate();
    cell.appendChild(dateEl);

    // Tasks for this day
    const tasks = TS.taskMgr.getForDate(date);
    if (tasks.length > 0) {
      const taskWrap = document.createElement('div');
      taskWrap.className = 'ts-cal-tasks';

      const visible = tasks.slice(0, 3);
      visible.forEach(task => {
        const pill = document.createElement('div');
        pill.className = `ts-cal-pill p-${task.priority}`;
        pill.textContent = task.title;
        pill.title       = task.title;
        pill.addEventListener('click', e => {
          e.stopPropagation();
          TS.modal.openTask(task);
        });
        taskWrap.appendChild(pill);
      });

      if (tasks.length > 3) {
        const more = document.createElement('div');
        more.className = 'ts-cal-more';
        more.textContent = `+${tasks.length - 3} more`;
        taskWrap.appendChild(more);
      }

      cell.appendChild(taskWrap);
    }

    // Click cell → switch to daily view for that date
    cell.addEventListener('click', () => {
      TS.state.selectedDate = date;
      TS.core.switchView('daily');
    });

    return cell;
  },
};
