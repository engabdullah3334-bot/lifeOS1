"""
LifeOS - Pure Python Desktop Application
Main application entry point
"""

import customtkinter as ctk
from config import *
from utils.theme import apply_theme
from ui.sidebar import Sidebar
from ui.dashboard import DashboardView
from ui.tasks import TasksView
from ui.writing import WritingView


class LifeOSApp(ctk.CTk):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        
        # Window configuration
        self.title("LifeOS")
        self.geometry(f"{WINDOW_WIDTH}x{WINDOW_HEIGHT}")
        self.configure(fg_color=BG_MAIN)
        
        # Apply theme
        apply_theme()
        
        # Configure grid
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Create sidebar
        self.sidebar = Sidebar(self, on_navigate=self.navigate_to)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        
        # Create main content area
        self.content_area = ctk.CTkFrame(self, fg_color=BG_MAIN)
        self.content_area.grid(row=0, column=1, sticky="nsew")
        self.content_area.grid_columnconfigure(0, weight=1)
        self.content_area.grid_rowconfigure(0, weight=1)
        
        # Create views
        self.views = {}
        self._create_views()
        
        # Show initial view
        self.current_view = None
        self.navigate_to("dashboard")
    
    def _create_views(self):
        """Create all application views"""
        # Dashboard
        self.views["dashboard"] = DashboardView(self.content_area)
        self.views["dashboard"].grid(row=0, column=0, sticky="nsew")
        
        # Tasks
        self.views["tasks"] = TasksView(self.content_area)
        self.views["tasks"].grid(row=0, column=0, sticky="nsew")
        
        # Writing
        self.views["writing"] = WritingView(self.content_area)
        self.views["writing"].grid(row=0, column=0, sticky="nsew")
        
        # Hide all views initially
        for view in self.views.values():
            view.grid_remove()
    
    def navigate_to(self, view_name):
        """Navigate to a specific view"""
        # Hide current view
        if self.current_view and self.current_view in self.views:
            self.views[self.current_view].grid_remove()
        
        # Show new view
        if view_name in self.views:
            self.views[view_name].grid()
            self.current_view = view_name
            
            # Refresh view data
            if hasattr(self.views[view_name], 'refresh'):
                self.views[view_name].refresh()


def main():
    """Main entry point"""
    print("=" * 50)
    print("   LifeOS - Pure Python Desktop Application")
    print("=" * 50)
    print("Starting application...")
    
    app = LifeOSApp()
    app.mainloop()


if __name__ == "__main__":
    main()
