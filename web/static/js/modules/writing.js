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
  window.state.writingSearch = '';
  window.state.noteStatusFilter = 'all';
  let _lastSaveTime = null;

  // ── Toast Notifications (UI2) ──────────────────
  function showToast(msg, type = 'success', duration = 3000) {
    let container = document.getElementById('writing-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'writing-toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    const colors = { success: '#22c55e', error: '#ef4444', info: '#6366f1', warning: '#f59e0b' };
    const icons  = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:#1e1e2e;color:#f2f4ff;padding:10px 16px;border-radius:10px;border-left:3px solid ${colors[type]||colors.info};font-size:0.88rem;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.4);opacity:0;transform:translateX(20px);transition:all 0.25s ease;min-width:200px;max-width:320px;`;
    toast.innerHTML = `<span style="color:${colors[type]||colors.info};font-weight:700">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 280);
    }, duration);
  }

  // ── Confirm Modal (replaces window.confirm) ────
  function showConfirm(msg, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `<div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:28px 32px;max-width:380px;text-align:center;">
      <p style="color:#f2f4ff;margin:0 0 20px;font-size:0.95rem;line-height:1.5;">${msg}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="_confirm-cancel" style="padding:8px 20px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#aaa;cursor:pointer;">Cancel</button>
        <button id="_confirm-ok" style="padding:8px 20px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-weight:600;">Delete</button>
      </div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_confirm-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#_confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // ── Time Ago helper ──────────────────────────
  function timeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 5)  return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  }

  // ── Autosave Indicator (UI3) ─────────────────
  function setSaveStatus(state) {
    const el = document.querySelector('.save-status');
    if (!el) return;
    const map = {
      unsaved: { icon: '●', label: 'Unsaved changes', color: '#f59e0b' },
      saving:  { icon: '⟳', label: 'Saving…',         color: '#6366f1' },
      saved:   { icon: '✓', label: _lastSaveTime ? `Saved ${timeAgo(_lastSaveTime)}` : 'Saved', color: '#22c55e' },
      error:   { icon: '✕', label: 'Save failed',     color: '#ef4444' },
    };
    const s = map[state] || map.saved;
    el.style.color = s.color;
    el.textContent = `${s.icon}  ${s.label}`;
    el.dataset.state = state;
    if (state === 'saved') {
      _lastSaveTime = new Date();
      const interval = setInterval(() => {
        if (el.dataset.state === 'saved') el.textContent = `✓  Saved ${timeAgo(_lastSaveTime)}`;
        else clearInterval(interval);
      }, 30000);
    }
  }

  function parseTagsStr(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  function tagsToStr(tags) {
    return Array.isArray(tags) ? tags.join(', ') : '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeRichHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'];
    blockedTags.forEach((tag) => {
      template.content.querySelectorAll(tag).forEach((node) => node.remove());
    });

    template.content.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || '';
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return template.innerHTML;
  }

  const DEFAULT_FORMATTING = {
    formatBlock: 'p',
    fontSize: '4',
    fontFamily: "'Segoe UI', sans-serif",
    fontColor: '#e8eaf6',
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
            <div class="project-name">${escapeHtml(project.name)}</div>
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
        if (!isSystem) openProjectModal(project);
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
    initSortableWriting();
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

  function openProjectModal(project) {
    const modal = document.getElementById('project-props-modal');
    const form = document.getElementById('project-props-form');
    const idEl = document.getElementById('project-props-id');
    const nameEl = document.getElementById('project-props-name');
    const tagsEl = document.getElementById('project-props-tags');
    const descEl = document.getElementById('project-props-desc');
    const titleEl = document.getElementById('project-props-title');
    if (!modal || !form) return;

    if (project) {
      titleEl.textContent = 'Edit Project';
      idEl.value = project.project_id;
      nameEl.value = project.name || '';
      tagsEl.value = tagsToStr(project.tags);
      descEl.value = project.description || '';
    } else {
      titleEl.textContent = 'New Project';
      idEl.value = '';
      nameEl.value = '';
      tagsEl.value = '';
      descEl.value = '';
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    nameEl.focus();
  }

  function closeProjectModal() {
    document.getElementById('project-props-modal')?.classList.remove('open');
    document.getElementById('project-props-modal')?.setAttribute('aria-hidden', 'true');
  }

  async function createProject() {
    openProjectModal(null);
  }

  async function submitProjectProps(e) {
    e.preventDefault();
    const idEl = document.getElementById('project-props-id');
    const nameEl = document.getElementById('project-props-name');
    const tagsEl = document.getElementById('project-props-tags');
    const descEl = document.getElementById('project-props-desc');
    const name = nameEl?.value?.trim();
    if (!name) return;

    const payload = { name, tags: parseTagsStr(tagsEl?.value), description: descEl?.value?.trim() || '' };

    if (idEl?.value) {
      try {
        const res = await _notesFetch(`${getBase()}/writing/projects/${idEl.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeProjectModal();
          await fetchProjectsStructure();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update project');
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      const res = await _notesFetch(`${getBase()}/writing/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeProjectModal();
        await fetchProjectsStructure();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create project');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openNoteModal(note) {
    const modal = document.getElementById('note-props-modal');
    const form = document.getElementById('note-props-form');
    const idEl = document.getElementById('note-props-id');
    const nameEl = document.getElementById('note-props-name');
    const tagsEl = document.getElementById('note-props-tags');
    const descEl = document.getElementById('note-props-desc');
    const statusEl = document.getElementById('note-props-status');
    const projectNameEl = document.getElementById('note-props-project-name');
    const moveSelect = document.getElementById('note-props-move-project');
    if (!modal || !form) return;

    const projects = Object.values(window.state.projectsStructure).map(i => i.project).filter(p => p.project_id !== SYSTEM_PROJECT_ID);
    moveSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Move to project...';
    moveSelect.appendChild(defaultOption);
    projects.forEach((p) => {
      const option = document.createElement('option');
      option.value = p.project_id;
      option.textContent = p.name || '';
      moveSelect.appendChild(option);
    });

    if (note) {
      document.getElementById('note-props-title').textContent = 'Edit Note';
      idEl.value = note.note_id;
      nameEl.value = note.title || note.filename || '';
      tagsEl.value = tagsToStr(note.tags);
      descEl.value = note.description || '';
      if (statusEl) statusEl.value = note.status || 'draft';
      const proj = window.state.projectsStructure[note.project_id]?.project;
      if (projectNameEl) projectNameEl.textContent = proj ? proj.name : (note.project_id || '—');
      if (moveSelect) moveSelect.value = '';
    } else {
      document.getElementById('note-props-title').textContent = 'New Note';
      idEl.value = '';
      nameEl.value = '';
      tagsEl.value = '';
      descEl.value = '';
      if (statusEl) statusEl.value = 'draft';
      const proj = window.state.currentProject ? window.state.projectsStructure[window.state.currentProject]?.project : null;
      if (projectNameEl) projectNameEl.textContent = proj ? proj.name : '—';
      if (moveSelect) moveSelect.value = '';
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    nameEl.focus();
  }

  function closeNoteModal() {
    document.getElementById('note-props-modal')?.classList.remove('open');
    document.getElementById('note-props-modal')?.setAttribute('aria-hidden', 'true');
  }

  async function submitNoteProps(e) {
    e.preventDefault();
    const idEl = document.getElementById('note-props-id');
    const nameEl = document.getElementById('note-props-name');
    const tagsEl = document.getElementById('note-props-tags');
    const descEl = document.getElementById('note-props-desc');
    const statusEl = document.getElementById('note-props-status');
    const moveSelect = document.getElementById('note-props-move-project');
    const name = nameEl?.value?.trim();
    if (!name) return;

    if (idEl?.value) {
      const payload = { title: name, tags: parseTagsStr(tagsEl?.value), description: descEl?.value?.trim() || '', status: statusEl?.value || 'draft' };
      try {
        const res = await _notesFetch(`${getBase()}/notes/${idEl.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const targetProjectId = moveSelect?.value;
          if (targetProjectId) {
            const moveRes = await _notesFetch(`${getBase()}/notes/${idEl.value}/move`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_id: targetProjectId })
            });
            if (!moveRes.ok) {
              const err = await moveRes.json();
              alert(err.error || 'Move failed');
            }
          }
          closeNoteModal();
          await fetchProjectsStructure();
          if (window.state.currentProject) renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update note');
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!window.state.currentProject) {
      alert('Select a project first');
      return;
    }
    try {
      const res = await _notesFetch(`${getBase()}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: window.state.currentProject,
          title: name,
          tags: parseTagsStr(tagsEl?.value),
          description: descEl?.value?.trim() || '',
          status: statusEl?.value || 'draft'
        })
      });
      if (res.ok) {
        closeNoteModal();
        const newNote = await res.json();
        await fetchProjectsStructure();
        openNote(newNote);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create note');
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

    showConfirm(`Delete project "${project.name}" and ALL its notes? This cannot be undone.`, async () => {
      try {
        const res = await _notesFetch(`${getBase()}/writing/projects/${projectId}`, { method: 'DELETE' });
        if (res.ok) {
          if (window.state.currentProject === projectId) {
            window.state.currentProject = null; closeNote();
            const notesCol = document.getElementById('notes-sidebar');
            if (notesCol) notesCol.style.visibility = 'hidden';
          }
          await fetchProjectsStructure();
          showToast('Project deleted', 'success');
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to delete project', 'error');
        }
      } catch (e) { console.error(e); }
    });
  }

  // ══════════════════════════════════════════════
  //  NOTES
  // ══════════════════════════════════════════════

  function renderNotes(notes) {
    const list = document.getElementById('note-list');
    if (!list) return;
    list.innerHTML = '';

    const search = (window.state.writingSearch || '').toLowerCase();
    (notes || []).forEach(note => {
      const tags = note.tags || [];
      const title = note.title || note.filename || 'Untitled';
      if (search && !matchesSearch(title, tags) && !matchesSearch(note.description, tags)) return;

      const li = document.createElement('li');
      li.className = 'note-item group';
      li.dataset.noteId = note.note_id;
      if (window.state.currentNote && window.state.currentNote.note_id === note.note_id) {
        li.classList.add('active');
      }

      // Status filter (UI7)
      const filterVal = window.state.noteStatusFilter || 'all';
      if (filterVal === 'favorites' && !note.is_favorite) return;
      if (filterVal !== 'all' && filterVal !== 'favorites' && note.status !== filterVal) return;

      const status = note.status || 'draft';
      const statusLabel = status === 'in_review' ? 'Review' : status === 'complete' ? 'Done' : 'Draft';
      const tagsHtml = tags.length
        ? `<div class="note-tags-row">${tags.slice(0, 3).map(t => `<span class="writing-tag-chip">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      const pinnedIcon = note.pinned ? '📌' : '📝';
      const favClass   = note.is_favorite ? 'active' : '';
      li.innerHTML = `
        <div class="note-item-content" data-note-id="${note.note_id}">
          <span class="icon">${pinnedIcon}</span>
          <div class="note-info">
            <div class="note-title-row">
              <span class="note-title">${escapeHtml(title)}</span>
              <span class="note-status-badge ${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>
            </div>
            ${tagsHtml}
          </div>
        </div>
        <div class="note-actions">
          <button class="pin-note-btn ${note.pinned ? 'active' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}" data-note-id="${note.note_id}">📌</button>
          <button class="fav-note-btn ${favClass}" title="${note.is_favorite ? 'Unfavorite' : 'Favorite'}" data-note-id="${note.note_id}">⭐</button>
          <button class="edit-note-btn" title="Edit" data-note-id="${note.note_id}">✎</button>
          <button class="delete-note-btn" title="Delete" data-note-id="${note.note_id}">×</button>
        </div>
      `;

      li.querySelector('.note-item-content').addEventListener('click', () => openNote(note));

      li.querySelector('.pin-note-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const res = await _notesFetch(`${getBase()}/notes/${note.note_id}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ pinned: !note.pinned })
        });
        if (res.ok) { await fetchProjectsStructure(); showToast(note.pinned ? 'Unpinned' : 'Pinned 📌', 'info', 1500); }
      });

      li.querySelector('.fav-note-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const res = await _notesFetch(`${getBase()}/notes/${note.note_id}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ is_favorite: !note.is_favorite })
        });
        if (res.ok) { await fetchProjectsStructure(); showToast(note.is_favorite ? 'Removed from favorites' : 'Added to favorites ⭐', 'info', 1500); }
      });

      li.querySelector('.edit-note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openNoteModal(note);
      });

      li.querySelector('.delete-note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirm('Delete this note? This cannot be undone.', () => deleteNote(note.note_id));
      });

      list.appendChild(li);
    });
    initSortableWriting();
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
    document.querySelector('.writing-layout')?.classList.add('note-open');
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

      if (editor) editor.innerHTML = sanitizeRichHtml(data.content || '<p></p>');
      if (titleInput) titleInput.value = data.title || (data.filename || '').replace(/\.[^/.]+$/, "");

      restoreToolbarFromCache(window.state.currentNote);
      setSaveStatus('saved');
      updateWordCount();  // F1: show word count immediately
      renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
      editor?.focus();
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
    document.querySelector('.writing-layout')?.classList.remove('note-open');

    if (window.state.currentProject) {
      renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
    }
  }

  function createNote() {
    if (!window.state.currentProject) {
      showToast('Please select a project first', 'warning');
      return;
    }
    openNoteModal(null);
  }

  async function deleteNote(noteId) {
    try {
      const res = await _notesFetch(`${getBase()}/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        if (window.state.currentNote?.note_id === noteId) closeNote();
        await fetchProjectsStructure();
        showToast('Note deleted', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete note', 'error');
      }
    } catch (e) { console.error(e); showToast('Network error', 'error'); }
  }

  // F6: Duplicate note
  async function duplicateNote(noteId) {
    try {
      const res = await _notesFetch(`${getBase()}/notes/${noteId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        await fetchProjectsStructure();
        showToast('Note duplicated ✓', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to duplicate', 'error');
      }
    } catch (e) { console.error(e); }
  }

  // F3: Export note
  window.exportCurrentNote = function(format = 'md') {
    if (!window.state.currentNote) return;
    const editor = document.querySelector('.rich-editor');
    let content = editor?.innerHTML || '';
    if (format === 'md') {
      content = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    } else {
      content = editor?.innerText || '';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${window.state.currentNote.title || 'note'}.${format === 'md' ? 'md' : 'txt'}`;
    a.click();
    showToast(`Exported as .${format}`, 'success', 2000);
  };

  async function saveCurrentNote() {
    if (!window.state.currentNote) return;
    const editor = document.querySelector('.rich-editor');
    const content = editor ? sanitizeRichHtml(editor.innerHTML) : '';
    const titleInput = document.querySelector('.note-title-input');
    const title = titleInput ? titleInput.value.trim() : '';

    setSaveStatus('saving');
    try {
      const res = await _notesFetch(`${getBase()}/notes/${window.state.currentNote.note_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      });
      if (res.ok) {
        const updated = await res.json();
        window.state.currentNote.title = updated.title;
        setSaveStatus('saved');
        // F1: update word count
        const stats = updated.stats || {};
        const wcEl = document.getElementById('word-count-indicator');
        if (wcEl) wcEl.textContent = `${stats.word_count || 0} words · ${stats.read_time_min || 1} min read`;
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
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

  // F1: Word count — uses innerText for accuracy (no HTML parsing errors)
  function updateWordCount() {
    const editor = document.querySelector('.rich-editor');
    const wcEl  = document.getElementById('word-count-indicator');
    if (!editor || !wcEl || !window.state.currentNote) return;
    const plain = (editor.innerText || '').trim();
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const readMin = Math.max(1, Math.round(words / 200));
    wcEl.textContent = `${words.toLocaleString()} words · ${readMin} min read`;
  }
  function updateToolbarState() {
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      try {
        if (document.queryCommandState(command)) btn.classList.add('active');
        else btn.classList.remove('active');
      } catch(_) {}
    });
  }

  function initializeRichTextEditor() {
    // ── Event Delegation on document ─────────────────────────────────────
    // This works even if elements are added/replaced after init() runs.
    // ONE mousedown handler covers ALL toolbar buttons.

    if (document._writingToolbarBound) return; // prevent duplicate binding
    document._writingToolbarBound = true;

    document.addEventListener('mousedown', function writingToolbarHandler(e) {
      // ── data-command buttons (Bold/Italic/Underline/Lists/Align…) ──
      const cmdBtn = e.target.closest('.toolbar-btn[data-command]');
      if (cmdBtn) {
        e.preventDefault();
        if (!window.state.currentNote) return;
        const cmd = cmdBtn.dataset.command;
        try { document.execCommand(cmd, false, null); } catch(_) {}
        updateToolbarState();
        saveCurrentFileFormattingToCache();
        return;
      }

      // ── Insert HR ──
      if (e.target.closest('#insert-hr-btn')) {
        e.preventDefault();
        if (!window.state.currentNote) return;
        try { document.execCommand('insertHorizontalRule', false, null); } catch(_) {}
        return;
      }

      // ── Insert Date ──
      if (e.target.closest('#insert-date-btn')) {
        e.preventDefault();
        if (!window.state.currentNote) return;
        const d = new Date().toLocaleDateString('en-GB', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        try { document.execCommand('insertText', false, d); } catch(_) {}
        return;
      }

      // ── Insert Time ──
      if (e.target.closest('#insert-time-btn')) {
        e.preventDefault();
        if (!window.state.currentNote) return;
        const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        try { document.execCommand('insertText', false, t); } catch(_) {}
        return;
      }

      // ── Font Color ──
      if (e.target.closest('#font-color-btn')) {
        e.preventDefault();
        document.getElementById('font-color-picker')?.click();
        return;
      }

      // ── Highlight ──
      if (e.target.closest('#highlight-btn')) {
        e.preventDefault();
        document.getElementById('highlight-color-picker')?.click();
        return;
      }

      // ── More Tools toggle ──
      if (e.target.closest('#toolbar-more-btn')) {
        e.preventDefault();
        const sec = document.getElementById('rich-toolbar-secondary');
        const btn = document.getElementById('toolbar-more-btn');
        if (!sec) return;
        const open = sec.classList.toggle('open');
        btn?.classList.toggle('active', open);
        return;
      }

      // ── Focus Mode ──
      if (e.target.closest('#toggle-focus-mode')) {
        e.preventDefault();
        window.toggleFocusMode?.();
        return;
      }

      // ── Editor Background panel ── (handled in click, not mousedown)
      // ── Toggle text direction ──
      if (e.target.closest('#toggle-text-direction')) {
        e.preventDefault();
        window.toggleTextDirection?.();
        return;
      }
    });

    // ── click events ──────────────────────────────────────────────────
    document.addEventListener('click', function writingClickHandler(e) {
      // ── Toggle BG Settings panel (open/close on single click) ──
      if (e.target.closest('#toggle-bg-settings')) {
        const panel = document.getElementById('bg-settings-panel');
        if (!panel) return;
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        return;
      }

      // Insert Link
      if (e.target.closest('#insert-link-btn')) {
        if (!window.state.currentNote) return;
        const editor = document.querySelector('.rich-editor');
        const sel = window.getSelection()?.toString();
        const url = prompt('🔗 URL:', 'https://');
        if (url) {
          const label = sel || url;
          editor?.focus();
          try {
            document.execCommand('insertHTML', false,
              `<a href="${url}" target="_blank" rel="noopener" style="color:#89b4fa;">${label}</a>`);
          } catch(_) {}
        }
        return;
      }

      // Close bg panel when clicking outside it (but not the toggle button itself)
      if (!e.target.closest('#bg-settings-panel') && !e.target.closest('#toggle-bg-settings')) {
        const panel = document.getElementById('bg-settings-panel');
        if (panel && panel.style.display !== 'none') panel.style.display = 'none';
      }
    }, { capture: false });

    // ── Color pickers ──────────────────────────────────────────────────
    document.getElementById('font-color-picker')?.addEventListener('input', (e) => {
      if (!window.state.currentNote) return;
      document.querySelector('.rich-editor')?.focus();
      try { document.execCommand('foreColor', false, e.target.value); } catch(_) {}
      saveCurrentFileFormattingToCache();
    });

    document.getElementById('highlight-color-picker')?.addEventListener('input', (e) => {
      if (!window.state.currentNote) return;
      document.querySelector('.rich-editor')?.focus();
      try { document.execCommand('hiliteColor', false, e.target.value); } catch(_) {}
      saveCurrentFileFormattingToCache();
    });

    // ── Select elements ────────────────────────────────────────────────
    document.getElementById('format-block')?.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      try { document.execCommand('formatBlock', false, e.target.value); } catch(_) {}
      document.querySelector('.rich-editor')?.focus();
      updateToolbarState();
      saveCurrentFileFormattingToCache();
    });

    document.getElementById('font-size')?.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      try { document.execCommand('fontSize', false, e.target.value); } catch(_) {}
      document.querySelector('.rich-editor')?.focus();
      saveCurrentFileFormattingToCache();
    });

    document.getElementById('font-family')?.addEventListener('change', (e) => {
      if (!window.state.currentNote) return;
      try { document.execCommand('fontName', false, e.target.value); } catch(_) {}
      document.querySelector('.rich-editor')?.focus();
      saveCurrentFileFormattingToCache();
    });

    // ── Editor input events ────────────────────────────────────────────
    const editor = document.querySelector('.rich-editor');
    if (editor) {
      let wcTimeout, saveTimeout;
      editor.addEventListener('input', () => {
        if (window.state.currentNote) setSaveStatus('unsaved');
        clearTimeout(wcTimeout);
        wcTimeout = setTimeout(updateWordCount, 400);
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          if (window.state.currentNote) saveCurrentNote();
        }, 3000);
      });

      editor.addEventListener('keyup', updateToolbarState);
      editor.addEventListener('mouseup', updateToolbarState);
    }

    initializeBackgroundSettings();
  }

  function initializeBackgroundSettings() {
    const panel = document.getElementById('bg-settings-panel');
    const closeBtn = document.getElementById('close-bg-settings');

    // Panel Close
    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
    }

    // Tabs Logic
    const tabs = document.querySelectorAll('.bg-tab');
    const tabContents = document.querySelectorAll('.bg-tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = tab.dataset.target;
        
        // Remove active class from all
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and its content
        tab.classList.add('active');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // Handle Solid Color Presets
    document.querySelectorAll('.color-preset[data-bg]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bg = btn.dataset.bg;
        applyBackgroundToEditor({ type: 'color', value: bg });
      });
    });

    // Handle Custom Color
    const customColorInput = document.getElementById('custom-bg-color');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        applyBackgroundToEditor({ type: 'color', value: e.target.value });
      });
    }

    // Handle Gradient Presets
    document.querySelectorAll('.gradient-preset[data-bg]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bg = btn.dataset.bg;
        applyBackgroundToEditor({ type: 'gradient', value: bg });
      });
    });

    // Handle Image Upload
    const uploadBtn = document.getElementById('upload-bg-btn');
    const fileInput = document.getElementById('bg-image-input');
    const removeBtn = document.getElementById('remove-bg-image');
    
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        applyBackgroundToEditor({ type: 'image', value: `url('${url}')` });
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.querySelector('.editor-container');
        if (container) {
          container.style.removeProperty('background');
          container.style.removeProperty('background-image');
        }
        updateCacheAndToast(null, 'Background image removed', 'info');
      });
    }

    // Handle Overlay Opacity Slider
    const opacitySlider = document.getElementById('bg-overlay-opacity');
    const opacityVal = document.getElementById('opacity-val');
    
    if (opacitySlider && opacityVal) {
      opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const percent = Math.round(val * 100) + '%';
        opacityVal.textContent = percent;
        
        const overlay = document.querySelector('.editor-bg-overlay');
        if (overlay) overlay.style.background = `rgba(0,0,0,${val})`;
        
        // Save opacity to cache
        const note = window.state?.currentNote;
        if (note) {
          const nid = getNoteId(note);
          if (nid) {
            noteFormattingCache[nid] = noteFormattingCache[nid] || {};
            noteFormattingCache[nid].overlayOpacity = val;
            saveCurrentFileFormattingToCache();
          }
        }
      });
    }
  }

  function applyBackgroundToEditor(settings) {
    const container = document.querySelector('.editor-container');
    if (!container) return;

    if (settings.type === 'color' || settings.type === 'gradient') {
      container.style.setProperty('background', settings.value, 'important');
      container.style.removeProperty('background-image');
    } else if (settings.type === 'image') {
      container.style.setProperty('background-image', settings.value, 'important');
      container.style.setProperty('background-size', 'cover', 'important');
      container.style.setProperty('background-position', 'center', 'important');
      container.style.removeProperty('background');
    }
    
    updateCacheAndToast(settings, 'Background updated successfully', 'success');
  }

  function updateCacheAndToast(settings, msg, type) {
    const note = window.state?.currentNote;
    if (note) {
      const nid = getNoteId(note);
      if (nid) {
        noteFormattingCache[nid] = noteFormattingCache[nid] || {};
        noteFormattingCache[nid].editorBackground = settings;
        saveCurrentFileFormattingToCache();
      }
    }
    showToast(msg, type, 2000);
  }

  function setEditorBackground(settings) {
    const container = document.querySelector('.editor-container');
    if (!container) return;
    if (settings?.type === 'color' || settings?.type === 'gradient') {
      container.style.setProperty('background', settings.value, 'important');
    } else if (settings?.type === 'image') {
      container.style.setProperty('background-image', settings.value, 'important');
      container.style.setProperty('background-size', 'cover', 'important');
      container.style.setProperty('background-position', 'center', 'important');
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
      container.style.removeProperty('background');
      container.style.removeProperty('background-image');
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

    document.getElementById('project-props-form')?.addEventListener('submit', submitProjectProps);
    document.getElementById('project-props-close')?.addEventListener('click', closeProjectModal);
    document.getElementById('project-props-cancel')?.addEventListener('click', closeProjectModal);
    document.getElementById('note-props-form')?.addEventListener('submit', submitNoteProps);
    document.getElementById('note-props-close')?.addEventListener('click', closeNoteModal);
    document.getElementById('note-props-cancel')?.addEventListener('click', closeNoteModal);

    const searchInput = document.getElementById('writing-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.state.writingSearch = (e.target.value || '').trim();
        renderProjects();
        if (window.state.currentProject) {
          renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
        }
      });
    }

    // UI7: Status filter bar
    document.getElementById('note-filter-all')?.addEventListener('click', () => { window.state.noteStatusFilter = 'all'; _refreshFilterBar(); });
    document.getElementById('note-filter-draft')?.addEventListener('click', () => { window.state.noteStatusFilter = 'draft'; _refreshFilterBar(); });
    document.getElementById('note-filter-review')?.addEventListener('click', () => { window.state.noteStatusFilter = 'in_review'; _refreshFilterBar(); });
    document.getElementById('note-filter-complete')?.addEventListener('click', () => { window.state.noteStatusFilter = 'complete'; _refreshFilterBar(); });
    document.getElementById('note-filter-favorites')?.addEventListener('click', () => { window.state.noteStatusFilter = 'favorites'; _refreshFilterBar(); });

    function _refreshFilterBar() {
      ['note-filter-all','note-filter-draft','note-filter-review','note-filter-complete','note-filter-favorites'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
      });
      const activeMap = { all:'note-filter-all', draft:'note-filter-draft', in_review:'note-filter-review', complete:'note-filter-complete', favorites:'note-filter-favorites' };
      document.getElementById(activeMap[window.state.noteStatusFilter])?.classList.add('active');
      if (window.state.currentProject) renderNotes(window.state.projectsStructure[window.state.currentProject]?.notes || []);
    }

    // UI6: Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (window.state.currentNote) { saveCurrentNote(); showToast('Saved ✓', 'success', 1200); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (window.state.currentNote) duplicateNote(window.state.currentNote.note_id);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        window.toggleFocusMode?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && window.state.currentNote) {
        e.preventDefault();
        window.exportCurrentNote('md');
      }
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.open');
        if (openModal) openModal.classList.remove('open');
        else if (window.state.currentNote) closeNote();
      }
    });

    // Header action buttons
    document.getElementById('duplicate-note-btn')?.addEventListener('click', () => {
      if (window.state.currentNote) duplicateNote(window.state.currentNote.note_id);
    });
    document.getElementById('export-note-md-btn')?.addEventListener('click', () => {
      window.exportCurrentNote('md');
    });
    document.getElementById('export-note-txt-btn')?.addEventListener('click', () => {
      window.exportCurrentNote('txt');
    });

    if (newProjectBtn) newProjectBtn.addEventListener('click', createProject);
    if (newNoteBtn) newNoteBtn.addEventListener('click', () => createNote());
    if (closeNoteBtn) closeNoteBtn.addEventListener('click', closeNote);

    // Delete note — use confirm modal instead of native confirm
    if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', () => {
      if (window.state.currentNote) {
        showConfirm('Delete this note permanently? This cannot be undone.', () => deleteNote(window.state.currentNote.note_id));
      }
    });

    // Toolbar view controls
    document.getElementById('toggle-text-direction')?.addEventListener('click', window.toggleTextDirection);
    document.getElementById('toggle-focus-mode')?.addEventListener('click', window.toggleFocusMode);
    document.getElementById('toggle-view-mode')?.addEventListener('click', window.toggleViewMode);

    // Restore sidebar buttons
    document.getElementById('toggle-projects')?.addEventListener('click', () => {
      const col = document.getElementById('projects-sidebar');
      const btn = document.getElementById('restore-projects');
      if (col) col.style.display = 'none';
      if (btn) btn.style.display = 'inline-flex';
    });
    document.getElementById('toggle-notes')?.addEventListener('click', () => {
      const col = document.getElementById('notes-sidebar');
      const btn = document.getElementById('restore-notes');
      if (col) col.style.display = 'none';
      if (btn) btn.style.display = 'inline-flex';
    });
    document.getElementById('restore-projects')?.addEventListener('click', () => {
      const col = document.getElementById('projects-sidebar');
      const btn = document.getElementById('restore-projects');
      if (col) col.style.display = '';
      if (btn) btn.style.display = 'none';
    });
    document.getElementById('restore-notes')?.addEventListener('click', () => {
      const col = document.getElementById('notes-sidebar');
      const btn = document.getElementById('restore-notes');
      if (col) { col.style.display = ''; col.style.visibility = window.state.currentProject ? 'visible' : 'hidden'; }
      if (btn) btn.style.display = 'none';
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

    setupMobileWritingDrawers();
    initSortableWriting();
    initializeRichTextEditor();
    loadQuickNote();
    fetchProjectsStructure();
  }

  let sortableProjectInstance = null;
  let sortableNoteInstance = null;

  function initSortableWriting() {
    if (typeof Sortable === 'undefined') return;

    if (sortableProjectInstance) {
      sortableProjectInstance.destroy();
      sortableProjectInstance = null;
    }
    const projectList = document.getElementById('project-list');
    if (projectList) {
      sortableProjectInstance = Sortable.create(projectList, {
        animation: 150,
        handle: '.project-item-content',
        ghostClass: 'writing-sortable-ghost',
        chosenClass: 'writing-sortable-chosen',
        onEnd(evt) {
          const el = evt.item;
          const pid = el?.dataset?.projectId;
          if (!pid) return;
          const items = Array.from(projectList.querySelectorAll('li[data-project-id]')).map(li => li.dataset.projectId).filter(Boolean);
          const prevOrder = Object.keys(window.state.projectsStructure).sort((a, b) => {
            const pa = window.state.projectsStructure[a]?.project;
            const pb = window.state.projectsStructure[b]?.project;
            return (pa?.order ?? 999) - (pb?.order ?? 999);
          });
          const newOrder = items;
          if (JSON.stringify(prevOrder) === JSON.stringify(newOrder)) return;
          applyProjectsOrderOptimistic(newOrder);
          _notesFetch(`${getBase()}/writing/projects/order`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_ids: newOrder })
          }).then(res => { if (!res.ok) fetchProjectsStructure(); }).catch(() => fetchProjectsStructure());
        }
      });
    }

    if (sortableNoteInstance) {
      sortableNoteInstance.destroy();
      sortableNoteInstance = null;
    }
    const noteList = document.getElementById('note-list');
    if (noteList) {
      sortableNoteInstance = Sortable.create(noteList, {
        animation: 150,
        handle: '.note-item-content',
        ghostClass: 'writing-sortable-ghost',
        chosenClass: 'writing-sortable-chosen',
        onEnd(evt) {
          const items = Array.from(noteList.querySelectorAll('li[data-note-id]')).map(li => li.dataset.noteId).filter(Boolean);
          const projectId = window.state.currentProject;
          if (!projectId || items.length === 0) return;
          applyNotesOrderOptimistic(projectId, items);
          _notesFetch(`${getBase()}/notes/order`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, note_ids: items })
          }).then(res => { if (!res.ok) fetchProjectsStructure(); }).catch(() => fetchProjectsStructure());
        }
      });
    }
  }

  function applyProjectsOrderOptimistic(projectIds) {
    const structure = window.state.projectsStructure;
    const ordered = [];
    projectIds.forEach(pid => {
      if (structure[pid]) ordered.push(structure[pid]);
    });
    const newStruct = {};
    ordered.forEach((item, idx) => {
      const pid = item.project.project_id;
      newStruct[pid] = { ...item, project: { ...item.project, order: idx } };
    });
    Object.keys(structure).forEach(pid => {
      if (!newStruct[pid]) newStruct[pid] = structure[pid];
    });
    window.state.projectsStructure = newStruct;
    renderProjects();
  }

  function applyNotesOrderOptimistic(projectId, noteIds) {
    const entry = window.state.projectsStructure[projectId];
    if (!entry || !entry.notes) return;
    const noteMap = {};
    entry.notes.forEach(n => { noteMap[n.note_id] = n; });
    const ordered = noteIds.map((nid, idx) => ({ ...noteMap[nid], order: idx })).filter(Boolean);
    window.state.projectsStructure[projectId] = { ...entry, notes: ordered };
    renderNotes(ordered);
  }

  function setupMobileWritingDrawers() {
    const projectsBtn = document.getElementById('mobile-projects-btn');
    const projectsCol = document.getElementById('projects-sidebar');
    const notesCol = document.getElementById('notes-sidebar');
    const layout = document.querySelector('.writing-layout');
    if (!projectsBtn || !projectsCol || !layout) return;

    function closeDrawers() {
      projectsCol.classList.remove('mobile-open');
      if (notesCol) notesCol.classList.remove('mobile-open');
      document.getElementById('writing-drawer-overlay')?.remove();
    }

    function openProjectsDrawer() {
      projectsCol.classList.add('mobile-open');
      if (notesCol) notesCol.classList.remove('mobile-open');
      let overlay = document.getElementById('writing-drawer-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'writing-drawer-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99;backdrop-filter:blur(4px);';
        overlay.addEventListener('click', closeDrawers);
        document.body.appendChild(overlay);
      }
    }

    projectsBtn.addEventListener('click', () => {
      if (projectsCol.classList.contains('mobile-open')) closeDrawers();
      else openProjectsDrawer();
    });

    const closeOnSelect = (el) => {
      if (!el) return;
      el.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          setTimeout(closeDrawers, 150);
        }
      });
    };
    document.getElementById('project-list')?.addEventListener('click', (e) => {
      if (e.target.closest('.project-item-content') && window.matchMedia('(max-width: 768px)').matches) {
        setTimeout(() => { notesCol?.classList.add('mobile-open'); projectsCol.classList.remove('mobile-open'); }, 100);
      }
    });
    document.getElementById('note-list')?.addEventListener('click', (e) => {
      if (e.target.closest('.note-item') && window.matchMedia('(max-width: 768px)').matches) {
        setTimeout(closeDrawers, 150);
      }
    });
  }

  window.fetchProjectsStructure = fetchProjectsStructure;
  window.createProject = createProject;
  window.createNote = createNote;
  window.deleteProject = deleteProject;
  window.deleteNote = deleteNote;
  window.duplicateNote = duplicateNote;
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
