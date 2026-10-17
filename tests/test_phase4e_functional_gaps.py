"""
Phase 4E Automated Regression & Functional Gap Test Suite
Covers:
1. Database-backed Demonstration Lawyer Consultation & Booking Lifecycle (create, list, get, cancel, isolation)
2. Bengali Document Intelligence & Target Parcel Field-by-Field Cross Comparison (MATCH, MISMATCH, MISSING, NEEDS_HUMAN_REVIEW)
3. Parcel Change Watch & Event History Audit
4. AI Copilot SQLite Provenance Routing
5. ML Production Pipeline Stability (Logistic Regression V2, Feature Router V4, Safety Gate V2)
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest
import sqlite3
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import create_demo_token, create_token
from app.services.database import DB_PATH

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def demo_token():
    return create_demo_token()

@pytest.fixture
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# =====================================================================
# 1. LAWYER CONSULTATION & DEMO BOOKING LIFECYCLE
# =====================================================================

def test_lawyer_slots_retrieval(client, demo_headers):
    """Verify demo visitors can browse lawyer availability slots."""
    res = client.get("/api/v1/legal-bookings/lawyers/LS-DEMO-LAW-0001/slots", headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["lawyer_id"] == "LS-DEMO-LAW-0001"
    assert data["synthetic_demo"] is True
    assert isinstance(data["slots"], list)
    assert len(data["slots"]) > 0


def test_lawyer_booking_complete_lifecycle(client, demo_headers):
    """Test creating, fetching, listing, and cancelling a demonstration booking."""
    # Step 1: Find an available slot
    slots_res = client.get("/api/v1/legal-bookings/lawyers/LS-DEMO-LAW-0001/slots", headers=demo_headers).json()
    available_slots = [s for s in slots_res["slots"] if s["availability_status"] == "AVAILABLE"]
    assert len(available_slots) > 0, "No available slots found for testing"
    target_slot = available_slots[0]
    slot_id = target_slot["availability_id"]

    # Step 2: Book the slot
    book_res = client.post("/api/v1/legal-bookings", json={
        "lawyer_id": "LS-DEMO-LAW-0001",
        "availability_id": slot_id,
        "consultation_mode": "CHAT",
        "parcel_id": "LS-PARCEL-000001"
    }, headers=demo_headers)
    assert book_res.status_code == 201
    booking = book_res.json()
    assert booking["status"] == "CONFIRMED_DEMO"
    assert booking["synthetic_demo"] is True
    assert "disclaimer_bn" in booking
    request_id = booking["request_id"]

    # Step 3: Verify slot is marked as BOOKED
    updated_slots = client.get("/api/v1/legal-bookings/lawyers/LS-DEMO-LAW-0001/slots", headers=demo_headers).json()
    slot_match = next((s for s in updated_slots["slots"] if s["availability_id"] == slot_id), None)
    assert slot_match is not None
    assert slot_match["availability_status"] == "BOOKED"

    # Step 4: List my bookings
    my_res = client.get("/api/v1/legal-bookings/my-bookings", headers=demo_headers)
    assert my_res.status_code == 200
    my_bookings = my_res.json()["bookings"]
    assert any(b["request_id"] == request_id for b in my_bookings)

    # Step 5: Get single booking
    single_res = client.get(f"/api/v1/legal-bookings/{request_id}", headers=demo_headers)
    assert single_res.status_code == 200
    assert single_res.json()["request_id"] == request_id

    # Step 6: Cancel booking
    cancel_res = client.post(f"/api/v1/legal-bookings/{request_id}/cancel", headers=demo_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Step 7: Verify slot was restored to AVAILABLE
    restored_slots = client.get("/api/v1/legal-bookings/lawyers/LS-DEMO-LAW-0001/slots", headers=demo_headers).json()
    restored_slot = next((s for s in restored_slots["slots"] if s["availability_id"] == slot_id), None)
    assert restored_slot is not None
    assert restored_slot["availability_status"] == "AVAILABLE"

    # Step 8: Clean up DB rows to keep database pristine
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM consultation_slot_reservations WHERE request_id = ?", (request_id,))
        conn.execute("DELETE FROM consultation_requests WHERE request_id = ?", (request_id,))
        conn.commit()


def test_lawyer_booking_user_isolation(client, demo_headers):
    """Verify that a different user cannot cancel another user's booking."""
    # Create booking as demo-visitor
    slots_res = client.get("/api/v1/legal-bookings/lawyers/LS-DEMO-LAW-0001/slots", headers=demo_headers).json()
    slot_id = [s["availability_id"] for s in slots_res["slots"] if s["availability_status"] == "AVAILABLE"][0]
    
    book_res = client.post("/api/v1/legal-bookings", json={
        "lawyer_id": "LS-DEMO-LAW-0001",
        "availability_id": slot_id,
        "consultation_mode": "CHAT"
    }, headers=demo_headers)
    assert book_res.status_code == 201
    request_id = book_res.json()["request_id"]

    # Attempt to access/cancel as another user
    import jwt
    from datetime import datetime, timezone, timedelta
    from app.services.auth import get_secret, ALGORITHM, DEMO_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    other_token = jwt.encode({
        "sub": "other-demo-visitor",
        "role": "demo",
        "is_demo": True,
        "token_version": 0,
        "iat": now,
        "exp": now + timedelta(minutes=DEMO_TOKEN_EXPIRE_MINUTES),
    }, get_secret(), algorithm=ALGORITHM)
    other_headers = {"Authorization": f"Bearer {other_token}"}
    
    unauth_get = client.get(f"/api/v1/legal-bookings/{request_id}", headers=other_headers)
    assert unauth_get.status_code == 403

    unauth_cancel = client.post(f"/api/v1/legal-bookings/{request_id}/cancel", headers=other_headers)
    assert unauth_cancel.status_code == 403

    # Clean up with demo user
    client.post(f"/api/v1/legal-bookings/{request_id}/cancel", headers=demo_headers)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM consultation_slot_reservations WHERE request_id = ?", (request_id,))
        conn.execute("DELETE FROM consultation_requests WHERE request_id = ?", (request_id,))
        conn.execute("UPDATE lawyer_availability SET availability_status = 'AVAILABLE' WHERE availability_id = ?", (slot_id,))
        conn.commit()


