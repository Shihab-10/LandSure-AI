import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend is on sys.path
backend_path = Path(__file__).resolve().parents[1] / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app

client = TestClient(app)

def test_demo_auth_endpoint():
    """Verify backend /api/v1/auth/demo responds with a valid JWT token and demo role."""
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "token" in data or "access_token" in data
    token = data.get("access_token") or data.get("token")
    assert token and len(token) > 20
    assert data.get("role") == "demo"
    assert data.get("is_demo") is True

def test_auth_me_with_demo_token():
    """Verify /api/v1/auth/me accepts the demo token."""
    login_res = client.post("/api/v1/auth/demo")
    token = login_res.json().get("access_token") or login_res.json().get("token")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data.get("role") == "demo"
    assert "username" in user_data

def test_default_selected_parcel_endpoint():
    """Verify default parcel LS-PARCEL-000001 requires auth and returns genuine synthetic record with Bengali metadata."""
    # Check unauthorized request is blocked
    unauth_res = client.get("/api/v1/parcels/LS-PARCEL-000001")
    assert unauth_res.status_code == 401

    # Check authorized request succeeds
    login_res = client.post("/api/v1/auth/demo")
    token = login_res.json().get("access_token") or login_res.json().get("token")
    response = client.get("/api/v1/parcels/LS-PARCEL-000001", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    parcel = data.get("parcel") or data
    assert parcel["parcel_id"] == "LS-PARCEL-000001"
    assert parcel.get("is_synthetic") in ("True", True, "true")
    assert parcel.get("district_name_bn") == "ঢাকা"
    assert parcel.get("upazila_name_bn") == "সাভার"
    assert parcel.get("mouza_name_bn") == "বিরুলিয়া"


def test_frontend_phase_a_files_exist():
    """Verify Phase A dashboard architecture components are present."""
    frontend_src = Path(__file__).resolve().parents[1] / "frontend" / "src"
    navbar_path = frontend_src / "components" / "dashboard" / "DashboardNavbar.tsx"
    sidebar_path = frontend_src / "components" / "dashboard" / "DashboardSidebar.tsx"
    transition_path = frontend_src / "components" / "dashboard" / "DashboardEntryTransition.tsx"
    saved_path = frontend_src / "components" / "dashboard" / "SavedPropertiesWorkspace.tsx"
    context_path = frontend_src / "context" / "ParcelContext.tsx"
    types_path = frontend_src / "types" / "dashboard.ts"

    assert navbar_path.is_file(), f"Missing {navbar_path}"
    assert sidebar_path.is_file(), f"Missing {sidebar_path}"
    assert transition_path.is_file(), f"Missing {transition_path}"
    assert saved_path.is_file(), f"Missing {saved_path}"
    assert context_path.is_file(), f"Missing {context_path}"
    assert types_path.is_file(), f"Missing {types_path}"

def test_frontend_phase_a_navigation_modules():
    """Verify DashboardSidebar contains all 9 required primary modules in Bengali and English."""
    sidebar_file = Path(__file__).resolve().parents[1] / "frontend" / "src" / "components" / "dashboard" / "DashboardSidebar.tsx"
    content = sidebar_file.read_text(encoding="utf-8")
    
    expected_modules = [
        "explorer",       # ১. জমি খুঁজুন
        "saved",          # ২. সংরক্ষিত জমি
        "verification",   # ৩. জমি যাচাইকরণ
        "documents",      # ৪. দলিল পরীক্ষা ও OCR
        "copilot",        # ৫. ভূমি সহকারী
        "lawyers",        # ৬. আইনজীবীর পরামর্শ
        "passport",       # ৭. যাচাই প্রতিবেদন
        "my_land",        # ৮. আমার জমি
        "notifications",  # ৯. নোটিফিকেশন
    ]
    for mod in expected_modules:
        assert f'id: "{mod}"' in content or f'"{mod}"' in content, f"Module {mod} missing in DashboardSidebar"

def test_frontend_logo_continuous_animation():
    """Verify LogoMark component supports animated prop without mutating wordmark."""
    logo_file = Path(__file__).resolve().parents[1] / "frontend" / "src" / "components" / "landing" / "Logo.tsx"
    content = logo_file.read_text(encoding="utf-8")
    assert "animated = false" in content or "animated?: boolean" in content
    assert "Wordmark" in content
    # Wordmark must remain stationary
    assert 'LandSure <span className="text-primary">AI</span>' in content
