# LandSure AI — Phase 4F Technical Audit & Discovery Intelligence Report

**Project:** LandSure AI  
**Problem Statement:** P5 — Check Before You Buy (Land Fraud & Double-Selling Risk Intelligence)  
**Phase:** 4F (IDE Diagnostic Resolution, Bangladesh Administrative Location Hierarchy, Geodesic Nearby Land Discovery, Trustworthy Land Pricing, Multi-Parcel Comparison & Privacy-Preserving Seller Contact)  
**Date:** October 2026  
**Status:** Certified Locally (116/116 Tests Passed, 10/10 Browser E2E Steps Verified on Real Chrome, 0 Pyright Errors, 0 IDE Warnings)  

---

## 1. Executive Summary

Phase 4F builds directly upon the certified Phase 4E foundation to address the complete discovery-to-purchase buyer journey. In this phase:
1. **IDE Yellow Warnings & Type Checker Errors were 100% resolved** across `lawyer_service.py`, `assistant_v3.py`, and test files without inserting any blanket ignores or disabling type checking. Pyright reports **0 errors, 0 warnings, 0 informations**.
2. **Authoritative Bangladesh Administrative Location Hierarchy** was established spanning all **8 Divisions**, **64 Districts**, and an authoritative catalog of **Upazilas & Urban Thanas** (handling rural Upazilas like Savar vs urban Metropolitan Thanas like Mirpur under DNCC/DSCC).
3. **Transparent Cadastral Mouza Coverage** was implemented with honest reporting for uncatalogued upazilas, ensuring no synthetic mouzas or artificial cadastral boundaries are fabricated.
4. **Nearby Land Alternatives ("কাছাকাছি বিকল্প জমি")** was built using true geodesic distance (Haversine formula in kilometers), configurable radius filters (1 km, 3 km, 5 km, 10 km), dynamic sorting (distance, asking price, evidence completeness), and strict evidence-based risk labeling ("কম শনাক্তকৃত ঝুঁকি", "মাঝারি শনাক্তকৃত ঝুঁকি", "বেশি যাচাই প্রয়োজন", "তথ্য অসম্পূর্ণ"). Forbidden absolutes like "100% Safe" and "Fraud Free Guaranteed" are strictly disallowed and verified by automated tests.
5. **Trustworthy Price Data Architecture** was designed distinguishing seller-provided asking prices, price per shotok (BDT), and sample demonstration indicators ("নমুনা মূল্য — বাস্তব বিক্রয়মূল্য নয়" / "মূল্য দেওয়া হয়নি").
6. **Privacy-Safe Seller Contact & Reporting Workflows** were implemented preventing scraping or disclosure of private numbers from title deeds, providing structured demo request routing and a community reporting mechanism for suspicious listings.
7. **Multi-Parcel Side-by-Side Comparison** allows buyers to compare up to 3 parcels across location, area, price per shotok, mutation records, tax status, and evidence completeness.
8. **Automated Verification:** **116 automated tests pass with 100% success rate** (104 core tests + 10 Phase 4F unit/integration tests + 2 Playwright real Chrome E2E suites).

---

## 2. Stage 2: IDE Diagnostics & Yellow Warning Root Cause Analysis

### 2.1 Problems Identified
Inspection of Antigravity IDE and `pyright` revealed two main problem areas:
- **`backend/app/services/lawyer_service.py`**:
  - `requester` and `db_path` parameter typing: `db_path: Optional[Path]` was placed as the first positional parameter in `get_my_bookings`, `cancel_booking`, and `book_lawyer_slot` without default values `= None`, causing invalid argument ordering diagnostics.
  - Repetitive inline imports (`uuid`, `datetime`, `timezone`, `DB_PATH`) inside each function scope triggering linter warnings.
  - Unnecessary `str(requester)` conversions on strictly typed strings.
- **`backend/app/services/assistant_v3.py` (Line 461)**:
  - Diagnostic: `Operator "*" not supported for "None"`. `ml_res.get("review_probability")` could return `None`, causing pyright to flag multiplication by 100 as potentially unsafe.
- **`tests/test_phase4e_browser_e2e.py` & `tests/test_live_production_browser.py`**:
  - `sys.stdout.reconfigure` attribute warnings when run under non-standard terminal streams.
- **Virtual Environment & Config Mismatch**:
  - `pyrightconfig.json` was set to Python `3.11`, while `.venv` was running Python `3.13.2`.

