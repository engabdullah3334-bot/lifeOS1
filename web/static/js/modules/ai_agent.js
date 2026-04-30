/**
 * ai_agent.js — LifeOS AI Agent Module
 * ======================================
 * Handles:
 *  - FAB toggle (open/close mini-widget)
 *  - Mode switching (clears per-mode conversation)
 *  - Message rendering (user + AI bubbles, action chips, typing indicator)
 *  - API calls to POST /api/ai/chat
 *  - Full AI Chat page (separate message list, same API)
 *  - Auto-resize textarea
 *
 * Exposes: window.AIAgent (for external navigation hooks)
 */

(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────────────────────── */

  const API_URL = window.API_URL || '/api';

  const MODE_PLACEHOLDERS = {
    planning:     'Describe a goal and I\'ll create a plan...',
    tasks:        'Tell me what you need to do...',
    coaching:     'What\'s on your mind today?',
    productivity: 'Ask about GTD, time-blocking, focus techniques...',
  };

  const SUGGESTIONS = {
    planning: [
      'Help me plan a new project',
      'Break this goal into tasks: launch my blog',
      'Create a weekly sprint plan',
    ],
    tasks: [
      'Create a task: review emails',
      'Add tasks for my morning routine',
      'I need to finish my report by Friday',
    ],
    coaching: [
      'I\'m feeling overwhelmed today',
      'How do I build a consistent habit?',
      'Give me a motivational boost',
    ],
    productivity: [
      'Explain the GTD method',
      'How do I implement time-blocking?',
      'Best Pomodoro setup for deep work',
    ],
  };

  /* ── State ──────────────────────────────────────────────────────────── */

  // Separate conversation history per mode
  const state = {
    widgetOpen: false,
    widgetMode: 'planning',
    widgetLoading: false,
    widgetMessages: { planning: [], tasks: [], coaching: [], productivity: [] },

    chatPageMode: 'planning',
    chatPageLoading: false,
    chatPageMessages: { planning: [], tasks: [], coaching: [], productivity: [] },
  };

  /* ════════════════════════════════════════════════════════════════════
     MINI-WIDGET
  ════════════════════════════════════════════════════════════════════ */

  function initWidget() {
    const trigger  = document.getElementById('ai-widget-trigger');
    const widget   = document.getElementById('ai-mini-widget');
    const closeBtn = document.getElementById('ai-widget-close');
    const input    = document.getElementById('ai-widget-input');
    const sendBtn  = document.getElementById('ai-widget-send');
    const tabs     = document.querySelectorAll('#ai-mini-widget .ai-mode-tab');

    if (!trigger || !widget) return;

    // ── Draggable Trigger ──────────────────────────────────────────────
    makeFABDraggable(trigger);

    // ── Toggle open/close ──────────────────────────────────────────────
    trigger.addEventListener('click', (e) => {
      if (trigger.dataset.dragged === 'true') {
         e.preventDefault();
         return;
      }
      state.widgetOpen ? closeWidget() : openWidget();
    });

    closeBtn && closeBtn.addEventListener('click', closeWidget);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (
        state.widgetOpen &&
        !widget.contains(e.target) &&
        e.target !== trigger &&
        !trigger.contains(e.target)
      ) {
        closeWidget();
      }
    });

    // ── Mode tabs ──────────────────────────────────────────────────────
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === state.widgetMode) return;
        switchWidgetMode(mode);
      });
    });

    // ── Input handling ─────────────────────────────────────────────────
    input && input.addEventListener('input', () => {
      autoResizeTextarea(input);
      sendBtn && (sendBtn.disabled = !input.value.trim());
    });

    input && input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.widgetLoading && input.value.trim()) sendWidgetMessage();
      }
    });

    sendBtn && sendBtn.addEventListener('click', () => {
      if (!state.widgetLoading && input.value.trim()) sendWidgetMessage();
    });

    // ── Resize Observer for Maximizing ─────────────────────────────────
    if (typeof ResizeObserver !== 'undefined' && widget) {
      const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
          // If the user drags it large enough, auto-maximize to the full chat page
          if (entry.contentRect.width > 500 || entry.contentRect.height > 600) {
             if (state.widgetOpen) {
               closeWidget();
               if (window.loadView) window.loadView('ai-chat');
               // Reset size for next time
               widget.style.width = '';
               widget.style.height = '';
             }
          }
        }
      });
      ro.observe(widget);
    }
  }

  function makeFABDraggable(el) {
    if (!el) return;
    let isDragging = false;
    let startX, startY, initialRight, initialBottom;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      isDragging = false;
      const rect = el.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      startX = e.clientX;
      startY = e.clientY;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          // Temporarily disable transition so dragging is smooth
          el.style.transition = 'none';
      }

      if (isDragging) {
          let newRight = initialRight - dx;
          let newBottom = initialBottom - dy;
          el.style.right = `${newRight}px`;
          el.style.bottom = `${newBottom}px`;
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (isDragging) {
        el.dataset.dragged = 'true';
        setTimeout(() => el.dataset.dragged = 'false', 150);
        // Restore transition
        el.style.transition = '';
      }
    }
  }

  function openWidget() {
    const widget  = document.getElementById('ai-mini-widget');
    const trigger = document.getElementById('ai-widget-trigger');
    if (!widget) return;
    state.widgetOpen = true;
    widget.classList.add('widget-visible');
    widget.setAttribute('aria-hidden', 'false');
    trigger && trigger.classList.add('widget-open');
    trigger && trigger.setAttribute('aria-expanded', 'true');
    // Focus input
    setTimeout(() => {
      const inp = document.getElementById('ai-widget-input');
      inp && inp.focus();
    }, 300);
  }

  function closeWidget() {
    const widget  = document.getElementById('ai-mini-widget');
    const trigger = document.getElementById('ai-widget-trigger');
    if (!widget) return;
    state.widgetOpen = false;
    widget.classList.remove('widget-visible');
    widget.setAttribute('aria-hidden', 'true');
    trigger && trigger.classList.remove('widget-open');
    trigger && trigger.setAttribute('aria-expanded', 'false');
  }

  function switchWidgetMode(mode) {
    state.widgetMode = mode;

    // Update tab active states
    document.querySelectorAll('#ai-mini-widget .ai-mode-tab').forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    // Update input placeholder
    const input = document.getElementById('ai-widget-input');
    if (input) input.placeholder = MODE_PLACEHOLDERS[mode] || 'Ask me anything...';

    // Re-render messages for this mode
    renderWidgetMessages();
  }

  /* ── Send (widget) ──────────────────────────────────────────────────── */

  async function sendWidgetMessage() {
    const input   = document.getElementById('ai-widget-input');
    const sendBtn = document.getElementById('ai-widget-send');
    const text    = input ? input.value.trim() : '';
    if (!text || state.widgetLoading) return;

    // Push user message
    state.widgetMessages[state.widgetMode].push({ role: 'user', content: text });
    input.value = '';
    if (input) autoResizeTextarea(input);
    if (sendBtn) sendBtn.disabled = true;

    renderWidgetMessages();
    showWidgetTyping(true);
    state.widgetLoading = true;

    try {
      const data = await callAI(state.widgetMode, state.widgetMessages[state.widgetMode]);
      state.widgetMessages[state.widgetMode].push({ role: 'assistant', content: data.reply });
      renderWidgetMessages();
      renderWidgetActions(data.actions_taken || []);
    } catch (err) {
      appendWidgetError(err.message || 'Connection error. Please try again.');
    } finally {
      showWidgetTyping(false);
      state.widgetLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  /* ── Render (widget) ────────────────────────────────────────────────── */

  function renderWidgetMessages() {
    const container = document.getElementById('ai-widget-messages');
    const welcome   = document.getElementById('ai-widget-welcome');
    if (!container) return;

    const msgs = state.widgetMessages[state.widgetMode] || [];

    // Remove old bubbles (keep welcome & typing outside the list)
    container.querySelectorAll('.ai-msg').forEach((el) => el.remove());

    if (msgs.length === 0) {
      if (welcome) welcome.style.display = '';
      return;
    }
    if (welcome) welcome.style.display = 'none';

    msgs.forEach((msg) => {
      const el = buildBubble(msg.role, msg.content);
      container.appendChild(el);
    });

    scrollToBottom(container);
  }

  function renderWidgetActions(actions) {
    if (!actions.length) return;
    const container = document.getElementById('ai-widget-messages');
    if (!container) return;

    const lastBubble = container.querySelector('.ai-msg.model:last-child');
    const wrap = lastBubble || container;

    const chips = document.createElement('div');
    chips.className = 'ai-action-chips';
    actions.forEach((a) => {
      const label = a.title || a.name || 'Item';
      const typeLabel = a.type === 'task_created' ? '✓ Task Created' : '📁 Project Created';
      const chip = document.createElement('div');
      chip.className = 'ai-action-chip';
      chip.innerHTML = `<span class="ai-chip-icon">${a.type === 'task_created' ? '✓' : '📁'}</span>${typeLabel}: <strong>${escapeHtml(label)}</strong>`;
      chips.appendChild(chip);
    });

    (lastBubble || container).appendChild(chips);
    scrollToBottom(container);
  }

  function appendWidgetError(msg) {
    const container = document.getElementById('ai-widget-messages');
    if (!container) return;
    const el = buildBubble('model', `⚠️ ${msg}`);
    el.querySelector('.ai-msg-bubble').style.borderLeftColor = '#ff453a';
    container.appendChild(el);
    scrollToBottom(container);
  }

  function showWidgetTyping(visible) {
    const el = document.getElementById('ai-widget-typing');
    if (!el) return;
    el.classList.toggle('visible', visible);
    const container = document.getElementById('ai-widget-messages');
    if (container && visible) scrollToBottom(container);
  }

  /* ════════════════════════════════════════════════════════════════════
     FULL AI CHAT PAGE
  ════════════════════════════════════════════════════════════════════ */

  function initChatPage() {
    const page = document.getElementById('ai-chat');
    if (!page) return;

    // Tabs
    page.querySelectorAll('.ai-chat-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        if (tab.dataset.mode === state.chatPageMode) return;
        switchChatPageMode(tab.dataset.mode);
      });
    });

    // Input + send
    const input   = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');

    input && input.addEventListener('input', () => {
      autoResizeTextarea(input);
      if (sendBtn) sendBtn.disabled = !input.value.trim();
    });

    input && input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.chatPageLoading && input.value.trim()) sendChatPageMessage();
      }
    });

    sendBtn && sendBtn.addEventListener('click', () => {
      if (!state.chatPageLoading && input.value.trim()) sendChatPageMessage();
    });

    // Suggestion chips
    page.querySelectorAll('.ai-suggestion-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
          input.value = chip.textContent.trim();
          autoResizeTextarea(input);
          const btn = document.getElementById('ai-chat-send');
          if (btn) btn.disabled = false;
          input.focus();
        }
      });
    });

    renderChatPage();
  }

  function switchChatPageMode(mode) {
    state.chatPageMode = mode;

    document.querySelectorAll('#ai-chat .ai-chat-tab').forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const input = document.getElementById('ai-chat-input');
    if (input) input.placeholder = MODE_PLACEHOLDERS[mode] || 'Ask me anything...';

    renderChatPage();
    updateChatSuggestions(mode);
  }

  function updateChatSuggestions(mode) {
    const wrap = document.getElementById('ai-chat-suggestions');
    if (!wrap) return;
    const chips = SUGGESTIONS[mode] || [];
    wrap.innerHTML = chips.map(
      (s) => `<button class="ai-suggestion-chip" type="button">${escapeHtml(s)}</button>`
    ).join('');
    wrap.querySelectorAll('.ai-suggestion-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
          input.value = chip.textContent.trim();
          autoResizeTextarea(input);
          const btn = document.getElementById('ai-chat-send');
          if (btn) btn.disabled = false;
          input.focus();
        }
      });
    });
  }

  /* ── Send (chat page) ───────────────────────────────────────────────── */

  async function sendChatPageMessage() {
    const input   = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const text    = input ? input.value.trim() : '';
    if (!text || state.chatPageLoading) return;

    // Hide welcome state
    const welcome = document.getElementById('ai-chat-welcome-state');
    if (welcome) welcome.style.display = 'none';

    state.chatPageMessages[state.chatPageMode].push({ role: 'user', content: text });
    input.value = '';
    if (input) autoResizeTextarea(input);
    if (sendBtn) sendBtn.disabled = true;

    renderChatPage();
    showChatPageTyping(true);
    state.chatPageLoading = true;

    try {
      const data = await callAI(state.chatPageMode, state.chatPageMessages[state.chatPageMode]);
      state.chatPageMessages[state.chatPageMode].push({ role: 'assistant', content: data.reply });
      renderChatPage();
      renderChatPageActions(data.actions_taken || []);
    } catch (err) {
      appendChatPageError(err.message || 'Connection error. Please try again.');
    } finally {
      showChatPageTyping(false);
      state.chatPageLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  /* ── Render (chat page) ─────────────────────────────────────────────── */

  function renderChatPage() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    container.querySelectorAll('.ai-msg').forEach((el) => el.remove());

    const msgs = state.chatPageMessages[state.chatPageMode] || [];
    if (msgs.length === 0) return;

    const welcome = document.getElementById('ai-chat-welcome-state');
    if (welcome) welcome.style.display = 'none';

    msgs.forEach((msg) => {
      container.appendChild(buildBubble(msg.role, msg.content));
    });

    scrollToBottom(container);
  }

  function renderChatPageActions(actions) {
    if (!actions.length) return;
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const chips = document.createElement('div');
    chips.className = 'ai-action-chips';
    actions.forEach((a) => {
      const label = a.title || a.name || 'Item';
      const chip  = document.createElement('div');
      chip.className = 'ai-action-chip';
      chip.innerHTML = `<span class="ai-chip-icon">${a.type === 'task_created' ? '✓' : '📁'}</span>${a.type === 'task_created' ? 'Task Created' : 'Project Created'}: <strong>${escapeHtml(label)}</strong>`;
      chips.appendChild(chip);
    });

    container.appendChild(chips);
    scrollToBottom(container);
  }

  function appendChatPageError(msg) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const el = buildBubble('model', `⚠️ ${msg}`);
    el.querySelector('.ai-msg-bubble').style.borderLeftColor = '#ff453a';
    container.appendChild(el);
    scrollToBottom(container);
  }

  function showChatPageTyping(visible) {
    const el = document.getElementById('ai-chat-typing');
    if (el) el.classList.toggle('visible', visible);
    if (visible) {
      const c = document.getElementById('ai-chat-messages');
      if (c) scrollToBottom(c);
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     SHARED API CALL
  ════════════════════════════════════════════════════════════════════ */

  async function callAI(mode, messages) {
    const resp = await window.LifeOSApi.apiFetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, messages }),
    });

    if (!resp.ok) {
      let errMsg = `Server error (${resp.status})`;
      try {
        const errData = await resp.json();
        errMsg = errData.error || errMsg;
      } catch (_) { /* ignore */ }
      throw new Error(errMsg);
    }

    return resp.json();
  }

  /* ════════════════════════════════════════════════════════════════════
     SHARED UTILITIES
  ════════════════════════════════════════════════════════════════════ */

  /**
   * Build a chat message bubble element.
   * Converts simple markdown (bold, bullets) to HTML.
   */
  function buildBubble(role, content) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = `ai-msg ${isUser ? 'user' : 'model'}`;

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    bubble.innerHTML = markdownLite(content);
    div.appendChild(bubble);

    return div;
  }

  /** Very lightweight markdown → HTML (bold, italic, bullets) */
  function markdownLite(text) {
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lines that start with - or *
    html = html.replace(/(^|\n)([-•]\s.+)/g, (_, pre, line) => `${pre}<li>${line.replace(/^[-•]\s/, '')}</li>`);
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>(\n)?)+/g, (m) => `<ul>${m}</ul>`);
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scrollToBottom(el) {
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }

  function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  /* ════════════════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════════════════ */

  function init() {
    initWidget();
    initChatPage();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init chat page when it becomes visible (SPA navigation)
  document.addEventListener('lifeos:pageChanged', (e) => {
    if (e.detail && e.detail.page === 'ai-chat') {
      renderChatPage();
      updateChatSuggestions(state.chatPageMode);
      const input = document.getElementById('ai-chat-input');
      if (input) input.focus();
    }
  });

  /* ── Public API ─────────────────────────────────────────────────────── */
  window.AIAgent = {
    open: openWidget,
    close: closeWidget,
    setMode: switchWidgetMode,
  };

})();
