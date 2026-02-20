"""
core/task.py — LifeOS Task Management Core
==========================================
Models: Project, Task
Managers: ProjectManager, TaskManager
"""

import json
import os
from datetime import datetime
from uuid import uuid4
from core.database import DatabaseConfig


# ─── Constants ────────────────────────────────────────────────────────────────
PRIORITY_LEVELS = ["low", "medium", "high", "critical"]
STATUS_VALUES   = ["pending", "in_progress", "completed", "archived"]
PROJECT_COLORS  = [
    "#6366f1",  # indigo
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#ef4444",  # red
    "#f97316",  # orange
    "#eab308",  # yellow
    "#22c55e",  # green
    "#06b6d4",  # cyan
]


# ─── Project Model ─────────────────────────────────────────────────────────────
class Project:
    def __init__(self, project_id, name, color="#6366f1", icon="📁",
                 description="", created_at=None, order=0):
        self.project_id  = str(project_id)
        self.name        = name
        self.color       = color
        self.icon        = icon
        self.description = description
        self.order       = order
        self.created_at  = created_at or datetime.now().isoformat()

    def to_dict(self):
        return {
            "project_id":  self.project_id,
            "id":          self.project_id,   # frontend alias
            "name":        self.name,
            "color":       self.color,
            "icon":        self.icon,
            "description": self.description,
            "order":       self.order,
            "created_at":  self.created_at,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(
            project_id  = d.get("project_id") or d.get("id"),
            name        = d.get("name", "Untitled"),
            color       = d.get("color", "#6366f1"),
            icon        = d.get("icon", "📁"),
            description = d.get("description", ""),
            created_at  = d.get("created_at"),
            order       = d.get("order", 0),
        )


# ─── Task Model ────────────────────────────────────────────────────────────────
class Task:
    def __init__(
        self,
        task_id,
        title,
        description   = "",
        project_id    = None,
        start_date    = None,
        end_date      = None,
        execution_day = None,
        priority      = "medium",
        status        = "pending",
        tags          = None,
        notes         = "",
        reminder      = None,
        order         = 0,
        created_at    = None,
        # Legacy compat fields (ignored in logic, kept for migration)
        due_date      = None,
        start_time    = None,
        end_time      = None,
        recurrence    = None,
        estimated_time= None,
        actual_time   = None,
        category      = None,
        **kwargs,
    ):
        self.task_id       = str(task_id)
        self.title         = title
        self.description   = description or ""
        self.project_id    = str(project_id) if project_id else None
        self.priority      = priority if priority in PRIORITY_LEVELS else "medium"
        self.status        = status   if status   in STATUS_VALUES   else "pending"
        self.tags          = tags or []
        self.notes         = notes or ""
        self.reminder      = reminder
        self.order         = order
        self.created_at    = created_at or datetime.now().isoformat()

        # Dates — accept both new-style and legacy field names
        self.start_date    = start_date    or start_time  or None
        self.end_date      = end_date      or due_date    or None
        self.execution_day = execution_day or None

        # Normalise dates to ISO strings
        for attr in ("start_date", "end_date", "execution_day"):
            v = getattr(self, attr)
            if isinstance(v, datetime):
                setattr(self, attr, v.date().isoformat())
            elif isinstance(v, str) and "T" in v:
                setattr(self, attr, v.split("T")[0])

    def to_dict(self):
        return {
            "task_id":       self.task_id,
            "id":            self.task_id,   # frontend alias
            "title":         self.title,
            "description":   self.description,
            "project_id":    self.project_id,
            "start_date":    self.start_date,
            "end_date":      self.end_date,
            "execution_day": self.execution_day,
            "priority":      self.priority,
            "status":        self.status,
            "tags":          self.tags,
            "notes":         self.notes,
            "reminder":      self.reminder,
            "order":         self.order,
            "created_at":    self.created_at,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(**{k: v for k, v in d.items() if k != "self"})

    def complete(self):
        self.status = "completed"

    def archive(self):
        self.status = "archived"


# ─── Project Manager ───────────────────────────────────────────────────────────
class ProjectManager:
    def __init__(self):
        self.projects = {}
        self.db_path  = DatabaseConfig.get_projects_db_path()
        self.load()

    def _save(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump([p.to_dict() for p in self.projects.values()], f,
                      ensure_ascii=False, indent=2)

    def load(self):
        if not os.path.exists(self.db_path):
            # Seed with a default project
            self._seed_default()
            return
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    p = Project.from_dict(item)
                    self.projects[p.project_id] = p
            
            # Ensure core projects exist
            needs_save = False
            if "general" not in self.projects:
                self.projects["general"] = Project("general", "General", "#6366f1", "📋", order=0)
                needs_save = True
            
            if "archive" not in self.projects:
                self.projects["archive"] = Project("archive", "Archive", "#6b7280", "📦", order=max(len(self.projects), 1))
                needs_save = True
                
            if needs_save:
                self._save()
                
        except Exception as e:
            print(f"[ProjectManager] Load error: {e}")
            self._seed_default()

    def _seed_default(self):
        p = Project(project_id="general", name="General",
                    color="#6366f1", icon="📋", order=0)
        self.projects[p.project_id] = p

        pa = Project(project_id="archive", name="Archive",
                     color="#6b7280", icon="📦", order=1)
        self.projects[pa.project_id] = pa
        
        self._save()

    def get_all(self):
        return sorted(self.projects.values(), key=lambda p: p.order)

    def add(self, project: Project):
        project.order = len(self.projects)
        self.projects[project.project_id] = project
        self._save()
        return project

    def update(self, project_id, fields: dict):
        if project_id not in self.projects:
            return None
        p = self.projects[project_id]
        for k, v in fields.items():
            if hasattr(p, k):
                setattr(p, k, v)
        self._save()
        return p

    def delete(self, project_id):
        if project_id in ["general", "archive"]:
            return False
            
        if project_id in self.projects:
            del self.projects[project_id]
            self._save()
            return True
        return False

    def reorder(self, ordered_ids: list):
        for i, pid in enumerate(ordered_ids):
            if pid in self.projects:
                self.projects[pid].order = i
        self._save()


# ─── Task Manager ──────────────────────────────────────────────────────────────
class TaskManager:
    def __init__(self):
        self.tasks   = {}
        self.db_path = DatabaseConfig.get_tasks_db_path()
        self.load()

    def _save(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump([t.to_dict() for t in self.tasks.values()], f,
                      ensure_ascii=False, indent=2)

    def load(self):
        if not os.path.exists(self.db_path):
            return
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    try:
                        # Migration: map old `category` to project_id
                        if "category" in item and not item.get("project_id"):
                            item["project_id"] = "general"
                        # Migration: map old `task_id` int → str
                        if "task_id" not in item and "id" in item:
                            item["task_id"] = str(item["id"])
                        elif "task_id" in item:
                            item["task_id"] = str(item["task_id"])
                        t = Task.from_dict(item)
                        self.tasks[t.task_id] = t
                    except Exception as ex:
                        print(f"[TaskManager] Skip invalid task: {ex}")
        except Exception as e:
            print(f"[TaskManager] Load error: {e}")

    def get_all(self):
        return list(self.tasks.values())

    def add(self, task: Task):
        self.tasks[task.task_id] = task
        self._save()
        return task

    def update(self, task_id, fields: dict):
        if task_id not in self.tasks:
            return None
        t = self.tasks[task_id]
        for k, v in fields.items():
            if hasattr(t, k):
                setattr(t, k, v)
        self._save()
        return t

    def delete(self, task_id):
        if task_id in self.tasks:
            del self.tasks[task_id]
            self._save()
            return True
        return False

    def complete(self, task_id):
        return self.update(task_id, {"status": "completed"})

    def archive(self, task_id):
        return self.update(task_id, {"status": "archived", "project_id": "archive"})

    def reorder(self, ordered_ids: list):
        for i, tid in enumerate(ordered_ids):
            if tid in self.tasks:
                self.tasks[tid].order = i
        self._save()


# ─── Shared Instances ──────────────────────────────────────────────────────────
project_manager = ProjectManager()
task_manager    = TaskManager()
