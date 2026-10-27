import re
from uuid import uuid4
from werkzeug.security import generate_password_hash, check_password_hash

class AuthService:
    @staticmethod
    def validate_email(email):
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, email or "") is not None

    @staticmethod
    def signup(db, data):
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not username:
            return None, "اسم المستخدم مطلوب", 400
        if not email:
            return None, "البريد الإلكتروني مطلوب", 400
        if not AuthService.validate_email(email):
            return None, "البريد الإلكتروني غير صالح", 400
        if not password or len(password) < 6:
            return None, "كلمة المرور يجب أن تكون 6 أحرف على الأقل", 400

        users = db.users
        if users.find_one({"email": email}):
            return None, "البريد الإلكتروني مسجل مسبقاً", 409

        if users.find_one({"username": username}):
            return None, "اسم المستخدم مسجل مسبقاً", 409

        user_id = str(uuid4())
        password_hash = generate_password_hash(password, method="pbkdf2:sha256")

        user_doc = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": password_hash,
        }

        users.insert_one(user_doc)

        user_doc.pop("password_hash", None)
        user_doc.pop("_id", None)

        return user_doc, None, 201

    @staticmethod
    def login(db, data):
        users = db.users

        identifier = (data.get("identifier") or data.get("username") or data.get("email") or "").strip()
        password = data.get("password") or ""

        if not identifier or not password:
            return None, "يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور", 400

        identifier_lower = identifier.lower()
        user = users.find_one({
            "$or": [
                {"email": identifier_lower},
                {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            ]
        })

        if not user:
            return None, "البريد الإلكتروني أو اسم المستخدم غير صحيح", 401

        if not check_password_hash(user.get("password_hash", ""), password):
            return None, "كلمة المرور غير صحيحة", 401

        return user, None, 200
