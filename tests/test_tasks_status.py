"""
Test trạng thái task — PB084 đến PB097
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee, TaskHistory


class TestStatusTransitions:
    """PB084-PB086"""

    def test_pb084_todo_to_in_progress(
        self, client, db, task_with_assignee, staff_user, staff_token
    ):
        """PB084: chuyển todo → in_progress"""
        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "in_progress"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(task_with_assignee)
        assert task_with_assignee.status == "in_progress"

    def test_pb084_in_progress_to_done(
        self, client, db, task_with_assignee, staff_user, staff_token
    ):
        """PB084: chuyển in_progress → done"""
        task_with_assignee.status = "in_progress"
        db.commit()

        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "done"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(task_with_assignee)
        assert task_with_assignee.status == "done"

    def test_pb084_invalid_status_rejected(
        self, client, task_with_assignee, staff_token
    ):
        """PB084: trạng thái không hợp lệ → 422"""
        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "pending"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 422

    def test_pb084_unassigned_staff_cannot_update_status(
        self, client, task, staff_user, staff_token
    ):
        """PB084: Staff không được giao task không cập nhật được status"""
        res = client.patch(
            f"/api/v1/tasks/{task.id}/status",
            json={"status": "in_progress"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb085_progress_update(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB085: cập nhật % hoàn thành"""
        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/progress",
            json={"progress_pct": 60},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(task_with_assignee)
        assert task_with_assignee.progress_pct == 60

    def test_pb085_progress_100_auto_done(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB085: progress = 100 tự động chuyển sang done"""
        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/progress",
            json={"progress_pct": 100},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(task_with_assignee)
        assert task_with_assignee.status == "done"
        assert task_with_assignee.completed_at is not None

    def test_pb085_invalid_progress_rejected(
        self, client, task_with_assignee, staff_token
    ):
        """PB085: % ngoài 0-100 bị từ chối"""
        for bad in [-1, 101, 150]:
            res = client.patch(
                f"/api/v1/tasks/{task_with_assignee.id}/progress",
                json={"progress_pct": bad},
                headers=auth_header(staff_token["access"]),
            )
            assert res.status_code == 422, f"pct={bad} should be rejected"

    def test_pb086_done_records_completed_at(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB086: hoàn thành task ghi nhận thời điểm"""
        assert task_with_assignee.completed_at is None

        client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "done"},
            headers=auth_header(staff_token["access"]),
        )
        db.refresh(task_with_assignee)
        assert task_with_assignee.completed_at is not None


class TestComments:
    """PB087-PB091"""

    def test_pb087_first_comment_triggers_in_progress(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB087: comment đầu tiên tự động chuyển todo → in_progress"""
        assert task_with_assignee.status == "todo"

        client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Bắt đầu làm rồi"},
            headers=auth_header(staff_token["access"]),
        )
        db.refresh(task_with_assignee)
        assert task_with_assignee.status == "in_progress"

    def test_pb087_second_comment_no_transition(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB087: comment thứ 2 trở đi không thay đổi trạng thái"""
        task_with_assignee.status = "in_progress"
        db.commit()

        client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Comment 2"},
            headers=auth_header(staff_token["access"]),
        )
        db.refresh(task_with_assignee)
        assert task_with_assignee.status == "in_progress"

    def test_pb088_add_comment_success(
        self, client, task_with_assignee, staff_user, staff_token
    ):
        """PB088: thêm comment thành công"""
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Đang làm bước 1"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 201
        data = res.json()
        assert data["content"] == "Đang làm bước 1"
        assert data["user_id"] == str(staff_user.id)
        assert data["full_name"] == "Staff Test"

    def test_pb088_unassigned_cannot_comment(
        self, client, task, staff_user, staff_token
    ):
        """PB088: Staff không được giao task không comment được"""
        res = client.post(
            f"/api/v1/tasks/{task.id}/comments",
            json={"content": "Tôi không được giao task này"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb090_manager_views_comments(
        self, client, db, task_with_assignee, staff_user, staff_token, manager_token
    ):
        """PB090: Manager xem ghi chú của nhân viên"""
        # Staff thêm comment
        client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Đã xong bước 1"},
            headers=auth_header(staff_token["access"]),
        )

        # Manager đọc comment
        res = client.get(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        comments = res.json()
        assert len(comments) >= 1
        assert comments[0]["content"] == "Đã xong bước 1"

    def test_pb091_reply_to_comment(
        self, client, db, task_with_assignee, staff_token, manager_token
    ):
        """PB091: reply comment tạo thread"""
        # Tạo comment gốc
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Comment gốc"},
            headers=auth_header(staff_token["access"]),
        )
        parent_id = res.json()["id"]

        # Reply
        res2 = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/comments",
            json={"content": "Reply này", "parent_id": parent_id},
            headers=auth_header(manager_token["access"]),
        )
        assert res2.status_code == 201
        assert res2.json()["parent_id"] == parent_id


