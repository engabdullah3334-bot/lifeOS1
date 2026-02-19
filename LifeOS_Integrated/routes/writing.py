from flask import Blueprint, request, jsonify
from core.writer import writer_manager

writing_bp = Blueprint('writing', __name__)

@writing_bp.route('/notes/structure', methods=['GET'])
def get_structure():
    return jsonify(writer_manager.get_structure())

@writing_bp.route('/notes/content', methods=['GET'])
def get_note_content():
    folder = request.args.get('folder')
    filename = request.args.get('filename')
    content = writer_manager.read_note(folder, filename)
    return jsonify({"content": content})

@writing_bp.route('/notes', methods=['POST'])
def save_note():
    data = request.get_json()
    success = writer_manager.save_note(data['folder'], data['filename'], data['content'])
    return jsonify({"success": success})

@writing_bp.route('/notes/create', methods=['POST'])
def create_note():
    data = request.get_json()
    success = writer_manager.save_note(data['folder'], data['title'], "")
    return jsonify({"success": success})

@writing_bp.route('/notes', methods=['DELETE'])
def delete_note():
    data = request.get_json()
    success = writer_manager.delete_note(data['folder'], data['filename'])
    return jsonify({"success": success})

@writing_bp.route('/folders/create', methods=['POST'])
def create_folder():
    data = request.get_json()
    success = writer_manager.create_folder(data['folder_name'])
    return jsonify({"success": success})

@writing_bp.route('/folders', methods=['DELETE'])
def delete_folder():
    data = request.get_json()
    success = writer_manager.delete_folder(data['folder_name'])
    return jsonify({"success": success})
