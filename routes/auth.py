from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, create_access_token
from pymongo.errors import PyMongoError
from core.auth import AuthService

auth_bp = Blueprint("auth", __name__)

def get_db():
    return current_app.config["db"]

# ══════════════════════════════════════════════
#  SIGNUP
# ══════════════════════════════════════════════

@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    db = get_db()
    data = request.get_json() or {}

    try:
        user_doc, error, status_code = AuthService.signup(db, data)
    except PyMongoError:
        return jsonify({"error": "Database connection issue. Please try again shortly."}), 503

    if error:
        return jsonify({"error": error}), status_code

    return jsonify({
        "message": "تم إنشاء الحساب بنجاح",
        "user": user_doc,
    }), 201


# ══════════════════════════════════════════════
#  LOGIN
# ══════════════════════════════════════════════

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    db = get_db()
    data = request.get_json() or {}

    try:
        user, error, status_code = AuthService.login(db, data)
    except PyMongoError:
        return jsonify({"error": "Database connection issue. Please check MONGO_URI/network and try again."}), 503

    if error:
        return jsonify({"error": error}), status_code

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
#  الحصول على بيانات المستخدم الحالي
# ══════════════════════════════════════════════

@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    jwt_data = get_jwt()
    return jsonify({
        "user_id": user_id,
        "username": jwt_data.get("username", ""),
        "email": jwt_data.get("email", ""),
    })
