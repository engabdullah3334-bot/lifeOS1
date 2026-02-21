from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

archive_bp = Blueprint("archive", __name__)

def get_db():
    return current_app.config["db"]

@archive_bp.route("/archive/all", methods=["GET"])
@jwt_required()
def get_all_archived():
    """Get all archived tasks, notes and projects for the smart archive page"""
    db = get_db()
    user_id = get_jwt_identity()

    # 1. Archived Tasks
    tasks = list(db.tasks.find(
        {"user_id": user_id, "status": "archived"},
        {"_id": 0}
    ))

    # 2. Archived Notes
    notes = list(db.notes.find(
        {"user_id": user_id, "archived": True},
        {"_id": 0}
    ))

    # 3. Archived Note Projects
    note_projects = list(db.note_projects.find(
        {"user_id": user_id, "archived": True},
        {"_id": 0}
    ))

    # 4. Standard Projects (for task mapping)
    all_task_projects = list(db.projects.find(
        {"user_id": user_id},
        {"_id": 0}
    ))

    return jsonify({
        "tasks": tasks,
        "notes": notes,
        "note_projects": note_projects,
        "task_projects": all_task_projects
    })
