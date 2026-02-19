"""
Custom Widgets with Neon Theme
Reusable UI components styled with the LifeOS neon dark theme
"""

import customtkinter as ctk
from config import *
from utils.theme import lighten_color, darken_color


class NeonButton(ctk.CTkButton):
    """Button with gradient background and glow effect"""
    
    def __init__(self, master, text="", command=None, **kwargs):
        super().__init__(
            master,
            text=text,
            command=command,
            fg_color=ACCENT_BLUE,
            hover_color=lighten_color(ACCENT_BLUE, 0.1),
            text_color="#ffffff",
            font=(FONT_BODY, FONT_SIZE_NORMAL, "bold"),
            corner_radius=RADIUS_SM,
            border_width=0,
            **kwargs
        )


class NeonSecondaryButton(ctk.CTkButton):
    """Secondary button with subtle styling"""
    
    def __init__(self, master, text="", command=None, **kwargs):
        super().__init__(
            master,
            text=text,
            command=command,
            fg_color="transparent",
            hover_color=HOVER_BG,
            text_color=TEXT_SECONDARY,
            font=(FONT_BODY, FONT_SIZE_NORMAL),
            corner_radius=RADIUS_SM,
            border_width=1,
            border_color=BORDER_COLOR,
            **kwargs
        )


class NeonCard(ctk.CTkFrame):
    """Card container with border and background"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_SECONDARY,
            corner_radius=RADIUS_MD,
            border_width=1,
            border_color=BORDER_COLOR,
            **kwargs
        )


class NeonEntry(ctk.CTkEntry):
    """Styled text input field"""
    
    def __init__(self, master, placeholder="", **kwargs):
        super().__init__(
            master,
            placeholder_text=placeholder,
            fg_color=BG_TERTIARY,
            border_color=BORDER_COLOR,
            text_color=TEXT_PRIMARY,
            placeholder_text_color=TEXT_MUTED,
            font=(FONT_BODY, FONT_SIZE_NORMAL),
            corner_radius=RADIUS_SM,
            border_width=1,
            **kwargs
        )


class NeonTextArea(ctk.CTkTextbox):
    """Styled multi-line text area"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_TERTIARY,
            border_color=BORDER_COLOR,
            text_color=TEXT_PRIMARY,
            font=(FONT_BODY, FONT_SIZE_NORMAL),
            corner_radius=RADIUS_SM,
            border_width=1,
            **kwargs
        )


class NeonLabel(ctk.CTkLabel):
    """Styled label"""
    
    def __init__(self, master, text="", size="normal", color="primary", **kwargs):
        # Determine font size
        if size == "heading":
            font_size = FONT_SIZE_HEADING
            font_family = FONT_HEADING
            weight = "bold"
        elif size == "subheading":
            font_size = FONT_SIZE_SUBHEADING
            font_family = FONT_HEADING
            weight = "bold"
        elif size == "small":
            font_size = FONT_SIZE_SMALL
            font_family = FONT_BODY
            weight = "normal"
        else:
            font_size = FONT_SIZE_NORMAL
            font_family = FONT_BODY
            weight = "normal"
        
        # Determine text color
        if color == "primary":
            text_color = TEXT_PRIMARY
        elif color == "secondary":
            text_color = TEXT_SECONDARY
        elif color == "muted":
            text_color = TEXT_MUTED
        elif color == "success":
            text_color = SUCCESS
        elif color == "warning":
            text_color = WARNING
        elif color == "danger":
            text_color = DANGER
        else:
            text_color = TEXT_PRIMARY
        
        super().__init__(
            master,
            text=text,
            text_color=text_color,
            font=(font_family, font_size, weight),
            **kwargs
        )


class NeonProgressBar(ctk.CTkProgressBar):
    """Animated progress bar with gradient"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_TERTIARY,
            progress_color=ACCENT_BLUE,
            corner_radius=RADIUS_SM,
            border_width=0,
            height=8,
            **kwargs
        )


class NeonScrollableFrame(ctk.CTkScrollableFrame):
    """Scrollable frame with custom styling"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color="transparent",
            corner_radius=0,
            **kwargs
        )


class TaskCard(NeonCard):
    """Task card widget with title, priority indicator, and actions"""
    
    def __init__(self, master, task, on_complete=None, on_delete=None, **kwargs):
        super().__init__(master, **kwargs)
        
        self.task = task
        self.on_complete = on_complete
        self.on_delete = on_delete
        
        # Configure grid
        self.grid_columnconfigure(1, weight=1)
        
        # Priority indicator (colored bar on left)
        priority_colors = {
            "low": TEXT_MUTED,
            "medium": WARNING,
            "high": DANGER,
            "critical": ACCENT_PURPLE
        }
        priority_color = priority_colors.get(task.priority, TEXT_MUTED)
        
        priority_bar = ctk.CTkFrame(
            self,
            width=4,
            fg_color=priority_color,
            corner_radius=0
        )
        priority_bar.grid(row=0, column=0, rowspan=2, sticky="ns", padx=(0, 12))
        
        # Task title
        title_label = NeonLabel(
            self,
            text=task.title,
            size="normal",
            anchor="w"
        )
        title_label.grid(row=0, column=1, sticky="w", pady=(8, 2))
        
        # Task metadata (category, due date)
        metadata_text = f"{task.category}"
        if task.due_date:
            metadata_text += f" • Due: {task.due_date.strftime('%b %d')}"
        
        metadata_label = NeonLabel(
            self,
            text=metadata_text,
            size="small",
            color="muted",
            anchor="w"
        )
        metadata_label.grid(row=1, column=1, sticky="w", pady=(0, 8))
        
        # Action buttons
        actions_frame = ctk.CTkFrame(self, fg_color="transparent")
        actions_frame.grid(row=0, column=2, rowspan=2, padx=8, pady=8)
        
        if task.status != "completed":
            complete_btn = ctk.CTkButton(
                actions_frame,
                text="✓",
                width=30,
                height=30,
                fg_color=SUCCESS,
                hover_color=lighten_color(SUCCESS, 0.1),
                command=lambda: self.on_complete(task.task_id) if self.on_complete else None,
                corner_radius=RADIUS_SM
            )
            complete_btn.pack(side="left", padx=2)
        
        delete_btn = ctk.CTkButton(
            actions_frame,
            text="×",
            width=30,
            height=30,
            fg_color=DANGER,
            hover_color=lighten_color(DANGER, 0.1),
            command=lambda: self.on_delete(task.task_id) if self.on_delete else None,
            corner_radius=RADIUS_SM
        )
        delete_btn.pack(side="left", padx=2)
