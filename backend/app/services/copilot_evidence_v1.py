
import json
import re
import sqlite3
import unicodedata
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.services.database import DB_PATH

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TERMS_PATH = (
    PROJECT_ROOT / "models" / "retrieval" / "LAND_TERMINOLOGY.json"
)

KNOWLEDGE = json.loads(
    TERMS_PATH.read_text(encoding="utf-8")
)

app = FastAPI(
    title="LandSure AI Evidence Copilot — Local Prototype",
    version="13A",
    description="Synthetic-data prototype. Not a legal verification service."
)

class CopilotRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    parcel_id: str | None = Field(default=None, max_length=80)

def norm(text):
    return re.sub(
        r"\s+", " ",
        unicodedata.normalize("NFC", text).casefold()
    ).strip()

# Existing aliases plus generic topic vocabulary.
# These are rules, not a newly trained ML model.
EXTRA_ALIASES = {
    "mutation": [
        "নামজারির", "নাম পরিবর্তন", "নামজারি",
        "mutation", "namjari"
    ],
    "khatian": [
        "খতিয়ান", "খতিয়ান", "khatiyan", "khatian"
    ],
    "dag": [
        "দাগ", "dag number", "plot number"
    ],
    "document": [
        "দলিলটি", "দলিল", "রেজিস্ট্রি দলিল",
        "deed", "dolil"
    ],
    "ownership": [
        "landowner", "previous landowner",
        "আগের মালিক", "মালিকানা", "malik"
    ],
    "tax": [
        "খাজনা", "ভূমি কর", "land tax",
        "khajna", "bhumi unnoyon kor"
    ],
    "survey": [
        "জরিপ", "আরএস", "এসএ", "বিএস",
        "survey", "survey records"
    ],
    "map": [
        "ম্যাপ", "মানচিত্র", "সীমানা",
        "simana", "mouja map", "boundary"
    ]
}

# The same 8 topics have deterministic DB table mappings.
TOPIC_TABLES = {
    "mutation": ["mutations"],
    "khatian": ["survey_records"],
    "dag": ["survey_records", "survey_correspondences"],
    "document": ["documents"],
    "ownership": ["ownership_claims", "transactions"],
    "tax": [],
    "survey": ["survey_records", "survey_correspondences"],
    "map": ["survey_records", "survey_correspondences"]
}

# Explicit allowlist: no arbitrary table names from requests.
ALLOWED_COLUMNS = {
    "mutations": [
        "mutation_id", "mutation_date", "mutation_status",
        "review_reason", "recommended_action"
    ],
    "survey_records": [
        "survey_record_id", "survey_type", "dag_no",
        "khatian_no", "area_decimal", "record_presence"
    ],
    "survey_correspondences": [
        "mapping_id", "mapping_status",
        "from_survey_record_id", "to_survey_record_id"
    ],
    "documents": [
        "document_id", "document_type", "integrity_status"
    ],
    "ownership_claims": [
        "claim_id", "claim_type", "claim_status"
    ],
    "transactions": [
        "transaction_id", "transaction_type",
        "transaction_status", "transaction_date"
    ]
}

def connect_readonly():
    # SQLite URI mode=ro prevents database writes.
    return sqlite3.connect(
        DB_PATH.resolve().as_uri() + "?mode=ro",
        uri=True,
        timeout=5
    )

def classify(question):
    q = norm(question)
    scores = {}

    for item in KNOWLEDGE:
        topic = item["id"]
        aliases = item["aliases"] + EXTRA_ALIASES.get(topic, [])
        matched = [
            alias for alias in aliases
            if norm(alias) and re.search(
                r"(?<!\w)" + re.escape(norm(alias)) + r"(?!\w)",
                q
            )
        ]
        if matched:
            scores[topic] = max(
                len(norm(a)) for a in matched
            )

    if not scores:
        return None, []

    ranked = sorted(
        scores,
        key=lambda x: (-scores[x], x)
    )
    return ranked[0], ranked

def fetch_evidence(parcel_id, topic):
    tables = TOPIC_TABLES[topic]
    evidence = []

    with connect_readonly() as conn:
        exists = conn.execute(
            "SELECT 1 FROM parcels WHERE parcel_id = ?",
            (parcel_id,)
        ).fetchone()

        if not exists:
            raise HTTPException(
                status_code=404,
                detail="Parcel not found"
            )

        for table in tables:
            columns = ALLOWED_COLUMNS[table]

            # Table and columns come only from fixed allowlists.
            query = (
                f"SELECT {', '.join(columns)} "
                f"FROM {table} WHERE parcel_id = ? "
                f"ORDER BY {columns[0]} LIMIT 20"
            )

            cursor = conn.execute(query, (parcel_id,))
            records = [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

            for record in records:
                evidence.append({
                    "source_table": table,
                    "source_record_id": record[columns[0]],
                    "data": record
                })

    return evidence

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "LandSure Evidence Copilot",
        "environment": "local_synthetic_prototype"
    }

@app.post("/api/v1/copilot/evidence")
def copilot_evidence(request: CopilotRequest):
    question = request.question.strip()

    topic, matching_topics = classify(question)

    if topic is None:
        return {
            "status": "CLARIFICATION_OR_OUT_OF_SCOPE",
            "topic": None,
            "answer": (
                "প্রশ্নটি থেকে নির্দিষ্ট জমি-সংক্রান্ত বিষয় "
                "শনাক্ত করা যায়নি। দয়া করে প্রশ্নটি বিস্তারিত লিখুন।"
            ),
            "evidence": [],
            "verified": False
        }

    if not request.parcel_id:
        return {
            "status": "PARCEL_ID_REQUIRED",
            "topic": topic,
            "matching_topics": matching_topics,
            "answer": (
                "এই বিষয়ে নির্দিষ্ট জমির তথ্য দেখতে "
                "Parcel ID প্রদান করুন।"
            ),
            "evidence": [],
            "verified": False
        }

    if not re.fullmatch(
        r"LS-PARCEL-\d{6}",
        request.parcel_id
    ):
        raise HTTPException(
            status_code=422,
            detail="Invalid parcel ID format"
        )

    evidence = fetch_evidence(
        request.parcel_id, topic
    )

    if not evidence:
        answer = (
            "এই বিষয়ের জন্য dataset-এ সরাসরি "
            "যাচাইযোগ্য record পাওয়া যায়নি। "
            "এটি কোনো আইনি সিদ্ধান্ত নয়।"
        )
        status = "INSUFFICIENT_EVIDENCE"
    else:
        answer = (
            f"{request.parcel_id} সম্পর্কে {topic} "
            f"বিষয়ে {len(evidence)}টি synthetic evidence "
            "record পাওয়া গেছে। নিচের source record "
            "দেখে তথ্য পর্যালোচনা করুন। "
            "এটি মালিকানা বা আইনি বৈধতার নিশ্চয়তা নয়।"
        )
        status = "EVIDENCE_FOUND"

    return {
        "status": status,
        "topic": topic,
        "matching_topics": matching_topics,
        "parcel_id": request.parcel_id,
        "answer": answer,
        "evidence": evidence,
        "verified": False,
        "data_type": "synthetic",
        "legal_conclusion": False
    }
