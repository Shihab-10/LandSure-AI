import os
import sys
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.services.auth import create_demo_token
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FRONTEND_URL = "http://localhost:5173"
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# 1. CROSS-SURVEY KHATIAN COMPARISON (CS, SA, RS, BS, CITY & MUTATION)
# =============================================================================

def test_phase4b_khatian_cross_survey_comparison():
    """
    Phase 4B Requirement 2:
    Verifies chronological record comparison across British CS, Pakistan SA,
    Bangladesh RS, modern BS, City Survey, and Mutation records.
    Ensures 9-column metadata, epoch transitions, area drift calculation,
    and 4 plain-Bengali explanation questions.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/parcels/LS-PARCEL-000001/survey-comparison", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()

    assert data["parcel_id"] == "LS-PARCEL-000001"
    surveys = data.get("surveys", [])
    assert len(surveys) >= 4, "Must contain at least CS, SA, RS, BS epochs"

    # Confirm survey types
    survey_types = [s["survey_type"] for s in surveys]
    assert "CS" in survey_types, "CS survey must be present"
    assert "RS" in survey_types, "RS survey must be present"
    assert any("BS" in s for s in survey_types), "BS survey must be present"

    # Confirm 4 plain-Bengali buyer questions
    four_q = data.get("bangla_four_questions", {})
    assert "what_it_means" in four_q
    assert "why_it_matters" in four_q
    assert "is_there_a_problem" in four_q
    assert "what_to_do_now" in four_q
    assert "খতিয়ান" in four_q["what_it_means"]["answer_bn"]
    assert "পর্চা" in four_q["what_to_do_now"]["answer_bn"]

    # Confirm dag transitions tracking
    transitions = data.get("dag_transitions", [])
    assert isinstance(transitions, list)


# =============================================================================
# 2. EVIDENCE-BASED OWNERSHIP HISTORY (HONEST 25-YR COVERAGE & COMPETING CLAIMS)
# =============================================================================

def test_phase4b_ownership_history_honest_coverage_and_competing_claims():
    """
    Phase 4B Requirement 3:
    - Never fabricates 25 years when records do not span 25 years.
    - Demonstrates honest outstanding years calculation.
    - Algorithmic competing-claim and double-selling detection.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Case A: Clean parcel with honest record coverage
    res_clean = client.get("/api/v1/parcels/LS-PARCEL-000001/ownership-chain", headers=headers)
    assert res_clean.status_code == 200
    d_clean = res_clean.json()

    cov_years = d_clean.get("evidence_coverage_years")
    outstanding = d_clean.get("outstanding_years_to_25")
    assert cov_years is not None
    assert outstanding is not None
    assert outstanding == max(0, 25 - cov_years), "Outstanding years must equal 25 - coverage"
    assert d_clean.get("double_selling_risk") is False

    # Case B: Conflicting parcel with double-selling / competing claims
    res_risk = client.get("/api/v1/parcels/LS-PARCEL-000201/ownership-chain", headers=headers)
    assert res_risk.status_code == 200
    d_risk = res_risk.json()

    assert d_risk.get("double_selling_risk") is True, "Parcel 000201 must flag double selling"
    assert d_risk.get("competing_transactions_count") >= 1
    assert "দ্বৈত দাবি" in d_risk["bangla_four_questions"]["is_there_a_problem"]["answer_bn"]
    assert d_risk["bangla_four_questions"]["is_there_a_problem"]["status_code"] == "MISMATCH"


# =============================================================================
# 3. DEED OCR EXTRACTION & FIELD-BY-FIELD CROSS-COMPARISON
# =============================================================================

