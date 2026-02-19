// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Rely on window.state being defined in state.js
    if (!window.state) {
        console.error("State module not loaded!");
        return;
    }

    loadView(window.state.view);
    setupNavigation();
    setupEventListeners();
    
    // Initial Data Fetch - using global functions
    if(window.fetchTasks) window.fetchTasks();
    if(window.fetchNotesStructure) window.fetchNotesStructure();
    if(window.loadQuickNote) window.loadQuickNote();
});

// --- Navigation ---
function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.tab;
            loadView(view);
            // Update active state
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function loadView(viewName) {
    window.state.view = viewName;
    document.querySelectorAll('.content-view').forEach(el => el.style.display = 'none');
    
    // Close any open modals when switching views
    const taskModal = document.getElementById('task-modal');
    if(taskModal) taskModal.style.display = 'none';
    
    const target = document.getElementById(viewName);
    if(target) {
        target.style.display = 'block';
    }
    
    const titles = {
        'dashboard': 'Dashboard',
        'tasks': 'Tasks Manager',
        'writing': 'Writing Space',

    };
    const titleEl = document.getElementById('page-title');
    if(titleEl) titleEl.textContent = titles[viewName] || 'LifeOS';
}

// --- Event Listeners ---
function setupEventListeners() {
    // TASKS: Modal Open/Close
    const openBtn = document.getElementById('open-task-modal-btn');
    const cancelBtn = document.getElementById('cancel-create-task');
    const saveBtn = document.getElementById('save-new-task');

    if(openBtn) openBtn.addEventListener('click', () => {
        const modal = document.getElementById('task-modal');
        if(modal) modal.style.display = 'flex';
    });

    if(cancelBtn) cancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('task-modal');
        if(modal) modal.style.display = 'none';
    });

    // Use window.createTask
    if(saveBtn) saveBtn.addEventListener('click', () => {
        if(window.createTask) window.createTask();
        else console.error("createTask function not found");
    });

    // TASKS: Filters
    const filterContainer = document.getElementById('task-filters');
    if(filterContainer) {
        filterContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI
                filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Logic
                window.state.filter = btn.dataset.filter;
                if(window.renderTasks) window.renderTasks();
            });
        });
    }



    // === WRITING SPACE EVENT LISTENERS ===
    
    // New Folder Button
    const newFolderBtn = document.getElementById('new-folder-btn');
    if(newFolderBtn) newFolderBtn.addEventListener('click', () => {
        if(window.createFolder) window.createFolder();
    });

    // New Note Button
    const newNoteBtn = document.getElementById('new-note-btn');
    if(newNoteBtn) newNoteBtn.addEventListener('click', () => {
        if(window.createNote) window.createNote();
    });

    // Close Note Button
    const closeNoteBtn = document.getElementById('close-note-btn');
    if(closeNoteBtn) closeNoteBtn.addEventListener('click', () => {
        if(window.closeNote) window.closeNote();
    });

    // Rename Note Button
    const renameNoteBtn = document.getElementById('rename-note-btn');
    if(renameNoteBtn) renameNoteBtn.addEventListener('click', () => {
        if(window.renameNote) window.renameNote();
    });

    // Toggle Folders Sidebar
    const toggleFoldersBtn = document.getElementById('toggle-folders');
    if(toggleFoldersBtn) toggleFoldersBtn.addEventListener('click', () => {
        const foldersCol = document.getElementById('folders-sidebar');
        const restoreBtn = document.getElementById('restore-folders');
        const separator = document.getElementById('restore-separator');
        if(foldersCol) {
            foldersCol.classList.toggle('collapsed');
            if(restoreBtn) restoreBtn.style.display = foldersCol.classList.contains('collapsed') ? 'block' : 'none';
            if(separator && restoreBtn) separator.style.display = restoreBtn.style.display;
        }
    });

    // Toggle Files Sidebar
    const toggleFilesBtn = document.getElementById('toggle-files');
    if(toggleFilesBtn) toggleFilesBtn.addEventListener('click', () => {
        const filesCol = document.getElementById('files-sidebar');
        const restoreBtn = document.getElementById('restore-files');
        const separator = document.getElementById('restore-separator');
        if(filesCol) {
            filesCol.classList.toggle('collapsed');
            if(restoreBtn) restoreBtn.style.display = filesCol.classList.contains('collapsed') ? 'block' : 'none';
            if(separator && restoreBtn) separator.style.display = restoreBtn.style.display;
        }
    });

    // Restore Folders Sidebar
    const restoreFoldersBtn = document.getElementById('restore-folders');
    if(restoreFoldersBtn) restoreFoldersBtn.addEventListener('click', () => {
        const foldersCol = document.getElementById('folders-sidebar');
        if(foldersCol) {
            foldersCol.classList.remove('collapsed');
            restoreFoldersBtn.style.display = 'none';
            const separator = document.getElementById('restore-separator');
            const otherRestore = document.getElementById('restore-files');
            if(separator && (!otherRestore || otherRestore.style.display === 'none')) {
                separator.style.display = 'none';
            }
        }
    });

    // Restore Files Sidebar
    const restoreFilesBtn = document.getElementById('restore-files');
    if(restoreFilesBtn) restoreFilesBtn.addEventListener('click', () => {
        const filesCol = document.getElementById('files-sidebar');
        if(filesCol) {
            filesCol.classList.remove('collapsed');
            restoreFilesBtn.style.display = 'none';
            const separator = document.getElementById('restore-separator');
            const otherRestore = document.getElementById('restore-folders');
            if(separator && (!otherRestore || otherRestore.style.display === 'none')) {
                separator.style.display = 'none';
            }
        }
    });

    // Rich Text Editor Initialization
    if(window.initializeRichTextEditor) window.initializeRichTextEditor();

    // Auto-save Editor Content
    const editor = document.querySelector('.rich-editor');
    if(editor) {
        let saveTimeout;
        editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            const saveStatus = document.querySelector('.save-status');
            if(saveStatus) saveStatus.textContent = 'Saving...';
            
            saveTimeout = setTimeout(() => {
                if(window.saveCurrentNote) window.saveCurrentNote();
            }, 2000);
        });
    }

    // Title Input Auto-update
    const titleInput = document.querySelector('.note-title-input');
    if(titleInput) {
        titleInput.addEventListener('blur', () => {
            if(window.state.currentNote && titleInput.value) {
                const newFilename = titleInput.value.endsWith('.txt') ? titleInput.value : titleInput.value + '.txt';
                if(newFilename !== window.state.currentNote.name) {
                    // Future: Rename functionality
                    console.log('Title changed to:', newFilename);
                }
            }
        });
    }

    // === ADVANCED WRITING FEATURES ===
    
    // Text Direction Toggle
    const textDirectionBtn = document.getElementById('toggle-text-direction');
    if(textDirectionBtn) textDirectionBtn.addEventListener('click', () => {
        if(window.toggleTextDirection) window.toggleTextDirection();
    });

    // View Mode Toggle (List/Thumbnail)
    const viewModeBtn = document.getElementById('toggle-view-mode');
    if(viewModeBtn) viewModeBtn.addEventListener('click', () => {
        if(window.toggleViewMode) window.toggleViewMode();
    });

    // Focus Mode Toggle
    const focusModeBtn = document.getElementById('toggle-focus-mode');
    if(focusModeBtn) focusModeBtn.addEventListener('click', () => {
        if(window.toggleFocusMode) window.toggleFocusMode();
    });

    // Initialize Advanced Features
    if(typeof window.initializeAdvancedFeatures === 'function') window.initializeAdvancedFeatures();
}

// Global scope helpers
window.loadView = loadView;
