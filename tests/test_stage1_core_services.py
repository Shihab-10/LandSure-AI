import os
import sys
from pathlib import Path
from secrets import token_urlsafe
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import create_demo_token
from app.services.registration_calculator import (
    calculate_registration_cost,
    RegistrationCostRequest,
)

@pytest.fixture(autouse=True)
def test_env(monkeypatch):
    secret = token_urlsafe(32)
    monkeypatch.setenv("LANDSURE_JWT_SECRET", secret)
    monkeypatch.setenv("LANDSURE_DEMO_ONLY_MODE", "true")

@pytest.fixture
def auth_headers():
    token = create_demo_token()
    return {"Authorization": f"Bearer {token}"}

def test_health_and_readiness_endpoints():
    with TestClient(app) as client:
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["status"] == "ok"
        assert health_data["synthetic"] is True

        ready_resp = client.get("/ready")
        assert ready_resp.status_code == 200
        ready_data = ready_resp.json()
        assert ready_data["status"] == "ready"
        assert ready_data["database_connected"] is True
        assert ready_data["synthetic_parcels_count"] == 700
        assert ready_data["models"]["parcel_review_logistic_regression_v2"] == "LOADED"
        assert ready_data["models"]["feature_router_v4"] == "LOADED"
        assert ready_data["models"]["safety_gate_v2"] == "LOADED"

def test_registration_calculator_formulas():
    with TestClient(app) as client:
        # Dhaka City Corp request
        payload = {
            "deed_value_bdt": 10000000,  # 1 Crore BDT
            "area_decimal": 5.0,
            "location_category": "dhaka_ctg_city",
            "is_residential": True,
        }
        res = client.post("/api/v1/calculator/registration-cost", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["deed_value_bdt"] == 10000000
        # Stamp 1.5% = 150,000, Reg 1.0% = 100,000, Local 3.0% = 300,000, AIT 3.0% = 300,000, Fixed = 840 -> Total = 850,840
        assert data["total_estimated_cost_bdt"] == 850840.0
        assert len(data["breakdown"]) == 5

        # Union Parishad request
        up_payload = {
            "deed_value_bdt": 1000000,  # 10 Lakh BDT
            "area_decimal": 10.0,
            "location_category": "union_parishad",
            "is_residential": True,
        }
        up_res = client.post("/api/v1/calculator/registration-cost", json=up_payload)
        assert up_res.status_code == 200
        up_data = up_res.json()
        # Stamp 1.5% = 15,000, Reg 1.0% = 10,000, Local 1.0% = 10,000, AIT 1.0% = 10,000, Fixed = 840 -> Total = 45,840
        assert up_data["total_estimated_cost_bdt"] == 45840.0

def test_parcel_verification_with_dynamic_ml_review(auth_headers):
    with TestClient(app) as client:
        # Existing parcel
        verif = client.get("/api/v1/parcels/LS-PARCEL-000001/verification", headers=auth_headers)
        assert verif.status_code == 200
        v_data = verif.json()
        assert "ml_model_review" in v_data
        ml = v_data["ml_model_review"]
        assert ml["model_name"] == "parcel_review_logistic_regression_v2"
        assert ml["features_evaluated"] == 17
        assert isinstance(ml["review_required"], bool)
        assert 0.0 <= ml["review_probability"] <= 1.0
        assert ml["risk_level"] in ("LOW_RISK", "STANDARD", "ELEVATED_RISK", "HIGH_RISK")

        # Dedicated ML endpoint
        ml_ep = client.get("/api/v1/parcels/LS-PARCEL-000001/ml-review", headers=auth_headers)
        assert ml_ep.status_code == 200
        assert ml_ep.json()["parcel_id"] == "LS-PARCEL-000001"

def test_ownership_chain_and_competing_claim_detection(auth_headers):
    with TestClient(app) as client:
        res = client.get("/api/v1/parcels/LS-PARCEL-000001/ownership-chain", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["parcel_id"] == "LS-PARCEL-000001"
        assert data["continuity_status"] in ("INTACT", "COMPETING_CLAIM_DETECTED", "NO_TRANSACTION_RECORDS")
        assert isinstance(data["transactions_timeline"], list)
        assert isinstance(data["active_ownership_claims"], list)
        assert data["synthetic"] is True

def test_extended_verification_endpoints_with_transparent_status(auth_headers):
    with TestClient(app) as client:
        # Tax verification
        tax = client.get("/api/v1/parcels/LS-PARCEL-000001/tax-verification", headers=auth_headers)
        assert tax.status_code == 200
        tax_data = tax.json()
        assert tax_data["status"] in ("RECORDS_AVAILABLE", "REQUIRES_SOURCE_DATA")
        assert "source_portal" in tax_data or "records" in tax_data

        # Co-owners
        co = client.get("/api/v1/parcels/LS-PARCEL-000001/co-owners", headers=auth_headers)
        assert co.status_code == 200
        assert co.json()["co_owners_count"] >= 1

        # Legal checklist
        legal = client.get("/api/v1/parcels/LS-PARCEL-000001/legal-checklist", headers=auth_headers)
        assert legal.status_code == 200
        assert len(legal.json()["legal_checklist"]) >= 4

        # Possession
        poss = client.get("/api/v1/parcels/LS-PARCEL-000001/possession-assessment", headers=auth_headers)
        assert poss.status_code == 200
        assert len(poss.json()["access_and_possession_checklist"]) >= 3

        # Gap navigator
        gap = client.get("/api/v1/parcels/LS-PARCEL-000001/gap-navigator", headers=auth_headers)
        assert gap.status_code == 200
        gap_data = gap.json()
        assert 0 <= gap_data["readiness_score"] <= 100
        assert gap_data["readiness_grade"] in ("A", "B", "C", "D")

        # OCR status
        ocr = client.get("/api/v1/documents/ocr/status")
        assert ocr.status_code == 200
        assert ocr.json()["status"] == "MODEL_UNAVAILABLE_ON_FREE_TIER"

def test_nonexistent_and_invalid_parcels(auth_headers):
    with TestClient(app) as client:
        # Invalid format
        inv = client.get("/api/v1/parcels/INVALID-FORMAT", headers=auth_headers)
        assert inv.status_code == 422

        # Nonexistent parcel
        none_p = client.get("/api/v1/parcels/LS-PARCEL-999999", headers=auth_headers)
        assert none_p.status_code == 404