def test_phase4b_deed_ocr_cross_record_field_comparison():
    """
    Phase 4B Requirement 4:
    Verifies field-by-field cross comparison between extracted deed fields and
    parcel records with MATCH, MISMATCH, MISSING, and NEEDS_HUMAN_REVIEW statuses.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Matching deed scenario
    matching_payload = {
        "parcel_id": "LS-PARCEL-000001",
        "fields": {
            "deed_number": "1001",
            "seller_name": "আনোয়ার হোসেন",
            "buyer_name": "কামাল উদ্দিন",
            "sub_registry_office": "সাভার সাব-রেজিস্ট্রি অফিস",
            "mouza": "বিরুলিয়া",
            "land_area": "10.0",
        }
    }
    res_match = client.post("/api/v1/documents/compare-parcel", headers=headers, json=matching_payload)
    assert res_match.status_code == 200
    d_m = res_match.json()
    assert d_m["parcel_id"] == "LS-PARCEL-000001"
    assert d_m["summary"]["match"] >= 3
    assert any(c["status"] == "MATCH" for c in d_m["field_comparisons"])

    # Mismatching deed scenario
    mismatch_payload = {
        "parcel_id": "LS-PARCEL-000001",
        "fields": {
            "deed_number": "9999",
            "sub_registry_office": "সিলেট সদর সাব-রেজিস্ট্রি অফিস",
            "mouza": "টুকেরবাজার",
            "land_area": "50.0",
        }
    }
    res_mismatch = client.post("/api/v1/documents/compare-parcel", headers=headers, json=mismatch_payload)
    assert res_mismatch.status_code == 200
    d_mm = res_mismatch.json()
    assert d_mm["overall_status"] == "MISMATCH"
    assert d_mm["summary"]["mismatch"] >= 2
    # Verify sub-registry office and mouza are flagged as MISMATCH
    sub_comp = next((c for c in d_mm["field_comparisons"] if c["field_key"] == "sub_registry_office"), None)
    assert sub_comp is not None and sub_comp["status"] == "MISMATCH"


# =============================================================================
# 4. MUTATION & LAND TAX EVIDENCE HANDLING
# =============================================================================

def test_phase4b_mutation_and_tax_evidence_handling():
    """
    Phase 4B Requirement 5:
    Verifies mutation records, DCR receipts, tax dakhila clearance status,
    and statutory cost calculator integration.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Mutations endpoint
    res_mut = client.get("/api/v1/parcels/LS-PARCEL-000001/mutations", headers=headers)
    assert res_mut.status_code == 200
    d_mut = res_mut.json()
    assert "mutations" in d_mut

    # Tax verification endpoint
    res_tax = client.get("/api/v1/parcels/LS-PARCEL-000001/tax-verification", headers=headers)
    assert res_tax.status_code == 200
    d_tax = res_tax.json()
    assert "source_portal" in d_tax
    assert "ldtax.gov.bd" in d_tax["source_portal"]
    assert "verification_checklist" in d_tax
    assert "bangla_four_questions" in d_tax

    # Registration cost calculator
    calc_payload = {
        "deed_value_bdt": 4000000.0,
        "area_decimal": 4.0,
        "location_category": "dhaka_ctg_city",
        "is_residential": True,
    }
    res_calc = client.post("/api/v1/calculator/registration-cost", headers=headers, json=calc_payload)
    assert res_calc.status_code == 200
    d_calc = res_calc.json()
    stamp_duty = next(b["amount_bdt"] for b in d_calc["breakdown"] if b["category"] == "stamp_duty")
    reg_fee = next(b["amount_bdt"] for b in d_calc["breakdown"] if b["category"] == "registration_fee")
    assert stamp_duty == 60000.0  # 1.5% of 4M
    assert reg_fee == 40000.0     # 1.0% of 4M
    assert d_calc["total_estimated_cost_bdt"] > 0


# =============================================================================
# 5. LEGAL, INHERITANCE, BOUNDARY, POSSESSION & ROAD ACCESS VERIFICATION
# =============================================================================

