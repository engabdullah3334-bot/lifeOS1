"""
Dashboard View
Main dashboard with welcome banner, today's tasks, productivity, and quick note
"""

import customtkinter as ctk
from datetime import datetime
from config import *
from ui.widgets import NeonLabel, NeonCard, NeonProgressBar, NeonTextArea, NeonButton, TaskCard
from core.task_manager import task_manager


class DashboardView(ctk.CTkFrame):
    """Dashboard view with widgets"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_MAIN,
            **kwargs
        )
        
        self.quick_note_content = ""
        
        # Configure grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # Welcome banner
        self._create_welcome_banner()
        
        # Dashboard grid with widgets
        self._create_dashboard_grid()
    
    def _create_welcome_banner(self):
        """Create welcome banner at top"""
        banner = ctk.CTkFrame(self, fg_color="transparent")
        banner.grid(row=0, column=0, sticky="ew", padx=40, pady=(40, 20))
        
        # Greeting based on time
        hour = datetime.now().hour
        if hour < 12:
            greeting = "Good morning."
        elif hour < 18:
            greeting = "Good afternoon."
        else:
            greeting = "Good evening."
        
        greeting_label = NeonLabel(
            banner,
            text=greeting,
            size="heading",
            color="primary"
        )
        greeting_label.pack(anchor="w")
        
        subtitle_label = NeonLabel(
            banner,
            text="Focus is key. Here is your overview.",
            size="normal",
            color="secondary"
        )
        subtitle_label.pack(anchor="w", pady=(4, 0))
    
    def _create_dashboard_grid(self):
        """Create grid of dashboard widgets"""
        grid_container = ctk.CTkFrame(self, fg_color="transparent")
        grid_container.grid(row=1, column=0, sticky="nsew", padx=40, pady=(0, 40))
        
        # Configure grid - 2 columns
        grid_container.grid_columnconfigure(0, weight=1)
        grid_container.grid_columnconfigure(1, weight=1)
        grid_container.grid_rowconfigure(0, weight=1)
        grid_container.grid_rowconfigure(1, weight=0)
        
        # Today's Focus widget (left, spans 2 rows)
        self.tasks_widget = self._create_tasks_widget(grid_container)
        self.tasks_widget.grid(row=0, column=0, rowspan=2, sticky="nsew", padx=(0, 10))
        
        # Productivity widget (top right)
        self.productivity_widget = self._create_productivity_widget(grid_container)
        self.productivity_widget.grid(row=0, column=1, sticky="nsew", padx=(10, 0), pady=(0, 10))
        
        # Quick Note widget (bottom right)
        self.quick_note_widget = self._create_quick_note_widget(grid_container)
        self.quick_note_widget.grid(row=1, column=1, sticky="nsew", padx=(10, 0), pady=(10, 0))
    
    def _create_tasks_widget(self, parent):
        """Create Today's Focus widget"""
        widget = NeonCard(parent)
        widget.grid_columnconfigure(0, weight=1)
        widget.grid_rowconfigure(1, weight=1)
        
        # Header
        header = ctk.CTkFrame(widget, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=PADDING_LG, pady=(PADDING_LG, PADDING_MD))
        header.grid_columnconfigure(0, weight=1)
        
        title = NeonLabel(header, text="Today's Focus", size="subheading")
        title.grid(row=0, column=0, sticky="w")
        
        add_btn = ctk.CTkButton(
            header,
            text="+",
            width=30,
            height=30,
            fg_color=ACCENT_BLUE,
            hover_color=lighten_color(ACCENT_BLUE, 0.1),
            corner_radius=RADIUS_SM,
            command=self._on_add_task
        )
        add_btn.grid(row=0, column=1, sticky="e")
        
        # Tasks list (scrollable)
        from ui.widgets import NeonScrollableFrame
        self.tasks_list = NeonScrollableFrame(widget)
        self.tasks_list.grid(row=1, column=0, sticky="nsew", padx=PADDING_MD, pady=(0, PADDING_MD))
        
        # Load today's tasks
        self._refresh_tasks()
        
        return widget
    
    def _create_productivity_widget(self, parent):
        """Create Productivity widget"""
        widget = NeonCard(parent)
        
        # Title
        title = NeonLabel(widget, text="Productivity", size="subheading")
        title.pack(anchor="w", padx=PADDING_LG, pady=(PADDING_LG, PADDING_MD))
        
        # Progress bar
        self.productivity_bar = NeonProgressBar(widget)
        self.productivity_bar.pack(fill="x", padx=PADDING_LG, pady=PADDING_MD)
        
        # Percentage text
        self.productivity_text = NeonLabel(
            widget,
            text="0% Daily Goal",
            size="normal",
            color="secondary"
        )
        self.productivity_text.pack(anchor="w", padx=PADDING_LG, pady=(0, PADDING_LG))
        
        # Update productivity
        self._refresh_productivity()
        
        return widget
    
    def _create_quick_note_widget(self, parent):
        """Create Quick Note widget"""
        widget = NeonCard(parent)
        widget.grid_columnconfigure(0, weight=1)
        widget.grid_rowconfigure(1, weight=1)
        
        # Header
        header = ctk.CTkFrame(widget, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=PADDING_LG, pady=(PADDING_LG, PADDING_MD))
        header.grid_columnconfigure(0, weight=1)
        
        title = NeonLabel(header, text="Quick Note", size="subheading")
        title.grid(row=0, column=0, sticky="w")
        
        save_btn = NeonButton(
            header,
            text="Save",
            width=60,
            height=30,
            command=self._save_quick_note
        )
        save_btn.grid(row=0, column=1, sticky="e")
        
        # Text area
        self.quick_note_area = NeonTextArea(widget)
        self.quick_note_area.grid(row=1, column=0, sticky="nsew", padx=PADDING_LG, pady=(0, PADDING_LG))
        
        # Load saved note if exists
        self._load_quick_note()
        
        return widget
    
    def _refresh_tasks(self):
        """Refresh today's tasks list"""
        # Clear existing tasks
        for widget in self.tasks_list.winfo_children():
            widget.destroy()
        
        # Get today's tasks
        today_tasks = task_manager.get_today_tasks()
        
        if not today_tasks:
            no_tasks_label = NeonLabel(
                self.tasks_list,
                text="No tasks for today. Great job!",
                size="small",
                color="muted"
            )
            no_tasks_label.pack(pady=20)
        else:
            for task in today_tasks:
                task_card = TaskCard(
                    self.tasks_list,
                    task=task,
                    on_complete=self._on_complete_task,
                    on_delete=self._on_delete_task
                )
                task_card.pack(fill="x", pady=4)
    
    def _refresh_productivity(self):
        """Update productivity percentage"""
        percentage = task_manager.get_productivity_percentage()
        self.productivity_bar.set(percentage / 100)
        self.productivity_text.configure(text=f"{percentage}% Daily Goal")
    
    def _on_add_task(self):
        """Handle add task button"""
        print("Add task clicked")  # Will be implemented with task modal
    
    def _on_complete_task(self, task_id):
        """Handle task completion"""
        task_manager.mark_completed(task_id)
        self._refresh_tasks()
        self._refresh_productivity()
    
    def _on_delete_task(self, task_id):
        """Handle task deletion"""
        task_manager.delete_task(task_id)
        self._refresh_tasks()
        self._refresh_productivity()
    
    def _save_quick_note(self):
        """Save quick note"""
        content = self.quick_note_area.get("1.0", "end-1c")
        # Save to a simple text file
        try:
            import os
            note_path = os.path.join(os.path.dirname(NOTES_DIR), "quick_note.txt")
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Quick note saved!")
        except Exception as e:
            print(f"Error saving quick note: {e}")
    
    def _load_quick_note(self):
        """Load saved quick note"""
        try:
            import os
            note_path = os.path.join(os.path.dirname(NOTES_DIR), "quick_note.txt")
            if os.path.exists(note_path):
                with open(note_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    self.quick_note_area.delete("1.0", "end")
                    self.quick_note_area.insert("1.0", content)
        except Exception as e:
            print(f"Error loading quick note: {e}")
    
    def refresh(self):
        """Refresh all dashboard data"""
        self._refresh_tasks()
        self._refresh_productivity()


# Import after class definition to avoid circular import
from utils.theme import lighten_color
