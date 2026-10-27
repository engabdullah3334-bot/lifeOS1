"""
core/ai_agent.py — LifeOS AI Agent (Pure Business Logic)
=========================================================

This file is the "brain" only — it knows nothing about:
  x HTTP / requests / networking
  x Flask / routes / JWT
  x Any external service by name (Gemini, Ollama...)

Sole responsibilities:
  ✓ Build the system prompt per mode (from external files)
  ✓ Delegate the prompt to api/ and receive raw text
  ✓ Parse [ACTION] tags from the response
  ✓ Execute database operations via the Action Registry

Flow:
  chat()
    ├── _build_prompt()      <- reads from prompts/ and configs/ai_modes.yaml
    ├── _call_ai_provider()  <- delegates to api/gemini.py, api/grok.py, api/ollama.py
    ├── _parse_actions()     <- extracts [ACTION:TYPE]{...}[/ACTION]
    └── _execute_actions()   <- uses core/registry.py + core/actions.py
"""

import os
import re
import json
import logging
from datetime import datetime, timezone

from core.config_loader import load_yaml, load_prompt
from core import registry  # noqa: F401
from core import actions   # noqa: F401 — activates action registration in the registry

logger = logging.getLogger(__name__)

# Routing decision only (not a provider config itself)
_AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower().strip()


# ══════════════════════════════════════════════════════════════════════════════
#  ACTION TAG PATTERN
# ══════════════════════════════════════════════════════════════════════════════

_ACTION_PATTERN = re.compile(
    r"\[ACTION:([A-Z_]+)\](.*?)\[/ACTION\]",
    re.DOTALL,
)


# ══════════════════════════════════════════════════════════════════════════════
#  SERVICE CLASS
# ══════════════════════════════════════════════════════════════════════════════

