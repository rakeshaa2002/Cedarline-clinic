from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import LoginRequest, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Verified against when the email doesn't exist, so response time doesn't reveal valid emails.
_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")


@router.post(
    "/login",
    response_model=TokenOut,
    dependencies=[Depends(rate_limit("login", "rate_limit_login_per_minute"))],
)
def login(data: LoginRequest, db: DbSession) -> TokenOut:
    user = db.scalar(select(User).where(func.lower(User.email) == data.email.lower()))
    valid = verify_password(data.password, user.hashed_password if user else _DUMMY_HASH)
    if not user or not valid or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    token, expires_in = create_access_token(str(user.id), user.role)
    return TokenOut(access_token=token, expires_in=expires_in, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
