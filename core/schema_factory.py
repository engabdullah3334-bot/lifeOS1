"""
core/schema_factory.py — Dynamic Document Builder
====================================================
Reads entity schemas from configs/schemas.yaml and builds
MongoDB-ready documents dynamically.

Usage:
    from core.schema_factory import build_document, get_schema, get_updatable_fields

    # Build a new task document
    task = build_document("task", {"title": "My Task"}, db=db, user_id="u123")

    # Get allowed update fields for a project
    fields = get_updatable_fields("project")
"""

from uuid import uuid4
from datetime import datetime
from core.config_loader import load_yaml


def _get_schemas() -> dict:
    """Load schemas from YAML (cached by config_loader)."""
    return load_yaml("schemas.yaml")


def get_schema(entity_name: str) -> dict:
    """
    Get the full schema definition for an entity.

    Parameters
    ----------
    entity_name : str
        Entity name as defined in schemas.yaml (e.g. "task", "project", "note").

    Returns
    -------
    dict
        Schema definition including collection name, id_field, and fields.

    Raises
    ------
    KeyError
        If the entity is not defined in schemas.yaml.
    """
    schemas = _get_schemas()
    if entity_name not in schemas:
        raise KeyError(
            f"Unknown entity '{entity_name}'. "
            f"Available: {list(schemas.keys())}"
        )
    return schemas[entity_name]


def get_collection_name(entity_name: str) -> str:
    """Get the MongoDB collection name for an entity."""
    return get_schema(entity_name)["collection"]


def get_updatable_fields(entity_name: str) -> set:
    """
    Get the set of field names that can be updated (non-auto, non-computed fields).
    Excludes: uuid (auto), auto_increment, computed, user_id.
    """
    schema = get_schema(entity_name)
    updatable = set()
    for field_name, field_def in schema["fields"].items():
        ftype = field_def.get("type", "string")
        if ftype in ("uuid", "auto_increment", "computed"):
            continue
        if field_def.get("auto"):
            continue
        if field_name == "user_id":
            continue
        updatable.add(field_name)
    return updatable


def get_field_defaults(entity_name: str) -> dict:
    """Get a dict of {field_name: default_value} for all fields with defaults."""
    schema = get_schema(entity_name)
    defaults = {}
    for field_name, field_def in schema["fields"].items():
        if "default" in field_def:
            val = field_def["default"]
            # Deep copy lists to avoid shared references
            if isinstance(val, list):
                defaults[field_name] = list(val)
            else:
                defaults[field_name] = val
    return defaults


def build_document(entity_name: str, data: dict, db=None, user_id: str = None) -> dict:
    """
    Build a complete MongoDB document from partial input data.

    This function:
    - Reads the schema definition from schemas.yaml
    - Auto-generates UUIDs for 'uuid' type fields
    - Auto-generates timestamps for 'datetime' type fields
    - Applies defaults for missing fields
    - Computes derived fields (e.g. is_recurring)
    - Calculates auto_increment order fields
    - Validates required fields

    Parameters
    ----------
    entity_name : str
        Entity type (e.g. "task", "project", "note", "note_project").
    data : dict
        Input data (partial — missing fields get defaults).
    db : optional
        MongoDB database instance (needed for auto_increment).
    user_id : str, optional
        User ID to inject if not in data.

    Returns
    -------
    dict
        Complete document ready for MongoDB insertion.

    Raises
    ------
    ValueError
        If a required field is missing.
    KeyError
        If the entity type is not defined in schemas.yaml.
    """
    schema = get_schema(entity_name)
    fields = schema["fields"]
    doc = {}

    # Inject user_id if provided and not in data
    if user_id and "user_id" in fields and "user_id" not in data:
        data = {**data, "user_id": user_id}

    for field_name, field_def in fields.items():
        ftype = field_def.get("type", "string")

        # 1. UUID auto-generation
        if ftype == "uuid" and field_def.get("auto"):
            doc[field_name] = data.get(field_name, str(uuid4()))
            continue

        # 2. Datetime auto-generation
        if ftype == "datetime" and field_def.get("auto"):
            doc[field_name] = data.get(field_name, datetime.now())
            continue

        # 3. Auto-increment (order field)
        if ftype == "auto_increment":
            if field_name in data:
                doc[field_name] = data[field_name]
            elif db is not None:
                scope = field_def.get("collection_scope", "user_id")
                collection = db[schema["collection"]]
                query = _build_scope_query(scope, data, user_id)
                doc[field_name] = collection.count_documents(query)
            else:
                doc[field_name] = 0
            continue

        # 4. Computed fields
        if ftype == "computed":
            rule = field_def.get("rule", "")
            doc[field_name] = _evaluate_rule(rule, data, doc)
            continue

        # 5. Regular fields — use data value or default
        if field_name in data:
            value = data[field_name]
            # Validate enum values
            if ftype == "enum":
                allowed = field_def.get("values", [])
                if value not in allowed:
                    value = field_def.get("default", allowed[0] if allowed else value)
            # Validate list type
            if ftype == "list" and not isinstance(value, list):
                value = field_def.get("default", [])
                if isinstance(value, list):
                    value = list(value)
            doc[field_name] = value
        elif "default" in field_def:
            default = field_def["default"]
            # Deep copy lists
            doc[field_name] = list(default) if isinstance(default, list) else default
        elif field_def.get("required"):
            raise ValueError(
                f"Required field '{field_name}' is missing for entity '{entity_name}'."
            )

    return doc


def _build_scope_query(scope, data: dict, user_id: str = None) -> dict:
    """Build a MongoDB query for auto_increment scope."""
    query = {}
    if isinstance(scope, str):
        scope = [scope]
    for field in scope:
        if field == "user_id" and user_id:
            query[field] = user_id
        elif field in data:
            query[field] = data[field]
    return query


def _evaluate_rule(rule: str, data: dict, doc: dict) -> bool:
    """
    Evaluate a simple computed field rule.
    Currently supports: "field != 'value'" pattern.
    """
    if not rule:
        return False

    # Parse "field != 'value'" or "field == 'value'"
    merged = {**data, **doc}

    if "!=" in rule:
        parts = rule.split("!=")
        field = parts[0].strip()
        value = parts[1].strip().strip("'\"")
        return merged.get(field) != value
    elif "==" in rule:
        parts = rule.split("==")
        field = parts[0].strip()
        value = parts[1].strip().strip("'\"")
        return merged.get(field) == value

    return False
