"""
core/writing.py — Writing (Notes & Note Projects) Business Logic
==================================================================
Uses schema_factory for document construction.
All field definitions come from configs/schemas.yaml.

Changelog (V1.1 — 2026-04-29):
  - B1: Fixed sort bug in get_structure() — serialize AFTER sorting
  - B2: Added filename collision check in update_note() on rename
  - B3: Added filename collision check in move_note()
  - B4: save_quick_note() first creation now uses build_document
  - P1: get_projects() uses aggregation instead of N+1 count_documents
  - P2+P3: update_notes_order() + update_projects_order() use bulk_write
  - Q1: get_notes() supports search, status filter, archived filter
  - Q2: update_note() validates title not empty after strip()
  - F1: _compute_stats() — word count + reading time in get_note/update_note
  - F2: update_note() supports pinned field
  - F4: update_note() supports is_favorite field
  - F5: search_notes() — full-text search across all projects
  - F6: duplicate_note() — clone a note within the same project
"""

import re
from datetime import datetime
from uuid import uuid4

from pymongo import UpdateOne

from core.config_loader import load_yaml
from core.schema_factory import build_document
from core.utils import serialize_datetime


def _get_system_project_id() -> str:
    """Get system project ID from config."""
    config = load_yaml("app_config.yaml")
    return config.get("constants", {}).get("system_project_id", "system")


