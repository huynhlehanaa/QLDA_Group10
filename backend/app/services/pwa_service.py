"""
PWA Service — PB190 đến PB207
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.pwa import PushSubscription, NotificationPreference
from app.models.task import Task, TaskAssignee
from app.models.notification import Notification
from app.models.user import User


# ── Push Subscription ─────────────────────────────────────────

def subscribe_push(user_id: UUID, endpoint: str, p256dh: str,
                   auth: str, platform: str, db: Session) -> dict:
    """PB205, PB206: đăng ký Web Push — upsert theo endpoint"""
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint
    ).first()

    if existing:
        existing.user_id = user_id
        existing.p256dh_key = p256dh
        existing.auth_key = auth
        existing.platform = platform
        existing.is_active = True
    else:
        sub = PushSubscription(
            user_id=user_id, endpoint=endpoint,
            p256dh_key=p256dh, auth_key=auth, platform=platform,
        )
        db.add(sub)

    db.commit()
    return {"subscribed": True, "platform": platform}


def unsubscribe_push(user_id: UUID, endpoint: str, db: Session) -> dict:
    """PB207: hủy đăng ký Web Push"""
    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == user_id,
    ).first()

    if sub:
        sub.is_active = False
        db.commit()

    return {"unsubscribed": True}


def get_active_subscriptions(user_id: UUID, db: Session) -> list:
    """Lấy danh sách push subscription active của user"""
    return db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.is_active == True,
    ).all()


# ── Notification Preferences ──────────────────────────────────

def get_notification_settings(user_id: UUID, db: Session) -> dict:
    """PB207: lấy cài đặt thông báo"""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()

    if not pref:
        pref = NotificationPreference(
            user_id=user_id,
            push_enabled=True,
            types={"new_task": True, "deadline": True, "kpi": True, "system": True},
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return {
        "push_enabled": pref.push_enabled,
        "types": pref.types,
    }


def update_notification_settings(user_id: UUID, push_enabled: bool,
                                  types: dict, db: Session) -> dict:
    """PB207: cập nhật cài đặt thông báo"""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()

    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)

    pref.push_enabled = push_enabled
    pref.types = types
    db.commit()
    db.refresh(pref)

    return {"push_enabled": pref.push_enabled, "types": pref.types}


# ── Badge Count ───────────────────────────────────────────────

def get_badge_count(user_id: UUID, db: Session) -> dict:
    """PB199: số task todo + in_progress được giao"""
    assigned_ids = [
        ta.task_id for ta in db.query(TaskAssignee).filter(
            TaskAssignee.user_id == user_id
        ).all()
    ]

    count = db.query(Task).filter(
        Task.id.in_(assigned_ids),
        Task.status.in_(["todo", "in_progress"]),
    ).count()

    return {"badge_count": count}


# ── Offline Data ──────────────────────────────────────────────

def get_offline_data(user: User, db: Session) -> dict:
    """PB203: trả về dữ liệu cần cache cho offline mode"""
    now = datetime.now(timezone.utc)

    assigned_ids = [
        ta.task_id for ta in db.query(TaskAssignee).filter(
            TaskAssignee.user_id == user.id
        ).all()
    ]

    tasks = db.query(Task).filter(
        Task.id.in_(assigned_ids),
        Task.status != "cancelled",
    ).all()

    task_list = []
    for t in tasks:
        deadline_aware = t.deadline.replace(tzinfo=timezone.utc) if t.deadline and t.deadline.tzinfo is None else t.deadline
        task_list.append({
            "id": str(t.id),
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "progress_pct": t.progress_pct,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "is_overdue": (
                deadline_aware is not None
                and deadline_aware < now
                and t.status not in ("done", "cancelled")
            ),
        })

    return {
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "email": user.email,
        },
        "tasks": task_list,
        "cached_at": now.isoformat(),
    }


# ── Sync ──────────────────────────────────────────────────────

def sync_data(user: User, last_sync_at: datetime, db: Session) -> dict:
    """PB204: đồng bộ dữ liệu sau khi có mạng trở lại"""
    now = datetime.now(timezone.utc)

    last_sync = last_sync_at
    if last_sync.tzinfo is None:
        last_sync = last_sync.replace(tzinfo=timezone.utc)

    assigned_ids = [
        ta.task_id for ta in db.query(TaskAssignee).filter(
            TaskAssignee.user_id == user.id
        ).all()
    ]

    # Task mới hoặc cập nhật sau last_sync
    new_tasks = db.query(Task).filter(
        Task.id.in_(assigned_ids),
        Task.created_at >= last_sync,
    ).all()

    updated_tasks = db.query(Task).filter(
        Task.id.in_(assigned_ids),
        Task.last_updated_at >= last_sync,
        Task.created_at < last_sync,  # không phải task mới
    ).all() if hasattr(Task, "last_updated_at") else []

    # Thông báo mới
    new_notifs = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.created_at >= last_sync,
    ).all()

    return {
        "synced_at": now.isoformat(),
        "changes": {
            "new_tasks": [{"id": str(t.id), "title": t.title, "status": t.status} for t in new_tasks],
            "updated_tasks": [{"id": str(t.id), "status": t.status} for t in updated_tasks],
            "updated_notifications": [
                {
                    "id": str(n.id),
                    "type": n.type,
                    "title": n.title,
                    "body": n.body,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in new_notifs
            ],
        },
    }


# ── PWA Manifest ──────────────────────────────────────────────

def get_manifest(org_name: str = "KPI Nội Bộ") -> dict:
    """PB191, PB192, PB193, PB195: manifest.json cho PWA"""
    return {
        "name": org_name,
        "short_name": "KPI",
        "description": "Hệ thống quản lý KPI nội bộ doanh nghiệp",
        "start_url": "/",
        "display": "standalone",
        "orientation": "portrait",
        "theme_color": "#4F46E5",
        "background_color": "#ffffff",
        "lang": "vi",
        "icons": [
            {
                "src": "/icons/icon-72x72.png",
                "sizes": "72x72",
                "type": "image/png",
            },
            {
                "src": "/icons/icon-96x96.png",
                "sizes": "96x96",
                "type": "image/png",
            },
            {
                "src": "/icons/icon-128x128.png",
                "sizes": "128x128",
                "type": "image/png",
            },
            {
                "src": "/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable",
            },
            {
                "src": "/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable",
            },
        ],
        "shortcuts": [
            {
                "name": "Task hôm nay",
                "url": "/staff/dashboard",
                "icons": [{"src": "/icons/shortcut-tasks.png", "sizes": "96x96"}],
            },
            {
                "name": "KPI của tôi",
                "url": "/kpi/me",
                "icons": [{"src": "/icons/shortcut-kpi.png", "sizes": "96x96"}],
            },
        ],
        "categories": ["productivity", "business"],
        "prefer_related_applications": False,
    }


def get_install_guide(platform: str) -> dict:
    """PB191, PB192: hướng dẫn cài đặt PWA theo platform"""
    if platform == "ios":
        return {
            "platform": "ios",
            "title": "Cài đặt ứng dụng trên iPhone/iPad",
            "steps": [
                {
                    "step": 1,
                    "title": "Mở Safari",
                    "description": "Mở ứng dụng Safari trên iPhone/iPad của bạn",
                    "icon": "safari",
                },
                {
                    "step": 2,
                    "title": "Truy cập trang web",
                    "description": "Nhập địa chỉ hệ thống vào thanh địa chỉ Safari",
                    "icon": "globe",
                },
                {
                    "step": 3,
                    "title": "Nhấn nút Chia sẻ",
                    "description": "Nhấn vào biểu tượng Share (hình vuông có mũi tên lên) ở thanh dưới",
                    "icon": "share",
                },
                {
                    "step": 4,
                    "title": "Chọn 'Add to Home Screen'",
                    "description": "Cuộn xuống và chọn 'Add to Home Screen' (Thêm vào màn hình chính)",
                    "icon": "plus-square",
                },
                {
                    "step": 5,
                    "title": "Xác nhận",
                    "description": "Nhấn 'Add' để hoàn tất cài đặt",
                    "icon": "check",
                },
            ],
            "note": "iOS yêu cầu Safari để cài PWA. Không hỗ trợ Chrome hoặc Firefox trên iOS.",
        }
    elif platform == "android":
        return {
            "platform": "android",
            "title": "Cài đặt ứng dụng trên Android",
            "steps": [
                {
                    "step": 1,
                    "title": "Mở Chrome",
                    "description": "Mở trình duyệt Chrome trên điện thoại Android",
                    "icon": "chrome",
                },
                {
                    "step": 2,
                    "title": "Truy cập trang web",
                    "description": "Nhập địa chỉ hệ thống vào thanh địa chỉ",
                    "icon": "globe",
                },
                {
                    "step": 3,
                    "title": "Nhấn menu Chrome",
                    "description": "Nhấn vào biểu tượng 3 chấm ở góc trên phải",
                    "icon": "more-vertical",
                },
                {
                    "step": 4,
                    "title": "Chọn 'Add to Home screen'",
                    "description": "Chọn 'Add to Home screen' hoặc 'Install app'",
                    "icon": "download",
                },
            ],
            "note": "Chrome sẽ tự hiện banner cài đặt nếu bạn truy cập thường xuyên.",
        }
    else:
        raise HTTPException(status_code=422, detail="Platform phải là 'ios' hoặc 'android'")


# ── Mobile Kanban ─────────────────────────────────────────────

def get_mobile_kanban(user: User, column: str, db: Session) -> dict:
    """PB196: Kanban tối ưu mobile — lấy từng cột riêng lẻ"""
    if column not in ("todo", "in_progress", "done"):
        raise HTTPException(status_code=422, detail="column phải là todo, in_progress hoặc done")

    now = datetime.now(timezone.utc)

    if user.role == "staff":
        assigned_ids = [
            ta.task_id for ta in db.query(TaskAssignee).filter(
                TaskAssignee.user_id == user.id
            ).all()
        ]
        tasks = db.query(Task).filter(
            Task.id.in_(assigned_ids),
            Task.status == column,
        ).order_by(Task.deadline.asc().nullslast()).all()
    else:
        tasks = db.query(Task).filter(
            Task.dept_id == user.dept_id,
            Task.status == column,
        ).order_by(Task.deadline.asc().nullslast()).all()

    task_list = []
    for t in tasks:
        deadline_aware = t.deadline.replace(tzinfo=timezone.utc) if t.deadline and t.deadline.tzinfo is None else t.deadline
        is_overdue = (
            deadline_aware is not None
            and deadline_aware < now
            and t.status not in ("done", "cancelled")
        )
        task_list.append({
            "id": str(t.id),
            "title": t.title,
            "priority": t.priority,
            "progress_pct": t.progress_pct,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "is_overdue": is_overdue,
        })

    return {"column": column, "tasks": task_list, "total": len(task_list)}


# ── Mobile Task Detail ────────────────────────────────────────

def get_mobile_task_detail(task_id: UUID, user: User, db: Session) -> dict:
    """PB197: chi tiết task dạng mobile với thông tin bổ sung"""
    now = datetime.now(timezone.utc)
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy task")

    # Kiểm tra quyền
    if user.role == "staff":
        is_assignee = db.query(TaskAssignee).filter(
            TaskAssignee.task_id == task_id,
            TaskAssignee.user_id == user.id,
        ).first()
        if not is_assignee:
            raise HTTPException(status_code=403, detail="Không có quyền xem task này")

    deadline_aware = task.deadline.replace(tzinfo=timezone.utc) if task.deadline and task.deadline.tzinfo is None else task.deadline
    is_overdue = (
        deadline_aware is not None
        and deadline_aware < now
        and task.status not in ("done", "cancelled")
    )

    days_until = None
    if deadline_aware:
        delta = (deadline_aware - now).days
        days_until = delta

    # Assignees
    assignees = []
    for ta in task.assignees:
        u = db.query(User).filter(User.id == ta.user_id).first()
        if u:
            assignees.append({"user_id": str(u.id), "full_name": u.full_name, "avatar_url": u.avatar_url})

    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "progress_pct": task.progress_pct,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "is_overdue": is_overdue,
        "days_until_deadline": days_until,
        "assignees": assignees,
        "checklist_total": len(task.checklists),
        "checklist_done": sum(1 for c in task.checklists if c.is_done),
        "created_at": task.created_at.isoformat(),
    }


# ── Quick Action (Swipe) ──────────────────────────────────────

def quick_action(task_id: UUID, action: str, user: User, db: Session) -> dict:
    """PB200: swipe action — complete"""
    if action not in ("complete",):
        raise HTTPException(status_code=422, detail="action phải là 'complete'")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy task")

    is_assignee = db.query(TaskAssignee).filter(
        TaskAssignee.task_id == task_id,
        TaskAssignee.user_id == user.id,
    ).first()
    if not is_assignee and user.role not in ("manager", "ceo"):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác này")

    if action == "complete":
        task.status = "done"
        task.progress_pct = 100
        task.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)
    return {"id": str(task.id), "status": task.status}


# ── Mobile KPI Summary ────────────────────────────────────────

def get_kpi_summary_mobile(user: User, year: int, month: int, db: Session) -> dict:
    """PB198: KPI summary tối ưu cho mobile"""
    try:
        from app.services.kpi_service import get_my_kpi
        kpi = get_my_kpi(user, year, month, db)
        target = kpi["target_score"]
        score = kpi["total_score"]
        progress_pct = round(score / target * 100, 1) if target > 0 else 0.0
        return {
            "total_score": score,
            "grade": kpi["grade"],
            "target_score": target,
            "progress_pct": min(progress_pct, 100.0),
            "breakdown_count": len(kpi["breakdown"]),
        }
    except Exception:
        return {
            "total_score": 0.0,
            "grade": "Chưa có dữ liệu",
            "target_score": 75.0,
            "progress_pct": 0.0,
            "breakdown_count": 0,
        }
