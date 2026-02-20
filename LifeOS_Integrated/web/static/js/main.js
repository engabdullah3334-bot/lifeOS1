// main.js — LifeOS App Entry Point (Updated for new Task System)

// API base URL — used by all modules
window.API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    // ── Legacy state (writing module) ──────────────────────
    if (!window.state) {
        console.warn('Legacy state not loaded');
        window.state = { view: 'dashboard', tasks: [], filter: 'all' };
    }

    // ── Navigation ─────────────────────────────────────────
    setupNavigation();

    // ── Writing module init (unchanged) ───────────────────
    if (window.fetchNotesStructure) window.fetchNotesStructure();
    if (window.loadQuickNote)       window.loadQuickNote();
    setupWritingListeners();

    // ── Task System Bootstrap ──────────────────────────────
    // Now handled natively in tasks/index.js

    // Show default view
    loadView(window.state.view || 'dashboard');
});

// ── Navigation ──────────────────────────────────────────────
function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.tab;
            loadView(view);
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function loadView(viewName) {
    window.state.view = viewName;
    document.querySelectorAll('.content-view').forEach(el => el.style.display = 'none');

    const target = document.getElementById(viewName);
    if (target) {
        target.style.display = target.classList.contains('ts-view') ? 'flex' : 'block';
    }

    const titles = {
        'dashboard': 'Dashboard',
        'tasks':     'Task Manager',
        'writing':   'Writing Space',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'LifeOS';

    if (viewName === 'tasks' && window.TS?.core) {
        window.TS.core._renderCurrentView();
    }
    if (viewName === 'dashboard' && window.updateDashboardStats) {
        window.updateDashboardStats();
    }
}

// ── Writing Space Listeners (unchanged from original) ────────
function setupWritingListeners() {
    const handlers = {
        'new-folder-btn':       () => window.createFolder?.(),
        'new-note-btn':         () => window.createNote?.(),
        'close-note-btn':       () => window.closeNote?.(),
        'rename-note-btn':      () => window.renameNote?.(),
        'toggle-text-direction':() => window.toggleTextDirection?.(),
        'toggle-view-mode':     () => window.toggleViewMode?.(),
        'toggle-focus-mode':    () => window.toggleFocusMode?.(),
    };

    Object.entries(handlers).forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('click', fn);
    });

    // Sidebar collapse toggles
    const toggleFolders = document.getElementById('toggle-folders');
    if (toggleFolders) {
        toggleFolders.addEventListener('click', () => {
            const el = document.getElementById('folders-sidebar');
            const rb = document.getElementById('restore-folders');
            el?.classList.toggle('collapsed');
            if (rb) rb.style.display = el?.classList.contains('collapsed') ? 'block' : 'none';
        });
    }

    const restoreFolders = document.getElementById('restore-folders');
    if (restoreFolders) {
        restoreFolders.addEventListener('click', () => {
            document.getElementById('folders-sidebar')?.classList.remove('collapsed');
            restoreFolders.style.display = 'none';
        });
    }

    const toggleFiles = document.getElementById('toggle-files');
    if (toggleFiles) {
        toggleFiles.addEventListener('click', () => {
            const el = document.getElementById('files-sidebar');
            const rb = document.getElementById('restore-files');
            el?.classList.toggle('collapsed');
            if (rb) rb.style.display = el?.classList.contains('collapsed') ? 'block' : 'none';
        });
    }

    const restoreFiles = document.getElementById('restore-files');
    if (restoreFiles) {
        restoreFiles.addEventListener('click', () => {
            document.getElementById('files-sidebar')?.classList.remove('collapsed');
            restoreFiles.style.display = 'none';
        });
    }

    // Rich Text Editor
    if (window.initializeRichTextEditor) window.initializeRichTextEditor();
    if (window.initializeAdvancedFeatures) window.initializeAdvancedFeatures();

    // Auto-save editor content
    const editor = document.querySelector('.rich-editor');
    if (editor) {
        let saveTimeout;
        editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            const saveStatus = document.querySelector('.save-status');
            if (saveStatus) saveStatus.textContent = 'Saving…';
            saveTimeout = setTimeout(() => window.saveCurrentNote?.(), 2000);
        });
    }
}

// Global
window.loadView = loadView;
