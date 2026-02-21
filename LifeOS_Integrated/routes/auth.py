"""
routes/auth.py — LifeOS User Authentication
==========================================
Signup, Login (email or username), JWT handling
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from uuid import uuid4
import re

auth_bp = Blueprint("auth", __name__)


def get_db():
    return current_app.config["db"]


def get_users_collection():
    """مجموعة users في MongoDB Atlas"""
    return get_db().users


def validate_email(email):
    """التحقق من صحة البريد الإلكتروني"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email or "") is not None


# ══════════════════════════════════════════════
#  SIGNUP
# ══════════════════════════════════════════════

@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    """التسجيل: الاسم، البريد الإلكتروني، كلمة المرور"""
    db = get_db()
    users = get_users_collection()
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # التحقق من المدخلات
    if not username:
        return jsonify({"error": "اسم المستخدم مطلوب"}), 400
    if not email:
        return jsonify({"error": "البريد الإلكتروني مطلوب"}), 400
    if not validate_email(email):
        return jsonify({"error": "البريد الإلكتروني غير صالح"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"}), 400

    # التحقق من عدم تكرار البريد
    if users.find_one({"email": email}):
        return jsonify({"error": "البريد الإلكتروني مسجل مسبقاً"}), 409

    # التحقق من عدم تكرار اسم المستخدم
    if users.find_one({"username": username}):
        return jsonify({"error": "اسم المستخدم مسجل مسبقاً"}), 409

    # إنشاء المستخدم
    user_id = str(uuid4())
    password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    user_doc = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "password_hash": password_hash,
    }

    users.insert_one(user_doc)

    # إرجاع بيانات المستخدم بدون كلمة المرور
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)

    return jsonify({
        "message": "تم إنشاء الحساب بنجاح",
        "user": user_doc,
    }), 201


# ══════════════════════════════════════════════
#  LOGIN (بالبريد أو باسم المستخدم)
# ══════════════════════════════════════════════

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """تسجيل الدخول: بالبريد الإلكتروني أو اسم المستخدم + كلمة المرور"""
    users = get_users_collection()
    data = request.get_json() or {}

    identifier = (data.get("identifier") or data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور"}), 400

    # البحث بالبريد أو اسم المستخدم
    identifier_lower = identifier.lower()
    user = users.find_one({
        "$or": [
            {"email": identifier_lower},
            {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
        ]
    })

    if not user:
        return jsonify({"error": "البريد الإلكتروني أو اسم المستخدم غير صحيح"}), 401

    if not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "كلمة المرور غير صحيحة"}), 401

    # إنشاء JWT
    token = create_access_token(
        identity=user["user_id"],
        additional_claims={
            "username": user["username"],
            "email": user["email"],
        },
    )

    return jsonify({
        "message": "تم تسجيل الدخول بنجاح",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
        },
    })


# ══════════════════════════════════════════════
#  الحصول على بيانات المستخدم الحالي (يحتاج JWT)
# ══════════════════════════════════════════════

@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """جلب بيانات المستخدم المسجل دخوله"""
    user_id = get_jwt_identity()
    jwt_data = get_jwt()
    return jsonify({
        "user_id": user_id,
        "username": jwt_data.get("username", ""),
        "email": jwt_data.get("email", ""),
    })
