"""
TDD Tests cho KPI & Đánh giá — PB120 đến PB158

Chạy trước khi viết code → tất cả FAIL
Sau khi viết code → tất cả PASS

Thứ tự TDD:
1. Chạy: pytest tests/test_kpi.py -v  → thấy toàn bộ FAIL
2. Viết models/kpi.py
3. Viết services/kpi_service.py
4. Viết api/kpi.py
5. Chạy lại → thấy PASS
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from tests.conftest import auth_header
from app.models.user import User
from app.models.organization import Department


# ══════════════════════════════════════════════════════════════
# PB120, PB121 — CEO tạo tiêu chí KPI toàn công ty
# ══════════════════════════════════════════════════════════════

class TestCreateKpiCriteria:

    def test_pb120_ceo_creates_criteria(self, client, ceo_user, ceo_token):
        """PB120: CEO tạo tiêu chí KPI toàn công ty"""
        res = client.post("/api/v1/kpi/criteria", json={
            "name": "Hoàn thành đúng hạn",
            "description": "Tỉ lệ task hoàn thành trước deadline",
            "weight": 40.0,
            "is_global": True,
            "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Hoàn thành đúng hạn"
        assert data["weight"] == 40.0
        assert data["is_global"] == True

    def test_pb120_only_ceo_can_create_global_criteria(self, client, manager_user, manager_token):
        """PB120: Manager không tạo được tiêu chí toàn công ty"""
        res = client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí",
            "weight": 50.0,
            "is_global": True,
            "formula_type": "on_time_rate",
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 403

    def test_pb121_total_weight_must_be_100(self, client, ceo_user, ceo_token):
        """PB121: tổng trọng số toàn công ty phải = 100%"""
        # Tạo 2 tiêu chí tổng = 100
        client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí A", "weight": 60.0,
            "is_global": True, "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí B", "weight": 40.0,
            "is_global": True, "formula_type": "completion_rate",
        }, headers=auth_header(ceo_token["access"]))

        res = client.get("/api/v1/kpi/criteria/validate", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["total_weight"] == 100.0
        assert res.json()["is_valid"] == True

    def test_pb121_warning_when_total_weight_not_100(self, client, ceo_user, ceo_token):
        """PB121: cảnh báo khi tổng trọng số != 100%"""
        client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí lẻ", "weight": 70.0,
            "is_global": True, "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))

        res = client.get("/api/v1/kpi/criteria/validate", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["is_valid"] == False
        assert "warning" in res.json()


# ══════════════════════════════════════════════════════════════
# PB122, PB123, PB124 — Cấu hình KPI
# ══════════════════════════════════════════════════════════════

class TestKpiConfig:

    def test_pb122_ceo_sets_company_kpi_target(self, client, ceo_user, ceo_token):
        """PB122: CEO đặt mục tiêu KPI trung bình toàn công ty"""
        res = client.post("/api/v1/kpi/config", json={
            "target_score": 75.0,
            "cycle_day": 1,
            "thresholds": {
                "excellent": 90,
                "good": 75,
                "pass": 60,
            }
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["target_score"] == 75.0

    def test_pb123_ceo_sets_cycle_day(self, client, ceo_user, ceo_token):
        """PB123: CEO cài đặt ngày chốt KPI trong tháng"""
        res = client.post("/api/v1/kpi/config", json={
            "target_score": 75.0,
            "cycle_day": 28,
            "thresholds": {"excellent": 90, "good": 75, "pass": 60}
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["cycle_day"] == 28

    def test_pb123_cycle_day_must_be_1_to_31(self, client, ceo_user, ceo_token):
        """PB123: ngày chốt phải từ 1-31"""
        res = client.post("/api/v1/kpi/config", json={
            "target_score": 75.0,
            "cycle_day": 32,
            "thresholds": {"excellent": 90, "good": 75, "pass": 60}
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 422

    def test_pb124_set_kpi_thresholds(self, client, ceo_user, ceo_token):
        """PB124: CEO thiết lập ngưỡng xếp loại KPI"""
        res = client.post("/api/v1/kpi/config", json={
            "target_score": 75.0,
            "cycle_day": 1,
            "thresholds": {
                "excellent": 90,
                "good": 75,
                "pass": 60,
            }
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        thresholds = res.json()["thresholds"]
        assert thresholds["excellent"] == 90
        assert thresholds["good"] == 75
        assert thresholds["pass"] == 60

    def test_pb124_only_ceo_can_set_config(self, client, manager_user, manager_token):
        """PB124: chỉ CEO cài đặt cấu hình KPI"""
        res = client.post("/api/v1/kpi/config", json={
            "target_score": 80.0,
            "cycle_day": 1,
            "thresholds": {"excellent": 90, "good": 75, "pass": 60}
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB125, PB126, PB127 — Manager quản lý tiêu chí KPI phòng ban
# ══════════════════════════════════════════════════════════════

class TestDeptKpiCriteria:

    def test_pb125_manager_adds_dept_criteria(self, client, manager_user, manager_token):
        """PB125: Manager thêm tiêu chí KPI riêng cho phòng ban"""
        res = client.post("/api/v1/kpi/criteria", json={
            "name": "Chất lượng code review",
            "description": "Tiêu chí đặc thù phòng kỹ thuật",
            "weight": 20.0,
            "is_global": False,
            "formula_type": "manual",
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 201
        data = res.json()
        assert data["is_global"] == False

    def test_pb126_manager_adjusts_weight(self, client, db, ceo_user, manager_user, ceo_token, manager_token):
        """PB126: Manager điều chỉnh trọng số tiêu chí trong biên độ cho phép"""
        # CEO tạo tiêu chí toàn công ty
        crit_res = client.post("/api/v1/kpi/criteria", json={
            "name": "Hoàn thành đúng hạn",
            "weight": 40.0, "is_global": True,
            "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        crit_id = crit_res.json()["id"]

        # Manager điều chỉnh trong biên độ ±20%
        res = client.patch(f"/api/v1/kpi/criteria/{crit_id}", json={
            "weight": 50.0  # tăng 10% từ 40%
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert res.json()["weight"] == 50.0

    def test_pb126_manager_cannot_exceed_adjustment_limit(self, client, ceo_user, manager_user, ceo_token, manager_token):
        """PB126: Manager không điều chỉnh quá biên độ ±20%"""
        crit_res = client.post("/api/v1/kpi/criteria", json={
            "name": "Hoàn thành", "weight": 40.0,
            "is_global": True, "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        crit_id = crit_res.json()["id"]

        # Vượt quá 20% (40 + 25 = 65%)
        res = client.patch(f"/api/v1/kpi/criteria/{crit_id}", json={
            "weight": 65.0
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 400

    def test_pb127_validate_dept_total_weight(self, client, manager_user, manager_token):
        """PB127: validate tổng trọng số phòng ban = 100%"""
        client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí 1", "weight": 50.0,
            "is_global": False, "formula_type": "on_time_rate",
        }, headers=auth_header(manager_token["access"]))
        client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí 2", "weight": 50.0,
            "is_global": False, "formula_type": "completion_rate",
        }, headers=auth_header(manager_token["access"]))

        res = client.get("/api/v1/kpi/criteria/validate", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert res.json()["total_weight"] == 100.0
        assert res.json()["is_valid"] == True


# ══════════════════════════════════════════════════════════════
# PB128 — Lịch sử thay đổi công thức KPI
# ══════════════════════════════════════════════════════════════

class TestKpiHistory:

    def test_pb128_log_criteria_change(self, client, ceo_user, ceo_token):
        """PB128: ghi log khi thay đổi trọng số tiêu chí"""
        crit_res = client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí log", "weight": 40.0,
            "is_global": True, "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        crit_id = crit_res.json()["id"]

        client.patch(f"/api/v1/kpi/criteria/{crit_id}", json={
            "weight": 50.0
        }, headers=auth_header(ceo_token["access"]))

        res = client.get(f"/api/v1/kpi/criteria/{crit_id}/history",
                         headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) >= 1
        assert logs[0]["old_weight"] == 40.0
        assert logs[0]["new_weight"] == 50.0

    def test_pb128_history_has_who_and_when(self, client, ceo_user, ceo_token):
        """PB128: log ghi rõ ai thay đổi và lúc nào"""
        crit_res = client.post("/api/v1/kpi/criteria", json={
            "name": "Tiêu chí log2", "weight": 30.0,
            "is_global": True, "formula_type": "on_time_rate",
        }, headers=auth_header(ceo_token["access"]))
        crit_id = crit_res.json()["id"]

        client.patch(f"/api/v1/kpi/criteria/{crit_id}", json={"weight": 35.0},
                     headers=auth_header(ceo_token["access"]))

        res = client.get(f"/api/v1/kpi/criteria/{crit_id}/history",
                         headers=auth_header(ceo_token["access"]))
        log = res.json()[0]
        assert "changed_by" in log
        assert "changed_at" in log


# ══════════════════════════════════════════════════════════════
# PB129, PB130, PB131, PB132 — Tự động tính KPI từ task
# ══════════════════════════════════════════════════════════════

class TestKpiCalculation:

    def test_pb130_on_time_rate_formula(self, db, dept, manager_user, staff_user):
        """PB130: tính tỉ lệ hoàn thành đúng hạn"""
        from app.services.kpi_service import calculate_on_time_rate
        from app.models.task import Task, TaskAssignee

        now = datetime.now(timezone.utc)
        month = now.month
        year = now.year

        # Tạo 10 task: 8 done đúng hạn, 2 done trễ
        for i in range(8):
            deadline = now - timedelta(days=1)
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"On time {i}", status="done", priority="medium",
                progress_pct=100, deadline=deadline,
                completed_at=deadline - timedelta(hours=1),  # hoàn thành trước deadline
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))

        for i in range(2):
            deadline = now - timedelta(days=3)
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Late {i}", status="done", priority="medium",
                progress_pct=100, deadline=deadline,
                completed_at=deadline + timedelta(days=1),  # hoàn thành sau deadline
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))

        db.commit()

        score = calculate_on_time_rate(staff_user.id, year, month, db)
        assert score == 80.0  # 8/10 = 80%

    def test_pb131_completion_rate_formula(self, db, dept, manager_user, staff_user):
        """PB131: tính tỉ lệ hoàn thành task"""
        from app.services.kpi_service import calculate_completion_rate
        from app.models.task import Task, TaskAssignee

        now = datetime.now(timezone.utc)

        # 3 task done, 1 task in_progress, 1 task todo → 3/5 = 60%
        statuses = ["done", "done", "done", "in_progress", "todo"]
        for s in statuses:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {s}", status=s, priority="medium",
                progress_pct=100 if s == "done" else 50,
                deadline=now,
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        score = calculate_completion_rate(staff_user.id, now.year, now.month, db)
        assert score == 60.0  # 3/5 = 60%

    def test_pb132_quality_rate_formula(self, db, dept, manager_user, staff_user):
        """PB132: tính chất lượng dựa trên % hoàn thành trung bình"""
        from app.services.kpi_service import calculate_quality_rate
        from app.models.task import Task, TaskAssignee

        now = datetime.now(timezone.utc)

        # 4 task với % hoàn thành: 100, 80, 60, 40 → trung bình = 70%
        for pct in [100, 80, 60, 40]:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {pct}", status="in_progress", priority="medium",
                progress_pct=pct, deadline=now,
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        score = calculate_quality_rate(staff_user.id, now.year, now.month, db)
        assert score == 70.0

    def test_pb129_calculate_total_kpi_score(self, db, dept, manager_user, staff_user):
        """PB129: tính điểm KPI tổng hợp từ dữ liệu task"""
        from app.services.kpi_service import calculate_kpi_for_user
        from app.models.task import Task, TaskAssignee
        from app.models.kpi import KpiCriteria

        now = datetime.now(timezone.utc)

        # Tạo tiêu chí KPI
        c1 = KpiCriteria(
            id=uuid.uuid4(), org_id=manager_user.org_id,
            name="Đúng hạn", weight=50.0,
            is_global=True, formula_type="on_time_rate",
        )
        c2 = KpiCriteria(
            id=uuid.uuid4(), org_id=manager_user.org_id,
            name="Hoàn thành", weight=50.0,
            is_global=True, formula_type="completion_rate",
        )
        db.add_all([c1, c2])

        # Tạo task: 100% on_time, 100% completion
        for i in range(5):
            deadline = now - timedelta(hours=1)
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"T{i}", status="done", priority="medium",
                progress_pct=100, deadline=deadline,
                completed_at=deadline - timedelta(hours=2),
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        score = calculate_kpi_for_user(staff_user.id, now.year, now.month, db)
        assert score["total_score"] == 100.0
        assert "breakdown" in score

    def test_pb129_no_tasks_gives_zero_score(self, db, staff_user):
        """PB129: không có task → điểm 0"""
        from app.services.kpi_service import calculate_kpi_for_user
        now = datetime.now(timezone.utc)
        score = calculate_kpi_for_user(staff_user.id, now.year, now.month, db)
        assert score["total_score"] == 0.0


# ══════════════════════════════════════════════════════════════
# PB133-PB140 — Nhân viên xem KPI
# ══════════════════════════════════════════════════════════════

class TestStaffViewKpi:

    def test_pb133_staff_views_monthly_kpi(self, client, staff_user, staff_token):
        """PB133: nhân viên xem điểm KPI tổng hợp tháng hiện tại"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        assert "total_score" in data
        assert "grade" in data
        assert "breakdown" in data

    def test_pb134_staff_views_criteria_breakdown(self, client, staff_user, staff_token):
        """PB134: nhân viên xem điểm từng tiêu chí"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        breakdown = res.json()["breakdown"]
        assert isinstance(breakdown, list)

    def test_pb135_breakdown_shows_weight_and_score(self, client, db, staff_user, staff_token, ceo_user, ceo_token):
        """PB135: breakdown hiển thị trọng số và điểm"""
        from app.models.kpi import KpiCriteria
        c = KpiCriteria(
            id=uuid.uuid4(), org_id=staff_user.org_id,
            name="Test criterion", weight=100.0,
            is_global=True, formula_type="completion_rate",
        )
        db.add(c)
        db.commit()

        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        if res.json()["breakdown"]:
            item = res.json()["breakdown"][0]
            assert "name" in item
            assert "weight" in item
            assert "score" in item
            assert "weighted_score" in item

    def test_pb136_staff_views_12_month_history(self, client, staff_user, staff_token):
        """PB136: nhân viên xem lịch sử KPI 12 tháng"""
        res = client.get(
            "/api/v1/kpi/me/history?months=12",
            headers=auth_header(staff_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) <= 12

    def test_pb137_compare_with_dept_average(self, client, staff_user, staff_token):
        """PB137: so sánh KPI cá nhân với trung bình phòng ban"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me/compare?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        assert "my_score" in data
        assert "dept_average" in data

    def test_pb138_compare_actual_vs_target(self, client, staff_user, staff_token):
        """PB138: so sánh KPI thực tế với mục tiêu"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        data = res.json()
        assert "target_score" in data
        assert "total_score" in data

    def test_pb139_grade_label_displayed(self, client, staff_user, staff_token):
        """PB139: hiển thị xếp loại bên cạnh điểm số"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/me?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"])
        )
        grade = res.json()["grade"]
        assert grade in ["Xuất sắc", "Tốt", "Đạt", "Chưa đạt", "Chưa có dữ liệu"]

    def test_pb140_set_personal_kpi_target(self, client, staff_user, staff_token):
        """PB140: đặt mục tiêu KPI cá nhân cho tháng sau"""
        next_month = datetime.now(timezone.utc).replace(day=1) + timedelta(days=32)
        res = client.post("/api/v1/kpi/me/target", json={
            "year": next_month.year,
            "month": next_month.month,
            "target_score": 85.0,
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["target_score"] == 85.0


# ══════════════════════════════════════════════════════════════
# PB141-PB145 — Manager xem KPI phòng ban
# ══════════════════════════════════════════════════════════════

class TestManagerViewKpi:

    def test_pb141_view_kpi_by_period(self, client, manager_user, manager_token):
        """PB141: xem KPI theo tháng/quý/năm"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/dept?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        assert "summary" in res.json()

    def test_pb142_manager_views_all_staff_kpi(self, client, manager_user, staff_user, manager_token):
        """PB142: Manager xem bảng điểm KPI toàn bộ nhân viên"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/dept/scores?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        user_ids = [str(s["user_id"]) for s in data]
        assert str(staff_user.id) in user_ids

    def test_pb142_score_table_has_required_fields(self, client, manager_user, staff_user, manager_token):
        """PB142: bảng điểm có đủ trường: tên, điểm, ranking"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/dept/scores?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        if res.json():
            item = res.json()[0]
            assert "user_id" in item
            assert "full_name" in item
            assert "total_score" in item
            assert "grade" in item
            assert "rank" in item

    def test_pb143_dept_ranking(self, client, manager_user, staff_user, manager_token):
        """PB143: bảng xếp hạng KPI phòng ban từ cao xuống thấp"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/dept/ranking?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        if len(data) >= 2:
            scores = [item["total_score"] for item in data]
            assert scores == sorted(scores, reverse=True)

    def test_pb144_manager_views_staff_history(self, client, manager_user, staff_user, manager_token):
        """PB144: Manager xem lịch sử KPI của từng nhân viên"""
        res = client.get(
            f"/api/v1/kpi/staff/{staff_user.id}/history?months=12",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_pb144_manager_cannot_view_other_dept_staff(self, client, db, org, manager_user, manager_token):
        """PB144: Manager không xem được lịch sử nhân viên phòng khác"""
        other_dept = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Khác")
        db.add(other_dept)
        other_staff = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=other_dept.id,
            full_name="NV Phòng Khác", email="kpi_other@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(other_staff)
        db.commit()

        res = client.get(
            f"/api/v1/kpi/staff/{other_staff.id}/history?months=12",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 403

    def test_pb145_grade_distribution(self, client, manager_user, manager_token):
        """PB145: phân phối xếp loại KPI phòng ban"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/dept/distribution?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        data = res.json()
        assert "excellent" in data
        assert "good" in data
        assert "pass" in data
        assert "fail" in data


# ══════════════════════════════════════════════════════════════
# PB146, PB147, PB148 — Xuất Excel KPI
# ══════════════════════════════════════════════════════════════

class TestKpiExport:

    def test_pb147_ceo_exports_company_kpi_excel(self, client, ceo_user, ceo_token):
        """PB147: CEO xuất bảng điểm KPI toàn công ty ra Excel"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/export/company?year={now.year}&month={now.month}",
            headers=auth_header(ceo_token["access"])
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb148_manager_exports_dept_kpi_excel(self, client, manager_user, manager_token):
        """PB148: Manager xuất bảng điểm KPI phòng ban ra Excel"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/export/dept?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb146_ceo_exports_yearly_kpi(self, client, ceo_user, ceo_token):
        """PB146: CEO xuất KPI cả năm (nhiều sheet)"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/export/company?year={now.year}",
            headers=auth_header(ceo_token["access"])
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb147_only_ceo_exports_company(self, client, manager_user, manager_token):
        """PB147: chỉ CEO xuất được KPI toàn công ty"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/kpi/export/company?year={now.year}&month={now.month}",
            headers=auth_header(manager_token["access"])
        )
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB149, PB150 — Chốt và mở khóa KPI
# ══════════════════════════════════════════════════════════════

class TestKpiFinalize:

    def test_pb149_ceo_finalizes_kpi(self, client, db, ceo_user, staff_user, ceo_token):
        """PB149: CEO chốt điểm KPI cuối tháng"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/finalize", json={
            "year": now.year,
            "month": now.month,
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["finalized"] == True

    def test_pb149_finalized_scores_cannot_be_modified(self, client, db, ceo_user, staff_user, ceo_token):
        """PB149: sau khi chốt, điểm KPI không thể thay đổi"""
        now = datetime.now(timezone.utc)
        # Chốt trước
        client.post("/api/v1/kpi/finalize", json={
            "year": now.year, "month": now.month,
        }, headers=auth_header(ceo_token["access"]))

        # Thử sửa → bị từ chối
        res = client.post(f"/api/v1/kpi/scores/{staff_user.id}", json={
            "year": now.year, "month": now.month, "score": 99.0,
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 403

    def test_pb149_only_ceo_can_finalize(self, client, manager_user, manager_token):
        """PB149: chỉ CEO mới chốt được KPI"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/finalize", json={
            "year": now.year, "month": now.month,
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 403

    def test_pb150_ceo_unlocks_finalized_kpi(self, client, ceo_user, ceo_token):
        """PB150: CEO mở khóa điểm KPI đã chốt"""
        now = datetime.now(timezone.utc)
        client.post("/api/v1/kpi/finalize", json={
            "year": now.year, "month": now.month,
        }, headers=auth_header(ceo_token["access"]))

        res = client.post("/api/v1/kpi/unlock", json={
            "year": now.year,
            "month": now.month,
            "reason": "Sửa lỗi nhập liệu nhân viên A",
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["finalized"] == False

    def test_pb150_unlock_requires_reason(self, client, ceo_user, ceo_token):
        """PB150: mở khóa phải có lý do"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/unlock", json={
            "year": now.year,
            "month": now.month,
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 422


# ══════════════════════════════════════════════════════════════
# PB151, PB152 — Khiếu nại KPI
# ══════════════════════════════════════════════════════════════

class TestKpiAppeal:

    def test_pb151_staff_submits_appeal(self, client, staff_user, staff_token):
        """PB151: nhân viên gửi khiếu nại điểm KPI"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/appeals", json={
            "year": now.year,
            "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "current_score": 60.0,
            "proposed_score": 80.0,
            "reason": "Task bị delay do yêu cầu thay đổi từ khách hàng",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "pending"
        assert data["proposed_score"] == 80.0

    def test_pb151_appeal_requires_reason(self, client, staff_user, staff_token):
        """PB151: khiếu nại phải có lý do"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/appeals", json={
            "year": now.year,
            "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "current_score": 60.0,
            "proposed_score": 80.0,
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 422

    def test_pb152_manager_responds_to_appeal(self, client, db, staff_user, manager_user, staff_token, manager_token):
        """PB152: Manager phản hồi khiếu nại KPI"""
        now = datetime.now(timezone.utc)
        # Staff tạo khiếu nại
        appeal_res = client.post("/api/v1/kpi/appeals", json={
            "year": now.year, "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "current_score": 60.0, "proposed_score": 80.0,
            "reason": "Task delay do khách hàng",
        }, headers=auth_header(staff_token["access"]))
        appeal_id = appeal_res.json()["id"]

        # Manager phản hồi
        res = client.patch(f"/api/v1/kpi/appeals/{appeal_id}/respond", json={
            "approved": True,
            "response": "Đồng ý, điểm được điều chỉnh",
            "adjusted_score": 78.0,
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

    def test_pb152_only_manager_responds_to_appeal(self, client, db, staff_user, staff_token):
        """PB152: chỉ Manager mới phản hồi được khiếu nại"""
        now = datetime.now(timezone.utc)
        appeal_res = client.post("/api/v1/kpi/appeals", json={
            "year": now.year, "month": now.month,
            "criteria_name": "Test", "current_score": 60.0,
            "proposed_score": 80.0, "reason": "Lý do",
        }, headers=auth_header(staff_token["access"]))
        appeal_id = appeal_res.json()["id"]

        res = client.patch(f"/api/v1/kpi/appeals/{appeal_id}/respond", json={
            "approved": True, "response": "OK",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════
# PB153, PB154, PB155 — Điều chỉnh KPI ngoại lệ
# ══════════════════════════════════════════════════════════════

class TestKpiAdjustment:

    def test_pb153_manager_requests_adjustment(self, client, manager_user, staff_user, manager_token):
        """PB153: Manager yêu cầu điều chỉnh KPI ngoại lệ"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year,
            "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "proposed_score": 85.0,
            "reason": "Nhân viên nghỉ ốm 2 tuần, task được chuyển cho người khác",
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 201
        assert res.json()["status"] == "pending"

    def test_pb153_only_manager_can_request_adjustment(self, client, staff_user, staff_token):
        """PB153: Staff không thể yêu cầu điều chỉnh KPI"""
        now = datetime.now(timezone.utc)
        res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year, "month": now.month,
            "criteria_name": "Test", "proposed_score": 90.0,
            "reason": "Lý do",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 403

    def test_pb154_ceo_approves_adjustment(self, client, manager_user, staff_user, ceo_user, manager_token, ceo_token):
        """PB154: CEO phê duyệt yêu cầu điều chỉnh KPI"""
        now = datetime.now(timezone.utc)
        adj_res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year, "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "proposed_score": 85.0,
            "reason": "Nhân viên nghỉ ốm",
        }, headers=auth_header(manager_token["access"]))
        adj_id = adj_res.json()["id"]

        res = client.patch(f"/api/v1/kpi/adjustments/{adj_id}/review", json={
            "approved": True,
            "comment": "Chấp nhận, có minh chứng rõ ràng",
        }, headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

    def test_pb154_only_ceo_approves_adjustment(self, client, manager_user, staff_user, manager_token):
        """PB154: chỉ CEO phê duyệt điều chỉnh KPI"""
        now = datetime.now(timezone.utc)
        adj_res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year, "month": now.month,
            "criteria_name": "Test", "proposed_score": 85.0,
            "reason": "Lý do",
        }, headers=auth_header(manager_token["access"]))
        adj_id = adj_res.json()["id"]

        res = client.patch(f"/api/v1/kpi/adjustments/{adj_id}/review", json={
            "approved": True, "comment": "OK",
        }, headers=auth_header(manager_token["access"]))
        assert res.status_code == 403

    def test_pb155_adjustment_history_logged(self, client, manager_user, staff_user, ceo_user, manager_token, ceo_token):
        """PB155: lưu lịch sử điều chỉnh KPI ngoại lệ"""
        now = datetime.now(timezone.utc)
        adj_res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year, "month": now.month,
            "criteria_name": "Hoàn thành đúng hạn",
            "proposed_score": 85.0,
            "reason": "Nghỉ ốm",
        }, headers=auth_header(manager_token["access"]))
        adj_id = adj_res.json()["id"]

        client.patch(f"/api/v1/kpi/adjustments/{adj_id}/review", json={
            "approved": True, "comment": "OK",
        }, headers=auth_header(ceo_token["access"]))

        res = client.get("/api/v1/kpi/adjustments/history",
                         headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert len(res.json()) >= 1
        log = res.json()[0]
        assert "requester" in log
        assert "approver" in log
        assert "proposed_score" in log


# ══════════════════════════════════════════════════════════════
# PB156, PB157, PB158 — Thông báo KPI
# ══════════════════════════════════════════════════════════════

class TestKpiNotifications:

    def test_pb157_notification_sent_when_kpi_finalized(self, client, db, ceo_user, staff_user, ceo_token):
        """PB157: nhân viên nhận thông báo khi KPI được chốt"""
        from app.models.notification import Notification

        now = datetime.now(timezone.utc)
        client.post("/api/v1/kpi/finalize", json={
            "year": now.year, "month": now.month,
        }, headers=auth_header(ceo_token["access"]))

        notifs = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "kpi_finalized",
        ).all()
        assert len(notifs) >= 1

    def test_pb158_warning_for_consecutive_low_kpi(self, client, db, ceo_user, manager_user, staff_user, ceo_token, manager_token):
        """PB158: cảnh báo Manager khi nhân viên dưới ngưỡng Đạt 2 tháng liên tiếp"""
        from app.models.kpi import KpiScore
        from app.models.notification import Notification

        now = datetime.now(timezone.utc)
        # Tạo điểm KPI dưới ngưỡng 2 tháng liên tiếp
        for month_offset in [1, 2]:
            month = now.month - month_offset
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            score = KpiScore(
                id=uuid.uuid4(),
                user_id=staff_user.id,
                criteria_id=uuid.uuid4(),
                year=year, month=month,
                score=50.0,  # dưới ngưỡng Đạt (60)
                weighted_score=50.0,
                is_finalized=True,
            )
            db.add(score)
        db.commit()

        # Trigger check
        res = client.post("/api/v1/kpi/check-warnings",
                          headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200

        # Manager nhận cảnh báo
        notifs = db.query(Notification).filter(
            Notification.user_id == manager_user.id,
            Notification.type == "kpi_low_consecutive",
        ).all()
        assert len(notifs) >= 1

    def test_pb156_staff_notified_of_adjustment_result(self, client, db, manager_user, staff_user, ceo_user, manager_token, ceo_token, staff_token):
        """PB156: nhân viên nhận thông báo kết quả phê duyệt điều chỉnh KPI"""
        from app.models.notification import Notification

        now = datetime.now(timezone.utc)
        adj_res = client.post("/api/v1/kpi/adjustments", json={
            "user_id": str(staff_user.id),
            "year": now.year, "month": now.month,
            "criteria_name": "Test", "proposed_score": 85.0,
            "reason": "Lý do test",
        }, headers=auth_header(manager_token["access"]))
        adj_id = adj_res.json()["id"]

        client.patch(f"/api/v1/kpi/adjustments/{adj_id}/review", json={
            "approved": True, "comment": "Duyệt",
        }, headers=auth_header(ceo_token["access"]))

        notifs = db.query(Notification).filter(
            Notification.user_id == staff_user.id,
            Notification.type == "kpi_adjustment_result",
        ).all()
        assert len(notifs) >= 1
