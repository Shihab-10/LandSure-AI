
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.dependencies import current_user
from app.services.database import DB_PATH as LAND_DB_PATH, connect_db

router = APIRouter(
    prefix="/api/v1/legal-experts",
    tags=["Legal Expert Connect — Synthetic Demo"],
    dependencies=[Depends(current_user)]
)

DB_PATH = LAND_DB_PATH

MATCHING_PATH = (
    Path(__file__).resolve().parents[3]
    / "services" / "legal_expert_connect_v1"
    / "lawyer_matching.py"
)

def connect():
    return connect_db()

def load_matching():
    import importlib.util

    if not MATCHING_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail="Legal expert matching service is unavailable",
        )

    spec = importlib.util.spec_from_file_location(
        "landsure_legal_matching",
        MATCHING_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(
            f"Unable to load legal expert matching service: {MATCHING_PATH}"
        )

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class RecommendationRequest(BaseModel):
    verification_rules: list[str] = Field(
        default_factory=list,
        max_length=8
    )
    preferred_location: Optional[str] = Field(
        default=None,
        max_length=100
    )
    preferred_language: Optional[str] = Field(
        default=None,
        max_length=50
    )
    limit: int = Field(default=5, ge=1, le=20)

@router.get("")
def list_legal_experts(
    location: Optional[str] = Query(
        default=None, max_length=100
    ),
    specialization: Optional[str] = Query(
        default=None, max_length=150
    ),
    limit: int = Query(default=20, ge=1, le=50)
):
    module = load_matching()
    lawyers = module.get_lawyers(DB_PATH)

    if location:
        lawyers = [
            item for item in lawyers
            if item["location"].casefold() == location.casefold()
        ]

    if specialization:
        lawyers = [
            item for item in lawyers
            if any(
                specialization.casefold()
                in spec.casefold()
                for spec in item["specializations"]
            )
        ]

    return {
        "synthetic_demo": True,
        "officially_verified": False,
        "total_matches": len(lawyers),
        "lawyers": lawyers[:limit]
    }

@router.post("/recommend")
def recommend_legal_experts(
    payload: RecommendationRequest
):
    module = load_matching()

    try:
        return module.recommend_lawyers(
            DB_PATH,
            verification_rules=payload.verification_rules,
            preferred_location=payload.preferred_location,
            preferred_language=payload.preferred_language,
            limit=payload.limit
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        )

@router.get("/{lawyer_id}/availability")
def get_legal_expert_availability(lawyer_id: str):
    with connect() as conn:
        lawyer = conn.execute(
            "SELECT lawyer_id FROM lawyer_profiles "
            "WHERE lawyer_id = ? AND is_synthetic = 1",
            (lawyer_id,)
        ).fetchone()

        if lawyer is None:
            raise HTTPException(
                status_code=404,
                detail="Demo lawyer not found"
            )

        rows = conn.execute("""
            SELECT availability_id, start_time,
                   end_time, availability_status
            FROM lawyer_availability
            WHERE lawyer_id = ?
            ORDER BY start_time
        """, (lawyer_id,)).fetchall()

    return {
        "lawyer_id": lawyer_id,
        "synthetic_demo": True,
        "availability": [dict(row) for row in rows]
    }

@router.get("/{lawyer_id}")
def get_legal_expert(lawyer_id: str):
    module = load_matching()

    lawyers = module.get_lawyers(DB_PATH)

    lawyer = next(
        (
            item for item in lawyers
            if item["lawyer_id"] == lawyer_id
        ),
        None
    )

    if lawyer is None:
        raise HTTPException(
            status_code=404,
            detail="Demo lawyer not found"
        )

    return {
        "synthetic_demo": True,
        "officially_verified": False,
        "lawyer": lawyer
    }
