"""
Celery workers cho Sprint 2:
- PB073-PB075: tự động tạo recurring tasks
- PB104: cảnh báo task In Progress không cập nhật sau 2 ngày
"""
from celery import Celery
from datetime import datetime, timezone, timedelta

from app.core.config import settings

celery_app = Celery("kpi_worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    beat_schedule={
        # Chạy mỗi ngày lúc 00:01 để tạo recurring tasks
        "create-recurring-tasks": {
            "task": "app.workers.task_worker.create_recurring_tasks",
            "schedule": 60 * 60 * 24,  # mỗi 24h
        },
        # PB104: chạy mỗi ngày lúc 8h sáng
        "check-stale-tasks": {
            "task": "app.workers.task_worker.check_stale_in_progress_tasks",
            "schedule": 60 * 60 * 24,
        },
    },
)


@celery_app.task
def create_recurring_tasks():
    """PB073, PB074, PB075: tạo task lặp lại tự động"""
    from app.db import SessionLocal
    from app.models.task import Task, TaskAssignee

    db = SessionLocal()
    now = datetime.now(timezone.utc)
    today = now.weekday()  # 0=Mon ... 6=Sun
    today_dom = now.day    # day of month

    try:
        recurring = db.query(Task).filter(
            Task.is_recurring == True,
            Task.status != "cancelled",
        ).all()

        created_count = 0
        for task in recurring:
            should_create = False
            pattern = task.recur_pattern

            if pattern == "daily":
                should_create = True  # PB073

            elif pattern == "weekly" and task.recur_day:
                # recur_day = "0"-"6" (Mon-Sun)
                if str(today) == task.recur_day:
                    should_create = True  # PB074

            elif pattern == "monthly" and task.recur_day:
                # recur_day = "1"-"31" hoặc "last"
                if task.recur_day == "last":
                    import calendar
                    last_day = calendar.monthrange(now.year, now.month)[1]
                    should_create = (today_dom == last_day)
                else:
                    should_create = (str(today_dom) == task.recur_day)  # PB075

            if not should_create:
                continue

            # Tạo task mới từ template
            new_task = Task(
                dept_id      = task.dept_id,
                created_by   = task.created_by,
                epic_id      = task.epic_id,
                title        = task.title,
                description  = task.description,
                priority     = task.priority,
                status       = "todo",
                progress_pct = 0,
                is_recurring = False,  # instance không lặp lại
                deadline     = now + timedelta(days=1) if pattern == "daily" else None,
            )
            db.add(new_task)
            db.flush()

            # Copy assignees
            for ta in task.assignees:
                db.add(TaskAssignee(task_id=new_task.id, user_id=ta.user_id))

            created_count += 1

        db.commit()
        return {"created": created_count, "checked": len(recurring)}

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


@celery_app.task
def check_stale_in_progress_tasks():
    """PB104: cảnh báo task In Progress không cập nhật sau 2 ngày"""
    from app.db import SessionLocal
    from app.models.task import Task, TaskAssignee
    from app.models.notification import Notification
    from app.models.user import User

    db = SessionLocal()
    now = datetime.now(timezone.utc)
    two_days_ago = now - timedelta(days=2)

    try:
        stale_tasks = db.query(Task).filter(
            Task.status == "in_progress",
            Task.last_updated_at <= two_days_ago,
        ).all()

        notified = 0
        for task in stale_tasks:
            # Lấy Manager của phòng ban
            from app.models.organization import Department
            dept = db.query(Department).filter(Department.id == task.dept_id).first()
            if not dept or not dept.manager_id:
                continue

            # Tạo notification cho Manager
            existing = db.query(Notification).filter(
                Notification.user_id == dept.manager_id,
                Notification.type == "stale_task",
                Notification.body.contains(str(task.id)),
            ).first()

            if not existing:
                db.add(Notification(
                    user_id=dept.manager_id,
                    type="stale_task",
                    title="Task chưa được cập nhật",
                    body=f'Task "{task.title}" (ID: {task.id}) đang In Progress nhưng chưa có cập nhật trong 2 ngày.',
                ))
                notified += 1

        db.commit()
        return {"stale_tasks": len(stale_tasks), "notifications_sent": notified}

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
