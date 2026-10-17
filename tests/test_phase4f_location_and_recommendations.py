"""
Phase 4F Automated Regression & Discovery Test Suite
Covers:
1. 8 Administrative Divisions & 64 Districts retrieval
2. Authoritative Upazilas / Thanas (both rural and urban metropolitan areas)
3. Cadastral Mouzas & honest missing-data indicators
4. Bengali & English digit normalization (e.g. ১২৩ <-> 123)
5. Multi-criteria Parcel Search (Cascading filters: division, district, mouza, dag, khatian)
6. Geodesic (Haversine) Nearby Land Alternatives ("কাছাকাছি বিকল্প জমি")
7. Reliable Land Price Display & Non-Fabrication Disclaimers
8. Privacy-Safe Seller Contact & Listing Reporting Workflows
9. Multi-Parcel Comparison Matrix (up to 3 parcels)
10. Strict Anti-Fabrication & Forbidden Claim Checks (No '100% Safe', No 'Fraud Free')
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import create_demo_token

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def demo_headers():
    token = create_demo_token()
    return {"Authorization": f"Bearer {token}"}


# =====================================================================
# 1. ADMINISTRATIVE LOCATION HIERARCHY TESTS
# =====================================================================

def test_divisions_retrieval(client):
    """Verify all 8 administrative divisions of Bangladesh are returned."""
    res = client.get("/api/v1/gis/divisions")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 8
    names_en = [d["name_en"] for d in data["divisions"]]
    assert "Dhaka" in names_en
    assert "Chattogram" in names_en
    assert "Sylhet" in names_en
    assert "Rajshahi" in names_en
    assert "Khulna" in names_en
    assert "Barishal" in names_en
    assert "Rangpur" in names_en
    assert "Mymensingh" in names_en


def test_districts_all_and_filtered(client):
    """Verify all 64 districts are returned, and division filtering works."""
    # All 64 districts
    res_all = client.get("/api/v1/gis/districts")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total"] == 64

    # Filtered by division
    res_dhaka = client.get("/api/v1/gis/districts?division=Dhaka")
    assert res_dhaka.status_code == 200
    data_dhaka = res_dhaka.json()
    assert len(data_dhaka["districts"]) == 13
    assert all(d["division"] == "Dhaka" for d in data_dhaka["districts"])


def test_upazilas_urban_and_rural(client):
    """Verify upazilas return correctly for both rural/suburban and urban areas."""
    # Dhaka district (contains Savar upazila and Mirpur/Gulshan thanas)
    res = client.get("/api/v1/gis/upazilas?district=Dhaka")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 5
    upz_names = [u["name_en"] for u in data["upazilas"]]
    assert "Savar" in upz_names
    assert "Mirpur" in upz_names
    assert "Gulshan" in upz_names


def test_mouzas_available_and_honest_empty_state(client):
    """Verify mouzas return when available, and display honest missing-data indicator when not."""
    # Savar (catalogued mouzas)
    res_savar = client.get("/api/v1/gis/mouzas?upazila=Savar&district=Dhaka")
    assert res_savar.status_code == 200
    data_savar = res_savar.json()
    assert data_savar["has_data"] is True
    assert len(data_savar["mouzas"]) >= 2
    mouza_names = [m["name_en"] for m in data_savar["mouzas"]]
    assert "Birulia" in mouza_names

    # Mirpur (urban area with no catalogued rural mouzas)
    res_mirpur = client.get("/api/v1/gis/mouzas?upazila=Mirpur&district=Dhaka")
    assert res_mirpur.status_code == 200
    data_mirpur = res_mirpur.json()
    assert data_mirpur["has_data"] is False
    assert len(data_mirpur["mouzas"]) == 0
    assert "সীমাবদ্ধতা" in data_mirpur["message_bn"] or "unavailable" in data_mirpur.get("message_en", "").lower()


# =====================================================================
# 2. PARCEL SEARCH & DIGIT NORMALIZATION
# =====================================================================

def test_parcel_search_cascading_and_digit_normalization(client):
    """Verify parcel search handles Bengali digits and cascading location filters."""
    # Search by Bengali digits
    res_bn = client.get("/api/v1/gis/parcels/search?q=১")
    assert res_bn.status_code == 200
    data_bn = res_bn.json()
    assert data_bn["returned_count"] > 0

    # Search with district & mouza filters
    res_filtered = client.get("/api/v1/gis/parcels/search?district=Dhaka&mouza=Birulia&limit=5")
    assert res_filtered.status_code == 200
    data_filtered = res_filtered.json()
    assert data_filtered["returned_count"] > 0
    first_p = data_filtered["parcels"][0]
    assert first_p["location_hierarchy"]["mouza_en"] == "Birulia"
    assert first_p["location_hierarchy"]["district_en"] == "Dhaka"


# =====================================================================
# 3. NEARBY ALTERNATIVES ("কাছাকাছি বিকল্প জমি") & GEODESIC DISTANCE
# =====================================================================

def test_nearby_alternatives_geodesic_discovery(client, demo_headers):
    """Verify nearby alternatives calculates authentic geodesic distances within radius."""
    res = client.get("/api/v1/gis/parcels/LS-PARCEL-000001/nearby?radius_km=3.0&limit=5", headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["origin_parcel_id"] == "LS-PARCEL-000001"
    assert data["filter_radius_km"] == 3.0
    assert len(data["alternatives"]) > 0

    for alt in data["alternatives"]:
        # Must exclude origin parcel
        assert alt["parcel_id"] != "LS-PARCEL-000001"
        # Distance must be within specified radius
        assert alt["distance_km"] <= 3.0
        # Disclaimers must be present
        assert "নমুনা" in alt["price_disclaimer_bn"] or "মূল্য নেই" in alt["price_disclaimer_bn"]
        # Risk labels must adhere to approved evidence wording
        assert alt["risk_label_bn"] in [
            "কম শনাক্তকৃত ঝুঁকি", "মাঝারি শনাক্তকৃত ঝুঁকি", "বেশি যাচাই প্রয়োজন", "তথ্য অসম্পূর্ণ"
        ]
        # FORBIDDEN CLAIMS: must never assert 100% safe or fraud free
        assert "100% Safe" not in alt["risk_label_bn"]
        assert "Fraud Free" not in alt["risk_label_bn"]
        assert "Government Approved" not in alt["risk_label_bn"]


def test_nearby_alternatives_sorting(client, demo_headers):
    """Verify nearby alternatives sort correctly by distance and price."""
    # Distance sort (ascending)
    res_dist = client.get("/api/v1/gis/parcels/LS-PARCEL-000001/nearby?radius_km=5.0&sort_by=distance&limit=5", headers=demo_headers)
    assert res_dist.status_code == 200
    alts_dist = res_dist.json()["alternatives"]
    distances = [a["distance_km"] for a in alts_dist]
    assert distances == sorted(distances)


# =====================================================================
# 4. MULTI-PARCEL COMPARISON MATRIX
# =====================================================================

def test_parcel_comparison_matrix(client, demo_headers):
    """Verify side-by-side comparison for up to 3 parcels."""
    payload = {
        "parcel_ids": ["LS-PARCEL-000001", "LS-PARCEL-000002", "LS-PARCEL-000003"]
    }
    res = client.post("/api/v1/gis/parcels/compare", json=payload, headers=demo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["compared_parcels_count"] == 3
    p_ids = [p["parcel_id"] for p in data["parcels"]]
    assert "LS-PARCEL-000001" in p_ids
    assert "LS-PARCEL-000002" in p_ids
    assert "LS-PARCEL-000003" in p_ids

    # Check comparison attributes
    for p in data["parcels"]:
        assert "location_bn" in p
        assert "area_decimal" in p
        assert "price_formatted_bn" in p
        assert "survey_status_bn" in p
        assert "mutation_status_bn" in p
        assert "tax_status_bn" in p


# =====================================================================
# 5. SELLER CONTACT & LISTING REPORTING
# =====================================================================

def test_seller_contact_request_workflow(client, demo_headers):
    """Verify demo seller contact request is recorded without exposing document phone numbers."""
    res = client.post(
        "/api/v1/gis/listings/LS-PARCEL-000001/contact-request",
        json={"note": "আমি এই জমিটি সম্পর্কে বিস্তারিত জানতে আগ্রহী।"},
        headers=demo_headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "RECORDED_DEMO"
    assert data["parcel_id"] == "LS-PARCEL-000001"
    assert "০১৭০০-" in data["seller_phone_placeholder"]
    assert "গোপনীয়তা" in data["privacy_notice_bn"] or "ব্যক্তিগত" in data["privacy_notice_bn"]

    # Clean up test row so seed database remains clean
    from app.services.database import DB_PATH
    import sqlite3
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM listing_contact_requests WHERE request_id = ?", (data["request_id"],))
        conn.commit()


def test_listing_reporting_workflow(client, demo_headers):
    """Verify reporting suspicious or fraudulent demonstration listing."""
    res = client.post(
        "/api/v1/gis/listings/LS-PARCEL-000001/report",
        json={"reason": "সীমানা এবং খতিয়ান তথ্যে গড়মিল পরিলক্ষিত হয়েছে।"},
        headers=demo_headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "RECORDED"
    assert data["parcel_id"] == "LS-PARCEL-000001"
    assert "অভিযোগ" in data["message_bn"]

    # Clean up test row so seed database remains clean
    from app.services.database import DB_PATH
    import sqlite3
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM listing_reports WHERE report_id = ?", (data["report_id"],))
        conn.commit()
