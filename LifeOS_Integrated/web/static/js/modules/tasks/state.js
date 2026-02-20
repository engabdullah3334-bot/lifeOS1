/**
 * tasks/state.js — Centralized App State
 * Handles state persistence via localStorage
 */

var TS = window.TS = window.TS || {};

TS.state = {
  projects:      [],
  tasks:         [],
  currentView:   'projects',      // 'projects' | 'daily' | 'monthly'
  selectedDate:  new Date(),
  calDate:       new Date(),
  calMode:       'month',         // 'month' | 'week'
  sortBy:        'order',
  filterStatus:  '',
  searchQuery:   '',
  theme:         'dark',          // 'dark' | 'light'
  undoStack:     [],              // [{ type, data }]
  _weekOffset:   0,               // weeks from current

  // Persist lightweight prefs to localStorage
  save() {
    try {
      localStorage.setItem('ts_theme',  this.theme);
      localStorage.setItem('ts_sort',   this.sortBy);
      localStorage.setItem('ts_view',   this.currentView);
      localStorage.setItem('ts_calMode',this.calMode);
    } catch(e) {}
  },

  load() {
    try {
      this.theme      = localStorage.getItem('ts_theme')   || 'dark';
      this.sortBy     = localStorage.getItem('ts_sort')    || 'order';
      this.currentView= localStorage.getItem('ts_view')    || 'projects';
      this.calMode    = localStorage.getItem('ts_calMode') || 'month';
    } catch(e) {}
  },
};
