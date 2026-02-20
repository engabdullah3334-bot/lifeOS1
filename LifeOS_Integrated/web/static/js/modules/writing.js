
// --- Writing Space Logic ---

// State Helpers
// We rely on window.state.notesStructure from state.js

// Per-file formatting isolation — each file has its own toolbar/formatting instance
const getFileId = (file) => file ? `${file.folder || ''}/${file.name || ''}` : null;

const DEFAULT_FORMATTING = {
  formatBlock: 'p',
  fontSize: '3',
  fontFamily: 'inherit',
  fontColor: '#f2f4ff',
  editorBackground: null,  // null = use default
  overlayOpacity: '0'
};

const DEFAULT_EDITOR_BG = { type: 'color', value: '#0b0f1a' };

let noteFormattingCache = {};

function resetToolbarToDefaults() {
  const formatBlock = document.getElementById('format-block');
  const fontSize = document.getElementById('font-size');
  const fontFamily = document.getElementById('font-family');
  const fontColorPicker = document.getElementById('font-color-picker');
  if (formatBlock) formatBlock.value = DEFAULT_FORMATTING.formatBlock;
  if (fontSize) fontSize.value = DEFAULT_FORMATTING.fontSize;
  if (fontFamily) fontFamily.value = DEFAULT_FORMATTING.fontFamily;
  if (fontColorPicker) fontColorPicker.value = DEFAULT_FORMATTING.fontColor;
}

function restoreToolbarFromCache(file) {
  const fileId = getFileId(file);
  if (!fileId) {
    resetToolbarToDefaults();
    resetEditorBackground();
    return;
  }
  const cached = noteFormattingCache[fileId] || DEFAULT_FORMATTING;
  const formatBlock = document.getElementById('format-block');
  const fontSize = document.getElementById('font-size');
  const fontFamily = document.getElementById('font-family');
  const fontColorPicker = document.getElementById('font-color-picker');
  if (formatBlock && cached.formatBlock) formatBlock.value = cached.formatBlock;
  if (fontSize && cached.fontSize) fontSize.value = cached.fontSize;
  if (fontFamily && cached.fontFamily) fontFamily.value = cached.fontFamily;
  if (fontColorPicker && cached.fontColor) fontColorPicker.value = cached.fontColor;

  // Restore per-file editor background
  restoreEditorBackground(file);
}

function saveCurrentFileFormattingToCache() {
  const file = window.state?.currentNote;
  if (!file) return;
  const fileId = getFileId(file);
  if (!fileId) return;
  const formatBlock = document.getElementById('format-block');
  const fontSize = document.getElementById('font-size');
  const fontFamily = document.getElementById('font-family');
  const fontColorPicker = document.getElementById('font-color-picker');
  const overlayInput = document.getElementById('bg-overlay-opacity');
  noteFormattingCache[fileId] = {
    ...(noteFormattingCache[fileId] || {}),
    formatBlock: formatBlock?.value || DEFAULT_FORMATTING.formatBlock,
    fontSize: fontSize?.value || DEFAULT_FORMATTING.fontSize,
    fontFamily: fontFamily?.value || DEFAULT_FORMATTING.fontFamily,
    fontColor: fontColorPicker?.value || DEFAULT_FORMATTING.fontColor,
    editorBackground: noteFormattingCache[fileId]?.editorBackground ?? null,
    overlayOpacity: overlayInput?.value ?? noteFormattingCache[fileId]?.overlayOpacity ?? DEFAULT_FORMATTING.overlayOpacity
  };
}

// Fetch and Render Structure
async function fetchNotesStructure() {
    try {
        const res = await fetch(`${window.API_URL}/notes/structure`);
        if(res.ok) {
            window.state.notesStructure = await res.json();
            renderFolders();
            // Re-render current files if valid
            if(window.state.currentFolder && window.state.notesStructure[window.state.currentFolder]) {
                renderFiles(window.state.notesStructure[window.state.currentFolder]);
            } else if (window.state.currentFolder) {
                // Folder might have been deleted
                window.state.currentFolder = null;
                
                // Hide Files Column
                const filesCol = document.getElementById('files-sidebar');
                if(filesCol) filesCol.style.visibility = 'hidden';
                
                const restoreBtn = document.getElementById('restore-files');
                if(restoreBtn) restoreBtn.style.display = 'none';

                renderFolders();
            }
        }
    } catch(e) { console.error("Error fetching notes structure:", e); }
}

