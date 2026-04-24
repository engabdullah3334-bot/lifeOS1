from datetime import datetime

class ArchiveService:
    @staticmethod
    def _ser(o):
        if isinstance(o, datetime):
            return o.isoformat()
        return o

    @staticmethod
    def get_all_archived(db, user_id):
        # 1. Archived Tasks
        tasks_raw = list(db.tasks.find(
            {"user_id": user_id, "isArchived": True},
            {"_id": 0}
        ))
        tasks = []
        for t in tasks_raw:
            tasks.append({
                **t,
                "created_at": ArchiveService._ser(t.get("created_at")),
                "last_updated": ArchiveService._ser(t.get("last_updated")),
            })

        # 2. Archived Notes
        notes_raw = list(db.notes.find(
            {"user_id": user_id, "archived": True},
            {"_id": 0}
        ))
        notes = []
        for n in notes_raw:
            notes.append({
                **n,
                "created_at": ArchiveService._ser(n.get("created_at")),
                "last_updated": ArchiveService._ser(n.get("last_updated")),
            })

        # 3. Archived Note Projects
        note_projects_raw = list(db.note_projects.find(
            {"user_id": user_id, "archived": True},
            {"_id": 0}
        ))
        note_projects = [{**p, "created_at": ArchiveService._ser(p.get("created_at"))} for p in note_projects_raw]

        # 4. Archived Task Projects
        all_task_projects = list(db.projects.find(
            {"user_id": user_id},
            {"_id": 0}
        ))

        return {
            "tasks": tasks,
            "notes": notes,
            "note_projects": note_projects,
            "task_projects": all_task_projects,
        }
