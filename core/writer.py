import os
import glob
from datetime import datetime
from core.database import DatabaseConfig

class WriterManager:
    def __init__(self):
        self.notes_dir = DatabaseConfig.get_notes_path()
        # Ensure default folders
        for folder in ['Journal', 'Projects', 'Ideas', 'Archive']:
            os.makedirs(os.path.join(self.notes_dir, folder), exist_ok=True)

    def get_structure(self):
        """Returns folders and files structure."""
        structure = {}
        # List directories
        folders = [d for d in os.listdir(self.notes_dir) if os.path.isdir(os.path.join(self.notes_dir, d))]
        
        for folder in folders:
            folder_path = os.path.join(self.notes_dir, folder)
            files = []
            # List .txt files (simple implementation)
            for f in glob.glob(os.path.join(folder_path, "*.txt")):
                stat = os.stat(f)
                files.append({
                    "name": os.path.basename(f),
                    "path": f, # Absolute path (be careful exposing this, usually use relative or ID)
                    "folder": folder,
                    "updated": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
            # Sort files by updated desc
            files.sort(key=lambda x: x['updated'], reverse=True)
            structure[folder] = files
        return structure

    def read_note(self, folder, filename):
        path = os.path.join(self.notes_dir, folder, filename)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""

    def save_note(self, folder, filename, content):
        folder_path = os.path.join(self.notes_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Ensure extension
        if not filename.endswith('.txt'):
            filename += '.txt'
            
        path = os.path.join(folder_path, filename)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

    def create_folder(self, folder_name):
        folder_path = os.path.join(self.notes_dir, folder_name)
        try:
            os.makedirs(folder_path, exist_ok=True)
            return True
        except Exception as e:
            print(f"Error creating folder: {e}")
            return False

    def delete_folder(self, folder_name):
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

writer_manager = WriterManager()