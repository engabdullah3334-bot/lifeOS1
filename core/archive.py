"""
core/archive.py — Archive Business Logic
==========================================
Handles retrieval of all archived items across all entity types.
Uses core/utils.py for datetime serialization.
"""

from core.utils import serialize_doc


class ArchiveService:

    @staticmethod
    def get_all_archived(db, user_id: str) -> dict:
        """
        Returns all archived items for a user, grouped by type.

        Returns
        -------
        dict with keys: tasks, notes, note_projects, task_projects
        """
        date_fields = ["created_at", "last_updated"]

        # 1. Archived Tasks
        tasks = [
            serialize_doc(t, date_fields)
            for t in db.tasks.find(
                {"user_id": user_id, "isArchived": True}, {"_id": 0}
            )
        ]

        # 2. Archived Notes
        notes = [
            serialize_doc(n, date_fields)
            for n in db.notes.find(
                {"user_id": user_id, "archived": True}, {"_id": 0}
            )
        ]

        # 3. Archived Note Projects
        note_projects = [
            serialize_doc(p, ["created_at"])
            for p in db.note_projects.find(
                {"user_id": user_id, "archived": True}, {"_id": 0}
            )
        ]

        # 4. Archived Task Projects (only actually archived ones)
        task_projects = [
            serialize_doc(p, date_fields)
            for p in db.projects.find(
                {"user_id": user_id, "isArchived": True}, {"_id": 0}
            )
        ]

        return {
            "tasks":         tasks,
            "notes":         notes,
            "note_projects": note_projects,
            "task_projects": task_projects,
        }
