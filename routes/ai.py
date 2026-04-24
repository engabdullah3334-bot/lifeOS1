"""
routes/ai.py — LifeOS AI Agent Blueprint
=========================================
POST /api/ai/chat  → send a message and get a reply (+ any actions taken)
GET  /api/ai/modes → list available AI modes
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.ai_agent import ai_agent_service

ai_bp = Blueprint("ai", __name__)


def get_db():
    return current_app.config["db"]


@ai_bp.route("/ai/modes", methods=["GET"])
@jwt_required()
def get_modes():
    """Return available AI modes with metadata."""
    return jsonify(ai_agent_service.get_modes())


@ai_bp.route("/ai/chat", methods=["POST"])
@jwt_required()
def chat():
    """
    Send a message to the AI agent.

    Request body:
    {
        "mode":     "planning" | "tasks" | "coaching" | "productivity",
        "messages": [{"role": "user"|"assistant", "content": "..."}]
    }

    Response:
    {
        "reply":        "AI response text",
        "actions_taken": [{"type": "task_created", "id": "...", "title": "..."}]
    }
    """
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    mode = data.get("mode", "planning")
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "messages array is required"}), 400

    # Validate last message is from user
    if messages[-1].get("role") != "user":
        return jsonify({"error": "Last message must be from 'user'"}), 400

    try:
        result = ai_agent_service.chat(
            db=db,
            user_id=user_id,
            mode=mode,
            messages=messages,
        )
        return jsonify(result)

    except RuntimeError as exc:
        # Config errors (missing API key, package not installed, etc.)
        return jsonify({"error": str(exc)}), 503

    except Exception as exc:  # pylint: disable=broad-except
        current_app.logger.exception("AI chat error: %s", exc)
        return jsonify({"error": "AI service error. Please try again."}), 500