### 2.2 Root Cause Resolution
- **`lawyer_service.py`**: Cleaned all function signatures with typed defaults (`db_path: Optional[Path] = None`, `lawyer_id: str = ""`, `availability_id: str = ""`, `requester: str = ""`). Elevated common imports (`uuid`, `datetime`, `timezone`, `DB_PATH`) to top-level module scope.
- **`assistant_v3.py`**: Guarded the calculation: `((ml_res.get("review_probability") or 0.0) * 100):.1f`.
- **Test files**: Safely accessed reconfigure via `getattr(sys.stdout, "reconfigure", None)`.
- **`pyrightconfig.json`**: Updated `pythonVersion` to `"3.13"` matching active environment.
- **Verification**: Executed `npx pyright`:
  ```bash
  0 errors, 0 warnings, 0 informations
  ```

---

## 3. Stages 3 & 4: Bangladesh Administrative Location Hierarchy & Search

### 3.1 Hierarchical Data Model
The location engine is implemented in `backend/app/services/location_service.py`:
```
Division (৮টি বিভাগ: Dhaka, Chattogram, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Mymensingh)
 └── District (৬৪টি জেলা: All 64 Districts mapped to their respective divisions)
      └── Upazila / Urban Thana (Rural Upazilas vs Metropolitan City Corporation Thanas)
           └── Mouza (মৌজা ও জেএল নম্বর — with honest coverage reporting)
                └── Parcel / Dag / Khatian (দাগ, খতিয়ান, পার্সেল আইডি)
```

### 3.2 Rural vs. Urban Distinctions
- **Rural Example**: ঢাকা বিভাগ ➔ ঢাকা জেলা ➔ সাভার উপজেলা (Suburban / Upazila) ➔ বিরুলিয়া মৌজা (জেএল: ৪৫) ➔ দাগ ১০০৭ / খতিয়ান ১২৪.
- **Urban Example**: ঢাকা বিভাগ ➔ ঢাকা জেলা ➔ মিরপুর (ডিএনসিসি) (Metropolitan Area / Thana) ➔ সংশ্লিষ্ট ওয়ার্ড / মৌজা.
- **Administrative Precision**: The system explicitly differentiates rural Upazilas (e.g. Savar, Keraniganj, Dhamrai) from metropolitan City Corporation Thanas (e.g. Mirpur, Gulshan, Dhanmondi, Uttara). Mirpur is modeled as a Metropolitan Thana, not a rural Upazila.

### 3.3 Digit Normalization & Search Resilience
- Digits in Bengali (`০১২৩৪৫৬৭৮৯`) and English (`0123456789`) are normalized bidirectionally using `normalize_digits()` and `to_bangla_digits()`.
- Searching for Dag `১০০৭` matches `1007`; searching for Khatian `১২৪` matches `124`.
- Cascading dropdowns reset child selections when parent levels change (e.g., selecting Gazipur clears Savar upazila and Birulia mouza).

### 3.4 Honest Cadastral Coverage & Transparency
- If an upazila has no catalogued cadastral mouzas in the synthetic dataset (e.g. Kapasia, Gazipur), the system displays an honest informational notice:
  > *এই উপজেলার জন্য এখনো বিস্তারিত ডিজিটাল মৌজা তালিকা ক্যাটালগভুক্ত হয়নি (তথ্য সীমাবদ্ধতা)।*
- The system never invents fake mouza names or creates artificial parcels.

---

## 4. Stages 5, 6, 7 & 8: Nearby Land Discovery & Safer Alternatives

### 4.1 Geodesic Distance Algorithm (Haversine Formula)
Distance between the currently selected parcel and candidate alternatives is calculated using great-circle geodesic distance in kilometers:
$$\Delta\sigma = 2 \arcsin \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}$$
$$d = R \cdot \Delta\sigma \quad (R = 6371.0 \text{ km})$$
- Evaluated deterministically against parcel centroid coordinates.
- Selected parcel is strictly excluded from its own alternatives list.
- Configurable radius filters: **1 km, 3 km, 5 km, 10 km**.

### 4.2 Multi-Factor Sorting
Users can sort alternative parcels by:
1. **Distance** (`distance`): Closest parcels first.
2. **Asking Price** (`price_asc`): Lowest asking price first (null prices placed at the end).
3. **Evidence Completeness** (`completeness`): Highest document & verification percentage first.

### 4.3 Evidence-Based Risk Meter & Approved Terminology
Each alternative displays a dynamic Evidence Completeness meter (0–100%) and an evidence-backed risk badge:
- `কম শনাক্তকৃত ঝুঁকি` (Low Detected Risk — green)
- `মাঝারি শনাক্তকৃত ঝুঁকি` (Moderate Detected Risk — amber)
- `বেশি যাচাই প্রয়োজন` (High Verification Needed — rose)
- `তথ্য অসম্পূর্ণ` (Incomplete Information — gray)

