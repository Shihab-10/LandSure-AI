import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
import re

from app.services.database import get_parcel, get_related
from app.services.user_store import initialize_auth_db
from app.services.intent import classify_query
from app.services.evidence import (
    get_verification,
    get_advice,
)

@asynccontextmanager
async def lifespan(_app):
    initialize_auth_db()
    yield


app = FastAPI(
    title="LandSure AI API",
    version="0.1.0",
    description="Synthetic land intelligence demo API",
    lifespan=lifespan,
)
import os

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://landsure-ai.pages.dev",
]

def get_cors_origins() -> list[str]:
    custom = os.environ.get("LANDSURE_CORS_ORIGINS", "").strip()
    if not custom:
        return DEFAULT_CORS_ORIGINS
    origins = [
        item.strip()
        for item in custom.split(",")
        if item.strip() and item.strip() != "*"
    ]
    return origins if origins else DEFAULT_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# LandSure AI V9 — Legal Expert Connect
from app.routers.legal_experts import router as legal_experts_router
app.include_router(legal_experts_router)

from app.routers.legal_chat import router as legal_chat_router
app.include_router(legal_chat_router)

from app.routers.legal_bookings import router as legal_bookings_router
# STEP_10AY_TEMP_DISABLED: from app.routers.legal_calls import router as legal_calls_router
app.include_router(legal_bookings_router)
# STEP_10AY_TEMP_DISABLED: app.include_router(legal_calls_router)


PARCEL_ID_REGEX = re.compile(r"^LS-PARCEL-\d{6}$")

def normalize_parcel_id(parcel_id):
    value = parcel_id.strip().upper()

    if not PARCEL_ID_REGEX.fullmatch(value):
        raise HTTPException(
            status_code=422,
            detail="Invalid parcel ID format"
        )

    return value

def require_parcel(parcel_id):
    parcel_id = normalize_parcel_id(parcel_id)
    parcel = get_parcel(parcel_id)

    if parcel is None:
        raise HTTPException(
            status_code=404,
            detail="Parcel not found"
        )

    return parcel

class AIQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    language: Literal["en", "bn", "banglish"] = "bn"

def is_demo_only_mode() -> bool:
    return os.environ.get("LANDSURE_DEMO_ONLY_MODE", "false").strip().lower() in ("true", "1", "yes")

@app.get("/health")
@app.get("/api/v1/health")
def health():
    demo_mode = is_demo_only_mode()
    return {
        "status": "ok",
        "project": "LandSure AI",
        "synthetic": True,
        "demo_mode": demo_mode,
        "persistent_storage": not demo_mode,
    }

@app.get("/api/v1/parcels/{parcel_id}")
def parcel_lookup(parcel_id: str):
    return {
        "parcel": require_parcel(parcel_id),
        "synthetic": True,
        "officially_verified": False,
    }

@app.get("/api/v1/parcels/{parcel_id}/surveys")
def survey_history(parcel_id: str):
    parcel = require_parcel(parcel_id)

    return {
        "parcel_id": parcel["parcel_id"],
        "surveys": get_related(
            "survey_records",
            parcel["parcel_id"]
        ),
        "synthetic": True,
    }

@app.get("/api/v1/parcels/{parcel_id}/verification")
def verification(parcel_id: str):
    parcel = require_parcel(parcel_id)
    result = get_verification(parcel["parcel_id"])

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Verification snapshot unavailable"
        )

    return result

@app.get("/api/v1/parcels/{parcel_id}/advisor")
def advisor(
    parcel_id: str,
    language: Literal["en", "bn", "banglish"] = Query("bn")
):
    parcel = require_parcel(parcel_id)
    result = get_advice(parcel["parcel_id"], language)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Advisor response unavailable"
        )

    return result

INTENT_TABLES = {
    "PARCEL_LOOKUP": [],
    "SURVEY_COMPARISON": [
        "survey_records",
        "survey_correspondences",
    ],
    "SURVEY_HISTORY": [
        "survey_records",
        "survey_correspondences",
    ],
    "OWNERSHIP_CHECK": [
        "ownership_claims",
        "survey_records",
    ],
    "FRAUD_RISK": [
        "transactions",
        "ownership_claims",
    ],
    "MUTATION_STATUS": ["mutations"],
    "DOCUMENT_VERIFICATION": ["documents"],
    "VERIFICATION_EXPLANATION": ["evidence_sources"],
    "TRUST_PASSPORT": [
        "survey_records",
        "ownership_claims",
        "documents",
        "mutations",
    ],
    "CHANGE_WATCH": ["parcel_events"],
}

