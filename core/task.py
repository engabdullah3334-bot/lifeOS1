"""
core/task.py — Task & Project Business Logic
==============================================
Uses schema_factory for document construction.
All field definitions come from configs/schemas.yaml.
"""

import re
from datetime import datetime, timedelta

from core.schema_factory import build_document, get_updatable_fields


class ProjectService:
    @staticmethod
    def get_projects(db, user_id, archived=False):
        query = {"user_id": user_id}
        query["isArchived"] = True if archived else {"$ne": True}
        projects = list(db.projects.find(query, {"_id": 0}).sort("order", 1))
        
        # Calculate task count and progress for each project
        for p in projects:
            pid = p["project_id"]
            proj_tasks = list(db.tasks.find({"project_id": pid, "user_id": user_id}))
            total = len(proj_tasks)
            done = sum(1 for t in proj_tasks if t.get("status") == "completed")
            
            p["task_count"] = total
            p["done_count"] = done
            p["progress"] = round((done / total * 100) if total else 0)
            
        return projects

    @staticmethod
    def create_project(db, user_id, data):
        project = build_document("project", data, db=db, user_id=user_id)
        db.projects.insert_one(project)
        project.pop('_id', None)
        return project

    @staticmethod
    def update_project(db, user_id, pid, data):
        allowed = get_updatable_fields("project")
        update = {k: v for k, v in data.items() if k in allowed}
        
        if not update:
            return None, "No valid fields to update"
            
        # Parent-Child Logic for Projects and Tasks
        is_archived = update.get("isArchived")
        if is_archived is not None:
            db.tasks.update_many(
                {"project_id": pid, "user_id": user_id},
                {"$set": {"isArchived": is_archived}}
            )

        result = db.projects.update_one(
            {"project_id": pid, "user_id": user_id},
            {"$set": update}
        )
        
        if result.matched_count == 0:
            return None, "Project not found"
            
        updated = db.projects.find_one({"project_id": pid, "user_id": user_id}, {"_id": 0})
        return updated, None

    @staticmethod
    def delete_project(db, user_id, pid):
        result = db.projects.delete_one({"project_id": pid, "user_id": user_id})

        if result.deleted_count == 0:
            return False, "Project not found"

        # Transfer orphaned tasks to "general"
        db.tasks.update_many(
            {"project_id": pid, "user_id": user_id},
            {"$set": {"project_id": "general"}},
        )
        return True, None

    @staticmethod
    def reorder_projects(db, user_id, ordered_ids: list):
        """Update the display order of projects by their IDs."""
        if not isinstance(ordered_ids, list):
            return False, "ordered_ids array is required"
        for idx, pid in enumerate(ordered_ids):
            db.projects.update_one(
                {"project_id": pid, "user_id": user_id},
                {"$set": {"order": idx}},
            )
        return True, None


