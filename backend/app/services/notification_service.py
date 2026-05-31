"""
Notification Service — PB215 đến PB232
Tập trung toàn bộ logic tạo, gửi, xử lý thông báo.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.task import Task, TaskAssignee
from app.models.user import User
from app.models.organization import Department


# ── Helpers ───────────────────────────────────────────────────

def _add(db: Session, user_id: UUID, type_: str, title: str, body: str):
    db.add(Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
    ))


def _already_sent(db: Session, user_id: UUID, type_: str, keyword: str) -> bool:
    """Kiểm tra đã gửi thông báo này chưa (tránh duplicate)"""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.type == type_,
        Notification.body.contains(keyword),
    ).first() is not None


def _get_dept_manager(dept_id: UUID, db: Session) -> Optional[User]:
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if dept and dept.manager_id:
        return db.query(User).filter(User.id == dept.manager_id).first()
    return None


def _is_notif_enabled(user_id: UUID, notif_type: str, db: Session) -> bool:
    """PB228: kiểm tra user có bật loại thông báo này không"""
    try:
        from app.models.pwa import NotificationPreference
        pref = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).first()
        if not pref:
            return True  # Default: enable notifications if no preference exists
        if not pref.push_enabled:
            return False
        types = pref.types or {}
        # Map notification type → setting key
        type_map = {
            "new_task": "new_task",
            "task_unassigned": "new_task",
            "deadline_changed": "deadline",
            "deadline_24h": "deadline",
            "deadline_1h": "deadline",
            "kpi_finalized": "kpi",
            "kpi_adjustment_result": "kpi",
            "system": "system",
            "task_progress_updated": "new_task",
            "new_comment": "new_task",
            "comment_reply": "new_task",
            "task_overdue": "deadline",
            "dept_high_overdue": "system",
        }
        setting_key = type_map.get(notif_type, "system")
        return types.get(setting_key, True)
    except Exception:
        return True  # mặc định bật nếu chưa cài đặt


# ── PB215, PB216 — Task assigned ─────────────────────────────

def notify_task_assigned(task_id: UUID, task_title: str,
                          assignee_ids: list, manager_name: str,
                          deadline: Optional[datetime], db: Session):
    """PB215: in-app + PB216: email khi được giao task"""
    deadline_str = deadline.strftime("%d/%m/%Y") if deadline else "Chưa có"

    for uid in assignee_ids:
        if not _is_notif_enabled(uid, "new_task", db):
            continue

        _add(db, uid,
             type_="new_task",
             title=f"Bạn được giao task mới: {task_title}",
             body=f"Manager {manager_name} đã giao task '{task_title}'. "
                  f"Deadline: {deadline_str}.")

        # PB216: email
        user = db.query(User).filter(User.id == uid).first()
        if user:
            try:
                send_task_assigned_email(
                    user.email, user.full_name,
                    task_title, deadline_str, manager_name, str(task_id),
                )
            except Exception:
                pass

    db.commit()


def send_task_assigned_email(to_email: str, full_name: str, task_title: str,
                              deadline: str, assigned_by: str, task_id: str):
    """PB216: public wrapper để test có thể mock"""
    from app.core.config import settings
    from app.services.email_service import _send
    subject = f"[KPI Nội Bộ] Task mới: {task_title}"
    body = f"""
    <h2>Xin chào {full_name},</h2>
    <p>{assigned_by} đã giao cho bạn task mới:</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Tên task:</td>
          <td><strong>{task_title}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Deadline:</td>
          <td><strong>{deadline}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Giao bởi:</td>
          <td>{assigned_by}</td></tr>
    </table>
    <p><a href="{settings.APP_URL}/tasks/{task_id}"
          style="background:#4F46E5;color:white;padding:10px 20px;
                 border-radius:6px;text-decoration:none;">Xem Task</a></p>
    """
    _send(to_email, subject, body)


# ── PB217 — Deadline changed ──────────────────────────────────

def notify_deadline_changed(task_id: UUID, task_title: str,
                             assignee_ids: list,
                             old_deadline: Optional[datetime],
                             new_deadline: Optional[datetime],
                             db: Session):
    """PB217"""
    old_str = old_deadline.strftime("%d/%m/%Y %H:%M") if old_deadline else "Chưa có"
    new_str = new_deadline.strftime("%d/%m/%Y %H:%M") if new_deadline else "Chưa có"

    for uid in assignee_ids:
        if not _is_notif_enabled(uid, "deadline_changed", db):
            continue
        _add(db, uid,
             type_="deadline_changed",
             title=f"Deadline task '{task_title}' đã thay đổi",
             body=f"Deadline của task '{task_title}' vừa được cập nhật.\n"
                  f"Cũ: {old_str} → Mới: {new_str}")
    db.commit()


# ── PB218 — Reassign ──────────────────────────────────────────

def notify_task_reassigned(task_id: UUID, task_title: str,
                            old_assignee_ids: list,
                            new_assignee_ids: list,
                            db: Session):
    """PB218: người bị gỡ và người được gán mới đều nhận thông báo"""
    # Người bị gỡ
    removed = set(str(i) for i in old_assignee_ids) - set(str(i) for i in new_assignee_ids)
    for uid_str in removed:
        uid = uuid.UUID(uid_str)
        _add(db, uid,
             type_="task_unassigned",
             title=f"Bạn không còn phụ trách task: {task_title}",
             body=f"Task '{task_title}' đã được chuyển cho người khác.")

    # Người được gán mới
    added = set(str(i) for i in new_assignee_ids) - set(str(i) for i in old_assignee_ids)
    for uid_str in added:
        uid = uuid.UUID(uid_str)
        if not _is_notif_enabled(uid, "new_task", db):
            continue
        _add(db, uid,
             type_="new_task",
             title=f"Bạn được giao task: {task_title}",
             body=f"Task '{task_title}' vừa được giao cho bạn.")

    db.commit()


# ── PB219, PB220 — Deadline reminders ────────────────────────

def check_deadline_reminders(db: Session) -> int:
    """PB219: 24h reminder, PB220: 1h reminder — chạy bởi Celery"""
    now = datetime.now(timezone.utc)
    count = 0

    active_tasks = db.query(Task).filter(
        Task.status.in_(["todo", "in_progress"]),
        Task.deadline.isnot(None),
    ).all()

    for task in active_tasks:
        deadline = task.deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        time_left = (deadline - now).total_seconds()

        assignee_ids = [ta.user_id for ta in task.assignees]

        # PB219: 24h (còn 22.5-25h để tránh boundary issues)
        if 81000 <= time_left <= 90000:
            for uid in assignee_ids:
                if not _already_sent(db, uid, "deadline_24h", str(task.id)):
                    _add(db, uid,
                         type_="deadline_24h",
                         title=f"⚠️ Task sắp đến hạn: {task.title}",
                         body=f"Task '{task.title}' còn khoảng 24 giờ đến deadline. "
                              f"Task ID: {task.id}")
                    count += 1

        # PB220: 1h (còn 30-70 phút)
        elif 1800 <= time_left <= 4200:
            for uid in assignee_ids:
                if not _already_sent(db, uid, "deadline_1h", str(task.id)):
                    _add(db, uid,
                         type_="deadline_1h",
                         title=f"🔴 Task còn 1 giờ đến deadline: {task.title}",
                         body=f"Task '{task.title}' còn chưa đến 1 giờ đến deadline! "
                              f"Task ID: {task.id}")
                    count += 1

    db.commit()
    return count


# ── PB221 — Progress update notification ─────────────────────

def notify_progress_updated(task_id: UUID, task_title: str,
                             dept_id: UUID, staff_name: str,
                             new_progress: int, db: Session):
    """PB221: Manager nhận thông báo khi nhân viên cập nhật tiến độ"""
    manager = _get_dept_manager(dept_id, db)
    if not manager:
        return

    if not _is_notif_enabled(manager.id, "task_progress_updated", db):
        return

    _add(db, manager.id,
         type_="task_progress_updated",
         title=f"{staff_name} cập nhật tiến độ task: {task_title}",
         body=f"{staff_name} đã cập nhật tiến độ task '{task_title}' lên {new_progress}%.")
    db.commit()


# ── PB222, PB223 — Comment notifications ─────────────────────

def notify_new_comment(task_id: UUID, task_title: str,
                        dept_id: UUID, commenter_name: str,
                        comment_content: str, commenter_id: UUID,
                        db: Session):
    """PB222: Manager nhận thông báo khi nhân viên comment"""
    manager = _get_dept_manager(dept_id, db)
    if not manager or manager.id == commenter_id:
        return

    if not _is_notif_enabled(manager.id, "new_comment", db):
        return

    preview = comment_content[:100] + "..." if len(comment_content) > 100 else comment_content
    _add(db, manager.id,
         type_="new_comment",
         title=f"{commenter_name} ghi chú vào task: {task_title}",
         body=preview)
    db.commit()


def notify_comment_reply(task_id: UUID, task_title: str,
                          original_commenter_id: UUID,
                          replier_name: str, reply_content: str,
                          db: Session):
    """PB223: nhân viên nhận thông báo khi Manager reply"""
    if not _is_notif_enabled(original_commenter_id, "comment_reply", db):
        return

    preview = reply_content[:100] + "..." if len(reply_content) > 100 else reply_content
    _add(db, original_commenter_id,
         type_="comment_reply",
         title=f"Có phản hồi trong task: {task_title}",
         body=preview)
    db.commit()


# ── PB224 — Overdue notification ─────────────────────────────

def check_overdue_tasks(db: Session) -> int:
    """PB224: Manager nhận thông báo khi task quá hạn"""
    now = datetime.now(timezone.utc)
    count = 0

    overdue_tasks = db.query(Task).filter(
        Task.status.in_(["todo", "in_progress"]),
        Task.deadline < now,
        Task.deadline.isnot(None),
    ).all()

    for task in overdue_tasks:
        manager = _get_dept_manager(task.dept_id, db)
        if not manager:
            continue

        keyword = str(task.id)
        if _already_sent(db, manager.id, "task_overdue", keyword):
            continue

        assignees = [ta.user_id for ta in task.assignees]
        assignee_names = []
        for uid in assignees:
            u = db.query(User).filter(User.id == uid).first()
            if u:
                assignee_names.append(u.full_name)

        names_str = ", ".join(assignee_names) if assignee_names else "Chưa giao"
        _add(db, manager.id,
             type_="task_overdue",
             title=f"🔴 Task quá hạn: {task.title}",
             body=f"Task '{task.title}' đã quá hạn. "
                  f"Người thực hiện: {names_str}. Task ID: {task.id}")
        count += 1

    db.commit()
    return count


# ── PB226 — High overdue rate alert ──────────────────────────

def check_dept_overdue_rate(org_id: UUID, threshold: float,
                             db: Session) -> int:
    """PB226: CEO nhận cảnh báo khi tỉ lệ task trễ > threshold%"""
    now = datetime.now(timezone.utc)
    count = 0

    # Tìm CEO
    from app.models.user import User as UserModel
    ceo = db.query(UserModel).filter(
        UserModel.org_id == org_id,
        UserModel.role == "ceo",
        UserModel.is_active == True,
    ).first()
    if not ceo:
        return 0

    depts = db.query(Department).filter(
        Department.org_id == org_id,
        Department.is_active == True,
    ).all()

    for dept in depts:
        all_tasks = db.query(Task).filter(
            Task.dept_id == dept.id,
            Task.status != "cancelled",
        ).all()
        if not all_tasks:
            continue

        overdue = [t for t in all_tasks
                   if t.deadline and
                   (t.deadline.replace(tzinfo=timezone.utc)
                    if t.deadline.tzinfo is None else t.deadline) < now
                   and t.status not in ("done", "cancelled")]

        rate = len(overdue) / len(all_tasks) * 100

        if rate > threshold:
            keyword = f"dept:{dept.id}"
            if not _already_sent(db, ceo.id, "dept_high_overdue", keyword):
                _add(db, ceo.id,
                     type_="dept_high_overdue",
                     title=f"⚠️ Phòng {dept.name} có tỉ lệ task trễ cao: {rate:.1f}%",
                     body=f"Phòng ban '{dept.name}' có {len(overdue)}/{len(all_tasks)} "
                          f"task trễ deadline ({rate:.1f}% > ngưỡng {threshold}%). "
                          f"dept:{dept.id}")
                count += 1

    db.commit()
    return count


# ── PB227 — Weekly report ─────────────────────────────────────

def send_weekly_report(org_id: UUID, db: Session):
    """PB227: gửi email tổng kết tuần cho CEO mỗi thứ Hai"""
    from app.models.user import User as UserModel
    ceo = db.query(UserModel).filter(
        UserModel.org_id == org_id,
        UserModel.role == "ceo",
        UserModel.is_active == True,
    ).first()
    if not ceo:
        return

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    depts = db.query(Department).filter(
        Department.org_id == org_id,
        Department.is_active == True,
    ).all()

    dept_stats = []
    for dept in depts:
        tasks = db.query(Task).filter(
            Task.dept_id == dept.id,
            Task.created_at >= week_start,
        ).all()
        done = sum(1 for t in tasks if t.status == "done")
        overdue = sum(
            1 for t in tasks
            if t.deadline and
            (t.deadline.replace(tzinfo=timezone.utc)
             if t.deadline.tzinfo is None else t.deadline) < now
            and t.status not in ("done", "cancelled")
        )
        dept_stats.append({
            "name": dept.name,
            "total": len(tasks),
            "done": done,
            "overdue": overdue,
        })

    _send_weekly_report_email(ceo.email, ceo.full_name, dept_stats, now)


def _send_weekly_report_email(to_email: str, ceo_name: str,
                               dept_stats: list, report_date: datetime):
    """Internal: gửi email tổng kết — wrapper để test có thể mock"""
    from app.services.email_service import _send

    rows = "".join(
        f"<tr><td>{d['name']}</td><td>{d['total']}</td>"
        f"<td>{d['done']}</td><td style='color:red'>{d['overdue']}</td></tr>"
        for d in dept_stats
    )
    subject = f"[KPI Nội Bộ] Báo cáo tuần {report_date.strftime('%d/%m/%Y')}"
    body = f"""
    <h2>Báo cáo tổng kết tuần</h2>
    <p>Xin chào {ceo_name},</p>
    <table border="1" style="border-collapse:collapse;width:100%">
      <tr><th>Phòng ban</th><th>Tổng task</th>
          <th>Hoàn thành</th><th>Trễ deadline</th></tr>
      {rows}
    </table>
    """
    _send(to_email, subject, body)


# ── PB232 — Cleanup old notifications ────────────────────────

def cleanup_old_notifications(days: int, db: Session) -> int:
    """PB232: xóa thông báo cũ hơn {days} ngày"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    deleted = db.query(Notification).filter(
        Notification.created_at < cutoff,
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


# ── General helper ────────────────────────────────────────────

def push_notification_to_user(user_id: UUID, type_: str,
                               title: str, body: str, db: Session):
    _add(db, user_id, type_, title, body)
    db.commit()
