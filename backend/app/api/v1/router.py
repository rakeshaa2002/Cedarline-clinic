from fastapi import APIRouter

from app.api.v1.routers import admin, auth, chat, clinic, health, knowledge

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(clinic.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
api_router.include_router(knowledge.router)
