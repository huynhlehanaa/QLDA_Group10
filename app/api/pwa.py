from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import get_db
from app.models.user import User
from app.services import pwa_service

router = APIRouter(prefix="/pwa", tags=["PWA"])


# ── Schemas ───────────────────────────────────────────────────

class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict   # {"p256dh": "...", "auth": "..."}
    platform: str = "android"


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


class NotificationSettingsUpdate(BaseModel):
    push_enabled: bool
    types: dict


class SyncRequest(BaseModel):
    last_sync_at: datetime


class QuickActionRequest(BaseModel):
    action: str


# ── Manifest (public) ─────────────────────────────────────────

@router.get("/manifest")
def get_manifest():
    """PB191, PB192, PB193, PB195: PWA manifest.json"""
    return pwa_service.get_manifest()


@router.get("/install-guide")
def get_install_guide(
    platform: str = Query(..., regex="^(ios|android)$"),
    current_user: User = Depends(get_current_user),
):
    """PB191, PB192: hướng dẫn cài đặt PWA"""
    return pwa_service.get_install_guide(platform)


# ── Push Subscription ─────────────────────────────────────────

@router.post("/push/subscribe")
def subscribe_push(
    body: PushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB205, PB206: đăng ký Web Push"""
    return pwa_service.subscribe_push(
        current_user.id,
        body.endpoint,
        body.keys.get("p256dh", ""),
        body.keys.get("auth", ""),
        body.platform,
        db,
    )


@router.post("/push/unsubscribe")
def unsubscribe_push(
    body: PushUnsubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB207: hủy đăng ký Web Push"""
    return pwa_service.unsubscribe_push(current_user.id, body.endpoint, db)


# ── Notification Preferences ──────────────────────────────────

@router.get("/notification-settings")
def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB207: xem cài đặt thông báo"""
    return pwa_service.get_notification_settings(current_user.id, db)


@router.patch("/notification-settings")
def update_notification_settings(
    body: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB207: cập nhật cài đặt thông báo"""
    return pwa_service.update_notification_settings(
        current_user.id, body.push_enabled, body.types, db,
    )


# ── Badge Count ───────────────────────────────────────────────

@router.get("/badge-count")
def get_badge_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB199: số task cần làm (badge trên icon app)"""
    return pwa_service.get_badge_count(current_user.id, db)


# ── Offline Data ──────────────────────────────────────────────

@router.get("/offline-data")
def get_offline_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB203: dữ liệu cần cache cho offline mode"""
    return pwa_service.get_offline_data(current_user, db)


# ── Sync ──────────────────────────────────────────────────────

@router.post("/sync")
def sync_data(
    body: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB204: đồng bộ dữ liệu khi có mạng trở lại"""
    return pwa_service.sync_data(current_user, body.last_sync_at, db)


# ── Mobile Kanban ─────────────────────────────────────────────

@router.get("/kanban")
def get_mobile_kanban(
    column: str = Query(..., regex="^(todo|in_progress|done)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB196: Kanban tối ưu mobile — từng cột riêng lẻ"""
    return pwa_service.get_mobile_kanban(current_user, column, db)


# ── Mobile Task Detail ────────────────────────────────────────

@router.get("/tasks/{task_id}")
def get_mobile_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB197: chi tiết task mobile-friendly"""
    return pwa_service.get_mobile_task_detail(task_id, current_user, db)


# ── Quick Action ──────────────────────────────────────────────

@router.patch("/tasks/{task_id}/quick-action")
def quick_action(
    task_id: UUID,
    body: QuickActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB200: swipe action (complete)"""
    return pwa_service.quick_action(task_id, body.action, current_user, db)


# ── Mobile KPI Summary ────────────────────────────────────────

@router.get("/kpi-summary")
def get_kpi_summary(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB198: KPI summary tối ưu mobile"""
    now = datetime.now(timezone.utc)
    return pwa_service.get_kpi_summary_mobile(
        current_user, year or now.year, month or now.month, db,
    )
