import json
import os
from datetime import datetime
from core.database import DatabaseConfig

# Constants
CATEGORY   = ["work", "study", "personal", "health"]
PRIORITY   = ["low", "medium", "high", "critical"] 
STATUS     = ["pending", "in_progress", "completed", "delayed"]

class Task:
    def __init__(self, task_id, title, description, due_date, category, priority, status="pending", created_at=None, start_time=None, end_time=None, recurrence=None, estimated_time=None, actual_time=None, notes=None): 
        self.task_id = task_id
        self.title = title
        self.description = description
        if due_date:
            self.due_date = due_date if isinstance(due_date, datetime) else datetime.fromisoformat(due_date)
        else:
            self.due_date = None
        self.category = category
        self.priority = priority
        self.status = status
        self.created_at = created_at if created_at else datetime.now()
        if isinstance(self.created_at, str): self.created_at = datetime.fromisoformat(self.created_at)
        
        self.start_time = start_time
        if isinstance(self.start_time, str): self.start_time = datetime.fromisoformat(self.start_time)
        self.end_time = end_time
        if isinstance(self.end_time, str): self.end_time = datetime.fromisoformat(self.end_time)

        self.recurrence = recurrence
        self.estimated_time = estimated_time
        self.actual_time = actual_time
        self.notes = notes

    def to_dict(self):
        return {
            "id": self.task_id, # Frontend compat
            "task_id": self.task_id,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat(),
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "recurrence": self.recurrence,
            "estimated_time": self.estimated_time,
            "actual_time": self.actual_time,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data):
        # Handle frontend 'id' vs 'task_id' if needed, but constructor uses task_id
        # sanitize args
        valid_keys = cls.__init__.__code__.co_varnames
        filtered_data = {k: v for k, v in data.items() if k in valid_keys and k != 'self'}
        return cls(**filtered_data)

    def complete(self): 
        self.end_time = datetime.now()
        self.status = "completed"

class TaskManager:
    def __init__(self):                       
        self.tasks = {}
        self.db_path = DatabaseConfig.get_tasks_db_path()
        self.load_from_file()

    def save_to_file(self):
        data = [task.to_dict() for task in self.tasks.values()]
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"Error saving tasks: {e}")

    def load_from_file(self):
        if not os.path.exists(self.db_path):
            return
        try:
            with open(self.db_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    try:
                        task = Task.from_dict(item)
                        self.tasks[task.task_id] = task
                    except Exception as ex:
                        print(f"Skipping invalid task item: {ex}")
        except Exception as e:
            print(f"Error loading tasks: {e}")

    def add_task(self, task):                  
        self.tasks[task.task_id] = task
        self.save_to_file()
        return task

    def delete_task(self, task_id):           
        if task_id in self.tasks:
            del self.tasks[task_id]
            self.save_to_file()
            return True
        return False

    def mark_completed(self, task_id):        
        if task_id in self.tasks:
            self.tasks[task_id].complete()
            self.save_to_file()
            return True
        return False

# Shared Instance
task_manager = TaskManager()
