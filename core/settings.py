"""
core/settings.py — User Settings Business Logic
=================================================
Default values are loaded from configs/app_config.yaml.
No hardcoded defaults in Python.
"""

from core.config_loader import load_yaml


def _get_defaults() -> dict:
    """Load settings defaults from app_config.yaml (cached)."""
    config = load_yaml("app_config.yaml")
    return config.get("settings_defaults", {})


class SettingsService:

    @staticmethod
    def get_settings(db, user_id):
        defaults = _get_defaults()
        coll = db.user_settings
        doc = coll.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
        if not doc:
            return dict(defaults)
        return {**defaults, **doc}

    @staticmethod
    def update_settings(db, user_id, data):
        defaults = _get_defaults()
        coll = db.user_settings
        allowed = set(defaults.keys())
        payload = {k: v for k, v in data.items() if k in allowed}

        if not payload:
            return False, "No valid settings provided"

        coll.update_one(
            {"user_id": user_id},
            {"$set": payload},
            upsert=True,
        )
        return True, None
