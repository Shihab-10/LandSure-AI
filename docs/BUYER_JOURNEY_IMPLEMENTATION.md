# LandSure AI — Buyer Verification Journey Implementation Report (Phase 4A)

**Target Problem:** P5 — Check Before You Buy (জমি ক্রয়ের পূর্বে প্রমাণভিত্তিক যাচাই)  
**System Status:** Phase 4A Fully Implemented & Verified Locally  
**Test Suite:** 78/78 Automated Tests Passing (100% Pass Rate), including Real Chrome Playwright E2E Tests  
**Frontend Stack:** React 18 + TypeScript + Vite (Port 5173)  
**Backend Stack:** Python 3.13 + FastAPI + SQLite (Port 8000)  
**ML Asset Baseline:** Router V4 (`landsure_feature_router_v4.joblib`), Safety Gate V2 (`landsure_safety_gate_v2.joblib`), Parcel Review V2 (`logistic_regression_v2.joblib`)  

---

## 1. Executive Summary

In Phase 4A, LandSure AI transitioned from a collection of isolated land-intelligence features into a single, cohesive, user-friendly **Land Buyer Verification Journey** ("Check Before You Buy" / P5) engineered for ordinary Bangladeshi land buyers.

Key transformations implemented:
1. **Single Parcel Workspace Context (`selectParcel`)**: Established a synchronized, persistent parcel context across all 26 features. When switching parcels, stale data is immediately cleared to prevent cross-parcel data bleed.
2. **Simplified Plain Bengali Language**: Removed intimidating engineering jargon (`Synthetic Geometry` ➔ `জমির আনুমানিক অবস্থান`, `Confidence threshold` ➔ `নিরাপত্তা স্তর`, `Evidence Gap` ➔ `আরও যে তথ্য যাচাই করতে হবে`, `Trust Passport` ➔ `জমি যাচাই প্রতিবেদন`).
3. **Structured 7-Destination Sidebar**: Streamlined navigation into 7 primary workflows (জমি খুঁজুন, আমার জমি, জমি যাচাই, দলিল পরীক্ষা, ভূমি সহকারী, আইনজীবীর পরামর্শ, যাচাই প্রতিবেদন) while fully preserving access to all 26 features.
4. **Complete 16-Step Connected Journey**: Verified with real Chrome Playwright automation covering login, universal search, interactive OSM map, 4-question plain Bengali overview, cross-survey comparisons, 25+ years title chain, deed OCR extraction, mutation, tax, possession checks, legal dispute checklist, ML 17-feature risk assessment, context-aware AI assistant, lawyer consultation, and tamper-evident Trust Passport generation.

---

## 2. The 16-Step Buyer Verification Journey

