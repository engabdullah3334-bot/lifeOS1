/**
 * settings.js — LifeOS Settings Module
 * Appearance, UI Controls, LocalStorage persistence
 * Applies changes via CSS Variables
 */

(function() {
  const STORAGE_KEY = 'lifeos_settings';

  const DEFAULTS = {
    theme: 'dark',
    primaryColor: '#4d7cff',
    backgroundType: 'gradient', // 'gradient' | 'solid' | 'image'
    backgroundColor: '#0b0f1a',
    backgroundImage: null,
    showStatsBar: true,
    soundEnabled: true,
    uiOpacity: 1
  };

  let current = { ...DEFAULTS };

  // ─── Load / Save ───────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        current = { ...DEFAULTS, ...saved };
      }
    } catch (e) { console.warn('Settings load error:', e); }
    return current;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) { console.warn('Settings save error:', e); }
  }

  // ─── Apply to DOM (CSS Variables) ───────────────────────────
  function applyAll() {
    const root = document.documentElement;

    // Theme (sync with TS.theme if tasks module loaded)
    root.setAttribute('data-theme', current.theme);
    if (window.TS?.state) {
      TS.state.theme = current.theme;
      TS.state.save?.();
    }
    document.body.style.colorScheme = current.theme;

    // Primary color
    root.style.setProperty('--accent-primary', current.primaryColor);
    root.style.setProperty('--accent-glow', hexToRgba(current.primaryColor, 0.35));

    // Background
    if (current.backgroundType === 'gradient') {
      document.body.style.background = '';
      document.body.style.backgroundImage = '';
      document.body.classList.remove('settings-bg-solid', 'settings-bg-image');
    } else if (current.backgroundType === 'solid') {
      document.body.style.background = current.backgroundColor;
      document.body.style.backgroundImage = '';
      document.body.classList.add('settings-bg-solid');
      document.body.classList.remove('settings-bg-image');
    } else if (current.backgroundType === 'image' && current.backgroundImage) {
      document.body.style.background = current.backgroundColor;
      document.body.style.backgroundImage = `url(${current.backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.classList.add('settings-bg-image');
    }

    // UI Opacity (cards, panels)
    root.style.setProperty('--ui-opacity', String(current.uiOpacity));

    // Show/hide stats bar
    const statsCard = document.querySelector('.dashboard-status-card');
    if (statsCard) {
      statsCard.style.display = current.showStatsBar ? '' : 'none';
    }
  }

  function hexToRgba(hex, a) {
    const m = hex.slice(1).match(/.{2}/g);
    if (!m) return hex;
    const [r, g, b] = m.map(x => parseInt(x, 16));
    return `rgba(${r},${g},${b},${a})`;
  }

  // ─── Panel Open/Close ───────────────────────────────────────
  function open() {
    document.getElementById('settings-panel')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('settings-panel')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggle() {
    const panel = document.getElementById('settings-panel');
    if (panel?.classList.contains('open')) close();
    else open();
  }

  // ─── Event Handlers ─────────────────────────────────────────
  function bindThemeToggle() {
    const btn = document.getElementById('setting-theme-toggle');
    if (!btn) return;

    function updateUI() {
      const isDark = current.theme === 'dark';
      btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
      const label = btn.querySelector('.toggle-label');
      if (label) label.textContent = isDark ? 'Dark' : 'Light';
    }

    btn.addEventListener('click', () => {
      current.theme = current.theme === 'dark' ? 'light' : 'dark';
      save();
      applyAll();
      updateUI();
      // Sync with Task System theme
      if (window.TS?.theme) TS.theme.apply(current.theme);
    });

    // On init, sync from TS if it has theme set (user may have toggled from tasks)
    if (window.TS?.state?.theme && !localStorage.getItem(STORAGE_KEY)) {
      current.theme = TS.state.theme;
      save();
    }
    updateUI();
  }

  function bindPrimaryColor() {
    const input = document.getElementById('setting-primary-color');
    if (!input) return;

    input.value = current.primaryColor;
    input.addEventListener('input', (e) => {
      current.primaryColor = e.target.value;
      save();
      applyAll();
    });
  }

  function bindBackgroundOptions() {
    const btns = document.querySelectorAll('.settings-bg-btn');
    const colorInput = document.getElementById('setting-bg-color');
    const imageInput = document.getElementById('setting-bg-image');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.bg;
        current.backgroundType = type;
        save();

        colorInput.style.display = type === 'solid' ? 'block' : 'none';
        if (type === 'image') imageInput.click();

        applyAll();
      });
    });

    if (colorInput) {
      colorInput.value = current.backgroundColor;
      colorInput.addEventListener('input', (e) => {
        current.backgroundColor = e.target.value;
        save();
        applyAll();
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          current.backgroundImage = ev.target.result;
          current.backgroundType = 'image';
          save();
          applyAll();
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
      });
    }
  }

  function bindUIControls() {
    const showStats = document.getElementById('setting-show-stats');
    const soundEnabled = document.getElementById('setting-sound-enabled');
    const opacityRange = document.getElementById('setting-ui-opacity');
    const opacityValue = document.getElementById('setting-opacity-value');

    if (showStats) {
      showStats.checked = current.showStatsBar;
      showStats.addEventListener('change', (e) => {
        current.showStatsBar = e.target.checked;
        save();
        applyAll();
      });
    }

    if (soundEnabled) {
      soundEnabled.checked = current.soundEnabled;
      soundEnabled.addEventListener('change', (e) => {
        current.soundEnabled = e.target.checked;
        save();
      });
    }

    if (opacityRange && opacityValue) {
      opacityRange.value = current.uiOpacity;
      opacityValue.textContent = Math.round(current.uiOpacity * 100) + '%';
      opacityRange.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        current.uiOpacity = v;
        opacityValue.textContent = Math.round(v * 100) + '%';
        save();
        applyAll();
      });
    }
  }

  function bindReset() {
    document.getElementById('settings-reset')?.addEventListener('click', () => {
      if (!confirm('Reset all settings to default?')) return;
      current = { ...DEFAULTS };
      save();
      applyAll();
      syncUI();
    });
  }

  function bindPanelEvents() {
    document.getElementById('settings-close')?.addEventListener('click', close);
    document.getElementById('settings-overlay')?.addEventListener('click', close);

    document.querySelector('.bottom-settings, #btn-open-settings')?.addEventListener('click', open);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('settings-panel')?.classList.contains('open')) {
        close();
      }
    });
  }

  function syncUI() {
    const showStats = document.getElementById('setting-show-stats');
    const soundEnabled = document.getElementById('setting-sound-enabled');
    const opacityRange = document.getElementById('setting-ui-opacity');
    const opacityValue = document.getElementById('setting-opacity-value');
    const primaryColor = document.getElementById('setting-primary-color');
    const bgColor = document.getElementById('setting-bg-color');
    const themeBtn = document.getElementById('setting-theme-toggle');

    if (showStats) showStats.checked = current.showStatsBar;
    if (soundEnabled) soundEnabled.checked = current.soundEnabled;
    if (opacityRange) opacityRange.value = current.uiOpacity;
    if (opacityValue) opacityValue.textContent = Math.round(current.uiOpacity * 100) + '%';
    if (primaryColor) primaryColor.value = current.primaryColor;
    if (bgColor) bgColor.value = current.backgroundColor;

    document.querySelectorAll('.settings-bg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === current.backgroundType);
    });

    if (themeBtn) {
      themeBtn.setAttribute('aria-checked', current.theme === 'dark' ? 'true' : 'false');
      themeBtn.querySelector('.toggle-label').textContent = current.theme === 'dark' ? 'Dark' : 'Light';
    }
  }

  // ─── Init ───────────────────────────────────────────────────
  function init() {
    load();
    applyAll();
    bindThemeToggle();
    bindPrimaryColor();
    bindBackgroundOptions();
    bindUIControls();
    bindReset();
    bindPanelEvents();
  }

  document.addEventListener('DOMContentLoaded', init);

  // ─── Public API ─────────────────────────────────────────────
  window.LifeOSSettings = {
    open, close, toggle,
    get: () => ({ ...current }),
    set: (key, value) => { current[key] = value; save(); applyAll(); }
  };
})();
