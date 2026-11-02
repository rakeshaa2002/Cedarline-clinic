from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Patient, User

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False, description="JWT from POST /api/v1/auth/login")


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


def require_roles(*roles: str):
    """Dependency factory: the current user must have one of `roles`."""

    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do this.")
        return user

    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
StaffUser = Annotated[User, Depends(require_roles("admin", "staff", "doctor"))]
AdminUser = Annotated[User, Depends(require_roles("admin"))]



def get_current_patient(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Patient:
    """Patient-portal login. Patient tokens use subject "patient:<id>", so they can never pass as staff
    tokens (get_current_user requires a numeric subject) and staff tokens never pass here."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in to your RUA account again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        kind, _, raw_id = str(payload["sub"]).partition(":")
        if kind != "patient" or payload.get("role") != "patient":
            raise ValueError
        patient = db.get(Patient, int(raw_id))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None
    if patient is None:
        raise unauthorized
    return patient


CurrentPatient = Annotated[Patient, Depends(get_current_patient)]
