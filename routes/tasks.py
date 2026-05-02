from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.task import ProjectService, TaskService

tasks_bp = Blueprint("tasks", __name__)

def get_db():
    return current_app.config["db"]

# ══════════════════════════════════════════════
#  PROJECT ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/projects", methods=["GET"])
@jwt_required()
def get_projects():
    db = get_db()
    user_id = get_jwt_identity()
    archived = request.args.get("archived", "").strip().lower() in ("1", "true", "yes")
    
    projects = ProjectService.get_projects(db, user_id, archived=archived)
    return jsonify(projects)

@tasks_bp.route("/projects", methods=["POST"])
@jwt_required()
def create_project():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    project = ProjectService.create_project(db, user_id, data)
    return jsonify(project), 201

@tasks_bp.route("/projects/<string:pid>", methods=["PUT"])
@jwt_required()
def update_project(pid):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    updated, error = ProjectService.update_project(db, user_id, pid, data)
    if error:
        return jsonify({"error": error}), 400 if error == "No valid fields to update" else 404
        
    return jsonify(updated)

@tasks_bp.route("/projects/<string:pid>", methods=["DELETE"])
@jwt_required()
def delete_project(pid):
    db = get_db()
    user_id = get_jwt_identity()
    
    success, error = ProjectService.delete_project(db, user_id, pid)
    if not success:
        return jsonify({"error": error}), 404

    return jsonify({"success": True})

@tasks_bp.route("/projects/reorder", methods=["POST"])
@jwt_required()
def reorder_projects():
    db = get_db()
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    ordered_ids = payload.get("ordered_ids")

    success, error = ProjectService.reorder_projects(db, user_id, ordered_ids)
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"success": True})

# ══════════════════════════════════════════════
#  TASK ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    db = get_db()
    user_id = get_jwt_identity()
    
    archived = request.args.get("archived", "").strip().lower() in ("1", "true", "yes")
    project_id = request.args.get("project_id")
    status = request.args.get("status")
    search = request.args.get("search", "").strip().lower()
    start = request.args.get("start")
    end = request.args.get("end")

    tasks = TaskService.get_tasks(
        db, 
        user_id, 
        archived=archived, 
        project_id=project_id, 
        status=status, 
        search=search,
        window_start=start,
        window_end=end
    )
    return jsonify(tasks)

@tasks_bp.route("/tasks", methods=["POST"])
@jwt_required()
def create_task():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    task, error = TaskService.create_task(db, user_id, data)
    if error:
        return jsonify({"error": error}), 400

    return jsonify(task), 201

@tasks_bp.route("/tasks/<string:tid>", methods=["PUT"])
@jwt_required()
def update_task(tid):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    updated_task, error = TaskService.update_task(db, user_id, tid, data)
    if error:
        return jsonify({"error": error}), 404

    return jsonify(updated_task)

@tasks_bp.route("/tasks/<string:tid>", methods=["DELETE"])
@jwt_required()
def delete_task(tid):
    db = get_db()
    user_id = get_jwt_identity()
    
    success, error = TaskService.delete_task(db, user_id, tid)
    if not success:
        return jsonify({"error": error}), 404
        
    return jsonify({"success": True})

@tasks_bp.route("/tasks/reorder", methods=["POST"])
@jwt_required()
def reorder_tasks():
    db = get_db()
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    ordered_ids = payload.get("ordered_ids")

    success, error = TaskService.reorder_tasks(db, user_id, ordered_ids)
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"success": True})