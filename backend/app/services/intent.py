
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
        "parcel_id": parcel_ids[0] if parcel_ids else None,
        "decision_margin": round(margin, 4),
    }

    # Preliminary heuristic, not calibrated confidence.
    if margin < 0.10:
        result["status"] = "CLARIFICATION_REQUIRED"
    elif intent == "OUT_OF_SCOPE":
        result["status"] = "OUT_OF_SCOPE"
    elif intent in PARCEL_INTENTS and not parcel_ids:
        result["status"] = "PARCEL_ID_REQUIRED"
    else:
        result["status"] = "READY"

    return result
