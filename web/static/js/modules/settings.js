/**
 * settings.js — LifeOS Settings Module
 * Appearance, UI Controls, LocalStorage persistence
 * Applies changes via CSS Variables
 */

(function() {
  const API_BASE = window.API_URL || (window.location.origin + '/api');

  const DEFAULTS = {
    theme: 'dark',
    taskSortBy: 'order',
    taskCurrentView: 'projects',
    taskCalMode: 'month',
    primaryColor: '#4d7cff',
    backgroundType: 'gradient', // 'gradient' | 'solid' | 'image'
    backgroundColor: '#0b0f1a',
    backgroundImage: null,
    showStatsBar: true,
    soundEnabled: true,
    uiOpacity: 1
  };

  let current = { ...DEFAULTS };
  let saveTimer = null;

  function getAuthHeaders(includeJson) {
    const headers = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    const token = window.LifeOSApi?.getToken?.();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  // ─── Load / Save ───────────────────────────────────────────
  async function loadFromApi() {
    const token = window.LifeOSApi?.getToken?.();
    if (!token) return null;
    try {
      const res = await fetch(API_BASE + '/settings', {
        headers: getAuthHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        return { ...DEFAULTS, ...data };
      }
    } catch (e) { console.warn('Settings API load error:', e); }
    return null;
  }

  async function load() {
    const fromApi = await loadFromApi();
    if (fromApi) {
      current = fromApi;
    } else {
      current = { ...DEFAULTS };
    }
    return current;
  }

  async function saveToApi(snapshot) {
    const token = window.LifeOSApi?.getToken?.();
    if (!token) {
      console.warn('Settings: no auth token — save skipped');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/settings', {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(snapshot)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Settings save failed:', res.status, err);
        _showToast('⚠ فشل حفظ الإعدادات: ' + (err.error || res.status), 'error');
      }
    } catch (e) {
      console.warn('Settings API save error:', e);
      _showToast('⚠ تعذّر الاتصال بالخادم', 'error');
    }
  }

  function _showToast(msg, type = 'info') {
    // Use app's notification system if available, fallback to console
    if (window.TS?.notifications?.show) {
      window.TS.notifications.show(msg, type);
      return;
    }
    // Simple fallback toast
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:99999',
      'background:#1e2235', 'color:#f2f4ff', 'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:10px', 'padding:12px 20px', 'font-size:13px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.4)', 'transition:opacity 0.3s',
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350); }, 3000);
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = { ...current };
      saveToApi(snapshot);
    }, 250);
  }

  // ─── Apply to DOM (CSS Variables) ───────────────────────────
  function applyAll() {
    const root = document.documentElement;

    // Theme (sync with TS.theme if tasks module loaded)
    root.setAttribute('data-theme', current.theme);
    if (window.TS?.state) {
      TS.state.theme = current.theme;
      TS.state.sortBy = current.taskSortBy || TS.state.sortBy;
      TS.state.currentView = current.taskCurrentView || TS.state.currentView;
      TS.state.calMode = current.taskCalMode || TS.state.calMode;
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

    // Show/hide stats bar (header card)
    const statsCard = document.querySelector('.dash-header');
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

    // On init, sync from TS only if settings are still defaults
    if (window.TS?.state?.theme && current.theme === DEFAULTS.theme) {
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
  async function init() {
    await load();
    applyAll();
    bindThemeToggle();
    bindPrimaryColor();
    bindBackgroundOptions();
    bindUIControls();
    bindReset();
    bindPanelEvents();
    syncUI();
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('lifeos:auth:login', () => {
    if (window.LifeOSSettings?.refresh) window.LifeOSSettings.refresh();
  });

  // ─── Public API ─────────────────────────────────────────────
  window.LifeOSSettings = {
    open, close, toggle,
    get: () => ({ ...current }),
    set: (key, value) => { current[key] = value; save(); applyAll(); },
    setMany: (partial) => {
      if (!partial || typeof partial !== 'object') return;
      current = { ...current, ...partial };
      save();
      applyAll();
    },
    refresh: async () => { await load(); applyAll(); syncUI(); }
  };
})();
