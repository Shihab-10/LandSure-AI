
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

    return dict(row) if row else None

def get_related(table, parcel_id):
    if table not in ALLOWED_TABLES:
        raise ValueError("Unsupported table")

    with connect_db() as db:
        rows = db.execute(
            f'SELECT * FROM "{table}" WHERE parcel_id = ?',
            (parcel_id,)
        ).fetchall()

    return [dict(row) for row in rows]
