"""
Test Bảo mật & Xác thực — PB001 đến PB021
"""
import time
import pytest
from unittest.mock import patch

from tests.conftest import auth_header, get_token
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_otp,
    create_access_token,
    create_refresh_token,
    decode_token,
    encrypt_sensitive,
    decrypt_sensitive,
)
from app.models.user import User


# ═══════════════════════════════════════════════════════════════
# PB001 — Đăng nhập bằng email và mật khẩu
# ═══════════════════════════════════════════════════════════════

class TestLogin:
    def test_pb001_login_success(self, client, ceo_user):
        """PB001: đăng nhập thành công trả về access_token và role"""
        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com",
            "password": "Ceo@123456",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["role"] == "ceo"
        assert data["token_type"] == "bearer"

    def test_pb001_login_invalid_email_format(self, client):
        """PB001: validate định dạng email trước khi gửi request"""
        res = client.post("/api/v1/auth/login", json={
            "email": "not-an-email",
            "password": "Abc@12345",
        })
        assert res.status_code == 422  # Pydantic validation error

    def test_pb001_login_missing_fields(self, client):
        """PB001: thiếu password trả về 422"""
        res = client.post("/api/v1/auth/login", json={"email": "ceo@test.com"})
        assert res.status_code == 422


# ═══════════════════════════════════════════════════════════════
# PB002 — Hiển thị lỗi đăng nhập cụ thể
# ═══════════════════════════════════════════════════════════════

class TestLoginErrors:
    def test_pb002_email_not_found(self, client, ceo_user):
        """PB002: email không tồn tại → code EMAIL_NOT_FOUND"""
        res = client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "Abc@12345",
        })
        assert res.status_code == 401
        assert res.json()["detail"]["code"] == "EMAIL_NOT_FOUND"

    def test_pb002_wrong_password(self, client, ceo_user):
        """PB002: sai mật khẩu → code WRONG_PASSWORD"""
        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com",
            "password": "WrongPass@1",
        })
        assert res.status_code == 401
        assert res.json()["detail"]["code"] == "WRONG_PASSWORD"

    def test_pb002_account_disabled(self, client, db, ceo_user):
        """PB002: tài khoản bị vô hiệu hóa → code ACCOUNT_DISABLED"""
        ceo_user.is_active = False
        db.commit()
        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com",
            "password": "Ceo@123456",
        })
        assert res.status_code == 403
        assert res.json()["detail"]["code"] == "ACCOUNT_DISABLED"


# ═══════════════════════════════════════════════════════════════
# PB003 — Khóa tài khoản sau 5 lần sai mật khẩu
# ═══════════════════════════════════════════════════════════════

class TestAccountLockout:
    def test_pb003_lock_after_5_failures(self, client, db, ceo_user):
        """PB003: khóa tài khoản sau 5 lần nhập sai"""
        with patch("app.services.auth_service.send_account_locked_email"):
            for i in range(4):
                res = client.post("/api/v1/auth/login", json={
                    "email": "ceo@test.com", "password": "Wrong@123",
                })
                assert res.status_code == 401

            # Lần thứ 5 → bị khóa
            res = client.post("/api/v1/auth/login", json={
                "email": "ceo@test.com", "password": "Wrong@123",
            })
            assert res.status_code == 403
            assert res.json()["detail"]["code"] == "ACCOUNT_LOCKED"

    def test_pb003_locked_account_cannot_login(self, client, db, ceo_user):
        """PB003: tài khoản đang bị khóa không thể đăng nhập dù đúng mật khẩu"""
        from datetime import datetime, timedelta, timezone
        ceo_user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        ceo_user.failed_login_count = 5
        db.commit()

        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })
        assert res.status_code == 403
        assert res.json()["detail"]["code"] == "ACCOUNT_LOCKED"

    def test_pb003_failed_count_reset_on_success(self, client, db, ceo_user):
        """PB003: đăng nhập thành công reset failed_count về 0"""
        ceo_user.failed_login_count = 3
        db.commit()

        client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })

        db.refresh(ceo_user)
        assert ceo_user.failed_login_count == 0

    def test_pb003_send_lock_email(self, client, db, ceo_user):
        """PB003: gửi email cảnh báo khi bị khóa"""
        with patch("app.services.auth_service.send_account_locked_email") as mock_email:
            for _ in range(5):
                client.post("/api/v1/auth/login", json={
                    "email": "ceo@test.com", "password": "Wrong@123",
                })
            mock_email.assert_called_once()


