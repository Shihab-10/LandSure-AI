import sqlite3
from typing import Dict, Any, List
from app.services.database import get_parcel, get_related, connect_db

SURVEY_ORDER = {
    "CS": 1,
    "SA": 2,
    "RS": 3,
    "BS_BDS": 4,
    "CITY_SURVEY": 5,
    "MUTATION": 6,
}

SURVEY_NAMES_BN = {
    "CS": "সিএস জরিপ (Cadastral Survey)",
    "SA": "এসএ জরিপ (State Acquisition Survey)",
    "RS": "আরএস জরিপ (Revisional Survey)",
    "BS_BDS": "বিএস / বিডিএস জরিপ (Bangladesh Survey)",
    "CITY_SURVEY": "সিটি জরিপ (City Survey)",
    "MUTATION": "হাল নামজারি খতিয়ান (Latest Mutation Khatian)",
}

SURVEY_EPOCHS = {
    "CS": "১৯১০–১৯৪০ (ব্রিটিশ আমল)",
    "SA": "১৯৫৬–১৯৬৩ (পাকিস্তান আমল)",
    "RS": "১৯৬৬–১৯৮৫ (পূর্ব পাকিস্তান/বাংলাদেশ)",
    "BS_BDS": "১৯৯৮–বর্তমান (ডিজিটাল বাংলাদেশ জরিপ)",
    "CITY_SURVEY": "১৯৯৫–২০০০ (সিটি জরিপ অঞ্চল)",
    "MUTATION": "হালনাগাদ রেকর্ড (চলতি অর্থবছর)",
}

SURVEY_SOURCES = {
    "CS": "জেলা রেকর্ড রুম ও ডিসি অফিস (District Collectorate Record Room)",
    "SA": "জেলা রেকর্ড রুম / মহাফেজখানা",
    "RS": "উপজেলা সেটেলমেন্ট অফিস / জেলা রেকর্ড রুম",
    "BS_BDS": "ডিজিটাল ল্যান্ড রেকর্ড ও উপজেলা সেটেলমেন্ট অফিস",
    "CITY_SURVEY": "মেট্রোপলিটন জোনাল সেটেলমেন্ট অফিস",
    "MUTATION": "উপজেলা সহকারী কমিশনার (ভূমি) অফিস (e-Mutation Portal)",
}

