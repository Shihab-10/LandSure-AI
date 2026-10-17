import importlib
import sqlite3
from secrets import token_urlsafe
import sys
from pathlib import Path

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

database = importlib.import_module("app.services.database")
user_store = importlib.import_module("app.services.user_store")


def test_auth_schema_initializes_fresh_database_idempotently(
    tmp_path, monkeypatch
):
    auth_db = tmp_path / "fresh_auth.db"
    monkeypatch.setattr(user_store, "AUTH_DB", auth_db)

    user_store.initialize_auth_db()
    user_store.initialize_auth_db()
    user_store.create_user(
        "fresh-viewer",
        token_urlsafe(24),
        "viewer",
    )
    assert any(
        user["username"] == "fresh-viewer"
        for user in user_store.list_users()
    )

    with sqlite3.connect(auth_db) as db:
        columns = {
            row[1]: row
            for row in db.execute("PRAGMA table_info(users)")
        }

    assert columns["token_version"][2] == "INTEGER"
    assert columns["token_version"][3] == 1
    assert columns["token_version"][4] == "0"
    assert "updated_at" in columns


def test_auth_schema_migrates_old_database_without_losing_users(
    tmp_path, monkeypatch
):
    auth_db = tmp_path / "old_auth.db"
    old_password = token_urlsafe(24)
    new_password = token_urlsafe(24)
    with sqlite3.connect(auth_db) as db:
        db.execute("""
            CREATE TABLE users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL
                    CHECK(role IN ('admin', 'reviewer', 'viewer')),
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute(
            "INSERT INTO users (username, password_hash, role) "
            "VALUES (?, ?, ?)",
            (
                "preserved-user",
                user_store.password_hash.hash(old_password),
                "reviewer",
            ),
        )

    monkeypatch.setattr(user_store, "AUTH_DB", auth_db)
    user = user_store.find_user("preserved-user")

    assert user is not None
    assert user_store.password_hash.verify(
        old_password,
        user["password_hash"],
    )
    assert user["role"] == "reviewer"
    assert user["token_version"] == 0
    assert user_store.set_user_active("preserved-user", False)
    assert user_store.set_user_active("preserved-user", True)
    assert user_store.change_password(
        "preserved-user",
        old_password,
        new_password,
    )

    migrated = user_store.find_user("preserved-user")
    assert migrated is not None
    assert migrated["is_active"] == 1
    assert migrated["token_version"] == 3
    with sqlite3.connect(auth_db) as db:
        updated_at = db.execute(
            "SELECT updated_at FROM users WHERE username = ?",
            ("preserved-user",),
        ).fetchone()[0]
    assert updated_at is not None
    assert user_store.password_hash.verify(
        new_password,
        migrated["password_hash"],
    )


def test_land_database_is_read_only_and_contains_700_parcels():
    with database.connect_db() as db:
        assert db.execute("SELECT COUNT(*) FROM parcels").fetchone()[0] == 700
        assert db.execute(
            "SELECT parcel_id FROM parcels ORDER BY parcel_id LIMIT 1"
        ).fetchone()[0] == "LS-PARCEL-000001"

        try:
            db.execute("CREATE TABLE should_not_be_created (id INTEGER)")
        except sqlite3.OperationalError as error:
            assert "readonly" in str(error).lower()
        else:
            raise AssertionError("Land database connection allowed writes")


def test_missing_land_database_fails_without_creating_file(
    tmp_path, monkeypatch
):
    missing_db = tmp_path / "missing.db"
    monkeypatch.setattr(database, "DB_PATH", missing_db)

    try:
        database.connect_db()
    except FileNotFoundError as error:
        assert "Configured LandSure data database does not exist" in str(error)
    else:
        raise AssertionError("Missing land database did not fail")

    assert not missing_db.exists()


def test_auth_login_protection_roles_cors_and_token_revocation(
    tmp_path, monkeypatch
):
    secret = token_urlsafe(32)
    monkeypatch.setenv("LANDSURE_JWT_SECRET", secret)
    monkeypatch.setattr(
        user_store,
        "AUTH_DB",
        tmp_path / "disposable_auth.db",
    )

    username = f"temp-{token_urlsafe(8)}"
    password = token_urlsafe(24)
    changed_password = token_urlsafe(24)
    user_store.create_user(username, password, "viewer")

    app = importlib.import_module("app.main").app

    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/docs").status_code == 200
        assert client.get("/api/v1/parcels/LS-PARCEL-000001").status_code == 401
        assert client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token_urlsafe(24)}",
            },
        ).status_code == 401

        login = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
        assert client.get(
            "/api/v1/admin/status", headers=headers
        ).status_code == 403
        password_change = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "old_password": password,
                "new_password": changed_password,
            },
        )
        assert password_change.status_code == 200
        assert client.get(
            "/api/v1/auth/me", headers=headers
        ).status_code == 401

        refreshed_login = client.post(
            "/api/v1/auth/login",
            json={
                "username": username,
                "password": changed_password,
            },
        )
        assert refreshed_login.status_code == 200
        token = refreshed_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        parcel = client.get(
            "/api/v1/parcels/LS-PARCEL-000001",
            headers=headers,
        )
        assert parcel.status_code == 200
        assert parcel.json()["synthetic"] is True
        legal_experts_res = client.get(
            "/api/v1/legal-experts",
            headers=headers,
        )
        assert legal_experts_res.status_code == 200
        assert legal_experts_res.json()["total_matches"] > 0
        assert client.post(
            "/api/v1/legal-chat/conversations",
            headers=headers,
            json={"lawyer_id": "demo"},
        ).status_code == 503
        assert client.post(
            "/api/v1/legal-bookings",
            headers=headers,
            json={
                "lawyer_id": "demo",
                "availability_id": "demo-slot",
            },
        ).status_code in (404, 503)

        preflight = client.options(
            "/api/v1/auth/me",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert preflight.status_code == 200
        assert (
            preflight.headers["access-control-allow-origin"]
            == "http://localhost:5173"
        )

        user_store.set_user_active(username, False)
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
        assert client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": changed_password},
        ).status_code == 401
