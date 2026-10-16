
import os
import jwt

from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from pwdlib import PasswordHash

from app.services.user_store import find_user

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30

password_hash = PasswordHash.recommended()

def authenticate(username, password):
    user = find_user(username)

    if user is None or not user["is_active"]:
        return None

    if not password_hash.verify(
        password,
        user["password_hash"]
    ):
        return None

    return {
        "username": user["username"],
        "role": user["role"],
        "token_version": user["token_version"],
    }


def get_secret():
    secret = os.environ.get("LANDSURE_JWT_SECRET")

    if not secret or len(secret) < 32:
        raise RuntimeError(
            "LANDSURE_JWT_SECRET is not configured"
        )

    return secret


def create_token(user):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "token_version": user["token_version"],
        "iat": now,
        "exp": now + timedelta(
            minutes=TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        get_secret(),
        algorithm=ALGORITHM
    )


def decode_token(token):
    try:
        payload = jwt.decode(
            token,
            get_secret(),
            algorithms=[ALGORITHM],
            options={
                "require": [
                    "sub",
                    "role",
                    "token_version",
                    "iat",
                    "exp",
                ]
            }
        )

        user = find_user(payload["sub"])

        if (
            user is None
            or not user["is_active"]
            or user["role"] != payload["role"]
            or user["token_version"] != payload["token_version"]
        ):
            raise ValueError("Token no longer valid")

        return {
            "username": user["username"],
            "role": user["role"],
        }

    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
