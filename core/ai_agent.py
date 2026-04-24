"""
core/ai_agent.py — LifeOS AI Agent (Pure Business Logic)
=========================================================

هذا الملف هو "العقل" فقط — لا يعرف شيئاً عن:
  ✗ HTTP / requests / أي شبكة
  ✗ Flask / routes / JWT
  ✗ أي خدمة خارجية بالاسم (Gemini, Ollama...)

مسؤولياته الوحيدة:
  ✓ بناء الـ system prompt حسب الـ mode (من ملفات خارجية)
  ✓ تمرير الـ prompt لـ api/ والحصول على raw text
  ✓ تحليل الـ [ACTION] tags من الـ response
  ✓ تنفيذ العمليات على MongoDB عبر الـ Action Registry

التدفق:
  chat()
    ├── _build_prompt()      ← يقرأ من prompts/ و configs/ai_modes.yaml
    ├── _call_ai_provider()  ← تفويض لـ api/gemini.py أو api/ollama.py
    ├── _parse_actions()     ← تحليل [ACTION:TYPE]{...}[/ACTION]
    └── _execute_actions()   ← يستخدم core/registry.py
"""

import os
import re
import json
import logging
from datetime import datetime, timezone

from core.config_loader import load_yaml, load_prompt
from core import registry  # noqa: F401 — يضمن تسجيل الـ actions

logger = logging.getLogger(__name__)

# قرار التوجيه فقط (ليس config للـ provider نفسه)
_AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower().strip()


# ══════════════════════════════════════════════════════════════════════════════
#  ACTION TAG PATTERN
# ══════════════════════════════════════════════════════════════════════════════

_ACTION_PATTERN = re.compile(
    r"\[ACTION:([A-Z_]+)\](.*?)\[/ACTION\]",
    re.DOTALL,
)


# ══════════════════════════════════════════════════════════════════════════════
#  SERVICE CLASS — العقل
# ══════════════════════════════════════════════════════════════════════════════

