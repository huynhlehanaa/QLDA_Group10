"""
Test endpoints:
- GET /api/v1/tasks/me       — task của người đang đăng nhập
- GET /api/v1/tasks/staff/{id} — Manager xem task của nhân viên cụ thể
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee


# ══════════════════════════════════════════════════════════════
# GET /tasks/me
# ══════════════════════════════════════════════════════════════

class TestGetMyTasks:

    def test_staff_gets_own_tasks(self, client, task_with_assignee, staff_user, staff_token):
        """Staff xem được task của mình qua /tasks/me"""
        res = client.get("/api/v1/tasks/me", headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == str(staff_user.id)
        assert data["full_name"] == "Staff Test"
        assert "stats" in data
        assert "tasks" in data
        task_ids = [t["id"] for t in data["tasks"]]
        assert str(task_with_assignee.id) in task_ids

    def test_staff_does_not_see_unassigned_tasks(
        self, client, db, task, staff_user, staff_token, manager_user, dept
    ):
        """Staff không thấy task chưa được giao cho mình"""
        # task fixture không gán cho staff
        res = client.get("/api/v1/tasks/me", headers=auth_header(staff_token["access"]))
        data = res.json()
        task_ids = [t["id"] for t in data["tasks"]]
        assert str(task.id) not in task_ids

    def test_my_tasks_stats_structure(self, client, task_with_assignee, staff_token):
        """Stats trả về đủ các trường"""
        res = client.get("/api/v1/tasks/me", headers=auth_header(staff_token["access"]))
        stats = res.json()["stats"]
        assert "total" in stats
        assert "in_progress" in stats
        assert "done_on_time" in stats
        assert "done_late" in stats
        assert "overdue" in stats
        assert "cancelled" in stats

    def test_my_tasks_stats_count_correct(
        self, client, db, task_with_assignee, staff_user, staff_token, dept, manager_user
    ):
        """Stats đếm đúng số lượng task theo trạng thái"""
        now = datetime.now(timezone.utc)
        done_t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Done task", status="done", priority="low", progress_pct=100,
            deadline=now + timedelta(days=1),       # đúng hạn
            completed_at=now,
        )
        db.add(done_t)
        db.add(TaskAssignee(task_id=done_t.id, user_id=staff_user.id))
        db.commit()

        res = client.get("/api/v1/tasks/me", headers=auth_header(staff_token["access"]))
        stats = res.json()["stats"]
        assert stats["total"] >= 2
        assert stats["done_on_time"] >= 1

    def test_my_tasks_overdue_counted(
        self, client, db, overdue_task, staff_user, staff_token
    ):
        """Task quá hạn được đếm trong stats"""
        db.add(TaskAssignee(task_id=overdue_task.id, user_id=staff_user.id))
        db.commit()

        res = client.get("/api/v1/tasks/me", headers=auth_header(staff_token["access"]))
        stats = res.json()["stats"]
        assert stats["overdue"] >= 1

    def test_my_tasks_filter_by_status(
        self, client, db, task_with_assignee, staff_user, staff_token, dept, manager_user
    ):
        """Lọc /tasks/me theo status"""
        # Tạo task done
        done_t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Done", status="done", priority="low", progress_pct=100,
        )
        db.add(done_t)
        db.add(TaskAssignee(task_id=done_t.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            "/api/v1/tasks/me?status=todo",
            headers=auth_header(staff_token["access"]),
        )
        tasks = res.json()["tasks"]
        assert all(t["status"] == "todo" for t in tasks)

    def test_my_tasks_filter_by_priority(
        self, client, db, task_with_assignee, staff_user, staff_token, dept, manager_user
    ):
        """Lọc /tasks/me theo priority"""
        high_t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="High", status="todo", priority="high", progress_pct=0,
        )
        db.add(high_t)
        db.add(TaskAssignee(task_id=high_t.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            "/api/v1/tasks/me?priority=high",
            headers=auth_header(staff_token["access"]),
        )
        tasks = res.json()["tasks"]
        assert all(t["priority"] == "high" for t in tasks)

    def test_my_tasks_filter_overdue_only(
        self, client, db, overdue_task, task_with_assignee, staff_user, staff_token
    ):
        """Lọc /tasks/me chỉ lấy task quá hạn"""
        db.add(TaskAssignee(task_id=overdue_task.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            "/api/v1/tasks/me?overdue_only=true",
            headers=auth_header(staff_token["access"]),
        )
        tasks = res.json()["tasks"]
        assert len(tasks) >= 1
        assert all(t["is_overdue"] for t in tasks)

    def test_my_tasks_sort_by_deadline(
        self, client, db, staff_user, staff_token, dept, manager_user
    ):
        """Sắp xếp /tasks/me theo deadline tăng dần"""
        now = datetime.now(timezone.utc)
        for days in [5, 1, 3]:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {days}d", status="todo", priority="medium", progress_pct=0,
                deadline=now + timedelta(days=days),
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            "/api/v1/tasks/me?sort_by=deadline&sort_dir=asc",
            headers=auth_header(staff_token["access"]),
        )
        tasks = [t for t in res.json()["tasks"] if t["deadline"]]
        deadlines = [t["deadline"] for t in tasks]
        assert deadlines == sorted(deadlines)

    def test_manager_gets_own_tasks_via_me(
        self, client, db, manager_user, dept, manager_token
    ):
        """Manager gọi /tasks/me trả về task do mình tạo"""
        res = client.get("/api/v1/tasks/me", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == str(manager_user.id)
        assert "stats" in data

    def test_unauthenticated_cannot_access_me(self, client):
        """Không có token → từ chối"""
        res = client.get("/api/v1/tasks/me")
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════
# GET /tasks/staff/{staff_id}
# ══════════════════════════════════════════════════════════════

class TestGetStaffTasks:

    def test_manager_views_staff_tasks(
        self, client, task_with_assignee, staff_user, manager_user, manager_token
    ):
        """Manager xem task của nhân viên trong phòng"""
        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == str(staff_user.id)
        assert data["full_name"] == "Staff Test"
        assert "stats" in data
        assert "tasks" in data
        task_ids = [t["id"] for t in data["tasks"]]
        assert str(task_with_assignee.id) in task_ids

    def test_manager_cannot_view_other_dept_staff(
        self, client, db, org, manager_user, manager_token
    ):
        """Manager không xem được nhân viên phòng khác"""
        other_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Khác"
        )
        db.add(other_dept)
        other_staff = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid.uuid4(), org_id=org.id, dept_id=other_dept.id,
            full_name="NV Phòng Khác", email="other_staff2@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(other_staff)
        db.commit()

        res = client.get(
            f"/api/v1/tasks/staff/{other_staff.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403

    def test_staff_cannot_view_other_staff_tasks(
        self, client, db, org, dept, staff_user, staff_token
    ):
        """Staff không xem được task của nhân viên khác"""
        other_staff = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="NV Khác 2", email="other2@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(other_staff)
        db.commit()

        res = client.get(
            f"/api/v1/tasks/staff/{other_staff.id}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_staff_can_view_own_tasks_via_staff_endpoint(
        self, client, task_with_assignee, staff_user, staff_token
    ):
        """Staff xem task của chính mình qua /tasks/staff/{own_id}"""
        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == str(staff_user.id)

    def test_staff_tasks_returns_stats(
        self, client, db, task_with_assignee, overdue_task,
        staff_user, manager_user, manager_token
    ):
        """Stats nhân viên trả về đầy đủ trường"""
        db.add(TaskAssignee(task_id=overdue_task.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}",
            headers=auth_header(manager_token["access"]),
        )
        stats = res.json()["stats"]
        assert "total" in stats
        assert "todo" in stats
        assert "in_progress" in stats
        assert "done" in stats
        assert "overdue" in stats
        assert stats["overdue"] >= 1

    def test_nonexistent_staff_returns_404(
        self, client, manager_user, manager_token
    ):
        """Nhân viên không tồn tại → 404"""
        res = client.get(
            f"/api/v1/tasks/staff/{uuid.uuid4()}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 404

    def test_staff_tasks_filter_by_status(
        self, client, db, task_with_assignee, staff_user, dept, manager_user, manager_token
    ):
        """Lọc task nhân viên theo status"""
        done_t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Done", status="done", priority="low", progress_pct=100,
        )
        db.add(done_t)
        db.add(TaskAssignee(task_id=done_t.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}?status=todo",
            headers=auth_header(manager_token["access"]),
        )
        tasks = res.json()["tasks"]
        assert all(t["status"] == "todo" for t in tasks)

    def test_staff_tasks_filter_overdue(
        self, client, db, overdue_task, task_with_assignee,
        staff_user, manager_user, manager_token
    ):
        """Lọc task nhân viên chỉ lấy quá hạn"""
        db.add(TaskAssignee(task_id=overdue_task.id, user_id=staff_user.id))
        db.commit()

        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}?overdue_only=true",
            headers=auth_header(manager_token["access"]),
        )
        tasks = res.json()["tasks"]
        assert len(tasks) >= 1
        assert all(t["is_overdue"] for t in tasks)

    def test_ceo_can_view_any_staff_tasks(
        self, client, task_with_assignee, staff_user, ceo_user, ceo_token
    ):
        """CEO xem được task của bất kỳ nhân viên nào"""
        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200

    def test_empty_tasks_returns_empty_list(
        self, client, staff_user, manager_user, manager_token
    ):
        """Nhân viên chưa có task nào → danh sách rỗng"""
        res = client.get(
            f"/api/v1/tasks/staff/{staff_user.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["tasks"] == []
        assert data["stats"]["total"] == 0
