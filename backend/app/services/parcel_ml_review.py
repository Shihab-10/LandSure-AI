from pathlib import Path
import sqlite3
import pandas as pd
import joblib

from app.services.database import DB_PATH

MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "models"
    / "parcel_review"
    / "logistic_regression_v2.joblib"
)

FEATURE_ORDER = [
    "reference_area_decimal",
    "survey_record_count",
    "survey_missing_count",
    "survey_area_min",
    "survey_area_max",
    "survey_area_max_diff",
    "mutation_count",
    "mutation_issue_count",
    "document_count",
    "document_mismatch_count",
    "transaction_count",
    "competing_claim_count",
    "ownership_claim_count",
    "owner_count",
    "mapping_provisional_count",
    "mapping_unresolved_count",
    "mapping_curated_count",
]

PARCEL_FEATURES_SQL = """
WITH
survey AS (
 SELECT parcel_id,
        COUNT(*) AS survey_record_count,
        SUM(CASE WHEN record_presence='MISSING'
                 THEN 1 ELSE 0 END) AS survey_missing_count,
        MIN(CAST(area_decimal AS REAL)) AS survey_area_min,
        MAX(CAST(area_decimal AS REAL)) AS survey_area_max,
        MAX(ABS(CAST(area_decimal AS REAL) -
                (SELECT CAST(p.reference_area_decimal AS REAL)
                 FROM parcels p WHERE p.parcel_id=s.parcel_id)
            )) AS survey_area_max_diff
 FROM survey_records s
 WHERE s.parcel_id = ?
 GROUP BY parcel_id
),
mutation AS (
 SELECT parcel_id,
        COUNT(*) AS mutation_count,
        SUM(CASE WHEN mutation_status='INCONSISTENT'
                 THEN 1 ELSE 0 END) AS mutation_issue_count
 FROM mutations
 WHERE parcel_id = ?
 GROUP BY parcel_id
),
docs AS (
 SELECT parcel_id,
        COUNT(*) AS document_count,
        SUM(CASE WHEN integrity_status='HASH_MISMATCH'
                 THEN 1 ELSE 0 END) AS document_mismatch_count
 FROM documents
 WHERE parcel_id = ?
 GROUP BY parcel_id
),
tx AS (
 SELECT parcel_id,
        COUNT(*) AS transaction_count,
        SUM(CASE WHEN transaction_status='COMPETING_CLAIM'
                 THEN 1 ELSE 0 END) AS competing_claim_count
 FROM transactions
 WHERE parcel_id = ?
 GROUP BY parcel_id
),
claims AS (
 SELECT parcel_id,
        COUNT(*) AS ownership_claim_count,
        COUNT(DISTINCT owner_id) AS owner_count
 FROM ownership_claims
 WHERE parcel_id = ?
 GROUP BY parcel_id
),
mapping AS (
 SELECT parcel_id,
        SUM(CASE WHEN mapping_status='PROVISIONAL'
                 THEN 1 ELSE 0 END) AS mapping_provisional_count,
        SUM(CASE WHEN mapping_status='UNRESOLVED'
                 THEN 1 ELSE 0 END) AS mapping_unresolved_count,
        SUM(CASE WHEN mapping_status='CURATED_SYNTHETIC'
                 THEN 1 ELSE 0 END) AS mapping_curated_count
 FROM survey_correspondences
 WHERE parcel_id = ?
 GROUP BY parcel_id
)
SELECT
 p.parcel_id,
 CAST(p.reference_area_decimal AS REAL) AS reference_area_decimal,
 COALESCE(s.survey_record_count, 0) AS survey_record_count,
 COALESCE(s.survey_missing_count, 0) AS survey_missing_count,
 s.survey_area_min,
 s.survey_area_max,
 s.survey_area_max_diff,
 COALESCE(m.mutation_count, 0) AS mutation_count,
 COALESCE(m.mutation_issue_count, 0) AS mutation_issue_count,
 COALESCE(d.document_count, 0) AS document_count,
 COALESCE(d.document_mismatch_count, 0) AS document_mismatch_count,
 COALESCE(t.transaction_count, 0) AS transaction_count,
 COALESCE(t.competing_claim_count, 0) AS competing_claim_count,
 COALESCE(c.ownership_claim_count, 0) AS ownership_claim_count,
 COALESCE(c.owner_count, 0) AS owner_count,
 COALESCE(mp.mapping_provisional_count, 0) AS mapping_provisional_count,
 COALESCE(mp.mapping_unresolved_count, 0) AS mapping_unresolved_count,
 COALESCE(mp.mapping_curated_count, 0) AS mapping_curated_count
FROM parcels p
LEFT JOIN survey s ON p.parcel_id=s.parcel_id
LEFT JOIN mutation m ON p.parcel_id=m.parcel_id
LEFT JOIN docs d ON p.parcel_id=d.parcel_id
LEFT JOIN tx t ON p.parcel_id=t.parcel_id
LEFT JOIN claims c ON p.parcel_id=c.parcel_id
LEFT JOIN mapping mp ON p.parcel_id=mp.parcel_id
WHERE p.parcel_id = ?
"""

