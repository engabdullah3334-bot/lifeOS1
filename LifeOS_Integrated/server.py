import os
from flask import Flask, render_template
from flask_cors import CORS
# تأكد أن المجلدات دي موجودة فعلاً في مسار المشروع
# من الصورة السابقة، يبدو أنك محتاج تتأكد من مكان routes
# from routes.tasks import tasks_bp 

# تحديد المسارات بدقة
base_dir = os.path.abspath(os.path.dirname(__file__))
# لو المجلد اسمه web وبداخله static
static_path = os.path.join(base_dir, 'web', 'static')
template_path = os.path.join(base_dir, 'web', 'templates')

app = Flask(__name__,
            static_folder=static_path,
            template_folder=template_path)

# هذا المتغير هو ما يبحث عنه Vercel (اسم الكائن 'app')
app.debug = True 
CORS(app)

# ... باقي الـ Blueprints ...

@app.route('/')
def index():
    return render_template('index.html')

# Vercel بيتجاهل الجزء ده تماماً، بس خليه عشان التشغيل المحلي (Local)
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)