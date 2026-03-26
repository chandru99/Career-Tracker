import sqlite3
import os
from pathlib import Path

# Use /tmp on Render (ephemeral but survives within a deployment),
# or next to this file for local dev.
_default = Path(__file__).parent / "user_prefs.db"
DB_PATH = os.getenv("DB_PATH", str(_default))


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_prefs (
            google_id TEXT PRIMARY KEY,
            spreadsheet_id TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.commit()
    return c


def save_sheet(google_id: str, spreadsheet_id: str):
    c = _conn()
    c.execute("""
        INSERT INTO user_prefs (google_id, spreadsheet_id)
        VALUES (?, ?)
        ON CONFLICT(google_id) DO UPDATE
            SET spreadsheet_id = excluded.spreadsheet_id,
                updated_at     = CURRENT_TIMESTAMP
    """, (google_id, spreadsheet_id))
    c.commit()
    c.close()


def get_sheet(google_id: str):
    c = _conn()
    row = c.execute(
        "SELECT spreadsheet_id FROM user_prefs WHERE google_id = ?",
        (google_id,)
    ).fetchone()
    c.close()
    return row[0] if row else None


def remove_sheet(google_id: str):
    c = _conn()
    c.execute("DELETE FROM user_prefs WHERE google_id = ?", (google_id,))
    c.commit()
    c.close()
