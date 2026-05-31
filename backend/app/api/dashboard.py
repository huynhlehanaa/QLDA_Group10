from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.dependencies import (
    get_current_user, require_ceo, require_manager, require_ceo_or_manager,
)
from app.db import get_db
from app.models.user import User
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── Gantt Chart ───────────────────────────────────────────────

@router.get("/gantt")
def get_gantt(
    view: str = Query(default="week", regex="^(day|week|month)$"),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB159, PB160: Gantt Chart phòng ban"""
    return dashboard_service.get_gantt(current_user.dept_id, view, db)


# ── Calendar ──────────────────────────────────────────────────

@router.get("/calendar")
def get_calendar_month(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB162"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_calendar_month(
        current_user, year or now.year, month or now.month, db,
    )


@router.get("/calendar/week")
def get_calendar_week(
    date: str = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB163"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_calendar_week(
        current_user, date or now.date().isoformat(), db,
    )


@router.get("/calendar/day")
def get_calendar_day(
    date: str = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB164"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_calendar_day(
        current_user, date or now.date().isoformat(), db,
    )


# ── Reports ───────────────────────────────────────────────────

@router.get("/report/performance")
def get_performance_report(
    year: int = Query(default=None),
    month: int = Query(default=None),
    from_date: Optional[datetime] = Query(default=None),
    to_date: Optional[datetime] = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB165-PB167, PB170, PB171"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_performance_report(
        current_user,
        year or now.year,
        month or now.month,
        from_date, to_date, db,
    )


@router.get("/report/overdue-by-dept")
def get_overdue_by_dept(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB168"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_overdue_by_dept(
        current_user.org_id, year or now.year, month or now.month, db,
    )


@router.get("/report/kpi-comparison")
def get_kpi_comparison(
    year: int = Query(default=None),
    quarter: int = Query(default=1, ge=1, le=4),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB169"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_kpi_comparison_by_quarter(
        current_user.org_id, year or now.year, quarter, db,
    )


# ── Export ────────────────────────────────────────────────────

@router.get("/report/export/excel")
def export_excel(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB172"""
    now = datetime.now(timezone.utc)
    content = dashboard_service.export_performance_excel(
        current_user, year or now.year, month or now.month, db,
    )
    filename = f"bao_cao_{month or now.month}_{year or now.year}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/report/export/pdf")
def export_pdf(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB173"""
    now = datetime.now(timezone.utc)
    content = dashboard_service.export_performance_pdf(
        current_user, year or now.year, month or now.month, db,
    )
    filename = f"bao_cao_{month or now.month}_{year or now.year}.pdf"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── CEO Dashboard ─────────────────────────────────────────────

@router.get("/ceo")
def get_ceo_dashboard(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB174-PB178, PB180"""
    return dashboard_service.get_ceo_dashboard(current_user.org_id, db)


@router.get("/ceo/heatmap")
def get_heatmap(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB179"""
    now = datetime.now(timezone.utc)
    return dashboard_service.get_ceo_heatmap(
        current_user.org_id, year or now.year, month or now.month, db,
    )


@router.get("/ceo/usage")
def get_usage(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB180"""
    return dashboard_service.get_system_usage(current_user.org_id, db)


# ── Manager Dashboard ─────────────────────────────────────────

@router.get("/manager")
def get_manager_dashboard(
    current_user: User = Depends(require_ceo_or_manager),
    db: Session = Depends(get_db),
):
    """PB181-PB186"""
    return dashboard_service.get_manager_dashboard(current_user, db)


# ── Staff Dashboard ───────────────────────────────────────────

@router.get("/staff")
def get_staff_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB187-PB189"""
    return dashboard_service.get_staff_dashboard(current_user, db)
