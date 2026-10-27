/**
 * nexora.js — Life OS shell behaviours
 * Global search / command palette, quick actions, mobile tab bar,
 * avatar initial, settings swatches. Purely additive — no existing
 * module is replaced.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function go(view) {
    const path = view === 'dashboard' ? '/' : `/${view}`;
    history.pushState({ view }, '', path);
    window.loadView?.(view);
  }

  // ── Avatar initial ───────────────────────────────────────────
  function syncAvatar() {
    const av = $('user-avatar');
    if (!av) return;
    let name = '';
    try { name = window.__lifeosUser?.username || window.LifeOSAuth?.getUsername?.() || ''; } catch (e) { /* noop */ }
    av.textContent = (name || 'U').trim().charAt(0);
    av.title = name;
  }
  window.addEventListener('lifeos:auth:login', () => setTimeout(syncAvatar, 0));
  document.addEventListener('DOMContentLoaded', syncAvatar);

  // ── Command palette / global search ──────────────────────────
  const COMMANDS = [
    { label: 'Home — Dashboard',       ico: '⌂', group: 'Navigate', kw: 'home dashboard overview الرئيسية', run: () => go('dashboard') },
    { label: 'Tasks & Projects',       ico: '✓', group: 'Navigate', kw: 'tasks projects calendar kanban مهام مشاريع', run: () => go('tasks') },
    { label: 'Writing & Notes',        ico: '✎', group: 'Navigate', kw: 'writing notes drafts editor كتابة ملاحظات', run: () => go('writing') },
    { label: 'Archive Hub',            ico: '▤', group: 'Navigate', kw: 'archive أرشيف', run: () => go('archive') },
    { label: 'Templates Gallery',      ico: '⊞', group: 'Navigate', kw: 'templates gallery قوالب', run: () => go('templates') },
    { label: 'AI Assistant',           ico: '✦', group: 'Navigate', kw: 'ai assistant chat copilot ذكاء', run: () => go('ai-chat') },
    { label: 'Open Settings',          ico: '⚙', group: 'Actions',  kw: 'settings preferences إعدادات', run: () => window.LifeOSSettings?.open?.() },
    { label: 'Sign out',               ico: '⏻', group: 'Actions',  kw: 'logout sign out خروج', run: () => window.LifeOSAuth?.logout?.() },
  ];

  let results = [];
  let activeIdx = 0;

  function renderResults(q) {
    const box = $('global-search-results');
    if (!box) return;
    const term = (q || '').trim().toLowerCase();
    results = COMMANDS.filter(c => !term || c.label.toLowerCase().includes(term) || c.kw.includes(term));
    if (activeIdx >= results.length) activeIdx = 0;
    if (!results.length) {
      box.innerHTML = '<div class="sr-empty">No results</div>';
    } else {
      let lastGroup = '';
      box.innerHTML = results.map((c, i) => {
        const head = c.group !== lastGroup ? `<div class="sr-group">${c.group}</div>` : '';
        lastGroup = c.group;
        return `${head}<div class="sr-item${i === activeIdx ? ' active' : ''}" role="option" data-i="${i}"><span class="sr-ico">${c.ico}</span>${c.label}<span class="sr-hint">↵</span></div>`;
      }).join('');
    }
    box.classList.add('open');
  }

  function closeResults() { $('global-search-results')?.classList.remove('open'); }

  function runActive() {
    const cmd = results[activeIdx];
    if (!cmd) return;
    closeResults();
    const input = $('global-search');
    if (input) { input.value = ''; input.blur(); }
    cmd.run();
  }

  function setupSearch() {
    const input = $('global-search');
    const box = $('global-search-results');
    if (!input || !box) return;

    input.addEventListener('focus', () => { activeIdx = 0; renderResults(input.value); });
    input.addEventListener('input', () => { activeIdx = 0; renderResults(input.value); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % Math.max(results.length, 1); renderResults(input.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + results.length) % Math.max(results.length, 1); renderResults(input.value); }
      else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
      else if (e.key === 'Escape') { closeResults(); input.blur(); }
    });
    box.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.sr-item');
      if (!item) return;
      e.preventDefault();
      activeIdx = Number(item.dataset.i) || 0;
      runActive();
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#top-search')) closeResults(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  function setupTopButtons() {
    $('btn-appearance')?.addEventListener('click', () => window.LifeOSSettings?.open?.());
    $('btn-notifications')?.addEventListener('click', () => {
      const n = Number($('dash-stat-pending')?.textContent || 0);
      const msg = n > 0 ? `You have ${n} pending task${n === 1 ? '' : 's'}.` : 'All caught up — no pending tasks 🎉';
      if (window.TS?.notify?.toast) window.TS.notify.toast(msg, n > 0 ? 'info' : 'success');
      if (n > 0) go('tasks');
    });
    $('sidebar-ask-ai')?.addEventListener('click', () => {
      go('ai-chat');
      if (window.innerWidth <= 768) $('sidebar-overlay')?.click();
    });
    $('spaces-add')?.addEventListener('click', () => go('tasks'));
  }

  // ── Mobile bottom tab bar ────────────────────────────────────
  function setupTabbar() {
    const bar = $('mobile-tabbar');
    if (!bar) return;
    bar.querySelectorAll('.mtab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => go(btn.dataset.tab));
    });
    $('mtab-more')?.addEventListener('click', () => $('hamburger-btn')?.click());
    document.addEventListener('lifeos:pageChanged', (e) => {
      const page = e.detail?.page;
      bar.querySelectorAll('.mtab[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === page));
    });
  }

  // ── Settings: colour swatches + live preview ─────────────────
  function setupSwatches() {
    const wrap = $('settings-swatches');
    const picker = $('setting-primary-color');
    if (!wrap) return;

    function mark() {
      const cur = (window.LifeOSSettings?.get?.().primaryColor || '').toLowerCase();
      wrap.querySelectorAll('.settings-swatch').forEach(s => s.classList.toggle('active', s.dataset.color.toLowerCase() === cur));
      if (picker && cur) picker.value = cur;
    }
    wrap.querySelectorAll('.settings-swatch').forEach(s => {
      s.style.background = s.dataset.color;
      s.style.color = s.dataset.color;
      s.addEventListener('click', () => {
        window.LifeOSSettings?.set?.('primaryColor', s.dataset.color);
        mark();
      });
    });
    picker?.addEventListener('input', mark);
    document.addEventListener('click', (e) => { if (e.target.closest('#btn-open-settings, #btn-appearance, #settings-reset')) setTimeout(mark, 60); });
    window.addEventListener('lifeos:auth:login', () => setTimeout(mark, 600));
    setTimeout(mark, 800);
  }

  // ── Login: show/hide password ────────────────────────────────
  function setupPasswordToggles() {
    document.querySelectorAll('.login-pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.style.color = show ? '#c4b5fd' : '';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupTopButtons();
    setupTabbar();
    setupSwatches();
    setupPasswordToggles();
  });
})();