class TestAttachments:
    """PB069, PB089"""

    def test_pb069_add_attachment(
        self, client, task_with_assignee, staff_token
    ):
        """PB069: đính kèm file thành công"""
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/attachments"
            "?file_url=https://s3.example.com/file.pdf&file_name=report.pdf&file_size=1024000",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["file_name"] == "report.pdf"

    def test_pb069_max_5_attachments(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB069: tối đa 5 file/task"""
        from app.models.task import TaskAttachment
        for i in range(5):
            db.add(TaskAttachment(
                id=uuid.uuid4(), task_id=task_with_assignee.id,
                uploaded_by=uuid.uuid4(), file_url=f"https://s3.example.com/f{i}.pdf",
                file_name=f"f{i}.pdf", file_size=1000,
            ))
        db.commit()

        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/attachments"
            "?file_url=https://s3.example.com/f6.pdf&file_name=f6.pdf&file_size=500",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 400
        assert "5 file" in res.json()["detail"]

    def test_pb069_max_10mb(
        self, client, task_with_assignee, staff_token
    ):
        """PB069: file > 10MB bị từ chối"""
        big_size = 11 * 1024 * 1024  # 11MB
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/attachments"
            f"?file_url=https://s3.example.com/big.zip&file_name=big.zip&file_size={big_size}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 400
        assert "10MB" in res.json()["detail"]


class TestChecklist:
    """PB071, PB072"""

    def test_pb071_add_checklist_item(
        self, client, task_with_assignee, staff_token
    ):
        """PB071: thêm checklist item"""
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/checklists",
            json={"content": "Viết unit test", "position": 1},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["content"] == "Viết unit test"
        assert res.json()["is_done"] == False

    def test_pb071_check_item_done(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB071: đánh dấu checklist item hoàn thành"""
        from app.models.task import TaskChecklist
        item = TaskChecklist(
            id=uuid.uuid4(), task_id=task_with_assignee.id,
            content="Bước 1", position=1,
        )
        db.add(item)
        db.commit()

        res = client.patch(
            f"/api/v1/tasks/checklists/{item.id}",
            json={"is_done": True},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["is_done"] == True

    def test_pb072_checklist_auto_update_progress(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB072: tick checklist tự cập nhật % progress"""
        from app.models.task import TaskChecklist

        items = []
        for i in range(4):
            item = TaskChecklist(
                id=uuid.uuid4(), task_id=task_with_assignee.id,
                content=f"Bước {i+1}", position=i, is_done=False,
            )
            db.add(item)
            items.append(item)
        db.commit()

        # Tick 1 trong 4 item → 25%
        client.patch(
            f"/api/v1/tasks/checklists/{items[0].id}",
            json={"is_done": True},
            headers=auth_header(staff_token["access"]),
        )
        db.refresh(task_with_assignee)
        assert task_with_assignee.progress_pct == 25


class TestUpdateTask:
    """PB094-PB097"""

    def test_pb094_manager_updates_task(
        self, client, task, manager_user, manager_token
    ):
        """PB094: Manager cập nhật thông tin task"""
        res = client.patch(
            f"/api/v1/tasks/{task.id}",
            json={"title": "Tiêu đề mới", "priority": "high"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["title"] == "Tiêu đề mới"
        assert res.json()["priority"] == "high"

    def test_pb094_staff_cannot_update_task(
        self, client, task_with_assignee, staff_token
    ):
        """PB094: Staff không cập nhật được thông tin task"""
        res = client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}",
            json={"title": "Đổi tên"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb095_deadline_change_logged(
        self, client, db, task, manager_user, manager_token
    ):
        """PB095: thay đổi deadline ghi vào history kèm lý do"""
        new_deadline = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        client.patch(
            f"/api/v1/tasks/{task.id}",
            json={
                "deadline": new_deadline,
                "deadline_change_reason": "Khách hàng yêu cầu thêm thời gian",
            },
            headers=auth_header(manager_token["access"]),
        )

        history = db.query(TaskHistory).filter(
            TaskHistory.task_id == task.id,
            TaskHistory.field == "deadline",
        ).first()
        assert history is not None
        assert "Khách hàng" in history.note

    def test_pb096_reassign_task(
        self, client, db, task, staff_user, manager_user, manager_token
    ):
        """PB096: thay đổi người thực hiện"""
        res = client.patch(
            f"/api/v1/tasks/{task.id}",
            json={"assignee_ids": [str(staff_user.id)]},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assignees = db.query(TaskAssignee).filter(TaskAssignee.task_id == task.id).all()
        assert any(a.user_id == staff_user.id for a in assignees)

    def test_pb097_cancel_task(
        self, client, db, task, manager_user, manager_token
    ):
        """PB097: hủy task kèm lý do"""
        res = client.post(
            f"/api/v1/tasks/{task.id}/cancel",
            json={"reason": "Dự án bị dừng do ngân sách"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(task)
        assert task.status == "cancelled"
        assert task.cancel_reason == "Dự án bị dừng do ngân sách"
        assert task.cancelled_at is not None

    def test_pb097_staff_cannot_cancel_task(
        self, client, task_with_assignee, staff_token
    ):
        """PB097: Staff không hủy được task"""
        res = client.post(
            f"/api/v1/tasks/{task_with_assignee.id}/cancel",
            json={"reason": "Tôi muốn hủy"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403


class TestHistory:
    """PB092"""

    def test_pb092_status_change_logged(
        self, client, db, task_with_assignee, staff_token
    ):
        """PB092: thay đổi status ghi vào lịch sử"""
        client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "in_progress"},
            headers=auth_header(staff_token["access"]),
        )
        history = db.query(TaskHistory).filter(
            TaskHistory.task_id == task_with_assignee.id,
            TaskHistory.field == "status",
        ).first()
        assert history is not None
        assert history.old_value == "todo"
        assert history.new_value == "in_progress"

    def test_pb092_task_creation_logged(
        self, client, db, manager_user, manager_token
    ):
        """PB092: tạo task ghi log"""
        res = client.post(
            "/api/v1/tasks",
            json={"title": "Task có history"},
            headers=auth_header(manager_token["access"]),
        )
        task_id = uuid.UUID(res.json()["id"])
        history = db.query(TaskHistory).filter(
            TaskHistory.task_id == task_id,
            TaskHistory.field == "created",
        ).first()
        assert history is not None

    def test_pb092_history_visible_in_detail(
        self, client, db, task_with_assignee, staff_token, manager_token
    ):
        """PB092: lịch sử hiển thị trong chi tiết task"""
        # Cập nhật status để tạo history
        client.patch(
            f"/api/v1/tasks/{task_with_assignee.id}/status",
            json={"status": "in_progress"},
            headers=auth_header(staff_token["access"]),
        )
        res = client.get(
            f"/api/v1/tasks/{task_with_assignee.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert "history" in res.json()
        assert len(res.json()["history"]) >= 1
