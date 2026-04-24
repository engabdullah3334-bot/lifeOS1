"""
core/registry.py — Action Registry
====================================
Central registry mapping action names (e.g. CREATE_TASK) to executor functions.
The AI Agent looks up actions here — no if/else chains needed.

To add a new action:
  1. Define your function with signature: def my_action(db, user_id, args) -> dict
  2. Decorate it: @register_action("MY_ACTION")
  3. Make sure this module is imported (it's auto-imported by ai_agent.py)

That's it — the AI will be able to use the new action immediately.
"""

import logging
from core.schema_factory import build_document

logger = logging.getLogger(__name__)

# ── Registry ──────────────────────────────────────────────────────────────────

_ACTION_REGISTRY: dict[str, callable] = {}


def register_action(action_name: str):
    """Decorator to register an action executor function."""
    def decorator(func):
        _ACTION_REGISTRY[action_name] = func
        logger.debug("Registered action: %s -> %s", action_name, func.__name__)
        return func
    return decorator


def get_action(action_name: str):
    """Get the executor function for a given action name, or None."""
    return _ACTION_REGISTRY.get(action_name)


def get_all_actions() -> dict:
    """Return a copy of the full action registry."""
    return dict(_ACTION_REGISTRY)


def get_registered_action_names() -> list[str]:
    """Return sorted list of all registered action names."""
    return sorted(_ACTION_REGISTRY.keys())


# ══════════════════════════════════════════════════════════════════════════════
#  BUILT-IN ACTION EXECUTORS
#  ──────────────────────────────────────────────────────────────────────────
#  Each function: (db, user_id, args) -> dict
#  Uses schema_factory for document construction — no hardcoded schemas.
# ══════════════════════════════════════════════════════════════════════════════

@register_action("CREATE_TASK")
def create_task(db, user_id: str, args: dict) -> dict:
    """Create a task in MongoDB via the AI agent."""
    # البحث عن المشروع بالاسم لو الـ AI بعت اسم مش ID
    project_id = args.get("project_id", "general")
    if project_id != "general" and not len(project_id) > 20:  # لو باعت اسم مش UUID
        project = db.projects.find_one({"user_id": user_id, "name": project_id})
        if project:
            project_id = project["project_id"]

    task_data = {
        **args,
        "user_id": user_id,
        "project_id": project_id,
    }

    task = build_document("task", task_data, db=db, user_id=user_id)
    db.tasks.insert_one(task)
    task.pop("_id", None)
    return {"type": "task_created", "id": task["task_id"], "title": task["title"]}


@register_action("CREATE_PROJECT")
def create_project(db, user_id: str, args: dict) -> dict:
    """Create a project in MongoDB via the AI agent."""
    project_data = {
        **args,
        "user_id": user_id,
    }

    project = build_document("project", project_data, db=db, user_id=user_id)
    db.projects.insert_one(project)
    project.pop("_id", None)
    return {"type": "project_created", "id": project["project_id"], "name": project["name"]}
