"""
routes/settings.py — LifeOS User Settings
========================================
Persist theme, colors, UI preferences in MongoDB Atlas
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

settings_bp = Blueprint("settings", __name__)

DEFAULTS = {
    "theme": "dark",
    "primaryColor": "#4d7cff",
    "backgroundType": "gradient",
    "backgroundColor": "#0b0f1a",
    "backgroundImage": None,
    "showStatsBar": True,
    "soundEnabled": True,
    "uiOpacity": 1,
}


def get_db():
    return current_app.config["db"]


def get_settings_collection():
    return get_db().user_settings


@settings_bp.route("/settings", methods=["GET"])
@jwt_required()
def get_settings():
    """Get current user's settings from MongoDB"""
    user_id = get_jwt_identity()
    coll = get_settings_collection()
    doc = coll.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
    if not doc:
        return jsonify(DEFAULTS)
    # Merge with defaults for any new keys
    merged = {**DEFAULTS, **doc}
    return jsonify(merged)


@settings_bp.route("/settings", methods=["PUT"])
@jwt_required()
def update_settings():
    """Save user settings to MongoDB"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    coll = get_settings_collection()

    allowed = set(DEFAULTS.keys())
    payload = {k: v for k, v in data.items() if k in allowed}

    if not payload:
        return jsonify({"error": "No valid settings provided"}), 400

    coll.update_one(
        {"user_id": user_id},
        {"$set": payload},
        upsert=True,
    )
    return jsonify({"success": True})