class WritingService:

    # ──────────────────────────────────────────────
    #  Helpers
    # ──────────────────────────────────────────────

    @staticmethod
    def _date_ser(v):
        """Serialize datetime for JSON — delegates to shared utils."""
        return serialize_datetime(v)

    @staticmethod
    def _compute_stats(content: str) -> dict:
        """
        Strip HTML tags and compute word count, char count, and estimated
        reading time (at 200 wpm average).
        F1: Word Count & Reading Time.
        """
        plain = re.sub(r"<[^>]+>", "", content or "")
        plain = plain.strip()
        words = len(plain.split()) if plain else 0
        chars = len(plain)
        read_min = max(1, round(words / 200))
        return {"word_count": words, "char_count": chars, "read_time_min": read_min}

    @staticmethod
    def _unique_filename(db, user_id: str, project_id: str, base_title: str,
                         exclude_note_id: str = None) -> str:
        """
        Return a filename for `base_title` that is unique within the project.
        Appends (2), (3)... if a collision is found.
        Optionally excludes a note_id (for rename on self).
        """
        base = base_title.replace(".txt", "")
        candidate = f"{base}.txt"
        counter = 2
        while True:
            query = {
                "user_id": user_id,
                "project_id": project_id,
                "filename": candidate,
            }
            if exclude_note_id:
                query["note_id"] = {"$ne": exclude_note_id}
            if not db.notes.find_one(query):
                return candidate
            candidate = f"{base} ({counter}).txt"
            counter += 1

    # ──────────────────────────────────────────────
    #  System Project
    # ──────────────────────────────────────────────

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
                "order": 0,
            })

    # ──────────────────────────────────────────────
    #  Projects CRUD
    # ──────────────────────────────────────────────

    @staticmethod
    def get_projects(db, user_id):
        WritingService.ensure_system_project(db, user_id)

        projects = list(db.note_projects.find(
            {"user_id": user_id, "archived": False},
            {"_id": 0}
        ).sort("created_at", -1))

        # P1: single aggregation instead of N count_documents calls
        pipeline = [
            {"$match": {"user_id": user_id, "archived": {"$ne": True}}},
            {"$group": {"_id": "$project_id", "count": {"$sum": 1}}}
        ]
        counts = {r["_id"]: r["count"] for r in db.notes.aggregate(pipeline)}

        for project in projects:
            project["notes_count"] = counts.get(project["project_id"], 0)

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
        """P3: bulk_write instead of N individual writes."""
        system_id = _get_system_project_id()
        project_ids = data.get("project_ids")
        if not isinstance(project_ids, list):
            return False, "project_ids array required", 400

        ops = [
            UpdateOne(
                {"user_id": user_id, "project_id": pid},
                {"$set": {"order": idx}}
            )
            for idx, pid in enumerate(project_ids)
            if pid != system_id
        ]
        if ops:
            db.note_projects.bulk_write(ops, ordered=False)
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

    # ──────────────────────────────────────────────
    #  Notes — Structure
    # ──────────────────────────────────────────────

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
                # B1: keep raw datetime for sort key; serialize afterwards
                structure[project_id]["notes"].append({
                    "note_id": note.get("note_id"),
                    "title": note.get("title", ""),
                    "filename": note.get("filename", ""),
                    "status": note.get("status", "draft"),
                    "tags": note.get("tags") or [],
                    "description": note.get("description") or "",
                    "project_id": project_id,
                    "order": note.get("order", 999),
                    "pinned": note.get("pinned", False),
                    "is_favorite": note.get("is_favorite", False),
                    # raw datetimes — used for sorting below, serialized after
                    "_created_at_raw": note.get("created_at"),
                    "_last_updated_raw": note.get("last_updated"),
                })

        # B1 FIX: sort BEFORE serializing datetimes
        def _note_sort_key(n):
            # pinned notes always float to the top
            pinned = 0 if n.get("pinned") else 1
            o = n.get("order", 999)
            lu = n.get("_last_updated_raw")
            ts = lu.timestamp() if isinstance(lu, datetime) else 0
            return (pinned, o, -ts)

        for pid in structure:
            structure[pid]["notes"].sort(key=_note_sort_key)
            for n in structure[pid]["notes"]:
                # serialize now (after sort)
                n["created_at"] = WritingService._date_ser(n.pop("_created_at_raw", None))
                n["last_updated"] = WritingService._date_ser(n.pop("_last_updated_raw", None))

        return structure

    # ──────────────────────────────────────────────
    #  Notes — CRUD
    # ──────────────────────────────────────────────

    @staticmethod
    def get_notes(db, user_id, project_id=None, status=None,
                  search=None, include_archived=False):
        """
        Q1: Supports filtering by project, status, search query,
        and archived state.
        """
        query = {"user_id": user_id}

        if not include_archived:
            query["archived"] = {"$ne": True}

        if project_id:
            query["project_id"] = project_id

        if status and status in ("draft", "complete", "in_review"):
            query["status"] = status

        if search and len(search.strip()) >= 2:
            query["$or"] = [
                {"title": {"$regex": search.strip(), "$options": "i"}},
                {"content": {"$regex": search.strip(), "$options": "i"}},
                {"tags": {"$elemMatch": {"$regex": search.strip(), "$options": "i"}}},
            ]

        return list(db.notes.find(query, {"_id": 0}).sort("last_updated", -1))

    @staticmethod
    def get_note(db, user_id, note_id):
        note = db.notes.find_one(
            {"user_id": user_id, "note_id": note_id},
            {"_id": 0}
        )
        if not note:
            return None, "Note not found", 404
        # F1: attach stats
        note["stats"] = WritingService._compute_stats(note.get("content", ""))
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

        # Auto-resolve unique filename (no more manual loop)
        filename = WritingService._unique_filename(db, user_id, project_id, title)

        note_data = {
            **data,
            "project_id": project_id,
            "title": title.replace(".txt", ""),
            "filename": filename,
            "content": data.get("content", ""),
            "status": data.get("status", "draft"),
            "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
            "description": (data.get("description") or "").strip(),
            "pinned": False,
            "is_favorite": False,
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

        # B2 FIX: check filename collision before rename
        if "title" in data:
            title = data["title"].strip()
            if not title:
                return None, "Title cannot be empty", 400  # Q2 FIX
            new_filename = f"{title}.txt"
            # fetch current note to get its project_id for scoped check
            current = db.notes.find_one(
                {"user_id": user_id, "note_id": note_id},
                {"_id": 0, "project_id": 1, "filename": 1}
            )
            if not current:
                return None, "Note not found", 404
            if new_filename != current.get("filename"):
                collision = db.notes.find_one({
                    "user_id": user_id,
                    "project_id": current["project_id"],
                    "filename": new_filename,
                    "note_id": {"$ne": note_id},
                })
                if collision:
                    return None, "A note with this title already exists in the project", 409
            update_data["title"] = title
            update_data["filename"] = new_filename

        if "status" in data and data["status"] in ("draft", "complete", "in_review"):
            update_data["status"] = data["status"]
        if "tags" in data and isinstance(data["tags"], list):
            update_data["tags"] = data["tags"]
        if "description" in data:
            update_data["description"] = (data["description"] or "").strip()
        # F2: pinned support
        if "pinned" in data:
            update_data["pinned"] = bool(data["pinned"])
        # F4: is_favorite support
        if "is_favorite" in data:
            update_data["is_favorite"] = bool(data["is_favorite"])

        result = db.notes.update_one(
            {"user_id": user_id, "note_id": note_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return None, "Note not found", 404

        updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        # F1: attach stats to update response
        updated["stats"] = WritingService._compute_stats(updated.get("content", ""))
        return updated, None, 200

    @staticmethod
    def move_note(db, user_id, note_id, data):
        target_project_id = data.get("project_id")
        if not target_project_id:
            return None, "project_id required", 400

        proj = db.note_projects.find_one({"user_id": user_id, "project_id": target_project_id})
        if not proj:
            return None, "Target project not found", 404

        # B3 FIX: fetch note first, then check filename collision in target
        note = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        if not note:
            return None, "Note not found", 404

        collision = db.notes.find_one({
            "user_id": user_id,
            "project_id": target_project_id,
            "filename": note["filename"],
            "note_id": {"$ne": note_id},
        })
        if collision:
            return None, "A note with this filename already exists in the target project", 409

        db.notes.update_one(
            {"user_id": user_id, "note_id": note_id},
            {"$set": {"project_id": target_project_id, "last_updated": datetime.now()}}
        )
        updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
        return updated, None, 200

    @staticmethod
    def update_notes_order(db, user_id, data):
        """P2: bulk_write instead of N individual writes."""
        project_id = data.get("project_id")
        note_ids = data.get("note_ids")

        if not project_id or not isinstance(note_ids, list):
            return False, "project_id and note_ids array required", 400

        ops = [
            UpdateOne(
                {"user_id": user_id, "project_id": project_id, "note_id": nid},
                {"$set": {"order": idx}}
            )
            for idx, nid in enumerate(note_ids)
        ]
        if ops:
            db.notes.bulk_write(ops, ordered=False)
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

    # ──────────────────────────────────────────────
    #  F5: Global Search
    # ──────────────────────────────────────────────

    @staticmethod
    def search_notes(db, user_id, query: str, limit: int = 20):
        """
        Full-text search across all non-archived notes.
        Searches title, tags, and description (not content — too heavy for list).
        Returns lightweight note cards (no content field).
        """
        if not query or len(query.strip()) < 2:
            return []

        q = query.strip()
        results = list(db.notes.find(
            {
                "user_id": user_id,
                "archived": {"$ne": True},
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"tags": {"$elemMatch": {"$regex": q, "$options": "i"}}},
                ],
            },
            {"_id": 0, "content": 0}  # exclude content — keep responses fast
        ).limit(limit))
        return results

    # ──────────────────────────────────────────────
    #  F6: Duplicate Note
    # ──────────────────────────────────────────────

    @staticmethod
    def duplicate_note(db, user_id, note_id):
        """
        Clone a note within the same project.
        Title becomes "Copy of <original title>".
        Filename is auto-resolved to be unique.
        """
        original, err, code = WritingService.get_note(db, user_id, note_id)
        if err:
            return None, err, code

        new_title = f"Copy of {original.get('title', 'Note')}"
        new_data = {
            "project_id": original["project_id"],
            "title": new_title,
            "content": original.get("content", ""),
            "status": "draft",  # always start as draft
            "tags": list(original.get("tags") or []),
            "description": original.get("description", ""),
            "pinned": False,
            "is_favorite": False,
        }
        return WritingService.create_note(db, user_id, new_data)

    # ──────────────────────────────────────────────
    #  Quick Note
    # ──────────────────────────────────────────────

    @staticmethod
    def get_quick_note(db, user_id, args):
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
            return None, "Invalid parameters — provide note_id or project_id+filename", 400

        if not note:
            return "", None, 200

        return note.get("content", ""), None, 200

    @staticmethod
    def save_quick_note(db, user_id, data):
        """
        B4 FIX: First creation now uses build_document for a complete schema.
        Subsequent appends prepend a timestamped separator.
        """
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
            # B4 FIX: use build_document for a complete, schema-valid document
            note_data = {
                "project_id": system_id,
                "title": "QuickNote",
                "filename": "QuickNote.txt",
                "content": content,
                "status": "draft",
                "tags": [],
                "description": "Auto-created quick capture note",
                "pinned": False,
                "is_favorite": False,
            }
            note = build_document("note", note_data, db=db, user_id=user_id)
            db.notes.insert_one(note)

        return True, None, 200
