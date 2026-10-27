/**
 * tasks/notifications.js — Toast notifications + Undo system
 */

var TS = window.TS = window.TS || {};

TS.notify = {
  // Show a toast message
  // type: 'success' | 'error' | 'info' | 'warning'
  toast(msg, type = 'info', opts = {}) {
    const container = document.getElementById('ts-toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

    const el = document.createElement('div');
    el.className = `ts-toast ${type}`;

    const iconEl = document.createElement('span');
    iconEl.className = 'ts-toast-icon';
    iconEl.textContent = icons[type] || 'ℹ️';

    const msgEl = document.createElement('span');
    msgEl.className = 'ts-toast-msg';
    msgEl.textContent = String(msg ?? '');

    el.appendChild(iconEl);
    el.appendChild(msgEl);

    if (opts.undoFn) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'ts-toast-undo';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => {
        opts.undoFn();
        this._dismiss(el);
      });
      el.appendChild(undoBtn);
    }

    container.appendChild(el);

    // Auto-dismiss
    const delay = opts.delay || (opts.undoFn ? 5000 : 3000);
    setTimeout(() => this._dismiss(el), delay);
  },

  _dismiss(el) {
    if (!el.parentNode) return;
    el.classList.add('ts-toast-exit');
    setTimeout(() => el.remove(), 300);
  },

  success(msg, opts) { this.toast(msg, 'success', opts); },
  error(msg, opts)   { this.toast(msg, 'error',   opts); },
  info(msg, opts)    { this.toast(msg, 'info',    opts); },
  warning(msg, opts) { this.toast(msg, 'warning', opts); },

  // Reminder check — called on app init
  checkReminders() {
    const now = new Date();
    (TS.state.tasks || []).forEach(task => {
      if (!task.reminder || task.status === 'completed' || task.status === 'archived') return;
      const rem = new Date(task.reminder);
      const diffMin = (rem - now) / 60000;
      if (diffMin >= 0 && diffMin <= 15) {
        this.warning(`⏰ Reminder: "${task.title}" is due soon!`, { delay: 10000 });
      }
    });
  },
};
