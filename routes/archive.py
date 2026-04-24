from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.archive import ArchiveService

archive_bp = Blueprint("archive", __name__)

def get_db():
    return current_app.config["db"]

@archive_bp.route("/archive", methods=["GET"])
@jwt_required()
def get_all_archived():
    """Get all archived tasks, notes and projects for the smart archive page."""
    user_id = get_jwt_identity()
    db = get_db()

    data = ArchiveService.get_all_archived(db, user_id)
    return jsonify(data)
