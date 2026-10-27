"""
core/actions.py — AI Action Executors
======================================
Every function here is automatically registered in the Action Registry
and executed whenever the AI produces an [ACTION:TYPE]{...}[/ACTION] tag.

────────────────────────────────────────────────
Available Actions:

  TASK ACTIONS:
    CREATE_TASK               <- Create a new task (with smart project resolution)
    UPDATE_TASK               <- Update any field on an existing task
    COMPLETE_TASK             <- Mark a task as completed (quick shorthand)
    DELETE_TASK               <- Delete a task permanently

  PROJECT ACTIONS:
    CREATE_PROJECT            <- Create a new task project
    CREATE_PROJECT_WITH_TASKS <- Create a project + its tasks in one shot (power action)

  WRITING ACTIONS:
    CREATE_NOTE               <- Create a note in the Writing module
    QUICK_NOTE                <- Append text to QuickNote.txt in the System project

────────────────────────────────────────────────
To add a new action:
  1. Add a function decorated with @register_action("ACTION_NAME")
  2. Describe it in prompts/action_instructions.txt
  No changes to registry.py are needed.

Executor signature:
  def my_action(db, user_id: str, args: dict) -> dict:
      ...
      return {"type": "result_type", "id": "...", ...}
"""

import logging
import re

from core.registry import register_action
from core.task import TaskService, ProjectService
from core.writing import WritingService

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _is_uuid(value: str) -> bool:
    """Return True if the value looks like a UUID (8-4-4-4-12 format)."""
    return bool(re.match(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        value or '', re.IGNORECASE
    ))


def _resolve_project_id(db, user_id: str, project_ref: str | None) -> str | None:
    """
    Smart project resolver:
      - If project_ref is a valid UUID  → return as-is.
      - If project_ref is a name string → search the DB case-insensitively.
      - If not found                    → return the original value
                                          (schema_factory will apply the default).

    This lets the AI use a human-readable project name instead of a UUID.
    Example: {"project_id": "Work"} automatically finds the "Work" project.
    """
    if not project_ref:
        return None

    if _is_uuid(project_ref):
        return project_ref

    # Search by name (case-insensitive, active projects only)
    safe_name = re.escape(project_ref.strip())
    proj = db.projects.find_one(
        {
            "user_id":    user_id,
            "name":       {"$regex": f"^{safe_name}$", "$options": "i"},
            "isArchived": {"$ne": True},
        },
        {"project_id": 1}
    )

    if proj:
        logger.debug("Resolved project name '%s' -> %s", project_ref, proj["project_id"])
        return proj["project_id"]

    logger.warning("Could not resolve project '%s' for user %s", project_ref, user_id)
    return project_ref


def _safe_args(args: dict) -> dict:
    """Return a shallow copy of args to avoid mutating the caller's dict."""
    return dict(args)


# ══════════════════════════════════════════════════════════════════════════════
#  TASK ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@register_action("CREATE_TASK")
def create_task(db, user_id: str, args: dict) -> dict:
    """
    Create a new task.

    Accepted fields:
      title (required), description, priority (low|medium|high|critical),
      project_id (UUID or project name), due_date (YYYY-MM-DD),
      recurrence (none|daily|weekly|monthly), tags (list),
      estimated_hours (number), axis_tag

    Example tag:
      [ACTION:CREATE_TASK]{"title": "Buy groceries", "priority": "high"}[/ACTION]
    """
    data = _safe_args(args)

    # Smart project resolution: name string -> UUID
    if "project_id" in data:
        data["project_id"] = _resolve_project_id(db, user_id, data["project_id"]) or "general"

    task, error = TaskService.create_task(db, user_id, data)
    if error:
        raise ValueError(f"CREATE_TASK failed: {error}")

    logger.info("AI created task '%s' (id=%s)", task["title"], task["task_id"])
    return {
        "type":       "task_created",
        "id":         task["task_id"],
        "title":      task["title"],
        "project_id": task.get("project_id"),
        "priority":   task.get("priority"),
        "status":     task.get("status"),
    }


@register_action("UPDATE_TASK")
def update_task(db, user_id: str, args: dict) -> dict:
    """
    Update any field on an existing task.

    Required fields:
      task_id (UUID) + any fields to change.

    Example tag:
      [ACTION:UPDATE_TASK]{"task_id": "...", "priority": "critical"}[/ACTION]
    """
    data = _safe_args(args)
    tid  = data.pop("task_id", None)

    if not tid:
        raise ValueError("UPDATE_TASK requires 'task_id'")

    task, error = TaskService.update_task(db, user_id, tid, data)
    if error:
        raise ValueError(f"UPDATE_TASK failed: {error}")

    logger.info("AI updated task '%s' (id=%s)", task["title"], task["task_id"])
    return {
        "type":   "task_updated",
        "id":     task["task_id"],
        "title":  task["title"],
        "status": task.get("status"),
    }


@register_action("COMPLETE_TASK")
def complete_task(db, user_id: str, args: dict) -> dict:
    """
    Shorthand: mark a task as completed in one step.

    Example tag:
      [ACTION:COMPLETE_TASK]{"task_id": "..."}[/ACTION]
    """
    tid = args.get("task_id")
    if not tid:
        raise ValueError("COMPLETE_TASK requires 'task_id'")

    task, error = TaskService.update_task(db, user_id, tid, {"status": "completed"})
    if error:
        raise ValueError(f"COMPLETE_TASK failed: {error}")

    logger.info("AI completed task '%s' (id=%s)", task["title"], task["task_id"])
    return {
        "type":  "task_completed",
        "id":    task["task_id"],
        "title": task["title"],
    }


