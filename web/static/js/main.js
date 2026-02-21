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
            if (view) {
                const path = view === 'dashboard' ? '/' : `/${view}`;
                history.pushState({ view }, '', path);
                loadView(view);
            }
        });
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        const view = e.state?.view || (window.location.pathname === '/archive' ? 'archive' : 'dashboard');
        loadView(view);
    });

    // Handle initial route
    const initialPath = window.location.pathname;
    if (initialPath === '/archive') {
        loadView('archive');
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.tab === 'archive');
        });
    }
}

function loadView(viewName) {
    if (!viewName) return;
    window.state.view = viewName;
    
    // Hide all views
    document.querySelectorAll('.content-view').forEach(el => el.style.display = 'none');
    
    // Show target view
    const targetId = (viewName === 'archive') ? 'archive' : viewName;
    const target = document.getElementById(targetId);
    
    if (target) {
        // Some views might use flex, others block
        const isTaskView = target.classList.contains('ts-view');
        target.style.display = isTaskView ? 'flex' : 'block';
    }

    // Update active tab in sidebar
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', li.dataset.tab === viewName);
    });

    const titles = {
        'dashboard': 'Dashboard',
        'tasks':     'Task Manager',
        'writing':   'Writing Space',
        'archive':   'Archive Hub',
    };
    
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'LifeOS';

    // Module-specific initializations
    if (viewName === 'tasks' && window.TS?.core) {
        window.TS.core._renderCurrentView();
    }
    if (viewName === 'archive') {
        if (window.Archive && typeof window.Archive.init === 'function') {
            window.Archive.init();
        } else if (window.TS?.core) {
            window.TS.core.switchView('archive');
        }
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
