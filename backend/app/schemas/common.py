import math
import re
from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(cls, items: list[T], total: int, page: int, page_size: int) -> "Page[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=max(1, math.ceil(total / page_size)) if page_size else 1,
        )


class Message(BaseModel):
    message: str


# --- Reusable field validators -------------------------------------------------

_NAME_RE = re.compile(r"^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,119}$")
_PHONE_ALLOWED_RE = re.compile(r"^\+?[0-9 ()\-]{7,20}$")


def _clean_name(v: str) -> str:
    v = " ".join(v.split())
    if not _NAME_RE.match(v):
        raise ValueError("Enter a valid full name (letters, spaces, . ' - only)")
    return v


def _clean_phone(v: str) -> str:
    v = v.strip()
    digits = re.sub(r"\D", "", v)
    if not _PHONE_ALLOWED_RE.match(v) or not 7 <= len(digits) <= 15:
        raise ValueError("Enter a valid phone number (7–15 digits, optional +country code)")
    return v


PersonName = Annotated[str, AfterValidator(_clean_name)]
PhoneNumber = Annotated[str, AfterValidator(_clean_phone)]