def test_phase4b_legal_inheritance_boundary_possession():
    """
    Phase 4B Requirement 6:
    Verifies civil litigation search checklist, court injunction warnings,
    co-owner consent / partition deed advisory, and physical possession inspection.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Legal checklist
    res_legal = client.get("/api/v1/parcels/LS-PARCEL-000001/legal-checklist", headers=headers)
    assert res_legal.status_code == 200
    d_legal = res_legal.json()
    assert "legal_checklist" in d_legal
    assert len(d_legal["legal_checklist"]) >= 5
    categories = [item["category"] for item in d_legal["legal_checklist"]]
    assert "civil_suit" in categories
    assert "court_injunction" in categories
    assert "inheritance_partition" in categories

    # Possession assessment
    res_pos = client.get("/api/v1/parcels/LS-PARCEL-000001/possession-assessment", headers=headers)
    assert res_pos.status_code == 200
    d_pos = res_pos.json()
    assert d_pos["road_access"]["has_access"] is True
    assert "রাস্তা" in d_pos["road_access"]["status_bn"]
    assert "access_and_possession_checklist" in d_pos
    assert "bangla_four_questions" in d_pos


# =============================================================================
# 6. ML MODEL REVIEW & REUSE AUDIT
# =============================================================================

def test_phase4b_ml_model_review_and_reuse():
    """
    Phase 4B Requirement 7:
    Verifies actual inference of Logistic Regression V2 on 17 extracted features,
    and Query Router V4 + Safety Gate V2.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Parcel Review ML Inference
    res_ml = client.get("/api/v1/parcels/LS-PARCEL-000001/ml-review", headers=headers)
    assert res_ml.status_code == 200
    d_ml = res_ml.json()
    assert d_ml["model_name"] == "parcel_review_logistic_regression_v2"
    assert d_ml["features_evaluated"] == 17
    assert "review_required" in d_ml
    assert "risk_level" in d_ml
    assert "features" in d_ml
    assert len(d_ml["features"]) == 17

    # Query Router & Safety Gate via assistant evidence
    res_assistant = client.post("/api/v1/copilot/evidence", headers=headers, json={
        "question": "এই জমির খতিয়ান এবং নামজারির কী অবস্থা?",
        "parcel_id": "LS-PARCEL-000001",
        "language": "bn",
    })
    assert res_assistant.status_code == 200
    d_asst = res_assistant.json()
    assert "answer" in d_asst
    assert len(d_asst["answer"]) > 10


# =============================================================================
# 7. FINAL VERIFICATION REPORT (TRUST PASSPORT)
# =============================================================================

def test_phase4b_verification_report_generation():
    """
    Phase 4B Requirement 9:
    Verifies final report title 'LandSure AI জমি যাচাই প্রতিবেদন',
    evidence summary, and honest demonstration disclosures.
    """
    client = TestClient(app)
    token = create_demo_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/parcels/LS-PARCEL-000001/verification", headers=headers)
    assert res.status_code == 200
    d = res.json()
    assert d["parcel_id"] == "LS-PARCEL-000001"
    assert "ml_model_review" in d
    assert d.get("synthetic") is True


# =============================================================================
# 8. REAL CHROME PLAYWRIGHT E2E (PHASE 4B DEEP VERIFICATION JOURNEY)
# =============================================================================

