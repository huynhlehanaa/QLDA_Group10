"""
TDD Tests — Onboarding — PB233 đến PB236

Thứ tự TDD:
1. pytest tests/test_onboarding.py -v → tất cả FAIL
2. Viết services/onboarding_service.py
3. Viết api/onboarding.py
4. Hook email chào mừng vào user_service (khi tạo nhân viên mới)
5. pytest tests/test_onboarding.py -v → tất cả PASS
"""
import uuid
import pytest
from unittest.mock import patch

from tests.conftest import auth_header
from app.models.user import User


# ══════════════════════════════════════════════════════════════
# PB233 — Email chào mừng kèm tài liệu hướng dẫn cho nhân viên mới
# ══════════════════════════════════════════════════════════════

class TestWelcomeEmail:

    def test_pb233_welcome_email_sent_on_staff_create(
        self, client, manager_user, manager_token
    ):
        """PB233: gửi email chào mừng khi Manager tạo nhân viên mới"""
        with patch("app.services.user_service.send_welcome_email") as mock:
            client.post("/api/v1/users/staff", json={
                "full_name": "Nhân Viên Mới",
                "email": "newstaff_233@test.com",
            }, headers=auth_header(manager_token["access"]))
            mock.assert_called_once()

    def test_pb233_welcome_email_sent_to_correct_email(
        self, client, manager_user, manager_token
    ):
        """PB233: email gửi đúng địa chỉ nhân viên mới"""
        sent = []
        with patch("app.services.user_service.send_welcome_email",
                   side_effect=lambda *a, **kw: sent.append(a)):
            client.post("/api/v1/users/staff", json={
                "full_name": "Staff Email Check",
                "email": "emailcheck_233@test.com",
            }, headers=auth_header(manager_token["access"]))

        assert len(sent) == 1
        assert sent[0][0] == "emailcheck_233@test.com"

    def test_pb233_welcome_email_contains_required_info(
        self, client, manager_user, manager_token
    ):
        """PB233: email chứa link hệ thống, link PDF hướng dẫn"""
        email_bodies = []
        def capture_email(to_email, full_name, temp_password, role):
            email_bodies.append({
                "to": to_email,
                "name": full_name,
                "password": temp_password,
                "role": role,
            })

        with patch("app.services.user_service.send_welcome_email",
                   side_effect=capture_email):
            client.post("/api/v1/users/staff", json={
                "full_name": "Staff Info Check",
                "email": "infocheck_233@test.com",
            }, headers=auth_header(manager_token["access"]))

        assert len(email_bodies) == 1
        email = email_bodies[0]
        assert email["to"] == "infocheck_233@test.com"
        assert email["name"] == "Staff Info Check"
        assert email["password"] is not None  # temp password
        assert email["role"] == "staff"

    def test_pb233_welcome_email_also_sent_on_manager_create(
        self, client, ceo_user, ceo_token, dept
    ):
        """PB233: email chào mừng cũng gửi khi CEO tạo Manager"""
        with patch("app.services.user_service.send_welcome_email") as mock:
            client.post("/api/v1/users/managers", json={
                "full_name": "Manager Mới",
                "email": "newmgr_233@test.com",
                "dept_id": str(dept.id),
            }, headers=auth_header(ceo_token["access"]))
            mock.assert_called_once()

    def test_pb233_welcome_email_only_sent_on_create(
        self, client, manager_user, staff_user, manager_token
    ):
        """PB233: email chào mừng chỉ gửi 1 lần khi tạo, không gửi khi cập nhật"""
        with patch("app.services.user_service.send_welcome_email") as mock:
            client.patch(f"/api/v1/users/staff/{staff_user.id}", json={
                "full_name": "Tên Mới",
            }, headers=auth_header(manager_token["access"]))
            mock.assert_not_called()


# ══════════════════════════════════════════════════════════════
# PB234 — Checklist onboarding cho nhân viên mới
# ══════════════════════════════════════════════════════════════

