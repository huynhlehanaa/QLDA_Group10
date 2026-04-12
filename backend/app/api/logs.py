from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_ceo
from app.db import get_db
from app.models.user import LoginLog, User

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/login")
def get_login_logs(
    user_id: Optional[UUID] = Query(None),
    success: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB013, PB014: CEO xem log đăng nhập"""
    q = db.query(LoginLog)
    if user_id:
        q = q.filter(LoginLog.user_id == user_id)
    if success is not None:
        q = q.filter(LoginLog.success == success)

    total = q.count()
    items = (
        q.order_by(LoginLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": str(l.id),
                "user_id": str(l.user_id) if l.user_id else None,
                "email_attempted": l.email_attempted,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "success": l.success,
                "created_at": l.created_at,
            }
            for l in items
        ],
    }
