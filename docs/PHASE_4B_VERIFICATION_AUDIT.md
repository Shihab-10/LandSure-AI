# LandSure AI — Phase 4B Deep Verification Audit & Evidence Integrity Report

**Project:** LandSure AI (P5: Check Before You Buy — জমি ক্রয়ের পূর্বে প্রমাণভিত্তিক যাচাই)  
**Status:** Phase 4B Complete  
**Date:** October 2026  
**Automated Tests:** 86/86 Passing (100% Pass Rate across unit, integration, and Playwright real-browser tests)  
**Frontend Build:** `tsc -b && vite build` Passing (0 errors, 550 kB bundle)  

---

## 1. Executive Summary

Phase 4B builds directly upon the Phase 4A connected buyer journey by deepening evidence integrity across all 6 critical dimensions of Bangladesh land due diligence:
1. **Cross-Survey Khatian Comparison (CS ➔ SA ➔ RS ➔ BS_BDS ➔ City Survey)**: Structured transition tracking, dag continuity, area drift measurement, and plain-Bengali legal explanation answering the 4 core questions.
2. **Honest Ownership History (Up to 25 Years)**: Explicit coverage badge and range display (`coverage_badge_bn`, `record_coverage_text_bn`), tracking actual verified record duration without fabricating 25 years when fewer years exist, and automated detection of double-selling / competing claims (`COMPETING_CLAIM`).
3. **Deed OCR Extraction & Cross-Record Matching**: Cryptographic SHA-256 verification, field normalization (Bengali numerals, area conversions), and three-tier match status (`MATCH`, `MISMATCH`, `NEEDS_HUMAN_REVIEW`) for mouza, khatian, dag, and seller identity.
4. **Mutation (Namjari) & Tax (LD Tax) Verification**: E-Dakhila payment status, arrears detection, mutation case number validation, and Bangladesh statutory registration cost calculation (Stamp Duty 1.5%, Registration Fee 1%, Local Govt Tax 2-3%, AIT 3-5%).
5. **Boundary, Possession, Legal & Inheritance Integrity**: Physical road access (16ft pucca road), boundary demarcation (brick wall), civil suit & injunction checks, and co-owner / warisan partition verification.
6. **ML Model Integration Audit & Reuse**: Verified runtime loading and inference of Logistic Regression V2 (17 features), Query Router V4 (intent classification), and Safety Gate V2 (safety guardrails). Documented honest status of Colab GPU OCR/HTR experiments without false claims.

---

## 2. Cross-Survey Khatian Verification Audit

In Bangladesh land administration, survey records reflect successive historical revenue operations:
- **CS (Cadastral Survey, 1888–1940)**: Baseline land ownership records.
- **SA (State Acquisition, 1956–1962)**: Records created under the East Bengal State Acquisition and Tenancy Act 1950.
- **RS (Revisional Survey, 1965–1985)**: Updated field survey rectifying SA discrepancies.
- **BS / BDS (Bangladesh Survey, modern)**: Keyed in system as `BS_BDS`.
- **City Survey (Dhaka / Chattogram Urban Areas)**: Modern municipal records where applicable.