function renderFolders() {
    const list = document.getElementById('folder-list');
    if(!list) return;
    list.innerHTML = '';
    
    // Add Archive explicitly if not in structure or just sort keys
    const folders = Object.keys(window.state.notesStructure).sort();
    
    folders.forEach(folder => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="folder-item-content">
                <span class="icon">📂</span> ${folder}
            </div>
            <button class="delete-folder-btn" title="Delete Folder">×</button>
        `;
        if(window.state.currentFolder === folder) li.classList.add('active');
        
        // Select Folder
        li.querySelector('.folder-item-content').addEventListener('click', () => selectFolder(folder));
        
        // Delete Folder
        li.querySelector('.delete-folder-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFolder(folder);
        });
        
        list.appendChild(li);
    });
}

function selectFolder(folder) {
    window.state.currentFolder = folder;
    closeNote(); // Hide editor and clear selection
    
    // Show Files Column
    const filesCol = document.getElementById('files-sidebar');
    if(filesCol) filesCol.style.visibility = 'visible';

    renderFolders(); // Update active state
    renderFiles(window.state.notesStructure[folder] || []);
}

function renderFiles(files) {
    const list = document.getElementById('file-list');
    if(!list) return;
    list.innerHTML = '';

    // Date formatter
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    files.forEach(file => {
        const isNote = file.name.endsWith('.txt') || file.name.endsWith('.md');
        const displayName = file.name.replace(/\.[^/.]+$/, "");
        const dateDisplay = file.date ? formatDate(file.date) : '';
        
        const li = document.createElement('li');
        
        // Check if Thumbnail View is active
        const isThumbnail = list.classList.contains('thumbnail-view');
        
        if (isThumbnail) {
             li.innerHTML = `
                <div class="file-card">
                    <div class="file-icon">📝</div>
                    <div class="file-info">
                        <span class="file-name">${displayName}</span>
                        <span class="file-date">${dateDisplay}</span>
                    </div>
                    <button class="delete-note-btn" title="Delete Note">×</button>
                </div>
            `;
        } else {
             li.innerHTML = `
                <div class="file-item-content">
                    <span class="icon">📝</span> 
                    <div class="file-details">
                        <span class="file-name">${displayName}</span>
                        <span class="file-date">${dateDisplay}</span>
                    </div>
                </div>
                <button class="delete-note-btn" title="Delete Note">×</button>
            `;
        }
       
        if(window.state.currentNote && window.state.currentNote.name === file.name && window.state.currentNote.folder === file.folder) {
            li.classList.add('active');
        }
        
        // Open Note
        const clickTarget = isThumbnail ? li.querySelector('.file-card') : li.querySelector('.file-item-content');
        clickTarget.addEventListener('click', () => openNote(file));
        
        // Delete Note
        li.querySelector('.delete-note-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(file.folder, file.name);
        });
        
        list.appendChild(li);
    });
}

async function openNote(file) {
    if(!file) return;

    // Save current note first to avoid losing changes and formatting bleed
    if (window.state.currentNote && (window.state.currentNote.name !== file.name || window.state.currentNote.folder !== file.folder)) {
        saveCurrentFileFormattingToCache();
        await saveCurrentNote();
    }
    
    // UI Updates
    const emptyState = document.getElementById('editor-empty-state'); // Should be removed in HTML but check just in case
    const closeBtn = document.getElementById('close-note-btn');
    const editor = document.querySelector('.rich-editor');
    const titleInput = document.querySelector('.note-title-input');
    const editorContainer = document.querySelector('.editor-container'); // Ensure this is visible
    
    if(emptyState) emptyState.style.display = 'none';
    if(closeBtn) closeBtn.style.display = 'flex';
    if(closeBtn) closeBtn.style.display = 'flex';
    if(editorContainer) editorContainer.style.visibility = 'visible'; // Make sure editor is visible
    
    if(editor) {
        editor.contentEditable = "true";
        editor.innerHTML = '<p class="loading-placeholder">Loading...</p>';
    }
    
    // Show Editor Column
    const editorCol = document.getElementById('editor-column');
    if(editorCol) editorCol.style.visibility = 'visible';
    
    window.state.currentNote = file;
    
    try {
        const url = `${window.API_URL}/notes/content?folder=${encodeURIComponent(file.folder)}&filename=${encodeURIComponent(file.name)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        // Guard against race conditions
        if (!window.state.currentNote || window.state.currentNote.name !== file.name || window.state.currentNote.folder !== file.folder) {
            return;
        }

        if(editor) editor.innerHTML = data.content || '<p>Start writing...</p>';
        if(titleInput) titleInput.value = file.name.replace(/\.[^/.]+$/, "");
        
        // Restore per-file toolbar state — isolate formatting to this file only
        restoreToolbarFromCache(file);
        
        const saveStatus = document.querySelector('.save-status');
        if(saveStatus) {
            saveStatus.textContent = "Saved";
            saveStatus.style.display = 'inline';
        }

        // Re-render to highlight active note
         if(window.state.currentFolder) renderFiles(window.state.notesStructure[window.state.currentFolder] || []);
        
    } catch(e) {
        console.error("Failed to open note:", e);
        if(editor) editor.innerHTML = '<p style="color:red">Error loading note.</p>';
    }
}

function closeNote() {
    saveCurrentFileFormattingToCache();
    window.state.currentNote = null;
    resetToolbarToDefaults();
    resetEditorBackground();
    const emptyState = document.getElementById('editor-empty-state');
    const closeBtn = document.getElementById('close-note-btn');
    const editor = document.querySelector('.rich-editor');
    const titleInput = document.querySelector('.note-title-input');
    
    // In the new design, we might want to "hide" the editor or show empty state
    // Per user request, "Hide this screen" -> maybe just blank or specific state
    // But we removed the empty state div. So just clear editor.
    
    if(closeBtn) closeBtn.style.display = 'none';
    if(editor) {
        editor.contentEditable = "false";
        editor.innerHTML = ''; 
    }
    if(titleInput) titleInput.value = '';

    // Hide Editor Column
    const editorCol = document.getElementById('editor-column');
    if(editorCol) editorCol.style.visibility = 'hidden';
    
    // Deselect in sidebar
    if(window.state.currentFolder) renderFiles(window.state.notesStructure[window.state.currentFolder] || []);
}

// --- CRUD Operations with Duplicate Handling ---

async function createFolder() {
    let folderName = prompt("New Folder Name:");
    if(!folderName) return;
    
    // Check duplicates
    if (window.state.notesStructure && window.state.notesStructure[folderName]) {
        // Simple auto-increment logic on client side pre-check (optional, but backend handles it too or we do it here)
        // Let's do it here to show user immediately
        let counter = 2;
        let baseName = folderName;
        while (window.state.notesStructure[folderName]) {
             folderName = `${baseName} (${counter})`;
             counter++;
        }
    }
    
    try {
        const res = await fetch(`${window.API_URL}/folders`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({folder_name: folderName})
        });
        if(res.ok) {
            window.state.currentFolder = folderName;
            fetchNotesStructure();
        }
    } catch(e) { console.error(e); }
}

