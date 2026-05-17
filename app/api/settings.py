from typing import Optional
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_ceo
from app.db import get_db
from app.models.user import User
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["Settings"])


# ── Schemas ───────────────────────────────────────────────────

class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Tên công ty không được để trống")
        return v


class WorkScheduleRequest(BaseModel):
    work_days: Optional[list[str]] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None

    @field_validator("work_days")
    @classmethod
    def validate_days(cls, v):
        if v is None:
            return v
        if len(v) == 0:
            raise ValueError("Phải có ít nhất 1 ngày làm việc")
        valid = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
        invalid = [d for d in v if d not in valid]
        if invalid:
            raise ValueError(f"Ngày không hợp lệ: {invalid}")
        return v

    @field_validator("work_start", "work_end")
    @classmethod
    def validate_time(cls, v):
        import re
        if v is not None and not re.match(r"^([01]\d|2[0-3]):([0-5]\d)$", v):
            raise ValueError("Định dạng giờ phải là HH:MM (VD: 08:00)")
        return v


class LanguageRequest(BaseModel):
    language: str

    @field_validator("language")
    @classmethod
    def valid_lang(cls, v):
        if v not in ("vi", "en"):
            raise ValueError("Ngôn ngữ phải là 'vi' hoặc 'en'")
        return v


# ── Company ───────────────────────────────────────────────────

@router.get("/company")
def get_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB208: xem thông tin công ty"""
    return settings_service.get_company_info(current_user.org_id, db)


@router.patch("/company")
def update_company(
    body: CompanyUpdateRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB208: CEO cập nhật thông tin công ty"""
    return settings_service.update_company_info(
        current_user.org_id, body.name, body.logo_url, db,
    )


# ── Work Schedule ─────────────────────────────────────────────

@router.get("/work-schedule")
def get_work_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB209, PB210: xem lịch làm việc"""
    return settings_service.get_work_schedule(current_user.org_id, db)


@router.patch("/work-schedule")
def update_work_schedule(
    body: WorkScheduleRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB209, PB210: CEO cập nhật lịch làm việc"""
    return settings_service.update_work_schedule(
        current_user.org_id,
        body.work_days, body.work_start, body.work_end,
        db,
    )


@router.get("/is-working-time")
def is_working_time(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB210: kiểm tra có trong giờ làm việc không"""
    return settings_service.is_working_time(current_user.org_id, db)


# ── Language ──────────────────────────────────────────────────

@router.get("/language")
def get_language(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB211: xem ngôn ngữ hiện tại"""
    return settings_service.get_language(current_user.id, db)


@router.patch("/language")
def set_language(
    body: LanguageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB211: cập nhật ngôn ngữ"""
    return settings_service.set_language(current_user.id, body.language, db)


# ── Help Center ───────────────────────────────────────────────

@router.get("/help")
def get_help(
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """PB212: hướng dẫn sử dụng theo vai trò"""
    return settings_service.get_help_articles(current_user.role, search)


# ── Dangerous Actions ─────────────────────────────────────────

@router.get("/dangerous-actions")
def get_dangerous_actions(
    current_user: User = Depends(require_ceo),
):
    """PB213: danh sách hành động cần xác nhận"""
    return settings_service.get_dangerous_actions()


# ── Breadcrumb ────────────────────────────────────────────────

@router.get("/breadcrumb")
def get_breadcrumb(
    path: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """PB214: tạo breadcrumb theo path"""
    return settings_service.get_breadcrumb(path)
