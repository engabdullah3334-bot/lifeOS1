"""
Writer Manager - Port from LifeOS_Integrated
Handles folder and file operations for the writing space
"""

import os
import glob
from datetime import datetime
from config import NOTES_DIR



class WriterManager:
    def __init__(self):
        self.notes_dir = NOTES_DIR
        # Ensure default folders
        for folder in ['Journal', 'Projects', 'Ideas', 'Archive']:
            os.makedirs(os.path.join(self.notes_dir, folder), exist_ok=True)

    def get_structure(self):
        """Returns folders and files structure"""
        structure = {}
        # List directories
        try:
            folders = [d for d in os.listdir(self.notes_dir) 
                      if os.path.isdir(os.path.join(self.notes_dir, d))]
        except FileNotFoundError:
            os.makedirs(self.notes_dir, exist_ok=True)
            folders = []
        
        for folder in folders:
            folder_path = os.path.join(self.notes_dir, folder)
            files = []
            # List .txt files
            for f in glob.glob(os.path.join(folder_path, "*.txt")):
                try:
                    stat = os.stat(f)
                    files.append({
                        "name": os.path.basename(f),
                        "path": f,
                        "folder": folder,
                        "updated": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                except Exception as e:
                    print(f"Error reading file {f}: {e}")
            # Sort files by updated desc
            files.sort(key=lambda x: x['updated'], reverse=True)
            structure[folder] = files
        return structure

    def get_folders(self):
        """Get list of all folders"""
        try:
            folders = [d for d in os.listdir(self.notes_dir) 
                      if os.path.isdir(os.path.join(self.notes_dir, d))]
            return sorted(folders)
        except FileNotFoundError:
            os.makedirs(self.notes_dir, exist_ok=True)
            return []

    def read_note(self, folder, filename):
        """Read note content"""
        path = os.path.join(self.notes_dir, folder, filename)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"Error reading note: {e}")
                return ""
        return ""

    def save_note(self, folder, filename, content):
        """Save note content"""
        folder_path = os.path.join(self.notes_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Ensure extension
        if not filename.endswith('.txt'):
            filename += '.txt'
        
        path = os.path.join(folder_path, filename)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error saving note: {e}")
            return False

    def create_folder(self, folder_name):
        """Create a new folder"""
        folder_path = os.path.join(self.notes_dir, folder_name)
        try:
            os.makedirs(folder_path, exist_ok=True)
            return True
        except Exception as e:
            print(f"Error creating folder: {e}")
            return False

    def delete_folder(self, folder_name):
        """Delete a folder and all its contents"""
        import shutil
        folder_path = os.path.join(self.notes_dir, folder_name)
        try:
            if os.path.exists(folder_path):
                shutil.rmtree(folder_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting folder: {e}")
            return False

    def delete_note(self, folder, filename):
        """Delete a note"""
        # Ensure extension
        if not filename.endswith('.txt'):
            filename += '.txt'
        path = os.path.join(self.notes_dir, folder, filename)
        try:
            if os.path.exists(path):
                os.remove(path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting note: {e}")
            return False

    def rename_note(self, folder, old_filename, new_filename):
        """Rename a note"""
        # Ensure extensions
        if not old_filename.endswith('.txt'):
            old_filename += '.txt'
        if not new_filename.endswith('.txt'):
            new_filename += '.txt'
        
        old_path = os.path.join(self.notes_dir, folder, old_filename)
        new_path = os.path.join(self.notes_dir, folder, new_filename)
        
        try:
            if os.path.exists(old_path):
                os.rename(old_path, new_path)
                return True
            return False
        except Exception as e:
            print(f"Error renaming note: {e}")
            return False

    def get_unique_name(self, folder, base_name, extension='.txt'):
        """Get a unique filename by appending numbers if needed"""
        if not base_name.endswith(extension):
            base_name += extension
        
        path = os.path.join(self.notes_dir, folder, base_name)
        if not os.path.exists(path):
            return base_name
        
        # Extract name without extension
        name_without_ext = base_name[:-len(extension)]
        counter = 2
        while True:
            new_name = f"{name_without_ext} ({counter}){extension}"
            new_path = os.path.join(self.notes_dir, folder, new_name)
            if not os.path.exists(new_path):
                return new_name
            counter += 1


# Shared instance
writer_manager = WriterManager()
