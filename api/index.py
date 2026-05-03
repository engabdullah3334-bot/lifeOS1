# api/index.py
# ─────────────────────────────────────────────────────────────────────────────
# Vercel Serverless Entry Point
# Vercel تبحث عن هذا الملف تلقائياً كـ handler رئيسي للتطبيق.
# كل ما نفعله هنا هو استيراد كائن app من server.py وتصديره.
# ─────────────────────────────────────────────────────────────────────────────
import sys
import os

# نضيف المجلد الرئيسي للمشروع إلى مسار Python حتى يتمكن من إيجاد server.py وبقية الوحدات
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app
