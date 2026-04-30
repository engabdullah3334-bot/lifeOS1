import os
import logging
from datetime import datetime
from flask import Flask, render_template, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

# إيقاف رسائل الـ DEBUG الخاصة بـ PyMongo فقط
logging.getLogger('pymongo').setLevel(logging.WARNING)

def _load_local_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

_load_local_env()

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
app.debug = os.getenv("FLASK_ENV", "").lower() == "development"

if app.debug:
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if allowed_origins:
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
else:
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}})

# --- 3. استيراد وتسجيل الـ Blueprints ---
# كل blueprint يتم استيراده بشكل مستقل لتجنب فشل الكل بسبب خطأ واحد

_blueprints = [
    ("routes.auth",      "auth_bp",      "/api"),
    ("routes.tasks",     "tasks_bp",     "/api"),
    ("routes.writing",   "writing_bp",   "/api"),
    ("routes.settings",  "settings_bp",  "/api"),
    ("routes.archive",   "archive_bp",   "/api"),
    ("routes.templates", "templates_bp", "/api"),
    ("routes.ai",        "ai_bp",        "/api"),
    ("routes.dashboard", "dashboard_bp", "/api"),
]

import importlib
import traceback as _tb
for module_path, bp_name, prefix in _blueprints:
    try:
        mod = importlib.import_module(module_path)
        bp = getattr(mod, bp_name)
        app.register_blueprint(bp, url_prefix=prefix)
        print(f"✓ Loaded {module_path}")
    except Exception as e:
        print(f"✗ Failed to load {module_path}: {e}")
        _tb.print_exc()

# --- 4. إعدادات الأمان وقاعدة البيانات ---
jwt_secret = os.getenv("JWT_SECRET_KEY")
if not jwt_secret:
    raise RuntimeError(
        "Missing JWT_SECRET_KEY. Set it in environment variables or in My_App/.env"
    )
app.config["JWT_SECRET_KEY"] = jwt_secret
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 7 
jwt = JWTManager(app)

# رابط قاعدة البيانات
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError(
        "Missing MONGO_URI. Set it in environment variables or in My_App/.env"
    )
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "LifeOS_Database")

def _connect_mongo(uri, db_name):
    try:
        mongo_client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        return mongo_client[db_name]
    except ServerSelectionTimeoutError as exc:
        raise RuntimeError(
            "Could not connect to local MongoDB at mongodb://localhost:27017. "
            "Make sure MongoDB service is running on Windows. "
            f"Original error: {exc}"
        ) from exc
    except PyMongoError as exc:
        raise RuntimeError(f"MongoDB connection error: {exc}") from exc

db = _connect_mongo(MONGO_URI, MONGO_DB_NAME)
app.config["db"] = db

# --- 5. المسارات الأساسية (SPA Routing) ---
@app.route('/')
@app.route('/tasks')
@app.route('/writing')
@app.route('/archive')
@app.route('/templates')
@app.route('/ai')
@app.route('/ai-chat')
def index():
    return render_template('index.html')


@app.route('/test_db')
def test_db():
    try:
        count = db.tasks.count_documents({})
        return jsonify({"status": "Connected", "tasks_count": count})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})


@app.route('/api/status')
def api_status():
    """Dev diagnostic endpoint — shows DB, JWT, blueprint, and action registry status."""
    import sys
    from core.registry import get_registry_stats

    blueprints     = list(app.blueprints.keys())
    db_ok          = False
    db_msg         = ""
    registry_stats = {}

    try:
        db.command("ping")
        db_ok  = True
        db_msg = "Connected to " + MONGO_DB_NAME
    except Exception as e:
        db_msg = str(e)

    try:
        registry_stats = get_registry_stats()
    except Exception:
        registry_stats = {"count": 0, "actions": [], "error": "registry not loaded"}

    return jsonify({
        "python":          sys.version,
        "flask_env":       os.getenv("FLASK_ENV", "not set"),
        "db_ok":           db_ok,
        "db_msg":          db_msg,
        "blueprints":      blueprints,
        "jwt_ok":          bool(app.config.get("JWT_SECRET_KEY")),
        "ai_provider":     os.getenv("AI_PROVIDER", "not set"),
        "action_registry": registry_stats,
    })

if __name__ == '__main__':
    print("========================================")
    print("   LifeOS Running with Local MongoDB")
    print("========================================")
    app.run(host="0.0.0.0", port=5000)
