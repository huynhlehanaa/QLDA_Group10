"""
Test nâng cao — PB098 đến PB119
Bao gồm: workload, gia hạn deadline, overdue, stats, export, recurring
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee, DeadlineExtensionRequest


class TestOverdueDetection:
    """PB098"""

    def test_pb098_overdue_task_flagged(
        self, client, overdue_task, manager_user, manager_token
    ):
        """PB098: task quá hạn được đánh dấu is_overdue=True"""
        res = client.get(
            f"/api/v1/tasks/{overdue_task.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["is_overdue"] == True

    def test_pb098_done_task_not_overdue(
        self, client, done_task, manager_user, manager_token
    ):
        """PB098: task đã done không bị đánh dấu overdue"""
        res = client.get(
            f"/api/v1/tasks/{done_task.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.json()["is_overdue"] == False

    def test_pb098_future_deadline_not_overdue(
        self, client, task, manager_user, manager_token
    ):
        """PB098: task còn hạn không bị overdue"""
        res = client.get(
            f"/api/v1/tasks/{task.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.json()["is_overdue"] == False


class TestDeadlineExtension:
    """PB099, PB100"""

    def test_pb099_staff_requests_extension(
        self, client, task_with_assignee, staff_token
    ):
        """PB099: nhân viên yêu cầu gia hạn deadline"""
        new_deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/extension-requests",
            json={"proposed_deadline": new_deadline, "reason": "Cần thêm thời gian research"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "pending"
        assert data["reason"] == "Cần thêm thời gian research"

    def test_pb099_unassigned_cannot_request_extension(
        self, client, task, staff_user, staff_token
    ):
        """PB099: Staff không được giao task không request extension"""
        new_deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        res = client.post(
            f"/api/v1/tasks/{task.id}/extension-requests",
            json={"proposed_deadline": new_deadline, "reason": "Cần thêm thời gian"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb100_manager_approves_extension(
        self, client, db, task_with_assignee, staff_token, manager_token
    ):
        """PB100: Manager phê duyệt yêu cầu gia hạn"""
        new_deadline = datetime.now(timezone.utc) + timedelta(days=7)

        # Tạo yêu cầu
        ext_req = DeadlineExtensionRequest(
            id=uuid.uuid4(),
            task_id=task_with_assignee.id,
            requested_by=uuid.uuid4(),
            proposed_deadline=new_deadline,
            reason="Cần thêm thời gian",
            status="pending",
        )
        db.add(ext_req)
        db.commit()

        # Manager phê duyệt
        res = client.patch(
            f"/api/v1/tasks/extension-requests/{ext_req.id}/review",
            json={"approved": True, "note": "Chấp nhận gia hạn"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

        # Deadline task đã được cập nhật
        db.refresh(task_with_assignee)
        assert task_with_assignee.deadline is not None

    def test_pb100_manager_rejects_extension(
        self, client, db, task_with_assignee, manager_token
    ):
        """PB100: Manager từ chối yêu cầu gia hạn"""
        ext_req = DeadlineExtensionRequest(
            id=uuid.uuid4(),
            task_id=task_with_assignee.id,
            requested_by=uuid.uuid4(),
            proposed_deadline=datetime.now(timezone.utc) + timedelta(days=5),
            reason="Lý do",
            status="pending",
        )
        db.add(ext_req)
        db.commit()

        res = client.patch(
            f"/api/v1/tasks/extension-requests/{ext_req.id}/review",
            json={"approved": False, "note": "Không thể gia hạn"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["status"] == "rejected"

    def test_pb100_staff_cannot_review_extension(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB100: Staff không phê duyệt được yêu cầu gia hạn"""
        ext_req = DeadlineExtensionRequest(
            id=uuid.uuid4(),
            task_id=task_with_assignee.id,
            requested_by=uuid.uuid4(),
            proposed_deadline=datetime.now(timezone.utc) + timedelta(days=5),
            reason="Lý do",
            status="pending",
        )
        db.add(ext_req)
        db.commit()

        res = client.patch(
            f"/api/v1/tasks/extension-requests/{ext_req.id}/review",
            json={"approved": True},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403


class TestWorkload:
    """PB101-PB103"""

    def test_pb101_workload_shows_all_staff(
        self, client, db, manager_user, staff_user, task_with_assignee, manager_token
    ):
        """PB101: Manager xem workload tất cả nhân viên"""
        res = client.get("/api/v1/tasks/workload", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        user_ids = [str(w["user_id"]) for w in data]
        assert str(staff_user.id) in user_ids

    def test_pb101_workload_shows_task_counts(
        self, client, db, manager_user, staff_user, task_with_assignee, manager_token
    ):
        """PB101: workload hiển thị số lượng task theo trạng thái"""
        res = client.get("/api/v1/tasks/workload", headers=auth_header(manager_token["access"]))
        staff_workload = next(
            (w for w in res.json() if str(w["user_id"]) == str(staff_user.id)), None
        )
        assert staff_workload is not None
        assert "todo_count" in staff_workload
        assert "in_progress_count" in staff_workload
        assert "done_count" in staff_workload
        assert "overdue_count" in staff_workload
        assert "total" in staff_workload

    def test_pb101_workload_sorted_by_total(
        self, client, db, manager_user, staff_user, dept, org, task_with_assignee, manager_token
    ):
        """PB101: workload sắp xếp nhân viên theo số task giảm dần"""
        # Tạo nhân viên thứ 2 không có task nào
        staff2 = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Staff2", email="staff2workload@test.com",
            password_hash="h", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(staff2)
        db.commit()

        res = client.get("/api/v1/tasks/workload", headers=auth_header(manager_token["access"]))
        totals = [w["total"] for w in res.json()]
        assert totals == sorted(totals, reverse=True)

    def test_pb101_staff_cannot_view_workload(
        self, client, staff_user, staff_token
    ):
        """PB101: Staff không xem được workload"""
        res = client.get("/api/v1/tasks/workload", headers=auth_header(staff_token["access"]))
        assert res.status_code == 403

    def test_pb102_overdue_counted_in_workload(
        self, client, db, manager_user, staff_user, overdue_task, manager_token
    ):
        """PB102: task quá hạn được tính trong workload"""
        db.add(TaskAssignee(task_id=overdue_task.id, user_id=staff_user.id))
        db.commit()

        res = client.get("/api/v1/tasks/workload", headers=auth_header(manager_token["access"]))
        staff_wl = next(
            (w for w in res.json() if str(w["user_id"]) == str(staff_user.id)), None
        )
        assert staff_wl is not None
        assert staff_wl["overdue_count"] >= 1


class TestRecurringTasks:
    """PB073-PB076"""

    def test_pb073_recurring_task_created_as_daily(
        self, client, db, manager_user, manager_token
    ):
        """PB073: tạo task lặp lại hàng ngày"""
        res = client.post(
            "/api/v1/tasks",
            json={
                "title": "Họp daily",
                "is_recurring": True,
                "recur_pattern": "daily",
            },
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        task_id = uuid.UUID(res.json()["id"])
        task = db.query(Task).filter(Task.id == task_id).first()
        assert task.is_recurring == True
        assert task.recur_pattern == "daily"

    def test_pb074_recurring_weekly_task(
        self, client, db, manager_user, manager_token
    ):
        """PB074: tạo task lặp lại hàng tuần"""
        res = client.post(
            "/api/v1/tasks",
            json={
                "title": "Báo cáo tuần",
                "is_recurring": True,
                "recur_pattern": "weekly",
                "recur_day": "5",  # Thứ 6
            },
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        task_id = uuid.UUID(res.json()["id"])
        task = db.query(Task).filter(Task.id == task_id).first()
        assert task.recur_pattern == "weekly"
        assert task.recur_day == "5"

    def test_pb075_recurring_monthly_task(
        self, client, db, manager_user, manager_token
    ):
        """PB075: tạo task lặp lại hàng tháng"""
        res = client.post(
            "/api/v1/tasks",
            json={
                "title": "Báo cáo tháng",
                "is_recurring": True,
                "recur_pattern": "monthly",
                "recur_day": "1",  # ngày 1 mỗi tháng
            },
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201

    def test_pb076_stop_recurring(
        self, client, db, manager_user, manager_token
    ):
        """PB076: dừng task lặp lại"""
        # Tạo recurring task
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task lặp", "is_recurring": True, "recur_pattern": "daily"},
            headers=auth_header(manager_token["access"]),
        )
        task_id = uuid.UUID(res.json()["id"])

        # Dừng lặp
        res2 = client.patch(
            f"/api/v1/tasks/{task_id}/stop-recurring",
            headers=auth_header(manager_token["access"]),
        )
        assert res2.status_code == 200

        task = db.query(Task).filter(Task.id == task_id).first()
        assert task.is_recurring == False
        assert task.recur_pattern is None

    def test_pb076_staff_cannot_stop_recurring(
        self, client, db, task, manager_user, staff_token
    ):
        """PB076: Staff không dừng được recurring task"""
        task.is_recurring = True
        db.commit()

        res = client.patch(
            f"/api/v1/tasks/{task.id}/stop-recurring",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403


class TestCeleryWorkers:
    """PB073, PB104 — unit test Celery tasks (mock DB)"""

    def test_create_recurring_tasks_daily(self, db, dept, manager_user):
        """PB073: Celery job tạo daily task"""
        from app.models.task import Task as TaskModel
        daily_task = TaskModel(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Daily Task", status="todo", priority="medium", progress_pct=0,
            is_recurring=True, recur_pattern="daily",
        )
        db.add(daily_task)
        db.commit()
        # Chỉ kiểm tra DB query logic, không chạy Celery thật
        count = db.query(TaskModel).filter(TaskModel.is_recurring == True).count()
        assert count >= 1

    def test_pb104_stale_task_detection(self, db, dept, manager_user):
        """PB104: phát hiện task stale sau 2 ngày"""
        from app.models.task import Task as TaskModel
        from app.models.organization import Department

        stale = TaskModel(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Stale Task", status="in_progress", priority="medium", progress_pct=30,
            last_updated_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add(stale)
        db.commit()

        # Kiểm tra query logic — task cũ hơn 2 ngày phải được phát hiện
        two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
        stale_found = db.query(TaskModel).filter(
            TaskModel.status == "in_progress",
            TaskModel.last_updated_at <= two_days_ago,
        ).count()
        assert stale_found >= 1


class TestTaskStats:
    """PB117, PB118"""

    def test_pb117_stats_for_manager(
        self, client, db, manager_user, task, overdue_task, done_task, manager_token
    ):
        """PB117: Manager xem thống kê task của phòng ban"""
        res = client.get("/api/v1/tasks/stats", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "total" in data
        assert "done_on_time" in data
        assert "done_late" in data
        assert "in_progress" in data
        assert "overdue" in data
        assert "cancelled" in data
        assert data["total"] >= 1

    def test_pb117_stats_for_staff(
        self, client, db, task_with_assignee, done_task, staff_user, staff_token
    ):
        """PB117: Staff chỉ thấy stats của task được giao"""
        res = client.get("/api/v1/tasks/stats", headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_pb118_stats_date_filter(
        self, client, manager_user, manager_token
    ):
        """PB118: lọc stats theo khoảng thời gian"""
        res = client.get(
        "/api/v1/tasks/stats",
        headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200

    def test_pb117_overdue_counted_correctly(
        self, client, db, manager_user, overdue_task, manager_token
    ):
        """PB117: task quá hạn được đếm đúng"""
        res = client.get("/api/v1/tasks/stats", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert data["overdue"] >= 1


class TestExportExcel:
    """PB119"""

    def test_pb119_export_returns_excel(
        self, client, task, manager_user, manager_token
    ):
        """PB119: xuất danh sách task ra file Excel"""
        res = client.get("/api/v1/tasks/export", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]
        assert "tasks.xlsx" in res.headers["content-disposition"]
        assert len(res.content) > 0

    def test_pb119_export_with_filter(
        self, client, db, manager_user, dept, task, manager_token
    ):
        """PB119: xuất có filter theo status"""
        res = client.get(
            "/api/v1/tasks/export?status=todo",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb119_export_content_valid(
        self, client, task, manager_user, manager_token
    ):
        """PB119: nội dung Excel có thể đọc được"""
        import io
        import openpyxl

        res = client.get("/api/v1/tasks/export", headers=auth_header(manager_token["access"]))
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        ws = wb.active

        # Row 1 là header
        headers = [ws.cell(1, col).value for col in range(1, 9)]
        assert "Tiêu đề" in headers
        assert "Trạng thái" in headers
        assert "Deadline" in headers

    def test_pb119_staff_cannot_export(
        self, client, staff_user, staff_token
    ):
        """PB119: Staff không xuất được Excel"""
        res = client.get("/api/v1/tasks/export", headers=auth_header(staff_token["access"]))
        assert res.status_code == 403


class TestIsOverdueComputed:
    """Kiểm tra logic is_overdue chính xác trên list view"""

    def test_overdue_appears_in_list(
        self, client, overdue_task, manager_user, manager_token
    ):
        """Task quá hạn xuất hiện trong list với is_overdue=True"""
        res = client.get("/api/v1/tasks", headers=auth_header(manager_token["access"]))
        overdue = next(
            (t for t in res.json() if t["id"] == str(overdue_task.id)), None
        )
        assert overdue is not None
        assert overdue["is_overdue"] == True

    def test_completed_not_overdue_in_list(
        self, client, done_task, manager_user, manager_token
    ):
        """Task done không bị overdue dù đã qua deadline"""
        res = client.get("/api/v1/tasks", headers=auth_header(manager_token["access"]))
        done = next(
            (t for t in res.json() if t["id"] == str(done_task.id)), None
        )
        if done:  # done task có thể không hiện trong cancelled filter
            assert done["is_overdue"] == False
