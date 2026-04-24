"""
api/ollama.py — Ollama Local LLM External API Connector
=========================================================
Handles ALL HTTP communication with a local Ollama instance.
No Flask, no MongoDB — pure external service integration.

Used by: core/ai_agent.py  (via AIAgentService._call_ollama)

To activate:
  1. Install Ollama: https://ollama.com
  2. Run: ollama serve
  3. Pull a model: ollama pull llama3
  4. Set in My_App/.env:
       AI_PROVIDER=ollama
       OLLAMA_MODEL=llama3

Env vars:
  OLLAMA_BASE_URL=http://localhost:11434   optional
  OLLAMA_MODEL=llama3                      optional
  AI_REQUEST_TIMEOUT=30                    optional, seconds
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

# ── Config (read once at import time) ─────────────────────────────────────
_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
_MODEL    = os.getenv("OLLAMA_MODEL", "llama3")
_TIMEOUT  = int(os.getenv("AI_REQUEST_TIMEOUT", "30"))


def call(prompt: str) -> str:
    """
    Send a prompt to a local Ollama model and return the raw text response.

    Parameters
    ----------
    prompt : str
        Fully assembled prompt string (system + history + user message).

    Returns
    -------
    str
        Raw text from the model.

    Raises
    ------
    RuntimeError
        If Ollama is unreachable or returns an empty response.
    requests.exceptions.*
        For timeout / HTTP errors — caller handles these.
    """
    model = os.getenv("OLLAMA_MODEL", _MODEL)
    url   = f"{_BASE_URL}/api/generate"

    payload = {
        "model":  model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 2048,
        },
    }

    try:
        resp = requests.post(url, json=payload, timeout=_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        raise RuntimeError(
            f"Ollama timed out after {_TIMEOUT}s. "
            "Try a smaller model or increase AI_REQUEST_TIMEOUT."
        )
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {_BASE_URL}. "
            "Make sure Ollama is running: `ollama serve`"
        )
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Ollama network error: {exc}") from exc

    text = resp.json().get("response", "").strip()
    if not text:
        raise RuntimeError(
            f"Ollama returned an empty response from model '{model}'. "
            "Make sure the model is pulled: `ollama pull " + model + "`"
        )
    return text


def list_models() -> list:
    """
    Return a list of locally available Ollama models.
    Returns empty list if Ollama is not running.
    """
    try:
        resp = requests.get(f"{_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        return [m["name"] for m in resp.json().get("models", [])]
    except Exception:  # pylint: disable=broad-except
        return []
