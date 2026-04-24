"""
core/templates.py — Template Service
======================================
Template definitions are loaded from configs/templates.yaml.
No hardcoded template data in Python.
"""

from uuid import uuid4
from datetime import datetime

from core.config_loader import load_yaml
from core.schema_factory import build_document


def _load_templates() -> list:
    """Load built-in templates from YAML (cached by config_loader)."""
    config = load_yaml("templates.yaml")
    return config.get("templates", [])


def _format_template_strings(data: dict) -> dict:
    """Replace date placeholders in template content."""
    now = datetime.now()
    replacements = {
        "{date_formatted}": now.strftime("%B %d, %Y"),
        "{date_long}": now.strftime("%A, %B %d, %Y"),
    }

    def _replace_in_value(val):
        if isinstance(val, str):
            for placeholder, replacement in replacements.items():
                val = val.replace(placeholder, replacement)
            return val
        elif isinstance(val, dict):
            return {k: _replace_in_value(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [_replace_in_value(item) for item in val]
        return val

    return _replace_in_value(data)


class TemplateService:

    @staticmethod
    def get_templates(category: str = None):
        """إرجاع قائمة القوالب، مع فلترة اختيارية حسب الفئة."""
        templates = _load_templates()
        if category and category != "all":
            return [t for t in templates if t.get("category") == category]
        return templates

    @staticmethod
    def import_template(db, user_id: str, template_id: str):
        """
        استيراد قالب معين لمستخدم بعينه.
        يُرجع (result_dict, error_str)
        """
        templates = _load_templates()
        tmpl = next((t for t in templates if t["id"] == template_id), None)
        if not tmpl:
            return None, "Template not found"

        # Apply date formatting to template data
        data = _format_template_strings(tmpl["data"])
        ttype = data.get("type")

        if ttype == "project_with_tasks":
            return TemplateService._import_project_with_tasks(db, user_id, data)

        elif ttype == "writing_note":
            return TemplateService._import_writing_note(db, user_id, data)

        return None, "Unknown template type"

    # ── Private helpers ──────────────────────────────────────────

    @staticmethod
    def _import_project_with_tasks(db, user_id, data):
        """ينشئ مشروعاً جديداً + مهامه في قاعدة البيانات."""
        proj_data = data["project"]

        # Build project using schema_factory
        project = build_document("project", proj_data, db=db, user_id=user_id)
        db.projects.insert_one(project)
        project.pop("_id", None)

        created_tasks = []
        for idx, task_data in enumerate(data.get("tasks", [])):
            task_input = {
                **task_data,
                "project_id": project["project_id"],
            }
            task = build_document("task", task_input, db=db, user_id=user_id)
            # Adjust order to account for existing tasks
            task["order"] = task["order"] + idx
            db.tasks.insert_one(task)
            task.pop("_id", None)
            created_tasks.append(task)

        return {
            "destination": "tasks",
            "project":     project,
            "tasks":       created_tasks,
            "message":     f"Project '{project['name']}' with {len(created_tasks)} tasks created successfully!",
        }, None

    @staticmethod
    def _import_writing_note(db, user_id, data):
        """ينشئ مشروع كتابة (إن لم يكن موجوداً) + ملاحظة جديدة."""
        note_data = data["note"]
        project_name = data.get("project_name", "Templates")

        # إيجاد أو إنشاء مشروع الكتابة
        existing_proj = db.note_projects.find_one(
            {"user_id": user_id, "name": project_name}, {"_id": 0}
        )

        if existing_proj:
            writing_project_id = existing_proj["project_id"]
        else:
            proj_input = {
                "name": project_name,
                "description": "",
            }
            new_proj = build_document("note_project", proj_input, db=db, user_id=user_id)
            db.note_projects.insert_one(new_proj)
            new_proj.pop("_id", None)
            writing_project_id = new_proj["project_id"]

        # إنشاء الملاحظة
        note_input = {
            "project_id": writing_project_id,
            "title": note_data.get("title", "New Note"),
            "content": note_data.get("content", ""),
        }
        note = build_document("note", note_input, db=db, user_id=user_id)
        db.notes.insert_one(note)
        note.pop("_id", None)

        return {
            "destination":   "writing",
            "project_id":    writing_project_id,
            "project_name":  project_name,
            "note":          note,
            "message":       f"Note '{note['title']}' created in '{project_name}'!",
        }, None