| Step # | Journey Phase | User Action / Experience | Connected Backend Endpoint(s) | Functional Status |
|:---:|:---|:---|:---|:---:|
| **1** | **One-Click Demo Login** | Visitor enters workspace with a single click; issued 30-min read-only JWT; session persisted in `localStorage`. | `POST /api/v1/auth/demo` | ✅ Functional & Tested |
| **2** | **Find Land (Universal Search)** | Search by Parcel ID (`LS-PARCEL-000001`), Dag number (`1007`), Khatian (`111`), Mouza (`বিরুলিয়া`), Upazila (`সাভার`), or District (`ঢাকা`). | `GET /api/v1/gis/search?q={query}` | ✅ Functional & Tested |
| **3** | **Show Map First** | Immediate Leaflet map zoom to parcel polygon with OSM Standard basemap, centroid marker, and coordinates. | `GET /api/v1/gis/parcels/{id}` | ✅ Functional & Tested |
| **4** | **Simple Land Overview** | Plain Bengali card answering 4 core questions: "এটি কোন জমি?", "জমিটি কোথায়?", "রেকর্ডে কতটুকু জমি আছে?", "আর কী কী যাচাই করা বাকি?". | `GET /api/v1/parcels/{id}` | ✅ Functional & Tested |
| **5** | **Survey & Khatian Comparison** | Chronological record comparison across British CS, Pakistan SA, Bangladesh RS, and modern BS surveys with area change breakdown. | `GET /api/v1/parcels/{id}/surveys`<br/>`GET /api/v1/parcels/{id}/survey-comparison` | ✅ Functional & Tested |
| **6** | **Ownership History (25+ Yrs)** | Unbroken 25+ year title chain, timeline of registered deeds, and algorithmic double-selling / competing claim detection. | `GET /api/v1/parcels/{id}/ownership-chain` | ✅ Functional & Tested |
| **7** | **Original Deed Review & OCR** | Multi-page deed upload, Bengali text extraction, structured field review, and parcel cross-matching. | `POST /api/v1/documents/upload`<br/>`POST /api/v1/documents/extract`<br/>`POST /api/v1/documents/confirm` | ✅ Functional & Tested |
| **8** | **Mutation Verification** | Mutation khatian status (খারিজ খতিয়ান), DCR receipt payment status, and AC Land office guidance. | `GET /api/v1/parcels/{id}/mutations` | ✅ Functional & Tested |
| **9** | **Land Development Tax (LD Tax)** | Tax dakhila clearance status, financial year coverage, and statutory registration cost calculator. | `GET /api/v1/parcels/{id}/tax-verification`<br/>`POST /api/v1/calculator/registration-cost` | ✅ Functional & Tested |
| **10** | **Boundary, Road Access & Possession** | Mouza map reference, road access path indicator, and warning that satellite imagery does not prove peaceful possession. | `GET /api/v1/parcels/{id}/possession-assessment` | ✅ Functional & Tested |
| **11** | **Legal & Inheritance Checklist** | Verification checklist for civil suits, court injunctions, warisan (heir) certificates, and co-owner consent. | `GET /api/v1/parcels/{id}/legal-checklist`<br/>`GET /api/v1/parcels/{id}/co-owners` | ✅ Functional & Tested |
| **12** | **Smart ML Risk Review** | 17-feature Logistic Regression risk inference (`logistic_regression_v2.joblib`), Readiness Score (0-100), and Gap Navigator. | `GET /api/v1/parcels/{id}/ml-review`<br/>`GET /api/v1/parcels/{id}/gap-navigator` | ✅ Functional & Tested |
| **13** | **AI Assistant with Parcel Context** | Conversational assistant pre-loaded with active parcel ID and 6 one-click Bengali questions with database provenance links. | `POST /api/v1/copilot/evidence` | ✅ Functional & Tested |
| **14** | **Lawyer Consultation** | Curated directory of 50 verified legal counsel profiles with appointment availability and Bar Council IDs. | `GET /api/v1/lawyers`<br/>`GET /api/v1/lawyers/{id}/slots` | ✅ Functional & Tested |
| **15** | **Final Verification Report** | Evidence-linked Land Trust Passport summary table and download of tamper-evident SHA-256 PDF. | `GET /api/v1/parcels/{id}/trust-passport` | ✅ Functional & Tested |
| **16** | **Zero Stale Data on Parcel Switch** | Switching to another parcel (`LS-PARCEL-000002`) immediately clears state across all modules, and restores on F5 refresh. | Client-side reactive workspace | ✅ Functional & Tested |

---

## 3. Single Parcel Workspace State Management

To prevent data bleed and redundant inputs, `frontend/src/App.tsx` and child components (`BangladeshMap.tsx`, `BuyerJourney.tsx`, `DocumentIntelligence.tsx`) adhere to the unified workspace protocol:

```typescript
function selectParcel(newId: string) {
  const cleanId = newId.trim().toUpperCase();
  if (!cleanId) return;

  // 1. Immediately invalidate all previous data states
  setParcelDetails(null);
  setMlReview(null);
  setGapNav(null);
  setSurveyComp(null);
  setOwnershipChain(null);
  setMutationsList(null);
  setDocsList(null);
  setTaxVerif(null);
  setEventsList(null);
  setCopilotResult(null);

  // 2. Update stable identifier and persist to localStorage
  setParcelId(cleanId);
  try {
    localStorage.setItem("landsure_selected_parcel_id", cleanId);
  } catch {}

  // 3. Immediately fetch fresh metadata for the newly selected parcel
  if (token) {
    apiRequest<{ parcel?: Record<string, unknown> }>(`/api/v1/parcels/${encodeURIComponent(cleanId)}`, { token })
      .then(d => setParcelDetails(d.parcel ?? d))
      .catch(() => null);
  }
}
```

