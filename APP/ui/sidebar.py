"""
Sidebar Navigation Component
Left sidebar with logo and navigation buttons
"""

import customtkinter as ctk
from config import *
from ui.widgets import NeonLabel


class Sidebar(ctk.CTkFrame):
    """Sidebar navigation with logo and menu items"""
    
    def __init__(self, master, on_navigate=None, **kwargs):
        super().__init__(
            master,
            width=SIDEBAR_WIDTH,
            fg_color=BG_SECONDARY,
            corner_radius=0,
            **kwargs
        )
        
        self.on_navigate = on_navigate
        self.active_tab = "dashboard"
        self.nav_buttons = {}
        
        # Prevent frame from shrinking
        self.grid_propagate(False)
        
        # Logo area
        self._create_logo_area()
        
        # Navigation links
        self._create_navigation()
        
        # Bottom settings (spacer + settings button)
        self._create_bottom_section()
    
    def _create_logo_area(self):
        """Create logo section at top"""
        logo_frame = ctk.CTkFrame(self, fg_color="transparent")
        logo_frame.pack(fill="x", padx=PADDING_LG, pady=(PADDING_LG, PADDING_LG * 2))
        
        # Logo icon (simple colored circle with gradient effect)
        logo_icon = ctk.CTkFrame(
            logo_frame,
            width=40,
            height=40,
            fg_color=ACCENT_BLUE,
            corner_radius=20
        )
        logo_icon.pack(side="left", padx=(0, 12))
        logo_icon.pack_propagate(False)
        
        # Logo text
        logo_label = NeonLabel(
            logo_frame,
            text="LifeOS",
            size="subheading",
            color="primary"
        )
        logo_label.pack(side="left")
    
    def _create_navigation(self):
        """Create navigation menu"""
        nav_frame = ctk.CTkFrame(self, fg_color="transparent")
        nav_frame.pack(fill="both", expand=True, padx=PADDING_MD, pady=PADDING_MD)
        
        # Navigation items
        nav_items = [
            ("dashboard", "⊞", "Dashboard"),
            ("tasks", "✓", "Tasks"),
            ("writing", "✎", "Writing")
        ]
        
        for tab_id, icon, label in nav_items:
            btn = self._create_nav_button(nav_frame, tab_id, icon, label)
            btn.pack(fill="x", pady=4)
            self.nav_buttons[tab_id] = btn
        
        # Set initial active state
        self._set_active(self.active_tab)
    
    def _create_nav_button(self, parent, tab_id, icon, label):
        """Create a single navigation button"""
        btn = ctk.CTkButton(
            parent,
            text=f"{icon}  {label}",
            anchor="w",
            fg_color="transparent",
            hover_color=HOVER_BG,
            text_color=TEXT_SECONDARY,
            font=(FONT_BODY, FONT_SIZE_NORMAL),
            corner_radius=RADIUS_SM,
            height=40,
            command=lambda: self._on_nav_click(tab_id)
        )
        return btn
    
    def _create_bottom_section(self):
        """Create bottom section with settings"""
        # Spacer
        spacer = ctk.CTkFrame(self, fg_color="transparent", height=20)
        spacer.pack(fill="x")
        
        # Settings button
        settings_btn = ctk.CTkButton(
            self,
            text="⚙  Settings",
            anchor="w",
            fg_color="transparent",
            hover_color=HOVER_BG,
            text_color=TEXT_SECONDARY,
            font=(FONT_BODY, FONT_SIZE_NORMAL),
            corner_radius=RADIUS_SM,
            height=40,
            command=self._on_settings_click
        )
        settings_btn.pack(fill="x", padx=PADDING_MD, pady=PADDING_MD)
    
    def _on_nav_click(self, tab_id):
        """Handle navigation button click"""
        self._set_active(tab_id)
        if self.on_navigate:
            self.on_navigate(tab_id)
    
    def _set_active(self, tab_id):
        """Set active navigation button"""
        self.active_tab = tab_id
        
        # Update all buttons
        for btn_id, btn in self.nav_buttons.items():
            if btn_id == tab_id:
                # Active state - gradient background
                btn.configure(
                    fg_color=ACCENT_BLUE,
                    text_color="#ffffff"
                )
            else:
                # Inactive state
                btn.configure(
                    fg_color="transparent",
                    text_color=TEXT_SECONDARY
                )
    
    def _on_settings_click(self):
        """Handle settings button click"""
        print("Settings clicked")  # Placeholder
