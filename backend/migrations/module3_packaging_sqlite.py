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


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cur = conn.execute(f"PRAGMA table_info({table});")
    return any(row[1] == column for row in cur.fetchall())


def main() -> None:
    db_path = _resolve_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys=ON;")

        if not _column_exists(conn, "crops", "pack_size_kg"):
            conn.execute("ALTER TABLE crops ADD COLUMN pack_size_kg REAL;")

        if not _column_exists(conn, "crops", "min_order_qty"):
            conn.execute("ALTER TABLE crops ADD COLUMN min_order_qty REAL;")

        conn.commit()
        print("OK: packaging columns ensured.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()