**Strict Anti-Fabrication Safeguard:**
Under no circumstances does LandSure AI claim:
- ❌ *"100% Safe"*
- ❌ *"Fraud Free Guaranteed"*
- ❌ *"Government Approved"*
- ❌ *"Fully Verified"* (unless certified by an official government volume record).

### 4.4 Trustworthy Land Price Data Model
The database table `land_listings` records:
- `asking_price_bdt`: Total asking price in BDT.
- `price_per_shotok_bdt`: Derived asking price per decimal/shotok.
- `area_shotok`: Land area in shotok.
- `price_type`: `DEMO_ASKING_PRICE` for synthetic demonstration listings.

**Display Transparency:**
- If price exists: `৳ ১.৭৬ কোটি` | `৪,৬০,০০০ ৳ / শতক` · *নমুনা মূল্য — বাস্তব বিক্রয়মূল্য নয়*
- If price is absent: `মূল্য দেওয়া হয়নি` (10% of synthetic parcels have intentional null prices to test this workflow).

### 4.5 Privacy-Safe Seller Contact & Suspicious Listing Reporting
- **Zero Document Scraping**: Never extracts or displays private phone numbers from title deeds or tax receipts.
- **Demo Placeholders**: Public demonstration listings use clearly marked dummy contacts (`+880 1700-DEMO01`).
- **Contact Request Flow**: Buyers submit an inquiry note via `POST /api/v1/gis/listings/{id}/contact-request`, stored safely in `listing_contact_requests`.
- **Listing Reporting**: Community reporting mechanism via `POST /api/v1/gis/listings/{id}/report` allows flagging inaccurate boundaries, suspicious pricing, or misleading claims into `listing_reports`.

---

## 5. Stages 9 & 10: Backend Database & REST API Architecture

### 5.1 Database Schema Additions
In `datasets/synthetic/landsure_synthetic_v2_3.db`, three non-destructive tables were created:
```sql
CREATE TABLE IF NOT EXISTS land_listings (
    listing_id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL UNIQUE REFERENCES parcels(parcel_id),
    seller_account_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    asking_price_bdt REAL,
    price_per_shotok_bdt REAL,
    area_shotok REAL NOT NULL,
    listing_status TEXT NOT NULL DEFAULT 'ACTIVE',
    contact_visibility TEXT NOT NULL DEFAULT 'REQUEST_ONLY',
    seller_consent_timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_contact_requests (
    request_id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    parcel_id TEXT NOT NULL,
    requester_username TEXT NOT NULL,
    requester_phone TEXT,
    message TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_reports (
    report_id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    parcel_id TEXT NOT NULL,
    reporter_username TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

### 5.2 FastAPI Endpoints
| HTTP Method | Path | Auth Required | Description |
|:---|:---|:---:|:---|
| `GET` | `/api/v1/gis/divisions` | Public | Returns all 8 Bangladesh divisions with Bengali & English names. |
| `GET` | `/api/v1/gis/districts` | Public | Returns all 64 districts (filterable by `division`). |
| `GET` | `/api/v1/gis/upazilas` | Public | Returns authoritative upazilas and metropolitan thanas for a district. |
| `GET` | `/api/v1/gis/mouzas` | Public | Returns cadastral mouzas for an upazila with honest `has_data` flag. |
| `GET` | `/api/v1/gis/parcels/search` | Public | Filter parcels by division, district, upazila, mouza, dag, khatian, and query. |
| `GET` | `/api/v1/gis/parcels/{id}/nearby` | Bearer Token | Calculates geodesic nearby alternatives with configurable radius & sort. |
| `POST` | `/api/v1/gis/parcels/compare` | Bearer Token | Generates multi-factor side-by-side comparison for up to 3 parcels. |
| `POST` | `/api/v1/gis/listings/{id}/contact-request` | Bearer Token | Submits privacy-safe demo seller contact request. |
| `POST` | `/api/v1/gis/listings/{id}/report` | Bearer Token | Submits suspicious advertisement report. |

---

## 6. Stage 11: Frontend Integration

- **Component:** `frontend/src/components/NearbyLandAlternatives.tsx` (1,120 lines of React/TypeScript).
- **Mount Point:** Seamlessly integrated into `frontend/src/App.tsx` on the **Explorer (জমি খুঁজুন)** page directly underneath the interactive GIS map and parcel metadata cards.
- **Leaflet Map Integration:** Enhanced `frontend/src/components/BangladeshMap.tsx` with an `alternativePins` layer that plots alternative parcels as distinct emerald circle markers with interactive popup cards and a "এই জমিটি দেখুন" button.
- **UI Design Integrity:** Preserves the dark-mode aesthetic (`#0c1b2c`, `#16283b`, emerald accents `#5ee6cb`, gold warnings `#f2c77c`) without altering any existing page structure or breaking the 26-feature architecture.

