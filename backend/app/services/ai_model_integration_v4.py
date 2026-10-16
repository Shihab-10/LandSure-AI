from functools import lru_cache
from pathlib import Path

import joblib

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ROUTER_PATH = (
    PROJECT_ROOT
    / "models" / "query_router"
    / "landsure_feature_router_v4.joblib"
)

GATE_PATH = (
    PROJECT_ROOT
    / "models" / "safety_gate"
    / "landsure_safety_gate_v2.joblib"
)

@lru_cache(maxsize=1)
def load_models():
    # Only load model files bundled from trusted training.
    router = joblib.load(ROUTER_PATH)
    gate = joblib.load(GATE_PATH)
    return router, gate

def classify_with_v4(question: str):
    question = question.strip()

    if not question:
        raise ValueError("Question cannot be empty")

    router, gate = load_models()

    gate_label = str(gate.predict([question])[0])
    feature_id = str(router.predict([question])[0])

    if gate_label not in {
        "LAND_QUERY", "SAFETY_REVIEW"
    }:
        raise RuntimeError("Unexpected Gate prediction")

    if feature_id not in {
        str(i) for i in range(1, 27)
    }:
        raise RuntimeError("Unexpected Router prediction")

    return {
        "gate_label": gate_label,
        "feature_id": (
            int(feature_id)
            if gate_label == "LAND_QUERY"
            else None
        ),
        "router_candidate_feature_id": int(feature_id),
        "router_model": "V4",
        "gate_model": "V2",
        "advisory_only": True,
        "requires_policy_checks": True,
        "legal_verification_performed": False
    }