# ═══════════════════════════════════════════════════════════════
# PB005 — Đăng xuất thiết bị hiện tại
# ═══════════════════════════════════════════════════════════════

class TestLogout:
    def test_pb005_logout_current_device(self, client, ceo_user):
        """PB005: đăng xuất xóa refresh token"""
        tokens = get_token(client, "ceo@test.com", "Ceo@123456")

        res = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh"]},
            headers=auth_header(tokens["access"]),
        )
        assert res.status_code == 204

    def test_pb005_refresh_fails_after_logout(self, client, ceo_user):
        """PB005: sau đăng xuất, refresh token không dùng được nữa"""
        tokens = get_token(client, "ceo@test.com", "Ceo@123456")

        client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh"]},
            headers=auth_header(tokens["access"]),
        )

        res = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh"]})
        assert res.status_code == 401


# ═══════════════════════════════════════════════════════════════
# PB006 — Đăng xuất tất cả thiết bị
# ═══════════════════════════════════════════════════════════════

class TestLogoutAll:
    def test_pb006_logout_all_devices(self, client, ceo_user):
        """PB006: đăng xuất tất cả — tất cả refresh token đều bị hủy"""
        tokens1 = get_token(client, "ceo@test.com", "Ceo@123456")
        tokens2 = get_token(client, "ceo@test.com", "Ceo@123456")

        res = client.post(
            "/api/v1/auth/logout-all",
            headers=auth_header(tokens1["access"]),
        )
        assert res.status_code == 204

        # Cả 2 refresh token đều không dùng được
        r1 = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens1["refresh"]})
        r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens2["refresh"]})
        assert r1.status_code == 401
        assert r2.status_code == 401


# ═══════════════════════════════════════════════════════════════
# PB007, PB008 — Reset mật khẩu qua email
# ═══════════════════════════════════════════════════════════════

class TestPasswordReset:
    def test_pb007_forgot_password_sends_email(self, client, ceo_user):
        """PB007: gửi link reset qua email"""
        with patch("app.services.auth_service.send_reset_password_email") as mock:
            res = client.post("/api/v1/auth/forgot-password", json={"email": "ceo@test.com"})
            assert res.status_code == 202
            mock.assert_called_once()

    def test_pb007_forgot_password_unknown_email(self, client):
        """PB007: email không tồn tại vẫn trả về 202 (không tiết lộ)"""
        res = client.post("/api/v1/auth/forgot-password", json={"email": "ghost@test.com"})
        assert res.status_code == 202

    def test_pb008_reset_password_success(self, client, db, ceo_user):
        """PB008: đặt lại mật khẩu mới thành công"""
        from app.core.security import create_reset_token
        import redis as r_lib
        from app.core.config import settings

        token = create_reset_token(str(ceo_user.id))
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"reset:{token}", 300, str(ceo_user.id))

        res = client.post("/api/v1/auth/reset-password", json={
            "token": token,
            "new_password": "NewPass@789",
        })
        assert res.status_code == 200

        # Đăng nhập bằng mật khẩu mới
        login_res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com",
            "password": "NewPass@789",
        })
        assert login_res.status_code == 200

    def test_pb008_reset_token_single_use(self, client, db, ceo_user):
        """PB008: token chỉ dùng được 1 lần"""
        from app.core.security import create_reset_token
        import redis as r_lib
        from app.core.config import settings

        token = create_reset_token(str(ceo_user.id))
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"reset:{token}", 300, str(ceo_user.id))

        client.post("/api/v1/auth/reset-password", json={
            "token": token, "new_password": "NewPass@789",
        })

        # Dùng lại lần 2 → thất bại
        res2 = client.post("/api/v1/auth/reset-password", json={
            "token": token, "new_password": "AnotherPass@1",
        })
        assert res2.status_code == 400

    def test_pb008_password_must_not_match_old(self, client, db, ceo_user):
        """PB008: mật khẩu mới không được trùng mật khẩu cũ"""
        from app.core.security import create_reset_token
        import redis as r_lib
        from app.core.config import settings

        token = create_reset_token(str(ceo_user.id))
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"reset:{token}", 300, str(ceo_user.id))

        res = client.post("/api/v1/auth/reset-password", json={
            "token": token,
            "new_password": "Ceo@123456",   # trùng mật khẩu cũ
        })
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════
# PB009 — Đổi mật khẩu khi đang đăng nhập
# ═══════════════════════════════════════════════════════════════

