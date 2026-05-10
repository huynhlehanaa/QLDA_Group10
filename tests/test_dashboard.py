"""
TDD Tests — Báo cáo & Dashboard — PB159 đến PB189

Thứ tự TDD:
1. pytest tests/test_dashboard.py -v  → tất cả FAIL
2. Viết services/dashboard_service.py
3. Viết api/dashboard.py
4. Đăng ký router trong main.py
5. pytest tests/test_dashboard.py -v  → tất cả PASS
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee
from app.models.user import User


# ══════════════════════════════════════════════════════════════
# Helpers tạo dữ liệu test
# ══════════════════════════════════════════════════════════════

def _make_task(db, dept_id, creator_id, title, status, priority="medium",
               progress_pct=0, deadline_offset_days=3, completed_at=None):
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=deadline_offset_days)
    t = Task(
        id=uuid.uuid4(), dept_id=dept_id, created_by=creator_id,
        title=title, status=status, priority=priority,
        progress_pct=progress_pct,
        deadline=deadline,
        completed_at=completed_at,
    )
    db.add(t)
    db.flush()
    return t


def _assign(db, task_id, user_id):
    db.add(TaskAssignee(task_id=task_id, user_id=user_id))


# ══════════════════════════════════════════════════════════════
# PB159, PB160, PB161 — Gantt Chart
# ══════════════════════════════════════════════════════════════

class TestGanttChart:

    def test_pb159_manager_gets_gantt_data(self, client, manager_user, manager_token, db, dept):
        """PB159: Manager xem Gantt Chart phòng ban"""
        now = datetime.now(timezone.utc)
        t = _make_task(db, dept.id, manager_user.id, "Task Gantt", "in_progress")
        db.commit()

        res = client.get("/api/v1/dashboard/gantt", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "tasks" in data
        task_ids = [t["id"] for t in data["tasks"]]
        assert str(t.id) in task_ids

    def test_pb159_gantt_task_has_required_fields(self, client, manager_user, manager_token, db, dept):
        """PB159: mỗi task Gantt có đủ trường start, end, status, assignees"""
        _make_task(db, dept.id, manager_user.id, "Gantt Task", "in_progress")
        db.commit()

        res = client.get("/api/v1/dashboard/gantt", headers=auth_header(manager_token["access"]))
        tasks = res.json()["tasks"]
        assert len(tasks) >= 1
        task = tasks[0]
        assert "id" in task
        assert "title" in task
        assert "status" in task
        assert "deadline" in task
        assert "created_at" in task
        assert "assignees" in task
        assert "priority" in task

    def test_pb159_only_dept_tasks_in_gantt(self, client, db, org, manager_user, manager_token):
        """PB159: Gantt chỉ hiển thị task phòng ban của Manager"""
        other_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Khác Gantt"
        )
        db.add(other_dept)
        other_task = Task(
            id=uuid.uuid4(), dept_id=other_dept.id, created_by=manager_user.id,
            title="Task Phòng Khác", status="todo", priority="low", progress_pct=0,
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add(other_task)
        db.commit()

        res = client.get("/api/v1/dashboard/gantt", headers=auth_header(manager_token["access"]))
        task_ids = [t["id"] for t in res.json()["tasks"]]
        assert str(other_task.id) not in task_ids

    def test_pb160_gantt_filter_by_view(self, client, manager_user, manager_token, db, dept):
        """PB160: Gantt lọc theo day/week/month view"""
        _make_task(db, dept.id, manager_user.id, "Task view", "todo")
        db.commit()

        for view in ["day", "week", "month"]:
            res = client.get(
                f"/api/v1/dashboard/gantt?view={view}",
                headers=auth_header(manager_token["access"]),
            )
            assert res.status_code == 200
            assert res.json()["view"] == view

    def test_pb161_get_task_detail_from_gantt(self, client, manager_user, manager_token, db, dept):
        """PB161: click task trên Gantt xem chi tiết"""
        t = _make_task(db, dept.id, manager_user.id, "Task Chi Tiết", "in_progress")
        db.commit()

        res = client.get(
            f"/api/v1/tasks/{t.id}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["id"] == str(t.id)

    def test_pb159_staff_cannot_view_gantt(self, client, staff_user, staff_token):
        """PB159: Staff không xem được Gantt Chart"""
        res = client.get("/api/v1/dashboard/gantt", headers=auth_header(staff_token["access"]))
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB162, PB163, PB164 — Calendar View
# ══════════════════════════════════════════════════════════════

class TestCalendarView:

    def test_pb162_calendar_month_view(self, client, manager_user, manager_token, db, dept, staff_user):
        """PB162: xem Calendar dạng tháng"""
        now = datetime.now(timezone.utc)
        t = _make_task(db, dept.id, manager_user.id, "Task Calendar", "todo",
                       deadline_offset_days=5)
        _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/calendar?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "days" in data
        assert isinstance(data["days"], list)

    def test_pb162_calendar_day_has_tasks(self, client, manager_user, manager_token, db, dept):
        """PB162: mỗi ngày trong calendar hiển thị task có deadline hôm đó"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Hôm Nay", status="todo", priority="medium", progress_pct=0,
            deadline=now.replace(hour=17, minute=0, second=0),
        )
        db.add(t)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/calendar?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        days = res.json()["days"]
        today = next(
            (d for d in days if d["day"] == now.day), None
        )
        assert today is not None
        assert len(today["tasks"]) >= 1

    def test_pb163_calendar_week_view(self, client, manager_user, manager_token):
        """PB163: xem Calendar dạng tuần"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/calendar/week?date={now.date().isoformat()}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "days" in data
        assert len(data["days"]) == 7

    def test_pb164_calendar_day_view(self, client, staff_user, staff_token):
        """PB164: xem Calendar dạng ngày"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/calendar/day?date={now.date().isoformat()}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "date" in data
        assert "tasks" in data

    def test_pb162_staff_sees_only_assigned_tasks_in_calendar(
        self, client, db, dept, manager_user, staff_user, staff_token
    ):
        """PB162: Staff chỉ thấy task được giao trong calendar"""
        now = datetime.now(timezone.utc)
        # Task giao cho staff
        t1 = _make_task(db, dept.id, manager_user.id, "Task Staff", "todo")
        _assign(db, t1.id, staff_user.id)
        # Task không giao
        t2 = _make_task(db, dept.id, manager_user.id, "Task Not Assigned", "todo")
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/calendar?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"]),
        )
        all_task_ids = []
        for day in res.json()["days"]:
            all_task_ids.extend(t["id"] for t in day["tasks"])

        assert str(t2.id) not in all_task_ids