@app.post("/api/v1/ai/query")
def ai_query(payload: AIQueryRequest):
    routing = classify_query(payload.question)

    if routing["status"] != "READY":
        return {
            "status": routing["status"],
            "routing": routing,
            "synthetic": True,
        }

    intent = routing["intent"]

    if intent == "LAND_KNOWLEDGE":
        return {
            "status": "KNOWLEDGE_BASE_REQUIRED",
            "routing": routing,
        }

    parcel_id = routing["parcel_id"]
    parcel = require_parcel(parcel_id)

    related = {
        table: get_related(table, parcel_id)
        for table in INTENT_TABLES.get(intent, [])
    }

    return {
        "status": "SUCCESS",
        "routing": routing,
        "parcel": parcel,
        "related_records": related,
        "verification": get_verification(parcel_id),
        "review_advisor": get_advice(
            parcel_id,
            payload.language
        ),
        "synthetic": True,
        "officially_verified": False,
        "disclaimer": (
            "Synthetic demonstration only. "
            "Not official land verification."
        ),
    }


# LAND_INTELLIGENCE_V2_ROUTES
from app.services.land_intelligence import (
    survey_comparison,
    document_review,
    mutation_history,
    change_watch,
)

@app.get("/api/v1/parcels/{parcel_id}/survey-comparison")
def api_survey_comparison(parcel_id: str):
    parcel = require_parcel(parcel_id)
    return survey_comparison(parcel["parcel_id"])


@app.get("/api/v1/parcels/{parcel_id}/documents")
def api_document_review(parcel_id: str):
    parcel = require_parcel(parcel_id)
    return document_review(parcel["parcel_id"])


@app.get("/api/v1/parcels/{parcel_id}/mutations")
def api_mutation_history(parcel_id: str):
    parcel = require_parcel(parcel_id)
    return mutation_history(parcel["parcel_id"])


@app.get("/api/v1/parcels/{parcel_id}/events")
def api_change_watch(parcel_id: str):
    parcel = require_parcel(parcel_id)
    return change_watch(parcel["parcel_id"])


# LAND_SURE_SECURITY_HEADERS_V1
from fastapi import Request

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"

    return response


# LANDSURE_AUTH_V1
from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth import (
    authenticate,
    create_token,
    create_demo_token,
    decode_token,
    get_secret,
)

bearer_scheme = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    username: str
    password: str

def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    )
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    return decode_token(credentials.credentials)


def require_roles(*allowed_roles):
    def checker(user=Depends(current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return user

    return checker


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    try:
        get_secret()
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable"
        )

    user = authenticate(
        payload.username,
        payload.password
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    return {
        "access_token": create_token(user),
        "token_type": "bearer",
        "expires_in": 1800,
    }


@app.post("/api/v1/auth/demo")
def demo_login():
    try:
        token = create_demo_token()
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Demo authentication service unavailable"
        )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 1800,
        "role": "demo",
        "username": "demo-visitor",
        "is_demo": True,
    }


@app.get("/api/v1/auth/me")
def auth_me(user=Depends(current_user)):
    return user


@app.get("/api/v1/admin/status")
def admin_status(
    user=Depends(require_roles("admin"))
):
    return {
        "status": "authorized",
        "role": user["role"],
    }


@app.get("/api/v1/reviewer/status")
def reviewer_status(
    user=Depends(
        require_roles("admin", "reviewer")
    )
):
    return {
        "status": "authorized",
        "role": user["role"],
    }


@app.middleware("http")
async def protect_api_routes(request: Request, call_next):
    path = request.url.path

    public_paths = {
        "/api/v1/auth/login",
        "/api/v1/auth/demo",
        "/api/v1/health",
    }


    if (
        path.startswith("/api/v1/")
        and path not in public_paths
        and request.method != "OPTIONS"
    ):
        authorization = request.headers.get(
            "authorization", ""
        )

        scheme, _, token = authorization.partition(" ")

        if scheme.lower() != "bearer" or not token:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication required"},
                headers={
                    "WWW-Authenticate": "Bearer",
                    "Cache-Control": "no-store",
                },
            )

        try:
            decode_token(token)
        except HTTPException as exc:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers={"Cache-Control": "no-store"},
            )

    return await call_next(request)


