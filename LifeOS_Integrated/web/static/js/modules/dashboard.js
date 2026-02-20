/**
 * dashboard.js — LifeOS Dashboard Logic
 * Time tracking, stats, greeting
 */

(function() {
  const STORAGE_KEY = 'lifeos_session_start';
  const DATE_KEY = 'lifeos_session_date';

  function getSessionStart() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(DATE_KEY);
    if (stored !== today) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
      localStorage.setItem(DATE_KEY, today);
      return now;
    }
    return parseInt(localStorage.getItem(STORAGE_KEY) || Date.now(), 10);
  }

  function formatTimeSpent(ms) {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function updateTimeDisplay() {
    const el = document.getElementById('dash-stat-time');
    if (!el) return;
    const start = getSessionStart();
    const diff = Date.now() - start;
    el.textContent = formatTimeSpent(diff);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    return 'Good evening.';
  }

  function getStatus(tasks) {
    if (!tasks || !tasks.length) return 'Ready';
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const pct = total ? Math.round(completed / total * 100) : 0;
    if (pct >= 80) return 'On fire';
    if (pct >= 50) return 'Productive';
    if (pct >= 20) return 'In progress';
    return 'Getting started';
  }

  window.updateDashboardStats = function() {
    const tasks = window.TS?.state?.tasks || [];
    const completed = tasks.filter(t => t.status === 'completed').length;

    const completedEl = document.getElementById('dash-stat-completed');
    if (completedEl) completedEl.textContent = completed;

    const statusEl = document.getElementById('dash-stat-status');
    if (statusEl) {
      statusEl.textContent = getStatus(tasks);
      statusEl.className = 'stat-value stat-status';
    }

    const greetingEl = document.getElementById('dashboard-greeting');
    if (greetingEl) greetingEl.textContent = getGreeting();

    updateTimeDisplay();
  };

  // Init: ensure session start, update time every minute
  document.addEventListener('DOMContentLoaded', () => {
    getSessionStart();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 60000); // every minute
    if (window.updateDashboardStats) window.updateDashboardStats();
  });
})();
