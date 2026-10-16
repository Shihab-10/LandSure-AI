
from app.services.database import get_parcel, get_related

SURVEY_ORDER = {
    "CS": 1,
    "SA": 2,
    "RS": 3,
    "BS_BDS": 4,
}

def survey_comparison(parcel_id):
    surveys = get_related("survey_records", parcel_id)
    mappings = get_related("survey_correspondences", parcel_id)

    surveys.sort(
        key=lambda row: SURVEY_ORDER.get(
            row.get("survey_type"), 99
        )
    )

    available = [
        row for row in surveys
        if row.get("record_presence") == "AVAILABLE"
    ]

    changes = []

    for previous, current in zip(
        available, available[1:]
    ):
        changed_fields = {}

        for field in [
            "dag_no",
            "khatian_no",
            "area_decimal",
            "recorded_owner_id",
        ]:
            if previous.get(field) != current.get(field):
                changed_fields[field] = {
                    "from": previous.get(field),
                    "to": current.get(field),
                }

        changes.append({
            "from_survey": previous.get("survey_type"),
            "to_survey": current.get("survey_type"),
            "changed_fields": changed_fields,
        })

    return {
        "parcel_id": parcel_id,
        "surveys": surveys,
        "correspondences": mappings,
        "changes": changes,
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