def survey_comparison(parcel_id: str) -> Dict[str, Any]:
    parcel = get_parcel(parcel_id)
    if not parcel:
        parcel = {"parcel_id": parcel_id, "reference_area_decimal": "10.0"}

    ref_area = float(parcel.get("reference_area_decimal", 10.0))
    mouza_name = parcel.get("mouza_name_bn", "বিরুলিয়া")
    dist_code = parcel.get("district_code", "DEMO-D01")
    jl_no = "৪৫" if dist_code == "DEMO-D01" else ("১৮" if dist_code == "DEMO-D02" else "৫")
    land_class = parcel.get("land_classification_bn", "নাল জমি (কৃষি)")

    with connect_db() as db:
        # Fetch surveys joined with owners
        survey_rows = db.execute("""
            SELECT s.*, o.display_name AS owner_display_name
            FROM survey_records s
            LEFT JOIN owners o ON s.recorded_owner_id = o.owner_id
            WHERE s.parcel_id = ?
        """, (parcel_id,)).fetchall()

        # Fetch mutation records
        mut_rows = db.execute("""
            SELECT m.*, o.display_name AS mutation_owner_name
            FROM mutations m
            LEFT JOIN owners o ON m.owner_id = o.owner_id
            WHERE m.parcel_id = ?
            ORDER BY m.mutation_date DESC
        """, (parcel_id,)).fetchall()

        mappings = db.execute("""
            SELECT * FROM survey_correspondences WHERE parcel_id = ?
        """, (parcel_id,)).fetchall()

    surveys = [dict(r) for r in survey_rows]
    mutations = [dict(r) for r in mut_rows]
    correspondences = [dict(r) for r in mappings]

    # Format survey records with rich domain attributes
    enriched_surveys: List[Dict[str, Any]] = []
    available_surveys = []

    for s in surveys:
        stype = s.get("survey_type", "")
        owner_name = s.get("owner_display_name") or s.get("recorded_owner_id") or "অজ্ঞাত মালিক"
        area = float(s.get("area_decimal", ref_area))
        presence = s.get("record_presence", "AVAILABLE")

        rec = {
            "survey_record_id": s.get("survey_record_id"),
            "survey_type": stype,
            "survey_name": SURVEY_NAMES_BN.get(stype, stype),
            "khatian_no": s.get("khatian_no") or "—",
            "dag_no": s.get("dag_no") or "—",
            "owner_name": owner_name,
            "land_area": f"{area:.2f} শতাংশ",
            "area_decimal": area,
            "land_classification": land_class,
            "mouza_name": mouza_name,
            "jl_number": jl_no,
            "record_date": SURVEY_EPOCHS.get(stype, "ঐতিহাসিক রেকর্ড"),
            "evidence_source": SURVEY_SOURCES.get(stype, "সরকারি রেকর্ড রুম"),
            "record_presence": presence,
            "verification_status": "তথ্য মিলেছে (AVAILABLE)" if presence == "AVAILABLE" else "তথ্য পাওয়া যায়নি (MISSING)",
            "status_code": "MATCH" if presence == "AVAILABLE" else "MISSING",
        }
        enriched_surveys.append(rec)
        if presence == "AVAILABLE":
            available_surveys.append(rec)

    enriched_surveys.sort(key=lambda r: SURVEY_ORDER.get(r["survey_type"], 99))
    available_surveys.sort(key=lambda r: SURVEY_ORDER.get(r["survey_type"], 99))

    # Add City Survey entry (Explicitly indicate whether applicable/present)
    enriched_surveys.append({
        "survey_record_id": f"LS-SURVEY-{parcel_id}-CITY",
        "survey_type": "CITY_SURVEY",
        "survey_name": SURVEY_NAMES_BN["CITY_SURVEY"],
        "khatian_no": "— (অপ্রযোজ্য / নথিবদ্ধ নয়)",
        "dag_no": "—",
        "owner_name": "—",
        "land_area": "—",
        "area_decimal": None,
        "land_classification": land_class,
        "mouza_name": mouza_name,
        "jl_number": jl_no,
        "record_date": SURVEY_EPOCHS["CITY_SURVEY"],
        "evidence_source": SURVEY_SOURCES["CITY_SURVEY"],
        "record_presence": "NOT_APPLICABLE_OR_MISSING",
        "verification_status": "তথ্য পাওয়া যায়নি / রেকর্ড প্রযোজ্য নয়",
        "status_code": "MISSING",
    })

    # Add Latest Mutation Khatian entry
    latest_mut = mutations[0] if mutations else None
    latest_bs = next((s for s in reversed(available_surveys) if s["survey_type"] == "BS_BDS"), None)
    if latest_mut:
        mut_khatian = f"মু-{latest_mut.get('mutation_id', '').replace('LS-MUT-', '')}/২০২৩"
        mut_owner = latest_mut.get("mutation_owner_name") or parcel.get("owner_name") or "হাল রেকর্ডীয় মালিক"
        enriched_surveys.append({
            "survey_record_id": latest_mut.get("mutation_id"),
            "survey_type": "MUTATION",
            "survey_name": SURVEY_NAMES_BN["MUTATION"],
            "khatian_no": mut_khatian,
            "dag_no": latest_bs["dag_no"] if latest_bs else "—",
            "owner_name": mut_owner,
            "land_area": f"{latest_bs['area_decimal']:.2f} শতাংশ" if latest_bs else f"{ref_area:.2f} শতাংশ",
            "area_decimal": latest_bs["area_decimal"] if latest_bs else ref_area,
            "land_classification": land_class,
            "mouza_name": mouza_name,
            "jl_number": jl_no,
            "record_date": latest_mut.get("mutation_date", "২০২৪-০২-১০"),
            "evidence_source": SURVEY_SOURCES["MUTATION"],
            "record_presence": "AVAILABLE",
            "verification_status": "তথ্য মিলেছে (APPROVED)",
            "status_code": "MATCH",
        })
    else:
        enriched_surveys.append({
            "survey_record_id": None,
            "survey_type": "MUTATION",
            "survey_name": SURVEY_NAMES_BN["MUTATION"],
            "khatian_no": "—",
            "dag_no": "—",
            "owner_name": "—",
            "land_area": "—",
            "area_decimal": None,
            "land_classification": land_class,
            "mouza_name": mouza_name,
            "jl_number": jl_no,
            "record_date": "—",
            "evidence_source": SURVEY_SOURCES["MUTATION"],
            "record_presence": "MISSING",
            "verification_status": "আরও যাচাই প্রয়োজন (নামজারি রেকর্ড অনুপস্থিত)",
            "status_code": "NEEDS_REVIEW",
        })

    # Step-by-step Survey Epoch Transitions and Discrepancies
    dag_transitions = []
    area_discrepancies = []
    owner_differences = []

    for prev, curr in zip(available_surveys, available_surveys[1:]):
        # Dag changes
        if prev.get("dag_no") != curr.get("dag_no"):
            dag_transitions.append({
                "from_survey": prev["survey_type"],
                "to_survey": curr["survey_type"],
                "from_dag": prev["dag_no"],
                "to_dag": curr["dag_no"],
                "transition_note_bn": f"{prev['survey_type']} দাগ {prev['dag_no']} হতে {curr['survey_type']} দাগ {curr['dag_no']} (জরিপভিত্তিক স্বাভাবিক রূপান্তর)",
            })

        # Area differences
        prev_a = prev.get("area_decimal")
        curr_a = curr.get("area_decimal")
        if prev_a is not None and curr_a is not None:
            diff = round(curr_a - prev_a, 2)
            if abs(diff) > 0.01:
                area_discrepancies.append({
                    "from_survey": prev["survey_type"],
                    "to_survey": curr["survey_type"],
                    "from_area": prev_a,
                    "to_area": curr_a,
                    "difference_decimal": diff,
                    "status_code": "MISMATCH",
                    "explanation_bn": (
                        f"{prev['survey_type']} রেকর্ডে {prev_a:.2f} শতাংশ হতে {curr['survey_type']} রেকর্ডে {curr_a:.2f} শতাংশ "
                        f"({'+' if diff > 0 else ''}{diff:.2f} শতাংশের ফারাক)। "
                        "এটি জরিপকালীন বাউন্ডারি পরিমাপের ব্যবধান হতে পারে। ক্রয়ের পূর্বে সরেজমিন পরিমাপ আবশ্যক।"
                    ),
                })

        # Owner differences
        if prev.get("owner_name") != curr.get("owner_name"):
            owner_differences.append({
                "from_survey": prev["survey_type"],
                "to_survey": curr["survey_type"],
                "from_owner": prev["owner_name"],
                "to_owner": curr["owner_name"],
                "explanation_bn": f"{prev['survey_type']} আমলের মালিক {prev['owner_name']} হতে {curr['survey_type']} আমলে {curr['owner_name']}-এ রূপান্তর। বায়া দলিল ও উত্তরাধিকার যোগসূত্র তল্লাশি প্রয়োজন।",
            })

    # The 4 Plain-Bangla Buyer Explanations
    has_area_issue = len(area_discrepancies) > 0
    bangla_four_questions = {
        "what_it_means": {
            "question_bn": "১. এই তথ্যের অর্থ কী?",
            "answer_bn": (
                "ব্রিটিশ আমলের সিএস (১৯১০) থেকে শুরু করে পাকিস্তান আমলের এসএ (১৯৬২), "
                "বাংলাদেশ আমলের আরএস এবং আধুনিক বিএস জরিপ ও হাল নামজারি খতিয়ান পর্যন্ত "
                "জমির দাগ নম্বর, আয়তন ও মালিকানার ঐতিহাসিক ধারাবাহিকতা এখানে তুলে ধরা হয়েছে।"
            )
        },
        "why_it_matters": {
            "question_bn": "২. এটি কেন গুরুত্বপূর্ণ?",
            "answer_bn": (
                "বাংলাদেশে জমি কেনার প্রধান শর্ত হলো খতিয়ানের ধারাবাহিক যোগসূত্র (Chain of Khatian)। "
                "যদি সিএস বা আরএস দাগের সাথে বর্তমান বিএস দাগের সঠিক মিল না থাকে অথবা কোনো জরিপে আয়তন আকস্মিকভাবে কমে যায়, "
                "তবে ভবিষ্যতে সীমানা বিরোধ বা সরকারের খাস জমিতে অন্তর্ভুক্তি সংক্রান্ত মারাত্মক আইনি জটিলতা তৈরি হতে পারে।"
            )
        },
        "is_there_a_problem": {
            "question_bn": "৩. এখানে কোনো সমস্যা আছে কি?",
            "answer_bn": (
                f"পার্সেল {parcel_id}-এ " + (
                    f"আরএস ও বিএস রেকর্ডের মধ্যে {area_discrepancies[0]['difference_decimal']:+.2f} শতাংশ আয়তনের তারতম্য চিহ্নিত হয়েছে। "
                    if has_area_issue else "কোনো বড় ধরণের অস্বাভাবিক জমি হ্রাস বা সিলিং সংকট পাওয়া যায়নি। "
                ) + f"দাগ রূপান্তরের {len(dag_transitions)} টি ধাপ স্বাভাবিক পরিলক্ষিত হয়েছে।"
            ),
            "status_code": "MISMATCH" if has_area_issue else "MATCH",
        },
        "what_to_do_now": {
            "question_bn": "৪. এখন আমাকে কী করতে হবে?",
            "answer_bn": (
                "১) জেলা রেকর্ড রুম বা উপজেলা সেটেলমেন্ট অফিস থেকে সিএস, এসএ, আরএস ও বিএস খতিয়ানের মূল সার্টিফায়েড কপি (পর্চা) সংগ্রহ করুন।\n"
                "২) বিক্রেতার নামজারি খতিয়ান ও ডিআাইসি খতিয়ানের সাথে বিএস খতিয়ানের মিল নিশ্চিত করুন।\n"
                "৩) দক্ষ আমিন/সার্ভেয়ার দিয়ে সরেজমিনে বিএস দাগের সীমানা মেপে জমি বুঝে নিন।"
            )
        }
    }

    return {
        "parcel_id": parcel_id,
        "surveys": enriched_surveys,
        "dag_transitions": dag_transitions,
        "area_discrepancies": area_discrepancies,
        "owner_differences": owner_differences,
        "correspondences": correspondences,
        "bangla_four_questions": bangla_four_questions,
        "synthetic": True,
        "officially_verified": False,
    }


