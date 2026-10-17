# LandSure AI — Alignment with P5: "Check Before You Buy"

**Competition Track:** P5 — Pre-Purchase Land Due Diligence & Buyer Risk Intelligence  
**Document Version:** 1.0  
**Project:** LandSure AI (`Shihab-10/LandSure-AI`)  

---

## 1. P5 Problem Context & Core Requirements

In Bangladesh, over 70% of pending civil litigations originate from land disputes. A typical prospective land buyer is vulnerable to:
- Purchasing land from a seller who lacks mutated title (নামজারি ছাড়া জমি বিক্রয়).
- Discrepancies between historical Cadastral Survey (CS), Revisional Survey (RS), and current Bangladesh Survey (BS) records.
- Fake or duplicate deeds (জাল বা বায়া দলিলের সমস্যা).
- Hidden co-owner or inheritance claims (ওয়ারিশানদের বঞ্চিত করে বিক্রয়).
- Outstanding Land Development Tax (বকেয়া ভূমি উন্নয়ন কর).
- High surprise costs during deed registration (স্ট্যাম্প ডিউটি ও উৎসে করের ভুল হিসাব).
- Unverifiable ground possession or court injunctions.

**P5 Goal:** Provide an evidence-grounded, multi-layer verification platform enabling a buyer to complete rigorous due diligence *before* parting with earnest money.

---

## 2. Complete P5 End-to-End Buyer Journey

LandSure AI maps directly into the 12-step **Check Before You Buy** workflow:

```
[1. Parcel Search] ➔ [2. Bangladesh GIS Map] ➔ [3. CS/SA/RS/BS Survey History]
         │
         ▼
[4. 25-Year Ownership Chain] ➔ [5. Deed Review & Doc AI] ➔ [6. Namjari / Mutation]
         │
         ▼
[7. Land Tax / Dakhila] ➔ [8. Legal Case & Warisan Checklist] ➔ [9. ML Risk Assessment]
         │
         ▼
[10. Registration Cost] ➔ [11. Lawyer Consultation] ➔ [12. Evidence Trust Passport]
```

---

## 3. Feature-by-Feature Alignment Matrix

| Step | P5 Requirement | LandSure AI Feature ID & Name | Implementation Status | How It Fulfills P5 |
|:---:|:---|:---|:---:|:---|
| **1** | **Parcel Discovery** | **Feature 1:** Unified Digital Parcel Identity | ✅ Production-Ready | Allows search by ID or location across 700 demonstration parcels; shows district, upazila, mouza, area, and classification. |
| **2** | **Location & Cadastral GIS** | **Feature 4 & 21:** Interactive Map & Parcel Explorer | ✅ Production-Ready | Leaflet map with CartoDB/OSM basemap; centroid resolution for 64 districts; parcel polygon boundary display. |
| **3** | **Historical Survey Discrepancies** | **Feature 2 & 15:** Cross-Survey Khatian & Survey Intelligence | ✅ Production-Ready | Side-by-side comparison of CS, SA, RS, and BS records; automatically flags area drift and dag renumbering issues. |
| **4** | **Chain of Title (25 Years)** | **Feature 3 & 6:** Survey Time Machine & Double-Selling Risk | ✅ Production-Ready | Chronological timeline of deeds, transfers, and probate; competing claims detector flags duplicate sales. |
| **5** | **Document Intelligence** | **Feature 8 & 17:** Document Integrity & Bangla Deed AI | ✅ Production-Ready | Cryptographic SHA-256 hash checking; PDF text layer extraction; extracts 18 deed fields; user review editor. |
| **6** | **Mutation (Namjari) Audit** | **Feature 7:** Namjari / Mutation Verification | ✅ Functional Demo | Checks mutation case numbers, approval dates, mutation khatian numbers, and AC Land review notes. |
| **7** | **Tax (Khajna) Status** | **Feature 9:** Land Development Tax Verification | ⚠️ Transparent Demo | Displays dakhila receipt numbers, fiscal years, and payment dates with explicit notice to check `ldtax.gov.bd`. |
| **8** | **Legal & Co-Owner Rights** | **Feature 10 & 11:** Inheritance & Legal Case Checklists | ⚠️ Advisory Guideline | Pre-purchase questionnaire covering warisan rights, Muslim/Hindu succession rules, and District Court searches. |
| **9** | **Possession & Ground Risk** | **Feature 12:** Road Access & Ground Possession Risk | ⚠️ Field Survey Alert | Advisory alert emphasizing physical site visit to confirm peaceful possession and road access. |
| **10** | **ML Risk Scoring** | **Feature 5 & 16:** Smart Land Verification & Gap Navigator | ✅ Production-Ready | 17-feature Logistic Regression V2 evaluates risk level (LOW vs HIGH); Gap Navigator shows readiness score (0-100%). |
| **11** | **Statutory Cost Breakdown** | **Feature 23:** Registration Cost Calculator | ✅ Production-Ready | Bangladesh Stamp Act & Registration Act statutory calculator: Stamp Duty (1.5%), Reg Fee (1%), Local Tax, AIT. |
| **12** | **Legal Counsel & Certification** | **Feature 24 & 13:** Lawyer Connect & Trust Passport PDF | ✅ Production-Ready | Directory of 50 vetted land lawyers; one-click downloadable Land Trust Passport PDF summarizing all evidence. |
| **+** | **Conversational Assistant** | **Feature 18 & 19:** LandSure AI Assistant & Voice I/O | ✅ Production-Ready | Natural conversation in Bengali, English, and Banglish; grounded answers referencing SQLite database records; microphone input & speech output. |

---

## 4. Key Differentiators of LandSure AI in P5

1. **Evidence-Linked Provenance (Not Hallucinated AI):**  
   Every claim made by the platform is tied to an explicit database row or document span (`transactions`, `survey_records`, `mutations`). The platform explicitly refuses to invent dispute-free certifications.
2. **Offline-Capable ML Models:**  
   Query Router V4 and Safety Gate V2 run locally in Python without external API calls, maintaining high privacy and sub-millisecond response times.
3. **Bangla-First Bilingual Architecture:**  
   Complete support for Bengali language, Bengali numerals (০-৯ to 0-9), local land units (কাঠা, বিঘা, শতাংশ), and voice interaction.
4. **Transparent Boundaries on Government Integration:**  
   Where live government APIs (e.g., `ldtax.gov.bd`, `mutation.land.gov.bd`, DLRS mouza GIS) are unavailable to the public, the platform provides honest demo data with transparent advisory disclaimers rather than pretending to have live government feeds.

---

## 5. Relationship Between P5 and P3 (Fraud Detection)

While P5 represents the comprehensive pre-purchase due-diligence workflow for buyers, **P3 (Fraud & Risk Detection)** is natively retained as the core intelligence engine underpinning Step 9:
- Competing claims detection (দ্বৈত বিক্রয় সনাক্তকরণ)
- Unbroken chain analysis (বায়া দলিলের অবিচ্ছিন্নতা)
- 17-feature ML Risk Review V2

The application does not compromise either track; P3 models serve as the analytical engine inside the P5 consumer workflow.