class AIAgentService:
    """
    Pure business logic — knows nothing about HTTP or Flask.
    All communication with external services goes through api/.
    Prompts are loaded from external files.
    Actions are executed via the Registry.
    """

    # ── Provider dispatcher ───────────────────────────────────────────────────

    def _call_ai_provider(self, prompt: str) -> str:
        """
        Smart provider waterfall:
          1. Try the configured AI_PROVIDER first.
          2. If it fails, try other cloud providers that have an API key.
          3. Last resort: Ollama (local, no key needed).

        This means the AI never hard-fails as long as at least one
        provider is reachable.
        """
        import os

        # Build the ordered list: configured provider first, then fallbacks
        def _gemini_available(): return bool(os.getenv("GEMINI_API_KEY", "").strip())
        def _grok_available():   return bool(os.getenv("GROK_API_KEY",   "").strip())
        def _ollama_available(): return True  # local — always try last

        _providers = {
            "gemini": (_gemini_available, "api.gemini"),
            "grok":   (_grok_available,   "api.grok"),
            "ollama": (_ollama_available,  "api.ollama"),
        }

        # Ordered: configured provider -> all others -> ollama last
        order = [_AI_PROVIDER] + [p for p in ("gemini", "grok", "ollama") if p != _AI_PROVIDER]

        last_error = None
        for provider_name in order:
            check_fn, module_path = _providers.get(provider_name, (None, None))
            if check_fn is None or not check_fn():
                continue  # skip — no key or unknown provider
            try:
                import importlib
                mod    = importlib.import_module(module_path)
                result = mod.call(prompt)
                if result and result.strip():
                    if provider_name != _AI_PROVIDER:
                        # Log the fallback so it shows in server output
                        print(f"[AI] Fell back to '{provider_name}' ('{_AI_PROVIDER}' unavailable)")
                    return result
            except Exception as e:
                last_error = e
                print(f"[AI] Provider '{provider_name}' failed: {e}")
                continue

        raise RuntimeError(
            f"All AI providers failed. Last error: {last_error}. "
            "Check your API keys and that Ollama is running."
        )


    # ── Prompt builder ────────────────────────────────────────────────────────

    def _build_prompt(self, mode: str, messages: list) -> str:
        """
        Assembles: system instructions + conversation history + latest message
        into a single string accepted by any model.

        Reads prompts from external files in prompts/
        and mode settings from configs/ai_modes.yaml.
        """
        # 1 — Load mode configuration
        modes_config = load_yaml("ai_modes.yaml")
        modes_list   = modes_config.get("modes", [])
        mode_def     = next((m for m in modes_list if m["id"] == mode), None)

        if not mode_def:
            # Fall back to first mode (planning)
            mode_def = modes_list[0] if modes_list else {"prompt_file": "planning.txt", "actions_enabled": True}

        # 2 — Build component parts
        utc_now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        base    = load_prompt("base_context.txt").format(utc_now=utc_now)

        actions_block = ""
        if mode_def.get("actions_enabled", False):
            actions_block = load_prompt("action_instructions.txt")

        # 3 — Load the mode-specific prompt template
        prompt_file   = mode_def.get("prompt_file", "planning.txt")
        mode_template = load_prompt(prompt_file)

        try:
            system = mode_template.format(base=base, actions=actions_block)
        except KeyError:
            # Some modes (e.g. coaching) don't have an {actions} placeholder
            system = mode_template.format(base=base)

        # 4 — Assemble conversation history
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
        Extract [ACTION:TYPE]{...}[/ACTION] tags from the AI response.
        Returns: (clean_text, [{"type": str, "args": dict}, ...])
        """
        parsed = []

        for match in _ACTION_PATTERN.finditer(raw_text):
            action_type = match.group(1).upper().strip()
            json_str    = match.group(2).strip()

            args = self._parse_json_safe(action_type, json_str)
            if args is None:
                continue

            # Validate against the registry instead of a hardcoded list
            if registry.get_action(action_type):
                parsed.append({"type": action_type, "args": args})
            else:
                logger.warning("Unknown action type from AI: %s", action_type)

        clean = _ACTION_PATTERN.sub("", raw_text).strip()
        clean = re.sub(r"\n{3,}", "\n\n", clean)
        return clean, parsed

    @staticmethod
    def _parse_json_safe(action_type: str, json_str: str) -> dict | None:
        """Parse action JSON, attempting to auto-fix common formatting errors."""
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        try:
            # Remove trailing commas before } or ]
            cleaned = re.sub(r",\s*([}\]])", r"\1", json_str)
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error("Cannot parse action JSON for %s: %r", action_type, json_str)
            return None

    # ── Action executor ───────────────────────────────────────────────────────

    def _execute_actions(self, db, user_id: str, parsed_actions: list) -> list:
        """
        Execute all parsed actions against MongoDB via the Action Registry.

        - Each action runs independently: one failure does not stop the rest.
        - Results include both successful and failed actions for frontend display.
        """
        results = []
        for action in parsed_actions:
            action_type = action["type"]
            executor    = registry.get_action(action_type)

            if not executor:
                logger.warning("No executor registered for action: %s", action_type)
                results.append({
                    "type":    action_type,
                    "success": False,
                    "error":   f"Unknown action '{action_type}'",
                })
                continue

            try:
                result = executor(db, user_id, action["args"])
                results.append({**result, "success": True})
            except ValueError as exc:
                # Intentional validation errors (missing field, not found, etc.)
                logger.warning("Action %s validation error: %s", action_type, exc)
                results.append({
                    "type":    action_type,
                    "success": False,
                    "error":   str(exc),
                })
            except Exception as exc:  # pylint: disable=broad-except
                # Unexpected runtime errors
                logger.exception("Action %s unexpected error: %s", action_type, exc)
                results.append({
                    "type":    action_type,
                    "success": False,
                    "error":   "Internal error while executing action.",
                })
        return results

    # ── Public entry point ────────────────────────────────────────────────────

    def chat(self, db, user_id: str, mode: str, messages: list) -> dict:
        """
        The single public method called by routes/ai.py.

        Parameters:
          db       — MongoDB database instance
          user_id  — authenticated user ID (from JWT)
          mode     — planning | tasks | coaching | productivity
          messages — [{"role": "user"|"assistant", "content": "..."}]

        Returns:
          {"reply": str, "actions_taken": list}
        """
        # Validate mode against config
        modes_config = load_yaml("ai_modes.yaml")
        valid_ids    = [m["id"] for m in modes_config.get("modes", [])]
        default_mode = load_yaml("app_config.yaml").get("ai", {}).get("default_mode", "planning")
        mode         = mode if mode in valid_ids else default_mode

        if not messages:
            return {"reply": "Please send a message.", "actions_taken": []}

        # 1 — Build the prompt
        try:
            prompt = self._build_prompt(mode, messages)
        except Exception as exc:
            logger.exception("Prompt build failed: %s", exc)
            return {"reply": "Failed to prepare your message. Please try again.", "actions_taken": []}

        # 2 — Call the AI provider (errors from api/ arrive as RuntimeError only)
        try:
            raw_text = self._call_ai_provider(prompt)
        except RuntimeError as exc:
            return {"reply": str(exc), "actions_taken": []}
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Unexpected provider error: %s", exc)
            return {"reply": "An unexpected error occurred. Please try again.", "actions_taken": []}

        # 3 — Extract action tags
        clean_text, parsed_actions = self._parse_actions(raw_text)

        # 4 — Execute actions against MongoDB
        actions_taken = self._execute_actions(db, user_id, parsed_actions)

        return {
            "reply":         clean_text or "Done! Let me know if you need anything else.",
            "actions_taken": actions_taken,
        }

    @staticmethod
    def get_modes() -> list:
        """Return mode metadata for the frontend — loaded from ai_modes.yaml."""
        modes_config = load_yaml("ai_modes.yaml")
        return [
            {
                "id":          m["id"],
                "label":       m["label"],
                "icon":        m["icon"],
                "description": m["description"],
                "placeholder": m["placeholder"],
            }
            for m in modes_config.get("modes", [])
        ]


# Singleton — imported by routes/ai.py
ai_agent_service = AIAgentService()
