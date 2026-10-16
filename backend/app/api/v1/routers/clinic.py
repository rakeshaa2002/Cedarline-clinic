"""Public, read-only clinic content + the contact form."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.api.deps import DbSession
from app.core.exceptions import NotFoundError
from app.core.rate_limit import rate_limit
from app.models import BlogPost, ClinicInfo, ContactMessage, Doctor, Service
from app.schemas.clinic import (
    BlogPostOut,
    BlogPostSummary,
    ClinicHighlightsOut,
    ClinicInfoOut,
    ContactCreate,
    Department,
    DoctorOut,
    ServiceOut,
    TestimonialOut,
)
from app.schemas.common import Message, Page
from app.seed import data

router = APIRouter(tags=["clinic"])


@router.get("/clinic-info", response_model=ClinicInfoOut)
def clinic_info(db: DbSession):
    info = db.scalar(select(ClinicInfo).limit(1))
    if not info:
        raise NotFoundError("Clinic information has not been configured.")
    return info


@router.get("/services", response_model=list[ServiceOut])
def list_services(db: DbSession, department: Department | None = None):
    stmt = select(Service).where(Service.is_active).order_by(Service.department, Service.sort_order, Service.name)
    if department:
        stmt = stmt.where(Service.department == department)
    return db.scalars(stmt).all()


@router.get("/services/{service_id}", response_model=ServiceOut)
def get_service(service_id: int, db: DbSession):
    service = db.get(Service, service_id)
    if not service or not service.is_active:
        raise NotFoundError("Service not found.")
    return service


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    db: DbSession,
    department: Department | None = None,
    service_id: Annotated[int | None, Query(description="Only doctors who provide this service")] = None,
):
    stmt = select(Doctor).where(Doctor.is_active).order_by(Doctor.department, Doctor.full_name)
    if service_id:
        service = db.get(Service, service_id)
        if not service:
            raise NotFoundError("Service not found.")
        # General services can be provided by any doctor; others need a matching department.
        if service.department != "general":
            department = service.department
    if department:
        stmt = stmt.where(Doctor.department == department)
    return db.scalars(stmt).all()


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: DbSession):
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_active:
        raise NotFoundError("Doctor not found.")
    return doctor


@router.get("/blog", response_model=Page[BlogPostSummary])
def list_blog_posts(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 6,
    category: Annotated[str | None, Query(max_length=40)] = None,
):
    base = select(BlogPost).where(BlogPost.is_published)
    if category:
        base = base.where(BlogPost.category == category)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = db.scalars(
        base.options(joinedload(BlogPost.author))
        .order_by(BlogPost.published_at.desc(), BlogPost.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return Page.build([BlogPostSummary.model_validate(p) for p in items], total, page, page_size)


@router.get("/blog/categories", response_model=list[str])
def blog_categories(db: DbSession):
    return db.scalars(
        select(BlogPost.category).where(BlogPost.is_published).distinct().order_by(BlogPost.category)
    ).all()


@router.get("/blog/{slug}", response_model=BlogPostOut)
def get_blog_post(slug: str, db: DbSession):
    post = db.scalar(
        select(BlogPost).options(joinedload(BlogPost.author)).where(BlogPost.slug == slug, BlogPost.is_published)
    )
    if not post:
        raise NotFoundError("Article not found.")
    return post


@router.post(
    "/contact",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("contact", "rate_limit_contact_per_minute"))],
)
def submit_contact(data: ContactCreate, db: DbSession):
    db.add(ContactMessage(**data.model_dump(mode="json")))
    db.commit()
    return Message(message="Thank you! Our front desk will get back to you within one working day.")


@router.get("/testimonials", response_model=list[TestimonialOut])
def get_testimonials():
    return data.TESTIMONIALS


@router.get("/clinic-highlights", response_model=ClinicHighlightsOut)
def get_clinic_highlights():
    return data.CLINIC_HIGHLIGHTS