### Topbar Workspace Chip
A persistent status chip in the top navigation displays:
`[📍 LS-PARCEL-000001 | বিরুলিয়া আবাসিক জমি]`
Clicking this chip instantly opens the universal search bar for parcel switching.

---

## 4. Bengali Language Simplification Matrix

| Technical English Term | Old Bengali Translation | Simplified Plain Bengali | Contextual Placement |
|:---|:---|:---|:---|
| **Synthetic Geometry** | সিন্থেটিক জ্যামিতি | **জমির আনুমানিক অবস্থান** | Map polygon disclaimer & boundaries |
| **Demo Record** | খসড়া ডেমো ডাটা | **নমুনা রেকর্ড (যাচাইযোগ্য)** | Parcel metadata card |
| **Ownership Chain** | মালিকানা চেইন | **মালিকানার ইতিহাস** | Step 5 title & navigation |
| **Evidence Gap** | এভিডেন্স গ্যাপ | **আরও যে তথ্য যাচাই করতে হবে** | Step 4 & Gap Navigator |
| **Mutation Record** | মিউটেশন | **নামজারি (খারিজ খতিয়ান)** | Step 7 title & assistant prompt |
| **Risk Score** | এমএল স্কোর | **ঝুঁকির মূল্যায়ন** | Step 11 & overview card |
| **Trust Passport** | ট্রাস্ট পাসপোর্ট | **জমি যাচাই প্রতিবেদন** | Step 15 & sidebar |
| **AI Copilot** | এআই কোপাইলট | **ভূমি সহকারী** | Step 13 & sidebar |

---

## 5. Automated E2E Test Results

The new dedicated Playwright browser test suite was executed against local Chrome (`tests/test_phase4a_buyer_journey_e2e.py`):

```bash
============================= test session starts =============================
platform win32 -- Python 3.13.2, pytest-9.1.1, pluggy-1.7.0 -- C:\Users\shiha\OneDrive\Desktop\LandSure-AI\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\shiha\OneDrive\Desktop\LandSure-AI
plugins: anyio-4.15.1
collecting ... collected 1 item

tests/test_phase4a_buyer_journey_e2e.py::test_complete_buyer_journey_16_steps_e2e PASSED [100%]

============================= 1 passed in 24.08s ==============================
```

Full repository regression test results:
```bash
================== 78 passed, 1 warning in 83.44s (0:01:23) ===================
```

Screenshots captured and stored in `docs/screenshots/`:
- `buyer_journey_step2_map.png` — Map-first parcel display with OSM basemap.
- `buyer_journey_step3_overview.png` — Plain Bengali Land Overview answering the 4 questions.
- `buyer_journey_step11_risk.png` — 17-feature ML Risk Review and Gap Navigator.
- `buyer_journey_step14_passport.png` — On-screen Land Trust Passport verification findings.

---

## 6. Real-World Limitations & External Blockers

In compliance with strict truthfulness requirements, the following live integrations remain external blockers:
1. **Official Cadastral Survey Mouza Maps**: The Directorate of Land Records and Surveys (DLRS) has not published vector GIS coordinates for all 64 districts. Parcel boundaries shown in the application are approximate geographic representations engineered for workflow validation.
2. **Ministry of Land Live Mutation API (`mutation.land.gov.bd`)**: Direct real-time e-Mutation verification requires government-to-business (G2B) API agreements.
3. **Live LD Tax API (`ldtax.gov.bd`)**: Automated dakhila tax verification requires official tax server access tokens.
4. **Physical Court Records & Injunctions**: Bangladeshi civil suits and court injunctions require manual search in District Judge Court records or future Supreme Court e-Courts digitization.
5. **On-Ground Possession & Physical Survey**: Satellite and map data cannot prove peaceful, legal possession. Physical inspection by a certified amin (surveyor) remains mandatory.
