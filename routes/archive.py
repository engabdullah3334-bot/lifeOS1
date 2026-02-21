from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

archive_bp = Blueprint("archive", __name__)

def get_db():
    return current_app.config["db"]

def _ser(o):
    """Serialize for JSON (e.g. datetime)."""
    if isinstance(o, datetime):
        return o.isoformat()
    return o

@archive_bp.route("/archive", methods=["GET"])
@jwt_required()
def get_all_archived():
    """Get all archived tasks, notes and projects for the smart archive page."""
    db = get_db()
    user_id = get_jwt_identity()

    # 1. Archived Tasks (isArchived: True)
    tasks_raw = list(db.tasks.find(
        {"user_id": user_id, "isArchived": True},
        {"_id": 0}
    ))
    tasks = []
    for t in tasks_raw:
        tasks.append({
            **t,
            "created_at": _ser(t.get("created_at")),
            "last_updated": _ser(t.get("last_updated")),
        })

    # 2. Archived Notes (writing)
    notes_raw = list(db.notes.find(
        {"user_id": user_id, "archived": True},
        {"_id": 0}
    ))
    notes = []
    for n in notes_raw:
        notes.append({
            **n,
            "created_at": _ser(n.get("created_at")),
            "last_updated": _ser(n.get("last_updated")),
        })

    # 3. Archived Note Projects (writing)
    note_projects_raw = list(db.note_projects.find(
        {"user_id": user_id, "archived": True},
        {"_id": 0}
    ))
    note_projects = [{**p, "created_at": _ser(p.get("created_at"))} for p in note_projects_raw]

    # 4. Archived Task Projects (tasks)
    # We need to return projects that are archived, OR projects that have archived tasks
    # For simplicity, returning all projects is fine for mapping, but we might want to flag archived ones.
    all_task_projects = list(db.projects.find(
        {"user_id": user_id},
        {"_id": 0}
    ))

    return jsonify({
        "tasks": tasks,
        "notes": notes,
        "note_projects": note_projects,
        "task_projects": all_task_projects,
    })

