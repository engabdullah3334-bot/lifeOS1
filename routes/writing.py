from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.writing import WritingService

writing_bp = Blueprint("writing", __name__)

def get_db():
    return current_app.config["db"]


# ══════════════════════════════════════════════
#  PROJECTS CRUD (Writing Projects - note containers)
# ══════════════════════════════════════════════

@writing_bp.route("/writing/projects", methods=["GET"])
@jwt_required()
def get_projects():
    return jsonify(WritingService.get_projects(get_db(), get_jwt_identity()))


@writing_bp.route("/writing/projects", methods=["POST"])
@jwt_required()
def create_project():
    project, error, status_code = WritingService.create_project(get_db(), get_jwt_identity(), request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(project), status_code


@writing_bp.route("/writing/projects/<string:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    updated, error, status_code = WritingService.update_project(get_db(), get_jwt_identity(), project_id, request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(updated)


@writing_bp.route("/writing/projects/<string:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    success, error, status_code = WritingService.delete_project(get_db(), get_jwt_identity(), project_id)
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"success": True})


@writing_bp.route("/writing/projects/order", methods=["PUT"])
@jwt_required()
def update_projects_order():
    success, error, status_code = WritingService.update_projects_order(get_db(), get_jwt_identity(), request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"success": True})


@writing_bp.route("/writing/projects/<string:project_id>/archive", methods=["PUT"])
@jwt_required()
def archive_project(project_id):
    updated, error, status_code = WritingService.archive_project(get_db(), get_jwt_identity(), project_id, request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(updated)


# ══════════════════════════════════════════════
#  NOTES STRUCTURE & CRUD
# ══════════════════════════════════════════════

@writing_bp.route("/notes/structure", methods=["GET"])
@jwt_required()
def get_structure():
    return jsonify(WritingService.get_structure(get_db(), get_jwt_identity()))


@writing_bp.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    return jsonify(WritingService.get_notes(get_db(), get_jwt_identity(), request.args.get("project_id")))


@writing_bp.route("/notes/<string:note_id>", methods=["GET"])
@jwt_required()
def get_note(note_id):
    note, error, status_code = WritingService.get_note(get_db(), get_jwt_identity(), note_id)
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(note)


@writing_bp.route("/notes", methods=["POST"])
@jwt_required()
def create_note():
    note, error, status_code = WritingService.create_note(get_db(), get_jwt_identity(), request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(note), status_code


@writing_bp.route("/notes/<string:note_id>", methods=["PUT"])
@jwt_required()
def update_note(note_id):
    updated, error, status_code = WritingService.update_note(get_db(), get_jwt_identity(), note_id, request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(updated)


@writing_bp.route("/notes/<string:note_id>/move", methods=["PUT"])
@jwt_required()
def move_note(note_id):
    updated, error, status_code = WritingService.move_note(get_db(), get_jwt_identity(), note_id, request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify(updated)


@writing_bp.route("/notes/order", methods=["PUT"])
@jwt_required()
def update_notes_order():
    success, error, status_code = WritingService.update_notes_order(get_db(), get_jwt_identity(), request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"success": True})


@writing_bp.route("/notes/<string:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    success, error, status_code = WritingService.delete_note(get_db(), get_jwt_identity(), note_id)
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"success": True})


@writing_bp.route("/notes/<string:note_id>/archive", methods=["PUT"])
@jwt_required()
def archive_note(note_id):
    archived, error, status_code = WritingService.archive_note(get_db(), get_jwt_identity(), note_id, request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code
    
    return jsonify({"success": True, "archived": archived})


# ══════════════════════════════════════════════
#  LEGACY: Quick Note content (folder/filename style)
# ══════════════════════════════════════════════

@writing_bp.route("/notes/content", methods=["GET"])
@jwt_required()
def get_note_content():
    content, error, status_code = WritingService.get_quick_note(get_db(), get_jwt_identity(), request.args)
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"content": content})


@writing_bp.route("/notes/quick", methods=["POST"])
@jwt_required()
def save_quick_note():
    success, error, status_code = WritingService.save_quick_note(get_db(), get_jwt_identity(), request.get_json() or {})
    if error:
        return jsonify({"error": error}), status_code

    return jsonify({"success": True})
