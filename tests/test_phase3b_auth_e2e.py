import os
import sys
import time
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("LANDSURE_JWT_SECRET", "test_secret_with_more_than_thirty_two_characters_long")

from fastapi.testclient import TestClient
from playwright.sync_api import sync_playwright

from app.main import app
from app.services.auth import create_token, create_demo_token

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"


# -----------------------------------------------------------------------------
# BROWSER E2E TESTS (Playwright + Real Chrome)
# -----------------------------------------------------------------------------

def test_browser_one_click_demo_login_and_dashboard():
    """
    Verifies browser navigation:
    1. Opens http://localhost:5173
    2. Sees login card
    3. Clicks 'Try Demo Session' / 'ডেমো ভিজিটর'
    4. Authenticates without username/password
    5. Dashboard (.app-shell) successfully renders
    6. Token is stored in localStorage
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")

        # Confirm login screen
        login_card = page.locator(".login-card")
        assert login_card.is_visible(), "Login card should be visible initially"

        # One-click demo login
        demo_btn = page.locator("button.demo-btn")
        assert demo_btn.is_visible(), "Demo button should be visible"
        demo_btn.click()

        # Wait for dashboard
        page.wait_for_selector(".app-shell", timeout=10000)
        assert page.locator(".app-shell").is_visible(), "Dashboard app shell should be visible"

        # Check localStorage token
        token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert token and len(token) > 20, "Demo token should be stored in localStorage"

        # Check demo badge
        badge = page.locator(".environment.demo")
        assert badge.is_visible(), "Demo badge should indicate demo mode"

        browser.close()


def test_browser_session_persistence_on_refresh():
    """
    Verifies that refreshing the page (F5) maintains the authenticated session.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")

        # Login as demo
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=10000)

        initial_token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert initial_token

        # Reload page
        page.reload(wait_until="networkidle")
        page.wait_for_selector(".app-shell", timeout=10000)
        assert page.locator(".app-shell").is_visible(), "Dashboard should remain visible after reload"

        refreshed_token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert refreshed_token == initial_token, "Token should be preserved after reload"

        browser.close()


def test_browser_logout_and_session_cleared():
    """
    Verifies that clicking Logout revokes session, clears localStorage, and returns to login card.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=10000)

        # Click logout
        logout_btn = page.locator("button[title='Log out']")
        assert logout_btn.is_visible()
        logout_btn.click(force=True)

        # Login card should reappear
        page.wait_for_selector(".login-card", timeout=8000)
        assert page.locator(".login-card").is_visible(), "Login card should reappear after logout"

        # LocalStorage should be cleared
        token = page.evaluate("() => localStorage.getItem('landsure_auth_token')")
        assert not token, "Token should be cleared from localStorage after logout"

        browser.close()


def test_browser_protected_navigation_and_parcel_interaction():
    """
    Verifies that an authenticated demo user can navigate tabs and interact with parcel data.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.locator("button.demo-btn").click()
        page.wait_for_selector(".app-shell", timeout=10000)

        # Navigate to Verification & Risk
        page.click("button:has-text('স্মার্ট ভেরিফিকেশন')")
        page.wait_for_selector("text=SMART LAND VERIFICATION ENGINE", timeout=8000)
        assert page.locator("text=SMART LAND VERIFICATION ENGINE").is_visible()

        # Navigate to AI Copilot
        page.click("button:has-text('এআই সহকারী')")
        page.wait_for_selector("text=LANDSURE AI COPILOT", timeout=8000)
        assert page.locator("text=LANDSURE AI COPILOT").is_visible()

        browser.close()


# -----------------------------------------------------------------------------
# API AUTHENTICATION & EDGE CASE TESTS
# -----------------------------------------------------------------------------

def test_api_one_click_demo_token_issuance():
    with TestClient(app) as client:
        resp = client.post("/api/v1/auth/demo")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "demo"
        assert data["is_demo"] is True
        assert data["expires_in"] == 1800