class TaskService:
    @staticmethod
    def get_tasks(db, user_id, archived=False, project_id=None, status=None, search=None, window_start=None, window_end=None):
        query = {"user_id": user_id}
        query["isArchived"] = True if archived else {"$ne": True}

        if project_id:
            query["project_id"] = project_id
        if search:
            safe_search = re.escape(search)
            query["$or"] = [
                {"title": {"$regex": safe_search, "$options": "i"}},
                {"description": {"$regex": safe_search, "$options": "i"}},
            ]

        # Fetch without status first (recurring tasks have virtual status)
        tasks = list(db.tasks.find(query, {"_id": 0}).sort("order", 1))
        
        processed_tasks = []
        today = datetime.now()
        
        # Parse window_start
        if window_start:
            if isinstance(window_start, str):
                try:
                    w_start = datetime.fromisoformat(window_start[:10]).date()
                except ValueError:
                    w_start = (today - timedelta(days=30)).date()
            else:
                w_start = window_start
        else:
            w_start = (today - timedelta(days=30)).date()

        # Parse window_end
        if window_end:
            if isinstance(window_end, str):
                try:
                    w_end = datetime.fromisoformat(window_end[:10]).date()
                except ValueError:
                    w_end = (today + timedelta(days=60)).date()
            else:
                w_end = window_end
        else:
            w_end = (today + timedelta(days=60)).date()

        for task in tasks:
            is_recurring = task.get("is_recurring", False) or task.get("recurrence", "none") != "none"
            
            if is_recurring and task.get("recurrence", "none") != "none":
                instances = TaskService._generate_occurrences(task, w_start, w_end)
                for inst in instances:
                    if status and inst.get("status") != status:
                        continue
                    processed_tasks.append(inst)
            else:
                if status and task.get("status") != status:
                    continue
                processed_tasks.append(task)
                
        return processed_tasks

    @staticmethod
    def _generate_occurrences(task, window_start, window_end):
        instances = []
        recurrence = task.get("recurrence", "none")
        completed_dates = task.get("completed_dates", [])
        
        base_date_str = task.get("execution_day") or task.get("start_date")
        if base_date_str:
            try:
                base_date = datetime.strptime(base_date_str, "%Y-%m-%d").date()
            except ValueError:
                base_date = window_start
        else:
            base_date = window_start

        current_date = max(window_start, base_date)

        while current_date <= window_end:
            should_create = False
            
            if recurrence == "daily":
                should_create = True
            elif recurrence == "weekly":
                pattern = task.get("recurrence_pattern") or []
                weekday_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
                if isinstance(pattern, list):
                    day_name = weekday_map[current_date.weekday()]
                    if day_name in pattern:
                        should_create = True
            elif recurrence == "monthly":
                if current_date.day == base_date.day:
                    should_create = True
            elif recurrence == "custom":
                try:
                    interval = int(task.get("recurrence_pattern") or 1)
                except:
                    interval = 1
                days_diff = (current_date - base_date).days
                if days_diff % interval == 0:
                    should_create = True

            if should_create:
                date_str = current_date.strftime("%Y-%m-%d")
                inst_status = "completed" if date_str in completed_dates else "pending"
                
                inst = task.copy()
                inst["task_id"] = f"{task['task_id']}|{date_str}"
                inst["original_task_id"] = task["task_id"]
                inst["execution_day"] = date_str
                
                if "start_date" in inst and inst["start_date"]:
                    inst["start_date"] = date_str
                if "end_date" in inst and inst["end_date"]:
                    inst["end_date"] = date_str
                    
                inst["status"] = inst_status
                instances.append(inst)
                
            current_date += timedelta(days=1)
            
        return instances

    @staticmethod
    def create_task(db, user_id, data):
        if not data.get("title"):
            return None, "Title is required"

        task = build_document("task", data, db=db, user_id=user_id)
        
        db.tasks.insert_one(task)
        task.pop('_id', None)
        return task, None

    @staticmethod
    def update_task(db, user_id, tid, data):
        date_str = None
        if "|" in tid:
            tid, date_str = tid.split("|")
            
        existing_task = db.tasks.find_one({"task_id": tid, "user_id": user_id})
        if not existing_task:
            return None, "Task not found"

        is_recurring = existing_task.get("is_recurring", False) or existing_task.get("recurrence", "none") != "none"
        
        if is_recurring and "status" in data:
            if not date_str:
                date_str = datetime.now().strftime("%Y-%m-%d")
                
            completed_dates = existing_task.get("completed_dates", [])
            target_status = data.get("status")
            
            if target_status == "completed" and date_str not in completed_dates:
                completed_dates.append(date_str)
            elif target_status != "completed" and date_str in completed_dates:
                completed_dates.remove(date_str)
                
            data["completed_dates"] = completed_dates
            if "status" in data:
                del data["status"]

        if data:
            db.tasks.update_one({"task_id": tid, "user_id": user_id}, {"$set": data})
        
        updated_task = db.tasks.find_one({"task_id": tid, "user_id": user_id}, {"_id": 0})
        return updated_task, None

    @staticmethod
    def delete_task(db, user_id, tid):
        if "|" in tid:
            tid = tid.split("|")[0]

        result = db.tasks.delete_one({"task_id": tid, "user_id": user_id})
        if result.deleted_count == 0:
            return False, "Task not found"
        return True, None

    @staticmethod
    def reorder_tasks(db, user_id, ordered_ids: list):
        """Update the display order of tasks by their IDs."""
        if not isinstance(ordered_ids, list):
            return False, "ordered_ids array is required"
        for idx, tid in enumerate(ordered_ids):
            if "|" in tid:
                tid = tid.split("|", 1)[0]
            db.tasks.update_one(
                {"task_id": tid, "user_id": user_id},
                {"$set": {"order": idx}},
            )
        return True, None
