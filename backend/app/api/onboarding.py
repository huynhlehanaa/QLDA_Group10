from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import io

from app.core.dependencies import get_current_user, require_ceo, require_ceo_or_manager
from app.db import get_db
from app.models.user import User
from app.services import onboarding_service

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ── Schemas ───────────────────────────────────────────────────

class MarkStepRequest(BaseModel):
    is_done: bool


# ── Checklist ─────────────────────────────────────────────────

@router.get("/checklist")
def get_checklist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB234: xem checklist onboarding và tiến độ"""
    return onboarding_service.get_checklist(current_user, db)


@router.patch("/checklist/{step_id}")
def mark_step(
    step_id: str,
    body: MarkStepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB234: đánh dấu bước onboarding hoàn thành"""
    return onboarding_service.mark_step(
        current_user.id, step_id, body.is_done, db,
    )


# ── PDF Guides ────────────────────────────────────────────────

@router.get("/guide/staff")
def get_staff_guide(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB235: tải PDF hướng dẫn dành cho Nhân viên"""
    content = onboarding_service.generate_guide_pdf("staff")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=huong-dan-nhan-vien.pdf"
        },
    )


@router.get("/guide/manager")
def get_manager_guide(
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB236: tải PDF hướng dẫn dành cho Manager"""
    content = onboarding_service.generate_guide_pdf("manager")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=huong-dan-manager.pdf"
        },
    )


@router.get("/guide/ceo")
def get_ceo_guide(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB236: tải PDF hướng dẫn dành cho CEO"""
    content = onboarding_service.generate_guide_pdf("ceo")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=huong-dan-ceo.pdf"
        },
    )
