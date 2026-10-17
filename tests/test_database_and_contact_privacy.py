"""
LandSure AI — Phase 4G Database Privacy & Security Regression Test Suite
Validates:
1. Seed database cleanliness: Zero committed personal or test-generated runtime records
2. Seller contact and listing reporting authentication enforcement
3. Privacy safety: Public discovery endpoints never leak raw seller phone or email
4. Cross-user isolation and document upload path traversal defenses
5. RBAC enforcement: Demo visitors strictly forbidden from admin management
"""

import os
import sys
import sqlite3
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient
from app.main import app
from app.services.database import DB_PATH
from app.services.auth import create_demo_token
from app.services.document_processor import validate_file_bytes, DocumentValidationError

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def demo_headers():
    token = create_demo_token()
    return {"Authorization": f"Bearer {token}"}


def test_seed_database_is_free_of_runtime_and_personal_records():
    """Verify the Git-tracked seed database contains 0 runtime submissions."""
    assert Path(DB_PATH).is_file(), "Seed database must exist."
    with sqlite3.connect(f"{DB_PATH.as_uri()}?mode=ro", uri=True) as conn:
        cur = conn.cursor()
        
        # Runtime tables must have 0 rows in seed database
        for table in ["consultation_requests", "consultation_slot_reservations", "listing_contact_requests", "listing_reports"]:
            count = cur.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
            assert count == 0, f"Table {table} must be clean (0 rows) in seed database, found {count}."
        
        # Lawyer availability slots should all be AVAILABLE in clean seed
        booked = cur.execute("SELECT COUNT(*) FROM lawyer_availability WHERE availability_status != 'AVAILABLE'").fetchone()[0]
        assert booked == 0, f"All lawyer slots must be AVAILABLE in seed, found {booked} non-available."
        
        # Parcels count remains strictly 700 synthetic records
        parcels_count = cur.execute("SELECT COUNT(*) FROM parcels").fetchone()[0]
        assert parcels_count == 700, f"Expected 700 synthetic parcels, found {parcels_count}."


def test_seller_contact_request_requires_authentication(client):
    """Unauthenticated requests to submit seller contact requests must be rejected with 401."""
    res = client.post(
        "/api/v1/gis/listings/LS-PARCEL-000001/contact-request",
        json={"note": "Test unauthenticated contact"}
    )
    assert res.status_code == 401
    assert "Authentication required" in res.json().get("detail", "")


def test_listing_report_requires_authentication(client):
    """Unauthenticated requests to report listings must be rejected with 401."""
    res = client.post(
        "/api/v1/gis/listings/LS-PARCEL-000001/report",
        json={"reason": "Suspicious boundaries"}
    )
    assert res.status_code == 401
    assert "Authentication required" in res.json().get("detail", "")


def test_nearby_land_discovery_endpoint_never_exposes_raw_phone(client, demo_headers):
    """Public nearby discovery endpoint must never leak raw telephone numbers or emails."""
    res = client.get("/api/v1/gis/parcels/LS-PARCEL-000001/nearby?radius_km=10", headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    
    # Check that alternatives only contain privacy-safe fields
    for alt in data.get("alternatives", []):
        assert "seller_phone" not in alt
        assert "seller_email" not in alt
        assert "phone" not in alt
        assert "email" not in alt
        assert "seller_contact" in alt
        assert "seller_phone" not in alt["seller_contact"]
        assert "seller_email" not in alt["seller_contact"]
        assert "seller_phone_placeholder" in alt["seller_contact"]
        assert "০১৭০০-" in alt["seller_contact"]["seller_phone_placeholder"]
        assert "sample_price_bdt" in alt or "asking_price_bdt" in alt


def test_document_processor_path_traversal_and_extension_validation():
    """Verify document upload defenses reject directory traversal and malicious filenames."""
    # Path traversal attack
    with pytest.raises(DocumentValidationError) as exc1:
        validate_file_bytes(b"%PDF-1.4 test", "../../etc/passwd.pdf")
    assert exc1.value.code == "INVALID_FILENAME"
    
    # Backslash traversal attack
    with pytest.raises(DocumentValidationError) as exc2:
        validate_file_bytes(b"%PDF-1.4 test", "..\\system32\\config.pdf")
    assert exc2.value.code == "INVALID_FILENAME"
    
    # Malicious executable disguised as pdf
    with pytest.raises(DocumentValidationError) as exc3:
        validate_file_bytes(b"MZ\x90\x00\x03\x00\x00\x00", "payload.exe.pdf")
    assert exc3.value.code == "SIGNATURE_MISMATCH"


def test_demo_role_cannot_access_admin_user_routes(client, demo_headers):
    """Verify demo visitors receive 403 Forbidden on administrative endpoints."""
    # Attempt to list all users
    res = client.get("/api/v1/admin/users", headers=demo_headers)
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json().get("detail", "")