_CACHED_MODEL = None

def get_ml_model():
    global _CACHED_MODEL
    if _CACHED_MODEL is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        _CACHED_MODEL = joblib.load(MODEL_PATH)
    return _CACHED_MODEL


def extract_features_for_parcel(parcel_id: str, db_path: Path = DB_PATH) -> pd.DataFrame:
    db_file = Path(db_path).resolve()
    if not db_file.is_file():
        raise FileNotFoundError(f"Database file not found: {db_file}")

    with sqlite3.connect(db_file.as_uri() + "?mode=ro", uri=True) as conn:
        df = pd.read_sql_query(
            PARCEL_FEATURES_SQL,
            conn,
            params=[parcel_id, parcel_id, parcel_id, parcel_id, parcel_id, parcel_id, parcel_id]
        )

    if df.empty:
        raise ValueError(f"Parcel ID {parcel_id} not found in database")

    return pd.DataFrame(df[FEATURE_ORDER])


def predict_parcel_review(parcel_id: str, db_path: Path = DB_PATH) -> dict:
    """
    Performs dynamic ML inference for a land parcel using the 17-feature Logistic Regression model.
    """
    model = get_ml_model()
    features_df = extract_features_for_parcel(parcel_id, db_path)

    prediction = int(model.predict(features_df)[0])
    probabilities = model.predict_proba(features_df)[0]
    review_prob = float(probabilities[1])
    safe_prob = float(probabilities[0])

    feature_dict = {
        col: (None if pd.isna(val) else (int(val) if isinstance(val, int) or (isinstance(val, float) and val.is_integer()) else round(float(val), 2)))
        for col, val in features_df.iloc[0].to_dict().items()
    }

    # Generate rule-aligned signals from extracted features
    signals = []
    if (feature_dict.get("survey_area_max_diff") or 0) > 0.05:
        signals.append("জরিপের রেকর্ডে জমির পরিমাণে অমিল রয়েছে (Survey area discrepancy detected)")
    if (feature_dict.get("mutation_issue_count") or 0) > 0:
        signals.append("নামজারি বা মিউটেশন তথ্যে অসঙ্গতি আছে (Mutation inconsistency flag)")
    if (feature_dict.get("document_mismatch_count") or 0) > 0:
        signals.append("দলিলের হ্যাশ বা তথ্যে অমিল পাওয়া গেছে (Document SHA-256 hash mismatch)")
    if (feature_dict.get("competing_claim_count") or 0) > 0:
        signals.append("দ্বৈত দাবি বা বিক্রয় ঝুঁকি চিহ্নিত (Competing claim / double-selling risk)")
    if (feature_dict.get("survey_missing_count") or 0) > 0:
        signals.append("একটি বা একাধিক ঐতিহাসিক জরিপ রেকর্ড অনুপস্থিত (Missing historical survey record)")

    risk_level = "ELEVATED_RISK" if prediction == 1 else "STANDARD"
    if review_prob > 0.85:
        risk_level = "HIGH_RISK"
    elif review_prob < 0.20:
        risk_level = "LOW_RISK"

    return {
        "parcel_id": parcel_id,
        "model_name": "parcel_review_logistic_regression_v2",
        "model_version": "2.0.0",
        "features_evaluated": 17,
        "review_required": bool(prediction == 1),
        "review_probability": round(review_prob, 4),
        "confidence_score": round(max(safe_prob, review_prob), 4),
        "risk_level": risk_level,
        "key_risk_signals": signals,
        "features": feature_dict,
        "synthetic": True,
        "officially_verified": False,
        "disclaimer": (
            "মেশিন লার্নিং মডেল ভিত্তিক প্রাথমিক ঝুঁকি স্কোর (Synthetic Data Prediction)। "
            "এটি কোনো সরকারি বা চূড়ান্ত আইনি প্রত্যয়নপত্র নয়।"
        ),
    }
