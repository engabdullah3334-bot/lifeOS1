/**
 * tasks/taskManager.js — Task operations: filtering, sorting, helpers
 */

var TS = window.TS = window.TS || {};

TS.taskMgr = {
  // Return filtered + sorted tasks based on current state
  getFiltered(overrides = {}) {
    const s = TS.state;
    let tasks = [...s.tasks];

    const filterStatus = overrides.filterStatus ?? s.filterStatus;
    const search       = overrides.search       ?? s.searchQuery;
    const sortBy       = overrides.sortBy       ?? s.sortBy;

    // Filter by status
    if (filterStatus) tasks = tasks.filter(t => t.status === filterStatus);

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Sorting
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sOrder = { in_progress: 0, pending: 1, completed: 2, archived: 3 };

    if (sortBy === 'priority') {
      tasks.sort((a, b) => (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4));
    } else if (sortBy === 'date') {
      tasks.sort((a, b) => {
        const da = a.start_date || a.end_date || '9999';
        const db = b.start_date || b.end_date || '9999';
        return da.localeCompare(db);
      });
    } else if (sortBy === 'status') {
      tasks.sort((a, b) => (sOrder[a.status] ?? 4) - (sOrder[b.status] ?? 4));
    } else {
      tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return tasks;
  },

  // Get tasks for a specific project (with global filters applied)
  getForProject(projectId) {
    return this.getFiltered().filter(t => String(t.project_id) === String(projectId));
  },

  // Get tasks for a specific date (execution_day, start_date, or end_date match)
  getForDate(dateObj) {
    const dateStr = TS.utils.toDateStr(dateObj);
    return this.getFiltered().filter(t =>
      t.execution_day === dateStr ||
      t.start_date    === dateStr ||
      t.end_date      === dateStr
    );
  },

  // Complete a task with undo support
  async complete(taskId) {
    const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
    if (!task) return;
    const prevStatus = task.status;

    await TS.api.completeTask(taskId);
    TS.notify.success(
      `"${task.title}" completed!`,
      {
        undoFn: async () => {
          await TS.api.updateTask(taskId, { status: prevStatus });
          TS.core.refresh();
        }
      }
    );
    TS.core.refresh();
  },

  // Delete a task with undo support
  async delete(taskId) {
    const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
    if (!task) return;

    TS.modal.openConfirm(
      'Delete Task?',
      `"${task.title}" will be permanently deleted.`,
      async () => {
        await TS.api.deleteTask(taskId);
        TS.notify.success(
          `"${task.title}" deleted`,
          {
            undoFn: async () => {
              // Re-create via API
              await TS.api.createTask(task);
              TS.core.refresh();
            }
          }
        );
        TS.core.refresh();
      }
    );
  },

  // Archive a task
  async archive(taskId) {
    const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
    if (!task) return;
    await TS.api.archiveTask(taskId);
    TS.notify.info(`"${task.title}" archived`);
    TS.core.refresh();
  },

  // Convert task → project (creates project with task's title, moves task into it)
  async convertToProject(taskId) {
    const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
    if (!task) return;
    try {
      const project = await TS.api.createProject({
        name:        task.title,
        description: task.description,
        icon:        '🗂️',
        color:       '#8b5cf6',
      });
      await TS.api.updateTask(taskId, { project_id: project.project_id });
      TS.notify.success(`"${task.title}" converted to project`);
      TS.core.refresh();
    } catch(e) {
      TS.notify.error('Failed to convert task to project');
    }
  },

  // Delete a project (confirm + re-assign orphaned tasks)
  async deleteProject(projectId) {
    const project = TS.state.projects.find(p => String(p.project_id) === String(projectId));
    if (!project) return;
    const taskCount = TS.state.tasks.filter(t => String(t.project_id) === String(projectId)).length;

    TS.modal.openConfirm(
      'Delete Project?',
      `"${project.name}" will be deleted. ${taskCount > 0 ? `${taskCount} task(s) will move to General.` : ''}`,
      async () => {
        await TS.api.deleteProject(projectId);
        TS.notify.success(`"${project.name}" deleted`);
        TS.core.refresh();
      }
    );
  },
};

// ── Shared utils ──────────────────────────────────────────────
TS.utils = {
  toDateStr(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  formatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  },

  priorityLabel(p) {
    return { low:'Low', medium:'Medium', high:'High', critical:'Critical' }[p] || p;
  },
};