async function createNote(title) {
    if(!title) title = prompt("Note Title:");
    if(!title) return;
    if(!window.state.currentFolder) return alert("Select a folder first!");

    let filename = title.endsWith('.txt') ? title : title + '.txt';
    let displayTitle = filename.replace('.txt', '');
    
    // Check duplicates
    const files = window.state.notesStructure[window.state.currentFolder] || [];
    let counter = 2;
    let baseDisplay = displayTitle;
    
    const exists = (name) => files.some(f => f.name === name);
    
    while(exists(filename)) {
        displayTitle = `${baseDisplay} (${counter})`;
        filename = `${displayTitle}.txt`;
        counter++;
    }

    try {
        const res = await fetch(`${window.API_URL}/notes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                folder: window.state.currentFolder,
                filename: filename,
                content: '<p>Start writing...</p>'
            })
        });
        
        if(res.ok) {
            await fetchNotesStructure();
            // Open the new note
            const newNote = {name: filename, folder: window.state.currentFolder};
            openNote(newNote);
        } else {
            const err = await res.json();
            alert(err.error || "Failed to create note");
        }
    } catch(e) { console.error(e); }
}

async function renameNote() {
    if (!window.state.currentNote) return;
    
    const currentName = window.state.currentNote.name;
    const currentDisplay = currentName.replace(/\.[^/.]+$/, "");
    
    const newDisplay = prompt("Rename note to:", currentDisplay);
    if (!newDisplay || newDisplay === currentDisplay) return;
    
    const newFilename = newDisplay.endsWith('.txt') ? newDisplay : newDisplay + '.txt';
    
    // Check if new name exists
    const files = window.state.notesStructure[window.state.currentNote.folder] || [];
    if (files.some(f => f.name === newFilename)) {
        // Auto-increment rename? Or just warn? User likely wants specific name.
        // Let's warn for rename.
        alert("A file with this name already exists in this folder.");
        return;
    }

    try {
        const res = await fetch(`${window.API_URL}/notes/rename`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                folder: window.state.currentNote.folder,
                old_filename: currentName,
                new_filename: newFilename
            })
        });
        
        if (res.ok) {
            // Update state
            window.state.currentNote.name = newFilename;
            const titleInput = document.querySelector('.note-title-input');
            if(titleInput) titleInput.value = newDisplay;
            
            fetchNotesStructure();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to rename");
        }
    } catch(e) { console.error("Rename Error:", e); }
}

async function deleteFolder(folderName) {
    if(!confirm(`Delete folder "${folderName}" and all its contents?`)) return;
    try {
        const res = await fetch(`${window.API_URL}/folders`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({folder_name: folderName})
        });
        if(res.ok) {
            if(window.state.currentFolder === folderName) {
                window.state.currentFolder = null;
                closeNote();
            }
            fetchNotesStructure();
        }
    } catch(e) { console.error(e); }
}

async function deleteNote(folder, filename) {
    if(!confirm(`Delete note "${filename}"?`)) return;
    try {
        const res = await fetch(`${window.API_URL}/notes`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({folder, filename})
        });
        if(res.ok) {
            if(window.state.currentNote && window.state.currentNote.name === filename && window.state.currentNote.folder === folder) {
                closeNote();
            }
            fetchNotesStructure();
        }
    } catch(e) { console.error(e); }
}

async function saveCurrentNote() {
    if(!window.state.currentNote) return;
    const editor = document.querySelector('.rich-editor');
    const content = editor ? editor.innerHTML : '';
    const saveStatus = document.querySelector('.save-status');
    if(saveStatus) saveStatus.textContent = "Saving...";
    
    try {
        const res = await fetch(`${window.API_URL}/notes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                folder: window.state.currentNote.folder,
                filename: window.state.currentNote.name,
                content
            })
        });
        if(res.ok && saveStatus) saveStatus.textContent = "Saved";
    } catch(e) {
        console.error(e);
        if(saveStatus) saveStatus.textContent = "Error";
    }
}

