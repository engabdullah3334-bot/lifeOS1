/**
 * writing.js — LifeOS Writing/Notes System
 * Cloud Project Management - Projects & Notes
 */

(function() {
  'use strict';

  const getBase = () => (window.API_URL || (window.location.origin + '/api'));
  const SYSTEM_PROJECT_ID = 'system';

  function _notesFetch(url, opts = {}) {
    const token = window.LifeOSApi?.getToken?.();
    const headers = { ...opts.headers };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(url, { ...opts, headers });
  }

  window.state = window.state || {};
  window.state.currentProject = null;
  window.state.currentNote = null;
  window.state.projectsStructure = {};

  const DEFAULT_FORMATTING = {
    formatBlock: 'p',
    fontSize: '3',
    fontFamily: 'inherit',
    fontColor: '#f2f4ff',
    editorBackground: null,
    overlayOpacity: '0'
  };
  let noteFormattingCache = {};

  function getNoteId(note) {
    return note ? (note.note_id || `${note.project_id || ''}/${note.filename || ''}`) : null;
  }

  // ══════════════════════════════════════════════
  //  PROJECTS
  // ══════════════════════════════════════════════

  async function fetchProjectsStructure() {
    try {
      const res = await _notesFetch(`${getBase()}/notes/structure`);
      if (res.ok) {
        window.state.projectsStructure = await res.json();
        renderProjects();
        if (window.state.currentProject && window.state.projectsStructure[window.state.currentProject]) {
          renderNotes(window.state.projectsStructure[window.state.currentProject].notes || []);
        }
      }
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  }

  function renderProjects() {
    const list = document.getElementById('project-list');
    if (!list) return;
    list.innerHTML = '';

    const items = Object.values(window.state.projectsStructure).map(item => item.project);
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    items.forEach(project => {
      const li = document.createElement('li');
      li.className = 'project-item group';
      if (window.state.currentProject === project.project_id) {
        li.classList.add('active');
      }

      const notesCount = window.state.projectsStructure[project.project_id]?.notes?.length || 0;
      const isSystem = project.project_id === SYSTEM_PROJECT_ID;

      li.innerHTML = `
        <div class="project-item-content" data-project-id="${project.project_id}">
          <span class="icon">📁</span>
          <div class="project-info">
            <div class="project-name">${project.name}</div>
            <div class="project-meta">${notesCount} note${notesCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="project-actions">
          <button class="edit-project-btn" title="Edit" data-project-id="${project.project_id}">✎</button>
          ${!isSystem ? `<button class="archive-project-btn" title="Archive" data-project-id="${project.project_id}">📦</button>
          <button class="delete-project-btn" title="Delete" data-project-id="${project.project_id}">×</button>` : '<span class="system-badge">System</span>'}
        </div>
      `;

      li.querySelector('.project-item-content').addEventListener('click', () => selectProject(project.project_id));

      const editBtn = li.querySelector('.edit-project-btn');
      if (editBtn) editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isSystem) editProject(project.project_id, project.name);
      });

      const archiveBtn = li.querySelector('.archive-project-btn');
      if (archiveBtn) archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        archiveProject(project.project_id, !project.archived);
      });

      const deleteBtn = li.querySelector('.delete-project-btn');
      if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(project.project_id);
      });

      list.appendChild(li);
    });
  }

  function selectProject(projectId) {
    window.state.currentProject = projectId;
    closeNote();

    const notesCol = document.getElementById('notes-sidebar');
    if (notesCol) notesCol.style.visibility = 'visible';

    renderProjects();
    const notes = window.state.projectsStructure[projectId]?.notes || [];
    renderNotes(notes);
  }

  async function createProject() {
    const name = prompt("New project name:");
    if (!name || !name.trim()) return;

    try {
      const res = await _notesFetch(`${getBase()}/writing/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      if (res.ok) {
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create project");
      }
    } catch (e) {
      console.error(e);
      alert("Server connection error");
    }
  }

  async function editProject(projectId, currentName) {
    const newName = prompt("Project name:", currentName);
    if (!newName || !newName.trim() || newName === currentName) return;

    try {
      const res = await _notesFetch(`${getBase()}/writing/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (res.ok) {
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update project");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function archiveProject(projectId, archived) {
    try {
      const res = await _notesFetch(`${getBase()}/writing/projects/${projectId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived })
      });

      if (res.ok) {
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to archive");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteProject(projectId) {
    const project = window.state.projectsStructure[projectId]?.project;
    if (!project || project.project_id === SYSTEM_PROJECT_ID) return;

    if (!confirm(`Delete project "${project.name}" and all its notes?`)) return;

    try {
      const res = await _notesFetch(`${getBase()}/writing/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (window.state.currentProject === projectId) {
          window.state.currentProject = null;
          closeNote();
          const notesCol = document.getElementById('notes-sidebar');
          if (notesCol) notesCol.style.visibility = 'hidden';
        }
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete project");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ══════════════════════════════════════════════
  //  NOTES
  // ══════════════════════════════════════════════

  function renderNotes(notes) {
    const list = document.getElementById('note-list');
    if (!list) return;
    list.innerHTML = '';

    notes.forEach(note => {
      const li = document.createElement('li');
      li.className = 'note-item group';
      if (window.state.currentNote && window.state.currentNote.note_id === note.note_id) {
        li.classList.add('active');
      }

      li.innerHTML = `
        <div class="note-item-content" data-note-id="${note.note_id}">
          <span class="icon">📝</span>
          <div class="note-info">
            <div class="note-title">${note.title || note.filename || 'Untitled'}</div>
          </div>
        </div>
        <div class="note-actions">
          <button class="edit-note-btn" title="Edit" data-note-id="${note.note_id}">✎</button>
          <button class="delete-note-btn" title="Delete" data-note-id="${note.note_id}">×</button>
        </div>
      `;

      li.querySelector('.note-item-content').addEventListener('click', () => openNote(note));

      li.querySelector('.edit-note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.state.currentNote && window.state.currentNote.note_id === note.note_id) {
          const titleInput = document.querySelector('.note-title-input');
          if (titleInput) {
            titleInput.focus();
            titleInput.select();
          }
        } else {
          openNote(note);
        }
      });

      li.querySelector('.delete-note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(note.note_id);
      });

      list.appendChild(li);
    });
  }

  async function openNote(note) {
    if (!note || !window.state.currentProject) return;

    if (window.state.currentNote && window.state.currentNote.note_id !== note.note_id) {
      saveCurrentFileFormattingToCache();
      await saveCurrentNote();
    }

    const editor = document.querySelector('.rich-editor');
    const titleInput = document.querySelector('.note-title-input');
    const closeBtn = document.getElementById('close-note-btn');
    const editorCol = document.getElementById('editor-column');

    if (closeBtn) closeBtn.style.display = 'flex';
    if (editorCol) editorCol.style.visibility = 'visible';
    if (editor) {
      editor.contentEditable = "true";
      editor.innerHTML = '<p class="loading-placeholder">Loading...</p>';
    }

    window.state.currentNote = {
      note_id: note.note_id,
      project_id: window.state.currentProject,
      title: note.title,
      filename: note.filename
    };

    try {
      const res = await _notesFetch(`${getBase()}/notes/${note.note_id}`);
      const data = await res.json();

      if (!window.state.currentNote || window.state.currentNote.note_id !== note.note_id) return;

      if (editor) editor.innerHTML = data.content || '<p>Start writing...</p>';
      if (titleInput) titleInput.value = data.title || (data.filename || '').replace(/\.[^/.]+$/, "");

      restoreToolbarFromCache(window.state.currentNote);
      renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
    } catch (e) {
      console.error("Failed to open note:", e);
      if (editor) editor.innerHTML = '<p style="color:red">Error loading note.</p>';
    }
  }

  function closeNote() {
    saveCurrentFileFormattingToCache();
    window.state.currentNote = null;
    resetToolbarToDefaults();
    resetEditorBackground();

    const closeBtn = document.getElementById('close-note-btn');
    const editor = document.querySelector('.rich-editor');
    const titleInput = document.querySelector('.note-title-input');
    const editorCol = document.getElementById('editor-column');

    if (closeBtn) closeBtn.style.display = 'none';
    if (editor) {
      editor.contentEditable = "false";
      editor.innerHTML = '';
    }
    if (titleInput) titleInput.value = '';
    if (editorCol) editorCol.style.visibility = 'hidden';

    if (window.state.currentProject) {
      renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
    }
  }

  async function createNote(title) {
    if (!window.state.currentProject) {
      alert("Please select a project first!");
      return;
    }

    if (!title) title = prompt("Note title:");
    if (!title || !title.trim()) return;

    try {
      const res = await _notesFetch(`${getBase()}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: window.state.currentProject,
          title: title.trim()
        })
      });

      if (res.ok) {
        const newNote = await res.json();
        await fetchProjectsStructure();
        openNote(newNote);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create note");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteNote(noteId) {
    if (!confirm("Delete this note?")) return;

    try {
      const res = await _notesFetch(`${getBase()}/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (window.state.currentNote && window.state.currentNote.note_id === noteId) {
          closeNote();
        }
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete note");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveCurrentNote() {
    if (!window.state.currentNote) return;

    const editor = document.querySelector('.rich-editor');
    const content = editor ? editor.innerHTML : '';
    const titleInput = document.querySelector('.note-title-input');
    const title = titleInput ? titleInput.value.trim() : '';
    const saveStatus = document.querySelector('.save-status');

    if (saveStatus) saveStatus.textContent = "Saving...";

    try {
      const res = await _notesFetch(`${getBase()}/notes/${window.state.currentNote.note_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      });

      if (res.ok && saveStatus) {
        saveStatus.textContent = "Saved";
        const updated = await res.json();
        window.state.currentNote.title = updated.title;
      }
    } catch (e) {
      console.error(e);
      if (saveStatus) saveStatus.textContent = "Error";
    }
  }

  // ══════════════════════════════════════════════
  //  FORMATTING & TOOLBAR
  // ══════════════════════════════════════════════

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

  function restoreToolbarFromCache(note) {
    const noteId = getNoteId(note);
    if (!noteId) {
      resetToolbarToDefaults();
      resetEditorBackground();
      return;
    }
    const cached = noteFormattingCache[noteId] || DEFAULT_FORMATTING;
    const formatBlock = document.getElementById('format-block');
    const fontSize = document.getElementById('font-size');
    const fontFamily = document.getElementById('font-family');
    const fontColorPicker = document.getElementById('font-color-picker');
    if (formatBlock && cached.formatBlock) formatBlock.value = cached.formatBlock;
    if (fontSize && cached.fontSize) fontSize.value = cached.fontSize;
    if (fontFamily && cached.fontFamily) fontFamily.value = cached.fontFamily;
    if (fontColorPicker && cached.fontColor) fontColorPicker.value = cached.fontColor;
    restoreEditorBackground(note);
  }

  function saveCurrentFileFormattingToCache() {
    const note = window.state?.currentNote;
    if (!note) return;
    const noteId = getNoteId(note);
    if (!noteId) return;
    const formatBlock = document.getElementById('format-block');
    const fontSize = document.getElementById('font-size');
    const fontFamily = document.getElementById('font-family');
    const fontColorPicker = document.getElementById('font-color-picker');
    const overlayInput = document.getElementById('bg-overlay-opacity');
    noteFormattingCache[noteId] = {
      ...(noteFormattingCache[noteId] || {}),
      formatBlock: formatBlock?.value || DEFAULT_FORMATTING.formatBlock,
      fontSize: fontSize?.value || DEFAULT_FORMATTING.fontSize,
      fontFamily: fontFamily?.value || DEFAULT_FORMATTING.fontFamily,
      fontColor: fontColorPicker?.value || DEFAULT_FORMATTING.fontColor,
      editorBackground: noteFormattingCache[noteId]?.editorBackground ?? null,
      overlayOpacity: overlayInput?.value ?? noteFormattingCache[noteId]?.overlayOpacity ?? DEFAULT_FORMATTING.overlayOpacity
    };
  }

  function updateToolbarState() {
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      if (document.queryCommandState(command)) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

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
    if (formatBlock) formatBlock.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      document.execCommand('formatBlock', false, e.target.value);
      updateToolbarState();
      saveCurrentFileFormattingToCache();
    });

    const fontSize = document.getElementById('font-size');
    if (fontSize) fontSize.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      document.execCommand('fontSize', false, e.target.value);
      updateToolbarState();
      saveCurrentFileFormattingToCache();
    });

    const fontFamily = document.getElementById('font-family');
    if (fontFamily) fontFamily.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      document.execCommand('fontName', false, e.target.value);
      updateToolbarState();
      saveCurrentFileFormattingToCache();
    });

    const fontColorBtn = document.getElementById('font-color-btn');
    const fontColorPicker = document.getElementById('font-color-picker');
    if (fontColorBtn && fontColorPicker) {
      fontColorBtn.addEventListener('click', () => fontColorPicker.click());
      fontColorPicker.addEventListener('input', (e) => {
        if (!window.state.currentNote) return;
        document.execCommand('foreColor', false, e.target.value);
        saveCurrentFileFormattingToCache();
      });
    }

    const editor = document.querySelector('.rich-editor');
    if (editor) {
      editor.addEventListener('input', () => {
        if (window.state.currentNote) {
          const saveStatus = document.querySelector('.save-status');
          if (saveStatus) saveStatus.textContent = "Unsaved";
        }
      });

      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          setTimeout(() => {
            document.execCommand('removeFormat', false, null);
            document.execCommand('foreColor', false, DEFAULT_FORMATTING.fontColor);
            document.execCommand('fontName', false, DEFAULT_FORMATTING.fontFamily);
            document.execCommand('fontSize', false, DEFAULT_FORMATTING.fontSize);
          }, 0);
        }
      });

      let saveTimeout;
      editor.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          if (window.state.currentNote) saveCurrentNote();
        }, 2000);
      });
    }

    initializeBackgroundSettings();
  }

  function initializeBackgroundSettings() {
    const toggleBtn = document.getElementById('toggle-bg-settings');
    const panel = document.getElementById('bg-settings-panel');
    const closeBtn = document.getElementById('close-bg-settings');
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    }
    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
    }
  }

  function setEditorBackground(settings) {
    const container = document.querySelector('.editor-container');
    if (!container) return;
    if (settings?.type === 'color' || settings?.type === 'gradient') {
      container.style.background = settings.value;
    } else if (settings?.type === 'image') {
      container.style.backgroundImage = settings.value;
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
    }
    const note = window.state?.currentNote;
    if (note) {
      const noteId = getNoteId(note);
      if (noteId) {
        noteFormattingCache[noteId] = noteFormattingCache[noteId] || {};
        noteFormattingCache[noteId].editorBackground = settings;
      }
    }
  }

  function restoreEditorBackground(note) {
    const noteId = getNoteId(note);
    if (!noteId) {
      resetEditorBackground();
      return;
    }
    const cached = noteFormattingCache[noteId];
    const bg = cached?.editorBackground ?? null;
    setEditorBackground(bg);
  }

  function resetEditorBackground() {
    const container = document.querySelector('.editor-container');
    if (container) {
      container.style.background = '';
      container.style.backgroundImage = '';
    }
  }

  // ══════════════════════════════════════════════
  //  QUICK NOTE (Dashboard)
  // ══════════════════════════════════════════════

  window.loadQuickNote = function() {
    const saveBtn = document.getElementById('save-quick-note');
    if (saveBtn) saveBtn.addEventListener('click', saveQuickNote);
  };

  async function saveQuickNote() {
    const noteArea = document.getElementById('quick-note-area');
    const content = (noteArea?.value || '').trim();
    if (!content) return;

    const btn = document.getElementById('save-quick-note');
    const origText = btn?.textContent || 'Save';
    if (btn) btn.textContent = '...';

    try {
      const res = await _notesFetch(`${getBase()}/notes/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        noteArea.value = '';
        if (btn) {
          btn.textContent = 'Saved';
          setTimeout(() => { btn.textContent = origText; }, 1800);
        }
      } else {
        if (btn) btn.textContent = origText;
      }
    } catch (e) {
      console.error('Quick note save failed:', e);
      if (btn) btn.textContent = origText;
    }
  }

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════

  function init() {
    const newProjectBtn = document.getElementById('new-project-btn');
    const newNoteBtn = document.getElementById('new-note-btn');
    const closeNoteBtn = document.getElementById('close-note-btn');
    const renameNoteBtn = document.getElementById('rename-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');

    if (newProjectBtn) newProjectBtn.addEventListener('click', createProject);
    if (newNoteBtn) newNoteBtn.addEventListener('click', () => createNote());
    if (closeNoteBtn) closeNoteBtn.addEventListener('click', closeNote);
    if (renameNoteBtn) renameNoteBtn.addEventListener('click', () => {
      const titleInput = document.querySelector('.note-title-input');
      if (titleInput && window.state.currentNote) {
        titleInput.focus();
        titleInput.select();
      }
    });
    if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', () => {
      if (window.state.currentNote) deleteNote(window.state.currentNote.note_id);
    });

    const titleInput = document.querySelector('.note-title-input');
    if (titleInput) {
      titleInput.addEventListener('blur', () => {
        if (window.state.currentNote) saveCurrentNote();
      });
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleInput.blur();
        }
      });
    }

    initializeRichTextEditor();
    loadQuickNote();
    fetchProjectsStructure();
  }

  window.fetchProjectsStructure = fetchProjectsStructure;
  window.createProject = createProject;
  window.createNote = createNote;
  window.deleteProject = deleteProject;
  window.deleteNote = deleteNote;
  window.closeNote = closeNote;
  window.saveCurrentNote = saveCurrentNote;
  window.initializeRichTextEditor = initializeRichTextEditor;
  window.toggleTextDirection = function() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let node = selection.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    const editor = document.querySelector('.rich-editor');
    while (node && node !== editor) {
      if (node.setAttribute) {
        const currentDir = node.getAttribute('dir') || 'ltr';
        node.setAttribute('dir', currentDir === 'ltr' ? 'rtl' : 'ltr');
        break;
      }
      node = node.parentNode;
    }
  };

  window.toggleViewMode = function() {
    const noteList = document.getElementById('note-list');
    const projectList = document.getElementById('project-list');
    if (noteList) noteList.classList.toggle('thumbnail-view');
    if (projectList) projectList.classList.toggle('thumbnail-view');
    if (window.state.currentProject) {
      renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
    }
  };

  let focusMode = false;
  window.toggleFocusMode = function() {
    const layout = document.querySelector('.writing-layout');
    if (!layout) return;
    focusMode = !focusMode;
    layout.classList.toggle('focus-mode', focusMode);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
