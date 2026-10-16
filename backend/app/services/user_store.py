
import os
import sqlite3
from pathlib import Path
from pwdlib import PasswordHash

PROJECT_ROOT = Path(__file__).resolve().parents[3]
_configured_auth_db = os.environ.get("LANDSURE_AUTH_DB", "").strip()
AUTH_DB = Path(
    _configured_auth_db
    if _configured_auth_db
    else PROJECT_ROOT / "private" / "landsure_auth.db"
).expanduser()
if not AUTH_DB.is_absolute():
    AUTH_DB = PROJECT_ROOT / AUTH_DB
AUTH_DB = AUTH_DB.resolve()

password_hash = PasswordHash.recommended()


def _initialize_auth_schema(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
                CHECK(role IN ('admin', 'reviewer', 'viewer')),
            is_active INTEGER NOT NULL DEFAULT 1
                CHECK(is_active IN (0, 1)),
            token_version INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        )
    """)

    columns = {
        row["name"]
        for row in db.execute("PRAGMA table_info(users)")
    }
    if "token_version" not in columns:
        db.execute("""
            ALTER TABLE users
            ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0
        """)
    if "updated_at" not in columns:
        db.execute("ALTER TABLE users ADD COLUMN updated_at TEXT")


def connect_auth_db():
    AUTH_DB.parent.mkdir(parents=True, exist_ok=True)

    db = sqlite3.connect(str(AUTH_DB), timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 10000")
    _initialize_auth_schema(db)
    return db


def initialize_auth_db():
    with connect_auth_db():
        pass


def find_user(username):
    with connect_auth_db() as db:
        row = db.execute(
            """
            SELECT username, password_hash, role, is_active, token_version
            FROM users
            WHERE username = ?
            """,
            (username,)
        ).fetchone()

    return dict(row) if row else None

def create_user(username, password, role):
    if role not in ("admin", "reviewer", "viewer"):
        raise ValueError("Invalid role")

    if not username or len(password) < 16:
        raise ValueError("Invalid username or short password")

    hashed = password_hash.hash(password)

    with connect_auth_db() as db:
        db.execute(
            """
            INSERT INTO users (
                username, password_hash, role, is_active
            )
            VALUES (?, ?, ?, 1)
            """,
            (username, hashed, role)
        )

def list_users():
    with connect_auth_db() as db:
        rows = db.execute("""
            SELECT username, role, is_active, created_at
            FROM users
            ORDER BY username
        """).fetchall()

    return [dict(row) for row in rows]


# LANDSURE_USER_SECURITY_V2

def change_password(username, old_password, new_password):
    if len(new_password) < 16:
        raise ValueError(
            "New password must have at least 16 characters"
        )

    user = find_user(username)

    if user is None or not user["is_active"]:
        return False

    if not password_hash.verify(
        old_password,
        user["password_hash"]
    ):
        return False

    new_hash = password_hash.hash(new_password)

    with connect_auth_db() as db:
        db.execute("""
            UPDATE users
            SET password_hash = ?,
                token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        """, (new_hash, username))

    return True


def set_user_active(username, is_active):
    with connect_auth_db() as db:
        cursor = db.execute("""
            UPDATE users
            SET is_active = ?,
                token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        """, (int(is_active), username))

    return cursor.rowcount > 0