# =====================================================================
# 2. BENGALI DOCUMENT INTELLIGENCE & TARGET PARCEL COMPARISON
# =====================================================================

def test_document_extraction_and_field_comparison(client, demo_headers):
    """Verify deed extraction provides target parcel field-by-field cross comparison."""
    # Run extraction on synthetic deed sample
    res = client.post("/api/v1/documents/extract", json={
        "sample_id": "sample-deed-01",
        "target_parcel_id": "LS-PARCEL-000001"
    }, headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "EXTRACTION_SUCCESS"
    assert "target_parcel_comparison" in data
    
    comp = data["target_parcel_comparison"]
    assert comp["parcel_id"] == "LS-PARCEL-000001"
    assert "summary" in comp
    summary = comp["summary"]
    assert summary["total_fields"] >= 8
    match_cnt = summary.get("matched", summary.get("match", 0))
    assert match_cnt > 0

    # Verify field comparisons contain valid statuses
    valid_statuses = {"MATCH", "MISMATCH", "MISSING", "NEEDS_HUMAN_REVIEW"}
    for fc in comp["field_comparisons"]:
        assert fc["status"] in valid_statuses
        assert "label_bn" in fc
        assert "evidence_location" in fc


def test_document_confirm_with_corrections(client, demo_headers):
    """Verify user correction confirmation updates target parcel comparison."""
    res = client.post("/api/v1/documents/confirm", json={
        "document_hash": "synth_hash_001",
        "target_parcel_id": "LS-PARCEL-000001",
        "corrected_fields": {
            "deed_number": "12345/2024",
            "seller_name": "মোঃ রফিকুল ইসলাম",
            "buyer_name": "আনিসুল হক",
            "land_area": "10.0"
        }
    }, headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMED_AND_VERIFIED"
    assert "target_parcel_comparison" in data


# =====================================================================
# 3. PARCEL CHANGE WATCH & AUDIT EVENTS
# =====================================================================

def test_parcel_events_history(client, demo_headers):
    """Verify parcel change watch audit trail retrieves historical events."""
    res = client.get("/api/v1/parcels/LS-PARCEL-000001/events", headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert "events" in data
    assert isinstance(data["events"], list)
    assert len(data["events"]) > 0
    
    event = data["events"][0]
    assert "event_id" in event
    assert "event_type" in event
    assert "event_date" in event


# =====================================================================
# 4. AI COPILOT & SQLITE PROVENANCE
# =====================================================================

def test_copilot_evidence_grounding(client, demo_headers):
    """Verify AI Copilot returns grounded answers with SQLite provenance evidence."""
    res = client.post("/api/v1/copilot/evidence", json={
        "question": "এই জমির খতিয়ান এবং নামজারি রেকর্ড কী?",
        "parcel_id": "LS-PARCEL-000001",
        "language": "bn"
    }, headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in {"SUCCESS", "EVIDENCE_FOUND"}
    assert len(data["answer"]) > 20
    assert "evidence" in data
    assert isinstance(data["evidence"], list)
    assert len(data["evidence"]) > 0


# =====================================================================
# 5. ML RISK REVIEW STABILITY
# =====================================================================

def test_ml_risk_review_model_stability(client, demo_headers):
    """Verify ML Logistic Regression model executes cleanly without SimpleImputer errors."""
    res = client.get("/api/v1/parcels/LS-PARCEL-000001/ml-review", headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert "review_probability" in data
    assert 0.0 <= data["review_probability"] <= 1.0
    assert "risk_level" in data
    assert data["risk_level"] in {"LOW_RISK", "STANDARD", "ELEVATED_RISK", "HIGH_RISK"}
    assert data["model_name"] == "parcel_review_logistic_regression_v2"
    assert "key_risk_signals" in data
