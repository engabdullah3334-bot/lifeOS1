"""
routes/writing.py — LifeOS Writing/Notes System
==============================================
Cloud Project Management with MongoDB Atlas
Projects (formerly Folders) & Notes with full CRUD
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from uuid import uuid4

writing_bp = Blueprint("writing", __name__)


def _date_ser(v):
    """Serialize datetime for JSON."""
    if isinstance(v, datetime):
        return v.isoformat()
    return v

# System project ID - cannot be deleted
SYSTEM_PROJECT_ID = "system"

def get_db():
    return current_app.config["db"]


def ensure_system_project(user_id):
    """Create System project for user if not exists"""
    db = get_db()
    existing = db.note_projects.find_one({"user_id": user_id, "project_id": SYSTEM_PROJECT_ID})
    if not existing:
        db.note_projects.insert_one({
            "project_id": SYSTEM_PROJECT_ID,
            "user_id": user_id,
            "name": "System",
            "created_at": datetime.now(),
            "archived": False,
            "is_system": True,
        })


# ══════════════════════════════════════════════
#  PROJECTS CRUD (Writing Projects - note containers)
# ══════════════════════════════════════════════

@writing_bp.route("/writing/projects", methods=["GET"])
@jwt_required()
def get_projects():
    """Get all note projects for user"""
    db = get_db()
    user_id = get_jwt_identity()
    ensure_system_project(user_id)

    projects = list(db.note_projects.find(
        {"user_id": user_id, "archived": False},
        {"_id": 0}
    ).sort("created_at", -1))

    for project in projects:
        pid = project["project_id"]
        notes_count = db.notes.count_documents({"user_id": user_id, "project_id": pid})
        project["notes_count"] = notes_count

    return jsonify(projects)


@writing_bp.route("/writing/projects", methods=["POST"])
@jwt_required()
def create_project():
    """Create new note project"""
    db = get_db()
    user_id = get_jwt_identity()
    ensure_system_project(user_id)
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Project name is required"}), 400

    existing = db.note_projects.find_one({"user_id": user_id, "name": name})
    if existing:
        return jsonify({"error": "Project with this name already exists"}), 409

    order = db.note_projects.count_documents({"user_id": user_id})
    project = {
        "project_id": str(uuid4()),
        "user_id": user_id,
        "name": name,
        "description": (data.get("description") or "").strip(),
        "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
        "order": order,
        "created_at": datetime.now(),
        "archived": False,
        "is_system": False,
    }

    db.note_projects.insert_one(project)
    project.pop("_id", None)
    return jsonify(project), 201


@writing_bp.route("/writing/projects/<string:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    """Update project name, description, tags"""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    if project_id == SYSTEM_PROJECT_ID:
        return jsonify({"error": "Cannot rename System project"}), 403

    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Project name is required"}), 400

    existing = db.note_projects.find_one({
        "user_id": user_id,
        "name": name,
        "project_id": {"$ne": project_id}
    })
    if existing:
        return jsonify({"error": "Project with this name already exists"}), 409

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
        return jsonify({"error": "Project not found"}), 404

    updated = db.note_projects.find_one({"user_id": user_id, "project_id": project_id}, {"_id": 0})
    return jsonify(updated)


@writing_bp.route("/writing/projects/<string:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    """Delete project and its notes (System project cannot be deleted)"""
    db = get_db()
    user_id = get_jwt_identity()

    if project_id == SYSTEM_PROJECT_ID:
        return jsonify({"error": "System project cannot be deleted"}), 403

    result = db.note_projects.delete_one({"user_id": user_id, "project_id": project_id})

    if result.deleted_count == 0:
        return jsonify({"error": "Project not found"}), 404

    db.notes.delete_many({"user_id": user_id, "project_id": project_id})
    return jsonify({"success": True})


@writing_bp.route("/writing/projects/order", methods=["PUT"])
@jwt_required()
def update_projects_order():
    """Save project order (array of project_id). Optimistic UI can call this after reorder."""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    project_ids = data.get("project_ids")
    if not isinstance(project_ids, list):
        return jsonify({"error": "project_ids array required"}), 400

    for idx, pid in enumerate(project_ids):
        if pid == SYSTEM_PROJECT_ID:
            continue
        db.note_projects.update_one(
            {"user_id": user_id, "project_id": pid},
            {"$set": {"order": idx}}
        )
    return jsonify({"success": True})


@writing_bp.route("/writing/projects/<string:project_id>/archive", methods=["PUT"])
@jwt_required()
def archive_project(project_id):
    """Archive/unarchive project"""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    if project_id == SYSTEM_PROJECT_ID:
        return jsonify({"error": "System project cannot be archived"}), 403

    archived = data.get("archived", True)

    result = db.note_projects.update_one(
        {"user_id": user_id, "project_id": project_id},
        {"$set": {"archived": archived}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Project not found"}), 404

    updated = db.note_projects.find_one({"user_id": user_id, "project_id": project_id}, {"_id": 0})
    return jsonify(updated)


# ══════════════════════════════════════════════
#  NOTES STRUCTURE & CRUD
# ══════════════════════════════════════════════

@writing_bp.route("/notes/structure", methods=["GET"])
@jwt_required()
def get_structure():
    """Get projects and notes structure"""
    db = get_db()
    user_id = get_jwt_identity()
    ensure_system_project(user_id)

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
                "created_at": _date_ser(note.get("created_at")),
                "last_updated": _date_ser(note.get("last_updated")),
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

    return jsonify(structure)


@writing_bp.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    """Get notes for a project"""
    db = get_db()
    user_id = get_jwt_identity()
    project_id = request.args.get("project_id")

    query = {"user_id": user_id}
    if project_id:
        query["project_id"] = project_id

    notes = list(db.notes.find(query, {"_id": 0}).sort("last_updated", -1))
    return jsonify(notes)


@writing_bp.route("/notes/<string:note_id>", methods=["GET"])
@jwt_required()
def get_note(note_id):
    """Get single note"""
    db = get_db()
    user_id = get_jwt_identity()

    note = db.notes.find_one(
        {"user_id": user_id, "note_id": note_id},
        {"_id": 0}
    )

    if not note:
        return jsonify({"error": "Note not found"}), 404

    return jsonify(note)


@writing_bp.route("/notes", methods=["POST"])
@jwt_required()
def create_note():
    """Create new note"""
    db = get_db()
    user_id = get_jwt_identity()
    ensure_system_project(user_id)
    data = request.get_json() or {}

    project_id = data.get("project_id")
    title = (data.get("title") or data.get("filename") or "New Note").strip()

    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    project = db.note_projects.find_one({"user_id": user_id, "project_id": project_id})
    if not project:
        return jsonify({"error": "Project not found"}), 404

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

    order = db.notes.count_documents({"user_id": user_id, "project_id": project_id})
    note = {
        "note_id": str(uuid4()),
        "user_id": user_id,
        "project_id": project_id,
        "title": title.replace(".txt", ""),
        "filename": filename,
        "content": data.get("content", ""),
        "status": data.get("status", "draft"),
        "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
        "description": (data.get("description") or "").strip(),
        "order": order,
        "created_at": datetime.now(),
        "last_updated": datetime.now(),
        "archived": False,
    }

    db.notes.insert_one(note)
    note.pop("_id", None)
    return jsonify(note), 201


@writing_bp.route("/notes/<string:note_id>", methods=["PUT"])
@jwt_required()
def update_note(note_id):
    """Update note content or title"""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

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
        return jsonify({"error": "Note not found"}), 404

    updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
    return jsonify(updated)


@writing_bp.route("/notes/<string:note_id>/move", methods=["PUT"])
@jwt_required()
def move_note(note_id):
    """Move note to another project."""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    target_project_id = data.get("project_id")

    if not target_project_id:
        return jsonify({"error": "project_id required"}), 400

    proj = db.note_projects.find_one({"user_id": user_id, "project_id": target_project_id})
    if not proj:
        return jsonify({"error": "Target project not found"}), 404

    result = db.notes.update_one(
        {"user_id": user_id, "note_id": note_id},
        {"$set": {"project_id": target_project_id, "last_updated": datetime.now()}}
    )
    if result.matched_count == 0:
        return jsonify({"error": "Note not found"}), 404
    updated = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
    return jsonify(updated)


@writing_bp.route("/notes/order", methods=["PUT"])
@jwt_required()
def update_notes_order():
    """Save note order within a project. Body: { project_id, note_ids: string[] }"""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    project_id = data.get("project_id")
    note_ids = data.get("note_ids")
    if not project_id or not isinstance(note_ids, list):
        return jsonify({"error": "project_id and note_ids array required"}), 400

    for idx, nid in enumerate(note_ids):
        db.notes.update_one(
            {"user_id": user_id, "project_id": project_id, "note_id": nid},
            {"$set": {"order": idx}}
        )
    return jsonify({"success": True})


@writing_bp.route("/notes/<string:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    """Delete note"""
    db = get_db()
    user_id = get_jwt_identity()

    return jsonify({"success": True})


@writing_bp.route("/notes/<string:note_id>/archive", methods=["PUT"])
@jwt_required()
def archive_note(note_id):
    """Archive/unarchive note"""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    archived = data.get("archived", True)

    result = db.notes.update_one(
        {"user_id": user_id, "note_id": note_id},
        {"$set": {"archived": archived, "last_updated": datetime.now()}}
    )
    if result.matched_count == 0:
        return jsonify({"error": "Note not found"}), 404
    
    return jsonify({"success": True, "archived": archived})


# ══════════════════════════════════════════════
#  LEGACY: Quick Note content (folder/filename style)
# ══════════════════════════════════════════════

@writing_bp.route("/notes/content", methods=["GET"])
@jwt_required()
def get_note_content():
    """Get note content - supports note_id or project_id+filename (QuickNote)"""
    db = get_db()
    user_id = get_jwt_identity()

    note_id = request.args.get("note_id")
    project_id = request.args.get("project_id")
    filename = request.args.get("filename")

    if note_id:
        note = db.notes.find_one({"user_id": user_id, "note_id": note_id}, {"_id": 0})
    elif project_id and filename:
        note = db.notes.find_one(
            {"user_id": user_id, "project_id": project_id, "filename": filename},
            {"_id": 0}
        )
    else:
        return jsonify({"error": "Invalid parameters"}), 400

    if not note:
        return jsonify({"content": ""})

    return jsonify({"content": note.get("content", "")})


@writing_bp.route("/notes/quick", methods=["POST"])
@jwt_required()
def save_quick_note():
    """Save quick note from Dashboard to System project"""
    db = get_db()
    user_id = get_jwt_identity()
    ensure_system_project(user_id)
    data = request.get_json() or {}

    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "Content is required"}), 400

    # Append to QuickNote in System project
    quick_note = db.notes.find_one({
        "user_id": user_id,
        "project_id": SYSTEM_PROJECT_ID,
        "filename": "QuickNote.txt"
    })

    if quick_note:
        existing = (quick_note.get("content") or "").strip()
        sep = "\n\n---\n"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        new_content = existing + sep + f"[{timestamp}] " + content
        db.notes.update_one(
            {"user_id": user_id, "project_id": SYSTEM_PROJECT_ID, "filename": "QuickNote.txt"},
            {"$set": {"content": new_content, "last_updated": datetime.now()}}
        )
    else:
        note = {
            "note_id": str(uuid4()),
            "user_id": user_id,
            "project_id": SYSTEM_PROJECT_ID,
            "title": "QuickNote",
            "filename": "QuickNote.txt",
            "content": content,
            "created_at": datetime.now(),
            "last_updated": datetime.now(),
        }
        db.notes.insert_one(note)

    return jsonify({"success": True})
