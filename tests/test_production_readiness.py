import importlib
from secrets import token_urlsafe
import sys
from pathlib import Path
import pytest

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

main_module = importlib.import_module("app.main")
auth_module = importlib.import_module("app.services.auth")
user_store = importlib.import_module("app.services.user_store")


@pytest.fixture
def test_client(tmp_path, monkeypatch):
    secret = token_urlsafe(32)
    monkeypatch.setenv("LANDSURE_JWT_SECRET", secret)
    monkeypatch.setattr(user_store, "AUTH_DB", tmp_path / "test_auth.db")
    return TestClient(main_module.app)


def test_cors_environment_allowlist_and_preflight(test_client, monkeypatch):
    # 1. Default allowed origins include Cloudflare Pages
    preflight_cf = test_client.options(
        "/api/v1/parcels/LS-PARCEL-000001",
        headers={
            "Origin": "https://landsure-ai.pages.dev",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight_cf.status_code == 200
    assert (
        preflight_cf.headers.get("access-control-allow-origin")
        == "https://landsure-ai.pages.dev"
    )

    # 2. Localhost development origin
    preflight_local = test_client.options(
        "/api/v1/parcels/LS-PARCEL-000001",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight_local.status_code == 200
    assert (
        preflight_local.headers.get("access-control-allow-origin")
        == "http://localhost:5173"
    )

    # 3. Disallowed arbitrary origin is rejected (no allow-origin header)
    preflight_evil = test_client.options(
        "/api/v1/parcels/LS-PARCEL-000001",
        headers={
            "Origin": "https://malicious-site.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert (
        preflight_evil.headers.get("access-control-allow-origin")
        is None
    )


def test_demo_login_and_server_side_permission_boundaries(test_client):
    # 1. Request demo session without credentials
    demo_resp = test_client.post("/api/v1/auth/demo")
    assert demo_resp.status_code == 200
    demo_data = demo_resp.json()
    assert "access_token" in demo_data
    assert demo_data["role"] == "demo"
    assert demo_data["is_demo"] is True
    assert demo_data["expires_in"] <= 1800

    demo_token = demo_data["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    # 2. Permitted read-only synthetic operations
    me_resp = test_client.get("/api/v1/auth/me", headers=demo_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "demo"
    assert me_resp.json()["is_demo"] is True

    parcel_resp = test_client.get(
        "/api/v1/parcels/LS-PARCEL-000001", headers=demo_headers
    )
    assert parcel_resp.status_code == 200
    assert parcel_resp.json()["synthetic"] is True

    surveys_resp = test_client.get(
        "/api/v1/parcels/LS-PARCEL-000001/surveys", headers=demo_headers
    )
    assert surveys_resp.status_code == 200

    passport_resp = test_client.get(
        "/api/v1/parcels/LS-PARCEL-000001/trust-passport", headers=demo_headers
    )
    assert passport_resp.status_code == 200
    assert passport_resp.headers["content-type"] == "application/pdf"

    copilot_resp = test_client.post(
        "/api/v1/copilot/evidence",
        headers=demo_headers,
        json={
            "question": "এই জমির নামজারি অবস্থা কী?",
            "parcel_id": "LS-PARCEL-000001",
        },
    )
    assert copilot_resp.status_code == 200
    assert copilot_resp.json()["topic"] == "mutation"

    # 3. Forbidden operations for demo role (server-side 403 enforcement)
    # Admin access
    assert (
        test_client.get(
            "/api/v1/admin/status", headers=demo_headers
        ).status_code
        == 403
    )
    assert (
        test_client.get(
            "/api/v1/admin/users", headers=demo_headers
        ).status_code
        == 403
    )
    assert (
        test_client.post(
            "/api/v1/admin/users",
            headers=demo_headers,
            json={
                "username": "hacker",
                "password": token_urlsafe(24),
                "role": "viewer",
            },
        ).status_code
        == 403
    )

    # Password change
    assert (
        test_client.post(
            "/api/v1/auth/change-password",
            headers=demo_headers,
            json={
                "old_password": "any",
                "new_password": token_urlsafe(24),
            },
        ).status_code
        == 403
    )

    # Reviewer access
    assert (
        test_client.get(
            "/api/v1/reviewer/status", headers=demo_headers
        ).status_code
        == 403
    )

    # Legal chat and bookings
    assert (
        test_client.post(
            "/api/v1/legal-chat/conversations",
            headers=demo_headers,
            json={"lawyer_id": "demo-lawyer"},
        ).status_code
        == 403
    )
    assert (
        test_client.post(
            "/api/v1/legal-bookings",
            headers=demo_headers,
            json={"lawyer_id": "demo", "availability_id": "slot"},
        ).status_code
        == 403
    )


def test_legacy_ai_query_v4_router_bridge(test_client, monkeypatch):
    # Obtain viewer token
    user_store.create_user("viewer-user", token_urlsafe(24), "viewer")
    auth_module.create_token({"username": "viewer-user", "role": "viewer", "token_version": 0})
    login_resp = test_client.post(
        "/api/v1/auth/login",
        json={"username": "viewer-user", "password": "viewer-password"},
    )
    # Use demo token for query endpoint test
    demo_resp = test_client.post("/api/v1/auth/demo")
    token = demo_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query with parcel ID
    resp = test_client.post(
        "/api/v1/ai/query",
        headers=headers,
        json={"question": "এই জমির নামজারি বা মিউটেশন অবস্থা কী? LS-PARCEL-000001"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["routing"]["intent"] == "MUTATION_STATUS"
    assert data["routing"]["v4_feature_id"] == 7
    assert "mutations" in data["related_records"]

    # Query without parcel ID when parcel is required
    resp_no_parcel = test_client.post(
        "/api/v1/ai/query",
        headers=headers,
        json={"question": "এই জমির নামজারি দেখতে চাই"},
    )
    assert resp_no_parcel.status_code == 200
    assert resp_no_parcel.json()["status"] == "PARCEL_ID_REQUIRED"

    # Direct test of /api/v1/ai/classify-v4 FastAPI endpoint with Router V4 & Gate V2
    resp_v4 = test_client.post(
        "/api/v1/ai/classify-v4",
        headers=headers,
        json={"question": "এই জমির খতিয়ান এবং দাগ নম্বর যাচাই করতে চাই"},
    )
    assert resp_v4.status_code == 200
    v4_data = resp_v4.json()
    assert v4_data["router_model"] == "V4"
    assert v4_data["gate_model"] == "V2"
    assert v4_data["gate_label"] in ("LAND_QUERY", "SAFETY_REVIEW")
    assert "router_candidate_feature_id" in v4_data
    assert v4_data["advisory_only"] is True



def test_model_inference_and_feature_extraction():
    sys.path.insert(0, str(PROJECT_ROOT / "models" / "parcel_review"))
    extractor = importlib.import_module("landsure_parcel_feature_extractor")
    import joblib

    db_path = PROJECT_ROOT / "datasets" / "synthetic" / "landsure_synthetic_v2_3.db"
    model_path = PROJECT_ROOT / "models" / "parcel_review" / "logistic_regression_v2.joblib"

    features = extractor.extract_parcel_features(str(db_path), "LS-PARCEL-000001")
    assert features.shape == (1, 17)

    model = joblib.load(model_path)
    prediction = model.predict(features)[0]
    prob = model.predict_proba(features)[0]

    assert prediction in (0, 1)
    assert len(prob) == 2
    assert round(sum(prob), 4) == 1.0


def test_health_endpoints(test_client):
    resp1 = test_client.get("/health")
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"

    resp2 = test_client.get("/api/v1/health")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ok"


def test_auth_unavailable_without_secret(test_client, monkeypatch):
    monkeypatch.delenv("LANDSURE_JWT_SECRET", raising=False)
    resp_demo = test_client.post("/api/v1/auth/demo")
    assert resp_demo.status_code == 503
    assert "unavailable" in resp_demo.json()["detail"].lower()

    resp_login = test_client.post(
        "/api/v1/auth/login",
        json={"username": "viewer-user", "password": "viewer-password"},
    )
    assert resp_login.status_code == 503
    assert "unavailable" in resp_login.json()["detail"].lower()


def test_demo_only_mode_blocks_permanent_modifications(test_client, monkeypatch):
    monkeypatch.setenv("LANDSURE_DEMO_ONLY_MODE", "true")

    # Health endpoint reports demo mode
    resp_health = test_client.get("/health")
    assert resp_health.status_code == 200
    assert resp_health.json()["demo_mode"] is True
    assert resp_health.json()["persistent_storage"] is False

    # Demo login still works seamlessly
    demo_resp = test_client.post("/api/v1/auth/demo")
    assert demo_resp.status_code == 200
    demo_token = demo_resp.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    # Reading synthetic parcel data is permitted
    resp_parcel = test_client.get("/api/v1/parcels/LS-PARCEL-000001", headers=demo_headers)
    assert resp_parcel.status_code == 200
    assert resp_parcel.json()["synthetic"] is True

    # User registration is rejected in demo-only deployment
    user_store.create_user("temp-admin", token_urlsafe(24), "admin")
    admin_token = auth_module.create_token({"username": "temp-admin", "role": "admin", "token_version": 0})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp_create = test_client.post(
        "/api/v1/admin/users",
        headers=admin_headers,
        json={"username": "new-user", "password": "securepassword123!", "role": "viewer"},
    )
    assert resp_create.status_code == 403
    assert "disabled in demo-only" in resp_create.json()["detail"].lower()
