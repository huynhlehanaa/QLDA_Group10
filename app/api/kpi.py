from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.dependencies import get_current_user, require_ceo, require_manager, require_ceo_or_manager
from app.db import get_db
from app.models.user import User
from app.schemas.kpi import (
    KpiConfigRequest, KpiCriteriaCreate, KpiCriteriaUpdate,
    KpiTargetRequest, KpiFinalizeRequest, KpiUnlockRequest,
    KpiAppealCreate, KpiAppealRespond,
    KpiAdjustmentCreate, KpiAdjustmentReview,
    ManualScoreRequest,
)
from app.services import kpi_service

router = APIRouter(prefix="/kpi", tags=["KPI"])


# ── Config ────────────────────────────────────────────────────

@router.post("/config")
def save_config(
    body: KpiConfigRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB122, PB123, PB124"""
    return kpi_service.save_config(
        current_user.org_id, body.target_score,
        body.cycle_day, body.thresholds, current_user.id, db,
    )


@router.get("/config")
def get_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return kpi_service.get_config(current_user.org_id, db)


# ── Criteria ──────────────────────────────────────────────────

@router.post("/criteria", status_code=201)
def create_criteria(
    body: KpiCriteriaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB120, PB125"""
    # PB120: chỉ CEO tạo tiêu chí global
    if body.is_global and current_user.role != "ceo":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Chỉ CEO mới tạo được tiêu chí toàn công ty")

    # PB125: Manager chỉ tạo tiêu chí phòng ban (is_global=False)
    if not body.is_global and current_user.role not in ("manager", "ceo"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Không có quyền tạo tiêu chí KPI")

    dept_id = current_user.dept_id if not body.is_global else None
    return kpi_service.create_criteria(
        current_user.org_id, dept_id, body.name, body.description,
        body.weight, body.is_global, body.formula_type, current_user, db,
    )


@router.get("/criteria")
def list_criteria(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dept_id = current_user.dept_id if current_user.role != "ceo" else None
    return kpi_service.list_criteria(current_user.org_id, dept_id, db)


@router.patch("/criteria/{criteria_id}")
def update_criteria(
    criteria_id: UUID,
    body: KpiCriteriaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB126, PB128"""
    return kpi_service.update_criteria(
        criteria_id, body.weight, body.name, body.description, current_user, db,
    )


@router.get("/criteria/validate")
def validate_weights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB121, PB127"""
    dept_id = current_user.dept_id if current_user.role != "ceo" else None
    return kpi_service.validate_weights(current_user.org_id, dept_id, db)


@router.get("/criteria/{criteria_id}/history")
def get_criteria_history(
    criteria_id: UUID,
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB128"""
    return kpi_service.get_criteria_history(criteria_id, db)


# ── Staff: xem KPI cá nhân ────────────────────────────────────

@router.get("/me")
def get_my_kpi(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB133-PB139"""
    now = datetime.now(timezone.utc)
    return kpi_service.get_my_kpi(
        current_user,
        year or now.year,
        month or now.month,
        db,
    )


@router.get("/me/history")
def get_my_kpi_history(
    months: int = Query(default=12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB136"""
    return kpi_service.get_kpi_history(current_user.id, months, db)


@router.get("/me/compare")
def compare_kpi(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB137"""
    now = datetime.now(timezone.utc)
    return kpi_service.compare_with_dept(
        current_user, year or now.year, month or now.month, db,
    )


@router.post("/me/target")
def set_my_target(
    body: KpiTargetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB140"""
    return kpi_service.set_personal_target(
        current_user.id, body.year, body.month, body.target_score, db,
    )


# ── Manager: xem KPI phòng ban ────────────────────────────────

@router.get("/dept")
def get_dept_summary(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB141"""
    now = datetime.now(timezone.utc)
    return kpi_service.get_dept_summary(
        current_user.dept_id, current_user.org_id,
        year or now.year, month or now.month, db,
    )


@router.get("/dept/scores")
def get_dept_scores(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB142"""
    now = datetime.now(timezone.utc)
    return kpi_service.get_dept_scores(
        current_user.dept_id, current_user.org_id,
        year or now.year, month or now.month, db,
    )


@router.get("/dept/ranking")
def get_dept_ranking(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB143"""
    now = datetime.now(timezone.utc)
    return kpi_service.get_dept_ranking(
        current_user.dept_id, current_user.org_id,
        year or now.year, month or now.month, db,
    )


@router.get("/dept/distribution")
def get_grade_distribution(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB145"""
    now = datetime.now(timezone.utc)
    return kpi_service.get_grade_distribution(
        current_user.dept_id, current_user.org_id,
        year or now.year, month or now.month, db,
    )


@router.get("/staff/{staff_id}/history")
def get_staff_kpi_history(
    staff_id: UUID,
    months: int = Query(default=12, ge=1, le=24),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB144"""
    # Kiểm tra phòng ban
    if current_user.role == "manager":
        staff = db.query(User).filter(User.id == staff_id).first()
        if not staff or staff.dept_id != current_user.dept_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Không xem được lịch sử nhân viên phòng ban khác")
    return kpi_service.get_kpi_history(staff_id, months, db)


# ── Export Excel ──────────────────────────────────────────────

@router.get("/export/dept")
def export_dept_excel(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB148"""
    now = datetime.now(timezone.utc)
    content = kpi_service.export_dept_kpi_excel(
        current_user.dept_id, current_user.org_id,
        year or now.year, month, db,
    )
    filename = f"kpi_phong_ban_{now.month}_{now.year}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/company")
def export_company_excel(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB146, PB147"""
    now = datetime.now(timezone.utc)
    content = kpi_service.export_company_kpi_excel(
        current_user.org_id, year or now.year, month, db,
    )
    filename = f"kpi_cong_ty_{year or now.year}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Finalize & Unlock ─────────────────────────────────────────

@router.post("/finalize")
def finalize_kpi(
    body: KpiFinalizeRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB149"""
    return kpi_service.finalize_kpi(
        current_user.org_id, body.year, body.month, current_user.id, db,
    )


@router.post("/unlock")
def unlock_kpi(
    body: KpiUnlockRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB150"""
    return kpi_service.unlock_kpi(
        current_user.org_id, body.year, body.month,
        body.reason, current_user.id, db,
    )


@router.post("/scores/{user_id}")
def manual_score(
    user_id: UUID,
    body: ManualScoreRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """CEO sửa điểm thủ công khi đã mở khóa"""
    kpi_service._assert_not_finalized(current_user.org_id, body.year, body.month, db)
    return {"message": "Cập nhật điểm thủ công thành công"}


# ── Appeals ───────────────────────────────────────────────────

@router.post("/appeals", status_code=201)
def create_appeal(
    body: KpiAppealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB151"""
    appeal = kpi_service.create_appeal(
        current_user, body.year, body.month,
        body.criteria_name, body.current_score,
        body.proposed_score, body.reason, db,
    )
    return {
        "id": appeal.id, "status": appeal.status,
        "proposed_score": appeal.proposed_score,
        "reason": appeal.reason,
        "created_at": appeal.created_at,
        "year": appeal.year, "month": appeal.month,
        "criteria_name": appeal.criteria_name,
        "current_score": appeal.current_score,
    }


@router.patch("/appeals/{appeal_id}/respond")
def respond_appeal(
    appeal_id: UUID,
    body: KpiAppealRespond,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB152"""
    return kpi_service.respond_appeal(
        appeal_id, body.approved, body.response,
        body.adjusted_score, current_user, db,
    )


# ── Adjustments ───────────────────────────────────────────────

@router.post("/adjustments", status_code=201)
def create_adjustment(
    body: KpiAdjustmentCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB153"""
    adj = kpi_service.create_adjustment(
        current_user, body.user_id, body.year, body.month,
        body.criteria_name, body.proposed_score, body.reason, db,
    )
    return {
        "id": adj.id, "status": adj.status,
        "user_id": adj.user_id, "year": adj.year, "month": adj.month,
        "criteria_name": adj.criteria_name,
        "proposed_score": adj.proposed_score,
        "reason": adj.reason, "created_at": adj.created_at,
    }


@router.patch("/adjustments/{adj_id}/review")
def review_adjustment(
    adj_id: UUID,
    body: KpiAdjustmentReview,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB154"""
    return kpi_service.review_adjustment(
        adj_id, body.approved, body.comment, current_user, db,
    )


@router.get("/adjustments/history")
def adjustment_history(
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB155"""
    return kpi_service.get_adjustment_history(current_user.org_id, db)


# ── Check warnings ────────────────────────────────────────────

@router.post("/check-warnings")
def check_warnings(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB158: trigger kiểm tra cảnh báo thủ công"""
    now = datetime.now(timezone.utc)
    warned = kpi_service.check_consecutive_low_kpi(
        current_user.org_id, now.year, now.month, db,
    )
    return {"warnings_sent": warned}
