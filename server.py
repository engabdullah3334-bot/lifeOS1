import os
import json
from datetime import datetime
from flask import Flask, render_template, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient

# --- 1. إعداد محول الـ JSON للتاريخ ---
class UpdatedJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

app = Flask(__name__,
            static_folder='web/static',
            template_folder='web/templates',
            static_url_path='/static')

app.json = UpdatedJSONProvider(app)
app.debug = True
CORS(app)

# --- 3. استيراد وتسجيل الـ Blueprints ---
# ملاحظة: سيتم الاستيراد هنا لتجنب مشاكل المسارات في Vercel
try:
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.writing import writing_bp
    from routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(tasks_bp, url_prefix="/api")
    app.register_blueprint(writing_bp, url_prefix="/api")
    app.register_blueprint(settings_bp, url_prefix="/api")
except ImportError as e:
    print(f"Error importing blueprints: {e}")

# --- 4. إعدادات الأمان وقاعدة البيانات ---
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "lifeos-secret-2024")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 7 
jwt = JWTManager(app)

# رابط قاعدة البيانات
MONGO_URI = "mongodb+srv://engabdullah3334_db_user:Abdullah123@cluster0.ezzxrec.mongodb.net/LifeOS_Database?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['LifeOS_Database']
app.config["db"] = db

# --- 5. المسارات الأساسية ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test_db')
def test_db():
    try:
        count = db.tasks.count_documents({})
        return jsonify({"status": "Connected", "tasks_count": count})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})

# --- 6. نقطة الدخول لـ Vercel ---
# هذا المتغير هو ما يبحث عنه Vercel لتشغيل التطبيق
app = app

if __name__ == '__main__':
    print("========================================")
    print("   LifeOS Running with MongoDB Cloud")
    print("========================================")
    app.run(host="0.0.0.0", port=5000)