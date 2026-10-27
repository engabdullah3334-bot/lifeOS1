"""
core/registry.py — Action Registry Infrastructure
===================================================
Provides the infrastructure for registering and retrieving AI Action executors.

The actual Action implementations (CREATE_TASK, UPDATE_TASK, ...) live in:
  → core/actions.py

Full flow:
  ai_agent.chat()
    ├── _parse_actions()    → looks up registry.get_action(type)
    └── _execute_actions()  → calls executor(db, user_id, args)

To add a new action:
  1. Go to core/actions.py
  2. Add a function decorated with @register_action("ACTION_NAME")
  3. Describe it in prompts/action_instructions.txt
  No changes needed here.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Callable

logger = logging.getLogger(__name__)


# ── Action Metadata ────────────────────────────────────────────────────────────

@dataclass
class ActionEntry:
    """
    Metadata stored for each registered action in the Registry.
    Used for diagnostics, logging, and the /api/status endpoint.
    """
    name:          str
    func:          Callable
    module:        str
    registered_at: float = field(default_factory=time.time)

    @property
    def call_path(self) -> str:
        return f"{self.module}.{self.func.__name__}"


# ── Internal Store ─────────────────────────────────────────────────────────────

_REGISTRY: dict[str, ActionEntry] = {}


# ── Public API ─────────────────────────────────────────────────────────────────

def register_action(action_name: str):
    """
    Decorator to register an executor function for a given action name.

    Usage:
        @register_action("CREATE_TASK")
        def create_task(db, user_id: str, args: dict) -> dict:
            ...

    Executor signature:
        (db, user_id: str, args: dict) -> dict
    """
    def decorator(func: Callable) -> Callable:
        module = func.__module__
        entry  = ActionEntry(name=action_name, func=func, module=module)
        _REGISTRY[action_name] = entry
        logger.debug("Registered action: %-30s <- %s", action_name, entry.call_path)
        return func
    return decorator


def get_action(action_name: str) -> Callable | None:
    """
    Return the executor function for a given action name, or None if not found.
    """
    entry = _REGISTRY.get(action_name)
    return entry.func if entry else None


def get_all_actions() -> dict[str, Callable]:
    """Return a snapshot of the registry as {action_name: executor_func}."""
    return {name: entry.func for name, entry in _REGISTRY.items()}


def get_registered_action_names() -> list[str]:
    """Return a sorted list of all registered action names."""
    return sorted(_REGISTRY.keys())


def get_registry_stats() -> dict:
    """
    Return registry statistics — used by /api/status and diagnostics.

    Returns:
        {
          "count": int,
          "actions": [{"name": str, "module": str, "func": str}, ...]
        }
    """
    return {
        "count": len(_REGISTRY),
        "actions": [
            {
                "name":   name,
                "module": entry.module,
                "func":   entry.func.__name__,
            }
            for name, entry in sorted(_REGISTRY.items())
        ],
    }


def is_registered(action_name: str) -> bool:
    """Quick check whether an action name is registered."""
    return action_name in _REGISTRY
