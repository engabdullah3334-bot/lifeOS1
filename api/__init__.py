# api/__init__.py
# ─────────────────────────────────────────────────────────────────────────────
# هذا المجلد مخصص للـ EXTERNAL API Connectors فقط:
#
#   api/gemini.py  ← Google Gemini REST API connector
#   api/ollama.py  ← Ollama local LLM connector
#   api/index.py   ← Vercel serverless handler
#
# الـ Flask Blueprints الداخلية (routes بين core والواجهة) موجودة في:
#   routes/auth.py / tasks.py / writing.py / settings.py / archive.py ...
# ─────────────────────────────────────────────────────────────────────────────
