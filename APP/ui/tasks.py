"""
Tasks Management View
Task list with filtering, creation, and management
"""

import customtkinter as ctk
from datetime import datetime
from config import *
from ui.widgets import (NeonLabel, NeonCard, NeonButton, NeonSecondaryButton, 
                        NeonEntry, TaskCard, NeonScrollableFrame)
from core.task_manager import task_manager, Task


class TasksView(ctk.CTkFrame):
    """Tasks management view"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_MAIN,
            **kwargs
        )
        
        self.current_filter = "all"
        
        # Configure grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # Header with filters and new task button
        self._create_header()
        
        # Tasks container
        self._create_tasks_container()
        
        # Modal window reference
        self.task_modal = None
    
    def _create_header(self):
        """Create header with title, filters, and actions"""
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=40, pady=(40, 20))
        header.grid_columnconfigure(1, weight=1)
        
        # Left side - title and count
        left_frame = ctk.CTkFrame(header, fg_color="transparent")
        left_frame.grid(row=0, column=0, sticky="w")
        
        title = NeonLabel(left_frame, text="All Tasks", size="heading")
        title.pack(side="left", padx=(0, 12))
        
        self.count_badge = NeonLabel(
            left_frame,
            text="0 Active",
            size="small",
            color="secondary"
        )
        self.count_badge.pack(side="left")
        
        # Right side - filters and new task button
        right_frame = ctk.CTkFrame(header, fg_color="transparent")
        right_frame.grid(row=0, column=1, sticky="e")
        
        # Filter buttons
        filters_frame = ctk.CTkFrame(right_frame, fg_color="transparent")
        filters_frame.pack(side="left", padx=(0, 12))
        
        self.filter_buttons = {}
        for filter_name in ["all", "work", "personal"]:
            btn = ctk.CTkButton(
                filters_frame,
                text=filter_name.capitalize(),
                width=80,
                height=32,
                fg_color="transparent" if filter_name != "all" else ACCENT_BLUE,
                hover_color=HOVER_BG,
                text_color=TEXT_PRIMARY if filter_name == "all" else TEXT_SECONDARY,
                font=(FONT_BODY, FONT_SIZE_SMALL),
                corner_radius=RADIUS_SM,
                border_width=1,
                border_color=BORDER_COLOR,
                command=lambda f=filter_name: self._set_filter(f)
            )
            btn.pack(side="left", padx=2)
            self.filter_buttons[filter_name] = btn
        
        # New task button
        new_task_btn = NeonButton(
            right_frame,
            text="+ New Task",
            command=self._open_task_modal
        )
        new_task_btn.pack(side="left")
    
    def _create_tasks_container(self):
        """Create scrollable tasks container"""
        container = NeonCard(self)
        container.grid(row=1, column=0, sticky="nsew", padx=40, pady=(0, 40))
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        # Scrollable task list
        self.tasks_list = NeonScrollableFrame(container)
        self.tasks_list.grid(row=0, column=0, sticky="nsew", padx=PADDING_MD, pady=PADDING_MD)
        
        # Load tasks
        self._refresh_tasks()
    
    def _refresh_tasks(self):
        """Refresh tasks list based on current filter"""
        # Clear existing tasks
        for widget in self.tasks_list.winfo_children():
            widget.destroy()
        
        # Get filtered tasks
        if self.current_filter == "all":
            tasks = task_manager.get_all_tasks()
        else:
            tasks = task_manager.get_tasks_by_category(self.current_filter)
        
        # Filter out completed tasks (show only active)
        active_tasks = [t for t in tasks if t.status != "completed"]
        
        # Update count badge
        self.count_badge.configure(text=f"{len(active_tasks)} Active")
        
        # Display tasks
        if not active_tasks:
            no_tasks_label = NeonLabel(
                self.tasks_list,
                text="No tasks found. Create one to get started!",
                size="normal",
                color="muted"
            )
            no_tasks_label.pack(pady=40)
        else:
            # Sort by priority and due date
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            active_tasks.sort(key=lambda t: (
                priority_order.get(t.priority, 4),
                t.due_date if t.due_date else datetime.max
            ))
            
            for task in active_tasks:
                task_card = TaskCard(
                    self.tasks_list,
                    task=task,
                    on_complete=self._on_complete_task,
                    on_delete=self._on_delete_task
                )
                task_card.pack(fill="x", pady=4)
    
    def _set_filter(self, filter_name):
        """Set active filter"""
        self.current_filter = filter_name
        
        # Update button styles
        for name, btn in self.filter_buttons.items():
            if name == filter_name:
                btn.configure(
                    fg_color=ACCENT_BLUE,
                    text_color=TEXT_PRIMARY
                )
            else:
                btn.configure(
                    fg_color="transparent",
                    text_color=TEXT_SECONDARY
                )
        
        # Refresh tasks
        self._refresh_tasks()
    
    def _open_task_modal(self):
        """Open new task creation modal"""
        if self.task_modal is not None and self.task_modal.winfo_exists():
            self.task_modal.focus()
            return
        
        self.task_modal = ctk.CTkToplevel(self)
        self.task_modal.title("Create New Task")
        self.task_modal.geometry("500x400")
        self.task_modal.configure(fg_color=BG_MAIN)
        
        # Make modal
        self.task_modal.transient(self.winfo_toplevel())
        self.task_modal.grab_set()
        
        # Content
        content = ctk.CTkFrame(self.task_modal, fg_color=BG_SECONDARY, corner_radius=RADIUS_MD)
        content.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Title
        title_label = NeonLabel(content, text="Create New Task", size="subheading")
        title_label.pack(anchor="w", padx=PADDING_LG, pady=(PADDING_LG, PADDING_MD))
        
        # Form fields
        form_frame = ctk.CTkFrame(content, fg_color="transparent")
        form_frame.pack(fill="both", expand=True, padx=PADDING_LG, pady=(0, PADDING_MD))
        
        # Task title
        NeonLabel(form_frame, text="Title", size="normal", color="secondary").pack(anchor="w", pady=(0, 4))
        title_entry = NeonEntry(form_frame, placeholder="What needs to be done?")
        title_entry.pack(fill="x", pady=(0, 12))
        
        # Category
        NeonLabel(form_frame, text="Category", size="normal", color="secondary").pack(anchor="w", pady=(0, 4))
        category_var = ctk.StringVar(value="work")
        category_menu = ctk.CTkOptionMenu(
            form_frame,
            values=["work", "study", "personal", "health"],
            variable=category_var,
            fg_color=BG_TERTIARY,
            button_color=ACCENT_BLUE,
            button_hover_color=lighten_color(ACCENT_BLUE, 0.1),
            dropdown_fg_color=BG_TERTIARY,
            corner_radius=RADIUS_SM
        )
        category_menu.pack(fill="x", pady=(0, 12))
        
        # Priority
        NeonLabel(form_frame, text="Priority", size="normal", color="secondary").pack(anchor="w", pady=(0, 4))
        priority_var = ctk.StringVar(value="medium")
        priority_menu = ctk.CTkOptionMenu(
            form_frame,
            values=["low", "medium", "high", "critical"],
            variable=priority_var,
            fg_color=BG_TERTIARY,
            button_color=ACCENT_BLUE,
            button_hover_color=lighten_color(ACCENT_BLUE, 0.1),
            dropdown_fg_color=BG_TERTIARY,
            corner_radius=RADIUS_SM
        )
        priority_menu.pack(fill="x", pady=(0, 12))
        
        # Due date
        NeonLabel(form_frame, text="Due Date", size="normal", color="secondary").pack(anchor="w", pady=(0, 4))
        date_entry = NeonEntry(form_frame, placeholder="YYYY-MM-DD")
        date_entry.pack(fill="x", pady=(0, 12))
        
        # Buttons
        buttons_frame = ctk.CTkFrame(content, fg_color="transparent")
        buttons_frame.pack(fill="x", padx=PADDING_LG, pady=(0, PADDING_LG))
        
        cancel_btn = NeonSecondaryButton(
            buttons_frame,
            text="Cancel",
            command=self.task_modal.destroy
        )
        cancel_btn.pack(side="left", padx=(0, 8))
        
        create_btn = NeonButton(
            buttons_frame,
            text="Create Task",
            command=lambda: self._create_task(
                title_entry.get(),
                category_var.get(),
                priority_var.get(),
                date_entry.get()
            )
        )
        create_btn.pack(side="left")
    
    def _create_task(self, title, category, priority, due_date_str):
        """Create a new task"""
        if not title:
            print("Title is required")
            return
        
        # Parse due date
        due_date = None
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str)
            except ValueError:
                print("Invalid date format")
                return
        
        # Create task
        task_id = task_manager.get_next_id()
        task = Task(
            task_id=task_id,
            title=title,
            description="",
            due_date=due_date,
            category=category,
            priority=priority
        )
        
        task_manager.add_task(task)
        
        # Close modal and refresh
        if self.task_modal:
            self.task_modal.destroy()
        self._refresh_tasks()
    
    def _on_complete_task(self, task_id):
        """Handle task completion"""
        task_manager.mark_completed(task_id)
        self._refresh_tasks()
    
    def _on_delete_task(self, task_id):
        """Handle task deletion"""
        task_manager.delete_task(task_id)
        self._refresh_tasks()
    
    def refresh(self):
        """Refresh tasks view"""
        self._refresh_tasks()


# Import after class definition
from utils.theme import lighten_color
