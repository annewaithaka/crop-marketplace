from __future__ import annotations

import os
import sqlite3
from pathlib import Path


def _resolve_db_path() -> Path:
    db_url = os.getenv("DATABASE_URL", "sqlite:///instance/app.db")
    if db_url.startswith("sqlite:////"):
        return Path(db_url.replace("sqlite:////", "/"))
    if db_url.startswith("sqlite:///"):
        return Path(db_url.replace("sqlite:///", ""))
    raise SystemExit(f"Unsupported DATABASE_URL for this script: {db_url}")


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (name,))
    return cur.fetchone() is not None


def main() -> None:
    db_path = _resolve_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys=ON;")

        if not _table_exists(conn, "crop_images"):
            conn.execute(
                """
                CREATE TABLE crop_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    crop_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
                );
                """
            )
            conn.execute("CREATE INDEX idx_crop_images_crop_id ON crop_images(crop_id);")

        conn.commit()
        print("OK: crop_images table ensured.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()