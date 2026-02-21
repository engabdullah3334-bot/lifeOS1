from flask import Blueprint, request, jsonify, current_app
from datetime import datetime

writing_bp = Blueprint('writing', __name__)

def get_db():
    return current_app.config['db']

# 1. جلب هيكل المجلدات والملاحظات
@writing_bp.route('/notes/structure', methods=['GET'])
def get_structure():
    db = get_db()
    # جلب كل الملاحظات من قاعدة البيانات
    notes = list(db.notes.find({}, {'_id': 0}))
    
    structure = {}
    for note in notes:
        folder = note.get('folder', 'General')
        if folder not in structure:
            structure[folder] = []
        structure[folder].append(note['filename'])
    
    return jsonify(structure)

# 2. قراءة محتوى ملاحظة معينة
@writing_bp.route('/notes/content', methods=['GET'])
def get_note_content():
    db = get_db()
    folder = request.args.get('folder')
    filename = request.args.get('filename')
    
    note = db.notes.find_one({"folder": folder, "filename": filename}, {'_id': 0})
    content = note.get('content', '') if note else ""
    return jsonify({"content": content})

# 3. حفظ أو تحديث ملاحظة
@writing_bp.route('/notes', methods=['POST'])
def save_note():
    db = get_db()
    data = request.get_json()
    
    # استخدام update_one مع upsert=True (لو مش موجودة ينشئها)
    db.notes.update_one(
        {"folder": data['folder'], "filename": data['filename']},
        {"$set": {
            "content": data['content'],
            "last_modified": datetime.now()
        }},
        upsert=True
    )
    return jsonify({"success": True})

# 4. إنشاء ملاحظة جديدة
@writing_bp.route('/notes/create', methods=['POST'])
def create_note():
    db = get_db()
    data = request.get_json()
    
    new_note = {
        "folder": data['folder'],
        "filename": data['title'], # أو data.get('filename')
        "content": "",
        "created_at": datetime.now()
    }
    db.notes.insert_one(new_note)
    return jsonify({"success": True})

# 5. حذف ملاحظة
@writing_bp.route('/notes', methods=['DELETE'])
def delete_note():
    db = get_db()
    data = request.get_json()
    
    result = db.notes.delete_one({"folder": data['folder'], "filename": data['filename']})
    return jsonify({"success": result.deleted_count > 0})

# 6. إنشاء مجلد (في MongoDB المجلد هو مجرد اسم حقل)
@writing_bp.route('/folders/create', methods=['POST'])
def create_folder():
    # في نظام MongoDB لا نحتاج لإنشاء مجلد فعلي، 
    # المجلد يظهر بمجرد إضافة ملاحظة بداخله.
    return jsonify({"success": True})