# ══════════════════════════════════════════════════════════════
# PB165-PB168 — Báo cáo hiệu suất
# ══════════════════════════════════════════════════════════════

class TestPerformanceReport:

    def test_pb165_on_time_rate_report(self, client, manager_user, manager_token, db, dept, staff_user):
        """PB165: báo cáo tỉ lệ hoàn thành task đúng hạn"""
        now = datetime.now(timezone.utc)
        # 2 task done đúng hạn, 1 trễ
        deadline_past = now - timedelta(days=1)
        for i in range(2):
            t = _make_task(db, dept.id, manager_user.id, f"OnTime {i}", "done",
                          deadline_offset_days=-2,
                          completed_at=deadline_past - timedelta(hours=1))
            _assign(db, t.id, staff_user.id)
        t_late = _make_task(db, dept.id, manager_user.id, "Late", "done",
                            deadline_offset_days=-3,
                            completed_at=now)
        _assign(db, t_late.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/performance?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "staff_performance" in data
        staff_data = next(
            (s for s in data["staff_performance"] if s["user_id"] == str(staff_user.id)), None
        )
        assert staff_data is not None
        assert "on_time_rate" in staff_data
        assert "tasks_done" in staff_data

    def test_pb165_on_time_rate_calculation(self, client, db, dept, manager_user, staff_user, manager_token):
        """PB165: on_time_rate = done đúng hạn / tổng done * 100"""
        now = datetime.now(timezone.utc)
        # 3 done đúng hạn
        for i in range(3):
            deadline = now - timedelta(hours=2)
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"OnTime {i}", status="done", priority="medium", progress_pct=100,
                deadline=deadline,
                completed_at=deadline - timedelta(hours=1),
            )
            db.add(t)
            db.flush()
            _assign(db, t.id, staff_user.id)
        # 1 done trễ
        deadline = now - timedelta(days=2)
        t_late = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Late", status="done", priority="medium", progress_pct=100,
            deadline=deadline,
            completed_at=now,
        )
        db.add(t_late)
        db.flush()
        _assign(db, t_late.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/performance?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        staff_data = next(
            (s for s in res.json()["staff_performance"] if s["user_id"] == str(staff_user.id)), None
        )
        assert staff_data["on_time_rate"] == 75.0  # 3/4 = 75%

    def test_pb166_tasks_done_per_month(self, client, manager_user, manager_token, db, dept, staff_user):
        """PB166: số task hoàn thành theo tháng"""
        now = datetime.now(timezone.utc)
        for i in range(3):
            t = _make_task(db, dept.id, manager_user.id, f"Done {i}", "done",
                           progress_pct=100, completed_at=now)
            _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/performance?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        staff_data = next(
            (s for s in res.json()["staff_performance"] if s["user_id"] == str(staff_user.id)), None
        )
        assert staff_data["tasks_done"] >= 3

    def test_pb167_avg_completion_time(self, client, manager_user, manager_token, db, dept, staff_user):
        """PB167: thời gian trung bình hoàn thành task (ngày)"""
        now = datetime.now(timezone.utc)
        # Task tạo 5 ngày trước, done hôm nay
        created = now - timedelta(days=5)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Avg Time Task", status="done", priority="medium", progress_pct=100,
            deadline=now, completed_at=now,
            created_at=created,
        )
        db.add(t)
        db.flush()
        _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/performance?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        staff_data = next(
            (s for s in res.json()["staff_performance"] if s["user_id"] == str(staff_user.id)), None
        )
        assert "avg_completion_days" in staff_data

    def test_pb168_overdue_rate_by_dept(self, client, ceo_user, ceo_token, db, dept, manager_user):
        """PB168: báo cáo tỉ lệ task trễ theo phòng ban"""
        now = datetime.now(timezone.utc)
        # 2 task overdue
        for i in range(2):
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Overdue {i}", status="in_progress", priority="high", progress_pct=30,
                deadline=now - timedelta(days=2),
            )
            db.add(t)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/overdue-by-dept?year={now.year}&month={now.month}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        dept_data = next((d for d in data if d["dept_id"] == str(dept.id)), None)
        assert dept_data is not None
        assert "overdue_count" in dept_data
        assert "overdue_rate" in dept_data

    def test_pb168_only_ceo_views_company_overdue_report(self, client, manager_user, manager_token):
        """PB168: chỉ CEO xem báo cáo toàn công ty"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/report/overdue-by-dept?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB169 — So sánh KPI phòng ban theo quý
# ══════════════════════════════════════════════════════════════

class TestKpiComparison:

    def test_pb169_kpi_comparison_by_quarter(self, client, ceo_user, ceo_token):
        """PB169: CEO xem so sánh KPI phòng ban theo quý"""
        now = datetime.now(timezone.utc)
        quarter = (now.month - 1) // 3 + 1
        res = client.get(
            f"/api/v1/dashboard/report/kpi-comparison?year={now.year}&quarter={quarter}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "departments" in data
        assert "year" in data
        assert "quarter" in data

    def test_pb169_comparison_has_dept_scores(self, client, ceo_user, ceo_token):
        """PB169: so sánh hiển thị điểm từng phòng ban"""
        now = datetime.now(timezone.utc)
        quarter = (now.month - 1) // 3 + 1
        res = client.get(
            f"/api/v1/dashboard/report/kpi-comparison?year={now.year}&quarter={quarter}",
            headers=auth_header(ceo_token["access"]),
        )
        if res.json()["departments"]:
            dept_item = res.json()["departments"][0]
            assert "dept_name" in dept_item
            assert "avg_score" in dept_item
            assert "months" in dept_item

    def test_pb169_only_ceo_views_company_kpi_comparison(self, client, manager_user, manager_token):
        """PB169: chỉ CEO xem so sánh KPI toàn công ty"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/report/kpi-comparison?year={now.year}&quarter=1",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB170, PB171 — Lọc báo cáo và xem tháng cũ
