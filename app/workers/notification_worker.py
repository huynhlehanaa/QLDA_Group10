"""
Notification Workers — Celery jobs
- PB219, PB220: deadline reminders (24h, 1h)
- PB224: overdue task notifications
- PB226: high overdue rate alerts
- PB227: weekly report email
- PB232: auto cleanup old notifications
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "notification_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    beat_schedule={
        # PB219, PB220: check deadline mỗi 30 phút
        "check-deadline-reminders": {
            "task": "app.workers.notification_worker.run_deadline_reminders",
            "schedule": 1800,
        },
        # PB224: check overdue mỗi giờ
        "check-overdue-tasks": {
            "task": "app.workers.notification_worker.run_overdue_check",
            "schedule": 3600,
        },
        # PB226: check tỉ lệ trễ mỗi ngày lúc 9h
        "check-dept-overdue-rate": {
            "task": "app.workers.notification_worker.run_dept_overdue_rate",
            "schedule": 86400,
        },
        # PB227: gửi weekly report thứ Hai 8h
        "send-weekly-report": {
            "task": "app.workers.notification_worker.run_weekly_report",
            "schedule": 604800,  # mỗi tuần
        },
        # PB232: cleanup hàng đêm lúc 2h
        "cleanup-old-notifications": {
            "task": "app.workers.notification_worker.run_cleanup",
            "schedule": 86400,
        },
    },
)


@celery_app.task
def run_deadline_reminders():
    """PB219, PB220"""
    from app.db import SessionLocal
    from app.services.notification_service import check_deadline_reminders
    db = SessionLocal()
    try:
        count = check_deadline_reminders(db)
        return {"reminders_sent": count}
    finally:
        db.close()


@celery_app.task
def run_overdue_check():
    """PB224"""
    from app.db import SessionLocal
    from app.services.notification_service import check_overdue_tasks
    db = SessionLocal()
    try:
        count = check_overdue_tasks(db)
        return {"overdue_notifications": count}
    finally:
        db.close()


@celery_app.task
def run_dept_overdue_rate():
    """PB226"""
    from app.db import SessionLocal
    from app.models.organization import Organization
    from app.services.notification_service import check_dept_overdue_rate
    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        total = 0
        for org in orgs:
            total += check_dept_overdue_rate(org.id, threshold=20.0, db=db)
        return {"alerts_sent": total}
    finally:
        db.close()


@celery_app.task
def run_weekly_report():
    """PB227"""
    from app.db import SessionLocal
    from app.models.organization import Organization
    from app.services.notification_service import send_weekly_report
    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        for org in orgs:
            send_weekly_report(org.id, db)
        return {"reports_sent": len(orgs)}
    finally:
        db.close()


@celery_app.task
def run_cleanup():
    """PB232"""
    from app.db import SessionLocal
    from app.services.notification_service import cleanup_old_notifications
    db = SessionLocal()
    try:
        deleted = cleanup_old_notifications(days=30, db=db)
        return {"deleted": deleted}
    finally:
        db.close()