@register_action("DELETE_TASK")
def delete_task(db, user_id: str, args: dict) -> dict:
    """
    Delete a task permanently.

    Example tag:
      [ACTION:DELETE_TASK]{"task_id": "..."}[/ACTION]
    """
    tid = args.get("task_id")
    if not tid:
        raise ValueError("DELETE_TASK requires 'task_id'")

    ok, error = TaskService.delete_task(db, user_id, tid)
    if error:
        raise ValueError(f"DELETE_TASK failed: {error}")

    logger.info("AI deleted task (id=%s)", tid)
    return {"type": "task_deleted", "id": tid}


# ══════════════════════════════════════════════════════════════════════════════
#  PROJECT ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@register_action("CREATE_PROJECT")
def create_project(db, user_id: str, args: dict) -> dict:
    """
    Create a new task project.

    Accepted fields:
      name (required), description, color (#hex), icon (emoji)

    Example tag:
      [ACTION:CREATE_PROJECT]{"name": "Q3 Goals", "color": "#10b981", "icon": "🎯"}[/ACTION]
    """
    project = ProjectService.create_project(db, user_id, args)

    logger.info("AI created project '%s' (id=%s)", project["name"], project["project_id"])
    return {
        "type":  "project_created",
        "id":    project["project_id"],
        "title": project["name"],
        "color": project.get("color"),
    }


@register_action("CREATE_PROJECT_WITH_TASKS")
def create_project_with_tasks(db, user_id: str, args: dict) -> dict:
    """
    Power Action: create a project AND all its tasks in a single AI response.
    Ideal when the user describes a large goal that needs to be broken down.

    Expected format:
      {
        "name": "Project Name",
        "description": "...",
        "color": "#hex",
        "tasks": [
          {"title": "First task", "priority": "high"},
          {"title": "Second task", "priority": "medium"}
        ]
      }

    Example tag:
      [ACTION:CREATE_PROJECT_WITH_TASKS]{
        "name": "Launch Website",
        "color": "#6366f1",
        "tasks": [
          {"title": "Design mockup", "priority": "high"},
          {"title": "Set up hosting", "priority": "medium"},
          {"title": "Write copy", "priority": "low"}
        ]
      }[/ACTION]
    """
    data       = _safe_args(args)
    tasks_data = data.pop("tasks", [])

    # Create the project first
    project = ProjectService.create_project(db, user_id, data)
    pid     = project["project_id"]

    # Create each task and link it to the project
    created_tasks = []
    failed_tasks  = []

    for task_args in tasks_data:
        task_input = {**task_args, "project_id": pid}
        task, error = TaskService.create_task(db, user_id, task_input)
        if task:
            created_tasks.append({"id": task["task_id"], "title": task["title"]})
        else:
            failed_tasks.append({"title": task_args.get("title", "?"), "error": error})
            logger.warning("Failed to create task '%s': %s", task_args.get("title"), error)

    logger.info(
        "AI created project '%s' with %d tasks (id=%s)",
        project["name"], len(created_tasks), pid
    )
    return {
        "type":          "project_with_tasks_created",
        "project_id":    pid,
        "project_name":  project["name"],
        "tasks_created": len(created_tasks),
        "tasks":         created_tasks,
        "tasks_failed":  failed_tasks,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  WRITING ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@register_action("CREATE_NOTE")
def create_note(db, user_id: str, args: dict) -> dict:
    """
    Create a new note in the Writing module.

    Accepted fields:
      title (required or derived from content), content, project_id,
      status (draft|complete|in_review), tags (list)

    If project_id is omitted, the note is created in the System project.

    Example tag:
      [ACTION:CREATE_NOTE]{"title": "Meeting Notes", "content": "..."}[/ACTION]
    """
    data = _safe_args(args)

    # Fall back to the System project if no project_id given
    if not data.get("project_id"):
        from core.config_loader import load_yaml
        config = load_yaml("app_config.yaml")
        data["project_id"] = config.get("constants", {}).get("system_project_id", "system")

    note, error, _ = WritingService.create_note(db, user_id, data)
    if error:
        raise ValueError(f"CREATE_NOTE failed: {error}")

    logger.info("AI created note '%s' (id=%s)", note["title"], note["note_id"])
    return {
        "type":       "note_created",
        "id":         note["note_id"],
        "title":      note["title"],
        "project_id": note.get("project_id"),
    }


@register_action("QUICK_NOTE")
def quick_note(db, user_id: str, args: dict) -> dict:
    """
    Append text to QuickNote.txt in the System project.
    Ideal for capturing a fleeting thought or reminder mid-conversation.

    Required fields:
      content — the text to save

    Example tag:
      [ACTION:QUICK_NOTE]{"content": "Remember to review the slides before the meeting"}[/ACTION]
    """
    content = (args.get("content") or "").strip()
    if not content:
        raise ValueError("QUICK_NOTE requires 'content'")

    ok, error, _ = WritingService.save_quick_note(db, user_id, {"content": content})
    if error:
        raise ValueError(f"QUICK_NOTE failed: {error}")

    logger.info("AI saved quick note for user %s", user_id)
    return {
        "type":    "quick_note_saved",
        "preview": content[:80] + ("..." if len(content) > 80 else ""),
    }
