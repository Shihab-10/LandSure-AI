from fastapi import Depends, HTTPException
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from app.services.auth import decode_token

bearer_scheme = HTTPBearer(auto_error=False)

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
