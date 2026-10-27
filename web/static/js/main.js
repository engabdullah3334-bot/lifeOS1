// main.js — LifeOS App Entry Point (Updated for new Task System)

// API base URL — used by all modules
window.API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    // ── Legacy state (writing module) ──────────────────────
    if (!window.state) {
        console.warn('Legacy state not loaded');
        window.state = { view: 'dashboard', tasks: [], filter: 'all' };
    }

    // ── Sidebar Toggle ───────────────────────────────────────
    setupSidebar();

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

// ── Sidebar Toggle & Resizing (Mobile Drawer & Desktop Collapse) ────────
function setupSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    const toggleArrow = document.getElementById('sidebar-toggle-arrow');
    const resizer = document.getElementById('sidebar-resizer');

    // Load saved state on desktop
    if (window.innerWidth > 768) {
        const isCollapsed = localStorage.getItem('lifeos_sidebar_collapsed') === 'true';
        if (isCollapsed) sidebar?.classList.add('collapsed');
        
        const savedWidth = localStorage.getItem('lifeos_sidebar_width');
        if (savedWidth && !isCollapsed && sidebar) {
            sidebar.style.width = savedWidth + 'px';
        }
    }

    function openMobileSidebar() {
        sidebar?.classList.add('open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Mobile Hamburger
    hamburger?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            if (sidebar?.classList.contains('open')) closeMobileSidebar();
            else openMobileSidebar();
        }
    });

    // Desktop Arrow Toggle
    toggleArrow?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
        const isNowCollapsed = sidebar?.classList.contains('collapsed');
        localStorage.setItem('lifeos_sidebar_collapsed', isNowCollapsed);
        
        if (!isNowCollapsed) {
            const savedWidth = localStorage.getItem('lifeos_sidebar_width') || 260;
            sidebar.style.width = savedWidth + 'px';
        } else {
            sidebar.style.width = ''; // Let CSS handle collapsed width
        }
    });

    overlay?.addEventListener('click', closeMobileSidebar);

    // Sidebar Resizing Logic
    let isResizing = false;
    resizer?.addEventListener('mousedown', (e) => {
        if (sidebar?.classList.contains('collapsed')) return;
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        // Temporarily disable transition during drag for smoothness
        sidebar.style.transition = 'none';
        document.querySelector('.main-content').style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = e.clientX;
        
        if (newWidth < 140) {
            if (!sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
                sidebar.style.width = '';
            }
            return;
        } else {
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }
            if (newWidth < 180) newWidth = 180; // Min width limit when open
            if (newWidth > 500) newWidth = 500; // Max width limit
            sidebar.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            // Re-enable transitions
            sidebar.style.transition = '';
            document.querySelector('.main-content').style.transition = '';
            
            const isNowCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('lifeos_sidebar_collapsed', isNowCollapsed);
            if (!isNowCollapsed) {
                localStorage.setItem('lifeos_sidebar_width', sidebar.offsetWidth);
            }
        }
    });

    document.querySelectorAll('.nav-links li, .bottom-settings')?.forEach(el => {
        el.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeMobileSidebar();
        });
    });
}

// ── Navigation ──────────────────────────────────────────────
function setupNavigation() {
    const navLinksContainer = document.querySelector('.nav-links');
    
    // Setup SortableJS for navigation items
    if (typeof Sortable !== 'undefined' && navLinksContainer) {
        Sortable.create(navLinksContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                // Save the new order to localStorage
                const order = Array.from(navLinksContainer.children).map(li => li.dataset.tab);
                localStorage.setItem('lifeos_nav_order', JSON.stringify(order));
            }
        });

        // Restore saved order
        const savedOrder = localStorage.getItem('lifeos_nav_order');
        if (savedOrder) {
            try {
                const orderArr = JSON.parse(savedOrder);
                const items = Array.from(navLinksContainer.children);
                orderArr.forEach(tab => {
                    const item = items.find(li => li.dataset.tab === tab);
                    if (item) navLinksContainer.appendChild(item);
                });
            } catch (e) {
                console.error('Failed to parse nav order', e);
            }
        }
    }

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
    const pathViewMap = {
        '/archive':   'archive',
        '/templates': 'templates',
        '/ai':        'ai-chat',
    };
    
    if (pathViewMap[initialPath]) {
        const view = pathViewMap[initialPath];
        loadView(view);
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.tab === view);
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
        // ai-chat uses flex column layout; tasks use flex too
        const isFlexView = target.classList.contains('ts-view') ||
                           target.classList.contains('ai-chat-view');
        target.style.display = isFlexView ? 'flex' : 'block';
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
        'templates': 'Template Gallery',
        'ai-chat':   'AI Chat',
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
    if (viewName === 'templates' && window.Templates) {
        window.Templates.init();
    }

    // Notify AI module when its page becomes visible
    document.dispatchEvent(new CustomEvent('lifeos:pageChanged', { detail: { page: viewName } }));
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