class TestChangePassword:
    def test_pb009_change_password_success(self, client, ceo_user, ceo_token):
        """PB009: đổi mật khẩu thành công"""
        res = client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "Ceo@123456", "new_password": "NewCeo@789"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 200

    def test_pb009_wrong_old_password(self, client, ceo_user, ceo_token):
        """PB009: mật khẩu cũ sai → 400"""
        res = client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "Wrong@123", "new_password": "NewCeo@789"},
            headers=auth_header(ceo_token["access"]),
        )
        assert res.status_code == 400

    def test_pb009_logout_all_after_change(self, client, ceo_user, ceo_token):
        """PB009: đổi mật khẩu → tất cả thiết bị bị đăng xuất"""
        client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "Ceo@123456", "new_password": "NewCeo@789"},
            headers=auth_header(ceo_token["access"]),
        )
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": ceo_token["refresh"]})
        assert res.status_code == 401


# ═══════════════════════════════════════════════════════════════
# PB011 — Xác thực hai yếu tố (2FA) OTP
# ═══════════════════════════════════════════════════════════════

class TestOTP:
    def test_pb011_send_otp(self, client, ceo_user):
        """PB011: gửi OTP 6 số"""
        with patch("app.services.auth_service.send_otp_email") as mock:
            res = client.post("/api/v1/auth/otp/send", json={"email": "ceo@test.com"})
            assert res.status_code == 200
            mock.assert_called_once()

    def test_pb011_otp_resend_cooldown(self, client, ceo_user):
        """PB011: không gửi lại OTP trong vòng 60 giây"""
        with patch("app.services.auth_service.send_otp_email"):
            client.post("/api/v1/auth/otp/send", json={"email": "ceo@test.com"})
            res = client.post("/api/v1/auth/otp/send", json={"email": "ceo@test.com"})
            assert res.status_code == 429

    def test_pb011_verify_otp_success(self, client, ceo_user):
        """PB011: xác thực OTP đúng → nhận token"""
        import redis as r_lib
        from app.core.config import settings
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"otp:ceo@test.com", 300, "123456")

        res = client.post("/api/v1/auth/otp/verify", json={
            "email": "ceo@test.com", "otp": "123456",
        })
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_pb011_verify_wrong_otp(self, client, ceo_user):
        """PB011: OTP sai → 400"""
        import redis as r_lib
        from app.core.config import settings
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"otp:ceo@test.com", 300, "123456")

        res = client.post("/api/v1/auth/otp/verify", json={
            "email": "ceo@test.com", "otp": "000000",
        })
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════
# PB012 — JWT Token
# ═══════════════════════════════════════════════════════════════

class TestJWT:
    def test_pb012_access_token_contains_role(self, ceo_user):
        """PB012: access token chứa role"""
        token = create_access_token({"sub": str(ceo_user.id), "role": "ceo"})
        payload = decode_token(token)
        assert payload["role"] == "ceo"
        assert payload["type"] == "access"

    def test_pb012_refresh_token_type(self, ceo_user):
        """PB012: refresh token có type=refresh"""
        token = create_refresh_token({"sub": str(ceo_user.id), "role": "ceo"})
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_pb012_refresh_returns_new_tokens(self, client, ceo_user):
        """PB012: refresh trả về access token mới"""
        tokens = get_token(client, "ceo@test.com", "Ceo@123456")
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh"]})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["access_token"] != tokens["access"]  # token mới khác token cũ

    def test_pb012_invalid_token_rejected(self, client, ceo_user):
        """PB012: token giả mạo bị từ chối"""
        res = client.get("/api/v1/users/me", headers={"Authorization": "Bearer fake.token.here"})
        assert res.status_code == 401


