import json
import os
from datetime import datetime
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import PyMongoError


def load_local_env():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def to_jsonable(value):
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def run_backup():
    load_local_env()
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "LifeOS_Database")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        raise RuntimeError(
            "Cannot connect to MongoDB. Ensure local MongoDB service is running."
        ) from exc

    db = client[db_name]
    backup_data = {
        "db_name": db_name,
        "mongo_uri": mongo_uri,
        "created_at": datetime.now().isoformat(),
        "collections": {},
    }

    for collection_name in db.list_collection_names():
        docs = list(db[collection_name].find({}))
        backup_data["collections"][collection_name] = [to_jsonable(doc) for doc in docs]

    backups_dir = Path(__file__).resolve().parent / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out_path = backups_dir / filename
    out_path.write_text(
        json.dumps(backup_data, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    print(f"Backup saved: {out_path}")


if __name__ == "__main__":
    run_backup()
