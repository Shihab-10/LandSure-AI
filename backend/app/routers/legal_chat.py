import importlib.util
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path as ApiPath,
    Query
)
from pydantic import BaseModel, Field

from app.dependencies import current_user
from app.services.database import DB_PATH as LAND_DB_PATH


DATABASE_PATH = LAND_DB_PATH

SERVICE_PATH = (
    Path(__file__).resolve().parents[3]
    / "services" / "legal_expert_connect_v1"
    / "messaging_service.py"
)

def load_messaging():
    if not SERVICE_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail="Legal chat service is unavailable",
        )

    spec = importlib.util.spec_from_file_location(
        "landsure_messaging_api_service",
        SERVICE_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(
            f"Unable to load legal chat service: {SERVICE_PATH}"
        )

    messaging = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(messaging)
    return messaging


router = APIRouter(
    prefix="/api/v1/legal-chat",
    tags=["Legal Chat — Synthetic Demo"],
    dependencies=[Depends(current_user)]
)


class CreateConversationRequest(BaseModel):
    lawyer_id: str = Field(
        min_length=1,
        max_length=100
    )


class SendMessageRequest(BaseModel):
    message_text: str = Field(
        min_length=1,
        max_length=2000
    )


def authenticated_identity(user):
    if not isinstance(user, dict):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    if user.get("is_demo") or user.get("role") == "demo":
        raise HTTPException(
            status_code=403,
            detail="Demo sessions cannot access legal chat"
        )

    username = user.get("username")

    if not isinstance(username, str) or not username.strip():
        raise HTTPException(
            status_code=401,
            detail="Valid authenticated identity required"
        )

    return username.strip()


def handle_error(error, messaging):
    if isinstance(error, messaging.ResourceNotFound):
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    if isinstance(error, messaging.AccessDenied):
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    if isinstance(error, messaging.InvalidMessage):
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    raise error


@router.post("/conversations", status_code=201)
def create_conversation(
    payload: CreateConversationRequest,
    user=Depends(current_user)
):
    sender = authenticated_identity(user)
    messaging = load_messaging()
    try:
        return messaging.create_conversation(
            DATABASE_PATH,
            payload.lawyer_id,
            sender
        )
    except messaging.MessagingError as error:
        handle_error(error, messaging)


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    messaging = load_messaging()
    try:
        result = messaging.get_conversation(
            DATABASE_PATH,
            conversation_id,
            requester
        )

        result.pop("demo_user_reference", None)
        result["synthetic_demo"] = True
        result["officially_verified"] = False

        return result

    except messaging.MessagingError as error:
        handle_error(error, messaging)


@router.post(
    "/conversations/{conversation_id}/messages",
    status_code=201
)
def send_message(
    conversation_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    payload: SendMessageRequest,
    user=Depends(current_user)
):
    sender = authenticated_identity(user)
    messaging = load_messaging()
    try:
        return messaging.send_message(
            DATABASE_PATH,
            conversation_id,
            sender,
            payload.message_text
        )
    except messaging.MessagingError as error:
        handle_error(error, messaging)


@router.get(
    "/conversations/{conversation_id}/messages"
)
def list_messages(
    conversation_id: Annotated[
        str, ApiPath(min_length=1, max_length=120)
    ],
    limit: int = Query(default=50, ge=1, le=100),
    user=Depends(current_user)
):
    requester = authenticated_identity(user)
    messaging = load_messaging()
    try:
        return messaging.list_messages(
            DATABASE_PATH,
            conversation_id,
            requester,
            limit=limit
        )
    except messaging.MessagingError as error:
        handle_error(error, messaging)
