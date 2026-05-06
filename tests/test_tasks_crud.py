"""
Test Task CRUD — PB062 đến PB083
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee, Epic


class TestCreateTask:
    """PB062-PB070"""

    def test_pb062_manager_creates_task(self, client, manager_user, manager_token, dept):
        """PB062: Manager tạo task thành công"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task mới", "priority": "high"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["title"] == "Task mới"

    def test_pb062_staff_cannot_create_task(self, client, staff_user, staff_token):
        """PB062: Staff không tạo được task"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb063_empty_title_rejected(self, client, manager_user, manager_token):
        """PB063: tiêu đề rỗng bị từ chối"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "   "},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 422

    def test_pb063_missing_title_rejected(self, client, manager_user, manager_token):
        """PB063: thiếu tiêu đề → 422"""
        res = client.post(
            "/api/v1/tasks",
            json={"priority": "high"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 422

    def test_pb064_assign_to_own_dept_staff(self, client, db, manager_user, staff_user, manager_token):
        """PB064: giao task cho nhân viên trong phòng thành công"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task có assignee", "assignee_ids": [str(staff_user.id)]},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201

    def test_pb064_assign_to_other_dept_rejected(self, client, db, manager_user, org, manager_token):
        """PB064: giao task cho nhân viên phòng khác → 400"""
        other_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Khác"
        )
        db.add(other_dept)
        other_staff = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid.uuid4(), org_id=org.id, dept_id=other_dept.id,
            full_name="NV Khác", email="other_dept@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(other_staff)
        db.commit()

        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task", "assignee_ids": [str(other_staff.id)]},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 400

    def test_pb065_assign_multiple_staff(self, client, db, manager_user, staff_user, dept, org, manager_token):
        """PB065: giao task cho nhiều nhân viên cùng lúc"""
        staff2 = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="NV2", email="staff2@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(staff2)
        db.commit()

        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task nhiều người", "assignee_ids": [str(staff_user.id), str(staff2.id)]},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201

    def test_pb066_future_deadline_accepted(self, client, manager_user, manager_token):
        """PB066: deadline tương lai được chấp nhận"""
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task deadline", "deadline": future},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201

    def test_pb066_past_deadline_rejected(self, client, manager_user, manager_token):
        """PB066: deadline quá khứ → 422"""
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task past", "deadline": past},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 422

    def test_pb067_priority_values(self, client, manager_user, manager_token):
        """PB067: chỉ cho phép low/medium/high"""
        for priority in ["low", "medium", "high"]:
            res = client.post(
                "/api/v1/tasks",
                json={"title": f"Task {priority}", "priority": priority},
                headers=auth_header(manager_token["access"]),
            )
            assert res.status_code == 201

    def test_pb067_invalid_priority_rejected(self, client, manager_user, manager_token):
        """PB067: priority không hợp lệ → 422"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task", "priority": "urgent"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 422

    def test_pb068_default_status_todo(self, client, db, manager_user, manager_token):
        """PB068: task mới tạo có trạng thái todo"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task mặc định"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        task_id = res.json()["id"]
        task = db.query(Task).filter(Task.id == uuid.UUID(task_id)).first()
        assert task.status == "todo"

    def test_pb069_blocked_by_existing_task(self, client, db, task, manager_user, manager_token):
        """PB070: task phụ thuộc vào task đang tồn tại"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task phụ thuộc", "blocked_by_id": str(task.id)},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201

    def test_pb070_blocked_by_nonexistent_rejected(self, client, manager_user, manager_token):
        """PB070: blocked_by không tồn tại → 400"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task", "blocked_by_id": str(uuid.uuid4())},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 400

    def test_pb103_overload_warning(self, client, db, manager_user, staff_user, dept, manager_token):
        """PB103: cảnh báo nhân viên quá tải khi giao > 10 task"""
        # Tạo 10 task in_progress đã gán cho staff
        for i in range(10):
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {i}", status="in_progress", priority="medium", progress_pct=0,
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task thứ 11", "assignee_ids": [str(staff_user.id)]},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        assert "warning" in res.json()


class TestListAndKanban:
    """PB079-PB082"""

    def test_pb079_manager_list_dept_tasks(self, client, manager_user, task, manager_token):
        """PB079: Manager xem tất cả task trong phòng ban"""
        res = client.get("/api/v1/tasks", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        ids = [t["id"] for t in res.json()]
        assert str(task.id) in ids

    def test_pb080_staff_sees_only_assigned_tasks(
        self, client, db, task, task_with_assignee, staff_user, staff_token, manager_user, dept
    ):
        """PB080: Staff chỉ thấy task được giao"""
        # Task không giao cho staff này
        other_task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task không giao", status="todo", priority="low", progress_pct=0,
        )
        db.add(other_task)
        db.commit()

        res = client.get("/api/v1/tasks", headers=auth_header(staff_token["access"]))
        ids = [t["id"] for t in res.json()]
        assert str(task_with_assignee.id) in ids
        assert str(other_task.id) not in ids

    def test_pb081_kanban_has_3_columns(self, client, manager_user, manager_token):
        """PB081: Kanban trả về 3 cột todo/in_progress/done"""
        res = client.get("/api/v1/tasks/kanban", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "todo" in data
        assert "in_progress" in data
        assert "done" in data

    def test_pb082_kanban_columns_have_count(self, client, db, manager_user, task, manager_token):
        """PB082: mỗi cột Kanban có số lượng task"""
        res = client.get("/api/v1/tasks/kanban", headers=auth_header(manager_token["access"]))
        data = res.json()
        total = data["todo"]["count"] + data["in_progress"]["count"] + data["done"]["count"]
        assert total >= 1
        assert data["todo"]["count"] >= 1  # task vừa tạo ở todo

    def test_pb083_get_task_detail(self, client, task, manager_user, manager_token):
        """PB083: xem chi tiết một task"""
        res = client.get(f"/api/v1/tasks/{task.id}", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(task.id)
        assert "assignees" in data
        assert "checklists" in data
        assert "is_overdue" in data

    def test_pb083_staff_cannot_view_unassigned_task(
        self, client, task, staff_user, staff_token
    ):
        """PB083: Staff không xem được task không được giao"""
        res = client.get(f"/api/v1/tasks/{task.id}", headers=auth_header(staff_token["access"]))
        assert res.status_code == 403

    def test_pb083_staff_can_view_assigned_task(
        self, client, task_with_assignee, staff_user, staff_token
    ):
        """PB083: Staff xem được task được giao cho mình"""
        res = client.get(
            f"/api/v1/tasks/{task_with_assignee.id}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200


class TestTaskFiltersAndSort:
    """PB105, PB108-PB115"""

    def test_pb105_search_by_title(self, client, db, manager_user, dept, manager_token):
        """PB105: tìm task theo từ khóa tiêu đề"""
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Báo cáo tháng 12", status="todo", priority="high", progress_pct=0,
        )
        db.add(t)
        db.commit()

        res = client.get("/api/v1/tasks?search=Báo cáo", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert any(t["title"] == "Báo cáo tháng 12" for t in res.json())

    def test_pb108_filter_by_status(self, client, db, manager_user, task, dept, manager_token):
        """PB108: lọc theo trạng thái"""
        # Tạo task done
        t2 = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task done", status="done", priority="low", progress_pct=100,
        )
        db.add(t2)
        db.commit()

        res = client.get("/api/v1/tasks?status=done", headers=auth_header(manager_token["access"]))
        tasks = res.json()
        assert all(t["status"] == "done" for t in tasks)

    def test_pb110_filter_by_priority(self, client, db, manager_user, dept, manager_token):
        """PB110: lọc theo độ ưu tiên"""
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="High priority task", status="todo", priority="high", progress_pct=0,
        )
        db.add(t)
        db.commit()

        res = client.get("/api/v1/tasks?priority=high", headers=auth_header(manager_token["access"]))
        tasks = res.json()
        assert all(t["priority"] == "high" for t in tasks)

    def test_pb109_filter_by_assignee(self, client, task_with_assignee, staff_user, manager_user, manager_token):
        """PB109: lọc theo người thực hiện"""
        res = client.get(
            f"/api/v1/tasks?assignee_id={staff_user.id}",
            headers=auth_header(manager_token["access"]),
        )
        ids = [t["id"] for t in res.json()]
        assert str(task_with_assignee.id) in ids

    def test_pb115_overdue_filter(self, client, overdue_task, manager_user, manager_token):
        """PB115: lọc task quá hạn"""
        res = client.get(
            "/api/v1/tasks?overdue_only=true",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        tasks = res.json()
        assert any(t["id"] == str(overdue_task.id) for t in tasks)
        assert all(t["is_overdue"] for t in tasks)

    def test_pb114_sort_by_deadline(self, client, db, manager_user, dept, manager_token):
        """PB114: sắp xếp theo deadline tăng dần"""
        now = datetime.now(timezone.utc)
        for days in [5, 1, 3]:
            db.add(Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {days}d", status="todo", priority="medium", progress_pct=0,
                deadline=now + timedelta(days=days),
            ))
        db.commit()

        res = client.get(
            "/api/v1/tasks?sort_by=deadline&sort_dir=asc",
            headers=auth_header(manager_token["access"]),
        )
        tasks = [t for t in res.json() if t["deadline"]]
        deadlines = [t["deadline"] for t in tasks]
        assert deadlines == sorted(deadlines)


class TestEpic:
    """PB077, PB078"""

    def test_pb077_create_epic(self, client, manager_user, manager_token):
        """PB077: Manager tạo Epic"""
        res = client.post(
            "/api/v1/tasks/epics",
            json={"name": "Epic Q1 2025"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["name"] == "Epic Q1 2025"

    def test_pb077_staff_cannot_create_epic(self, client, staff_user, staff_token):
        """PB077: Staff không tạo được Epic"""
        res = client.post(
            "/api/v1/tasks/epics",
            json={"name": "Epic"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb078_epic_shows_progress(self, client, db, epic, manager_user, staff_user, dept, manager_token):
        """PB078: Epic hiển thị tiến độ task"""
        # Tạo 2 task trong epic: 1 done, 1 todo
        t1 = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="T1", status="done", priority="low", progress_pct=100, epic_id=epic.id,
        )
        t2 = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="T2", status="todo", priority="low", progress_pct=0, epic_id=epic.id,
        )
        db.add_all([t1, t2])
        db.commit()

        res = client.get("/api/v1/tasks/epics", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        test_epic = next((e for e in res.json() if e["id"] == str(epic.id)), None)
        assert test_epic is not None
        assert test_epic["task_count"] == 2
        assert test_epic["done_count"] == 1
        assert test_epic["progress_pct"] == 50.0