# LANDSURE_USER_MANAGEMENT_V2

from typing import Literal
from pydantic import Field
from app.services.user_store import (
    create_user,
    list_users,
    find_user,
    change_password,
    set_user_active,
)

class CreateUserRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=40,
        pattern=r"^[a-zA-Z0-9_-]+$"
    )
    password: str = Field(min_length=16)
    role: Literal["admin", "reviewer", "viewer"]

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=16)

@app.get("/api/v1/admin/users")
def api_list_users(
    user=Depends(require_roles("admin"))
):
    return {"users": list_users()}


@app.post("/api/v1/admin/users", status_code=201)
def api_create_user(
    payload: CreateUserRequest,
    user=Depends(require_roles("admin"))
):
    if is_demo_only_mode():
        raise HTTPException(
            status_code=403,
            detail="Persistent user creation is disabled in demo-only deployment"
        )

    try:
        create_user(
            payload.username,
            payload.password,
            payload.role
        )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    return {
        "username": payload.username,
        "role": payload.role,
        "created": True,
    }


@app.post("/api/v1/auth/change-password")
def api_change_password(
    payload: ChangePasswordRequest,
    user=Depends(current_user)
):
    if user.get("is_demo") or user.get("role") == "demo":
        raise HTTPException(
            status_code=403,
            detail="Demo sessions cannot change passwords"
        )

    if is_demo_only_mode():
        raise HTTPException(
            status_code=403,
            detail="Password modifications are disabled in demo-only deployment"
        )

    success = change_password(
        user["username"],
        payload.old_password,
        payload.new_password
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    return {
        "message": "Password changed",
        "previous_tokens_revoked": True,
    }


@app.patch("/api/v1/admin/users/{username}/deactivate")
def api_deactivate_user(
    username: str,
    user=Depends(require_roles("admin"))
):
    if is_demo_only_mode():
        raise HTTPException(
            status_code=403,
            detail="Account deactivation is disabled in demo-only deployment"
        )
    if username == user["username"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account"
        )

    if find_user(username) is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    set_user_active(username, False)

    return {
        "username": username,
        "is_active": False,
    }


# LANDSURE_LOGIN_RATE_LIMIT_V1

from collections import defaultdict, deque
from time import monotonic
from threading import Lock
from fastapi.responses import JSONResponse

_login_attempts = defaultdict(deque)
_login_lock = Lock()

MAX_ATTEMPTS = 10
WINDOW_SECONDS = 60

@app.middleware("http")
async def login_rate_limit(request: Request, call_next):
    if (
        request.url.path in {"/api/v1/auth/login", "/api/v1/auth/demo"}
        and request.method == "POST"
    ):
        client_ip = (
            request.client.host
            if request.client
            else "unknown"
        )

        now = monotonic()

        with _login_lock:
            attempts = _login_attempts[client_ip]

            while attempts and (
                now - attempts[0] > WINDOW_SECONDS
            ):
                attempts.popleft()

            if len(attempts) >= MAX_ATTEMPTS:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many login attempts"
                    },
                    headers={
                        "Retry-After": "60",
                        "Cache-Control": "no-store",
                    },
                )

            attempts.append(now)

    return await call_next(request)


# LANDSURE_TRUST_PASSPORT_V1
from fastapi.responses import Response
from app.services.trust_passport import generate_trust_passport

@app.get("/api/v1/parcels/{parcel_id}/trust-passport")
def download_trust_passport(
    parcel_id: str,
    user=Depends(
        require_roles("admin", "reviewer", "viewer", "demo")
    ),
):
    parcel = require_parcel(parcel_id)

    pdf_bytes = generate_trust_passport(
        parcel["parcel_id"]
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                'attachment; filename="'
                + parcel["parcel_id"]
                + '_Trust_Passport.pdf"'
            ),
            "Cache-Control": "no-store",
        },
    )


# LANDSURE_AI_ASSISTANT_V1

from app.services.ai_assistant import (
    build_ai_answer,
    normalize_language,
)

