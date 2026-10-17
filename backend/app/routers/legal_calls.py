
"""JWT-protected simulated consultation call endpoints."""

import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import current_user

ROOT = Path(__file__).resolve().parents[3]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

class _FallbackCallService:
    class ResourceNotFound(Exception): pass
    class AccessDenied(Exception): pass
    class CallConflict(Exception): pass
    class InvalidCall(Exception): pass
    class DemoCallError(Exception): pass

    @staticmethod
    def start_demo_call(*args, **kwargs):
        raise HTTPException(status_code=503, detail="External call service is not active.")

    @staticmethod
    def get_demo_call(*args, **kwargs):
        raise HTTPException(status_code=503, detail="External call service is not active.")

    @staticmethod
    def end_demo_call(*args, **kwargs):
        raise HTTPException(status_code=503, detail="External call service is not active.")


try:
    from services.legal_expert_connect_v1 import demo_call_service as service  # type: ignore[import-not-found]
except ImportError:
    service = _FallbackCallService()

DATABASE_PATH = (
    ROOT / "datasets/synthetic/landsure_synthetic_v2_3.db"
)

router = APIRouter(
    prefix="/api/v1/legal-calls",
    tags=["Legal Expert Demo Calls"],
    dependencies=[Depends(current_user)]
)


class StartCallRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=200)


def authenticated_identity(user):
    if not isinstance(user, dict):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    if user.get("is_demo") or user.get("role") == "demo":
        raise HTTPException(
            status_code=403,
            detail="Demo sessions cannot start legal calls"
        )

    username = user.get("username")

    if not isinstance(username, str) or not username.strip():
        raise HTTPException(
            status_code=401,
            detail="Authenticated identity missing"
        )

    return username.strip()


def map_service_error(error):
    if isinstance(error, service.ResourceNotFound):
        return HTTPException(status_code=404, detail=str(error))

    if isinstance(error, service.AccessDenied):
        return HTTPException(status_code=403, detail=str(error))

    if isinstance(error, service.CallConflict):
        return HTTPException(status_code=409, detail=str(error))

    if isinstance(error, service.InvalidCall):
        return HTTPException(status_code=422, detail=str(error))

    return HTTPException(
        status_code=500,
        detail="Demo call operation failed"
    )


@router.post("/start", status_code=201)
def start_call(
    payload: StartCallRequest,
    user=Depends(current_user)
):
    identity = authenticated_identity(user)

    try:
        return service.start_demo_call(
            DATABASE_PATH,
            payload.request_id,
            identity
        )
    except service.DemoCallError as error:
        raise map_service_error(error) from error


@router.get("/{call_id}")
def get_call(
    call_id: str,
    user=Depends(current_user)
):
    identity = authenticated_identity(user)

    try:
        return service.get_demo_call(
            DATABASE_PATH,
            call_id,
            identity
        )
    except service.DemoCallError as error:
        raise map_service_error(error) from error


@router.post("/{call_id}/end")
def end_call(
    call_id: str,
    user=Depends(current_user)
):
    identity = authenticated_identity(user)

    try:
        return service.end_demo_call(
            DATABASE_PATH,
            call_id,
            identity
        )
    except service.DemoCallError as error:
        raise map_service_error(error) from error
