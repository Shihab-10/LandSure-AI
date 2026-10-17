
import os
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
_configured_db_path = os.environ.get("LANDSURE_DATA_DB")
DB_PATH = Path(
    _configured_db_path
    if _configured_db_path
    else PROJECT_ROOT / "datasets" / "synthetic"
    / "landsure_synthetic_v2_3.db"
).expanduser()
if not DB_PATH.is_absolute():
    DB_PATH = PROJECT_ROOT / DB_PATH
DB_PATH = DB_PATH.resolve()

ALLOWED_TABLES = {
    "survey_records",
    "survey_correspondences",
    "ownership_claims",
    "documents",
    "transactions",
    "mutations",
    "parcel_events",
    "evidence_sources",
}

def connect_db():
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"Configured LandSure data database does not exist: {DB_PATH}"
        )

    connection = sqlite3.connect(
        f"{DB_PATH.as_uri()}?mode=ro",
        uri=True
    )
    connection.row_factory = sqlite3.Row
    return connection

def get_parcel(parcel_id):
    with connect_db() as db:
        row = db.execute(
            "SELECT * FROM parcels WHERE parcel_id = ?",
            (parcel_id,)
        ).fetchone()

    if not row:
        return None

    data = dict(row)
    dist_code = data.get("district_code", "DEMO-D01")
    ref_area = float(data.get("reference_area_decimal", 10.0))

    if dist_code == "DEMO-D02":
        data["district_name_bn"] = "চট্টগ্রাম"
        data["district_name_en"] = "Chattogram"
        data["upazila_name_bn"] = "হাটহাজারী"
        data["upazila_name_en"] = "Hathazari"
        data["mouza_name_bn"] = "ফতেহপুর"
        data["mouza_name_en"] = "Fatehpur"
    elif dist_code == "DEMO-D03":
        data["district_name_bn"] = "সিলেট"
        data["district_name_en"] = "Sylhet"
        data["upazila_name_bn"] = "সিলেট সদর"
        data["upazila_name_en"] = "Sylhet Sadar"
        data["mouza_name_bn"] = "টুকেরবাজার"
        data["mouza_name_en"] = "Tukerbazar"
    else:
        data["district_name_bn"] = "ঢাকা"
        data["district_name_en"] = "Dhaka"
        data["upazila_name_bn"] = "সাভার"
        data["upazila_name_en"] = "Savar"
        data["mouza_name_bn"] = "বিরুলিয়া"
        data["mouza_name_en"] = "Birulia"

    data["display_name_bn"] = f"{data['mouza_name_bn']} {'আবাসিক' if ref_area <= 30 else 'নাল'} জমি"
    data["display_name_en"] = f"{data['mouza_name_en']} {'Residential' if ref_area <= 30 else 'Agricultural'} Land"
    data["land_classification_bn"] = "ভিটি / বাড়ি (আবাসিক)" if ref_area <= 30 else "নাল জমি (কৃষি)"

    return data

def get_related(table, parcel_id):
    if table not in ALLOWED_TABLES:
        raise ValueError("Unsupported table")

    with connect_db() as db:
        rows = db.execute(
            f'SELECT * FROM "{table}" WHERE parcel_id = ?',
            (parcel_id,)
        ).fetchall()

    return [dict(row) for row in rows]
