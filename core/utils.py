"""
core/utils.py — Shared Utility Functions
=========================================
Helper functions reused across multiple core modules.
Keep this file small and focused — only truly shared logic goes here.
"""

from datetime import datetime
from typing import Optional


def serialize_datetime(value) -> Optional[str]:
    """
    Convert a datetime object to ISO 8601 string.
    Returns the original value if it is not a datetime instance.

    Used by: core/archive.py, core/writing.py
    """
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def serialize_doc(doc: dict, date_fields: list = None) -> dict:
    """
    Serialize a MongoDB document dict, converting datetime fields to strings.

    Parameters
    ----------
    doc : dict
        The document to serialize.
    date_fields : list, optional
        Specific field names to serialize. If None, serializes all datetime values.

    Returns
    -------
    dict
        New dict with datetime values converted to ISO strings.
    """
    if date_fields:
        result = dict(doc)
        for field in date_fields:
            if field in result:
                result[field] = serialize_datetime(result[field])
        return result

    return {k: serialize_datetime(v) for k, v in doc.items()}