class AIAgentService:
    """
    Pure business logic — لا يعرف أي شيء عن HTTP أو Flask.
    كل التواصل مع الخدمات الخارجية يمر عبر api/.
    الـ prompts تُقرأ من ملفات خارجية.
    الـ actions تُنفذ عبر الـ Registry.
    """

    # ── Provider dispatcher ───────────────────────────────────────────────────

    def _call_ai_provider(self, prompt: str) -> str:
        """
        يحدد الـ provider المطلوب ويفوّض له.
        كل HTTP logic موجود في api/ — هنا فقط قرار التوجيه.

        لإضافة provider جديد:
          1. أنشئ api/<provider>.py مع دالة call(prompt) -> str
          2. أضف elif هنا
        """
        if _AI_PROVIDER == "gemini":
            from api.gemini import call as _call
            return _call(prompt)

        elif _AI_PROVIDER == "ollama":
            from api.ollama import call as _call
            return _call(prompt)

        else:
            raise RuntimeError(
                f"Unknown AI_PROVIDER '{_AI_PROVIDER}'. "
                "Supported: gemini, ollama. Update AI_PROVIDER in .env"
            )

    # ── Prompt builder ────────────────────────────────────────────────────────

    def _build_prompt(self, mode: str, messages: list) -> str:
        """
        يجمع: system instructions + تاريخ المحادثة + آخر رسالة
        في نص واحد يقبله أي موديل.

        يقرأ الـ prompts من ملفات خارجية في prompts/
        ويقرأ إعدادات الـ modes من configs/ai_modes.yaml
        """
        # 1 — تحميل إعدادات الـ modes
        modes_config = load_yaml("ai_modes.yaml")
        modes_list = modes_config.get("modes", [])
        mode_def = next((m for m in modes_list if m["id"] == mode), None)

        if not mode_def:
            # fallback to first mode (planning)
            mode_def = modes_list[0] if modes_list else {"prompt_file": "planning.txt", "actions_enabled": True}

        # 2 — بناء الأجزاء
        utc_now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        base = load_prompt("base_context.txt").format(utc_now=utc_now)

        actions_block = ""
        if mode_def.get("actions_enabled", False):
            actions_block = load_prompt("action_instructions.txt")

        # 3 — تحميل الـ mode prompt
        prompt_file = mode_def.get("prompt_file", "planning.txt")
        mode_template = load_prompt(prompt_file)

        try:
            system = mode_template.format(base=base, actions=actions_block)
        except KeyError:
            # بعض الـ modes (مثل coaching) ليس فيها {actions}
            system = mode_template.format(base=base)

        # 4 — تجميع المحادثة
        history = []
        for msg in messages[:-1]:
            role    = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "").strip()
            if content:
                history.append(f"{role}: {content}")

        last = messages[-1].get("content", "").strip() if messages else ""

        parts = ["=== SYSTEM INSTRUCTIONS ===", system.strip(), ""]
        if history:
            parts += ["=== CONVERSATION HISTORY ===", "\n".join(history), ""]
        parts += ["=== CURRENT USER MESSAGE ===", f"User: {last}", "", "Assistant:"]

        return "\n".join(parts)

    # ── Action parser ─────────────────────────────────────────────────────────

    def _parse_actions(self, raw_text: str) -> tuple:
        """
        يستخرج [ACTION:TYPE]{...}[/ACTION] tags من نص الـ AI.
        يعيد: (clean_text, [{type, args}, ...])
        """
        parsed = []

        for match in _ACTION_PATTERN.finditer(raw_text):
            action_type = match.group(1).upper().strip()
            json_str    = match.group(2).strip()

            args = self._parse_json_safe(action_type, json_str)
            if args is None:
                continue

            # يتحقق من الـ Registry بدل القاموس الثابت
            if registry.get_action(action_type):
                parsed.append({"type": action_type, "args": args})
            else:
                logger.warning("Unknown action type from AI: %s", action_type)

        clean = _ACTION_PATTERN.sub("", raw_text).strip()
        clean = re.sub(r"\n{3,}", "\n\n", clean)
        return clean, parsed

    @staticmethod
    def _parse_json_safe(action_type: str, json_str: str) -> dict | None:
        """تحليل JSON مع محاولة إصلاح الأخطاء البسيطة."""
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        try:
            cleaned = re.sub(r",\s*([}\]])", r"\1", json_str)
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error("Cannot parse action JSON for %s: %r", action_type, json_str)
            return None

    # ── Action executor ───────────────────────────────────────────────────────

    def _execute_actions(self, db, user_id: str, parsed_actions: list) -> list:
        """
        ينفّذ العمليات المستخرجة على MongoDB عبر الـ Registry.
        الأخطاء الفردية لا توقف بقية العمليات.
        """
        results = []
        for action in parsed_actions:
            executor = registry.get_action(action["type"])
            if not executor:
                continue
            try:
                results.append(executor(db, user_id, action["args"]))
            except Exception as exc:  # pylint: disable=broad-except
                logger.exception("Action %s failed: %s", action["type"], exc)
        return results

    # ── Public entry point ────────────────────────────────────────────────────

    def chat(self, db, user_id: str, mode: str, messages: list) -> dict:
        """
        النقطة الوحيدة التي تستدعيها routes/ai.py.

        المعاملات:
          db       — MongoDB instance
          user_id  — هوية المستخدم (من JWT)
          mode     — planning | tasks | coaching | productivity
          messages — [{"role": "user"|"assistant", "content": "..."}]

        الإرجاع:
          {"reply": str, "actions_taken": list}
        """
        # Validate mode against config
        modes_config = load_yaml("ai_modes.yaml")
        valid_ids = [m["id"] for m in modes_config.get("modes", [])]
        default_mode = load_yaml("app_config.yaml").get("ai", {}).get("default_mode", "planning")
        mode = mode if mode in valid_ids else default_mode

        if not messages:
            return {"reply": "Please send a message.", "actions_taken": []}

        # 1 — بناء الـ prompt
        try:
            prompt = self._build_prompt(mode, messages)
        except Exception as exc:
            logger.exception("Prompt build failed: %s", exc)
            return {"reply": "Failed to prepare your message. Please try again.", "actions_taken": []}

        # 2 — الاتصال بالـ AI provider (عبر api/)
        # الأخطاء الواردة من api/ تصل كـ RuntimeError فقط
        try:
            raw_text = self._call_ai_provider(prompt)
        except RuntimeError as exc:
            return {"reply": str(exc), "actions_taken": []}
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Unexpected provider error: %s", exc)
            return {"reply": "An unexpected error occurred. Please try again.", "actions_taken": []}

        # 3 — استخراج الـ action tags
        clean_text, parsed_actions = self._parse_actions(raw_text)

        # 4 — تنفيذ العمليات على MongoDB
        actions_taken = self._execute_actions(db, user_id, parsed_actions)

        return {
            "reply":        clean_text or "Done! Let me know if you need anything else.",
            "actions_taken": actions_taken,
        }

    @staticmethod
    def get_modes() -> list:
        """بيانات الـ modes للواجهة الأمامية — تُقرأ من ai_modes.yaml."""
        modes_config = load_yaml("ai_modes.yaml")
        return [
            {
                "id": m["id"],
                "label": m["label"],
                "icon": m["icon"],
                "description": m["description"],
                "placeholder": m["placeholder"],
            }
            for m in modes_config.get("modes", [])
        ]


# Singleton — يُستورد في routes/ai.py
ai_agent_service = AIAgentService()
