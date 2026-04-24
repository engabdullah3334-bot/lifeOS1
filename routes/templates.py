"""
routes/templates.py
--------------------
Blueprint للقوالب (Templates API)
GET  /api/templates          → قائمة القوالب
POST /api/templates/import   → استيراد قالب معين
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.templates import TemplateService

templates_bp = Blueprint("templates", __name__)


def get_db():
    return current_app.config["db"]


@templates_bp.route("/templates", methods=["GET"])
@jwt_required()
def get_templates():
    """إرجاع قائمة القوالب مع فلترة اختيارية بالفئة."""
    category = request.args.get("category", "all").strip().lower()
    templates = TemplateService.get_templates(category)
    return jsonify(templates)


@templates_bp.route("/templates/import", methods=["POST"])
@jwt_required()
def import_template():
    """استيراد قالب وإنشاء بياناته في قاعدة البيانات."""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    template_id = data.get("template_id", "").strip()
    if not template_id:
        return jsonify({"error": "template_id is required"}), 400

    result, error = TemplateService.import_template(db, user_id, template_id)
    if error:
        return jsonify({"error": error}), 404

    return jsonify(result), 201
