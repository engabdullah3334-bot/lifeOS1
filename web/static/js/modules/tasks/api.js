/**
 * tasks/api.js — All API calls to the Flask backend (with JWT)
 */

var TS = window.TS = window.TS || {};

const API = window.API_URL || 'http://localhost:5000/api';

function _fetch(url, opts = {}) {
  const token = window.LifeOSApi?.getToken?.();
  const headers = { ...opts.headers };
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(url, { ...opts, headers });
}

TS.api = {
  // ── Projects ──────────────────────────────────────────
  async getProjects(params = {}) {
    const q = new URLSearchParams();
    if (params.archived) q.set('archived', '1');
    const r = await _fetch(`${API}/projects${q.toString() ? '?' + q : ''}`);
    if (!r.ok) {
      console.error('[API] Failed to fetch projects:', await r.text());
      return [];
    }
    return r.json();
  },

  async createProject(data) {
    const r = await _fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.json();
  },

  async updateProject(id, data) {
    const r = await _fetch(`${API}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.json();
  },

  async deleteProject(id) {
    const r = await _fetch(`${API}/projects/${id}`, { method: 'DELETE' });
    return r.json();
  },

  async reorderProjects(orderedIds) {
    await _fetch(`${API}/projects/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
  },

  // ── Tasks ─────────────────────────────────────────────
  async getTasks(params = {}) {
    const q = new URLSearchParams();
    if (params.project_id) q.set('project_id', params.project_id);
    if (params.status)     q.set('status',     params.status);
    if (params.priority)   q.set('priority',   params.priority);
    if (params.search)     q.set('search',     params.search);
    if (params.sort)       q.set('sort',       params.sort);
    if (params.archived)   q.set('archived',   '1');
    const r = await _fetch(`${API}/tasks?${q}`);
    if (!r.ok) {
      console.error('[API] Failed to fetch tasks:', await r.text());
      return [];
    }
    return r.json();
  },

  async createTask(data) {
    const r = await _fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async updateTask(id, data) {
    const r = await _fetch(`${API}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async deleteTask(id) {
    const r = await _fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
    return r.json();
  },

  async completeTask(id, isCompleted) {
    return this.updateTask(id, { status: isCompleted ? 'completed' : 'pending' });
  },

  async archiveTask(id) {
    return this.updateTask(id, { isArchived: true });
  },

  async unarchiveTask(id) {
    return this.updateTask(id, { isArchived: false, status: 'pending' });
  },

  async archiveProject(id) {
    return this.updateProject(id, { isArchived: true });
  },

  async unarchiveProject(id) {
    return this.updateProject(id, { isArchived: false });
  },

  async reorderTasks(orderedIds) {
    await _fetch(`${API}/tasks/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
  },
};
