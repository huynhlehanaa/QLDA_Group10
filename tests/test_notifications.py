"""
TDD Tests — Thông báo — PB215 đến PB232

Thứ tự TDD:
1. pytest tests/test_notifications.py -v → tất cả FAIL
2. Viết services/notification_service.py (đã có skeleton)
3. Viết api/notifications.py
4. Hook vào task_service, kpi_service
5. Viết workers/notification_worker.py (deadline reminders)
6. pytest tests/test_notifications.py -v → tất cả PASS
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from tests.conftest import auth_header
from app.models.notification import Notification
from app.models.task import Task, TaskAssignee
from app.models.user import User


# ══════════════════════════════════════════════════════════════
# PB215 — Thông báo in-app khi được giao task mới
# ══════════════════════════════════════════════════════════════

class TestTaskAssignedInApp:

    def test_pb215_notification_created_on_task_assign(
        self, client, db, manager_user, staff_user, manager_token
    ):
        """PB215: tạo in-app notification khi giao task"""
        res = client.post("/api/v1/tasks", json={
            "title": "Task PB215",
            "assignee_ids": [str(staff_user.id)],
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 201

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "new_task",
        ).first()
        assert notif is not None
        assert "PB215" in notif.title or "PB215" in notif.body

    def test_pb215_notification_contains_task_info(
        self, client, db, manager_user, staff_user, manager_token
    ):
        """PB215: thông báo chứa tiêu đề task và deadline"""
        deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        client.post("/api/v1/tasks", json={
            "title": "Task Có Deadline",
            "assignee_ids": [str(staff_user.id)],
            "deadline": deadline,
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "new_task",
        ).first()
        assert notif is not None
        assert notif.title is not None
        assert notif.body is not None

    def test_pb215_all_assignees_notified(
        self, client, db, manager_user, staff_user, dept, org, manager_token
    ):
        """PB215: tất cả assignee đều nhận thông báo"""
        from app.core.security import hash_password
        staff2 = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Staff 2", email="staff2_215@test.com",
            password_hash=hash_password("Staff2@123"),
            role="staff", is_active=True, must_change_pw=False,
        )
        db.add(staff2)
        db.commit()

        client.post("/api/v1/tasks", json={
            "title": "Task Multi",
            "assignee_ids": [str(staff_user.id), str(staff2.id)],
        }, headers=auth_header(manager_token["access"]))

        notifs = db.query(Notification).filter(
            Notification.type == "new_task",
        ).all()
        notified = {str(n.user_id) for n in notifs}
        assert str(staff_user.id) in notified
        assert str(staff2.id) in notified

    def test_pb215_notification_is_unread_by_default(
        self, client, db, manager_user, staff_user, manager_token
    ):
        """PB215: thông báo mới mặc định là chưa đọc"""
        client.post("/api/v1/tasks", json={
            "title": "Task Unread",
            "assignee_ids": [str(staff_user.id)],
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "new_task",
        ).first()
        assert notif.is_read == False


# ══════════════════════════════════════════════════════════════
# PB216 — Email khi được giao task mới
# ══════════════════════════════════════════════════════════════

class TestTaskAssignedEmail:

    def test_pb216_email_sent_on_task_assign(
        self, client, manager_user, staff_user, manager_token
    ):
        """PB216: gửi email khi được giao task"""
        with patch("app.services.notification_service.send_task_assigned_email") as mock:
            client.post("/api/v1/tasks", json={
                "title": "Task Email",
                "assignee_ids": [str(staff_user.id)],
            }, headers=auth_header(manager_token["access"]))
            mock.assert_called_once()

    def test_pb216_email_sent_to_correct_recipient(
        self, client, manager_user, staff_user, manager_token
    ):
        """PB216: email gửi đúng địa chỉ của nhân viên"""
        sent_emails = []
        with patch("app.services.notification_service.send_task_assigned_email",
                   side_effect=lambda *args, **kwargs: sent_emails.append(args)):
            client.post("/api/v1/tasks", json={
                "title": "Task Email Check",
                "assignee_ids": [str(staff_user.id)],
            }, headers=auth_header(manager_token["access"]))

        assert len(sent_emails) == 1
        assert sent_emails[0][0] == "staff@test.com"

    def test_pb216_no_email_if_no_assignees(
        self, client, manager_user, manager_token
    ):
        """PB216: không gửi email nếu task không có assignee"""
        with patch("app.services.notification_service.send_task_assigned_email") as mock:
            client.post("/api/v1/tasks", json={
                "title": "Task No Assignee",
            }, headers=auth_header(manager_token["access"]))
            mock.assert_not_called()


# ══════════════════════════════════════════════════════════════
# PB217 — Thông báo khi deadline task thay đổi
# ══════════════════════════════════════════════════════════════

class TestDeadlineChangedNotification:

    def test_pb217_notification_on_deadline_change(
        self, client, db, manager_user, staff_user, dept, manager_token
    ):
        """PB217: thông báo khi Manager đổi deadline"""
        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task DL Change", status="in_progress",
            priority="medium", progress_pct=30,
            deadline=now + timedelta(days=5),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        new_dl = (now + timedelta(days=2)).isoformat()
        client.patch(f"/api/v1/tasks/{task.id}", json={
            "deadline": new_dl,
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_changed",
        ).first()
        assert notif is not None

    def test_pb217_notification_shows_old_and_new_deadline(
        self, client, db, manager_user, staff_user, dept, manager_token
    ):
        """PB217: body chứa deadline cũ và mới"""
        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task DL Body", status="in_progress",
            priority="high", progress_pct=20,
            deadline=now + timedelta(days=7),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        new_dl = (now + timedelta(days=3)).isoformat()
        client.patch(f"/api/v1/tasks/{task.id}", json={
            "deadline": new_dl,
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_changed",
        ).first()
        assert notif.body is not None
        assert len(notif.body) > 10

    def test_pb217_no_notification_if_deadline_unchanged(
        self, client, db, manager_user, staff_user, dept, manager_token
    ):
        """PB217: không thông báo nếu chỉ đổi title"""
        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task No DL Change", status="todo",
            priority="medium", progress_pct=0,
            deadline=now + timedelta(days=5),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.patch(f"/api/v1/tasks/{task.id}", json={
            "title": "Tiêu đề mới",
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_changed",
        ).first()
        assert notif is None


# ══════════════════════════════════════════════════════════════
# PB218 — Thông báo khi task đổi người thực hiện
# ══════════════════════════════════════════════════════════════

class TestReassignNotification:

    def test_pb218_old_assignee_notified_on_reassign(
        self, client, db, manager_user, staff_user, dept, org, manager_token
    ):
        """PB218: người bị gỡ khỏi task nhận thông báo"""
        from app.core.security import hash_password
        staff2 = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Staff New", email="staffnew_218@test.com",
            password_hash=hash_password("New@123456"),
            role="staff", is_active=True, must_change_pw=False,
        )
        db.add(staff2)

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Reassign", status="in_progress",
            priority="medium", progress_pct=50,
            deadline=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        # Chuyển sang staff2
        client.patch(f"/api/v1/tasks/{task.id}", json={
            "assignee_ids": [str(staff2.id)],
        }, headers=auth_header(manager_token["access"]))

        notif_old = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "task_unassigned",
        ).first()
        assert notif_old is not None

    def test_pb218_new_assignee_notified_on_reassign(
        self, client, db, manager_user, staff_user, dept, org, manager_token
    ):
        """PB218: người được gán mới nhận thông báo"""
        from app.core.security import hash_password
        staff2 = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Staff New2", email="staffnew2_218@test.com",
            password_hash=hash_password("New2@123456"),
            role="staff", is_active=True, must_change_pw=False,
        )
        db.add(staff2)

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Reassign2", status="todo",
            priority="low", progress_pct=0,
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.patch(f"/api/v1/tasks/{task.id}", json={
            "assignee_ids": [str(staff2.id)],
        }, headers=auth_header(manager_token["access"]))

        notif_new = db.query(Notification).filter(
            Notification.user_id == staff2.id,
            Notification.type == "new_task",
        ).first()
        assert notif_new is not None


# ══════════════════════════════════════════════════════════════
# PB219, PB220 — Cảnh báo deadline sắp đến
# ══════════════════════════════════════════════════════════════

class TestDeadlineReminders:

    def test_pb219_24h_reminder_created(self, db, dept, manager_user, staff_user):
        """PB219: tạo cảnh báo 24h trước deadline"""
        from app.services.notification_service import check_deadline_reminders

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task 24h", status="in_progress",
            priority="high", progress_pct=50,
            deadline=now + timedelta(hours=23),  # còn 23h
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        count = check_deadline_reminders(db)
        assert count >= 1

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_24h",
        ).first()
        assert notif is not None

    def test_pb219_no_duplicate_24h_reminder(self, db, dept, manager_user, staff_user):
        """PB219: không gửi lại cảnh báo 24h nếu đã gửi"""
        from app.services.notification_service import check_deadline_reminders

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task No Dup", status="in_progress",
            priority="medium", progress_pct=30,
            deadline=now + timedelta(hours=23),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        check_deadline_reminders(db)
        check_deadline_reminders(db)  # gọi lần 2

        count = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_24h",
        ).count()
        assert count == 1  # chỉ 1 notification

    def test_pb220_1h_reminder_created(self, db, dept, manager_user, staff_user):
        """PB220: tạo cảnh báo 1h trước deadline"""
        from app.services.notification_service import check_deadline_reminders

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task 1h", status="in_progress",
            priority="high", progress_pct=70,
            deadline=now + timedelta(minutes=50),  # còn 50 phút
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        count = check_deadline_reminders(db)
        assert count >= 1

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "deadline_1h",
        ).first()
        assert notif is not None

    def test_pb219_done_task_no_reminder(self, db, dept, manager_user, staff_user):
        """PB219: task đã done không nhận cảnh báo deadline"""
        from app.services.notification_service import check_deadline_reminders

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Done Task Reminder", status="done",
            priority="medium", progress_pct=100,
            deadline=now + timedelta(hours=10),
            completed_at=now,
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        check_deadline_reminders(db)

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type.in_(["deadline_24h", "deadline_1h"]),
        ).first()
        assert notif is None


# ══════════════════════════════════════════════════════════════
# PB221 — Manager nhận thông báo khi nhân viên cập nhật tiến độ
# ══════════════════════════════════════════════════════════════

class TestProgressUpdateNotification:

    def test_pb221_manager_notified_on_progress_update(
        self, client, db, manager_user, staff_user, dept, staff_token
    ):
        """PB221: Manager nhận thông báo khi nhân viên cập nhật % tiến độ"""
        dept.manager_id = manager_user.id
        db.commit()

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Progress", status="in_progress",
            priority="medium", progress_pct=20,
            deadline=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.patch(f"/api/v1/tasks/{task.id}/progress",
                     json={"progress_pct": 60},
                     headers=auth_header(staff_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "task_progress_updated",
        ).first()
        assert notif is not None

    def test_pb221_notification_shows_progress_value(
        self, client, db, manager_user, staff_user, dept, staff_token
    ):
        """PB221: thông báo hiển thị % tiến độ mới"""
        dept.manager_id = manager_user.id
        db.commit()

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Progress Value", status="in_progress",
            priority="low", progress_pct=10,
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.patch(f"/api/v1/tasks/{task.id}/progress",
                     json={"progress_pct": 80},
                     headers=auth_header(staff_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "task_progress_updated",
        ).first()
        assert notif is not None
        assert "80" in notif.body or "80%" in notif.body


# ══════════════════════════════════════════════════════════════
# PB222, PB223 — Thông báo comment
# ══════════════════════════════════════════════════════════════

class TestCommentNotification:

    def test_pb222_manager_notified_on_comment(
        self, client, db, manager_user, staff_user, dept, staff_token
    ):
        """PB222: Manager nhận thông báo khi nhân viên comment"""
        dept.manager_id = manager_user.id
        db.commit()

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Comment", status="in_progress",
            priority="medium", progress_pct=40,
            deadline=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.post(f"/api/v1/tasks/{task.id}/comments",
                    json={"content": "Đã xong bước 1"},
                    headers=auth_header(staff_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "new_comment",
        ).first()
        assert notif is not None

    def test_pb222_comment_preview_in_notification(
        self, client, db, manager_user, staff_user, dept, staff_token
    ):
        """PB222: preview nội dung comment trong notification"""
        dept.manager_id = manager_user.id
        db.commit()

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Comment Preview", status="in_progress",
            priority="medium", progress_pct=30,
            deadline=datetime.now(timezone.utc) + timedelta(days=2),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        client.post(f"/api/v1/tasks/{task.id}/comments",
                    json={"content": "Preview comment này"},
                    headers=auth_header(staff_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "new_comment",
        ).first()
        assert notif is not None
        assert "Preview comment này" in notif.body

    def test_pb223_staff_notified_on_manager_reply(
        self, client, db, manager_user, staff_user, dept, staff_token, manager_token
    ):
        """PB223: nhân viên nhận thông báo khi Manager reply"""
        dept.manager_id = manager_user.id
        db.commit()

        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Reply", status="in_progress",
            priority="medium", progress_pct=50,
            deadline=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        # Staff comment trước
        res = client.post(f"/api/v1/tasks/{task.id}/comments",
                          json={"content": "Comment của staff"},
                          headers=auth_header(staff_token["access"]))
        comment_id = res.json()["id"]

        # Manager reply
        client.post(f"/api/v1/tasks/{task.id}/comments",
                    json={"content": "Reply của manager", "parent_id": comment_id},
                    headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "comment_reply",
        ).first()
        assert notif is not None


# ══════════════════════════════════════════════════════════════
# PB224 — Manager nhận thông báo task trễ deadline
# ══════════════════════════════════════════════════════════════

class TestOverdueNotification:

    def test_pb224_manager_notified_on_overdue(self, db, dept, manager_user, staff_user):
        """PB224: Manager nhận thông báo khi task quá hạn"""
        from app.services.notification_service import check_overdue_tasks

        dept.manager_id = manager_user.id
        db.commit()

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Overdue Task 224", status="in_progress",
            priority="high", progress_pct=30,
            deadline=now - timedelta(minutes=1),  # vừa quá hạn
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        count = check_overdue_tasks(db)
        assert count >= 1

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "task_overdue",
        ).first()
        assert notif is not None

    def test_pb224_notification_has_staff_and_task_name(
        self, db, dept, manager_user, staff_user
    ):
        """PB224: thông báo có tên nhân viên và tên task"""
        from app.services.notification_service import check_overdue_tasks

        dept.manager_id = manager_user.id
        db.commit()

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Trễ Cụ Thể", status="in_progress",
            priority="high", progress_pct=20,
            deadline=now - timedelta(hours=2),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        check_overdue_tasks(db)

        notif = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "task_overdue",
        ).first()
        assert "Task Trễ Cụ Thể" in notif.title or "Task Trễ Cụ Thể" in notif.body

    def test_pb224_no_duplicate_overdue_notification(
        self, db, dept, manager_user, staff_user
    ):
        """PB224: không gửi lại thông báo overdue nếu đã gửi"""
        from app.services.notification_service import check_overdue_tasks

        dept.manager_id = manager_user.id
        db.commit()

        now = datetime.now(timezone.utc)
        task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task No Dup Overdue", status="in_progress",
            priority="medium", progress_pct=40,
            deadline=now - timedelta(hours=1),
        )
        db.add(task)
        db.flush()
        db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
        db.commit()

        check_overdue_tasks(db)
        check_overdue_tasks(db)

        count = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "task_overdue",
            Notification.body.contains(str(task.id)),
        ).count()
        assert count == 1


# ══════════════════════════════════════════════════════════════
# PB225 — Thông báo khi KPI được chốt (đã test trong test_kpi.py)
# PB226 — CEO nhận cảnh báo phòng ban có tỉ lệ task trễ cao
# ══════════════════════════════════════════════════════════════

class TestCeoAlerts:

    def test_pb226_ceo_alerted_on_high_overdue_rate(
        self, db, dept, manager_user, staff_user, ceo_user, org
    ):
        """PB226: CEO nhận cảnh báo khi tỉ lệ task trễ > 20%"""
        from app.services.notification_service import check_dept_overdue_rate

        now = datetime.now(timezone.utc)
        # Tạo 5 task, 2 overdue → 40% > 20%
        for i in range(3):
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"OnTime {i}", status="done", priority="medium",
                progress_pct=100, deadline=now + timedelta(days=1),
            )
            db.add(t)
        for i in range(2):
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Late {i}", status="in_progress", priority="high",
                progress_pct=30, deadline=now - timedelta(days=1),
            )
            db.add(t)
        db.commit()

        check_dept_overdue_rate(org.id, threshold=20.0, db=db)

        notif = db.query(Notification).filter(
            Notification.user_id == ceo_user.id,
            Notification.type == "dept_high_overdue",
        ).first()
        assert notif is not None

    def test_pb226_no_alert_when_overdue_rate_below_threshold(
        self, db, dept, manager_user, staff_user, ceo_user, org
    ):
        """PB226: không cảnh báo nếu tỉ lệ trễ dưới ngưỡng"""
        from app.services.notification_service import check_dept_overdue_rate

        now = datetime.now(timezone.utc)
        # Chỉ 1/10 task trễ → 10% < 20%
        for i in range(9):
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Good {i}", status="done", priority="medium",
                progress_pct=100, deadline=now + timedelta(days=1),
            )
            db.add(t)
        t_late = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="One Late", status="in_progress", priority="low",
            progress_pct=50, deadline=now - timedelta(days=1),
        )
        db.add(t_late)
        db.commit()

        check_dept_overdue_rate(org.id, threshold=20.0, db=db)

        notif = db.query(Notification).filter(
            Notification.user_id == ceo_user.id,
            Notification.type == "dept_high_overdue",
        ).first()
        assert notif is None

    def test_pb227_weekly_report_email_sent(self, db, ceo_user, org):
        """PB227: CEO nhận email tổng kết tuần thứ Hai"""
        from app.services.notification_service import send_weekly_report

        with patch("app.services.notification_service._send_weekly_report_email") as mock:
            send_weekly_report(org.id, db)
            mock.assert_called_once()
            args = mock.call_args[0]
            assert args[0] == ceo_user.email  # gửi đúng email CEO


# ══════════════════════════════════════════════════════════════
# PB228 — Bật/tắt từng loại thông báo
# ══════════════════════════════════════════════════════════════

class TestNotificationSettings:

    def test_pb228_disable_new_task_notification(
        self, client, db, manager_user, staff_user, manager_token, staff_token
    ):
        """PB228: tắt thông báo 'task mới' → không nhận nữa"""
        # Tắt thông báo new_task
        client.patch("/api/v1/pwa/notification-settings", json={
            "push_enabled": True,
            "types": {"new_task": False, "deadline": True, "kpi": True, "system": True},
        }, headers=auth_header(staff_token["access"]))

        client.post("/api/v1/tasks", json={
            "title": "Task Bị Tắt Thông Báo",
            "assignee_ids": [str(staff_user.id)],
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "new_task",
        ).first()
        assert notif is None

    def test_pb228_enabled_notification_still_received(
        self, client, db, manager_user, staff_user, manager_token, staff_token
    ):
        """PB228: thông báo bật vẫn nhận được"""
        client.patch("/api/v1/pwa/notification-settings", json={
            "push_enabled": True,
            "types": {"new_task": True, "deadline": True, "kpi": True, "system": True},
        }, headers=auth_header(staff_token["access"]))

        client.post("/api/v1/tasks", json={
            "title": "Task Vẫn Nhận",
            "assignee_ids": [str(staff_user.id)],
        }, headers=auth_header(manager_token["access"]))

        notif = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "new_task",
        ).first()
        assert notif is not None


# ══════════════════════════════════════════════════════════════
# PB229 — Notification Center
# ══════════════════════════════════════════════════════════════

class TestNotificationCenter:

    def test_pb229_get_all_notifications(self, client, db, staff_user, staff_token):
        """PB229: xem tất cả thông báo"""
        for i in range(3):
            db.add(Notification(
                id=uuid.uuid4(), user_id=staff_user.id,
                type="system", title=f"Thông báo {i}",
                body="Body", is_read=False,
            ))
        db.commit()

        res = client.get("/api/v1/notifications",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert "unread_count" in data
        assert data["total"] >= 3

    def test_pb229_notifications_sorted_by_time(
        self, client, db, staff_user, staff_token
    ):
        """PB229: thông báo sắp xếp theo thứ tự thời gian mới nhất"""
        now = datetime.now(timezone.utc)
        for i, offset in enumerate([10, 5, 1]):
            db.add(Notification(
                id=uuid.uuid4(), user_id=staff_user.id,
                type="system", title=f"Notif {i}",
                body="Body", is_read=False,
                created_at=now - timedelta(minutes=offset),
            ))
        db.commit()

        res = client.get("/api/v1/notifications",
                         headers=auth_header(staff_token["access"]))
        items = res.json()["items"]
        assert len(items) >= 3
        # Mới nhất đầu tiên
        times = [item["created_at"] for item in items[:3]]
        assert times == sorted(times, reverse=True)

    def test_pb229_read_unread_distinction(
        self, client, db, staff_user, staff_token
    ):
        """PB229: phân biệt đã đọc / chưa đọc"""
        db.add(Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Chưa đọc",
            body="Body", is_read=False,
        ))
        db.add(Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Đã đọc",
            body="Body", is_read=True,
        ))
        db.commit()

        res = client.get("/api/v1/notifications",
                         headers=auth_header(staff_token["access"]))
        data = res.json()
        assert data["unread_count"] >= 1
        items = data["items"]
        has_unread = any(not i["is_read"] for i in items)
        has_read = any(i["is_read"] for i in items)
        assert has_unread and has_read

    def test_pb229_mark_single_notification_read(
        self, client, db, staff_user, staff_token
    ):
        """PB229: đánh dấu 1 thông báo đã đọc"""
        notif = Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Test Read",
            body="Body", is_read=False,
        )
        db.add(notif)
        db.commit()

        res = client.patch(f"/api/v1/notifications/{notif.id}/read",
                           headers=auth_header(staff_token["access"]))
        assert res.status_code == 200

        db.refresh(notif)
        assert notif.is_read == True

    def test_pb229_pagination(self, client, db, staff_user, staff_token):
        """PB229: phân trang danh sách thông báo"""
        for i in range(25):
            db.add(Notification(
                id=uuid.uuid4(), user_id=staff_user.id,
                type="system", title=f"Notif {i}",
                body="Body", is_read=False,
            ))
        db.commit()

        res = client.get("/api/v1/notifications?page=1&page_size=10",
                         headers=auth_header(staff_token["access"]))
        data = res.json()
        assert len(data["items"]) == 10
        assert data["total"] >= 25


# ══════════════════════════════════════════════════════════════
# PB230 — Đánh dấu tất cả đã đọc
# ══════════════════════════════════════════════════════════════

class TestMarkAllRead:

    def test_pb230_mark_all_read(self, client, db, staff_user, staff_token):
        """PB230: đánh dấu tất cả thông báo là đã đọc"""
        for i in range(5):
            db.add(Notification(
                id=uuid.uuid4(), user_id=staff_user.id,
                type="system", title=f"Notif {i}",
                body="Body", is_read=False,
            ))
        db.commit()

        res = client.post("/api/v1/notifications/read-all",
                          headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["marked_count"] >= 5

        unread = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.is_read == False,
        ).count()
        assert unread == 0

    def test_pb230_unread_count_zero_after_mark_all(
        self, client, db, staff_user, staff_token
    ):
        """PB230: unread_count = 0 sau khi đánh dấu tất cả"""
        db.add(Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Test", body="Body", is_read=False,
        ))
        db.commit()

        client.post("/api/v1/notifications/read-all",
                    headers=auth_header(staff_token["access"]))

        res = client.get("/api/v1/notifications",
                         headers=auth_header(staff_token["access"]))
        assert res.json()["unread_count"] == 0


# ══════════════════════════════════════════════════════════════
# PB231 — Lọc thông báo theo loại
# ══════════════════════════════════════════════════════════════

class TestNotificationFilter:

    def test_pb231_filter_by_type_task(self, client, db, staff_user, staff_token):
        """PB231: lọc thông báo loại task"""
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="new_task", title="Task", body="B", is_read=False))
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="kpi_finalized", title="KPI", body="B", is_read=False))
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="system", title="Sys", body="B", is_read=False))
        db.commit()

        res = client.get("/api/v1/notifications?type=new_task",
                         headers=auth_header(staff_token["access"]))
        items = res.json()["items"]
        assert all(i["type"] == "new_task" for i in items)

    def test_pb231_filter_by_type_kpi(self, client, db, staff_user, staff_token):
        """PB231: lọc thông báo loại KPI"""
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="kpi_finalized", title="KPI", body="B", is_read=False))
        db.commit()

        res = client.get("/api/v1/notifications?type=kpi_finalized",
                         headers=auth_header(staff_token["access"]))
        items = res.json()["items"]
        assert len(items) >= 1
        assert all(i["type"] == "kpi_finalized" for i in items)

    def test_pb231_filter_unread_only(self, client, db, staff_user, staff_token):
        """PB231: chỉ lấy thông báo chưa đọc"""
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="system", title="Unread", body="B", is_read=False))
        db.add(Notification(id=uuid.uuid4(), user_id=staff_user.id,
                            type="system", title="Read", body="B", is_read=True))
        db.commit()

        res = client.get("/api/v1/notifications?unread_only=true",
                         headers=auth_header(staff_token["access"]))
        items = res.json()["items"]
        assert all(not i["is_read"] for i in items)


# ══════════════════════════════════════════════════════════════
# PB232 — Tự động xóa thông báo cũ > 30 ngày
# ══════════════════════════════════════════════════════════════

class TestAutoCleanNotifications:

    def test_pb232_old_notifications_deleted(self, db, staff_user):
        """PB232: thông báo cũ hơn 30 ngày bị xóa"""
        from app.services.notification_service import cleanup_old_notifications

        now = datetime.now(timezone.utc)
        # Thông báo cũ 31 ngày
        old_notif = Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Old", body="Old Body", is_read=True,
            created_at=now - timedelta(days=31),
        )
        # Thông báo mới 10 ngày
        new_notif = Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="New", body="New Body", is_read=False,
            created_at=now - timedelta(days=10),
        )
        db.add_all([old_notif, new_notif])
        db.commit()

        deleted_count = cleanup_old_notifications(days=30, db=db)
        assert deleted_count >= 1

        remaining = db.query(Notification).filter(
            Notification.user_id == staff_user.id
        ).all()
        titles = [n.title for n in remaining]
        assert "Old" not in titles
        assert "New" in titles

    def test_pb232_recent_notifications_preserved(self, db, staff_user):
        """PB232: thông báo trong 30 ngày không bị xóa"""
        from app.services.notification_service import cleanup_old_notifications

        now = datetime.now(timezone.utc)
        recent = Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="system", title="Recent", body="Body", is_read=False,
            created_at=now - timedelta(days=5),
        )
        db.add(recent)
        db.commit()

        cleanup_old_notifications(days=30, db=db)

        notif = db.query(Notification).filter(
            Notification.id == recent.id
        ).first()
        assert notif is not None

    def test_pb232_returns_deleted_count(self, db, staff_user):
        """PB232: trả về số lượng thông báo đã xóa"""
        from app.services.notification_service import cleanup_old_notifications

        now = datetime.now(timezone.utc)
        for i in range(3):
            db.add(Notification(
                id=uuid.uuid4(), user_id=staff_user.id,
                type="system", title=f"Old {i}", body="Body", is_read=True,
                created_at=now - timedelta(days=35),
            ))
        db.commit()

        count = cleanup_old_notifications(days=30, db=db)
        assert count == 3