// --- Rich Text Logic ---

function initializeRichTextEditor() {
    const toolbarButtons = document.querySelectorAll('.toolbar-btn[data-command]');
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.state.currentNote) return;
            document.execCommand(btn.dataset.command, false, null);
            updateToolbarState();
            saveCurrentFileFormattingToCache();
        });
    });
    
    const formatBlock = document.getElementById('format-block');
    if(formatBlock) formatBlock.addEventListener('change', (e) => {
        if (!window.state.currentNote) return;
        document.execCommand('formatBlock', false, e.target.value);
        updateToolbarState();
        saveCurrentFileFormattingToCache();
    });
    
    const fontSize = document.getElementById('font-size');
    if(fontSize) fontSize.addEventListener('change', (e) => {
        if (!window.state.currentNote) return;
        document.execCommand('fontSize', false, e.target.value);
        updateToolbarState();
        saveCurrentFileFormattingToCache();
    });

    const fontFamily = document.getElementById('font-family');
    if(fontFamily) fontFamily.addEventListener('change', (e) => {
        if (!window.state.currentNote) return;
        document.execCommand('fontName', false, e.target.value);
        updateToolbarState();
    // --- NEW: Font Family ---
        saveCurrentFileFormattingToCache();
    });

    const fontColorBtn = document.getElementById('font-color-btn');
    const fontColorPicker = document.getElementById('font-color-picker');
    if(fontColorBtn && fontColorPicker) {
        fontColorBtn.addEventListener('click', () => fontColorPicker.click());
    // --- NEW: Font Color ---
        fontColorPicker.addEventListener('input', (e) => {
            if (!window.state.currentNote) return;
            document.execCommand('foreColor', false, e.target.value);
            saveCurrentFileFormattingToCache();
        });
    }

    // --- Reset Style on Enter: use per-file defaults ---
    const editor = document.querySelector('.rich-editor');
                // Allow default Enter behavior (new paragraph)
    if(editor) {
        editor.addEventListener('keydown', (e) => {
                    // Reset styles for the new line
            if (e.key === 'Enter' && !e.shiftKey) {
                setTimeout(() => {
                    document.execCommand('removeFormat', false, null);
                    document.execCommand('foreColor', false, DEFAULT_FORMATTING.fontColor);
                    document.execCommand('fontName', false, DEFAULT_FORMATTING.fontFamily);
                    document.execCommand('fontSize', false, DEFAULT_FORMATTING.fontSize);
                }, 0);
            }
        });
    }

    initializeBackgroundSettings();
}

