"""
Unit test thuần cho task schemas, validators, computed fields
Không cần database — chạy cực nhanh
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    TaskProgressUpdate, ChecklistCreate, CommentCreate,
    ExtensionRequestCreate,
)


class TestTaskCreateSchema:
    def test_valid_task(self):
        future = datetime.now(timezone.utc) + timedelta(days=5)
        t = TaskCreate(title="Valid task", priority="high", deadline=future)
        assert t.title == "Valid task"

    def test_empty_title_fails(self):
        with pytest.raises(Exception):
            TaskCreate(title="")

    def test_whitespace_title_fails(self):
        with pytest.raises(Exception):
            TaskCreate(title="   ")

    def test_title_stripped(self):
        t = TaskCreate(title="  Task name  ")
        assert t.title == "Task name"

    def test_invalid_priority(self):
        with pytest.raises(Exception):
            TaskCreate(title="Task", priority="critical")

    def test_valid_priorities(self):
        for p in ["low", "medium", "high"]:
            t = TaskCreate(title="Task", priority=p)
            assert t.priority == p

    def test_past_deadline_fails(self):
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        with pytest.raises(Exception):
            TaskCreate(title="Task", deadline=past)

    def test_no_deadline_accepted(self):
        t = TaskCreate(title="Task no deadline")
        assert t.deadline is None

    def test_default_priority_medium(self):
        t = TaskCreate(title="Task")
        assert t.priority == "medium"

    def test_default_not_recurring(self):
        t = TaskCreate(title="Task")
        assert t.is_recurring == False

    def test_empty_assignees_default(self):
        t = TaskCreate(title="Task")
        assert t.assignee_ids == []


class TestStatusUpdateSchema:
    def test_valid_statuses(self):
        for s in ["todo", "in_progress", "done", "cancelled"]:
            su = TaskStatusUpdate(status=s)
            assert su.status == s

    def test_invalid_status(self):
        with pytest.raises(Exception):
            TaskStatusUpdate(status="pending")

    def test_invalid_status_uppercase(self):
        with pytest.raises(Exception):
            TaskStatusUpdate(status="DONE")


class TestProgressUpdateSchema:
    def test_valid_progress(self):
        for pct in [0, 25, 50, 75, 100]:
            pu = TaskProgressUpdate(progress_pct=pct)
            assert pu.progress_pct == pct

    def test_negative_progress(self):
        with pytest.raises(Exception):
            TaskProgressUpdate(progress_pct=-1)

    def test_over_100_progress(self):
        with pytest.raises(Exception):
            TaskProgressUpdate(progress_pct=101)


class TestExtensionRequestSchema:
    def test_valid_extension_request(self):
        future = datetime.now(timezone.utc) + timedelta(days=7)
        req = ExtensionRequestCreate(proposed_deadline=future, reason="Cần thêm thời gian")
        assert req.reason == "Cần thêm thời gian"

    def test_missing_reason_fails(self):
        future = datetime.now(timezone.utc) + timedelta(days=7)
        with pytest.raises(Exception):
            ExtensionRequestCreate(proposed_deadline=future)

    def test_missing_deadline_fails(self):
        with pytest.raises(Exception):
            ExtensionRequestCreate(reason="Lý do")


class TestCommentSchema:
    def test_valid_comment(self):
        c = CommentCreate(content="Bình luận test")
        assert c.content == "Bình luận test"
        assert c.parent_id is None

    def test_reply_comment(self):
        parent = uuid.uuid4()
        c = CommentCreate(content="Reply", parent_id=parent)
        assert c.parent_id == parent


class TestOverdueLogic:
    """Unit test cho logic tính overdue"""

    def _make_task_dict(self, deadline_offset_days: int, status: str) -> dict:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        deadline = now + timedelta(days=deadline_offset_days)
        return {"deadline": deadline, "status": status}

    def test_past_deadline_in_progress_is_overdue(self):
        task = self._make_task_dict(-1, "in_progress")
        now = datetime.now(timezone.utc)
        is_overdue = (
            task["deadline"] < now
            and task["status"] not in ("done", "cancelled")
        )
        assert is_overdue == True

    def test_future_deadline_not_overdue(self):
        task = self._make_task_dict(3, "in_progress")
        now = datetime.now(timezone.utc)
        is_overdue = (
            task["deadline"] < now
            and task["status"] not in ("done", "cancelled")
        )
        assert is_overdue == False

    def test_done_task_past_deadline_not_overdue(self):
        task = self._make_task_dict(-2, "done")
        now = datetime.now(timezone.utc)
        is_overdue = (
            task["deadline"] < now
            and task["status"] not in ("done", "cancelled")
        )
        assert is_overdue == False

    def test_cancelled_task_not_overdue(self):
        task = self._make_task_dict(-5, "cancelled")
        now = datetime.now(timezone.utc)
        is_overdue = (
            task["deadline"] < now
            and task["status"] not in ("done", "cancelled")
        )
        assert is_overdue == False

    def test_no_deadline_not_overdue(self):
        task = {"deadline": None, "status": "in_progress"}
        is_overdue = (
            task["deadline"] is not None
            and task["deadline"] < datetime.now(timezone.utc)
            and task["status"] not in ("done", "cancelled")
        )
        assert is_overdue == False


class TestKanbanGrouping:
    """Unit test grouping logic cho Kanban"""

    def _group_tasks(self, tasks: list) -> dict:
        columns = {"todo": [], "in_progress": [], "done": []}
        for t in tasks:
            s = t["status"]
            if s in columns:
                columns[s].append(t)
        return {
            status: {"status": status, "count": len(items), "tasks": items}
            for status, items in columns.items()
        }

    def test_empty_tasks(self):
        result = self._group_tasks([])
        assert result["todo"]["count"] == 0
        assert result["in_progress"]["count"] == 0
        assert result["done"]["count"] == 0

    def test_single_todo(self):
        tasks = [{"id": "1", "status": "todo", "title": "T"}]
        result = self._group_tasks(tasks)
        assert result["todo"]["count"] == 1

    def test_mixed_tasks(self):
        tasks = [
            {"id": "1", "status": "todo"},
            {"id": "2", "status": "todo"},
            {"id": "3", "status": "in_progress"},
            {"id": "4", "status": "done"},
        ]
        result = self._group_tasks(tasks)
        assert result["todo"]["count"] == 2
        assert result["in_progress"]["count"] == 1
        assert result["done"]["count"] == 1

    def test_cancelled_excluded_from_kanban(self):
        tasks = [
            {"id": "1", "status": "todo"},
            {"id": "2", "status": "cancelled"},  # không vào cột nào
        ]
        result = self._group_tasks(tasks)
        total = result["todo"]["count"] + result["in_progress"]["count"] + result["done"]["count"]
        assert total == 1