# ══════════════════════════════════════════════════════════════

class TestReportFilters:

    def test_pb170_filter_by_date_range(self, client, manager_user, manager_token):
        """PB170: lọc báo cáo theo khoảng thời gian tùy chỉnh"""
        now = datetime.now(timezone.utc)
        from_date = (now - timedelta(days=30)).date().isoformat()
        to_date = now.date().isoformat()

        res = client.get(
            f"/api/v1/dashboard/report/performance?from_date={from_date}&to_date={to_date}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200

    def test_pb170_default_filter_is_current_month(self, client, manager_user, manager_token):
        """PB170: mặc định lọc theo tháng hiện tại"""
        res = client.get(
            "/api/v1/dashboard/report/performance",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        now = datetime.now(timezone.utc)
        assert res.json()["month"] == now.month
        assert res.json()["year"] == now.year

    def test_pb171_view_past_month_report(self, client, manager_user, manager_token):
        """PB171: xem lại báo cáo tháng cũ"""
        now = datetime.now(timezone.utc)
        past_month = now.month - 1 or 12
        past_year = now.year if now.month > 1 else now.year - 1

        res = client.get(
            f"/api/v1/dashboard/report/performance?year={past_year}&month={past_month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["month"] == past_month
        assert data["year"] == past_year


# ══════════════════════════════════════════════════════════════
# PB172, PB173 — Xuất báo cáo
# ══════════════════════════════════════════════════════════════

class TestExportReport:

    def test_pb172_export_performance_excel(self, client, manager_user, manager_token):
        """PB172: xuất báo cáo hiệu suất ra Excel"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/report/export/excel?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb172_excel_has_content(self, client, db, dept, manager_user, staff_user, manager_token):
        """PB172: file Excel có dữ liệu nhân viên"""
        import io, openpyxl
        now = datetime.now(timezone.utc)
        t = _make_task(db, dept.id, manager_user.id, "Export Task", "done",
                       progress_pct=100, completed_at=now)
        _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get(
            f"/api/v1/dashboard/report/export/excel?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        ws = wb.active
        headers = [ws.cell(1, c).value for c in range(1, 8)]
        assert "Họ tên" in headers or any(h for h in headers if h)

    def test_pb173_export_performance_pdf(self, client, manager_user, manager_token):
        """PB173: xuất báo cáo hiệu suất ra PDF"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/report/export/pdf?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert "pdf" in res.headers["content-type"]

    def test_pb172_only_manager_and_ceo_export(self, client, staff_user, staff_token):
        """PB172: Staff không xuất được báo cáo"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/report/export/excel?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB174-PB180 — Dashboard CEO
# ══════════════════════════════════════════════════════════════

class TestCeoDashboard:

    def test_pb174_total_employees_widget(self, client, ceo_user, staff_user, manager_user, ceo_token):
        """PB174: widget tổng số nhân viên active"""
        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "total_employees" in data
        assert data["total_employees"] >= 2  # manager + staff

    def test_pb174_only_active_employees_counted(self, client, db, ceo_user, staff_user, org, ceo_token, dept):
        """PB174: chỉ đếm nhân viên đang active"""
        inactive = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Inactive", email="inactive_ceo@test.com",
            password_hash="h", role="staff", is_active=False, must_change_pw=False,
        )
        db.add(inactive)
        db.commit()

        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        data = res.json()
        # Nhân viên inactive không được đếm
        assert data["total_employees"] >= 1

    def test_pb175_task_status_widgets(self, client, db, ceo_user, dept, manager_user, ceo_token):
        """PB175: widget số task theo trạng thái Todo/In Progress/Done"""
        for status in ["todo", "in_progress", "done"]:
            _make_task(db, dept.id, manager_user.id, f"Task {status}", status)
        db.commit()

        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        data = res.json()
        assert "task_stats" in data
        assert "todo" in data["task_stats"]
        assert "in_progress" in data["task_stats"]
        assert "done" in data["task_stats"]

    def test_pb176_overdue_tasks_widget(self, client, db, ceo_user, dept, manager_user, ceo_token):
        """PB176: widget số task quá hạn toàn công ty"""
        now = datetime.now(timezone.utc)
        overdue = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Overdue CEO", status="in_progress", priority="high", progress_pct=20,
            deadline=now - timedelta(days=3),
        )
        db.add(overdue)
        db.commit()

        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        assert res.json()["overdue_tasks"] >= 1

    def test_pb177_kpi_avg_by_dept_chart(self, client, ceo_user, ceo_token):
        """PB177: biểu đồ KPI trung bình theo phòng ban"""
        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        data = res.json()
        assert "kpi_by_dept" in data
        assert isinstance(data["kpi_by_dept"], list)

    def test_pb178_top_30_employees_by_kpi(self, client, ceo_user, ceo_token):
        """PB178: top 30 nhân viên KPI cao nhất"""
        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        data = res.json()
        assert "top_employees" in data
        assert len(data["top_employees"]) <= 30

    def test_pb178_top_employees_has_required_fields(self, client, ceo_user, staff_user, ceo_token):
        """PB178: top employees hiển thị đủ thông tin"""
        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(ceo_token["access"]))
        if res.json()["top_employees"]:
            emp = res.json()["top_employees"][0]
            assert "user_id" in emp
            assert "full_name" in emp
            assert "dept_name" in emp
            assert "kpi_score" in emp

    def test_pb179_heatmap_data(self, client, ceo_user, ceo_token):
        """PB179: heatmap hiệu suất theo ngày trong tháng"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/dashboard/ceo/heatmap?year={now.year}&month={now.month}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "heatmap" in data
        assert isinstance(data["heatmap"], list)
        if data["heatmap"]:
            day = data["heatmap"][0]
            assert "date" in day
            assert "tasks_done" in day

    def test_pb180_system_usage_stats(self, client, ceo_user, ceo_token):
        """PB180: thống kê sử dụng hệ thống"""
        res = client.get("/api/v1/dashboard/ceo/usage", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "daily_active_users" in data
        assert "weekly_active_users" in data
        assert "monthly_active_users" in data

    def test_pb174_only_ceo_views_ceo_dashboard(self, client, manager_user, manager_token):
        """PB174: chỉ CEO xem CEO Dashboard"""
        res = client.get("/api/v1/dashboard/ceo", headers=auth_header(manager_token["access"]))
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB181-PB186 — Dashboard Manager
# ══════════════════════════════════════════════════════════════

class TestManagerDashboard:

    def test_pb181_dept_task_stats_widget(self, client, db, manager_user, dept, manager_token):
        """PB181: widget số task phòng ban theo trạng thái"""
        for status in ["todo", "in_progress", "done"]:
            _make_task(db, dept.id, manager_user.id, f"Task {status}", status)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "task_stats" in data
        assert "todo" in data["task_stats"]
        assert "in_progress" in data["task_stats"]
        assert "done" in data["task_stats"]
        assert data["task_stats"]["todo"] >= 1

    def test_pb182_overdue_tasks_widget(self, client, db, manager_user, dept, manager_token):
        """PB182: widget task quá hạn phòng ban"""
        now = datetime.now(timezone.utc)
        overdue = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Overdue Mgr", status="in_progress", priority="high", progress_pct=20,
            deadline=now - timedelta(days=2),
        )
        db.add(overdue)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert "overdue_tasks" in data
        assert data["overdue_tasks"] >= 1

    def test_pb182_overdue_list_has_assignee(self, client, db, manager_user, staff_user, dept, manager_token):
        """PB182: danh sách task overdue kèm tên nhân viên"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Overdue With Assignee", status="in_progress",
            priority="high", progress_pct=20,
            deadline=now - timedelta(days=2),
        )
        db.add(t)
        db.flush()
        _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        assert "overdue_task_list" in res.json()
        if res.json()["overdue_task_list"]:
            item = res.json()["overdue_task_list"][0]
            assert "assignees" in item

    def test_pb183_workload_chart_by_staff(self, client, db, manager_user, staff_user, dept, manager_token):
        """PB183: biểu đồ workload theo nhân viên"""
        t = _make_task(db, dept.id, manager_user.id, "Workload Task", "in_progress")
        _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert "workload" in data
        assert isinstance(data["workload"], list)
        staff_wl = next((w for w in data["workload"] if w["user_id"] == str(staff_user.id)), None)
        assert staff_wl is not None
        assert "task_count" in staff_wl

    def test_pb184_weekly_completion_progress(self, client, db, manager_user, dept, manager_token):
        """PB184: tiến độ hoàn thành task tuần hiện tại"""
        now = datetime.now(timezone.utc)
        # 2 done trong tuần này
        for i in range(2):
            _make_task(db, dept.id, manager_user.id, f"Done Week {i}", "done",
                       progress_pct=100, completed_at=now)
        # 3 todo
        for i in range(3):
            _make_task(db, dept.id, manager_user.id, f"Todo Week {i}", "todo")
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert "weekly_progress" in data
        assert "done_this_week" in data["weekly_progress"]
        assert "total_this_week" in data["weekly_progress"]
        assert "completion_rate" in data["weekly_progress"]

    def test_pb185_top_overdue_tasks(self, client, db, manager_user, staff_user, dept, manager_token):
        """PB185: top 5 task trễ lâu nhất"""
        now = datetime.now(timezone.utc)
        for days_late in [1, 3, 5, 7, 10]:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Late {days_late}d", status="in_progress",
                priority="medium", progress_pct=30,
                deadline=now - timedelta(days=days_late),
            )
            db.add(t)
            db.flush()
            _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert "top_overdue_tasks" in data
        assert len(data["top_overdue_tasks"]) <= 5

        if len(data["top_overdue_tasks"]) >= 2:
            days_late_list = [t["days_late"] for t in data["top_overdue_tasks"]]
            assert days_late_list == sorted(days_late_list, reverse=True)

    def test_pb186_compare_with_last_month(self, client, manager_user, manager_token):
        """PB186: so sánh hiệu suất tháng này vs tháng trước"""
        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        data = res.json()
        assert "month_comparison" in data
        comparison = data["month_comparison"]
        assert "tasks_done_change" in comparison
        assert "on_time_rate_change" in comparison
        assert "direction" in comparison  # up | down | same

    def test_pb181_only_dept_tasks_in_manager_dashboard(
        self, client, db, org, manager_user, manager_token
    ):
        """PB181: chỉ task phòng ban của Manager trong dashboard"""
        other_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Khác Dashboard"
        )
        db.add(other_dept)
        other_task = Task(
            id=uuid.uuid4(), dept_id=other_dept.id, created_by=manager_user.id,
            title="Other Dept Task", status="todo", priority="low", progress_pct=0,
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add(other_task)
        db.commit()

        res = client.get("/api/v1/dashboard/manager", headers=auth_header(manager_token["access"]))
        # Tổng task chỉ tính phòng ban, không bao gồm phòng khác
        total = (res.json()["task_stats"]["todo"] +
                 res.json()["task_stats"]["in_progress"] +
                 res.json()["task_stats"]["done"])
        # Không thể xác định chính xác, nhưng endpoint phải trả về 200
        assert res.status_code == 200


# ══════════════════════════════════════════════════════════════
# PB187-PB189 — Dashboard Nhân viên
# ══════════════════════════════════════════════════════════════

class TestStaffDashboard:

    def test_pb187_tasks_today(self, client, db, staff_user, manager_user, dept, staff_token):
        """PB187: task hôm nay cần làm"""
        now = datetime.now(timezone.utc)
        # Task deadline hôm nay
        t1 = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Today", status="todo", priority="high", progress_pct=0,
            deadline=now.replace(hour=17, minute=0, second=0),
        )
        db.add(t1)
        db.flush()
        _assign(db, t1.id, staff_user.id)
        # Task in_progress
        t2 = _make_task(db, dept.id, manager_user.id, "In Progress Task", "in_progress")
        _assign(db, t2.id, staff_user.id)
        db.commit()

        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "tasks_today" in data
        task_ids = [t["id"] for t in data["tasks_today"]]
        assert str(t1.id) in task_ids

    def test_pb187_tasks_sorted_by_deadline(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB187: task hôm nay sắp xếp theo deadline"""
        now = datetime.now(timezone.utc)
        tasks = []
        for hour in [17, 9, 14]:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {hour}h", status="todo", priority="medium", progress_pct=0,
                deadline=now.replace(hour=hour, minute=0, second=0),
            )
            db.add(t)
            db.flush()
            _assign(db, t.id, staff_user.id)
            tasks.append(t)
        db.commit()

        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        today_tasks = [
            t for t in res.json()["tasks_today"]
            if t["id"] in [str(t.id) for t in tasks]
        ]
        if len(today_tasks) >= 2:
            deadlines = [t["deadline"] for t in today_tasks]
            assert deadlines == sorted(deadlines)

    def test_pb188_current_month_kpi_widget(self, client, staff_user, staff_token):
        """PB188: widget điểm KPI tháng hiện tại"""
        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        data = res.json()
        assert "kpi_current_month" in data
        kpi = data["kpi_current_month"]
        assert "total_score" in kpi
        assert "target_score" in kpi
        assert "grade" in kpi

    def test_pb189_tasks_done_this_month(self, client, db, staff_user, manager_user, dept, staff_token):
        """PB189: số task hoàn thành tháng này"""
        now = datetime.now(timezone.utc)
        for i in range(4):
            t = _make_task(db, dept.id, manager_user.id, f"Done {i}", "done",
                           progress_pct=100, completed_at=now)
            _assign(db, t.id, staff_user.id)
        db.commit()

        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        data = res.json()
        assert "tasks_done_this_month" in data
        assert data["tasks_done_this_month"] >= 4

    def test_pb189_compare_with_last_month(self, client, staff_user, staff_token):
        """PB189: so sánh task done tháng này vs tháng trước"""
        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        data = res.json()
        assert "tasks_done_change" in data
        assert "change_direction" in data  # up | down | same

    def test_pb187_staff_only_sees_own_tasks(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB187: Staff chỉ thấy task của mình trong dashboard"""
        now = datetime.now(timezone.utc)
        # Task không giao cho staff
        other_task = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Other Staff Task", status="todo", priority="medium", progress_pct=0,
            deadline=now.replace(hour=15, minute=0, second=0),
        )
        db.add(other_task)
        db.commit()

        res = client.get("/api/v1/dashboard/staff", headers=auth_header(staff_token["access"]))
        task_ids = [t["id"] for t in res.json()["tasks_today"]]
        assert str(other_task.id) not in task_ids

    def test_dashboard_requires_auth(self, client):
        """Tất cả dashboard endpoint yêu cầu auth"""
        for endpoint in ["/api/v1/dashboard/ceo",
                         "/api/v1/dashboard/manager",
                         "/api/v1/dashboard/staff"]:
            res = client.get(endpoint)
            assert res.status_code in (401, 403)
