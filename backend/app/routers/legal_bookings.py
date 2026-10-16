import importlib.util
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


DATABASE_PATH = LAND_DB_PATH

SERVICE_PATH = (
    Path(__file__).resolve().parents[3]
    / "services" / "legal_expert_connect_v1"
    / "consultation_booking.py"
)

def load_booking():
    if not SERVICE_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail="Legal booking service is unavailable",
        )

    spec = importlib.util.spec_from_file_location(
        "landsure_consultation_booking_service",
        SERVICE_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(
            f"Unable to load legal booking service: {SERVICE_PATH}"
        )

    booking = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(booking)
    return booking


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


def authenticated_identity(user):
    if not isinstance(user, dict):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    username = user.get("username")

    if (
        not isinstance(username, str)
        or not username.strip()
    ):
        raise HTTPException(
            status_code=401,
            detail="Valid authenticated identity required"
        )

    return username.strip()


def handle_error(error, booking):
    if isinstance(error, booking.ResourceNotFound):
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    if isinstance(error, booking.AccessDenied):
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    if isinstance(error, booking.SlotUnavailable):
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )

    if isinstance(error, booking.InvalidBooking):
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    raise error


@router.get("/lawyers/{lawyer_id}/slots")
def get_available_slots(
    lawyer_id: Annotated[
        str, ApiPath(min_length=1, max_length=100)
    ],
    user=Depends(current_user)
):
    authenticated_identity(user)
    booking = load_booking()

    try:
        return booking.get_available_slots(
            DATABASE_PATH,
            lawyer_id
        )
    except booking.BookingError as error:
        handle_error(error, booking)


@router.post("", status_code=201)
def create_booking(
    payload: CreateBookingRequest,
    user=Depends(current_user)
):
    booking = load_booking()
    try:
        return booking.create_booking(
            DATABASE_PATH,
            payload.lawyer_id,
            payload.availability_id,
            authenticated_identity(user),
            consultation_mode=payload.consultation_mode,
            parcel_id=payload.parcel_id
        )
    except booking.BookingError as error:
        handle_error(error, booking)


@router.get("/{request_id}")
def get_booking(
    request_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    user=Depends(current_user)
):
    booking = load_booking()
    try:
        return booking.get_booking(
            DATABASE_PATH,
            request_id,
            authenticated_identity(user)
        )
    except booking.BookingError as error:
        handle_error(error, booking)


@router.post("/{request_id}/cancel")
def cancel_booking(
    request_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    user=Depends(current_user)
):
    booking = load_booking()
    try:
        return booking.cancel_booking(
            DATABASE_PATH,
            request_id,
            authenticated_identity(user)
        )
    except booking.BookingError as error:
        handle_error(error, booking)
