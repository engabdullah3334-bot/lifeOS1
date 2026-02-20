"""
routes/tasks.py — LifeOS Task & Project API Routes
===================================================
Projects: GET/POST /api/projects, PUT/DELETE /api/projects/<id>
Tasks:    GET/POST /api/tasks, PUT/DELETE /api/tasks/<id>,
          PUT /api/tasks/<id>/complete, PUT /api/tasks/<id>/archive,
          POST /api/tasks/reorder, POST /api/projects/reorder
"""

from flask import Blueprint, request, jsonify
from core.task import task_manager, project_manager, Task, Project
from uuid import uuid4

tasks_bp = Blueprint("tasks", __name__)


# ══════════════════════════════════════════════
#  PROJECT ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/projects", methods=["GET"])
def get_projects():
    projects = [p.to_dict() for p in project_manager.get_all()]
    # Attach task counts + progress
    for p in projects:
        pid = p["project_id"]
        proj_tasks = [t for t in task_manager.get_all() if t.project_id == pid]
        total = len(proj_tasks)
        done  = len([t for t in proj_tasks if t.status == "completed"])
        p["task_count"]    = total
        p["done_count"]    = done
        p["progress"]      = round((done / total * 100) if total else 0)
    return jsonify(projects)


@tasks_bp.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json() or {}
    project = Project(
        project_id  = str(uuid4()),
        name        = data.get("name", "New Project"),
        color       = data.get("color", "#6366f1"),
        icon        = data.get("icon", "📁"),
        description = data.get("description", ""),
    )
    project_manager.add(project)
    return jsonify(project.to_dict()), 201


@tasks_bp.route("/projects/<string:pid>", methods=["PUT"])
def update_project(pid):
    data = request.get_json() or {}
    project = project_manager.update(pid, {
        k: v for k, v in data.items()
        if k in ("name", "color", "icon", "description", "order")
    })
    if project is None:
        return jsonify({"error": "Project not found"}), 404
    return jsonify(project.to_dict())


@tasks_bp.route("/projects/<string:pid>", methods=["DELETE"])
def delete_project(pid):
    if not project_manager.delete(pid):
        return jsonify({"error": "Project not found"}), 404
    # Move orphaned tasks to "general"
    for t in task_manager.get_all():
        if t.project_id == pid:
            task_manager.update(t.task_id, {"project_id": "general"})
    return jsonify({"success": True})


@tasks_bp.route("/projects/reorder", methods=["POST"])
def reorder_projects():
    data = request.get_json() or {}
    ordered_ids = data.get("ordered_ids", [])
    project_manager.reorder(ordered_ids)
    return jsonify({"success": True})


# ══════════════════════════════════════════════
#  TASK ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/tasks", methods=["GET"])
def get_tasks():
    tasks = task_manager.get_all()

    # Optional filters via query params
    project_id = request.args.get("project_id")
    status     = request.args.get("status")
    priority   = request.args.get("priority")
    search     = request.args.get("search", "").strip().lower()
    sort_by    = request.args.get("sort", "order")   # order|priority|date|status

    if project_id:
        tasks = [t for t in tasks if t.project_id == project_id]
    if status:
        tasks = [t for t in tasks if t.status == status]
    if priority:
        tasks = [t for t in tasks if t.priority == priority]
    if search:
        tasks = [t for t in tasks if search in t.title.lower()
                 or search in (t.description or "").lower()
                 or any(search in tag.lower() for tag in (t.tags or []))]

    # Sorting
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    status_order   = {"in_progress": 0, "pending": 1, "completed": 2, "archived": 3}

    if sort_by == "priority":
        tasks = sorted(tasks, key=lambda t: priority_order.get(t.priority, 4))
    elif sort_by == "date":
        tasks = sorted(tasks, key=lambda t: t.start_date or t.end_date or "9999")
    elif sort_by == "status":
        tasks = sorted(tasks, key=lambda t: status_order.get(t.status, 4))
    else:  # default: order
        tasks = sorted(tasks, key=lambda t: t.order)

    return jsonify([t.to_dict() for t in tasks])


@tasks_bp.route("/tasks", methods=["POST"])
def create_task():
    data = request.get_json() or {}
    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    # Auto-assign to first project if none specified
    if not data.get("project_id"):
        projects = project_manager.get_all()
        data["project_id"] = projects[0].project_id if projects else "general"

    task = Task(
        task_id       = str(uuid4()),
        title         = data.get("title"),
        description   = data.get("description", ""),
        project_id    = data.get("project_id"),
        start_date    = data.get("start_date") or None,
        end_date      = data.get("end_date") or None,
        execution_day = data.get("execution_day") or None,
        priority      = data.get("priority", "medium"),
        status        = data.get("status", "pending"),
        tags          = data.get("tags", []),
        notes         = data.get("notes", ""),
        reminder      = data.get("reminder") or None,
        order         = len(task_manager.tasks),
    )
    task_manager.add(task)
    return jsonify(task.to_dict()), 201


@tasks_bp.route("/tasks/<string:tid>", methods=["PUT"])
def update_task(tid):
    data = request.get_json() or {}
    allowed = {
        "title", "description", "project_id", "start_date", "end_date",
        "execution_day", "priority", "status", "tags", "notes", "reminder", "order"
    }
    fields = {k: v for k, v in data.items() if k in allowed}
    task = task_manager.update(tid, fields)
    if task is None:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict())


@tasks_bp.route("/tasks/<string:tid>", methods=["DELETE"])
def delete_task(tid):
    if not task_manager.delete(tid):
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"success": True})


@tasks_bp.route("/tasks/<string:tid>/complete", methods=["PUT"])
def complete_task(tid):
    task = task_manager.complete(tid)
    if task is None:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict())


@tasks_bp.route("/tasks/<string:tid>/archive", methods=["PUT"])
def archive_task(tid):
    task = task_manager.archive(tid)
    if task is None:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict())


@tasks_bp.route("/tasks/reorder", methods=["POST"])
def reorder_tasks():
    data = request.get_json() or {}
    ordered_ids = data.get("ordered_ids", [])
    task_manager.reorder(ordered_ids)
    return jsonify({"success": True})
