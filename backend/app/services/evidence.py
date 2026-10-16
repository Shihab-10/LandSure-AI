
from pathlib import Path
from functools import lru_cache
import json

DATA_DIR = (
    Path(__file__).resolve().parents[1]
    / "data"
)

@lru_cache(maxsize=1)
def verification_index():
    with open(
        DATA_DIR / "verification.json",
        encoding="utf-8"
    ) as f:
        records = json.load(f)

    return {
        record["parcel_id"]: record
        for record in records
    }

@lru_cache(maxsize=1)
def advisor_index():
    with open(
        DATA_DIR / "advisor.json",
        encoding="utf-8"
    ) as f:
        records = json.load(f)

    return {
        (record["parcel_id"], record["language"]): record
        for record in records
    }

def get_verification(parcel_id):
    return verification_index().get(parcel_id)

def get_advice(parcel_id, language="bn"):
    return advisor_index().get(
        (parcel_id, language)
    )
