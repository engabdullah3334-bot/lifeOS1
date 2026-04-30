"""
routes/dashboard.py — Dashboard API
=====================================
GET /api/dashboard  → full dashboard data (axes + today tasks + stats)
GET /api/axes       → life axes config from YAML
"""

from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.task import ProjectService
from datetime import datetime

dashboard_bp = Blueprint("dashboard", __name__)


def get_db():
    return current_app.config["db"]


@dashboard_bp.route("/axes", methods=["GET"])
@jwt_required()
def get_axes():
    """Return projects (formerly life axes) for compatibility if needed."""
    db = get_db()
    user_id = get_jwt_identity()
    projects = ProjectService.get_projects(db, user_id, archived=False)
    return jsonify(projects)


@dashboard_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    """
    Returns all data needed for the dashboard in one call:
      - today's tasks (execution_day = today)
      - tasks grouped by project_id
      - completion stats
      - projects list
    """
    db = get_db()
    user_id = get_jwt_identity()
    today = datetime.now().strftime("%Y-%m-%d")

    projects = ProjectService.get_projects(db, user_id, archived=False)

    # Fetch all tasks via TaskService to properly expand recurring tasks
    from core.task import TaskService
    all_tasks = TaskService.get_tasks(db, user_id, archived=False)

    # Today's tasks: execution_day == today OR no execution_day (inbox)
    today_tasks = [
        t for t in all_tasks
        if t.get("execution_day") == today or not t.get("execution_day")
    ]

    total   = len(today_tasks)
    done    = sum(1 for t in today_tasks if t.get("status") == "completed")
    pct     = round(done / total * 100) if total else 0

    # Group tasks by project_id
    tasks_by_project = {}
    for t in today_tasks:
        pid = t.get("project_id", "general")
        tasks_by_project.setdefault(pid, []).append({
            "task_id":  t["task_id"],
            "title":    t["title"],
            "status":   t.get("status", "pending"),
            "priority": t.get("priority", "medium"),
        })

    return jsonify({
        "date":          today,
        "axes":          projects,  # Keep the key 'axes' for backward compatibility or change frontend
        "tasks_by_axis": tasks_by_project,
        "stats": {
            "total":     total,
            "done":      done,
            "pct":       pct,
            "pending":   total - done,
        },
        "today_tasks": today_tasks[:10],  # top 10 for the widget
    })
