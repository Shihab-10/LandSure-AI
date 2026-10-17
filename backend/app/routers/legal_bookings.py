from pathlib import Path
from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path as ApiPath
)
from pydantic import BaseModel, Field

from app.dependencies import current_user
from app.services.database import DB_PATH as LAND_DB_PATH
from app.services.lawyer_service import (
    BookingError,
    ResourceNotFound,
    SlotUnavailable,
    InvalidBooking,
    AccessDenied,
    get_available_slots as svc_get_available_slots,
    create_booking as svc_create_booking,
    get_booking as svc_get_booking,
    get_user_bookings as svc_get_user_bookings,
    cancel_booking as svc_cancel_booking,
)

DATABASE_PATH = LAND_DB_PATH

router = APIRouter(
    prefix="/api/v1/legal-bookings",
    tags=["Legal Consultation — Synthetic Demo"],
    dependencies=[Depends(current_user)]
)


class CreateBookingRequest(BaseModel):
    lawyer_id: str = Field(
        min_length=1,
        max_length=100
    )

    availability_id: str = Field(
        min_length=1,
        max_length=120
    )

    consultation_mode: Literal[
        "CHAT", "DEMO_CALL"
    ] = "CHAT"

    parcel_id: str | None = Field(
        default=None,
        max_length=120
    )


def authenticated_identity(user: dict) -> str:
    if not isinstance(user, dict):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    # Allow both registered users and demo-session visitors
    username = user.get("username") or user.get("sub")
    if not isinstance(username, str) or not username.strip():
        username = "demo-visitor"

    return username.strip()


def handle_error(error: Exception):
    if isinstance(error, ResourceNotFound):
        raise HTTPException(status_code=404, detail=str(error))
    if isinstance(error, AccessDenied):
        raise HTTPException(status_code=403, detail="Access denied")
    if isinstance(error, SlotUnavailable):
        raise HTTPException(status_code=409, detail=str(error))
    if isinstance(error, InvalidBooking):
        raise HTTPException(status_code=422, detail=str(error))
    raise HTTPException(status_code=500, detail=str(error))


@router.get("/lawyers/{lawyer_id}/slots")
def get_available_slots(
    lawyer_id: Annotated[
        str, ApiPath(min_length=1, max_length=100)
    ],
    user=Depends(current_user)
):
    authenticated_identity(user)
    try:
        return svc_get_available_slots(
            DATABASE_PATH,
            lawyer_id
        )
    except BookingError as error:
        handle_error(error)


@router.get("/my-bookings")
def list_my_bookings(
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    try:
        bookings = svc_get_user_bookings(DATABASE_PATH, requester)
        return {
            "synthetic_demo": True,
            "total_bookings": len(bookings),
            "bookings": bookings,
        }
    except BookingError as error:
        handle_error(error)


@router.post("", status_code=201)
def create_booking(
    payload: CreateBookingRequest,
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    try:
        return svc_create_booking(
            DATABASE_PATH,
            payload.lawyer_id,
            payload.availability_id,
            requester,
            consultation_mode=payload.consultation_mode,
            parcel_id=payload.parcel_id
        )
    except BookingError as error:
        handle_error(error)


@router.get("/{request_id}")
def get_booking(
    request_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    try:
        return svc_get_booking(
            DATABASE_PATH,
            request_id,
            requester
        )
    except BookingError as error:
        handle_error(error)


@router.post("/{request_id}/cancel")
def cancel_booking(
    request_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    try:
        return svc_cancel_booking(
            DATABASE_PATH,
            request_id,
            requester
        )
    except BookingError as error:
        handle_error(error)

