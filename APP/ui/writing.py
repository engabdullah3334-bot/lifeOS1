"""
Writing Space View
Three-column layout with folders, files, and rich text editor
"""

import customtkinter as ctk
from config import *
from ui.widgets import (NeonLabel, NeonCard, NeonButton, NeonSecondaryButton, 
                        NeonEntry, NeonScrollableFrame, NeonTextArea)
from core.writer_manager import writer_manager


class WritingView(ctk.CTkFrame):
    """Writing space with folders, files, and editor"""
    
    def __init__(self, master, **kwargs):
        super().__init__(
            master,
            fg_color=BG_MAIN,
            **kwargs
        )
        
        self.current_folder = None
        self.current_file = None
        self.auto_save_job = None
        
        # Configure grid - 3 columns
        self.grid_columnconfigure(0, weight=0, minsize=200)  # Folders
        self.grid_columnconfigure(1, weight=0, minsize=200)  # Files
        self.grid_columnconfigure(2, weight=1)  # Editor
        self.grid_rowconfigure(0, weight=1)
        
        # Create three columns
        self._create_folders_column()
        self._create_files_column()
        self._create_editor_column()
        
        # Load initial data
        self._refresh_folders()
    
    def _create_folders_column(self):
        """Create folders sidebar"""
        self.folders_col = NeonCard(self)
        self.folders_col.grid(row=0, column=0, sticky="nsew", padx=(40, 5), pady=40)
        self.folders_col.grid_columnconfigure(0, weight=1)
        self.folders_col.grid_rowconfigure(1, weight=1)
        
        # Header
        header = ctk.CTkFrame(self.folders_col, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=PADDING_MD, pady=(PADDING_MD, 0))
        header.grid_columnconfigure(0, weight=1)
        
        title = NeonLabel(header, text="Folders", size="subheading")
        title.grid(row=0, column=0, sticky="w")
        
        add_btn = ctk.CTkButton(
            header,
            text="+",
            width=30,
            height=30,
            fg_color=ACCENT_BLUE,
            hover_color=lighten_color(ACCENT_BLUE, 0.1),
            corner_radius=RADIUS_SM,
            command=self._new_folder
        )
        add_btn.grid(row=0, column=1, sticky="e")
        
        # Folder list
        self.folders_list = NeonScrollableFrame(self.folders_col)
        self.folders_list.grid(row=1, column=0, sticky="nsew", padx=PADDING_SM, pady=PADDING_SM)
    
    def _create_files_column(self):
        """Create files sidebar"""
        self.files_col = NeonCard(self)
        self.files_col.grid(row=0, column=1, sticky="nsew", padx=5, pady=40)
        self.files_col.grid_columnconfigure(0, weight=1)
        self.files_col.grid_rowconfigure(1, weight=1)
        
        # Header
        header = ctk.CTkFrame(self.files_col, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=PADDING_MD, pady=(PADDING_MD, 0))
        header.grid_columnconfigure(0, weight=1)
        
        title = NeonLabel(header, text="Files", size="subheading")
        title.grid(row=0, column=0, sticky="w")
        
        add_btn = ctk.CTkButton(
            header,
            text="+",
            width=30,
            height=30,
            fg_color=ACCENT_BLUE,
            hover_color=lighten_color(ACCENT_BLUE, 0.1),
            corner_radius=RADIUS_SM,
            command=self._new_note
        )
        add_btn.grid(row=0, column=1, sticky="e")
        
        # File list
        self.files_list = NeonScrollableFrame(self.files_col)
        self.files_list.grid(row=1, column=0, sticky="nsew", padx=PADDING_SM, pady=PADDING_SM)
    
    def _create_editor_column(self):
        """Create editor area"""
        self.editor_col = NeonCard(self)
        self.editor_col.grid(row=0, column=2, sticky="nsew", padx=(5, 40), pady=40)
        self.editor_col.grid_columnconfigure(0, weight=1)
        self.editor_col.grid_rowconfigure(2, weight=1)
        
        # Editor header
        header = ctk.CTkFrame(self.editor_col, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=PADDING_LG, pady=(PADDING_LG, 0))
        header.grid_columnconfigure(0, weight=1)
        
        self.note_title_entry = NeonEntry(header, placeholder="Note Title...")
        self.note_title_entry.grid(row=0, column=0, sticky="ew", padx=(0, 12))
        self.note_title_entry.configure(state="disabled")
        
        # Header actions
        actions_frame = ctk.CTkFrame(header, fg_color="transparent")
        actions_frame.grid(row=0, column=1, sticky="e")
        
        self.save_status_label = NeonLabel(
            actions_frame,
            text="Saved",
            size="small",
            color="success"
        )
        self.save_status_label.pack(side="left", padx=8)
        
        close_btn = ctk.CTkButton(
            actions_frame,
            text="×",
            width=30,
            height=30,
            fg_color="transparent",
            hover_color=HOVER_BG,
            text_color=TEXT_SECONDARY,
            corner_radius=RADIUS_SM,
            command=self._close_note
        )
        close_btn.pack(side="left")
        
        # Toolbar
        self._create_toolbar()
        
        # Editor
        self.editor = NeonTextArea(self.editor_col)
        self.editor.grid(row=2, column=0, sticky="nsew", padx=PADDING_LG, pady=(0, PADDING_LG))
        self.editor.configure(state="disabled")
        
        # Bind text change for auto-save
        self.editor.bind("<<Modified>>", self._on_text_modified)
    
    def _create_toolbar(self):
        """Create formatting toolbar"""
        toolbar = ctk.CTkFrame(self.editor_col, fg_color=BG_TERTIARY, height=40)
        toolbar.grid(row=1, column=0, sticky="ew", padx=PADDING_LG, pady=PADDING_MD)
        toolbar.grid_propagate(False)
        
        # Toolbar buttons (simplified - just placeholders)
        buttons_frame = ctk.CTkFrame(toolbar, fg_color="transparent")
        buttons_frame.pack(side="left", padx=PADDING_SM, pady=PADDING_SM)
        
        toolbar_buttons = [
            ("B", "Bold"),
            ("I", "Italic"),
            ("U", "Underline"),
        ]
        
        for text, tooltip in toolbar_buttons:
            btn = ctk.CTkButton(
                buttons_frame,
                text=text,
                width=30,
                height=30,
                fg_color="transparent",
                hover_color=HOVER_BG,
                text_color=TEXT_SECONDARY,
                font=(FONT_BODY, FONT_SIZE_SMALL, "bold"),
                corner_radius=RADIUS_SM
            )
            btn.pack(side="left", padx=2)
    
    def _refresh_folders(self):
        """Refresh folders list"""
        # Clear existing
        for widget in self.folders_list.winfo_children():
            widget.destroy()
        
        # Get folders
        folders = writer_manager.get_folders()
        
        for folder in folders:
            btn = ctk.CTkButton(
                self.folders_list,
                text=f"📁 {folder}",
                anchor="w",
                fg_color="transparent" if folder != self.current_folder else ACCENT_BLUE,
                hover_color=HOVER_BG,
                text_color=TEXT_PRIMARY if folder == self.current_folder else TEXT_SECONDARY,
                font=(FONT_BODY, FONT_SIZE_NORMAL),
                corner_radius=RADIUS_SM,
                height=36,
                command=lambda f=folder: self._select_folder(f)
            )
            btn.pack(fill="x", pady=2)
    
    def _refresh_files(self):
        """Refresh files list for current folder"""
        # Clear existing
        for widget in self.files_list.winfo_children():
            widget.destroy()
        
        if not self.current_folder:
            return
        
        # Get files
        structure = writer_manager.get_structure()
        files = structure.get(self.current_folder, [])
        
        if not files:
            no_files_label = NeonLabel(
                self.files_list,
                text="No notes yet",
                size="small",
                color="muted"
            )
            no_files_label.pack(pady=20)
        else:
            for file_info in files:
                filename = file_info['name']
                btn = ctk.CTkButton(
                    self.files_list,
                    text=f"📄 {filename[:-4]}",  # Remove .txt extension
                    anchor="w",
                    fg_color="transparent" if filename != self.current_file else ACCENT_BLUE,
                    hover_color=HOVER_BG,
                    text_color=TEXT_PRIMARY if filename == self.current_file else TEXT_SECONDARY,
                    font=(FONT_BODY, FONT_SIZE_NORMAL),
                    corner_radius=RADIUS_SM,
                    height=36,
                    command=lambda f=filename: self._select_file(f)
                )
                btn.pack(fill="x", pady=2)
    
    def _select_folder(self, folder):
        """Select a folder"""
        self.current_folder = folder
        self.current_file = None
        self._refresh_folders()
        self._refresh_files()
        self._close_note()
    
    def _select_file(self, filename):
        """Select and open a file"""
        if not self.current_folder:
            return
        
        # Save current file if any
        if self.current_file and self.current_folder:
            self._save_current_note()
        
        self.current_file = filename
        self._refresh_files()
        
        # Load file content
        content = writer_manager.read_note(self.current_folder, filename)
        
        # Update UI
        self.note_title_entry.configure(state="normal")
        self.note_title_entry.delete(0, "end")
        self.note_title_entry.insert(0, filename[:-4])  # Remove .txt
        
        self.editor.configure(state="normal")
        self.editor.delete("1.0", "end")
        self.editor.insert("1.0", content)
        
        self.save_status_label.configure(text="Saved", text_color=SUCCESS)
    
    def _close_note(self):
        """Close current note"""
        if self.current_file and self.current_folder:
            self._save_current_note()
        
        self.current_file = None
        self.note_title_entry.configure(state="disabled")
        self.note_title_entry.delete(0, "end")
        self.editor.configure(state="disabled")
        self.editor.delete("1.0", "end")
        self._refresh_files()
    
    def _save_current_note(self):
        """Save the currently open note"""
        if not self.current_file or not self.current_folder:
            return
        
        content = self.editor.get("1.0", "end-1c")
        writer_manager.save_note(self.current_folder, self.current_file, content)
        self.save_status_label.configure(text="Saved", text_color=SUCCESS)
    
    def _on_text_modified(self, event=None):
        """Handle text modification for auto-save"""
        if self.editor.edit_modified():
            self.save_status_label.configure(text="Saving...", text_color=WARNING)
            
            # Cancel previous auto-save job
            if self.auto_save_job:
                self.after_cancel(self.auto_save_job)
            
            # Schedule auto-save after 1 second
            self.auto_save_job = self.after(1000, self._auto_save)
            
            self.editor.edit_modified(False)
    
    def _auto_save(self):
        """Auto-save after delay"""
        self._save_current_note()
    
    def _new_folder(self):
        """Create new folder"""
        # Simple dialog
        dialog = ctk.CTkInputDialog(
            text="Enter folder name:",
            title="New Folder"
        )
        folder_name = dialog.get_input()
        
        if folder_name:
            # Check for unique name
            folders = writer_manager.get_folders()
            if folder_name in folders:
                counter = 2
                while f"{folder_name} ({counter})" in folders:
                    counter += 1
                folder_name = f"{folder_name} ({counter})"
            
            writer_manager.create_folder(folder_name)
            self._refresh_folders()
    
    def _new_note(self):
        """Create new note in current folder"""
        if not self.current_folder:
            print("Please select a folder first")
            return
        
        # Simple dialog
        dialog = ctk.CTkInputDialog(
            text="Enter note name:",
            title="New Note"
        )
        note_name = dialog.get_input()
        
        if note_name:
            # Get unique filename
            filename = writer_manager.get_unique_name(self.current_folder, note_name)
            
            # Create empty note
            writer_manager.save_note(self.current_folder, filename, "")
            
            # Refresh and select new note
            self._refresh_files()
            self._select_file(filename)
    
    def refresh(self):
        """Refresh writing view"""
        self._refresh_folders()
        if self.current_folder:
            self._refresh_files()


# Import after class definition
from utils.theme import lighten_color

