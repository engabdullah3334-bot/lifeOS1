"""
core/writing.py — Writing (Notes & Note Projects) Business Logic
==================================================================
Uses schema_factory for document construction.
All field definitions come from configs/schemas.yaml.
"""

from datetime import datetime
from uuid import uuid4

from core.config_loader import load_yaml
from core.schema_factory import build_document


def _get_system_project_id() -> str:
    """Get system project ID from config."""
    config = load_yaml("app_config.yaml")
    return config.get("constants", {}).get("system_project_id", "system")


class WritingService:
    @staticmethod
    def _date_ser(v):
        """Serialize datetime for JSON."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    @staticmethod
    def ensure_system_project(db, user_id):
        system_id = _get_system_project_id()
        existing = db.note_projects.find_one({"user_id": user_id, "project_id": system_id})
        if not existing:
            db.note_projects.insert_one({
                "project_id": system_id,
                "user_id": user_id,
                "name": "System",
                "created_at": datetime.now(),
                "archived": False,
                "is_system": True,
            })

    @staticmethod
    def get_projects(db, user_id):
        WritingService.ensure_system_project(db, user_id)

        projects = list(db.note_projects.find(
            {"user_id": user_id, "archived": False},
            {"_id": 0}
        ).sort("created_at", -1))

        for project in projects:
            pid = project["project_id"]
            notes_count = db.notes.count_documents({"user_id": user_id, "project_id": pid})
            project["notes_count"] = notes_count

        return projects

    @staticmethod
    def create_project(db, user_id, data):
        WritingService.ensure_system_project(db, user_id)
        name = (data.get("name") or "").strip()
        
        if not name:
            return None, "Project name is required", 400

        if db.note_projects.find_one({"user_id": user_id, "name": name}):
            return None, "Project with this name already exists", 409

        project_data = {
            **data,
            "name": name,
            "description": (data.get("description") or "").strip(),
            "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
        }
        project = build_document("note_project", project_data, db=db, user_id=user_id)

        db.note_projects.insert_one(project)
        project.pop("_id", None)
        return project, None, 201

    @staticmethod
    def update_project(db, user_id, project_id, data):
        system_id = _get_system_project_id()
        if project_id == system_id:
            return None, "Cannot rename System project", 403

        name = (data.get("name") or "").strip()
        if not name:
            return None, "Project name is required", 400

        existing = db.note_projects.find_one({
            "user_id": user_id,
            "name": name,
            "project_id": {"$ne": project_id}
        })
        if existing:
            return None, "Project with this name already exists", 409

        update_data = {"name": name}
        if "description" in data:
            update_data["description"] = (data.get("description") or "").strip()
        if "tags" in data and isinstance(data["tags"], list):
            update_data["tags"] = data["tags"]

        result = db.note_projects.update_one(
            {"user_id": user_id, "project_id": project_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return None, "Project not found", 404

        updated = db.note_projects.find_one({"user_id": user_id, "project_id": project_id}, {"_id": 0})
        return updated, None, 200

    @staticmethod
    def delete_project(db, user_id, project_id):
        system_id = _get_system_project_id()
        if project_id == system_id:
            return False, "System project cannot be deleted", 403

        result = db.note_projects.delete_one({"user_id": user_id, "project_id": project_id})

        if result.deleted_count == 0:
            return False, "Project not found", 404

        db.notes.delete_many({"user_id": user_id, "project_id": project_id})
        return True, None, 200

    @staticmethod
    def update_projects_order(db, user_id, data):
        system_id = _get_system_project_id()
        project_ids = data.get("project_ids")
        if not isinstance(project_ids, list):
            return False, "project_ids array required", 400

        for idx, pid in enumerate(project_ids):
            if pid == system_id:
                continue
            db.note_projects.update_one(
                {"user_id": user_id, "project_id": pid},
                {"$set": {"order": idx}}
            )
        return True, None, 200

    @staticmethod
    def archive_project(db, user_id, project_id, data):
        system_id = _get_system_project_id()
        archived = data.get("archived", True)
        if project_id == system_id:
            return None, "System project cannot be archived", 403

        result = db.note_projects.update_one(
            {"user_id": user_id, "project_id": project_id},
            {"$set": {"archived": archived}}
        )

        if result.matched_count == 0:
            return None, "Project not found", 404

        updated = db.note_projects.find_one({"user_id": user_id, "project_id": project_id}, {"_id": 0})
        return updated, None, 200

    # Notes CRUD ################################
    @staticmethod
    def get_structure(db, user_id):
        WritingService.ensure_system_project(db, user_id)

        projects = list(db.note_projects.find(
            {"user_id": user_id, "archived": False},
            {"_id": 0}
        ))
        
        def _project_sort_key(p):
            o = p.get("order", 999)
            ca = p.get("created_at")
            ts = ca.timestamp() if isinstance(ca, datetime) else (ca or 0)
            return (o, -ts)
            
        projects.sort(key=_project_sort_key)

        notes = list(db.notes.find({"user_id": user_id, "archived": {"$ne": True}}, {"_id": 0}))

        structure = {}
        for project in projects:
            pid = project["project_id"]
            structure[pid] = {
                "project": {
                    **project,
                    "tags": project.get("tags") or [],
                    "description": project.get("description") or "",
                },
                "notes": []
            }

        for note in notes:
            project_id = note.get("project_id")
            if project_id and project_id in structure:
                structure[project_id]["notes"].append({
                    "note_id": note.get("note_id"),
                    "title": note.get("title", ""),
                    "filename": note.get("filename", ""),
                    "status": note.get("status", "draft"),
                    "tags": note.get("tags") or [],
                    "description": note.get("description") or "",
                    "created_at": WritingService._date_ser(note.get("created_at")),
                    "last_updated": WritingService._date_ser(note.get("last_updated")),
                    "project_id": project_id,
                    "order": note.get("order", 999),
                })
                
        def _note_sort_key(n):
            o = n.get("order", 999)
            lu = n.get("last_updated")
            ts = lu.timestamp() if isinstance(lu, datetime) else 0
            return (o, -ts)
            
        for pid in structure:
            structure[pid]["notes"].sort(key=_note_sort_key)

        return structure

    @staticmethod
    def get_notes(db, user_id, project_id=None):
        query = {"user_id": user_id}
        if project_id:
            query["project_id"] = project_id

        return list(db.notes.find(query, {"_id": 0}).sort("last_updated", -1))

    @staticmethod
    def get_note(db, user_id, note_id):
        note = db.notes.find_one(
            {"user_id": user_id, "note_id": note_id},
            {"_id": 0}
        )
        if not note:
            return None, "Note not found", 404
        return note, None, 200

    @staticmethod
    def create_note(db, user_id, data):
        WritingService.ensure_system_project(db, user_id)

        project_id = data.get("project_id")
        title = (data.get("title") or data.get("filename") or "New Note").strip()

        if not project_id:
            return None, "project_id is required", 400

        project = db.note_projects.find_one({"user_id": user_id, "project_id": project_id})
        if not project:
            return None, "Project not found", 404

        filename = title if title.endswith(".txt") else f"{title}.txt"
        existing = db.notes.find_one({
            "user_id": user_id,
            "project_id": project_id,
            "filename": filename
        })
        if existing:
            counter = 2
            base_title = title.replace(".txt", "")
            while db.notes.find_one({
                "user_id": user_id,
                "project_id": project_id,
                "filename": filename
            }):
                filename = f"{base_title} ({counter}).txt"
                counter += 1

        note_data = {
            **data,
            "project_id": project_id,
            "title": title.replace(".txt", ""),
            "filename": filename,
            "content": data.get("content", ""),
            "status": data.get("status", "draft"),
            "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
            "description": (data.get("description") or "").strip(),
        }
        note = build_document("note", note_data, db=db, user_id=user_id)

        db.notes.insert_one(note)
        note.pop("_id", None)
        return note, None, 201

    @staticmethod
    def update_note(db, user_id, note_id, data):
        update_data = {"last_updated": datetime.now()}

        if "content" in data:
            update_data["content"] = data["content"]

        if "title" in data:
            title = data["title"].strip()
            if title:
                update_data["title"] = title
                filename = title if title.endswith(".txt") else f"{title}.txt"
                update_data["filename"] = filename

        if "status" in data and data["status"] in ("draft", "complete", "in_review"):
            update_data["status"] = data["status"]
        if "tags" in data and isinstance(data["tags"], list):
            update_data["tags"] = data["tags"]
        if "description" in data:
            update_data["description"] = (data["description"] or "").strip()

        result = db.notes.update_one(
            {"user_id": user_id, "note_id": note_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return None, "Note not found", 404

        updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        return updated, None, 200

    @staticmethod
    def move_note(db, user_id, note_id, data):
        target_project_id = data.get("project_id")
        if not target_project_id:
            return None, "project_id required", 400

        proj = db.note_projects.find_one({"user_id": user_id, "project_id": target_project_id})
        if not proj:
            return None, "Target project not found", 404

        result = db.notes.update_one(
            {"user_id": user_id, "note_id": note_id},
            {"$set": {"project_id": target_project_id, "last_updated": datetime.now()}}
        )
        if result.matched_count == 0:
            return None, "Note not found", 404
            
        updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        return updated, None, 200

    @staticmethod
    def update_notes_order(db, user_id, data):
        project_id = data.get("project_id")
        note_ids = data.get("note_ids")
        
        if not project_id or not isinstance(note_ids, list):
            return False, "project_id and note_ids array required", 400

        for idx, nid in enumerate(note_ids):
            db.notes.update_one(
                {"user_id": user_id, "project_id": project_id, "note_id": nid},
                {"$set": {"order": idx}}
            )
        return True, None, 200

    @staticmethod
    def delete_note(db, user_id, note_id):
        result = db.notes.delete_one({"user_id": user_id, "note_id": note_id})
        if result.deleted_count == 0:
            return False, "Note not found", 404
        return True, None, 200

    @staticmethod
    def archive_note(db, user_id, note_id, data):
        archived = data.get("archived", True)
        result = db.notes.update_one(
            {"user_id": user_id, "note_id": note_id},
            {"$set": {"archived": archived, "last_updated": datetime.now()}}
        )
        if result.matched_count == 0:
            return False, "Note not found", 404
        return archived, None, 200

    @staticmethod
    def get_quick_note(db, user_id, args):
        system_id = _get_system_project_id()
        note_id = args.get("note_id")
        project_id = args.get("project_id")
        filename = args.get("filename")

        if note_id:
            note = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        elif project_id and filename:
            note = db.notes.find_one(
                {"user_id": user_id, "project_id": project_id, "filename": filename},
                {"_id": 0}
            )
        else:
            return None, "Invalid parameters", 400

        if not note:
            return "", None, 200

        return note.get("content", ""), None, 200

    @staticmethod
    def save_quick_note(db, user_id, data):
        system_id = _get_system_project_id()
        content = (data.get("content") or "").strip()
        if not content:
            return False, "Content is required", 400

        WritingService.ensure_system_project(db, user_id)
        
        quick_note = db.notes.find_one({
            "user_id": user_id,
            "project_id": system_id,
            "filename": "QuickNote.txt"
        })

        if quick_note:
            existing = (quick_note.get("content") or "").strip()
            sep = "\n\n---\n"
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            new_content = existing + sep + f"[{timestamp}] " + content
            db.notes.update_one(
                {"user_id": user_id, "project_id": system_id, "filename": "QuickNote.txt"},
                {"$set": {"content": new_content, "last_updated": datetime.now()}}
            )
        else:
            note = {
                "note_id": str(uuid4()),
                "user_id": user_id,
                "project_id": system_id,
                "title": "QuickNote",
                "filename": "QuickNote.txt",
                "content": content,
                "created_at": datetime.now(),
                "last_updated": datetime.now(),
            }
            db.notes.insert_one(note)
        
        return True, None, 200
