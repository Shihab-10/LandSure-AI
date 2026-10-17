
from pathlib import Path
from functools import lru_cache
import joblib
import numpy as np
import re

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models" / "intent_model.joblib"
)

PARCEL_PATTERN = re.compile(
    r"\bLS-PARCEL-\d{6}\b",
    re.IGNORECASE
)

PARCEL_INTENTS = {
    "PARCEL_LOOKUP",
    "SURVEY_COMPARISON",
    "SURVEY_HISTORY",
    "OWNERSHIP_CHECK",
    "FRAUD_RISK",
    "MUTATION_STATUS",
    "DOCUMENT_VERIFICATION",
    "VERIFICATION_EXPLANATION",
    "TRUST_PASSPORT",
    "CHANGE_WATCH",
}

@lru_cache(maxsize=1)
def load_model():
    # Load only the trusted model shipped with this project.
    return joblib.load(MODEL_PATH)


FEATURE_TO_INTENT = {
    1: "PARCEL_LOOKUP",
    2: "SURVEY_COMPARISON",
    3: "SURVEY_HISTORY",
    5: "VERIFICATION_EXPLANATION",
    6: "FRAUD_RISK",
    7: "MUTATION_STATUS",
    8: "DOCUMENT_VERIFICATION",
    13: "TRUST_PASSPORT",
    14: "CHANGE_WATCH",
}


def classify_query(question):
    question = str(question).strip()

    if not question:
        return {"status": "INVALID_QUERY"}

    parcel_ids = sorted({
        p.upper()
        for p in PARCEL_PATTERN.findall(question)
    })

    if len(parcel_ids) > 1:
        return {
            "status": "CLARIFICATION_REQUIRED",
            "message": "Please specify one parcel.",
        }

    parcel_id = parcel_ids[0] if parcel_ids else None

    # Use legacy intent_model.joblib if available
    if MODEL_PATH.is_file():
        model = load_model()
        scores = np.asarray(
            model.decision_function([question])
        )[0]
        ranked = np.argsort(scores)[::-1]
        intent = str(model.classes_[ranked[0]])
        margin = float(
            scores[ranked[0]] - scores[ranked[1]]
        )
        result = {
            "intent": intent,
            "parcel_id": parcel_id,
            "decision_margin": round(margin, 4),
        }
        if margin < 0.10:
            result["status"] = "CLARIFICATION_REQUIRED"
        elif intent == "OUT_OF_SCOPE":
            result["status"] = "OUT_OF_SCOPE"
        elif intent in PARCEL_INTENTS and not parcel_ids:
            result["status"] = "PARCEL_ID_REQUIRED"
        else:
            result["status"] = "READY"
        return result

    # When legacy model artifact is absent, safely route via Feature Router V4 and Gate V2
    try:
        from app.services.ai_model_integration_v4 import classify_with_v4
        v4_result = classify_with_v4(question)
        feature_id = v4_result.get("router_candidate_feature_id")
        gate_label = v4_result.get("gate_label")

        intent = FEATURE_TO_INTENT.get(int(feature_id), "LAND_KNOWLEDGE") if feature_id is not None else "LAND_KNOWLEDGE"

        result = {
            "intent": intent,
            "parcel_id": parcel_id,
            "decision_margin": 1.0,
            "v4_feature_id": feature_id,
            "gate_label": gate_label,
            "router_model": "V4_BRIDGE",
        }

        if intent in PARCEL_INTENTS and not parcel_id:
            result["status"] = "PARCEL_ID_REQUIRED"
        else:
            result["status"] = "READY"

        return result
    except Exception as exc:
        return {
            "status": "LEGACY_MODEL_UNAVAILABLE",
            "detail": f"Legacy intent model unavailable: {exc}",
            "parcel_id": parcel_id,
        }