def document_review(parcel_id):
    documents = get_related("documents", parcel_id)

    results = []

    for document in documents:
        reference_hash = document.get("reference_hash")
        submitted_hash = document.get("submitted_hash")

        if reference_hash and submitted_hash:
            comparison = (
                "MATCH"
                if reference_hash == submitted_hash
                else "MISMATCH"
            )
        else:
            comparison = "INSUFFICIENT_HASH_DATA"

        results.append({
            "document_id": document["document_id"],
            "document_type": document.get("document_type"),
            "stored_integrity_status": document.get(
                "integrity_status"
            ),
            "stored_hash_comparison": comparison,
        })

    return {
        "parcel_id": parcel_id,
        "documents": results,
        "actual_file_bytes_verified": False,
        "synthetic": True,
        "officially_verified": False,
    }


def mutation_history(parcel_id):
    mutations = get_related("mutations", parcel_id)

    mutations.sort(
        key=lambda row: (
            row.get("mutation_date") or "",
            row.get("mutation_id") or "",
        )
    )

    return {
        "parcel_id": parcel_id,
        "mutations": mutations,
        "total_mutations": len(mutations),
        "synthetic": True,
        "officially_verified": False,
    }


def change_watch(parcel_id):
    events = get_related("parcel_events", parcel_id)

    events.sort(
        key=lambda row: (
            row.get("event_date") or "",
            row.get("event_id") or "",
        ),
        reverse=True,
    )

    return {
        "parcel_id": parcel_id,
        "events": events,
        "total_events": len(events),
        "live_monitoring_enabled": False,
        "synthetic": True,
        "officially_verified": False,
    }
