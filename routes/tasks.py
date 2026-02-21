from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from uuid import uuid4

tasks_bp = Blueprint("tasks", __name__)

# دالة مساعدة للحصول على قاعدة البيانات من إعدادات التطبيق
def get_db():
    return current_app.config["db"]

# ══════════════════════════════════════════════
#  PROJECT ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/projects", methods=["GET"])
@jwt_required()
def get_projects():
    db = get_db()
    user_id = get_jwt_identity()
    # ?archived=1 للمشاريع المؤرشفة فقط
    archived = request.args.get("archived", "").strip().lower() in ("1", "true", "yes")
    query = {"user_id": user_id}
    query["isArchived"] = True if archived else {"$ne": True}
    projects = list(db.projects.find(query, {"_id": 0}).sort("order", 1))
    
    # حساب عدد المهام والتقدم لكل مشروع
    for p in projects:
        pid = p["project_id"]
        # جلب المهام المرتبطة بهذا المشروع والمستخدم
        proj_tasks = list(db.tasks.find({"project_id": pid, "user_id": user_id}))
        total = len(proj_tasks)
        done = len([t for t in proj_tasks if t.get("status") == "completed"])
        
        p["task_count"] = total
        p["done_count"] = done
        p["progress"] = round((done / total * 100) if total else 0)
        
    return jsonify(projects)

@tasks_bp.route("/projects", methods=["POST"])
@jwt_required()
def create_project():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    project = {
        "project_id": str(uuid4()),
        "user_id": user_id,
        "name": data.get("name", "New Project"),
        "color": data.get("color", "#6366f1"),
        "icon": data.get("icon", "📁"),
        "description": data.get("description", ""),
        "order": db.projects.count_documents({"user_id": user_id}),
        "isArchived": False,
    }
    
    db.projects.insert_one(project)
    # إزالة _id الخاص بـ MongoDB قبل الإرسال للـ Frontend
    project.pop('_id', None)
    return jsonify(project), 201

@tasks_bp.route("/projects/<string:pid>", methods=["PUT"])
@jwt_required()
def update_project(pid):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    allowed = {"name", "color", "icon", "description", "order", "isArchived"}
    update = {k: v for k, v in data.items() if k in allowed}
    
    if not update:
        return jsonify({"error": "No valid fields to update"}), 400
        
    # المنطق الخاص بـ Parent-Child Logic للمشاريع والمهام
    # إذا تم أرشفة المشروع، يجب أرشفة جميع المهام التابعة له
    if update.get("isArchived") is True:
        db.tasks.update_many(
            {"project_id": pid, "user_id": user_id},
            {"$set": {"isArchived": True}}
        )
    # إذا تم استعادة المشروع، يمكننا اختيار استعادة المهام أيضاً أو تركها (برمجياً هنا سنعيدها)
    elif update.get("isArchived") is False:
        db.tasks.update_many(
            {"project_id": pid, "user_id": user_id},
            {"$set": {"isArchived": False}}
        )

    result = db.projects.update_one(
        {"project_id": pid, "user_id": user_id},
        {"$set": update}
    )
    
    if result.matched_count == 0:
        return jsonify({"error": "Project not found"}), 404
        
    updated = db.projects.find_one({"project_id": pid, "user_id": user_id}, {"_id": 0})
    return jsonify(updated)



@tasks_bp.route("/projects/<string:pid>", methods=["DELETE"])
@jwt_required()
def delete_project(pid):
    db = get_db()
    user_id = get_jwt_identity()
    result = db.projects.delete_one({"project_id": pid, "user_id": user_id})

    if result.deleted_count == 0:
        return jsonify({"error": "Project not found"}), 404

    # نقل المهام التي فقدت مشروعها إلى "عام" (general)
    db.tasks.update_many(
        {"project_id": pid, "user_id": user_id},
        {"$set": {"project_id": "general"}},
    )
    return jsonify({"success": True})

# ══════════════════════════════════════════════
#  TASK ROUTES
# ══════════════════════════════════════════════

@tasks_bp.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    db = get_db()
    user_id = get_jwt_identity()
    query = {"user_id": user_id}

    # الأرشيف: ?archived=1 يعيد المهام المؤرشفة فقط؛ وإلا النشطة فقط
    archived = request.args.get("archived", "").strip().lower() in ("1", "true", "yes")
    query["isArchived"] = True if archived else {"$ne": True}

    # الفلاتر
    project_id = request.args.get("project_id")
    status = request.args.get("status")
    search = request.args.get("search", "").strip().lower()

    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    # السحب من MongoDB مع الترتيب
    tasks = list(db.tasks.find(query, {"_id": 0}).sort("order", 1))
    return jsonify(tasks)

@tasks_bp.route("/tasks", methods=["POST"])
@jwt_required()
def create_task():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    task = {
        "task_id": str(uuid4()),
        "user_id": user_id,
        "title": data.get("title"),
        "description": data.get("description", ""),
        "project_id": data.get("project_id", "general"),
        "priority": data.get("priority", "medium"),
        "status": data.get("status", "pending"),
        "order": db.tasks.count_documents({"user_id": user_id}),
        "tags": data.get("tags", []),
        "notes": data.get("notes", ""),
        "isArchived": False,
    }
    
    db.tasks.insert_one(task)
    task.pop('_id', None)
    return jsonify(task), 201

@tasks_bp.route("/tasks/<string:tid>", methods=["PUT"])
@jwt_required()
def update_task(tid):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    # تحديث الحقول المرسلة فقط (مع التأكد من ملكية المستخدم)
    result = db.tasks.update_one({"task_id": tid, "user_id": user_id}, {"$set": data})
    
    if result.matched_count == 0:
        return jsonify({"error": "Task not found"}), 404

    updated_task = db.tasks.find_one({"task_id": tid, "user_id": user_id}, {"_id": 0})
    return jsonify(updated_task)

@tasks_bp.route("/tasks/<string:tid>", methods=["DELETE"])
@jwt_required()
def delete_task(tid):
    db = get_db()
    user_id = get_jwt_identity()
    result = db.tasks.delete_one({"task_id": tid, "user_id": user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"success": True})