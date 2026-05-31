from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_ceo
from app.db import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── List & Filter ─────────────────────────────────────────────

@router.get("")
def list_notifications(
    type: Optional[str] = Query(default=None),
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB229, PB231: danh sách thông báo, lọc, phân trang"""
    q = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if type:
        q = q.filter(Notification.type == type)
    if unread_only:
        q = q.filter(Notification.is_read == False)

    total = q.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()

    items = (
        q.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
    }


# ── Mark read ─────────────────────────────────────────────────

@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB229: đánh dấu 1 thông báo đã đọc"""
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notif:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")

    notif.is_read = True
    db.commit()
    return {"id": str(notif.id), "is_read": True}


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB230: đánh dấu tất cả thông báo đã đọc"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"marked_count": count}


# ── Cleanup trigger ───────────────────────────────────────────

@router.post("/cleanup")
def cleanup_notifications(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB232: CEO trigger xóa thông báo cũ"""
    from app.services.notification_service import cleanup_old_notifications
    deleted = cleanup_old_notifications(days=days, db=db)
    return {"deleted_count": deleted, "older_than_days": days}