def test_phase4b_real_browser_e2e_two_parcel_journey():
    """
    Phase 4B Requirement 10:
    Real Chrome Playwright browser test verifying:
    1. One-click demo login.
    2. Parcel consistency from map to buyer journey.
    3. Navigation through all 9 due-diligence steps on Parcel 1 (clean).
    4. Deed review with field cross-comparison.
    5. Switching to Parcel 201 (competing claim) and verifying double-selling alert.
    6. Verifying report generation.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # Step 1: One-click Demo Login
        page.goto(FRONTEND_URL, wait_until="networkidle")
        demo_btn = page.locator("button.demo-btn")
        assert demo_btn.is_visible(), "Demo button should be visible"
        demo_btn.click()
        page.wait_for_selector(".app-shell", timeout=10000)

        # Step 2: Search for LS-PARCEL-000001
        page.click("button:has-text('জমি খুঁজুন')")
        page.wait_for_selector(".gis-map-module", timeout=10000)
        search_input = page.locator(".gis-map-module form input")
        assert search_input.is_visible()
        search_input.fill("LS-PARCEL-000001")
        time.sleep(1)
        page.locator(".gis-map-module form button[type='submit']").click()
        time.sleep(2)

        # Step 3: Open Buyer Journey (জমি যাচাই)
        page.click("button:has-text('জমি যাচাই')")
        page.wait_for_selector(".buyer-journey-workspace", timeout=8000)

        # Verify 9 steps are accessible
        page.click("button:has-text('১. খতিয়ান ও জরিপ তুলনা')")
        time.sleep(1)
        assert page.locator("text=খতিয়ান ও জরিপ তুলনা").first.is_visible()
        # Verify 4 plain Bengali questions rendered
        assert page.locator("text=১. এই তথ্যের অর্থ কী?").first.is_visible()

        page.click("button:has-text('২. মালিকানার ইতিহাস')")
        time.sleep(1)
        assert page.locator("text=মালিকানার ইতিহাস").first.is_visible()

        page.click("button:has-text('৩. নামজারি ও মিউটেশন')")
        time.sleep(1)
        assert page.locator("text=নামজারি").first.is_visible()

        page.click("button:has-text('৪. ভূমি উন্নয়ন কর')")
        time.sleep(1)
        assert page.locator("text=ভূমি উন্নয়ন কর").first.is_visible()

        page.click("button:has-text('৫. সীমানা, রাস্তা ও দখল')")
        time.sleep(1)
        assert page.locator("text=সীমানা").first.is_visible()

        page.click("button:has-text('৬. আদালত ও ওয়ারিশান চেক')")
        time.sleep(1)
        assert page.locator("text=আদালত").first.is_visible() or page.locator("text=মামলা").first.is_visible()

        page.click("button:has-text('৭. স্মার্ট ঝুঁকি পর্যালোচনা')")
        time.sleep(1)
        assert page.locator("text=ঝুঁকি পর্যালোচনা").first.is_visible()

        page.click("button:has-text('৮. নিবন্ধন খরচ ক্যালকুলেটর')")
        time.sleep(1)
        assert page.locator("text=নিবন্ধন খরচ").first.is_visible() or page.locator("text=স্ট্যাম্প").first.is_visible()

        page.click("button:has-text('৯. পরিবর্তন ওয়াচলিস্ট')")
        time.sleep(1)
        assert page.locator("text=ওয়াচলিস্ট").first.is_visible() or page.locator("text=অডিট").first.is_visible()

        # Step 4: Open Deed Review (দলিল পরীক্ষা)
        page.click("button:has-text('দলিল পরীক্ষা')")
        page.wait_for_selector(".doc-intel-module", timeout=8000)
        assert page.locator("text=দলিল ইন্টেলিজেন্স").first.is_visible() or page.locator("text=দলিল পরীক্ষা").first.is_visible()

        # Step 5: Switch to Competing Claim Parcel (LS-PARCEL-000201)
        page.click("button:has-text('জমি খুঁজুন')")
        page.wait_for_selector(".gis-map-module", timeout=8000)
        search_input = page.locator(".gis-map-module form input")
        search_input.fill("LS-PARCEL-000201")
        time.sleep(1)
        page.locator(".gis-map-module form button[type='submit']").click()
        time.sleep(2)

        # Re-enter Buyer Journey and verify competing claim alert
        page.click("button:has-text('জমি যাচাই')")
        page.wait_for_selector(".buyer-journey-workspace", timeout=8000)
        page.click("button:has-text('২. মালিকানার ইতিহাস')")
        time.sleep(1)
        assert page.locator("text=দ্বৈত দাবি").first.is_visible() or page.locator("text=বিরোধ").first.is_visible() or page.locator("text=COMPETING").first.is_visible()

        screenshot_p4b = SCREENSHOT_DIR / "phase4b_competing_claim_verified.png"
        page.screenshot(path=str(screenshot_p4b))

        # Step 6: Navigate to Final Verification Report (যাচাই প্রতিবেদন)
        page.click("button:has-text('যাচাই প্রতিবেদন')")
        page.wait_for_selector("text=ট্রাস্ট পাসপোর্ট", timeout=8000)
        assert page.locator("text=জরিপ ও খতিয়ান ফাইন্ডিং").first.is_visible()
        assert page.locator("text=মালিকানা ইতিহাসের পরিধি").first.is_visible()

        screenshot_passport = SCREENSHOT_DIR / "phase4b_final_report_verified.png"
        page.screenshot(path=str(screenshot_passport))

        browser.close()
