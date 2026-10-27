"""
api/gemini.py — Google Gemini External API Connector
=====================================================
Handles ALL HTTP communication with Google Gemini API.
No Flask, no MongoDB — pure external service integration.

Used by: core/ai_agent.py  (via AIAgentService._call_ai_provider)

Env vars:
  GEMINI_API_KEY=your_key_here
"""

import os
import time
import logging
import requests

logger = logging.getLogger(__name__)


def call(prompt: str, retries: int = 3, delay: int = 2) -> str:
    """
    Send a prompt to Google Gemini API and return the raw text response.
    Includes retry logic for 503 (server overload) errors.

    Parameters
    ----------
    prompt : str
        Fully assembled prompt string.
    retries : int
        Number of retry attempts for transient errors.
    delay : int
        Seconds to wait between retries.

    Returns
    -------
    str
        Raw text from Gemini.

    Raises
    ------
    RuntimeError
        If the API key is missing, or all retries fail.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "Missing GEMINI_API_KEY. Set it in environment variables or in .env"
        )

    # Models waterfall: try primary model, then fast fallback models if 503/timeout
    primary_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    candidate_models = [primary_model]
    for fallback in ["gemini-3-flash-preview", "gemini-3.5-flash"]:
        if fallback not in candidate_models:
            candidate_models.append(fallback)

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        },
    }

    last_error_msg = ""
    for model_name in candidate_models:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={api_key}"
        )
        for attempt in range(retries):
            try:
                resp = requests.post(url, json=payload, headers=headers, timeout=25)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                    return "No content received from AI."

                if resp.status_code == 503:
                    logger.warning(
                        "Gemini model '%s' overloaded (503), attempt %d/%d...",
                        model_name, attempt + 1, retries,
                    )
                    last_error_msg = f"Model {model_name} is temporarily overloaded (503)."
                    time.sleep(delay)
                    continue

                # Other error codes
                logger.error("Gemini API Error %d (%s): %s", resp.status_code, model_name, resp.text)
                last_error_msg = f"Gemini API Error {resp.status_code}"
                # If model is deprecated or not found (404), break to try next model immediately
                if resp.status_code == 404:
                    break

            except requests.exceptions.Timeout:
                logger.warning("Gemini model '%s' timeout on attempt %d/%d", model_name, attempt + 1, retries)
                last_error_msg = f"Gemini timeout on {model_name}."
                if attempt < retries - 1:
                    time.sleep(delay)
                    continue

            except requests.exceptions.ConnectionError as exc:
                raise RuntimeError(f"Cannot connect to Gemini API: {exc}") from exc

            except Exception as exc:
                logger.exception("Gemini error: %s", exc)
                last_error_msg = str(exc)
                if attempt < retries - 1:
                    time.sleep(delay)
                    continue

    raise RuntimeError(last_error_msg or "السيرفر مازال مضغوطاً، يرجى المحاولة مرة أخرى بعد لحظات.")
