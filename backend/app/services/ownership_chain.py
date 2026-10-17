from pathlib import Path
import sqlite3
from typing import Optional

from app.services.database import DB_PATH

def get_ownership_chain(parcel_id: str, db_path: Path = DB_PATH) -> dict:
    db_file = Path(db_path).resolve()
    if not db_file.is_file():
        raise FileNotFoundError(f"Database file not found: {db_file}")

    with sqlite3.connect(db_file.as_uri() + "?mode=ro", uri=True) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Fetch parcel info
        parcel_row = cur.execute(
            "SELECT parcel_id, district_code, upazila_code, mouza_code, reference_area_decimal FROM parcels WHERE parcel_id = ?",
            (parcel_id,)
        ).fetchone()

        if not parcel_row:
            raise ValueError(f"Parcel ID {parcel_id} not found")

        # Fetch transactions joined with owners
        tx_rows = cur.execute("""
            SELECT 
                t.transaction_id,
                t.transaction_date,
                t.transaction_type,
                t.transaction_status,
                t.source_document_id,
                s.owner_id AS seller_id,
                COALESCE(s.display_name, t.seller_owner_id) AS seller_name,
                b.owner_id AS buyer_id,
                COALESCE(b.display_name, t.buyer_owner_id) AS buyer_name
            FROM transactions t
            LEFT JOIN owners s ON t.seller_owner_id = s.owner_id
            LEFT JOIN owners b ON t.buyer_owner_id = b.owner_id
            WHERE t.parcel_id = ?
            ORDER BY t.transaction_date ASC, t.transaction_id ASC
        """, (parcel_id,)).fetchall()

        # Fetch active ownership claims
        claims_rows = cur.execute("""
            SELECT 
                c.claim_id,
                c.claim_type,
                c.claim_status,
                c.source_document_id,
                o.owner_id,
                COALESCE(o.display_name, c.owner_id) AS owner_name,
                o.identity_type
            FROM ownership_claims c
            LEFT JOIN owners o ON c.owner_id = o.owner_id
            WHERE c.parcel_id = ?
            ORDER BY c.claim_id ASC
        """, (parcel_id,)).fetchall()

    transactions = [dict(r) for r in tx_rows]
    claims = [dict(r) for r in claims_rows]

    # Sub-registry office name based on upazila/district
    upazila_code = dict(parcel_row).get("upazila_code", "DEMO-U01")
    if upazila_code == "DEMO-U02":
        sub_registry_office = "হাটহাজারী সাব-রেজিস্ট্রি কার্যালয়, চট্টগ্রাম"
    elif upazila_code == "DEMO-U03":
        sub_registry_office = "সিলেট সদর সাব-রেজিস্ট্রি কার্যালয়, সিলেট"
    else:
        sub_registry_office = "সাভার সাব-রেজিস্ট্রি অফিস, ঢাকা"

    # Enrich transactions with full title-chain metadata
    enriched_transactions = []
    years_recorded = []

    for idx, tx in enumerate(transactions):
        tx_date = tx.get("transaction_date") or "২০২৪-০১-১৫"
        year = None
        try:
            year = int(tx_date.split("-")[0])
            years_recorded.append(year)
        except (ValueError, IndexError):
            pass

        # Previous ownership link
        prev_ref = transactions[idx - 1]["transaction_id"] if idx > 0 else "সিএস/আরএস রেকর্ডীয় মূল মালিকানা"
        doc_id = tx.get("source_document_id") or f"LS-DOC-{tx.get('transaction_id', '').replace('LS-TXN-', '')}"
        deed_no = f"দলিল নং {tx.get('transaction_id', '').replace('LS-TXN-', '')}/{(year or 2024)}"

        ttype_raw = tx.get("transaction_type", "DEMO_REFERENCE")
        ttype_bn = "সাফ-কবলা বিক্রয় দলিল" if "SALE" in ttype_raw else ("হেবা / এওয়াজ দলিল" if "HEBA" in ttype_raw else "রেজিস্ট্রিকৃত মূল দলিল")

        status_raw = tx.get("transaction_status", "RECORDED")
        is_competing = status_raw == "COMPETING_CLAIM"

        enriched_transactions.append({
            "transaction_id": tx["transaction_id"],
            "deed_number": deed_no,
            "seller_name": tx.get("seller_name") or "পূর্বতন মালিক",
            "buyer_name": tx.get("buyer_name") or "ক্রেতা / বর্তমান মালিক",
            "registration_date": tx_date,
            "year": year,
            "sub_registry_office": sub_registry_office,
            "transfer_type": ttype_bn,
            "transfer_type_raw": ttype_raw,
            "previous_ownership_reference": prev_ref,
            "supporting_document": doc_id,
            "evidence_confidence": "HIGH (রেজিস্ট্রিকৃত রেকর্ড)" if not is_competing else "CRITICAL (দ্বৈত বিক্রয় বিরোধ)",
            "transaction_status": status_raw,
            "is_competing_claim": is_competing,
            "verification_status": "তথ্য মেলেনি / দ্বৈত দাবি" if is_competing else "তথ্য মিলেছে (RECORDED)",
            "status_code": "MISMATCH" if is_competing else "MATCH",
        })

    # Evidence coverage calculation (Never fabricate 25 years!)
    current_year = 2026
    if years_recorded:
        earliest_year = min(years_recorded)
        latest_year = max(years_recorded)
        evidence_coverage_years = latest_year - earliest_year + 1
    else:
        earliest_year = current_year
        latest_year = current_year
        evidence_coverage_years = 0

    outstanding_years = max(0, 25 - evidence_coverage_years)
    coverage_text_bn = (
        f"{evidence_coverage_years} বছরের ডিজিটাল রেকর্ড সংরক্ষিত রয়েছে ({earliest_year}–{latest_year})। "
        f"২৫ বছরের নিরাপদ ধারাবাহিকতার জন্য বাকি {outstanding_years} বছরের বালাম তল্লাশি (সাব-রেজিস্ট্রি ভলিউম সার্চ) প্রয়োজন।"
        if evidence_coverage_years < 25 else
        f"{evidence_coverage_years} বছরের পূর্ণাঙ্গ মালিকানার রেকর্ড সংরক্ষিত রয়েছে।"
    )

    # Double selling and competing claim analysis
    competing_transactions = [
        tx for tx in enriched_transactions
        if tx["is_competing_claim"]
    ]
    has_competing_claims = len(competing_transactions) > 0

    # Chain continuity & gaps analysis
    continuity_status = "INTACT"
    chain_gaps = []
    risk_notes_bn = []
    risk_notes_en = []

    # Check for seller vs previous buyer mismatch
    for i in range(1, len(enriched_transactions)):
        prev_buyer = enriched_transactions[i - 1]["buyer_name"]
        curr_seller = enriched_transactions[i]["seller_name"]
        if prev_buyer and curr_seller and prev_buyer != curr_seller:
            gap_msg = f"ধাপ #{i} এর বিক্রেতা ({curr_seller}) পূর্ববর্তী ধাপ #{i-1} এর ক্রেতার ({prev_buyer}) সাথে মিলছে না।"
            chain_gaps.append(gap_msg)
            risk_notes_bn.append(f"মালিকানার যোগসূত্র বিচ্ছিন্ন: {gap_msg}")

    if has_competing_claims:
        continuity_status = "COMPETING_CLAIM_DETECTED"
        risk_notes_bn.append(
            f"দ্বৈত দাবি বা বিক্রয় ঝুঁকি চিহ্নিত: {len(competing_transactions)} টি লেনদেনে বিরোধ পাওয়া গেছে। একই বিক্রেতা কর্তৃক একাধিক ক্রেতার অনুকূলে দলিল সৃষ্টির সম্ভাবনা রয়েছে।"
        )
        risk_notes_en.append(
            f"Double selling or competing claim risk: {len(competing_transactions)} conflicting transaction(s) found."
        )

    if len(enriched_transactions) == 0:
        continuity_status = "NO_TRANSACTION_RECORDS"
        risk_notes_bn.append("ঐতিহাসিক হস্তান্তরের কোনো দলিল রেকর্ড ডাটাবেজে পাওয়া যায়নি।")
        risk_notes_en.append("No historical deed transaction records found in database.")

    # Distinct current owners
    unique_owners = {c["owner_id"]: c["owner_name"] for c in claims if c.get("claim_status") == "ACTIVE"}
    is_multi_owner = len(unique_owners) > 1

    # The 4 Plain-Bangla Buyer Explanations
    bangla_four_questions = {
        "what_it_means": {
            "question_bn": "১. এই তথ্যের অর্থ কী?",
            "answer_bn": (
                "জমিটি অতীতে কার কার হাত ঘুরে বর্তমান বিক্রেতার কাছে এসেছে তার ধারাবাহিক দলিলভিত্তিক ইতিহাস। "
                f"বর্তমানে ডাটাবেজে {evidence_coverage_years} বছরের রেকর্ড লব্ধ রয়েছে।"
            )
        },
        "why_it_matters": {
            "question_bn": "২. এটি কেন গুরুত্বপূর্ণ?",
            "answer_bn": (
                "বাংলাদেশে জমি কেনার আগে কমপক্ষে ২৫ বছরের বায়া দলিল ও মালিকানার ইতিহাস নিখুঁত হওয়া বাধ্যতামূলক। "
                "মাঝখানে কোনো ভুয়া দলিল বা অসম্পূর্ণ হস্তান্তর থাকলে এবং বিক্রেতার নামের আগের মালিকের সাথে যোগসূত্র না থাকলে "
                "প্রকৃত মালিক যে কোনো সময় আদালতে মামলা করে ক্রয়কৃত দলিল বাতিল করাতে পারেন।"
            )
        },
        "is_there_a_problem": {
            "question_bn": "৩. এখানে কোনো সমস্যা আছে কি?",
            "answer_bn": (
                (f"⚠ মারাত্মক ঝুঁকি: এই পার্সেলটিতে {len(competing_transactions)} টি দ্বৈত দাবি (Double-Selling / Conflicting Claim) চিহ্নিত হয়েছে! "
                 "একই বিক্রেতা কর্তৃক একাধিক ক্রেতার অনুকূলে দলিল সম্পাদনের আলামত রয়েছে। " if has_competing_claims else
                 "নথিবদ্ধ লেনদেনগুলোতে কোনো সমান্তরাল দ্বৈত বিক্রয়ের রেকর্ড পাওয়া যায়নি। ") +
                (f"তবে মাত্র {evidence_coverage_years} বছরের রেকর্ড ডাটাবেজে রয়েছে, পূর্ণ ২৫ বছরের ইতিহাস যাচাই বাকি।" if evidence_coverage_years < 25 else "")
            ),
            "status_code": "MISMATCH" if has_competing_claims else ("NEEDS_REVIEW" if evidence_coverage_years < 25 else "MATCH"),
        },
        "what_to_do_now": {
            "question_bn": "৪. এখন আমাকে কী করতে হবে?",
            "answer_bn": (
                f"১) সংশ্লিষ্ট {sub_registry_office}-এ বিজ্ঞ দলিল লেখক বা আইনজীবীর মাধ্যমে বিগত ২৫ বছরের বালাম বই তল্লাশি (Search Slip) দিন।\n"
                "২) বিক্রেতার কাছ থেকে পূর্ববর্তী সকল বায়া দলিলের মূল সার্টিফায়েড কপি বুঝে নিন।\n"
                + ("৩) দ্বৈত দাবির নিষ্পত্তি না হওয়া পর্যন্ত এই পার্সেল ক্রয়ের জন্য কোনো বায়না বা টাকা লেনদেন করবেন না!" if has_competing_claims else
                   "৩) কোনো হস্তান্তরে অপ্রাপ্তবয়স্ক বা সহ-শরিক বাদ পড়েছে কিনা তা খতিয়ে দেখুন।")
            )
        }
    }

    return {
        "parcel_id": parcel_id,
        "continuity_status": continuity_status,
        "double_selling_risk": has_competing_claims,
        "evidence_coverage_years": evidence_coverage_years,
        "earliest_record_year": earliest_year,
        "latest_record_year": latest_year,
        "outstanding_years_to_25": outstanding_years,
        "coverage_badge_bn": f"{evidence_coverage_years} বছরের রেকর্ড লব্ধ — বাকি {outstanding_years} বছরের বালাম তল্লাশি প্রয়োজন" if outstanding_years > 0 else f"{evidence_coverage_years} বছরের রেকর্ড লব্ধ",
        "coverage_text_bn": coverage_text_bn,
        "total_recorded_transactions": len(enriched_transactions),
        "competing_transactions_count": len(competing_transactions),
        "active_claimants_count": len(unique_owners),
        "is_multiple_co_owners": is_multi_owner,
        "transfers": enriched_transactions,
        "transactions_timeline": enriched_transactions,
        "chain_gaps": chain_gaps,
        "active_ownership_claims": claims,
        "risk_signals_bn": risk_notes_bn,
        "risk_signals_en": risk_notes_en,
        "bangla_four_questions": bangla_four_questions,
        "synthetic": True,
        "officially_verified": False,
        "disclaimer": (
            "মালিকানা ধারাবাহিকতা ও দ্বৈত বিক্রয় সংক্রান্ত বিশ্লেষণ কৃত্রিম ডাটাবেজ ভিত্তিক। "
            "চূড়ান্ত ক্রয়ের পূর্বে সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিসে বিগত ২৫ বছরের বালাম তল্লাশি ও মূল বায়া দলিল যাচাই বাধ্যতামূলক।"
        )
    }
