
from app.services.intent import classify_query
from app.services.bangla_router import (
    detect_explicit_bangla_intent,
)

def classify_query_v2(question):
    original = classify_query(question)

    result = dict(original)

    explicit_intent = detect_explicit_bangla_intent(
        question
    )

    if explicit_intent is None:
        result["routing_method"] = "MODEL"
        return result

    # Do not bypass missing/multiple parcel checks.
    if not result.get("parcel_id"):
        result["routing_method"] = "MODEL"
        return result

    if result.get("status") not in {
        "READY",
        "CLARIFICATION_REQUIRED",
    }:
        result["routing_method"] = "MODEL"
        return result

    result["model_intent"] = result.get("intent")
    result["intent"] = explicit_intent
    result["status"] = "READY"
    result["routing_method"] = (
        "EXPLICIT_BANGLA_RULE"
    )

    # Margin belongs to the original model prediction.
    result["decision_margin_is_for_model_intent"] = True

    return result