# ═══════════════════════════════════════════════════════════════
# PB013, PB014 — Ghi log đăng nhập
# ═══════════════════════════════════════════════════════════════

class TestLoginLogs:
    def test_pb013_log_successful_login(self, client, db, ceo_user):
        """PB013: ghi log khi đăng nhập thành công"""
        from app.models.user import LoginLog
        client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })
        log = db.query(LoginLog).filter(LoginLog.success == True).first()
        assert log is not None
        assert log.user_id == ceo_user.id

    def test_pb014_log_failed_login(self, client, db, ceo_user):
        """PB014: ghi log khi đăng nhập thất bại"""
        from app.models.user import LoginLog
        client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "WrongPass@1",
        })
        log = db.query(LoginLog).filter(LoginLog.success == False).first()
        assert log is not None

    def test_pb014_log_nonexistent_email(self, client, db):
        """PB014: log cả email không tồn tại"""
        from app.models.user import LoginLog
        client.post("/api/v1/auth/login", json={
            "email": "ghost@test.com", "password": "Abc@12345",
        })
        log = db.query(LoginLog).filter(
            LoginLog.email_attempted == "ghost@test.com"
        ).first()
        assert log is not None
        assert log.success == False


# ═══════════════════════════════════════════════════════════════
# PB015 — Mã hóa dữ liệu nhạy cảm AES-256
# ═══════════════════════════════════════════════════════════════

class TestEncryption:
    def test_pb015_bcrypt_password(self):
        """PB015: mật khẩu được hash bằng bcrypt"""
        hashed = hash_password("Test@12345")
        assert hashed != "Test@12345"
        assert verify_password("Test@12345", hashed)

    def test_pb015_bcrypt_wrong_password(self):
        """PB015: sai mật khẩu không verify được"""
        hashed = hash_password("Test@12345")
        assert not verify_password("Wrong@123", hashed)

    def test_pb015_aes256_encrypt_decrypt(self):
        """PB015: AES-256 mã hóa và giải mã đúng"""
        plaintext = "KPI score: 95.5"
        encrypted = encrypt_sensitive(plaintext)
        assert encrypted != plaintext
        assert decrypt_sensitive(encrypted) == plaintext

    def test_pb015_aes256_different_ciphertext_each_time(self):
        """PB015: mỗi lần mã hóa ra kết quả khác nhau (random IV)"""
        plaintext = "sensitive data"
        enc1 = encrypt_sensitive(plaintext)
        enc2 = encrypt_sensitive(plaintext)
        assert enc1 != enc2  # IV khác nhau


# ═══════════════════════════════════════════════════════════════
# PB016, PB017, PB018 — Phân quyền
# ═══════════════════════════════════════════════════════════════