// --- Background Settings Logic ---
function initializeBackgroundSettings() {
    const toggleBtn = document.getElementById('toggle-bg-settings');
    const panel = document.getElementById('bg-settings-panel');
    const closeBtn = document.getElementById('close-bg-settings');
    
    if(toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
             panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    if(closeBtn && panel) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }

    // Solid Colors
    document.querySelectorAll('.color-dot').forEach(btn => {
        btn.style.background = btn.dataset.bg; // Show the color!
        btn.addEventListener('click', () => setEditorBackground({ type: 'color', value: btn.dataset.bg }));
    });
    
    // Gradients
    document.querySelectorAll('.gradient-preview').forEach(btn => {
        btn.style.backgroundImage = btn.dataset.bg; // Show the gradient!
        btn.addEventListener('click', () => setEditorBackground({ type: 'gradient', value: btn.dataset.bg }));
    });
    
    const customColor = document.getElementById('custom-bg-color');
    if(customColor) customColor.addEventListener('input', (e) => setEditorBackground({ type: 'color', value: e.target.value }));

    // Image Upload
    const uploadBtn = document.getElementById('upload-bg-btn');
    const fileInput = document.getElementById('bg-image-input');
    const removeImgBtn = document.getElementById('remove-bg-image');
    
    if(uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setEditorBackground({ type: 'image', value: `url('${event.target.result}')` });
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if(removeImgBtn) {
        removeImgBtn.addEventListener('click', () => {
            setEditorBackground({ type: 'color', value: '#0b0f1a' }); // Default
        });
    }

    // Overlay Opacity — per-file, saved to cache
    const opacityInput = document.getElementById('bg-overlay-opacity');
    if(opacityInput) {
        opacityInput.addEventListener('input', (e) => {
             const val = e.target.value;
             document.documentElement.style.setProperty('--overlay-opacity', val);
             const file = window.state?.currentNote;
             if (file) {
                 const fileId = getFileId(file);
                 if (fileId) {
                     noteFormattingCache[fileId] = noteFormattingCache[fileId] || {};
                     noteFormattingCache[fileId].overlayOpacity = val;
                 }
             }
        });
    }
}

function applyEditorBackgroundToContainer(settings) {
  const container = document.querySelector('.editor-container');
  if (!container) return;
  if (!settings || !settings.type) {
    container.style.background = '';
    container.style.backgroundImage = '';
    container.style.backgroundSize = '';
    container.style.backgroundPosition = '';
    return;
  }
  if (settings.type === 'color' || settings.type === 'gradient') {
    container.style.background = settings.value;
    container.style.backgroundImage = settings.value;
  } else if (settings.type === 'image') {
    container.style.backgroundImage = settings.value;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
  }
}

function setEditorBackground(settings) {
  const container = document.querySelector('.editor-container');
  if (!container) return;

  applyEditorBackgroundToContainer(settings);

  // Save to current file's cache only (per-file isolation)
  const file = window.state?.currentNote;
  if (file) {
    const fileId = getFileId(file);
    if (fileId) {
      noteFormattingCache[fileId] = noteFormattingCache[fileId] || {};
      noteFormattingCache[fileId].editorBackground = settings;
    }
  }
}

function restoreEditorBackground(file) {
  const fileId = getFileId(file);
  const overlayInput = document.getElementById('bg-overlay-opacity');
  if (!fileId) {
    resetEditorBackground();
    return;
  }
  const cached = noteFormattingCache[fileId];
  const bg = cached?.editorBackground ?? null;
  const opacity = cached?.overlayOpacity ?? DEFAULT_FORMATTING.overlayOpacity;

  applyEditorBackgroundToContainer(bg);
  document.documentElement.style.setProperty('--overlay-opacity', opacity);
  if (overlayInput) overlayInput.value = opacity;
}

function resetEditorBackground() {
  applyEditorBackgroundToContainer(null);
  document.documentElement.style.setProperty('--overlay-opacity', DEFAULT_FORMATTING.overlayOpacity);
  const overlayInput = document.getElementById('bg-overlay-opacity');
  if (overlayInput) overlayInput.value = DEFAULT_FORMATTING.overlayOpacity;
}

// loadBackgroundSettings removed — backgrounds are now per-file in noteFormattingCache

function updateToolbarState() {
    const editor = document.querySelector('.rich-editor');
    if(!editor) return;
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
        const command = btn.dataset.command;
        if(document.queryCommandState(command)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// --- Quick Note ---
async function loadQuickNote() {
    // Textarea stays empty for new captures; previous notes are stored in file
    const saveBtn = document.getElementById('save-quick-note');
    if(saveBtn) saveBtn.addEventListener('click', saveQuickNote);
}

async function saveQuickNote() {
    const noteArea = document.getElementById('quick-note-area');
    const content = (noteArea?.value || '').trim();
    if (!content) return;

    const btn = document.getElementById('save-quick-note');
    const origText = btn?.textContent || 'Save';
    if (btn) btn.textContent = '...';

    try {
        let finalContent = content;
        try {
            const res = await fetch(`${window.API_URL}/notes/content?folder=System&filename=QuickNote`);
            if (res.ok) {
                const data = await res.json();
                const existing = (data.content || '').trim();
                if (existing) {
                    const sep = '\n\n---\n';
                    const timestamp = new Date().toLocaleString();
                    finalContent = existing + sep + `[${timestamp}] ` + content;
                }
            }
        } catch (_) { /* no existing note */ }

        await fetch(`${window.API_URL}/notes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({folder: "System", filename: "QuickNote", content: finalContent})
        });

        noteArea.value = '';
        if (btn) {
            btn.textContent = 'Saved';
            setTimeout(() => { btn.textContent = origText; }, 1800);
        }
    } catch (e) {
        console.error('Quick note save failed:', e);
        if (btn) btn.textContent = origText;
    }
}

// --- Advanced Features (Focus, RTL, Views) ---

function toggleTextDirection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    
    // If text node, get parent
    if (node.nodeType === 3) node = node.parentNode;

    // Traverse up to find a block element inside the editor
    const editor = document.querySelector('.rich-editor');
    while (node && node !== editor && node.nodeName !== 'DIV' && node.nodeName !== 'P' && !/^H[1-6]$/.test(node.nodeName) && node.nodeName !== 'LI') {
        node = node.parentNode;
    }
    
    // If we hit the editor root or found a block inside it
    if (node && (node === editor || editor.contains(node))) {
        // If node is editor itself, wrap content in a div or just check lines? 
        // Better: if selection is just cursor in editor with no block, formatBlock 'div' first
        if (node === editor) {
             document.execCommand('formatBlock', false, 'div');
             // Re-get selection node
             node = window.getSelection().anchorNode;
             if(node.nodeType === 3) node = node.parentNode;
             while(node && node.nodeName !== 'DIV') node = node.parentNode;
        }

        if (node && node.setAttribute) {
            const currentDir = node.getAttribute('dir') || 'ltr';
            const newDir = currentDir === 'ltr' ? 'rtl' : 'ltr';
            node.setAttribute('dir', newDir);
            
            // Also align text for better UX
            node.style.textAlign = newDir === 'rtl' ? 'right' : 'left';
        }
    }
    
    // Update button visual state (optional, tricky for mixed content)
    const btn = document.getElementById('toggle-text-direction');
    // We don't flip the button for block-level changes usually, or only if current block is rtl
}

function toggleViewMode() {
    const fileList = document.getElementById('file-list');
    const folderList = document.getElementById('folder-list');
    if(fileList) fileList.classList.toggle('thumbnail-view');
    if(folderList) folderList.classList.toggle('thumbnail-view');
    renderFolders(); // Re-render to apply new view classes/HTML
    if(window.state.currentFolder) renderFiles(window.state.notesStructure[window.state.currentFolder] || []);
}

let focusMode = false;
let focusExitZones = [];

function toggleFocusMode() {
    const layout = document.querySelector('.writing-layout');
    if(!layout) return;
    focusMode = !focusMode;
    if(focusMode) enterFocusMode(layout);
    else exitFocusMode(layout);
}

function enterFocusMode(layout) {
    layout.classList.add('focus-mode');
    const positions = ['top', 'left', 'right', 'bottom'];
    positions.forEach(pos => {
        const zone = document.createElement('div');
        zone.className = `focus-exit-zone ${pos}`;
        zone.innerHTML = '<button class="focus-exit-btn" onclick="window.toggleFocusMode()">Exit Focus Mode (ESC)</button>';
        document.body.appendChild(zone);
        focusExitZones.push(zone);
    });
    document.addEventListener('mousemove', handleFocusModeMouseMove);
    document.addEventListener('keydown', handleFocusModeEscape);
}

function exitFocusMode(layout) {
    layout.classList.remove('focus-mode');
    focusExitZones.forEach(zone => zone.remove());
    focusExitZones = [];
    document.removeEventListener('mousemove', handleFocusModeMouseMove);
    document.removeEventListener('keydown', handleFocusModeEscape);
}

function handleFocusModeMouseMove(e) {
    const threshold = 50;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    // Check if mouse is near edges
    const nearTop = clientY < threshold;
    const nearLeft = clientX < threshold;
    const nearRight = clientX > innerWidth - threshold;
    const nearBottom = clientY > innerHeight - threshold;
    
    focusExitZones.forEach(zone => {
        const pos = zone.className.split(' ').find(p => ['top', 'left', 'right', 'bottom'].includes(p));
        const shouldShow = (pos === 'top' && nearTop) ||
                          (pos === 'left' && nearLeft) ||
                          (pos === 'right' && nearRight) ||
                          (pos === 'bottom' && nearBottom);
        
        if(shouldShow) zone.classList.add('active');
        else zone.classList.remove('active');
    });
}

function handleFocusModeEscape(e) {
    if(e.key === 'Escape' && focusMode) toggleFocusMode();
}


// --- WINDOW EXPORTS ---
window.fetchNotesStructure = fetchNotesStructure;
window.createFolder = createFolder;
window.createNote = createNote;
window.renameNote = renameNote;
window.deleteFolder = deleteFolder;
window.deleteNote = deleteNote;
window.closeNote = closeNote;
window.saveCurrentNote = saveCurrentNote;
window.initializeRichTextEditor = initializeRichTextEditor;
window.loadQuickNote = loadQuickNote;
window.toggleTextDirection = toggleTextDirection;
window.toggleViewMode = toggleViewMode;
window.toggleFocusMode = toggleFocusMode;
