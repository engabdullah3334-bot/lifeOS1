"""
core/config_loader.py — Central Configuration & Prompt Loader
==============================================================
Loads and caches YAML config files and TXT prompt files.

Usage:
    from core.config_loader import load_yaml, load_prompt, reload_all

    schemas = load_yaml("schemas.yaml")
    prompt  = load_prompt("planning.txt")
"""

import os
import yaml
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIGS_DIR  = os.path.join(_PROJECT_ROOT, "configs")
_PROMPTS_DIR  = os.path.join(_PROJECT_ROOT, "prompts")

# ── Caches ────────────────────────────────────────────────────────────────────
_yaml_cache: Dict[str, dict] = {}
_prompt_cache: Dict[str, str] = {}


def load_yaml(filename: str) -> dict:
    """
    Load and cache a YAML file from the configs/ directory.

    Parameters
    ----------
    filename : str
        Name of the YAML file (e.g. "schemas.yaml", "app_config.yaml").

    Returns
    -------
    dict
        Parsed YAML content.

    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    """
    if filename in _yaml_cache:
        return _yaml_cache[filename]

    filepath = os.path.join(_CONFIGS_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Config file not found: {filepath}. "
            f"Make sure it exists in the configs/ directory."
        )

    with open(filepath, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    _yaml_cache[filename] = data
    logger.debug("Loaded config: %s", filename)
    return data


def load_prompt(filename: str) -> str:
    """
    Load and cache a prompt text file from the prompts/ directory.

    Parameters
    ----------
    filename : str
        Name of the prompt file (e.g. "planning.txt", "base_context.txt").

    Returns
    -------
    str
        Raw text content of the prompt file.

    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    """
    if filename in _prompt_cache:
        return _prompt_cache[filename]

    filepath = os.path.join(_PROMPTS_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Prompt file not found: {filepath}. "
            f"Make sure it exists in the prompts/ directory."
        )

    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    _prompt_cache[filename] = text
    logger.debug("Loaded prompt: %s", filename)
    return text


def reload_all():
    """Clear all caches — useful for development hot-reload."""
    _yaml_cache.clear()
    _prompt_cache.clear()
    logger.info("All config and prompt caches cleared.")