### Database & Service Verification
- **API Endpoint**: `GET /api/v1/parcels/{parcel_id}`
- **Data Model**: `survey_records` table linked by `parcel_id`.
- **Findings for Demonstration Parcels**:
  - `LS-PARCEL-000001`: Complete chronological survey chain (CS dag #1005 ➔ SA dag #1006 ➔ RS dag #1007 ➔ BS_BDS dag #1007) with consistent 10.0 decimal recorded area.
  - Dag transition logic accurately tracks plot splits, consolidations, and renumbering.
- **Four Plain-Bengali Core Questions**:
  1. *এই তথ্যের অর্থ কী?*: সিএস, এসএ, আরএস ও বিএস খতিয়ান ও দাগ নম্বরের ধারাবাহিকতা।
  2. *জমি কেনার আগে এটি কেন জরুরি?*: সিএস থেকে আরএস জরিপে দাগ ও মালিকানার মিল নিশ্চিত না হলে ভবিষ্যতে স্বত্ব বিলোপ হতে পারে।
  3. *কী কী ঝুঁকি থাকতে পারে?*: রেকর্ডীয় দাগ বিভাজন, অর্পিত/পরিত্যক্ত সম্পত্তির তালিকাভুক্তি বা নকশা পরিবর্তন।
  4. *পরবর্তী পদক্ষেপ কী?*: সাব-রেজিস্ট্রি ও তহশিল অফিস থেকে সার্টিফায়েড খতিয়ান (পর্চা) সংগ্রহ করে নকশা মিলিয়ে নেওয়া।

---

## 3. Ownership History & Honest 25-Year Coverage

### The 25-Year Legal Rule in Bangladesh
Under the Bangladesh Transfer of Property Act 1882 and Registration Act 1908, title examination typically examines transactions spanning at least 25 years. However, when official records or physical volume books only span 12–18 years in digital form, fabricating a 25-year chain is deceptive.

### Honest Coverage Calculation
- **Endpoint**: `GET /api/v1/parcels/{parcel_id}/chain`
- **Dynamic Calculation**:
  - The API computes `years_covered = round((latest_tx_date - earliest_tx_date).days / 365.25, 1)`.
  - Honest status badges:
    - If `years_covered >= 25.0`: `verified_25_years = True`, badge = `[✓ ২৫+ বছরের পূর্ণাঙ্গ রেকর্ড সংরক্ষিত]`
    - If `years_covered < 25.0`: `verified_25_years = False`, badge = `[⚠ {years} বছরের রেকর্ড উপলব্ধ — ২৫ বছরের জন্য আরও {remaining} বছরের তল্লাশি প্রয়োজন]`
- **Double-Selling / Competing Claim Detection**:
  - Automatically identifies overlapping deeds or simultaneous transfers.
  - Parcel `LS-PARCEL-000201` demonstrates active double-selling risk (`transaction_status = 'COMPETING_CLAIM'`) between competing claimants (ফারুক আহমেদ vs রফিকুল ইসলাম), immediately triggering high-priority red alert cards in both API and frontend UI.

---

## 4. Deed OCR Extraction & Cross-Record Matching

### Document Pipeline Architecture
1. **Upload & Integrity**:
   - Cryptographic SHA-256 fingerprinting on upload (`POST /api/v1/documents/upload`).
   - Magic byte verification (`%PDF`, `\xFF\xD8\xFF`, `\x89PNG`) prevents spoofed payloads.
2. **Field Extraction & Normalization**:
   - Bengali numeral transliteration (`১, ২, ৩` ➔ `1, 2, 3`).
   - Area unit conversion (কাঠা, বিঘা, অজুতাংশ ➔ ডেসিমাল/শতাংশ).
   - Regex-based extraction of Deed Number, Deed Year, Sub-Registry Office, Mouza, Khatian, Dag, and Transacting Parties.
3. **Cross-Record Matching Logic (`POST /api/v1/documents/confirm`)**:
   - Compares deed fields against ground-truth parcel survey and ownership records.
   - Outputs tri-state status per field:
     - `MATCH`: Values match exactly (e.g. Mouza "বিরুলিয়া" == "বিরুলিয়া").
     - `MISMATCH`: Explicit conflict detected (e.g. deed dag #1009 vs record dag #1007).
     - `NEEDS_HUMAN_REVIEW`: Minor spelling variations, abbreviations, or missing fields requiring advocate inspection.

---

## 5. Mutation, Tax, Legal & Boundary Verification

### A. Mutation / Namjari (`mutations` table)
- Verifies Mutation Case Number, Khatian Number, DCR (Duplicate Carbon Receipt), and Land Revenue Acceptance.
- Clear distinction between approved, pending, and missing mutations.

### B. Land Development Tax (`tax_evidence` table)
- Verifies E-Dakhila holding number, latest paid financial year, and outstanding arrears.
- Direct integration with Bangladesh Land Tax statutory rules (unpaid dues alert).

### C. Registration Cost Calculator
- Computes Bangladesh statutory registration fees based on `deed_value_bdt` and `location_category`:
  - Stamp Duty: 1.5%
  - Registration Fee: 1.0%
  - Local Government Tax: 2.0% (Union Parishad/Pourashava) to 3.0% (Dhaka/Ctg City)
  - Advance Income Tax (AIT): 3.0% to 5.0%
  - Deed writer, stamp vendor & miscellaneous statutory charges.

### D. Legal Disputes & Court Orders (`legal_checklist` table)
- Checks Civil Court title suits (স্বত্ব মামলা), injunctions (নিষেধাজ্ঞা), and mortgage encumbrances (বন্ধক).
- Alerts buyer if partition suit (বাটোয়ারা মামলা) is pending among co-sharers (ওয়ারিশান).

### E. Physical Road Access & Possession (`physical_inspection` table)
- Ground reality validation: 16-foot paved road access (পাকা রাস্তা) and boundary demarcations (ইটের সীমানা প্রাচীর).
- Warns if physical possession does not match recorded deed boundaries.

---

## 6. Colab & ML Model Integration Audit

| Asset Name | Artifact File | Architecture | Status in LandSure AI | Verification Result |
|:---|:---|:---|:---:|:---|
| **Query Router V4** | `landsure_feature_router_v4.joblib` | Scikit-Learn TF-IDF + Classifier | Active in Backend | Classifies user queries across 26 features with sub-millisecond latency. Tested via `test_model_loading.py`. |
| **Safety Gate V2** | `landsure_safety_gate_v2.joblib` | Scikit-Learn Pipeline | Active in Backend | Filters out-of-scope, malicious, or non-land queries. Tested via `test_model_loading.py`. |
| **Parcel Risk Model V2** | `logistic_regression_v2.joblib` | Logistic Regression (17 features) | Active in Backend | Computes land risk score (0-100) and risk category (`LOW`, `MEDIUM`, `HIGH`). Tested via `test_phase4b_ml_model_review_and_reuse`. |
| **Bangla OCR (Printed)** | PyMuPDF + Image Preprocessing | Text-layer + OCR Engine | Active in Backend | Extracts structured fields from clean scans and digital deed PDFs. Tested via `test_document_extraction_sample`. |
| **Bangla HTR (Handwritten)** | Colab Notebook Research | TrOCR / BaDLAD Experiments | Documented Research | Weights are NOT bundled in repository to observe 512MB RAM constraints; documented in `docs/colab_notebooks/`. |

---

## 7. Real-Browser Playwright E2E Verification

The authoritative browser test `test_phase4b_real_browser_e2e_two_parcel_journey` was executed in headless Chromium against the active local backend (`http://127.0.0.1:8000`) and frontend (`http://localhost:5173`):
1. **One-Click Demo Login**: Authentic session token generated and stored in `localStorage`.
2. **Parcel Search & Map Selection**: Searched and loaded `LS-PARCEL-000001` (Birulia Residential).
3. **Buyer Journey 9 Steps**: Sequentially navigated through all 9 due diligence steps (Khatian Comparison, Ownership History, Mutation, Tax, Possession/Road, Legal/Inheritance, ML Risk, Cost Calculator, Watchlist).
4. **Plain Bengali 4 Questions**: Verified all 4 core questions rendered dynamically on each step.
5. **Deed Review Navigation**: Switched seamlessly to Document Intelligence without losing selected parcel context.
6. **Parcel Switch & Competing Claim Verification**: Searched and loaded `LS-PARCEL-000201`, re-entered Buyer Journey, and verified the prominent Bengali double-selling alert card (`দ্বৈত দাবি / বিরোধ`).
7. **Report Generation**: Navigated to Verification Report / Trust Passport and confirmed tamper-evident findings summary.
8. **Screenshots Captured**:
   - `docs/screenshots/phase4b_competing_claim_verified.png`
   - `docs/screenshots/phase4b_final_report_verified.png`

---

## 8. Test Suite Summary

- **Baseline Tests (Phase 4A)**: 78 tests passed
- **Deep Verification Tests (Phase 4B)**: 8 tests passed
  1. `test_phase4b_khatian_cross_survey_comparison`: PASSED
  2. `test_phase4b_ownership_history_honest_coverage_and_competing_claims`: PASSED
  3. `test_phase4b_deed_ocr_cross_record_field_comparison`: PASSED
  4. `test_phase4b_mutation_and_tax_evidence_handling`: PASSED
  5. `test_phase4b_legal_inheritance_boundary_possession`: PASSED
  6. `test_phase4b_ml_model_review_and_reuse`: PASSED
  7. `test_phase4b_verification_report_generation`: PASSED
  8. `test_phase4b_real_browser_e2e_two_parcel_journey`: PASSED
- **Total Repository Test Results**: **86 passed, 0 failed (100% pass rate in 99.77s)**
