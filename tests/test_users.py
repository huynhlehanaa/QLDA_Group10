"""
Test Quản lý tài khoản — PB022 đến PB051
"""
import io
import uuid
import pytest
import openpyxl
from unittest.mock import patch

from tests.conftest import auth_header, get_token
from app.models.user import User


# ═══════════════════════════════════════════════════════════════
# PB022-PB024 — CEO tạo Manager
# ═══════════════════════════════════════════════════════════════

class TestCreateManager:
    def test_pb022_ceo_creates_manager(self, client, db, ceo_user, dept, ceo_token):
        """PB022: CEO tạo Manager thành công"""
        with patch("app.services.user_service.send_new_manager_email"):
            res = client.post(
                "/api/v1/users/managers",
                json={
                    "full_name": "Manager Mới",
                    "email": "newmgr@test.com",
                    "dept_id": str(dept.id),
                },
                headers=auth_header(ceo_token["access"]),
            )
        assert res.status_code == 201
        data = res.json()
        assert data["role"] == "manager"
        assert data["must_change_pw"] == True
        assert data["email"] == "newmgr@test.com"

    def test_pb022_only_ceo_can_create_manager(self, client, manager_user, manager_token, dept):
        """PB022: Manager không tạo được Manager khác"""
        res = client.post(
            "/api/v1/users/managers",
            json={"full_name": "X", "email": "x@test.com", "dept_id": str(dept.id)},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403

    def test_pb023_duplicate_email_rejected(self, client, ceo_user, manager_user, dept, ceo_token):
        """PB023: email trùng → 409"""
        with patch("app.services.user_service.send_new_manager_email"):
            res = client.post(
                "/api/v1/users/managers",
                json={
                    "full_name": "Dup",
                    "email": "manager@test.com",  # đã tồn tại
                    "dept_id": str(dept.id),
                },
                headers=auth_header(ceo_token["access"]),
            )
        assert res.status_code == 409

    def test_pb024_welcome_email_sent(self, client, ceo_user, dept, ceo_token):
        """PB024: gửi email thông báo tài khoản mới"""
        with patch("app.services.user_service.send_welcome_email") as mock:
            client.post(
                "/api/v1/users/managers",
                json={"full_name": "M", "email": "m@test.com", "dept_id": str(dept.id)},
                headers=auth_header(ceo_token["access"]),
            )
            mock.assert_called_once()

    def test_pb048_manager_without_dept_rejected(self, client, ceo_user, ceo_token):
        """PB048: cảnh báo khi tạo Manager không có phòng ban"""
        res = client.post(
            "/api/v1/users/managers",
            json={
                "full_name": "NoDept",
                "email": "nodept@test.com",
                "dept_id": str(uuid.uuid4()),  # dept không tồn tại
            },
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════
# PB025, PB026 — CEO xem và tìm Manager
# ═══════════════════════════════════════════════════════════════

class TestListManagers:
    def test_pb025_ceo_list_managers(self, client, ceo_user, manager_user, ceo_token):
        """PB025: CEO xem danh sách Manager"""
        res = client.get("/api/v1/users/managers", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        assert "items" in data
        assert "total_pages" in data

    def test_pb026_search_manager_by_name(self, client, ceo_user, manager_user, ceo_token):
        """PB026: tìm Manager theo tên"""
        res = client.get(
            "/api/v1/users/managers?search=Manager",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_pb026_search_no_results(self, client, ceo_user, manager_user, ceo_token):
        """PB026: tìm không thấy trả về danh sách rỗng"""
        res = client.get(
            "/api/v1/users/managers?search=XYZNotExist",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["total"] == 0

    def test_pb025_pagination(self, client, ceo_user, manager_user, ceo_token):
        """PB025: phân trang hoạt động"""
        res = client.get(
            "/api/v1/users/managers?page=1&page_size=1",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) <= 1
        assert data["page"] == 1


# ═══════════════════════════════════════════════════════════════
# PB027, PB028 — CEO chỉnh sửa và chuyển Manager
# ═══════════════════════════════════════════════════════════════

class TestUpdateManager:
    def test_pb027_update_manager_name(self, client, ceo_user, manager_user, ceo_token):
        """PB027: CEO cập nhật tên Manager"""
        res = client.patch(
            f"/api/v1/users/managers/{manager_user.id}",
            json={"full_name": "Tên Mới"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["full_name"] == "Tên Mới"

    def test_pb028_transfer_manager_to_dept(self, client, db, ceo_user, manager_user, org, ceo_token):
        """PB028: chuyển Manager sang phòng ban khác"""
        new_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Mới"
        )
        db.add(new_dept)
        db.commit()

        res = client.patch(
            f"/api/v1/users/managers/{manager_user.id}",
            json={"dept_id": str(new_dept.id)},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["dept_id"] == str(new_dept.id)


# ═══════════════════════════════════════════════════════════════
# PB029-PB031 — CEO reset/deactivate/activate Manager
# ═══════════════════════════════════════════════════════════════

class TestManagerStatusManagement:
    def test_pb029_reset_manager_password(self, client, ceo_user, manager_user, ceo_token):
        """PB029: CEO reset mật khẩu Manager"""
        with patch("app.services.user_service.send_new_manager_email"):
            res = client.post(
                f"/api/v1/users/managers/{manager_user.id}/reset-password",
                headers=auth_header(ceo_token["access"]),
            )
        assert res.status_code == 200

    def test_pb030_deactivate_manager(self, client, db, ceo_user, manager_user, ceo_token):
        """PB030: CEO vô hiệu hóa Manager"""
        res = client.patch(
            f"/api/v1/users/managers/{manager_user.id}/deactivate",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(manager_user)
        assert manager_user.is_active == False

    def test_pb030_deactivated_cannot_login(self, client, db, ceo_user, manager_user, ceo_token):
        """PB030: Manager bị vô hiệu hóa không đăng nhập được"""
        client.patch(
            f"/api/v1/users/managers/{manager_user.id}/deactivate",
            headers=auth_header(ceo_token["access"]),
        )
        res = client.post("/api/v1/auth/login", json={
            "email": "manager@test.com", "password": "Mgr@123456",
        })
        assert res.status_code == 403

    def test_pb031_reactivate_manager(self, client, db, ceo_user, manager_user, ceo_token):
        """PB031: CEO kích hoạt lại Manager"""
        manager_user.is_active = False
        db.commit()

        res = client.patch(
            f"/api/v1/users/managers/{manager_user.id}/activate",
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(manager_user)
        assert manager_user.is_active == True


# ═══════════════════════════════════════════════════════════════
# PB032-PB034 — Manager tạo Staff
# ═══════════════════════════════════════════════════════════════

class TestCreateStaff:
    def test_pb032_manager_creates_staff(self, client, manager_user, manager_token):
        """PB032: Manager tạo nhân viên thành công"""
        with patch("app.services.user_service.send_new_staff_email"):
            res = client.post(
                "/api/v1/users/staff",
                json={"full_name": "NV Mới", "email": "nv@test.com"},
                headers=auth_header(manager_token["access"]),
            )
        assert res.status_code == 201
        assert res.json()["role"] == "staff"
        assert res.json()["must_change_pw"] == True

    def test_pb032_staff_cannot_create_staff(self, client, staff_user, staff_token):
        """PB032: Staff không tạo được Staff"""
        res = client.post(
            "/api/v1/users/staff",
            json={"full_name": "X", "email": "x@test.com"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 403

    def test_pb033_duplicate_staff_email(self, client, manager_user, staff_user, manager_token):
        """PB033: email trùng khi tạo staff → 409"""
        with patch("app.services.user_service.send_new_staff_email"):
            res = client.post(
                "/api/v1/users/staff",
                json={"full_name": "X", "email": "staff@test.com"},
                headers=auth_header(manager_token["access"]),
            )
        assert res.status_code == 409

    def test_pb034_staff_welcome_email_sent(self, client, manager_user, manager_token):
        """PB034: gửi email chào mừng nhân viên mới"""
        with patch("app.services.user_service.send_welcome_email") as mock:
            client.post(
                "/api/v1/users/staff",
                json={"full_name": "NV", "email": "nv2@test.com"},
                headers=auth_header(manager_token["access"]),
            )
            mock.assert_called_once()


# ═══════════════════════════════════════════════════════════════
# PB035-PB040 — Manager quản lý Staff
# ═══════════════════════════════════════════════════════════════

class TestManageStaff:
    def test_pb035_list_staff_in_dept(self, client, manager_user, staff_user, manager_token):
        """PB035: Manager xem danh sách nhân viên phòng ban"""
        res = client.get("/api/v1/users/staff", headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        emails = [u["email"] for u in res.json()]
        assert "staff@test.com" in emails

    def test_pb036_search_staff_by_name(self, client, manager_user, staff_user, manager_token):
        """PB036: tìm kiếm nhân viên theo tên"""
        res = client.get(
            "/api/v1/users/staff?search=Staff",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_pb037_update_staff_info(self, client, manager_user, staff_user, manager_token):
        """PB037: Manager cập nhật thông tin nhân viên"""
        res = client.patch(
            f"/api/v1/users/staff/{staff_user.id}",
            json={"full_name": "Tên Nhân Viên Mới"},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert res.json()["full_name"] == "Tên Nhân Viên Mới"

    def test_pb038_manager_resets_staff_password(self, client, manager_user, staff_user, manager_token):
        """PB038: Manager reset mật khẩu nhân viên"""
        with patch("app.services.user_service.send_new_staff_email"):
            res = client.post(
                f"/api/v1/users/staff/{staff_user.id}/reset-password",
                headers=auth_header(manager_token["access"]),
            )
        assert res.status_code == 200

    def test_pb038_manager_cannot_reset_other_dept_staff(self, client, db, org, manager_user, manager_token):
        """PB038: Manager không reset được nhân viên phòng ban khác"""
        other_dept = __import__("app.models.organization", fromlist=["Department"]).Department(
            id=uuid.uuid4(), org_id=org.id, name="Phòng Khác"
        )
        db.add(other_dept)
        other_staff = User(
            id=uuid.uuid4(), org_id=org.id, dept_id=other_dept.id,
            full_name="NV Khác", email="other@test.com",
            password_hash="hash", role="staff", is_active=True, must_change_pw=False,
        )
        db.add(other_staff)
        db.commit()

        res = client.post(
            f"/api/v1/users/staff/{other_staff.id}/reset-password",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 403

    def test_pb039_deactivate_staff(self, client, db, manager_user, staff_user, manager_token):
        """PB039: Manager vô hiệu hóa nhân viên"""
        res = client.patch(
            f"/api/v1/users/staff/{staff_user.id}/deactivate",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(staff_user)
        assert staff_user.is_active == False

    def test_pb040_activate_staff(self, client, db, manager_user, staff_user, manager_token):
        """PB040: Manager kích hoạt lại nhân viên"""
        staff_user.is_active = False
        db.commit()

        res = client.patch(
            f"/api/v1/users/staff/{staff_user.id}/activate",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        db.refresh(staff_user)
        assert staff_user.is_active == True


# ═══════════════════════════════════════════════════════════════
# PB041, PB042 — Import hàng loạt từ Excel
# ═══════════════════════════════════════════════════════════════

class TestImportStaff:
    def _make_excel(self, rows: list) -> bytes:
        """Tạo file Excel mẫu trong memory."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Họ và tên (*)", "Email công ty (*)", "Số điện thoại"])
        for row in rows:
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf.read()

    def test_pb041_download_template(self, client, manager_user, manager_token):
        """PB041: tải file Excel template thành công"""
        res = client.get(
            "/api/v1/users/staff/template/download",
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]

    def test_pb042_import_staff_from_excel(self, client, manager_user, manager_token):
        """PB042: import nhân viên từ Excel thành công"""
        data = self._make_excel([
            ["Nguyễn Văn A", "nva@test.com", "0901234567"],
            ["Trần Thị B", "ttb@test.com", ""],
        ])
        with patch("app.services.user_service.send_new_staff_email"):
            res = client.post(
                "/api/v1/users/staff/import",
                files={"file": ("staff.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                headers=auth_header(manager_token["access"]),
            )
        assert res.status_code == 200
        result = res.json()
        assert result["created"] == 2
        assert len(result["errors"]) == 0

    def test_pb042_import_reports_duplicate_email(self, client, manager_user, staff_user, manager_token):
        """PB042: báo lỗi dòng bị trùng email"""
        data = self._make_excel([
            ["Trùng Email", "staff@test.com", ""],  # email đã tồn tại
            ["Hợp lệ", "valid@test.com", ""],
        ])
        with patch("app.services.user_service.send_new_staff_email"):
            res = client.post(
                "/api/v1/users/staff/import",
                files={"file": ("staff.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                headers=auth_header(manager_token["access"]),
            )
        result = res.json()
        assert result["created"] == 1
        assert len(result["errors"]) == 1

    def test_pb042_import_rejects_non_excel(self, client, manager_user, manager_token):
        """PB042: từ chối file không phải Excel"""
        res = client.post(
            "/api/v1/users/staff/import",
            files={"file": ("data.csv", b"name,email\nA,a@b.com", "text/csv")},
            headers=auth_header(manager_token["access"]),
        )
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════
# PB043-PB047 — Profile cá nhân
# ═══════════════════════════════════════════════════════════════

class TestProfile:
    def test_pb043_view_own_profile(self, client, staff_user, staff_token):
        """PB043: xem hồ sơ cá nhân"""
        res = client.get("/api/v1/users/me", headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "staff@test.com"
        assert data["full_name"] == "Staff Test"

    def test_pb044_update_avatar(self, client, staff_user, staff_token):
        """PB044: cập nhật ảnh đại diện"""
        res = client.patch(
            "/api/v1/users/me/avatar",
            json={"avatar_url": "https://cdn.example.com/avatar.jpg"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        assert "avatar.jpg" in res.json()["avatar_url"]

    def test_pb045_update_phone_valid(self, client, staff_user, staff_token):
        """PB045: cập nhật số điện thoại Việt Nam hợp lệ"""
        res = client.patch(
            "/api/v1/users/me/phone",
            json={"phone": "0901234567"},
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200

    def test_pb045_invalid_phone_rejected(self, client, staff_user, staff_token):
        """PB045: SĐT sai định dạng VN → 400"""
        for bad_phone in ["12345", "0112345678", "+1234567890"]:
            res = client.patch(
                "/api/v1/users/me/phone",
                json={"phone": bad_phone},
                headers=auth_header(staff_token["access"]),
            )
            assert res.status_code == 400, f"Phone {bad_phone} should be rejected"

    def test_pb045_valid_phone_formats(self, client, staff_user, staff_token):
        """PB045: các định dạng SĐT VN hợp lệ"""
        for good_phone in ["0901234567", "0341234567", "+84901234567"]:
            res = client.patch(
                "/api/v1/users/me/phone",
                json={"phone": good_phone},
                headers=auth_header(staff_token["access"]),
            )
            assert res.status_code == 200, f"Phone {good_phone} should be accepted"

    def test_pb047_first_login_tracked(self, client, db, staff_user):
        """PB047: ghi nhận thời điểm đăng nhập lần đầu"""
        assert staff_user.first_login_at is None
        client.post("/api/v1/auth/login", json={
            "email": "staff@test.com", "password": "Staff@123456",
        })
        db.refresh(staff_user)
        assert staff_user.first_login_at is not None
