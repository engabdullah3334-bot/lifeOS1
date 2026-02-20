/**
 * tasks/theme.js — Dark / Light mode toggle + accent color
 */

var TS = window.TS = window.TS || {};

TS.theme = {
  init() {
    // Apply saved theme on load
    this.apply(TS.state.theme || 'dark');

    const btn = document.getElementById('ts-theme-toggle');
    if (btn) btn.addEventListener('click', () => this.toggle());
  },

  apply(theme) {
    TS.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.colorScheme = theme;
    const btn = document.getElementById('ts-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    TS.state.save();
    // Sync with Settings module if loaded
    if (window.LifeOSSettings) window.LifeOSSettings.set('theme', theme);
  },

  toggle() {
    this.apply(TS.state.theme === 'dark' ? 'light' : 'dark');
  },
};
