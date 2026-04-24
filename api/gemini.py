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

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-flash-latest:generateContent?key={api_key}"
    )

    headers = {"Content-Type": "application/json"}

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 1,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        },
    }

    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=20)

            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

            if resp.status_code == 503:
                logger.warning(
                    "Gemini server overloaded, attempt %d/%d...",
                    attempt + 1, retries,
                )
                time.sleep(delay)
                continue

            # Other error codes
            logger.error("Gemini API Error %d: %s", resp.status_code, resp.text)
            raise RuntimeError(
                f"Gemini API Error {resp.status_code}: {resp.text}"
            )

        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                logger.warning("Gemini timeout, retrying...")
                time.sleep(delay)
                continue
            raise RuntimeError("Gemini API timed out after all retries.")

        except requests.exceptions.ConnectionError as exc:
            raise RuntimeError(f"Cannot connect to Gemini API: {exc}") from exc

        except RuntimeError:
            raise

        except Exception as exc:
            if attempt < retries - 1:
                time.sleep(delay)
                continue
            raise RuntimeError(f"Failed to contact Gemini: {exc}") from exc

    return "السيرفر مازال مضغوطاً، جرب مرة أخرى."