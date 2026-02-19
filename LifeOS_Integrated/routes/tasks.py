from flask import Blueprint, request, jsonify
from core.task import task_manager, Task

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = list(task_manager.tasks.values())
    return jsonify([t.to_dict() for t in tasks])

@tasks_bp.route('/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    new_id = max((t.task_id for t in task_manager.tasks.values()), default=0) + 1
    
    # Handle optional date fields
    due_date = data.get('due_date')
    if not due_date: due_date = None
    
    start_time = data.get('start_time') 
    if not start_time: start_time = None

    task = Task(
        task_id=new_id, 
        title=data.get('title'),
        description=data.get('description', ''),
        due_date=due_date,
        start_time=start_time,
        category=data.get('category'),
        priority=data.get('priority'),
        recurrence=data.get('recurrence')
    )
    task_manager.add_task(task)
    return jsonify(task.to_dict())

@tasks_bp.route('/tasks/<int:id>', methods=['PUT'])
def update_task(id):
    data = request.get_json()
    if id not in task_manager.tasks:
        return jsonify({"error": "Not found"}), 404
    
    task = task_manager.tasks[id]
    
    # Update fields if present
    if 'title' in data: task.title = data['title']
    if 'description' in data: task.description = data['description']
    if 'category' in data: task.category = data['category']
    if 'priority' in data: task.priority = data['priority']
    if 'recurrence' in data: task.recurrence = data['recurrence']
    
    # Date fields need careful update (can be cleared)
    if 'due_date' in data:
         # logic to parse or set None
         val = data['due_date']
         if val:
             from datetime import datetime
             task.due_date = datetime.fromisoformat(val) if isinstance(val, str) else val
         else:
             task.due_date = None

    if 'start_time' in data:
         val = data['start_time']
         if val:
             from datetime import datetime
             task.start_time = datetime.fromisoformat(val) if isinstance(val, str) else val
         else:
             task.start_time = None

    task_manager.save_to_file()
    return jsonify(task.to_dict())

@tasks_bp.route('/tasks/<int:id>/complete', methods=['PUT'])
def complete_task(id):
    if task_manager.mark_completed(id):
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

@tasks_bp.route('/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    if task_manager.delete_task(id):
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404