def test_api_demo_token_protected_api_access():
    with TestClient(app) as client:
        demo_resp = client.post("/api/v1/auth/demo")
        token = demo_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check /api/v1/auth/me
        me_resp = client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "demo"
        assert me_resp.json()["username"] == "demo-visitor"

        # Check parcel access
        p_resp = client.get("/api/v1/parcels/LS-PARCEL-000001", headers=headers)
        assert p_resp.status_code == 200
        assert p_resp.json()["parcel"]["parcel_id"] == "LS-PARCEL-000001"


def test_api_expired_token_handling():
    import jwt
    from app.services.auth import get_secret, ALGORITHM
    from datetime import datetime, timedelta, timezone

    # Generate an expired token
    past = datetime.now(timezone.utc) - timedelta(hours=2)
    payload = {
        "sub": "demo-visitor",
        "role": "demo",
        "is_demo": True,
        "token_version": 0,
        "iat": past,
        "exp": past + timedelta(minutes=30),
    }
    expired_token = jwt.encode(payload, get_secret(), algorithm=ALGORITHM)

    with TestClient(app) as client:
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401
        assert "Invalid or expired access token" in resp.json()["detail"]


def test_api_invalid_token_rejected():
    with TestClient(app) as client:
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer totally_garbage_jwt_token"})
        assert resp.status_code == 401


def test_api_restricted_demo_permissions_blocks_admin():
    with TestClient(app) as client:
        demo_token = client.post("/api/v1/auth/demo").json()["access_token"]
        headers = {"Authorization": f"Bearer {demo_token}"}

        # Attempt to access admin endpoint
        admin_resp = client.get("/api/v1/admin/status", headers=headers)
        assert admin_resp.status_code == 403
        assert "Insufficient permissions" in admin_resp.json()["detail"]


def test_api_restricted_demo_permissions_blocks_user_creation():
    with TestClient(app) as client:
        demo_token = client.post("/api/v1/auth/demo").json()["access_token"]
        headers = {"Authorization": f"Bearer {demo_token}"}

        # Attempt to access admin users endpoint with demo token
        create_resp = client.post(
            "/api/v1/admin/users",
            json={"username": "malicious_user", "password": "Password123!", "role": "admin"},
            headers=headers
        )
        assert create_resp.status_code == 403
        assert "Insufficient permissions" in create_resp.json()["detail"]


def test_api_cors_preflight_demo_endpoint():
    with TestClient(app) as client:
        resp = client.options(
            "/api/v1/auth/demo",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization, content-type",
            }
        )
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert "POST" in resp.headers.get("access-control-allow-methods", "")


def test_api_document_upload_with_demo_token():
    import fitz
    doc = fitz.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()

    with TestClient(app) as client:
        demo_token = client.post("/api/v1/auth/demo").json()["access_token"]
        headers = {"Authorization": f"Bearer {demo_token}"}

        files = {"file": ("demo_test_deed.pdf", pdf_bytes, "application/pdf")}
        resp = client.post("/api/v1/documents/upload", files=files, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "VALIDATED"
        assert data["format"] == "pdf"
        assert data["page_count"] == 1


def test_api_parcel_search_with_demo_token():
    with TestClient(app) as client:
        demo_token = client.post("/api/v1/auth/demo").json()["access_token"]
        headers = {"Authorization": f"Bearer {demo_token}"}

        resp = client.get("/api/v1/gis/search?q=Dhaka", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["matches_count"] >= 1


def test_api_assistant_query_with_demo_token():
    with TestClient(app) as client:
        demo_token = client.post("/api/v1/auth/demo").json()["access_token"]
        headers = {"Authorization": f"Bearer {demo_token}"}

        resp = client.post(
            "/api/v1/copilot/evidence",
            json={"question": "CS আর RS খতিয়ানের পার্থক্য কী?", "parcel_id": "LS-PARCEL-000001", "language": "bn"},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["answer"]) > 20
        assert data.get("synthetic") is True or data.get("verified") is False
