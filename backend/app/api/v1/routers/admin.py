"""Authenticated staff/admin endpoints: dashboard overview, doctors, services, messages."""

from datetime import date, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession, StaffUser
from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError
from app.db.session import SessionLocal
from app.models import CHAT_STATUSES, ChatEvent, ContactMessage, Doctor, KnowledgeChunk, KnowledgeDocument, Service
from app.schemas.chat import ChatDayCount, ChatUsage, KnowledgeSummary, Overview
from app.schemas.clinic import (
    ContactOut,
    DoctorCreate,
    DoctorOut,
    DoctorUpdate,
    ServiceCreate,
    ServiceOut,
    ServiceUpdate,
)
from app.services.knowledge_base.embeddings import get_embedder
from app.services.knowledge_base.system_documents import sync_generated_documents

router = APIRouter(prefix="/admin", tags=["admin"])


def refresh_knowledge_base() -> None:
    """Background task: keep chatbot knowledge in sync after catalogue edits."""
    import logging

    db = SessionLocal()
    try:
        sync_generated_documents(db, get_embedder(), include_seed=False)
    except Exception:  # noqa: BLE001 - background task must not crash the worker
        logging.getLogger(__name__).exception("Knowledge base refresh failed")
    finally:
        db.close()


# --- Dashboard ---------------------------------------------------------------------

CHAT_DAYS = 14  # length of the daily chart
CHAT_WINDOW_DAYS = 30  # window for the totals and outcome breakdown


@router.get("/overview", response_model=Overview)
def overview(db: DbSession, _: StaffUser):
    settings = get_settings()
    tz = settings.clinic_timezone
    today = datetime.now(ZoneInfo(tz)).date()
    local_day = func.date(func.timezone(tz, ChatEvent.created_at))

    window_start = today - timedelta(days=CHAT_WINDOW_DAYS - 1)
    in_window = local_day >= window_start
    by_status = dict.fromkeys(CHAT_STATUSES, 0)
    by_status.update(db.execute(select(ChatEvent.status, func.count()).where(in_window).group_by(ChatEvent.status)).all())
    total = sum(by_status.values())
    avg_latency = db.scalar(select(func.avg(ChatEvent.latency_ms)).where(in_window))

    first_day = today - timedelta(days=CHAT_DAYS - 1)
    counts: dict[date, int] = dict(
        db.execute(select(local_day, func.count()).where(local_day >= first_day).group_by(local_day)).all()
    )
    per_day = [ChatDayCount(date=d, count=counts.get(d, 0)) for d in (first_day + timedelta(days=i) for i in range(CHAT_DAYS))]

    documents = dict(db.execute(select(KnowledgeDocument.status, func.count()).group_by(KnowledgeDocument.status)).all())
    return Overview(
        chat=ChatUsage(
            today=counts.get(today, 0),
            total=total,
            window_days=CHAT_WINDOW_DAYS,
            by_status=by_status,
            # Share of questions answered from clinic information (fallback quotes it too).
            answered_rate=round((by_status["answered"] + by_status["fallback"]) / total, 3) if total else None,
            avg_latency_ms=round(avg_latency) if avg_latency is not None else None,
            per_day=per_day,
        ),
        knowledge=KnowledgeSummary(
            documents=sum(documents.values()),
            ready=documents.get("ready", 0),
            failed=documents.get("failed", 0),
            chunks=db.scalar(select(func.count(KnowledgeChunk.id))) or 0,
            embedding_model=settings.embedding_model_id,
        ),
        unread_messages=db.scalar(select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))) or 0,
        active_doctors=db.scalar(select(func.count(Doctor.id)).where(Doctor.is_active.is_(True))) or 0,
        active_services=db.scalar(select(func.count(Service.id)).where(Service.is_active.is_(True))) or 0,
    )


# --- Doctors (admin only) ------------------------------------------------------------


@router.get("/doctors", response_model=list[DoctorOut])
def admin_list_doctors(db: DbSession, _: StaffUser):
    return db.scalars(select(Doctor).order_by(Doctor.department, Doctor.full_name)).all()


@router.post("/doctors", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorCreate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    doctor = Doctor(**data.model_dump())
    db.add(doctor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("A doctor with this slug already exists.") from None
    db.refresh(doctor)
    tasks.add_task(refresh_knowledge_base)
    return doctor


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: int, data: DoctorUpdate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise NotFoundError("Doctor not found.")
    for field, value in data.model_dump().items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    tasks.add_task(refresh_knowledge_base)
    return doctor


@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise NotFoundError("Doctor not found.")
    db.delete(doctor)
    db.commit()
    tasks.add_task(refresh_knowledge_base)
    return None


# --- Services (admin only) -----------------------------------------------------------


@router.get("/services", response_model=list[ServiceOut])
def admin_list_services(db: DbSession, _: StaffUser):
    return db.scalars(select(Service).order_by(Service.department, Service.sort_order)).all()


@router.post("/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(data: ServiceCreate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    service = Service(**data.model_dump())
    db.add(service)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("A service with this slug already exists.") from None
    db.refresh(service)
    tasks.add_task(refresh_knowledge_base)
    return service


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, data: ServiceUpdate, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    service = db.get(Service, service_id)
    if not service:
        raise NotFoundError("Service not found.")
    for field, value in data.model_dump().items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    tasks.add_task(refresh_knowledge_base)
    return service


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, db: DbSession, _: AdminUser, tasks: BackgroundTasks):
    service = db.get(Service, service_id)
    if not service:
        raise NotFoundError("Service not found.")
    db.delete(service)
    db.commit()
    tasks.add_task(refresh_knowledge_base)
    return None


# --- Contact messages ------------------------------------------------------------------


@router.get("/messages", response_model=list[ContactOut])
def list_messages(db: DbSession, _: StaffUser, limit: Annotated[int, Query(ge=1, le=200)] = 50):
    return db.scalars(select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(limit)).all()


@router.patch("/messages/{message_id}/read", response_model=ContactOut)
def mark_message_read(message_id: int, db: DbSession, _: StaffUser):
    msg = db.get(ContactMessage, message_id)
    if not msg:
        raise NotFoundError("Message not found.")
    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return msg
