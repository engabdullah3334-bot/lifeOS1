/**
 * tasks/dragDrop.js — SortableJS-based drag & drop
 * Handles within-project reorder and cross-project task moves
 */

var TS = window.TS = window.TS || {};

TS.dnd = {
  _instances: [],

  // Call after each projects view render to bind new task lists
  bindAll() {
    this.destroy();

    if (typeof Sortable === 'undefined') {
      console.warn('[DnD] SortableJS not loaded — drag & drop disabled');
      return;
    }

    // Bind each task list inside projects
    document.querySelectorAll('.ts-project-task-list').forEach(list => {
      const instance = Sortable.create(list, {
        group:     'tasks',           // shared group enables cross-project move
        animation: 180,
        handle:    '.ts-drag-handle',
        ghostClass:  'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass:   'sortable-drag',

        onEnd: async (evt) => {
          const taskId     = evt.item.dataset.taskId;
          const newProjId  = evt.to.dataset.projectId;
          const oldProjId  = evt.from.dataset.projectId;

          // Cross-project move
          if (newProjId && newProjId !== oldProjId) {
            try {
              await TS.api.updateTask(taskId, { project_id: newProjId });
              const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
              if (task) {
                const proj = TS.state.projects.find(p => p.project_id === newProjId);
                TS.notify.info(`Moved to "${proj?.name || 'project'}"`);
              }
            } catch(e) {
              TS.notify.error('Failed to move task');
            }
          }

          // Save new order of all tasks in the destination list
          const orderedIds = [...evt.to.querySelectorAll('[data-task-id]')]
            .map(el => el.dataset.taskId);

          try {
            await TS.api.reorderTasks(orderedIds);
          } catch(e) {
            console.warn('[DnD] reorder save failed:', e);
          }

          // Refresh data quietly without full re-render
          await TS.core.loadData();
          TS.views.projects.updateProjectHeaders();
        },
      });
      this._instances.push(instance);
    });

    // Bind project list for project reordering
    const projContainer = document.getElementById('ts-projects-container');
    if (projContainer) {
      const projInstance = Sortable.create(projContainer, {
        animation:   180,
        handle:      '.ts-project-header',
        ghostClass:  'sortable-ghost',
        filter:      '.ts-project-body, .ts-project-quick-add',
        preventOnFilter: true,

        onEnd: async () => {
          const orderedIds = [...projContainer.querySelectorAll('.ts-project-card')]
            .map(el => el.dataset.projectId);
          try {
            await TS.api.reorderProjects(orderedIds);
            await TS.core.loadData();
          } catch(e) {
            console.warn('[DnD] project reorder failed:', e);
          }
        },
      });
      this._instances.push(projInstance);
    }
  },

  destroy() {
    this._instances.forEach(i => { try { i.destroy(); } catch(e) {} });
    this._instances = [];
  },
};
