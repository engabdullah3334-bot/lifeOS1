/**
 * tasks/theme.js — Dark / Light mode toggle + accent color
 */

var TS = window.TS = window.TS || {};

TS.theme = {
  init() {
    this.apply('dark');
  },

  apply(theme) {
    TS.state.theme = 'dark';
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.colorScheme = 'dark';
  },

  toggle() {
    this.apply('dark');
  },
};