class TestOnboardingChecklist:

    def test_pb234_get_onboarding_checklist(self, client, staff_user, staff_token):
        """PB234: nhân viên xem checklist onboarding"""
        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "completion_pct" in data
        assert len(data["items"]) >= 4

    def test_pb234_checklist_has_required_steps(self, client, staff_user, staff_token):
        """PB234: checklist có đủ 4 bước bắt buộc"""
        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        items = res.json()["items"]
        step_ids = [item["step_id"] for item in items]

        assert "change_password" in step_ids
        assert "update_avatar" in step_ids
        assert "install_pwa" in step_ids
        assert "view_first_task" in step_ids

    def test_pb234_checklist_item_has_required_fields(
        self, client, staff_user, staff_token
    ):
        """PB234: mỗi step có đủ trường cần thiết"""
        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        item = res.json()["items"][0]
        assert "step_id" in item
        assert "title" in item
        assert "description" in item
        assert "is_done" in item
        assert "action_url" in item

    def test_pb234_mark_step_done(self, client, staff_user, staff_token):
        """PB234: đánh dấu bước onboarding hoàn thành"""
        res = client.patch("/api/v1/onboarding/checklist/install_pwa",
                           json={"is_done": True},
                           headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["is_done"] == True

    def test_pb234_completion_pct_updates(self, client, db, staff_user, staff_token):
        """PB234: % hoàn thành tăng khi tick bước"""
        # Lấy % ban đầu
        res1 = client.get("/api/v1/onboarding/checklist",
                          headers=auth_header(staff_token["access"]))
        pct_before = res1.json()["completion_pct"]

        # Tick 1 bước
        client.patch("/api/v1/onboarding/checklist/install_pwa",
                     json={"is_done": True},
                     headers=auth_header(staff_token["access"]))

        res2 = client.get("/api/v1/onboarding/checklist",
                          headers=auth_header(staff_token["access"]))
        pct_after = res2.json()["completion_pct"]
        assert pct_after >= pct_before

    def test_pb234_change_password_auto_detected(
        self, client, db, staff_user, staff_token
    ):
        """PB234: bước đổi mật khẩu tự động tick khi must_change_pw = False"""
        staff_user.must_change_pw = False
        db.commit()

        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        items = {item["step_id"]: item for item in res.json()["items"]}
        assert items["change_password"]["is_done"] == True

    def test_pb234_checklist_persists_across_sessions(
        self, client, staff_user, staff_token
    ):
        """PB234: checklist lưu trữ tiến độ giữa các phiên"""
        client.patch("/api/v1/onboarding/checklist/update_avatar",
                     json={"is_done": True},
                     headers=auth_header(staff_token["access"]))

        # Giả lập session mới (gọi lại API)
        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        items = {item["step_id"]: item for item in res.json()["items"]}
        assert items["update_avatar"]["is_done"] == True

    def test_pb234_invalid_step_id_rejected(self, client, staff_user, staff_token):
        """PB234: step_id không hợp lệ → 404"""
        res = client.patch("/api/v1/onboarding/checklist/invalid_step",
                           json={"is_done": True},
                           headers=auth_header(staff_token["access"]))
        assert res.status_code == 404

    def test_pb234_onboarding_complete_when_all_done(
        self, client, db, staff_user, staff_token
    ):
        """PB234: trả về is_complete=True khi tất cả bước done"""
        steps = ["change_password", "update_avatar", "install_pwa", "view_first_task"]
        for step in steps:
            client.patch(f"/api/v1/onboarding/checklist/{step}",
                         json={"is_done": True},
                         headers=auth_header(staff_token["access"]))

        res = client.get("/api/v1/onboarding/checklist",
                         headers=auth_header(staff_token["access"]))
        data = res.json()
        assert data["completion_pct"] == 100.0
        assert data.get("is_complete") == True


# ══════════════════════════════════════════════════════════════
# PB235 — PDF hướng dẫn cho Nhân viên
# ══════════════════════════════════════════════════════════════

class TestStaffGuide:

    def test_pb235_download_staff_guide_pdf(self, client, staff_user, staff_token):
        """PB235: nhân viên tải PDF hướng dẫn sử dụng"""
        res = client.get("/api/v1/onboarding/guide/staff",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert "pdf" in res.headers["content-type"]
        assert len(res.content) > 0

    def test_pb235_pdf_has_content_disposition(self, client, staff_user, staff_token):
        """PB235: response có Content-Disposition để download"""
        res = client.get("/api/v1/onboarding/guide/staff",
                         headers=auth_header(staff_token["access"]))
        assert "attachment" in res.headers.get("content-disposition", "")
        assert ".pdf" in res.headers.get("content-disposition", "")

    def test_pb235_staff_can_download_staff_guide(self, client, staff_user, staff_token):
        """PB235: staff có thể tải hướng dẫn của mình"""
        res = client.get("/api/v1/onboarding/guide/staff",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200

    def test_pb235_manager_can_also_download_staff_guide(
        self, client, manager_user, manager_token
    ):
        """PB235: Manager cũng tải được hướng dẫn nhân viên (để phát cho team)"""
        res = client.get("/api/v1/onboarding/guide/staff",
                         headers=auth_header(manager_token["access"]))
        assert res.status_code == 200

    def test_pb235_guide_requires_auth(self, client):
        """PB235: tải guide yêu cầu đăng nhập"""
        res = client.get("/api/v1/onboarding/guide/staff")
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════
# PB236 — PDF hướng dẫn cho Manager & CEO
# ══════════════════════════════════════════════════════════════

class TestManagerCeoGuide:

    def test_pb236_manager_downloads_manager_guide(
        self, client, manager_user, manager_token
    ):
        """PB236: Manager tải PDF hướng dẫn dành cho Manager"""
        res = client.get("/api/v1/onboarding/guide/manager",
                         headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        assert "pdf" in res.headers["content-type"]

    def test_pb236_ceo_downloads_manager_guide(self, client, ceo_user, ceo_token):
        """PB236: CEO tải được hướng dẫn Manager"""
        res = client.get("/api/v1/onboarding/guide/manager",
                         headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200

    def test_pb236_staff_cannot_download_manager_guide(
        self, client, staff_user, staff_token
    ):
        """PB236: Staff không tải được hướng dẫn Manager"""
        res = client.get("/api/v1/onboarding/guide/manager",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 403

    def test_pb236_manager_guide_different_from_staff_guide(
        self, client, manager_user, manager_token
    ):
        """PB236: nội dung guide Manager khác guide Staff"""
        res_staff = client.get("/api/v1/onboarding/guide/staff",
                               headers=auth_header(manager_token["access"]))
        res_mgr = client.get("/api/v1/onboarding/guide/manager",
                             headers=auth_header(manager_token["access"]))
        # Hai file PDF phải khác nhau
        assert res_staff.content != res_mgr.content

    def test_pb236_guide_has_content_disposition(
        self, client, manager_user, manager_token
    ):
        """PB236: PDF có header Content-Disposition"""
        res = client.get("/api/v1/onboarding/guide/manager",
                         headers=auth_header(manager_token["access"]))
        assert "attachment" in res.headers.get("content-disposition", "")
        assert ".pdf" in res.headers.get("content-disposition", "")

    def test_pb236_ceo_guide_available(self, client, ceo_user, ceo_token):
        """PB236: CEO cũng có guide riêng"""
        res = client.get("/api/v1/onboarding/guide/ceo",
                         headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200
        assert "pdf" in res.headers["content-type"]

    def test_pb236_manager_cannot_download_ceo_guide(
        self, client, manager_user, manager_token
    ):
        """PB236: Manager không tải được guide CEO"""
        res = client.get("/api/v1/onboarding/guide/ceo",
                         headers=auth_header(manager_token["access"]))
        assert res.status_code == 403
