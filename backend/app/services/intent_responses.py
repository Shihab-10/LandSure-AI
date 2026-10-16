
from app.services.database import get_related
from app.services.land_intelligence import (
    survey_comparison,
    document_review,
    mutation_history,
    change_watch,
)

INTENT_SECTIONS = {
    "PARCEL_LOOKUP": "parcel_overview",
    "SURVEY_COMPARISON": "survey_comparison",
    "SURVEY_HISTORY": "survey_history",
    "OWNERSHIP_CHECK": "ownership_claims",
    "FRAUD_RISK": "verification_findings",
    "MUTATION_STATUS": "mutation_history",
    "DOCUMENT_VERIFICATION": "document_review",
    "VERIFICATION_EXPLANATION": "verification_findings",
    "TRUST_PASSPORT": "trust_passport",
    "CHANGE_WATCH": "recorded_events",
}

def build_intent_details(parcel_id, intent, verification):
    section = INTENT_SECTIONS.get(intent)

    if section == "survey_comparison":
        data = survey_comparison(parcel_id)

    elif section == "survey_history":
        data = {
            "survey_records": get_related(
                "survey_records", parcel_id
            ),
            "survey_correspondences": get_related(
                "survey_correspondences", parcel_id
            ),
        }

    elif section == "ownership_claims":
        data = {
            "ownership_claims": get_related(
                "ownership_claims", parcel_id
            ),
            "transactions": get_related(
                "transactions", parcel_id
            ),
        }

    elif section == "verification_findings":
        data = {
            "verification": verification
        }

    elif section == "mutation_history":
        data = mutation_history(parcel_id)

    elif section == "document_review":
        data = document_review(parcel_id)

    elif section == "recorded_events":
        data = change_watch(parcel_id)

    elif section == "trust_passport":
        data = {
            "endpoint": (
                f"/api/v1/parcels/{parcel_id}/trust-passport"
            ),
            "format": "PDF",
            "authentication_required": True,
            "official_certificate": False,
        }

    else:
        section = "parcel_overview"
        data = {
            "message": "Refer to the parcel overview."
        }

    return {
        "section": section,
        "data": data,
    }
