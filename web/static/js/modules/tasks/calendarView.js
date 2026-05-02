/**
 * tasks/views/calendarView.js — FullCalendar.js Integration
 */

var TS = window.TS = window.TS || {};
TS.views = TS.views || {};

TS.views.calendar = {
  calendar: null,

  init() {
    console.log("[TS] Initializing FullCalendar View...");
    const container = document.getElementById('ts-calendar-container');
    if (!container) return;

    this.calendar = new FullCalendar.Calendar(container, {
      initialView: 'timeGridWeek',
      locale: 'en', // English Support
      direction: 'ltr', // Left to Right
      firstDay: 6, // Start on Saturday
      dayMaxEvents: true, // Allow "+ more" link when too many events
      eventOrder: "priorityScore,order", // Custom sorting
      height: '100%', // Take full height of container
      allDaySlot: true,
      allDayText: 'Anytime', // "Anytime" tasks
      slotDuration: '00:30:00', // 30-minute intervals
      editable: true, // Phase 2: Drag and Drop
      droppable: true,
      nowIndicator: true, // Phase 4: Current time line
      scrollTime: (() => {
        const d = new Date();
        d.setHours(d.getHours() - 2);
        return d.toTimeString().split(' ')[0]; // "HH:MM:SS"
      })(),
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: 'short'
      },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay,dayGridMonth'
      },
      events: async (fetchInfo, successCallback, failureCallback) => {
        try {
          // Fetch tasks using start and end dates from FullCalendar
          const tasks = await TS.api.getTasks({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr,
            status: TS.state.filterStatus,
            search: TS.state.searchQuery,
          });
          
          // Update global state if needed, though this fetches a scoped window
          TS.state.tasks = tasks;
          
          const events = this._mapTasksToEvents(tasks);
          successCallback(events);
        } catch (error) {
          console.error("[TS] Error fetching calendar events:", error);
          failureCallback(error);
        }
      },
      eventClick: (info) => {
        const taskId = info.event.id;
        const task = TS.state.tasks.find(t => String(t.task_id) === String(taskId));
        if (task) {
          TS.modal.openTask(task);
        }
      },
      dateClick: (info) => {
        TS.modal.openNewTask({ execution_day: info.dateStr.split('T')[0] });
      },
      // Phase 2: Drag & Drop handlers
      eventDrop: async (info) => {
        const taskId = info.event.id;
        const start = info.event.start;
        const end = info.event.end;
        const isAllDay = info.event.allDay;
        
        const dateStr = start.toISOString().split('T')[0];
        let startTimeStr = '';
        let endTimeStr = '';
        
        if (!isAllDay) {
            // Local time string "HH:MM"
            startTimeStr = start.toTimeString().split(' ')[0].slice(0,5);
            if (end) {
                endTimeStr = end.toTimeString().split(' ')[0].slice(0,5);
            }
        }
        
        try {
            await TS.api.updateTask(taskId, {
                execution_day: dateStr,
                start_date: dateStr,
                start_time: startTimeStr,
                end_time: endTimeStr
            });
            // Update successful
        } catch (e) {
            console.error("Failed to move task", e);
            info.revert();
        }
      },
      eventResize: async (info) => {
        const taskId = info.event.id;
        const start = info.event.start;
        const end = info.event.end;
        if (!end || !start) return;
        
        const endTimeStr = end.toTimeString().split(' ')[0].slice(0,5);
        const estimatedHours = Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2));
        
        try {
            await TS.api.updateTask(taskId, { 
                end_time: endTimeStr,
                estimated_hours: estimatedHours
            });
        } catch (e) {
            console.error("Failed to resize task", e);
            info.revert();
        }
      },
      // Phase 3: Task Card Design
      eventContent: (arg) => {
        const title = arg.event.title;
        const priority = arg.event.extendedProps.priority || 'medium';
        const isDone = arg.event.extendedProps.isDone;

        const el = document.createElement('div');
        el.className = `ts-cal-card p-${priority} ${isDone ? 'ts-done' : ''}`;
        
        el.innerHTML = `
          <div class="ts-cal-card-inner">
            <div class="ts-cal-title">${title}</div>
            <div class="ts-cal-actions">
              <button class="ts-cal-btn-complete" title="Complete">✓</button>
              <button class="ts-cal-btn-edit" title="Edit">✎</button>
              <button class="ts-cal-btn-delete" title="Delete">×</button>
            </div>
          </div>
        `;

        const completeBtn = el.querySelector('.ts-cal-btn-complete');
        const editBtn = el.querySelector('.ts-cal-btn-edit');
        const deleteBtn = el.querySelector('.ts-cal-btn-delete');

        completeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          TS.api.updateTask(arg.event.id, { status: isDone ? 'pending' : 'completed' })
            .then(() => TS.core.refresh());
        });

        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const task = TS.state.tasks.find(t => String(t.task_id) === String(arg.event.id));
          if (task) TS.modal.openTask(task);
        });

        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this task?')) {
            TS.api.deleteTask(arg.event.id).then(() => TS.core.refresh());
          }
        });

        return { domNodes: [el] };
      }
    });

    this.setupShortcuts();
    
    // Update the current hour highlight periodically
    setInterval(() => this.highlightCurrentHourSlot(), 60000);
  },

  // Phase 4: Keyboard Shortcuts
  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!this.calendar) return;

      const container = document.getElementById('ts-calendar-container');
      if (!container || container.closest('.ts-view-section').style.display === 'none') return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        TS.modal.openNewTask();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.calendar.today();
      } else if (e.key === 'ArrowRight') {
        this.calendar.next();
      } else if (e.key === 'ArrowLeft') {
        this.calendar.prev();
      }
    });
  },

  render() {
    if (!this.calendar) return;
    
    // Ensure the calendar is properly rendered and sized when the tab is shown
    setTimeout(() => {
      this.calendar.render();
      this.calendar.refetchEvents();
      this.highlightCurrentHourSlot();
    }, 50);
  },

  highlightCurrentHourSlot() {
    if (!this.calendar) return;
    
    // Remove previous highlights
    document.querySelectorAll('.ts-current-hour-slot').forEach(el => el.classList.remove('ts-current-hour-slot'));
    
    const now = new Date();
    // FullCalendar slots have data-time="HH:MM:SS". We want the exact hour slot.
    const hourStr = now.getHours().toString().padStart(2, '0');
    const timeAttr = `${hourStr}:00:00`;
    
    // The slot label is the `td` with class `fc-timegrid-slot-label`
    const slotEls = document.querySelectorAll(`.fc-timegrid-slot-label[data-time="${timeAttr}"]`);
    slotEls.forEach(slotEl => {
        slotEl.classList.add('ts-current-hour-slot');
    });
  },

  _mapTasksToEvents(tasks) {
    // Map Priority to a numeric score for sorting
    const pScore = { critical: 0, high: 1, medium: 2, low: 3 };

    return tasks
      .filter(task => task.execution_day || task.start_date) // Only show scheduled tasks
      .map(task => {
      const isDone = task.status === 'completed';
      const dateStr = task.execution_day || task.start_date;
      const hasTime = task.start_time && task.start_time !== "";
      
      // Determine class names for Notion-like styling
      const classNames = ['ts-cal-event', `p-${task.priority}`];
      if (isDone) classNames.push('ts-done');
      
      return {
        id: task.task_id, // Important: handles recurring IDs like ID|Date
        title: task.title,
        start: hasTime ? `${dateStr}T${task.start_time}` : dateStr,
        end: (hasTime && task.end_time && task.end_time !== "") ? `${dateStr}T${task.end_time}` : null,
        allDay: !hasTime, // Tasks without time go to General Tasks row
        classNames: classNames,
        extendedProps: {
          priority: task.priority,
          isDone: isDone,
          priorityScore: pScore[task.priority] ?? 4,
          order: task.order ?? 999
        }
      };
    });
  }
};
