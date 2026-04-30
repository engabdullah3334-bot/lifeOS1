/**
 * web/static/js/modules/templates.js
 * ────────────────────────────────────
 * LifeOS Templates Gallery Module
 *
 * - Fetches templates from /api/templates
 * - Renders cards per category
 * - Handles import → shows toast → navigates to destination
 */

window.Templates = (() => {
    'use strict';

    // ── State ────────────────────────────────────────────────
    let _allTemplates   = [];
    let _activeCategory = 'all';
    let _importing      = new Set();   // template IDs currently being imported
    let _toastTimer     = null;

    // ── Category Config ───────────────────────────────────────
    const CATEGORIES = {
        tasks: {
            label:       'Productivity & Tasks',
            icon:        '✓',
            destination: 'tasks',
            destLabel:   'Task Manager',
        },
        writing: {
            label:       'Writing',
            icon:        '✎',
            destination: 'writing',
            destLabel:   'Writing Space',
        },
        archive: {
            label:       'Archive',
            icon:        '📦',
            destination: 'tasks',   // archive templates create projects
            destLabel:   'Task Manager',
        },
    };

    // ── Init ──────────────────────────────────────────────────
    function init() {
        _bindTabs();
        _fetchTemplates();
    }

    // ── Tab Binding ───────────────────────────────────────────
    function _bindTabs() {
        document.querySelectorAll('#tmpl-tabs .tmpl-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.category;
                _activeCategory = cat;

                // Update active state
                document.querySelectorAll('#tmpl-tabs .tmpl-tab').forEach(b => {
                    const isActive = b.dataset.category === cat;
                    b.classList.toggle('active', isActive);
                    b.setAttribute('aria-selected', isActive.toString());
                });

                _renderCards();
            });
        });
    }

    // ── Fetch ─────────────────────────────────────────────────
    async function _fetchTemplates() {
        const grid = document.getElementById('tmpl-grid');
        if (!grid) return;

        try {
            const token = localStorage.getItem('lifeos_token');
            const res = await fetch(`${window.API_URL}/templates`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            _allTemplates = await res.json();
            _updateCounts();
            _renderCards();

        } catch (err) {
            console.error('[Templates] Fetch error:', err);
            grid.innerHTML = `
                <div class="tmpl-empty">
                    <div class="tmpl-empty-icon">⚠️</div>
                    <div class="tmpl-empty-text">Could not load templates</div>
                    <div class="tmpl-empty-subtext">${err.message}</div>
                </div>`;
        }
    }

    // ── Count Badges ─────────────────────────────────────────
    function _updateCounts() {
        const allEl = document.getElementById('tmpl-count-all');
        if (allEl) allEl.textContent = _allTemplates.length;

        ['tasks', 'writing', 'archive'].forEach(cat => {
            const el = document.getElementById(`tmpl-count-${cat}`);
            if (el) el.textContent = _allTemplates.filter(t => t.category === cat).length;
        });
    }

    // ── Render Grid ───────────────────────────────────────────
    function _renderCards() {
        const grid = document.getElementById('tmpl-grid');
        if (!grid) return;

        const filtered = _activeCategory === 'all'
            ? _allTemplates
            : _allTemplates.filter(t => t.category === _activeCategory);

        if (!filtered.length) {
            grid.innerHTML = `
                <div class="tmpl-empty">
                    <div class="tmpl-empty-icon">🔍</div>
                    <div class="tmpl-empty-text">No templates found</div>
                    <div class="tmpl-empty-subtext">Try a different category.</div>
                </div>`;
            return;
        }

        grid.innerHTML = filtered.map(t => _cardHTML(t)).join('');

        // Bind import buttons
        grid.querySelectorAll('.tmpl-import-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                _importTemplate(btn.dataset.id);
            });
        });

        // Whole card click also triggers import
        grid.querySelectorAll('.tmpl-card').forEach(card => {
            card.addEventListener('click', () => {
                _importTemplate(card.dataset.id);
            });
        });
    }

    // ── Card HTML Builder ─────────────────────────────────────
    function _cardHTML(t) {
        const catCfg   = CATEGORIES[t.category] || {};
        const catClass = `cat-${t.category}`;
        const destLabel = catCfg.destLabel || 'App';

        const previewChips = (t.preview_tasks || []).slice(0, 5)
            .map(p => `<span class="tmpl-preview-chip">${_esc(p)}</span>`)
            .join('');

        const isImporting = _importing.has(t.id);
        const btnLabel    = isImporting ? '⏳ Importing…' : '⬇ Import';

        return `
        <article class="tmpl-card" data-id="${t.id}" role="listitem"
                 tabindex="0" aria-label="${_esc(t.title)} template"
                 onkeydown="if(event.key==='Enter')this.click()">

            <div class="tmpl-card-stripe"
                 style="background:linear-gradient(90deg, ${_esc(t.color)}, ${_lighten(t.color)})">
            </div>

            <div class="tmpl-card-body">
                <div class="tmpl-card-header">
                    <div class="tmpl-card-icon-wrap"
                         style="background:${_hex2rgba(t.color, 0.15)}; border:1px solid ${_hex2rgba(t.color, 0.3)}">
                        ${_esc(t.icon)}
                    </div>
                    <div class="tmpl-card-meta">
                        <div class="tmpl-card-title">${_esc(t.title)}</div>
                        <span class="tmpl-card-category ${catClass}">
                            ${catCfg.icon || ''} ${_esc(t.category)}
                        </span>
                    </div>
                </div>

                <p class="tmpl-card-desc">${_esc(t.description)}</p>

                ${previewChips ? `<div class="tmpl-card-preview">${previewChips}</div>` : ''}
            </div>

            <div class="tmpl-card-footer">
                <div class="tmpl-destination-badge">
                    <span class="tmpl-dest-dot" style="background:${_esc(t.color)}"></span>
                    → ${_esc(destLabel)}
                </div>
                <button class="tmpl-import-btn"
                        data-id="${t.id}"
                        ${isImporting ? 'disabled' : ''}
                        aria-label="Import ${_esc(t.title)}">
                    ${btnLabel}
                </button>
            </div>
        </article>`;
    }

    // ── Import Logic ──────────────────────────────────────────
    async function _importTemplate(templateId) {
        if (_importing.has(templateId)) return;

        _importing.add(templateId);
        _refreshCardButton(templateId, true);

        try {
            const token = localStorage.getItem('lifeos_token');
            const res = await fetch(`${window.API_URL}/templates/import`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    Authorization:   `Bearer ${token}`,
                },
                body: JSON.stringify({ template_id: templateId }),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Import failed');
            }

            const tmpl = _allTemplates.find(t => t.id === templateId);
            _showToast({
                icon:        '✅',
                title:       'Template Imported!',
                message:     result.message || 'Your template is ready.',
                destination: result.destination || 'tasks',
            });

            // Reload module data if available
            _refreshDestination(result.destination);

        } catch (err) {
            console.error('[Templates] Import error:', err);
            _showToast({
                icon:    '❌',
                title:   'Import Failed',
                message: err.message,
                destination: null,
            });
        } finally {
            _importing.delete(templateId);
            _refreshCardButton(templateId, false);
        }
    }

    // Re-render just the import button state
    function _refreshCardButton(templateId, loading) {
        const btn = document.querySelector(`.tmpl-import-btn[data-id="${templateId}"]`);
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? '⏳ Importing…' : '⬇ Import';
    }

    // ── Destination Refresh ───────────────────────────────────
    function _refreshDestination(destination) {
        if (!destination) return;

        if (destination === 'tasks') {
            // Reload task system data
            if (typeof window.fetchTasks === 'function') {
                window.fetchTasks();
            } else if (window.TS?.core?.refresh) {
                window.TS.core.refresh();
            }
        }

        if (destination === 'writing') {
            // Reload writing projects sidebar
            if (typeof window.fetchProjectsStructure === 'function') {
                window.fetchProjectsStructure();
            }
        }
    }

    // ── Toast ─────────────────────────────────────────────────
    function _showToast({ icon, title, message, destination }) {
        const toast    = document.getElementById('tmpl-toast');
        const iconEl   = document.getElementById('tmpl-toast-icon');
        const titleEl  = document.getElementById('tmpl-toast-title');
        const msgEl    = document.getElementById('tmpl-toast-msg');
        const gotoBtn  = document.getElementById('tmpl-toast-goto');

        if (!toast) return;

        iconEl.textContent  = icon    || '✅';
        titleEl.textContent = title   || 'Done!';
        msgEl.textContent   = message || '';

        if (destination && window.loadView) {
            gotoBtn.style.display = 'block';
            gotoBtn.onclick = () => {
                window.loadView(destination);
                toast.classList.remove('show');
            };
        } else {
            gotoBtn.style.display = 'none';
        }

        // Show
        toast.classList.add('show');

        // Auto-dismiss after 5s
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
    }

    // ── Utility Helpers ───────────────────────────────────────
    function _esc(str) {
        if (str === undefined || str === null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function _hex2rgba(hex, alpha) {
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        } catch {
            return `rgba(99,102,241,${alpha})`;
        }
    }

    // Slightly lighter version of a hex colour for gradient end
    function _lighten(hex) {
        try {
            let r = Math.min(255, parseInt(hex.slice(1,3), 16) + 40);
            let g = Math.min(255, parseInt(hex.slice(3,5), 16) + 40);
            let b = Math.min(255, parseInt(hex.slice(5,7), 16) + 60);
            return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
        } catch {
            return '#a855f7';
        }
    }

    // ── Public API ────────────────────────────────────────────
    return { init };
})();