class TestPermissions:
    def test_pb016_ceo_can_access_logs(self, client, ceo_user, ceo_token):
        """PB016: CEO xem được login logs"""
        res = client.get("/api/v1/logs/login", headers=auth_header(ceo_token["access"]))
        assert res.status_code == 200

    def test_pb017_manager_cannot_access_logs(self, client, manager_user, manager_token):
        """PB017: Manager không xem được log (chỉ CEO)"""
        res = client.get("/api/v1/logs/login", headers=auth_header(manager_token["access"]))
        assert res.status_code == 403

    def test_pb018_staff_cannot_access_logs(self, client, staff_user, staff_token):
        """PB018: Staff không xem được log"""
        res = client.get("/api/v1/logs/login", headers=auth_header(staff_token["access"]))
        assert res.status_code == 403

    def test_pb018_staff_can_access_own_profile(self, client, staff_user, staff_token):
        """PB018: Staff xem được profile của mình"""
        res = client.get("/api/v1/users/me", headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["email"] == "staff@test.com"

    def test_unauthenticated_rejected(self, client):
        """Không có token → 401 hoặc 403"""
        res = client.get("/api/v1/users/me")
        assert res.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# PB019 — Redirect sau đăng nhập theo vai trò
# ═══════════════════════════════════════════════════════════════

class TestRoleRedirect:
    def test_pb019_login_returns_role_ceo(self, client, ceo_user):
        """PB019: CEO nhận role=ceo để frontend redirect đúng"""
        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })
        assert res.json()["role"] == "ceo"

    def test_pb019_login_returns_role_manager(self, client, manager_user):
        """PB019: Manager nhận role=manager"""
        res = client.post("/api/v1/auth/login", json={
            "email": "manager@test.com", "password": "Mgr@123456",
        })
        assert res.json()["role"] == "manager"

    def test_pb019_login_returns_role_staff(self, client, staff_user):
        """PB019: Staff nhận role=staff"""
        res = client.post("/api/v1/auth/login", json={
            "email": "staff@test.com", "password": "Staff@123456",
        })
        assert res.json()["role"] == "staff"


# ═══════════════════════════════════════════════════════════════
# PB008 — Validate độ mạnh mật khẩu
# ═══════════════════════════════════════════════════════════════

class TestPasswordValidation:
    def test_password_too_short(self):
        ok, msg = validate_password_strength("Ab@1")
        assert not ok
        assert "8 ký tự" in msg

    def test_password_no_uppercase(self):
        ok, msg = validate_password_strength("abcd@1234")
        assert not ok
        assert "chữ hoa" in msg

    def test_password_no_digit(self):
        ok, msg = validate_password_strength("Abcdefg@")
        assert not ok
        assert "chữ số" in msg

    def test_password_no_special_char(self):
        ok, msg = validate_password_strength("Abcdefg1")
        assert not ok
        assert "đặc biệt" in msg

    def test_password_valid(self):
        ok, msg = validate_password_strength("Valid@123")
        assert ok

    def test_reset_password_weak_rejected(self, client, db, ceo_user):
        """PB008: mật khẩu yếu bị từ chối khi reset"""
        from app.core.security import create_reset_token
        import redis as r_lib
        from app.core.config import settings

        token = create_reset_token(str(ceo_user.id))
        r = r_lib.from_url(settings.REDIS_URL, decode_responses=True)
        r.setex(f"reset:{token}", 300, str(ceo_user.id))

        res = client.post("/api/v1/auth/reset-password", json={
            "token": token,
            "new_password": "weakpass",  # không đủ điều kiện
        })
        assert res.status_code == 422  # Pydantic validator


# ═══════════════════════════════════════════════════════════════
# PB010 — Bắt buộc đổi mật khẩu lần đầu
# ═══════════════════════════════════════════════════════════════

class TestMustChangePassword:
    def test_pb010_must_change_pw_flag(self, client, db, ceo_user):
        """PB010: must_change_pw=True trả về trong response đăng nhập"""
        ceo_user.must_change_pw = True
        db.commit()

        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })
        assert res.json()["must_change_pw"] == True

    def test_pb010_flag_cleared_after_change(self, client, db, ceo_user, ceo_token):
        """PB010: sau khi đổi mật khẩu, must_change_pw = False"""
        ceo_user.must_change_pw = True
        db.commit()

        client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "Ceo@123456", "new_password": "NewCeo@789"},
            headers=auth_header(ceo_token["access"]),
        )

        db.refresh(ceo_user)
        assert ceo_user.must_change_pw == False


# ═══════════════════════════════════════════════════════════════
# PB020, PB021 — Profile sau đăng nhập
# ═══════════════════════════════════════════════════════════════

class TestProfileAfterLogin:
    def test_pb020_login_returns_full_name_and_avatar(self, client, ceo_user):
        """PB020: đăng nhập trả về full_name và avatar_url"""
        res = client.post("/api/v1/auth/login", json={
            "email": "ceo@test.com", "password": "Ceo@123456",
        })
        data = res.json()
        assert data["full_name"] == "CEO Test"
        assert "avatar_url" in data
