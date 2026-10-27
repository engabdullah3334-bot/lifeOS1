/**
 * tasks/state.js — Centralized App State
 * Persists user preferences via LifeOS settings API
 */

var TS = window.TS = window.TS || {};

TS.state = {
  projects:      [],
  tasks:         [],
  archivedTasks: [],
  archivedProjects: [],
  currentView:   'projects',      // 'projects' | 'daily' | 'monthly' | 'archive'
  selectedDate:  new Date(),
  calDate:       new Date(),
  calMode:       'month',         // 'month' | 'week'
  sortBy:        'order',
  filterStatus:  '',
  searchQuery:   '',
  theme:         'dark',          // 'dark' | 'light'
  undoStack:     [],              // [{ type, data }]
  _weekOffset:   0,               // weeks from current

  // Persist lightweight prefs to MongoDB via settings module
  save() {
    try {
      if (window.LifeOSSettings?.setMany) {
        window.LifeOSSettings.setMany({
          theme: this.theme,
          taskSortBy: this.sortBy,
          taskCurrentView: this.currentView,
          taskCalMode: this.calMode,
        });
      }
    } catch (e) {}
  },

  async load() {
    try {
      if (window.LifeOSSettings?.refresh) {
        await window.LifeOSSettings.refresh();
      }
      const settings = window.LifeOSSettings?.get?.();
      if (!settings) return;
      this.theme = settings.theme || 'dark';
      this.sortBy = settings.taskSortBy || 'order';
      this.currentView = settings.taskCurrentView || 'projects';
      this.calMode = settings.taskCalMode || 'month';
    } catch (e) {}
  },
};
