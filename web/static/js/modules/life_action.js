/**
 * life_action.js — Life Action Instant Reactivity Engine
 * =======================================================
 * Delivers 0ms optimistic response for all user actions & real-time
 * reflection of AI actions across all views and open tabs.
 */

(function () {
  'use strict';

  // ── Web Audio Synthesizer (Instant Futuristic Audio Feedback) ─────────
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playChime(type = 'add') {
    if (localStorage.getItem('life_action_sound') === 'false') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'ai') {
        // High-tech ascending dual frequency for AI
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.22); // D6
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.33);
      } else if (type === 'complete') {
        // Crisp rewarding success chord
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
      } else if (type === 'delete') {
        // Soft descending tone
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.16);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.21);
      } else {
        // Pleasant quick creation pop
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.14); // A5
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.21);
      }
    } catch (e) {
      // Audio not permitted or supported — fail silently
    }
  }

  // ── Multi-Tab Real-time Broadcast Channel ────────────────────────────
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel('life_action_channel');
      syncChannel.onmessage = (event) => {
        handleRemoteBroadcast(event.data);
      };
    }
  } catch (e) {
    console.warn('[LifeAction] BroadcastChannel not supported:', e);
  }

  function broadcast(actionType, payload) {
    if (!syncChannel) return;
    try {
      syncChannel.postMessage({ type: actionType, payload, timestamp: Date.now() });
    } catch (e) {}
  }

  function handleRemoteBroadcast(msg) {
    if (!msg || !msg.type || !window.TS?.state) return;
    const { type, payload } = msg;

    if (type === 'TASK_ADDED' && payload.task) {
      const exists = window.TS.state.tasks.some(t => String(t.task_id) === String(payload.task.task_id));
      if (!exists) {
        window.TS.state.tasks.unshift(payload.task);
        if (window.state) window.state.tasks = window.TS.state.tasks;
        window.TS.core?._renderCurrentView();
        window.updateDashboardStats?.();
      }
    } else if (type === 'TASK_COMPLETED') {
      const task = window.TS.state.tasks.find(t => String(t.task_id) === String(payload.taskId));
      if (task) {
        task.status = payload.status;
        window.TS.views?.projects?.updateProjectHeaders();
        window.TS.core?._renderCurrentView();
        window.updateDashboardStats?.();
      }
    } else if (type === 'TASK_DELETED') {
      window.TS.state.tasks = window.TS.state.tasks.filter(t => String(t.task_id) !== String(payload.taskId));
      if (window.state) window.state.tasks = window.TS.state.tasks;
      window.TS.views?.projects?.updateProjectHeaders();
      window.TS.core?._renderCurrentView();
      window.updateDashboardStats?.();
    } else if (type === 'PROJECT_ADDED' && payload.project) {
      const exists = window.TS.state.projects.some(p => p.project_id === payload.project.project_id);
      if (!exists) {
        window.TS.state.projects.push(payload.project);
        window.TS.core?._renderCurrentView();
        window.updateDashboardStats?.();
      }
    }
  }

  // ── Toast Container & Rendering ──────────────────────────────────────
  function ensureToastContainer() {
    let container = document.getElementById('life-action-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'life-action-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast({ icon = '⚡', header = 'Life Action', title = '', isAi = false, actionBtn = null, duration = 3500 }) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `life-action-toast${isAi ? ' ai' : ''}`;

    toast.innerHTML = `
      <div class="life-action-toast-icon">${icon}</div>
      <div class="life-action-toast-content">
        <div class="life-action-toast-header">${header}</div>
        <div class="life-action-toast-title">${title}</div>
      </div>
    `;

    if (actionBtn && actionBtn.text && actionBtn.onClick) {
      const btn = document.createElement('button');
      btn.className = 'life-action-toast-btn';
      btn.textContent = actionBtn.text;
      btn.addEventListener('click', () => {
        actionBtn.onClick();
        dismiss();
      });
      toast.appendChild(btn);
    }

    container.appendChild(toast);

    function dismiss() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 250);
    }

    const timer = setTimeout(dismiss, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  // ── Highlight Element in DOM ─────────────────────────────────────────
  function highlightTaskCard(taskId, isAi = false) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-task-id="${taskId}"]`);
      if (el) {
        el.classList.add(isAi ? 'life-action-ai-glow' : 'life-action-pulse');
        setTimeout(() => {
          el.classList.remove('life-action-ai-glow', 'life-action-pulse');
        }, isAi ? 3000 : 2000);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  CORE LIFE ACTION INSTANT METHODS
  // ════════════════════════════════════════════════════════════════════

  const LifeAction = {
    playChime,
    showToast,
    highlightTaskCard,

    /**
     * Instantly adds a task with 0ms visual latency (Optimistic UI)
     * If already from server (e.g. AI action), directly commits.
     * If from user, renders immediately and calls API in background.
     */
    async instantAddTask(taskData, options = {}) {
      const isFromServer = options.isFromServer || false;
      const isAi = options.isAi || false;
      const tempId = isFromServer && taskData.task_id
        ? taskData.task_id
        : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const TS = window.TS;
      if (!TS || !TS.state) {
        console.warn('[LifeAction] TaskSystem not ready');
        return null;
      }

      // Default project if not specified
      const projectId = taskData.project_id || (TS.state.projects[0]?.project_id || 'general');

      const optimisticTask = {
        task_id: tempId,
        title: taskData.title || 'New Task',
        description: taskData.description || '',
        project_id: projectId,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        start_date: taskData.start_date || null,
        end_date: taskData.end_date || null,
        execution_day: taskData.execution_day || null,
        start_time: taskData.start_time || null,
        end_time: taskData.end_time || null,
        reminder: taskData.reminder || null,
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
        notes: taskData.notes || '',
        isArchived: false,
        created_at: taskData.created_at || new Date().toISOString(),
        _optimistic: !isFromServer,
        _fromAi: isAi,
      };

      // 1. Instantly inject into frontend memory (0ms)
      TS.state.tasks.unshift(optimisticTask);
      if (window.state) window.state.tasks = TS.state.tasks;

      // 2. Instantly update DOM (0ms)
      if (TS.state.currentView === 'projects') {
        TS.views.projects.render();
      } else if (TS.state.currentView === 'calendar') {
        TS.views.calendar.render();
      }
      if (window.updateDashboardStats) window.updateDashboardStats();

      // 3. Audio & Visual Effects (0ms)
      playChime(isAi ? 'ai' : 'add');
      highlightTaskCard(tempId, isAi);

      // Toast feedback
      showToast({
        icon: isAi ? '✦' : '⚡',
        header: isAi ? 'AI Live Action' : 'Life Action • إضافة فورية',
        title: optimisticTask.title,
        isAi,
        actionBtn: {
          text: 'عرض المهمة',
          onClick: () => {
            if (TS.state.currentView !== 'projects') TS.core.switchView('projects');
            window.loadView?.('tasks');
            setTimeout(() => {
              const card = document.querySelector(`[data-task-id="${tempId}"]`);
              if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightTaskCard(tempId, isAi);
              }
            }, 100);
          }
        }
      });

      // Broadcast to other tabs
      broadcast('TASK_ADDED', { task: optimisticTask });

      // If already from server, done!
      if (isFromServer) return optimisticTask;

      // 4. Background Server Call (Non-blocking)
      try {
        const payload = { ...taskData, project_id: projectId };
        delete payload.task_id;
        delete payload._optimistic;
        delete payload._fromAi;

        const serverTask = await TS.api.createTask(payload);

        // Seamlessly update in-memory task
        const idx = TS.state.tasks.findIndex(t => t.task_id === tempId);
        if (idx !== -1 && serverTask) {
          TS.state.tasks[idx] = { ...TS.state.tasks[idx], ...serverTask, _optimistic: false };
          if (window.state) window.state.tasks = TS.state.tasks;

          // Seamlessly update DOM data-task-id attribute
          const card = document.querySelector(`[data-task-id="${tempId}"]`);
          if (card && serverTask.task_id) {
            card.dataset.taskId = serverTask.task_id;
            card.querySelectorAll(`[data-task-id="${tempId}"]`).forEach(el => {
              el.dataset.taskId = serverTask.task_id;
            });
          }
        }

        return serverTask;
      } catch (err) {
        console.error('[LifeAction] Background create failed:', err);
        // Rollback
        TS.state.tasks = TS.state.tasks.filter(t => t.task_id !== tempId);
        if (window.state) window.state.tasks = TS.state.tasks;
        TS.views.projects.render();
        if (window.updateDashboardStats) window.updateDashboardStats();
        showToast({
          icon: '⚠️',
          header: 'خطأ في الاتصال',
          title: 'تعذر حفظ المهمة في الخادم',
          isAi: false
        });
        throw err;
      }
    },

    /**
     * Instantly toggles task completion status with 0ms visual update
     */
    async instantToggleComplete(taskId) {
      const TS = window.TS;
      if (!TS || !TS.state) return;

      const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
      if (!task) return;

      const oldStatus = task.status;
      const newStatus = oldStatus === 'completed' ? 'pending' : 'completed';
      const isCompleted = newStatus === 'completed';

      // 1. Update in-memory state (0ms)
      task.status = newStatus;

      // 2. Update all DOM elements matching this task immediately (0ms)
      const elements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
      elements.forEach(el => {
        if (el.classList.contains('ts-task-card')) {
          el.classList.toggle('ts-done', isCompleted);
          const check = el.querySelector('.ts-check');
          if (check) {
            check.classList.toggle('checked', isCompleted);
            check.textContent = isCompleted ? '✓' : '';
          }
        }
        if (el.classList.contains('dash-task-row')) {
          el.classList.toggle('done', isCompleted);
          const btn = el.querySelector('.dash-task-check');
          if (btn) {
            btn.classList.toggle('checked', isCompleted);
            btn.textContent = isCompleted ? '✓' : '';
          }
        }
      });

      // 3. Audio & Stats (0ms)
      playChime(isCompleted ? 'complete' : 'add');
      TS.views.projects.updateProjectHeaders();
      if (window.updateDashboardStats) window.updateDashboardStats();

      broadcast('TASK_COMPLETED', { taskId, status: newStatus });

      // 4. Background Sync
      try {
        await TS.api.completeTask(taskId, isCompleted);
      } catch (err) {
        console.error('[LifeAction] Background toggle failed:', err);
        // Rollback
        task.status = oldStatus;
        TS.views.projects.updateProjectHeaders();
        if (window.updateDashboardStats) window.updateDashboardStats();
      }
    },

    /**
     * Instantly updates task fields
     */
    async instantUpdateTask(taskId, updates) {
      const TS = window.TS;
      if (!TS || !TS.state) return;

      const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
      if (!task) return;

      const originalCopy = { ...task };
      Object.assign(task, updates);

      // Re-render
      TS.core._renderCurrentView();
      if (window.updateDashboardStats) window.updateDashboardStats();
      highlightTaskCard(taskId);

      // Background sync
      try {
        await TS.api.updateTask(taskId, updates);
      } catch (err) {
        console.error('[LifeAction] Background update failed:', err);
        Object.assign(task, originalCopy);
        TS.core._renderCurrentView();
      }
    },

    /**
     * Instantly deletes task with smooth slide-out and undo support
     */
    async instantDeleteTask(taskId) {
      const TS = window.TS;
      if (!TS || !TS.state) return;

      const taskIndex = TS.state.tasks.findIndex(t => String(t.task_id) === String(taskId));
      if (taskIndex === -1) return;

      const deletedTask = TS.state.tasks[taskIndex];

      // 1. Smooth exit animation (0ms)
      const el = document.querySelector(`.ts-task-card[data-task-id="${taskId}"]`);
      if (el) el.classList.add('life-action-exit');

      playChime('delete');

      // 2. Remove from memory after short collapse
      setTimeout(() => {
        TS.state.tasks = TS.state.tasks.filter(t => String(t.task_id) !== String(taskId));
        if (window.state) window.state.tasks = TS.state.tasks;
        TS.views.projects.updateProjectHeaders();
        if (window.updateDashboardStats) window.updateDashboardStats();
        if (el) el.remove();
      }, 260);

      broadcast('TASK_DELETED', { taskId });

      // Toast with instant Undo
      let isUndone = false;
      showToast({
        icon: '🗑️',
        header: 'Life Action • حذف',
        title: `تم حذف "${deletedTask.title}"`,
        duration: 4500,
        actionBtn: {
          text: 'تراجع (Undo)',
          onClick: async () => {
            isUndone = true;
            TS.state.tasks.splice(taskIndex, 0, deletedTask);
            if (window.state) window.state.tasks = TS.state.tasks;
            TS.core._renderCurrentView();
            if (window.updateDashboardStats) window.updateDashboardStats();
            highlightTaskCard(deletedTask.task_id);
            playChime('add');
          }
        }
      });

      // Background delete after grace period
      setTimeout(async () => {
        if (isUndone) return;
        try {
          await TS.api.deleteTask(taskId);
        } catch (err) {
          console.error('[LifeAction] Background delete failed:', err);
        }
      }, 4500);
    },

    /**
     * Instantly adds a project
     */
    async instantAddProject(projectData, options = {}) {
      const isFromServer = options.isFromServer || false;
      const isAi = options.isAi || false;
      const TS = window.TS;
      if (!TS || !TS.state) return;

      const tempId = isFromServer && projectData.project_id
        ? projectData.project_id
        : `proj_${Date.now()}`;

      const optimisticProject = {
        project_id: tempId,
        name: projectData.name || projectData.title || 'New Project',
        description: projectData.description || '',
        icon: projectData.icon || '📁',
        color: projectData.color || '#6366f1',
        task_count: projectData.task_count || 0,
        done_count: projectData.done_count || 0,
        progress: projectData.progress || 0,
        order: TS.state.projects.length,
        isArchived: false,
      };

      TS.state.projects.push(optimisticProject);
      TS.core._renderCurrentView();
      if (window.updateDashboardStats) window.updateDashboardStats();

      playChime(isAi ? 'ai' : 'add');
      broadcast('PROJECT_ADDED', { project: optimisticProject });

      showToast({
        icon: isAi ? '✦' : '📁',
        header: isAi ? 'AI Live Action' : 'Life Action • مشروع جديد',
        title: optimisticProject.name,
        isAi,
      });

      if (isFromServer) return optimisticProject;

      try {
        const payload = { ...projectData };
        delete payload.project_id;
        const serverProject = await TS.api.createProject(payload);
        const idx = TS.state.projects.findIndex(p => p.project_id === tempId);
        if (idx !== -1 && serverProject) {
          TS.state.projects[idx] = { ...TS.state.projects[idx], ...serverProject };
        }
        return serverProject;
      } catch (err) {
        console.error('[LifeAction] Project creation error:', err);
        TS.state.projects = TS.state.projects.filter(p => p.project_id !== tempId);
        TS.core._renderCurrentView();
        throw err;
      }
    },

    /**
     * Central Handler for All AI Actions Returned from Server
     */
    handleAiActions(actions) {
      if (!Array.isArray(actions) || actions.length === 0) return;

      actions.forEach((a) => {
        try {
          if (a.type === 'task_created') {
            const taskObj = a.task || {
              task_id: a.id,
              title: a.title,
              project_id: a.project_id,
              priority: a.priority || 'medium',
              status: a.status || 'pending',
            };
            this.instantAddTask(taskObj, { isFromServer: true, isAi: true });
          } else if (a.type === 'project_created') {
            const projObj = a.project || {
              project_id: a.id,
              name: a.title,
              color: a.color || '#8b5cf6',
              icon: '🎯',
            };
            this.instantAddProject(projObj, { isFromServer: true, isAi: true });
          } else if (a.type === 'project_with_tasks_created') {
            if (a.project) {
              this.instantAddProject(a.project, { isFromServer: true, isAi: true });
            }
            const tasksList = a.tasks_full || a.tasks || [];
            tasksList.forEach(t => {
              this.instantAddTask(
                t.title ? t : { task_id: t.id, title: t.title, project_id: a.project_id },
                { isFromServer: true, isAi: true }
              );
            });
          } else if (a.type === 'task_updated') {
            if (a.task) this.instantUpdateTask(a.id, a.task);
          } else if (a.type === 'task_completed') {
            const TS = window.TS;
            const task = TS?.state?.tasks?.find(t => String(t.task_id) === String(a.id));
            if (task && task.status !== 'completed') {
              this.instantToggleComplete(a.id);
            }
          } else if (a.type === 'task_deleted') {
            this.instantDeleteTask(a.id);
          } else if (a.type === 'note_created') {
            showToast({
              icon: '✦',
              header: 'AI Live Action • كتابة',
              title: `تم إنشاء ملاحظة: "${a.title}"`,
              isAi: true,
            });
            if (window.fetchProjectsStructure) window.fetchProjectsStructure();
          } else if (a.type === 'quick_note_saved') {
            showToast({
              icon: '✦',
              header: 'AI Live Action • ملاحظة سريعة',
              title: a.preview || 'تم حفظ الملاحظة السريعة',
              isAi: true,
            });
            if (window.loadQuickNote) window.loadQuickNote();
          }
        } catch (err) {
          console.error('[LifeAction] Error executing AI action:', a, err);
        }
      });
    },
  };

  // Expose globally
  window.LifeAction = LifeAction;

  // Initialize status badge when DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    ensureToastContainer();
    // Warm up audio context on first user click anywhere
    const unlockAudio = () => {
      getAudioContext();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
  });
})();
