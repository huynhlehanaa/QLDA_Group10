"""
Test Quản lý tổ chức — PB052 đến PB061
"""
import uuid
import pytest

from tests.conftest import auth_header
from app.models.organization import Department
from app.models.user import User
from app.core.security import hash_password


# ═══════════════════════════════════════════════════════════════
# PB052 — CEO tạo phòng ban
# ═══════════════════════════════════════════════════════════════

class TestCreateDepartment:
    def test_pb052_create_department(self, client, ceo_user, ceo_token):
        """PB052: CEO tạo phòng ban mới"""
        res = client.post(
            "/api/v1/organizations/departments",
            json={"name": "Phòng Marketing", "description": "Mô tả phòng"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["name"] == "Phòng Marketing"

    def test_pb052_only_ceo_can_create_dept(self, client, manager_user, manager_token):
        """PB052: chỉ CEO mới tạo được phòng ban"""
        res = client.post(
            "/api/v1/organizations/departments",
            json={"name": "New Dept"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403

    def test_pb052_create_dept_with_manager(self, client, db, ceo_user, manager_user, ceo_token):
        """PB052: tạo phòng ban và gán Manager ngay"""
        res = client.post(
            "/api/v1/organizations/departments",
            json={
                "name": "Phòng Có Manager",
                "manager_id": str(manager_user.id),
            },
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 201
        assert res.json()["manager_id"] == str(manager_user.id)

    def test_pb052_invalid_manager_rejected(self, client, ceo_user, ceo_token):
        """PB052: gán manager không tồn tại → 400"""
        res = client.post(
            "/api/v1/organizations/departments",
            json={"name": "Phòng X", "manager_id": str(uuid.uuid4())},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════
# PB053 — CEO chỉnh sửa phòng ban
# ═══════════════════════════════════════════════════════════════

class TestUpdateDepartment:
    def test_pb053_update_dept_name(self, client, ceo_user, dept, ceo_token):
        """PB053: cập nhật tên phòng ban"""
        res = client.patch(
            f"/api/v1/organizations/departments/{dept.id}",
            json={"name": "Tên Phòng Mới"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Tên Phòng Mới"

    def test_pb053_update_dept_description(self, client, ceo_user, dept, ceo_token):
        """PB053: cập nhật mô tả phòng ban"""
        res = client.patch(
            f"/api/v1/organizations/departments/{dept.id}",
            json={"description": "Mô tả mới"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200

    def test_pb053_nonexistent_dept(self, client, ceo_user, ceo_token):
        """PB053: phòng ban không tồn tại → 404"""
        res = client.patch(
            f"/api/v1/organizations/departments/{uuid.uuid4()}",
            json={"name": "X"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════
# PB054, PB055 — Gán và thay đổi Manager phụ trách
# ═══════════════════════════════════════════════════════════════

class TestAssignManager:
    def test_pb054_assign_manager_to_dept(self, client, ceo_user, manager_user, dept, ceo_token):
        """PB054: gán Manager phụ trách phòng ban"""
        res = client.patch(
            f"/api/v1/organizations/departments/{dept.id}/assign-manager",
            json={"manager_id": str(manager_user.id)},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["manager_id"] == str(manager_user.id)

    def test_pb054_non_manager_user_rejected(self, client, ceo_user, staff_user, dept, ceo_token):
        """PB054: gán Staff làm Manager → 400"""
        res = client.patch(
            f"/api/v1/organizations/departments/{dept.id}/assign-manager",
            json={"manager_id": str(staff_user.id)},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 400

    def test_pb055_replace_manager(self, client, db, ceo_user, manager_user, dept, org, ceo_token):
        """PB055: thay Manager phụ trách"""
        # Tạo Manager mới
        new_mgr = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
            full_name="Manager Mới", email="mgr2@test.com",
            password_hash=hash_password("Mgr2@123"), role="manager",
            is_active=True, must_change_pw=False,
        )
        db.add(new_mgr)
        db.commit()

        res = client.patch(
            f"/api/v1/organizations/departments/{dept.id}/assign-manager",
            json={"manager_id": str(new_mgr.id)},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["manager_id"] == str(new_mgr.id)


# ═══════════════════════════════════════════════════════════════
# PB056 — CEO xóa phòng ban
# ═══════════════════════════════════════════════════════════════

class TestDeactivateDepartment:
    def test_pb056_deactivate_empty_dept(self, client, db, ceo_user, org, ceo_token):
        """PB056: xóa phòng ban không có nhân viên active → thành công"""
        empty_dept = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Rỗng")
        db.add(empty_dept)
        db.commit()

        res = client.delete(
            f"/api/v1/organizations/departments/{empty_dept.id}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(empty_dept)
        assert empty_dept.is_active == False

    def test_pb056_cannot_deactivate_dept_with_active_staff(self, client, ceo_user, dept, staff_user, ceo_token):
        """PB056: phòng ban còn nhân viên active → cảnh báo 409"""
        res = client.delete(
            f"/api/v1/organizations/departments/{dept.id}",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 409
        assert "nhân viên" in res.json()["detail"]


# ═══════════════════════════════════════════════════════════════
# PB057 — Cảnh báo phòng ban không có Manager
# ═══════════════════════════════════════════════════════════════

class TestDeptWithoutManager:
    def test_pb057_detect_dept_without_manager(self, client, db, ceo_user, org, ceo_token):
        """PB057: phát hiện phòng ban không có Manager"""
        no_mgr_dept = Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Chưa Có Manager"
        )
        db.add(no_mgr_dept)
        db.commit()

        res = client.get(
            "/api/v1/organizations/departments/without-manager",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 1
        names = [d["name"] for d in data["departments"]]
        assert "Phòng Chưa Có Manager" in names

    def test_pb057_dept_with_manager_not_in_list(self, client, db, ceo_user, dept, manager_user, ceo_token):
        """PB057: phòng ban đã có Manager không xuất hiện trong cảnh báo"""
        dept.manager_id = manager_user.id
        db.commit()

        res = client.get(
            "/api/v1/organizations/departments/without-manager",
            headers=auth_header(ceo_token["access"]),
        )
        names = [d["name"] for d in res.json()["departments"]]
        assert "Phòng Test" not in names


# ═══════════════════════════════════════════════════════════════
# PB058, PB060 — Org Chart
# ═══════════════════════════════════════════════════════════════

class TestOrgChart:
    def test_pb058_org_chart_structure(self, client, ceo_user, manager_user, staff_user, dept, ceo_token):
        """PB058: sơ đồ tổ chức trả về đúng cấu trúc CEO → Manager → Staff"""
        res = client.get(
            "/api/v1/organizations/org-chart",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "ceo"
        assert "departments" in data

    def test_pb058_only_ceo_sees_org_chart(self, client, manager_user, manager_token):
        """PB058: chỉ CEO xem được org chart"""
        res = client.get(
            "/api/v1/organizations/org-chart",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403

    def test_pb060_dept_list_with_member_count(self, client, ceo_user, dept, staff_user, ceo_token):
        """PB060: danh sách phòng ban kèm số thành viên"""
        res = client.get(
            "/api/v1/organizations/departments",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        depts = res.json()
        test_dept = next((d for d in depts if d["name"] == "Phòng Test"), None)
        assert test_dept is not None
        assert test_dept["member_count"] >= 1


# ═══════════════════════════════════════════════════════════════
# PB050 — Thống kê nhân sự
# ═══════════════════════════════════════════════════════════════

class TestDeptStats:
    def test_pb050_dept_stats(self, client, ceo_user, dept, staff_user, manager_user, ceo_token):
        """PB050: CEO xem thống kê nhân sự theo phòng ban"""
        res = client.get(
            "/api/v1/organizations/stats",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        stats = res.json()
        assert isinstance(stats, list)
        assert len(stats) >= 1

        dept_stat = next((s for s in stats if s["dept_name"] == "Phòng Test"), None)
        assert dept_stat is not None
        assert dept_stat["staff_count"] >= 1

    def test_pb050_only_ceo_sees_stats(self, client, manager_user, manager_token):
        """PB050: chỉ CEO xem được thống kê"""
        res = client.get(
            "/api/v1/organizations/stats",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403


# ═══════════════════════════════════════════════════════════════
# PB060 — Tất cả role xem được danh sách phòng ban
# ═══════════════════════════════════════════════════════════════

class TestDepartmentAccess:
    def test_pb060_staff_can_list_depts(self, client, staff_user, dept, staff_token):
        """PB060: Staff cũng xem được danh sách phòng ban"""
        res = client.get(
            "/api/v1/organizations/departments",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200

    def test_pb060_manager_can_list_depts(self, client, manager_user, dept, manager_token):
        """PB060: Manager xem được danh sách phòng ban"""
        res = client.get(
            "/api/v1/organizations/departments",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
