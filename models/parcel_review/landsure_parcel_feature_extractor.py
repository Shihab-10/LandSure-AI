
from pathlib import Path
import sqlite3
import pandas as pd

FEATURE_ORDER = ['reference_area_decimal', 'survey_record_count', 'survey_missing_count', 'survey_area_min', 'survey_area_max', 'survey_area_max_diff', 'mutation_count', 'mutation_issue_count', 'document_count', 'document_mismatch_count', 'transaction_count', 'competing_claim_count', 'ownership_claim_count', 'owner_count', 'mapping_provisional_count', 'mapping_unresolved_count', 'mapping_curated_count']

SQL = "\nWITH\nsurvey AS (\n SELECT parcel_id,\n        COUNT(*) AS survey_record_count,\n        SUM(CASE WHEN record_presence='MISSING'\n                 THEN 1 ELSE 0 END) AS survey_missing_count,\n        MIN(CAST(area_decimal AS REAL)) AS survey_area_min,\n        MAX(CAST(area_decimal AS REAL)) AS survey_area_max,\n        MAX(ABS(CAST(area_decimal AS REAL) -\n                (SELECT CAST(p.reference_area_decimal AS REAL)\n                 FROM parcels p WHERE p.parcel_id=s.parcel_id)\n            )) AS survey_area_max_diff\n FROM survey_records s GROUP BY parcel_id\n),\nmutation AS (\n SELECT parcel_id,\n        COUNT(*) AS mutation_count,\n        SUM(CASE WHEN mutation_status='INCONSISTENT'\n                 THEN 1 ELSE 0 END) AS mutation_issue_count\n FROM mutations GROUP BY parcel_id\n),\ndocs AS (\n SELECT parcel_id,\n        COUNT(*) AS document_count,\n        SUM(CASE WHEN integrity_status='HASH_MISMATCH'\n                 THEN 1 ELSE 0 END) AS document_mismatch_count\n FROM documents GROUP BY parcel_id\n),\ntx AS (\n SELECT parcel_id,\n        COUNT(*) AS transaction_count,\n        SUM(CASE WHEN transaction_status='COMPETING_CLAIM'\n                 THEN 1 ELSE 0 END) AS competing_claim_count\n FROM transactions GROUP BY parcel_id\n),\nclaims AS (\n SELECT parcel_id,\n        COUNT(*) AS ownership_claim_count,\n        COUNT(DISTINCT owner_id) AS owner_count\n FROM ownership_claims GROUP BY parcel_id\n),\nmapping AS (\n SELECT parcel_id,\n        SUM(CASE WHEN mapping_status='PROVISIONAL'\n                 THEN 1 ELSE 0 END) AS mapping_provisional_count,\n        SUM(CASE WHEN mapping_status='UNRESOLVED'\n                 THEN 1 ELSE 0 END) AS mapping_unresolved_count,\n        SUM(CASE WHEN mapping_status='CURATED_SYNTHETIC'\n                 THEN 1 ELSE 0 END) AS mapping_curated_count\n FROM survey_correspondences GROUP BY parcel_id\n)\nSELECT\n p.parcel_id,\n CAST(p.reference_area_decimal AS REAL) AS reference_area_decimal,\n COALESCE(s.survey_record_count,0) AS survey_record_count,\n COALESCE(s.survey_missing_count,0) AS survey_missing_count,\n s.survey_area_min,\n s.survey_area_max,\n s.survey_area_max_diff,\n COALESCE(m.mutation_count,0) AS mutation_count,\n COALESCE(m.mutation_issue_count,0) AS mutation_issue_count,\n COALESCE(d.document_count,0) AS document_count,\n COALESCE(d.document_mismatch_count,0) AS document_mismatch_count,\n COALESCE(t.transaction_count,0) AS transaction_count,\n COALESCE(t.competing_claim_count,0) AS competing_claim_count,\n COALESCE(c.ownership_claim_count,0) AS ownership_claim_count,\n COALESCE(c.owner_count,0) AS owner_count,\n COALESCE(mp.mapping_provisional_count,0) AS mapping_provisional_count,\n COALESCE(mp.mapping_unresolved_count,0) AS mapping_unresolved_count,\n COALESCE(mp.mapping_curated_count,0) AS mapping_curated_count\nFROM parcels p\nLEFT JOIN survey s ON p.parcel_id=s.parcel_id\nLEFT JOIN mutation m ON p.parcel_id=m.parcel_id\nLEFT JOIN docs d ON p.parcel_id=d.parcel_id\nLEFT JOIN tx t ON p.parcel_id=t.parcel_id\nLEFT JOIN claims c ON p.parcel_id=c.parcel_id\nLEFT JOIN mapping mp ON p.parcel_id=mp.parcel_id\nORDER BY p.parcel_id\n"

def extract_all_features(database_path):
    database_path = Path(database_path).resolve()

    if not database_path.is_file():
        raise FileNotFoundError(database_path)

    with sqlite3.connect(
        database_path.as_uri() + "?mode=ro",
        uri=True
    ) as conn:
        data = pd.read_sql_query(SQL, conn)

    return data[["parcel_id"] + FEATURE_ORDER]

def extract_parcel_features(database_path, parcel_id):
    data = extract_all_features(database_path)

    selected = data[data["parcel_id"] == parcel_id]

    if len(selected) != 1:
        raise ValueError("Unknown or duplicate parcel ID")

    return selected[FEATURE_ORDER]
