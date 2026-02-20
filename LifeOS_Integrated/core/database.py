import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(APP_DIR, 'config', 'app_config.json')

class DatabaseConfig:
    _config = None

    @classmethod
    def load_config(cls):
        if cls._config is None:
            try:
                with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                    cls._config = json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
                # Fallback
                cls._config = {
                    "database": {
                        "shared_path": "tasks.json",
                        "notes_path": "notes"
                    }
                }
        return cls._config

    @classmethod
    def get_tasks_db_path(cls):
        cfg = cls.load_config()
        rel_path = cfg.get('database', {}).get('shared_path', 'database/tasks.json')
        return os.path.join(BASE_DIR, rel_path)

    @classmethod
    def get_projects_db_path(cls):
        cfg = cls.load_config()
        # Derive projects path from shared_path directory
        tasks_path = cfg.get('database', {}).get('shared_path', 'database/tasks.json')
        db_dir = os.path.dirname(tasks_path)
        rel_path = os.path.join(db_dir, 'projects.json')
        return os.path.join(BASE_DIR, rel_path)

    @classmethod
    def get_notes_path(cls):
        cfg = cls.load_config()
        rel_path = cfg.get('database', {}).get('notes_path', 'database/notes')
        path = os.path.join(BASE_DIR, rel_path)
        os.makedirs(path, exist_ok=True)
        return path
