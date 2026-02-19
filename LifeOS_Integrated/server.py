import os
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from routes.tasks import tasks_bp
from routes.writing import writing_bp


base_dir = os.path.abspath(os.path.dirname(__file__))
static_path = os.path.join(base_dir, 'web', 'static')
template_path = os.path.join(base_dir, 'web', 'templates')

app = Flask(__name__,
            static_folder=static_path,
            template_folder=template_path)
CORS(app)

# Register Blueprints
app.register_blueprint(tasks_bp, url_prefix='/api')
app.register_blueprint(writing_bp, url_prefix='/api')


# Frontend Routes
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    print("========================================")
    print("   LifeOS Integrated Server Running")
    print("========================================")
    app.run(host="0.0.0.0", port=5000, debug=True)

