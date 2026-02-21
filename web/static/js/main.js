// main.js — LifeOS App Entry Point (Updated for new Task System)

// API base URL — used by all modules
window.API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    // ── Legacy state (writing module) ──────────────────────
    if (!window.state) {
        console.warn('Legacy state not loaded');
        window.state = { view: 'dashboard', tasks: [], filter: 'all' };
    }

    // ── Mobile Sidebar (Hamburger) ──────────────────────────
    setupMobileSidebar();

    // ── Navigation ─────────────────────────────────────────
    setupNavigation();

    // ── Writing module init ────────────────────────────────
    if (window.fetchProjectsStructure) window.fetchProjectsStructure();
    if (window.loadQuickNote)          window.loadQuickNote();
    setupWritingListeners();

    // ── Task System Bootstrap ──────────────────────────────
    // Now handled natively in tasks/index.js

    // Show default view
    loadView(window.state.view || 'dashboard');
});

// ── Mobile Sidebar (Hamburger Menu) ──────────────────────────
function setupMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');

    function openSidebar() {
        sidebar?.classList.add('open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    hamburger?.addEventListener('click', () => {
        if (sidebar?.classList.contains('open')) closeSidebar();
        else openSidebar();
    });

    overlay?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-links li, .bottom-settings')?.forEach(el => {
        el.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
}

// ── Navigation ──────────────────────────────────────────────
function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.tab;
            if (view === 'archive') {
                window.location.href = '/archive';
                return;
            }
            if (view) {
                loadView(view);
                document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
                item.classList.add('active');
            }
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
        'archive':   'Archive',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'LifeOS';

    if (viewName === 'tasks' && window.TS?.core) {
        window.TS.core._renderCurrentView();
    }
    if (viewName === 'archive' && window.TS?.core) {
        // Archive is a sub-view of tasks
        const tasksSection = document.getElementById('tasks');
        if (tasksSection) tasksSection.style.display = 'flex';
        window.TS.core.switchView('archive');
    }
    if (viewName === 'dashboard' && window.updateDashboardStats) {
        window.updateDashboardStats();
    }
}

// ── Writing Space Listeners ─────────────────────────────────
function setupWritingListeners() {
    const handlers = {
        'new-project-btn':      () => window.createProject?.(),
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

    // Projects sidebar toggle
    const toggleProjects = document.getElementById('toggle-projects');
    if (toggleProjects) {
        toggleProjects.addEventListener('click', () => {
            const el = document.getElementById('projects-sidebar');
            const rb = document.getElementById('restore-projects');
            el?.classList.toggle('collapsed');
            if (rb) rb.style.display = el?.classList.contains('collapsed') ? 'block' : 'none';
        });
    }

    const restoreProjects = document.getElementById('restore-projects');
    if (restoreProjects) {
        restoreProjects.addEventListener('click', () => {
            document.getElementById('projects-sidebar')?.classList.remove('collapsed');
            restoreProjects.style.display = 'none';
        });
    }

    // Notes sidebar toggle
    const toggleNotes = document.getElementById('toggle-notes');
    if (toggleNotes) {
        toggleNotes.addEventListener('click', () => {
            const el = document.getElementById('notes-sidebar');
            const rb = document.getElementById('restore-notes');
            el?.classList.toggle('collapsed');
            if (rb) rb.style.display = el?.classList.contains('collapsed') ? 'block' : 'none';
        });
    }

    const restoreNotes = document.getElementById('restore-notes');
    if (restoreNotes) {
        restoreNotes.addEventListener('click', () => {
            document.getElementById('notes-sidebar')?.classList.remove('collapsed');
            restoreNotes.style.display = 'none';
        });
    }

    if (window.initializeRichTextEditor) window.initializeRichTextEditor();
}

// Global
window.loadView = loadView;