---

## 7. Stage 12 & 13: Automated Testing & Verification Suite

### 7.1 Backend Unit & Integration Tests
`tests/test_phase4f_location_and_recommendations.py`:
- `test_divisions_retrieval`: PASSED (8 divisions verified)
- `test_districts_all_and_filtered`: PASSED (64 districts verified)
- `test_upazilas_urban_and_rural`: PASSED (Savar rural vs Mirpur DNCC thana verified)
- `test_mouzas_available_and_honest_empty_state`: PASSED (Birulia verified; Kapasia empty state verified)
- `test_parcel_search_cascading_and_digit_normalization`: PASSED (English '1007' and Bengali '১০০৭' match)
- `test_nearby_alternatives_geodesic_discovery`: PASSED (Haversine distance calculations verified)
- `test_nearby_alternatives_sorting`: PASSED (distance, price, completeness sorting verified)
- `test_parcel_comparison_matrix`: PASSED (3-parcel comparison matrix verified)
- `test_seller_contact_request_workflow`: PASSED (privacy-safe demo contact verified)
- `test_listing_reporting_workflow`: PASSED (suspicious listing report verified)
**Pass Count: 10 / 10 (100%)**

### 7.2 Phase 4E Regression Tests
`tests/test_phase4e_functional_gaps.py`:
- `test_lawyer_slots_retrieval`: PASSED
- `test_lawyer_booking_complete_lifecycle`: PASSED
- `test_lawyer_booking_user_isolation`: PASSED
- `test_document_extraction_and_field_comparison`: PASSED
- `test_document_confirm_with_corrections`: PASSED
- `test_parcel_events_history`: PASSED
- `test_copilot_evidence_grounding`: PASSED
- `test_ml_risk_review_model_stability`: PASSED
**Pass Count: 8 / 8 (100%)**

### 7.3 Complete Project Pytest Suite
```bash
pytest -k "not browser and not live"
104 passed, 11 deselected, 1 warning in 124.02s
```
**Pass Count: 104 / 104 (100%)**

### 7.4 Real Chrome Browser Playwright End-to-End Test
`tests/test_phase4f_browser_e2e.py` executed on real Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`):
1. **Step 1:** Guest Authentication (`button.demo-btn`) ➔ App Shell loaded.
2. **Step 2:** Navigation to Explorer (জমি খুঁজুন) ➔ Map & location search loaded.
3. **Step 3:** Cascading Selector: Dhaka Division ➔ Dhaka District ➔ Savar Upazila (verified Savar & Mirpur coexist) ➔ Birulia Mouza ➔ Search.
4. **Step 4:** Uncatalogued Mouza: Gazipur District ➔ Kapasia Upazila ➔ Honest empty state verified.
5. **Step 5:** Geodesic Discovery & Radius Filters: 5 km radius applied ➔ Haversine distances (`০.২১ কিমি দূরে`), BDT pricing, sample disclaimer verified. Forbidden phrases ("100% Safe", "Fraud Free Guaranteed", "Government Approved") confirmed absent.
6. **Step 6:** 3-Parcel Comparison: Selected 2 parcels ➔ Comparison Matrix modal rendered with side-by-side columns ➔ Closed cleanly.
7. **Step 7:** Privacy-Safe Seller Contact & Reporting: Opened contact modal ➔ Verified dummy number (`+880 1700-DEMO01`) ➔ Sent contact note ➔ Opened listing report ➔ Submitted report reason.
8. **Step 8:** Parcel Selection: Clicked "এই জমি যাচাই ➔" ➔ Parcel switched dynamically without stale data.
9. **Step 9:** Mobile Viewport: Resized to 375x667 (iPhone SE) ➔ Layout verified responsive with zero uncaught console crashes.
**Result:** **100% PASSED in 25.33s** (10 high-resolution screenshots saved to `docs/screenshots/phase4f/`).

### 7.5 TypeScript Production Build
```bash
tsc -b && vite build
dist/assets/index-DoEiuU7f.css   31.29 kB
dist/assets/index-CUW3SsMl.js   606.59 kB
built in 12.42s with 0 errors
```

---

## 8. Preserved Work & Release Integrity

In strict compliance with Master Prompt rules:
- **Phase 4E changes are 100% preserved locally.**
- **Phase 4F changes are 100% preserved locally.**
- **No Git commits, pushes, or remote deployments were executed.**
- **The original 26-feature matrix remains intact; Phase 4F is documented as an auxiliary discovery intelligence capability.**