@app.post("/api/v1/ai/assistant")
def ai_assistant(
    payload: AIQueryRequest,
    user=Depends(
        require_roles("admin", "reviewer", "viewer", "demo")
    ),
):
    routing = classify_query(payload.question)

    language = normalize_language(payload.language)

    if routing["status"] != "READY":
        return {
            "status": routing["status"],
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
        }

    intent = routing["intent"]

    if intent == "LAND_KNOWLEDGE":
        return {
            "status": "KNOWLEDGE_BASE_REQUIRED",
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
        }

    parcel_id = routing["parcel_id"]

    require_parcel(parcel_id)

    verification = get_verification(parcel_id)
    advisor = get_advice(parcel_id, language)

    result = build_ai_answer(
        parcel_id=parcel_id,
        intent=intent,
        language=language,
        verification=verification,
        advisor=advisor,
    )

    result["routing"] = routing

    return result


# LANDSURE_AI_ASSISTANT_V2

from app.services.intent_responses import (
    build_intent_details,
)

@app.post("/api/v1/ai/assistant-v2")
def ai_assistant_v2(
    payload: AIQueryRequest,
    user=Depends(
        require_roles("admin", "reviewer", "viewer", "demo")
    ),
):
    routing = classify_query(payload.question)
    language = normalize_language(payload.language)

    if routing["status"] != "READY":
        return {
            "status": routing["status"],
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
            "purchase_clearance": False,
        }

    intent = routing["intent"]

    if intent == "LAND_KNOWLEDGE":
        return {
            "status": "KNOWLEDGE_BASE_REQUIRED",
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
            "purchase_clearance": False,
        }

    parcel_id = routing["parcel_id"]
    parcel = require_parcel(parcel_id)

    verification = get_verification(parcel_id)
    advisor = get_advice(parcel_id, language)

    response = build_ai_answer(
        parcel_id=parcel_id,
        intent=intent,
        language=language,
        verification=verification,
        advisor=advisor,
    )

    details = build_intent_details(
        parcel_id,
        intent,
        verification
    )

    response["parcel"] = parcel
    response["routing"] = routing
    response["intent_details"] = details

    return response


# LANDSURE_AI_ASSISTANT_V3

from app.services.intent_routing_v2 import (
    classify_query_v2,
)

@app.post("/api/v1/ai/assistant-v3")
def ai_assistant_v3(
    payload: AIQueryRequest,
    user=Depends(
        require_roles("admin", "reviewer", "viewer", "demo")
    ),
):
    routing = classify_query_v2(payload.question)
    language = normalize_language(payload.language)

    if routing["status"] != "READY":
        return {
            "status": routing["status"],
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
            "purchase_clearance": False,
        }

    intent = routing["intent"]

    if intent == "LAND_KNOWLEDGE":
        return {
            "status": "KNOWLEDGE_BASE_REQUIRED",
            "routing": routing,
            "language": language,
            "answer": None,
            "synthetic": True,
            "officially_verified": False,
            "purchase_clearance": False,
        }

    parcel_id = routing["parcel_id"]
    parcel = require_parcel(parcel_id)

    verification = get_verification(parcel_id)
    advisor = get_advice(parcel_id, language)

    response = build_ai_answer(
        parcel_id=parcel_id,
        intent=intent,
        language=language,
        verification=verification,
        advisor=advisor,
    )

    response["parcel"] = parcel
    response["routing"] = routing
    response["intent_details"] = build_intent_details(
        parcel_id,
        intent,
        verification,
    )

    return response


# LandSure AI V9 — Legal Expert Connect

# ============================================================
# LANDSURE_ROUTER_V4_GATE_V2_ENDPOINT
# Experimental advisory AI classification
# ============================================================

from app.services.ai_model_integration_v4 import (
    classify_with_v4
)

class AIClassifyV4Request(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

@app.post("/api/v1/ai/classify-v4")
def ai_classify_v4(request: AIClassifyV4Request, user=Depends(current_user)):
    return classify_with_v4(request.question)


# ============================================================
# LandSure Step 13B — JWT-protected Copilot
# ============================================================
from fastapi import Depends as _landsure_depends
from app.services.copilot_evidence_v1 import (
    CopilotRequest as _LandSureCopilotRequest,
    copilot_evidence as _landsure_copilot_handler,
)

@app.post("/api/v1/copilot/evidence")
def landsure_copilot_evidence_protected(
    request: _LandSureCopilotRequest,
    authenticated_user = _landsure_depends(current_user),
):
    return _landsure_copilot_handler(request)
