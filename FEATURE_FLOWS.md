# 🔬 LifeOS — Feature Flows (Technical & Logical)

> Step-by-step walkthrough of every feature: from the moment the user triggers an action
> to the moment the result appears on screen.
> **Version:** V1.0 | **Last updated:** 2026-04-26

---

## Table of Contents

1. [Authentication (Login / Signup)](#1--authentication-login--signup)
2. [Dashboard](#2--dashboard)
3. [Tasks & Projects](#3--tasks--projects)
4. [Writing Space (Notes)](#4--writing-space-notes)
5. [AI Agent](#5--ai-agent)
6. [Templates](#6--templates)
7. [Archive](#7--archive)
8. [Settings](#8--settings)

---

## 1. 🔐 Authentication (Login / Signup)

### Logical Purpose
Every piece of data in LifeOS is isolated per user.
Authentication creates a verified identity (`user_id`) that is stamped on every DB query,
so User A can never read or write User B's data.

---

### 1a. Signup Flow

```
User fills form → clicks "Create Account"
         │
         ▼
[Browser — auth.js]
  Collects: { username, email, password }
  Calls: POST /api/auth/signup (no token needed)
         │
         ▼
[routes/auth.py — signup()]
  Reads JSON body
  Calls: AuthService.signup(db, data)
         │
         ▼
[core/auth.py — AuthService.signup()]
  1. Validates email format (regex)
  2. Validates password length (≥ 6 chars)
  3. Checks DB: is email already taken?     → 409 if yes
  4. Checks DB: is username already taken?  → 409 if yes
  5. Generates: user_id = str(uuid4())
  6. Hashes password: pbkdf2:sha256 via Werkzeug
  7. Inserts document into db.users
  8. Returns user doc (WITHOUT password_hash)
         │
         ▼
[routes/auth.py]
  Returns HTTP 201: { message, user: { user_id, username, email } }
         │
         ▼
[Browser — auth.js]
  Shows success message → redirects to Login page
```

---

### 1b. Login Flow

```
User fills identifier + password → clicks "Login"
         │
         ▼
[Browser — auth.js]
  Calls: POST /api/auth/login
  Body: { identifier: "email or username", password: "..." }
         │
         ▼
[routes/auth.py — login()]
  Calls: AuthService.login(db, data)
         │
         ▼
[core/auth.py — AuthService.login()]
  1. Searches db.users by email OR username (case-insensitive regex)
  2. If not found → 401
  3. Verifies password with Werkzeug check_password_hash()
  4. If mismatch → 401
  5. Returns user document
         │
         ▼
[routes/auth.py]
  1. Calls flask_jwt_extended.create_access_token()
     - identity   = user_id
     - extra claims: username, email
     - expiry: 7 days (JWT_ACCESS_TOKEN_EXPIRES in server.py)
  2. Returns HTTP 200: { token, user: { user_id, username, email } }
         │
         ▼
[Browser — auth.js / state.js]
  1. Saves token → localStorage key: "lifeos_token"
  2. Saves user info → app state
  3. Redirects to Dashboard
  4. All future API calls attach: Authorization: Bearer <token>
```

---

### 1c. Protected Route Flow (every request after login)

```
Browser sends: GET /api/tasks
               Header: Authorization: Bearer eyJ...
         │
         ▼
[Flask — @jwt_required() decorator]
  1. Reads token from Authorization header
  2. Verifies signature using JWT_SECRET_KEY
  3. Checks expiry (7-day window)
  4. If invalid → 401 Unprocessable Entity (auto)
  5. If valid   → injects user_id into request context
         │
         ▼
[routes/tasks.py]
  user_id = get_jwt_identity()   ← extracts from verified token
  ... continues to business logic
```

---

## 2. 📊 Dashboard

### Logical Purpose
Provides a unified "daily overview" in a single API call:
today's tasks, per-project grouping, and completion statistics.

---

### Flow

```
User opens Dashboard page
         │
         ▼
[Browser — dashboard.js]
  Calls: GET /api/dashboard
  Header: Authorization: Bearer <token>
         │
         ▼
[routes/dashboard.py — get_dashboard()]
  1. Extracts user_id from JWT
  2. Gets today's date string: datetime.now().strftime("%Y-%m-%d")
         │
         ▼
  3. ProjectService.get_projects(db, user_id, archived=False)
     → Fetches all active projects from db.projects
     → For each project, counts tasks and calculates progress %
         │
         ▼
  4. TaskService.get_tasks(db, user_id, archived=False)
     → Fetches all non-archived tasks
     → Expands recurring tasks into virtual instances
       (a daily task generates one instance per day in a ±30/+60 day window)
         │
         ▼
  5. Filters today_tasks:
     execution_day == today  OR  no execution_day (inbox tasks)
         │
         ▼
  6. Calculates stats: { total, done, pending, pct }
         │
         ▼
  7. Groups tasks by project_id → tasks_by_project dict
         │
         ▼
[routes/dashboard.py]
  Returns: {
    date, axes (projects), tasks_by_axis, stats, today_tasks[0:10]
  }
         │
         ▼
[Browser — dashboard.js]
  Renders:
    - Stats bar (total/done/pct)
    - Today's Focus widget (top 10 tasks)
    - Per-project progress cards
    - Quick Note widget
```

---

## 3. ✅ Tasks & Projects

### Logical Purpose
The core productivity layer. Projects group tasks; tasks carry state (status, priority,
recurrence). All field definitions live in `configs/schemas.yaml` — Python never hardcodes them.

---

### 3a. Create Task Flow

```
User fills task form → clicks "Add Task"
         │
         ▼
[Browser — tasks module]
  Calls: POST /api/tasks
  Body: { title, priority, project_id, due_date, ... }
         │
         ▼
[routes/tasks.py — create_task()]
  1. Extracts user_id from JWT
  2. Reads JSON body
  3. Calls TaskService.create_task(db, user_id, data)
         │
         ▼
[core/task.py — TaskService.create_task()]
  1. Validates: title required
  2. Calls schema_factory.build_document("task", data, db, user_id)
         │
         ▼
  [core/schema_factory.py — build_document()]
    Reads configs/schemas.yaml → task entity definition
    For each field:
      - uuid type    → auto-generate task_id = str(uuid4())
      - datetime     → auto-set created_at = datetime.now()
      - auto_increment → count existing tasks for this user → set order
      - computed     → is_recurring = (recurrence != 'none')
      - enum         → validate priority/status/recurrence values
      - missing field with default → apply default from YAML
      - missing required field     → raise ValueError
    Returns: complete MongoDB document
         │
         ▼
  3. db.tasks.insert_one(document)
  4. Removes _id (MongoDB internal) → returns clean dict
         │
         ▼
[routes/tasks.py]
  Returns HTTP 201: complete task document
         │
         ▼
[Browser]
  Appends new task to the list in UI
  Shows success toast notification
```

---

### 3b. Recurring Task Expansion Flow

```
GET /api/tasks is called
         │
         ▼
[core/task.py — TaskService.get_tasks()]
  1. Fetches raw tasks from DB (one document per recurring task)
  2. Defines window: [today-30 days ... today+60 days]
  3. For each task where recurrence != "none":
         │
         ▼
  [TaskService._generate_occurrences()]
    Loops day by day through the window:
      daily    → create an instance every day
      weekly   → check if weekday is in recurrence_pattern ["Mon","Wed"...]
      monthly  → check if day-of-month matches base_date.day
      custom   → check if (current_date - base_date).days % interval == 0

    For each matching day:
      - Creates a virtual copy of the task
      - Sets task_id = "original_id|YYYY-MM-DD"
      - Sets execution_day = that date
      - Sets status = "completed" if date in completed_dates[] else "pending"
         │
         ▼
  Virtual instances are injected into the results list
  (no extra DB documents created — purely in-memory computation)
         │
         ▼
[Browser]
  Receives flat list of task instances
  Renders them in calendar / list view
```

---

### 3c. Complete Recurring Task Instance

```
User clicks ✓ on a recurring task instance (e.g. "2026-04-26")
         │
         ▼
[Browser]
  Extracts: tid = "original_uuid|2026-04-26"
  Calls: PUT /api/tasks/original_uuid|2026-04-26
  Body: { status: "completed" }
         │
         ▼
[core/task.py — TaskService.update_task()]
  1. Detects "|" in tid → splits into (tid, date_str)
  2. Fetches original task from DB
  3. Detects is_recurring = True
  4. Reads completed_dates[] from existing task
  5. If status == "completed": appends date_str to completed_dates
     If status == "pending":   removes date_str from completed_dates
  6. Saves updated completed_dates to DB (NOT status field)
  7. Returns original task document
         │
         ▼
[Browser]
  Updates that day's instance UI to show completed state
  (the base task document remains unchanged)
```

---

## 4. ✍️ Writing Space (Notes)

### Logical Purpose
A two-level hierarchy: Note Projects → Notes.
Each user always has a "System" project (auto-created) that hosts QuickNote.txt.
All notes are stored as content strings in MongoDB (not as actual files).

---

### 4a. Load Writing Space

```
User opens Writing page
         │
         ▼
[Browser — writing.js]
  Calls: GET /api/notes/structure          ← ⚠️ NOT /api/writing/structure
         │
         ▼
[routes/writing.py]
  Calls: WritingService.get_structure(db, user_id)
         │
         ▼
[core/writing.py — WritingService.get_structure()]
  1. ensure_system_project() → creates System project if missing
  2. Fetches all non-archived note_projects, sorted by (order, created_at desc)
  3. Fetches all non-archived notes for this user
  4. Builds a dict: { project_id: { project: {...}, notes: [...] } }
  5. Notes are sorted by (order, last_updated desc) per project

  ⚠️ Known Bug: notes in structure dict have last_updated already
     serialized to string via _date_ser() before the sort key runs.
     _note_sort_key() checks isinstance(lu, datetime) → always False
     → ts = 0 always → last_updated sort is effectively ignored.
     Fix: serialize AFTER sorting, or parse the string back to datetime.
         │
         ▼
[Browser — writing.js]
  Renders left sidebar: project tree
  Renders note list for selected project
  Renders editor area for selected note
```

---

### 4b. Writing Projects — Full CRUD

```
── CREATE ─────────────────────────────────────────
User clicks "+ New Project" → fills name → confirms
         │
         ▼
[Browser]
  Calls: POST /api/writing/projects
  Body: { name, description, tags[] }
         │
         ▼
[core/writing.py — WritingService.create_project()]
  1. Strips & validates name (required)
  2. Checks uniqueness: db.note_projects.find_one({ user_id, name })  → 409 if duplicate
  3. Calls build_document("note_project", data, db, user_id)
     → auto-generates: project_id (UUID), created_at, order
  4. db.note_projects.insert_one(document)
  Returns: project document (HTTP 201)

── UPDATE ─────────────────────────────────────────
User edits project name / description / tags
         │
         ▼
[Browser]
  Calls: PUT /api/writing/projects/:project_id
  Body: { name?, description?, tags? }
         │
         ▼
[core/writing.py — WritingService.update_project()]
  1. Guards: project_id == system_id → 403 (System project is immutable)
  2. Validates new name (required, unique among user's projects)
  3. db.note_projects.update_one({ user_id, project_id }, { $set: update_data })
  4. If matched_count == 0 → 404

── DELETE ─────────────────────────────────────────
User clicks delete on a project
         │
         ▼
[Browser]
  Calls: DELETE /api/writing/projects/:project_id
         │
         ▼
[core/writing.py — WritingService.delete_project()]
  1. Guards: system project → 403
  2. db.note_projects.delete_one({ user_id, project_id })
  3. db.notes.delete_many({ user_id, project_id })  ← cascade delete ALL notes
  Returns: { success: true } (HTTP 200)
  ⚠️ Hard delete — notes are NOT archived first. No undo.

── ARCHIVE ────────────────────────────────────────
User archives/unarchives a project
         │
         ▼
[Browser]
  Calls: PUT /api/writing/projects/:project_id/archive
  Body: { archived: true | false }
         │
         ▼
[core/writing.py — WritingService.archive_project()]
  1. Guards: system project → 403
  2. db.note_projects.update_one({ user_id, project_id }, { $set: { archived } })
  Archived project disappears from structure (query filters archived: false)

── REORDER ────────────────────────────────────────
User drags projects in sidebar
         │
         ▼
[Browser]
  Calls: PUT /api/writing/projects/order
  Body: { project_ids: ["uuid1", "uuid2", ...] }
         │
         ▼
[core/writing.py — WritingService.update_projects_order()]
  For each pid at index idx:
    Skips system project (never moves it)
    db.note_projects.update_one({ user_id, project_id: pid }, { $set: { order: idx } })
```

---

### 4c. Create and Save Note

```
User clicks "New Note" in a project
         │
         ▼
[Browser]
  Calls: POST /api/notes
  Body: { title, project_id, content: "", status: "draft" }
         │
         ▼
[core/writing.py — WritingService.create_note()]
  1. Validates project_id exists and belongs to user
  2. Generates filename: title + ".txt"
  3. Checks for duplicate filename in same project
     → if conflict: appends " (2)", " (3)"... until unique
  4. Calls build_document("note", data, db, user_id)
     → auto-generates: note_id, created_at, last_updated, order
  5. db.notes.insert_one(document)
         │
         ▼
User types in the editor → auto-save triggers
         │
         ▼
[Browser — debounced ~1s after last keystroke]
  Calls: PUT /api/notes/:note_id
  Body: { content: "..." }
         │
         ▼
[core/writing.py — WritingService.update_note()]
  Sets: update_data = { content: "...", last_updated: datetime.now() }

  Additional optional fields on the same PUT:
    title    → also updates filename (title + ".txt")
               ⚠️ No duplicate check on rename — can create filename collision
    status   → validated: must be "draft" | "complete" | "in_review"
    tags     → must be a list
    description → stripped string

  db.notes.update_one({ note_id, user_id }, { $set: update_data })
         │
         ▼
[Browser]
  Shows "Saved" indicator
```

---

## 5. 🤖 AI Agent

### Logical Purpose
The AI receives a conversation, builds a full system prompt, calls an external LLM,
parses any action tags from the response, executes them against MongoDB,
and returns a clean reply + a list of what was done.

---

### 5a. Full Chat Request Flow

```
User types a message → clicks Send
         │
         ▼
[Browser — ai_agent.js]
  Appends message to local messages[]
  Calls: POST /api/ai/chat
  Body: { mode: "planning", messages: [...] }
  Header: Authorization: Bearer <token>
         │
         ▼
[routes/ai.py — chat()]
  1. Validates: messages not empty
  2. Validates: last message role == "user"
  3. Calls: ai_agent_service.chat(db, user_id, mode, messages)
         │
         ▼
[core/ai_agent.py — AIAgentService.chat()]

  ① Validate Mode
    load_yaml("ai_modes.yaml") → get valid mode IDs
    If mode not valid → use default_mode from app_config.yaml

  ② Build Prompt  [_build_prompt()]
    load_yaml("ai_modes.yaml") → find mode definition
    load_prompt("base_context.txt") → inject UTC timestamp
    If mode has actions_enabled:
      load_prompt("action_instructions.txt") → append action docs
    load_prompt("<mode>.txt") → e.g. planning.txt
    Format: mode_template.format(base=base, actions=actions_block)
    Assemble final string:
      === SYSTEM INSTRUCTIONS ===
      <system>
      === CONVERSATION HISTORY ===
      User: ...
      Assistant: ...
      === CURRENT USER MESSAGE ===
      User: <latest message>
      Assistant:

  ③ Call AI Provider  [_call_ai_provider()]
    Build ordered provider list:
      [configured_provider, ...others..., ollama_last]
    For each provider:
      Check availability (API key env var present?)
      importlib.import_module("api.<provider>")
      mod.call(prompt) → returns raw text string
      If result is non-empty → return it
      If exception → log + try next provider
    If all fail → raise RuntimeError

  ④ Parse Actions  [_parse_actions()]
    Regex scan: r"\[ACTION:([A-Z_]+)\](.*?)\[/ACTION\]"
    For each match:
      Extract action_type and json_str
      _parse_json_safe() → json.loads() with trailing-comma fix
      registry.get_action(action_type) → verify it exists
      If valid → append { type, args } to parsed list
    Strip all [ACTION:...][/ACTION] tags from raw text
    Collapse excess blank lines → clean_text

  ⑤ Execute Actions  [_execute_actions()]
    For each parsed action:
      executor = registry.get_action(action_type)
         │
         ▼
      [core/actions.py — e.g. create_task()]
        _resolve_project_id() → name -> UUID if needed
        TaskService.create_task(db, user_id, args)
        Returns: { type: "task_created", id, title, success: true }

      On ValueError → { success: false, error: message }
      On Exception  → { success: false, error: "Internal error" }

  ⑥ Return
    {
      "reply":         clean_text,
      "actions_taken": [{ type, id, title, success }, ...]
    }
         │
         ▼
[routes/ai.py]
  Returns HTTP 200: { reply, actions_taken }
         │
         ▼
[Browser — ai_agent.js]
  Appends assistant reply to chat UI
  For each action in actions_taken where success == true:
    Shows inline notification chip: "✅ Task created: Buy groceries"
  Triggers a background refresh of tasks/projects list
```

---

### 5b. AI Provider Waterfall Detail

```
AI_PROVIDER=gemini  (from .env)

Order built:
  1. gemini  ← configured provider, try first
  2. grok    ← has GROK_API_KEY? try second
  3. ollama  ← always available locally, last resort

For each:
  check_fn() → bool (key present?)
  importlib.import_module("api.gemini")
  mod.call(prompt)
    [api/gemini.py]
      Calls Google Generative AI SDK
      Returns: raw response text string

  If response is non-empty → ✅ return it
  If any exception → log "[AI] Provider 'gemini' failed: ..."
                     → try next in list

If all 3 fail → RuntimeError → routes/ai.py returns HTTP 503
```

---

## 6. 📋 Templates

### Logical Purpose
Pre-built project/note structures defined entirely in `configs/templates.yaml`.
Importing a template creates real DB documents (project + tasks, or note)
in the user's account, with date placeholders resolved at import time.

---

### 6a. Browse Templates Flow

```
User opens Templates page
         │
         ▼
[Browser — templates.js]
  Calls: GET /api/templates  (or ?category=tasks)
         │
         ▼
[routes/templates.py — get_templates()]
  category = request.args.get("category", "all")
  Calls: TemplateService.get_templates(category)
         │
         ▼
[core/templates.py — TemplateService.get_templates()]
  load_yaml("templates.yaml") → config_loader reads and caches the file
  Returns list of template defs filtered by category
  (no DB involved — purely config-driven)
         │
         ▼
[Browser]
  Renders template cards with name, description, category badges
  User can filter by: All / Tasks / Writing
```

---

### 6b. Import Template Flow

```
User clicks "Import" on a template card
         │
         ▼
[Browser]
  Calls: POST /api/templates/import
  Body: { template_id: "weekly_plan" }
         │
         ▼
[routes/templates.py — import_template()]
  Validates template_id not empty
  Calls: TemplateService.import_template(db, user_id, template_id)
         │
         ▼
[core/templates.py — TemplateService.import_template()]
  1. Loads templates from templates.yaml
  2. Finds template by id
  3. _format_template_strings(data):
       Replaces {date_formatted} → "April 26, 2026"
       Replaces {date_long}      → "Sunday, April 26, 2026"
  4. Reads data.type:
         │
     ┌───┴─────────────────────┐
     │                         │
  "project_with_tasks"    "writing_note"
     │                         │
     ▼                         ▼

  [_import_project_with_tasks()]    [_import_writing_note()]
  1. build_document("project")      1. Find or create note project
  2. db.projects.insert_one         2. build_document("note")
  3. For each task in template:     3. db.notes.insert_one
     build_document("task")         Returns: { destination:"writing",
     link to new project_id            project_id, note, message }
     db.tasks.insert_one
  Returns: { destination:"tasks",
     project, tasks[], message }
         │
         ▼
[routes/templates.py]
  Returns HTTP 201: { destination, project/note, message }
         │
         ▼
[Browser — templates.js]
  Shows success toast: "Project 'Weekly Plan' with 5 tasks created!"
  Navigates user to Tasks or Writing page based on destination
```

---

## 7. 🗄️ Archive

### Logical Purpose
Items are never deleted when archived — they are flagged with `isArchived: true` (tasks/projects)
or `archived: true` (notes). The archive page fetches all flagged items across all collections
in a single call, grouped by type.

---

### Flow

```
User archives a task (clicks archive icon)
         │
         ▼
[Browser — tasks module]
  Calls: PUT /api/tasks/:task_id
  Body: { isArchived: true }
         │
         ▼
[core/task.py — TaskService.update_task()]
  db.tasks.update_one(
    { task_id, user_id },
    { $set: { isArchived: true } }
  )
  Task disappears from main task list (query filters isArchived: {$ne: true})
         │
─────────────────────────────────────
User opens Archive page
         │
         ▼
[Browser — archive_page.js]
  Calls: GET /api/archive
         │
         ▼
[routes/archive.py — get_all_archived()]
  Calls: ArchiveService.get_all_archived(db, user_id)
         │
         ▼
[core/archive.py — ArchiveService.get_all_archived()]
  Runs 4 parallel MongoDB queries:
    db.tasks.find({ user_id, isArchived: true })
    db.notes.find({ user_id, archived: true })
    db.note_projects.find({ user_id, archived: true })
    db.projects.find({ user_id, isArchived: true })
  Serializes all datetime fields via serialize_doc()
  Returns: { tasks[], notes[], note_projects[], task_projects[] }
         │
         ▼
[Browser — archive_page.js]
  Renders 4 grouped sections
  Each item has a "Restore" button

User clicks "Restore" on an archived task
         │
         ▼
[Browser]
  Calls: PUT /api/tasks/:task_id
  Body: { isArchived: false }
  Task reappears in main task list
```

---

## 8. ⚙️ Settings

### Logical Purpose
User preferences are stored in `db.user_settings` (one document per user).
Allowed keys are defined in `configs/app_config.yaml → settings_defaults`.
Unknown keys are silently rejected — no schema migration needed.

---

### Flow

```
User opens Settings panel
         │
         ▼
[Browser — settings.js]
  Calls: GET /api/settings
         │
         ▼
[core/settings.py — SettingsService.get_settings()]
  defaults = load_yaml("app_config.yaml")["settings_defaults"]
  doc = db.user_settings.find_one({ user_id })
  If no doc → return defaults
  If doc     → return { ...defaults, ...doc }
  (user's saved values override defaults, new defaults auto-appear)
         │
         ▼
[Browser]
  Populates all setting controls with current values
  Applies theme/color to the UI immediately

User changes a setting (e.g. theme → "light") → clicks Save
         │
         ▼
[Browser]
  Calls: PUT /api/settings
  Body: { theme: "light" }
         │
         ▼
[core/settings.py — SettingsService.update_settings()]
  1. Loads allowed keys from app_config.yaml settings_defaults
  2. Filters payload: only keeps known keys
  3. db.user_settings.update_one(
       { user_id },
       { $set: { theme: "light" } },
       upsert=True           ← creates doc on first save
     )
         │
         ▼
[Browser]
  Applies new theme class to <body>
  Shows "Saved" confirmation
  Setting persists across sessions (loaded from DB on next login)
```

---

## Appendix: Shared Infrastructure Flows

### JWT Token Lifecycle

```
Login → token issued (7-day expiry, signed with JWT_SECRET_KEY)
     → stored in localStorage["lifeos_token"]
     → attached to every request: Authorization: Bearer <token>
     → @jwt_required() verifies on every protected route
     → get_jwt_identity() returns user_id
     → get_jwt() returns extra claims { username, email }
Token expires → 401 Unprocessable Entity → frontend redirects to login
```

### Config Caching (config_loader.py)

```
First call to load_yaml("schemas.yaml")
  → reads file from disk
  → parses YAML
  → stores in _yaml_cache["schemas.yaml"]
  → returns parsed dict

Subsequent calls
  → returns from cache (no disk I/O)

reload_all() clears both _yaml_cache and _prompt_cache
(useful during development hot-reload)
```

### Schema Factory Auto-Build

```
build_document("task", { title: "Buy milk" }, db, user_id)
         │
         ▼
Reads schemas.yaml → task.fields
For each field definition:
  uuid + auto       → task_id = str(uuid4())
  datetime + auto   → created_at = datetime.now()
  auto_increment    → db.tasks.count_documents({user_id}) → order = N
  computed          → is_recurring = (recurrence != "none")
  enum              → validate value in [pending, completed, missed]
  has default       → apply default from YAML
  required missing  → raise ValueError
Returns: complete document ready for db.tasks.insert_one()
```
