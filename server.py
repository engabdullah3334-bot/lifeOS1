import os
import json
from datetime import datetime
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity
from pymongo import MongoClient


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)
# استيراد الـ Blueprints
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.writing import writing_bp
from routes.settings import settings_bp

# 1. إعداد المسارات
base_dir = os.path.abspath(os.path.dirname(__file__))
static_path = os.path.join(base_dir, 'web', 'static')
template_path = os.path.join(base_dir, 'web', 'templates')

app = Flask(__name__,
            static_folder=static_path,
            template_folder=template_path)
app.json_encoder = CustomJSONEncoder
app.debug = True
CORS(app)

# إعداد JWT (استخدم متغير بيئة أو قيمة افتراضية للتطوير)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "lifeos-secret-change-in-production-2024")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 7  # 7 أيام
jwt = JWTManager(app)

# 2. إعداد الاتصال بـ MongoDB
# استبدل Abdullah123 بكلمة السر اللي عملتها في الخطوة اللي فاتت
MONGO_URI = "mongodb+srv://engabdullah3334_db_user:Abdullah123@cluster0.ezzxrec.mongodb.net/LifeOS_Database?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['LifeOS_Database'] # اسم قاعدة البيانات

# جعل الكائن db متاحاً في التطبيق ليتم استخدامه في الـ Blueprints
app.config["db"] = db

# 3. تسجيل الـ Blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(tasks_bp, url_prefix="/api")
app.register_blueprint(writing_bp, url_prefix="/api")
app.register_blueprint(settings_bp, url_prefix="/api")

# 4. الروابط الأساسية
@app.route('/')
def index():
    return render_template('index.html')

# مثال بسيط لاختبار الاتصال في المتصفح عبر رابط /test_db
@app.route('/test_db')
def test_db():
    try:
        # محاولة جلب عدد المهام للتأكد من الاتصال
        count = db.tasks.count_documents({})
        return jsonify({"status": "Connected", "tasks_count": count})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})

if __name__ == '__main__':
    print("========================================")
    print("   LifeOS Running with MongoDB Cloud")
    print("========================================")
    app.run(host="0.0.0.0", port=5000)