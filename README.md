<div align="center">

# 🧠 LifeOS

### Personal Life Management System

**Version 1.0** &nbsp;|&nbsp; Released 2026-04-26 &nbsp;|&nbsp; Python · Flask · MongoDB

[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-black?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://mongodb.com)
[![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20Grok%20%7C%20Ollama-purple?style=flat-square)](https://deepmind.google)

</div>

---

> 📚 **Documentation:**
> &nbsp;[README](README.md) (you are here)&nbsp; · &nbsp;[Feature Flows](FEATURE_FLOWS.md) — step-by-step technical walkthrough of every feature&nbsp; · &nbsp;[Architecture Map](lifeos_map.md)

---

## 📖 What is LifeOS?

**LifeOS** is a full-stack personal productivity web application that combines task management, structured note-taking, and a context-aware AI assistant into a single platform.

Instead of juggling multiple tools (Notion, Todoist, ChatGPT...) LifeOS gives you one unified workspace where the AI understands your context and can create tasks, projects, and notes directly in your database.

### ✨ Core Features

| Feature | Description |
|---------|-------------|
| **✅ Tasks & Projects** | Full task management, priorities, recurrence, and drag-and-drop ordering |
| **📅 Calendar** | Notion-style calendar with Time Blocking (`timeGridWeek`) and priority tagging |
| **✍️ Writing Space** | Note editor organized into projects, with quick-capture support |
| **🤖 AI Agent** | Context-aware assistant that writes directly to your database via Action tags |
| **📋 Templates** | Ready-made templates for common projects and workflows |
| **🗄️ Archive** | Archive tasks and notes with full restore capability |
| **📊 Dashboard** | Daily focus view with statistics widgets |
| **⚙️ Settings** | Full UI customization — themes, colors, layout preferences |

---

## 🏗️ Architecture Overview

```
Browser (SPA)
    ↕  HTTP + JWT
Flask Server (server.py)
    ↕  Blueprint call
routes/*.py          <- HTTP layer only — no business logic
    ↕  service(db, user_id, data)
core/*.py            <- Pure business logic — no Flask, no HTTP
    ↕  CRUD
MongoDB              <- Single database
```

### Design Principles

| Principle | How it's applied |
|-----------|-----------------|
| **Separation of Concerns** | `routes/` never touches MongoDB — `core/` never touches Flask |
| **Config-Driven** | No hardcoded values in Python — everything lives in YAML |
| **Action Registry** | AI communicates with the DB only through registered, validated executors |
| **Fail-Safe AI** | Provider waterfall (Gemini → Grok → Ollama) — never a hard crash |
| **Smart Defaults** | `schema_factory` auto-fills missing fields from `schemas.yaml` |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- An API key for at least one AI provider (Gemini / Grok) **or** Ollama running locally

### 1. Clone and install

```bash
git clone <repo-url>
cd My_App

# Create virtual environment
python -m venv .venv

# Activate
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure environment variables

Create a `.env` file inside the `My_App/` directory:

```env
# ── Required ─────────────────────────────────
MONGO_URI=mongodb://localhost:27017
JWT_SECRET_KEY=replace-this-with-a-long-random-secret

# ── Optional ─────────────────────────────────
MONGO_DB_NAME=LifeOS_Database
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GROK_API_KEY=your-grok-api-key
FLASK_ENV=development
CORS_ORIGINS=http://localhost:5000
```

> **Warning:** Never commit `.env` to Git. It is already listed in `.gitignore`.

### 3. Start the server

```bash
# Make sure MongoDB is running first (Windows service):
# net start MongoDB

python server.py
```

Open your browser at: **http://localhost:5000**

### 4. Verify everything is working

```
GET http://localhost:5000/api/status
```

Expected response:
```json
{
  "db_ok": true,
  "db_msg": "Connected to LifeOS_Database",
  "ai_provider": "gemini",
  "blueprints": ["auth", "tasks", "writing", "settings", "archive", "templates", "ai", "dashboard"],
  "action_registry": {
    "count": 8,
    "actions": [
      {"name": "COMPLETE_TASK",              "func": "complete_task"},
      {"name": "CREATE_NOTE",               "func": "create_note"},
      {"name": "CREATE_PROJECT",            "func": "create_project"},
      {"name": "CREATE_PROJECT_WITH_TASKS", "func": "create_project_with_tasks"},
      {"name": "CREATE_TASK",               "func": "create_task"},
      {"name": "DELETE_TASK",               "func": "delete_task"},
      {"name": "QUICK_NOTE",                "func": "quick_note"},
      {"name": "UPDATE_TASK",               "func": "update_task"}
    ]
  }
}
```

---

## 📡 API Reference

> All endpoints except `/api/auth/*` require a JWT token:
> `Authorization: Bearer <token>`

### 🔐 Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register a new account |
| `POST` | `/api/auth/login` | Log in |
| `GET`  | `/api/auth/me` | Get current user info |

```json
// POST /api/auth/signup
{
  "username": "ahmed",
  "email": "ahmed@example.com",
  "password": "securepass123"
}

// POST /api/auth/login
{
  "identifier": "ahmed@example.com",
  "password": "securepass123"
}
```

---

### ✅ Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/tasks`          | Fetch all tasks (recurring tasks are expanded) |
| `POST`   | `/api/tasks`          | Create a task |
| `PUT`    | `/api/tasks/:id`      | Update a task |
| `DELETE` | `/api/tasks/:id`      | Delete a task |
| `POST`   | `/api/tasks/reorder`  | Reorder tasks |

**Query parameters (GET):**
- `?archived=true` — archived tasks
- `?project_id=uuid` — tasks for a specific project
- `?status=pending` — filter by status
- `?search=keyword` — search title and description

**Task fields:**
```json
{
  "title": "Task name",
  "description": "Optional description",
  "priority": "low | medium | high | critical",
  "status": "pending | completed | missed",
  "project_id": "uuid-or-general",
  "recurrence": "none | daily | weekly | monthly",
  "recurrence_pattern": ["Mon", "Wed", "Fri"],
  "execution_day": "2026-04-26",
  "start_time": "14:30",
  "end_time": "16:00",
  "estimated_hours": 2.5,
  "tags": ["tag1", "tag2"],
  "axis_tag": "university | work | sports | goal | learning | entertainment"
}
```

---

### 📁 Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/projects`          | List all projects (with task count + progress) |
| `POST`   | `/api/projects`          | Create a project |
| `PUT`    | `/api/projects/:id`      | Update a project |
| `DELETE` | `/api/projects/:id`      | Delete a project (tasks move to "general") |
| `POST`   | `/api/projects/reorder`  | Reorder projects |

---

### ✍️ Writing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/notes/structure`                    | Full structure: all projects + their notes |
| `GET`    | `/api/writing/projects`                   | List writing projects |
| `POST`   | `/api/writing/projects`                   | Create a writing project |
| `PUT`    | `/api/writing/projects/:id`               | Update a writing project (name, description, tags) |
| `DELETE` | `/api/writing/projects/:id`               | Delete a project (cascade-deletes all notes) |
| `PUT`    | `/api/writing/projects/:id/archive`       | Archive / restore a writing project |
| `PUT`    | `/api/writing/projects/order`             | Reorder writing projects |
| `GET`    | `/api/notes`                              | List notes (`?project_id=` `?status=` `?search=` `?archived=`) |
| `GET`    | `/api/notes/search?q=keyword`             | **NEW** Global full-text search across all notes |
| `POST`   | `/api/notes`                              | Create a note |
| `GET`    | `/api/notes/:id`                          | Get a note (includes `stats.word_count`, `stats.read_time_min`) |
| `PUT`    | `/api/notes/:id`                          | Update note (content, title, status, tags, pinned, is_favorite) |
| `DELETE` | `/api/notes/:id`                          | Delete a note (permanent) |
| `POST`   | `/api/notes/:id/duplicate`                | **NEW** Clone note within its project |
| `PUT`    | `/api/notes/:id/move`                     | Move a note to a different project |
| `PUT`    | `/api/notes/:id/archive`                  | Archive / restore a note |
| `PUT`    | `/api/notes/order`                        | Reorder notes within a project |
| `POST`   | `/api/notes/quick`                        | Append to QuickNote.txt |
| `GET`    | `/api/notes/content`                      | Read note content by filename (legacy) |

---

### 🤖 AI Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/ai/modes` | List available AI modes with metadata |
| `POST` | `/api/ai/chat`  | Send a message and receive a reply + executed actions |

**Request:**
```json
{
  "mode": "planning | tasks | coaching | productivity",
  "messages": [
    {"role": "user",      "content": "Help me plan my study week"},
    {"role": "assistant", "content": "..."},
    {"role": "user",      "content": "Add a math review task for tomorrow"}
  ]
}
```

**Response:**
```json
{
  "reply": "Done! I've added a math review task for tomorrow ✅",
  "actions_taken": [
    {
      "type":     "task_created",
      "id":       "uuid",
      "title":    "Math Review",
      "priority": "medium",
      "success":  true
    }
  ]
}
```

---

### 📋 Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/templates`        | List templates (optional `?category=tasks`) |
| `POST` | `/api/templates/import` | Import a template `{"template_id": "..."}` |

---

### ⚙️ Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get user settings |
| `PUT` | `/api/settings` | Update settings |

```json
{
  "theme": "dark | light",
  "primaryColor": "#4d7cff",
  "backgroundType": "gradient | solid | image",
  "taskSortBy": "order | priority | due_date",
  "showStatsBar": true,
  "soundEnabled": true,
  "uiOpacity": 1
}
```

---

## 🤖 How the AI Action System Works

When you chat with the AI and it decides to create a task, it embeds a special tag in its response:

```
[ACTION:CREATE_TASK]{"title": "Math Review", "priority": "high"}[/ACTION]
```

The server automatically detects these tags, strips them from the reply, and executes them against MongoDB. The user only sees the clean conversational text.

### Available Actions

| Action | Example |
|--------|---------|
| `CREATE_TASK` | `{"title": "...", "priority": "high", "project_id": "Work"}` |
| `UPDATE_TASK` | `{"task_id": "uuid", "status": "completed"}` |
| `COMPLETE_TASK` | `{"task_id": "uuid"}` |
| `DELETE_TASK` | `{"task_id": "uuid"}` |
| `CREATE_PROJECT` | `{"name": "...", "color": "#6366f1", "icon": "🎯"}` |
| `CREATE_PROJECT_WITH_TASKS` ⚡ | `{"name": "...", "tasks": [{"title": "..."}, ...]}` |
| `CREATE_NOTE` | `{"title": "...", "content": "..."}` |
| `QUICK_NOTE` | `{"content": "Idea to capture"}` |

> **Smart feature:** `"project_id": "Work"` (a name) is automatically resolved to the project UUID.

---

## ➕ Adding a New Action

Adding a new AI action takes 2 steps — no changes to `registry.py` needed.

**Step 1 — Add the executor to `core/actions.py`:**
```python
@register_action("MY_ACTION")
def my_action(db, user_id: str, args: dict) -> dict:
    """What this action does."""
    # your logic here
    return {"type": "my_action_done", "id": "..."}
```

**Step 2 — Add instructions to `prompts/action_instructions.txt`:**
```
Do something:
[ACTION:MY_ACTION]{"field": "value"}[/ACTION]
```

That's it. The action is live on the next server start.

---

## 🛠️ Development Guide

### Run in development mode

```bash
# Add to .env:
FLASK_ENV=development

# This enables:
# - Debug-level logging
# - Detailed error traces in console
python server.py
```

### Adding a new database entity

No Python code changes needed — just add to `configs/schemas.yaml`:
```yaml
my_entity:
  collection: "my_collection"
  id_field: "entity_id"
  fields:
    entity_id:
      type: "uuid"
      auto: true
    user_id:
      type: "string"
      required: true
    name:
      type: "string"
      required: true
      default: "Unnamed"
```

Then use it in Python:
```python
from core.schema_factory import build_document
doc = build_document("my_entity", {"name": "Test"}, db=db, user_id=user_id)
```

### Recommended MongoDB indexes

```javascript
db.tasks.createIndex({ user_id: 1, order: 1 })
db.tasks.createIndex({ user_id: 1, project_id: 1 })
db.tasks.createIndex({ user_id: 1, status: 1 })
db.notes.createIndex({ user_id: 1, project_id: 1 })
db.notes.createIndex({ user_id: 1, last_updated: -1 })
db.projects.createIndex({ user_id: 1, order: 1 })
```

---

## 🔒 Security

| Area | Approach |
|------|----------|
| Authentication | JWT tokens with 7-day expiry |
| Passwords | `pbkdf2:sha256` hashing via Werkzeug |
| CORS | Explicit origins whitelist |
| Data isolation | Every DB query includes `user_id` — users cannot access each other's data |
| Secrets | Stored in `.env` only — excluded from Git |

---

## 📦 Dependencies (requirements.txt)

```
Flask>=3.0.0
flask-cors>=4.0.0
flask-jwt-extended>=4.6.0
pymongo>=4.6.0
pyyaml>=6.0.1
werkzeug>=3.0.0
google-generativeai>=0.8.0
requests>=2.31.0
```

---

## 🗺️ Roadmap

- [ ] **V1.3** — Data export (PDF, Markdown)
- [ ] **V1.4** — AI Insights — weekly productivity analysis
- [ ] **V1.5** — Collaboration — shared projects
- [ ] **V2.0** — Mobile app (React Native)

---

## 📄 License

Private project — all rights reserved.

---

<div align="center">
  Built with ❤️ — LifeOS V1.0 — 2026
</div>
