"""Admin content tools: blog CMS, before/after gallery, image uploads and the brand theme."""

import math
from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.api.deps import AdminUser, DbSession, StaffUser
from app.api.v1.routers.admin import refresh_knowledge_base
from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.models import BlogPost, ClinicInfo, Doctor, TransformationCase
from app.schemas.clinic import (
    BlogPostAdminOut,
    BlogPostCreate,
    BlogPostUpdate,
    ClinicInfoOut,
    ThemeUpdate,
    TransformationAdminOut,
    TransformationIn,
)
from app.services.media import store_image

router = APIRouter(prefix="/admin", tags=["admin: content"])


# --- Media -------------------------------------------------------------------------------


class UploadedMedia(BaseModel):
    url: str


@router.post("/media", response_model=UploadedMedia, status_code=status.HTTP_201_CREATED)
async def upload_media(db: DbSession, _: StaffUser, file: Annotated[UploadFile, File(description="JPEG, PNG, WebP or GIF")]):
    return UploadedMedia(url=store_image(db, file.filename or "image", await file.read()))


# --- Blog CMS --------------------------------------------------------------------------------


def _reading_minutes(content: str) -> int:
    return max(1, math.ceil(len(content.split()) / 200))  # ~200 words per minute


def _apply_post(post: BlogPost, data: BlogPostCreate | BlogPostUpdate, db) -> None:
    if data.author_id is not None and db.get(Doctor, data.author_id) is None:
        raise ValidationFailedError("The selected author doesn't exist.")
    for field, value in data.model_dump(exclude={"slug", "reading_minutes", "published_at"}).items():
        setattr(post, field, value)
    post.reading_minutes = data.reading_minutes or _reading_minutes(data.content)
    post.published_at = data.published_at or post.published_at or date.today()


@router.get("/blog", response_model=list[BlogPostAdminOut])
def admin_list_posts(db: DbSession, _: StaffUser):
    stmt = select(BlogPost).options(joinedload(BlogPost.author)).order_by(BlogPost.published_at.desc(), BlogPost.id.desc())
    return db.scalars(stmt).all()


@router.post("/blog", response_model=BlogPostAdminOut, status_code=status.HTTP_201_CREATED)
def create_post(data: BlogPostCreate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    post = BlogPost(slug=data.slug)
    _apply_post(post, data, db)
    db.add(post)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An article with this slug already exists.") from None
    tasks.add_task(refresh_knowledge_base)  # published articles feed the chatbot
    return db.scalar(select(BlogPost).options(joinedload(BlogPost.author)).where(BlogPost.id == post.id))


@router.put("/blog/{post_id}", response_model=BlogPostAdminOut)
def update_post(post_id: int, data: BlogPostUpdate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    post = db.get(BlogPost, post_id)
    if post is None:
        raise NotFoundError("Article not found.")
    _apply_post(post, data, db)
    db.commit()
    tasks.add_task(refresh_knowledge_base)
    return db.scalar(select(BlogPost).options(joinedload(BlogPost.author)).where(BlogPost.id == post.id))


@router.delete("/blog/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    post = db.get(BlogPost, post_id)
    if post is None:
        raise NotFoundError("Article not found.")
    db.delete(post)
    db.commit()
    tasks.add_task(refresh_knowledge_base)
    return None


# --- Before / after gallery --------------------------------------------------------------------


@router.get("/transformations", response_model=list[TransformationAdminOut])
def admin_list_transformations(db: DbSession, _: StaffUser):
    stmt = select(TransformationCase).order_by(TransformationCase.department, TransformationCase.sort_order, TransformationCase.id)
    return db.scalars(stmt).all()


@router.post("/transformations", response_model=TransformationAdminOut, status_code=status.HTTP_201_CREATED)
def create_transformation(data: TransformationIn, db: DbSession, _: AdminUser):
    case = TransformationCase(**data.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.put("/transformations/{case_id}", response_model=TransformationAdminOut)
def update_transformation(case_id: int, data: TransformationIn, db: DbSession, _: AdminUser):
    case = db.get(TransformationCase, case_id)
    if case is None:
        raise NotFoundError("Case not found.")
    for field, value in data.model_dump().items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/transformations/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transformation(case_id: int, db: DbSession, _: AdminUser):
    case = db.get(TransformationCase, case_id)
    if case is None:
        raise NotFoundError("Case not found.")
    db.delete(case)
    db.commit()
    return None


# --- Brand theme ----------------------------------------------------------------------------------


@router.put("/theme", response_model=ClinicInfoOut)
def update_theme(data: ThemeUpdate, db: DbSession, _: AdminUser):
    """Switch the website's brand palette; every open page picks it up on its next refresh of clinic info."""
    clinic = db.scalar(select(ClinicInfo).limit(1))
    if clinic is None:
        raise NotFoundError("Clinic information has not been configured.")
    clinic.theme = data.theme
    db.commit()
    db.refresh(clinic)
    return clinic
