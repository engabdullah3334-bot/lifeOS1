from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.settings import SettingsService

settings_bp = Blueprint("settings", __name__)

def get_db():
    return current_app.config["db"]


@settings_bp.route("/settings", methods=["GET"])
@jwt_required()
def get_settings():
    """Get current user's settings from MongoDB"""
    user_id = get_jwt_identity()
    db = get_db()
    
    settings = SettingsService.get_settings(db, user_id)
    return jsonify(settings)


@settings_bp.route("/settings", methods=["PUT"])
@jwt_required()
def update_settings():
    """Save user settings to MongoDB"""
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json() or {}

    success, error = SettingsService.update_settings(db, user_id, data)
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"success": True})
