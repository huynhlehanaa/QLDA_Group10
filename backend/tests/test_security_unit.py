"""
Unit test thuần — không cần database, test các hàm security độc lập.
Chạy nhanh, không có side effect.
"""
import pytest
import time
from app.core.security import (
    hash_password, verify_password,
    validate_password_strength,
    generate_temp_password,
    create_access_token, create_refresh_token, decode_token,
    generate_otp,
    encrypt_sensitive, decrypt_sensitive,
)


class TestHashPassword:
    def test_hash_is_not_plaintext(self):
        assert hash_password("Secret@1") != "Secret@1"

    def test_verify_correct(self):
        h = hash_password("Secret@1")
        assert verify_password("Secret@1", h) is True

    def test_verify_wrong(self):
        h = hash_password("Secret@1")
        assert verify_password("Wrong@999", h) is False

    def test_same_password_different_hash(self):
        """bcrypt tự sinh salt → mỗi lần hash khác nhau"""
        h1 = hash_password("Same@123")
        h2 = hash_password("Same@123")
        assert h1 != h2
        assert verify_password("Same@123", h1)
        assert verify_password("Same@123", h2)


class TestPasswordStrength:
    @pytest.mark.parametrize("pw,expected_ok", [
        ("Valid@123",      True),
        ("A1!aaaaa",       True),
        ("short@1",        False),   # < 8 ký tự
        ("nouppercase@1",  False),   # không có chữ hoa
        ("NoDigit@abc",    False),   # không có số
        ("NoSpecial1A",    False),   # không có ký tự đặc biệt
        ("",               False),
    ])
    def test_strength_cases(self, pw, expected_ok):
        ok, _ = validate_password_strength(pw)
        assert ok == expected_ok


class TestGenerateTempPassword:
    def test_temp_password_meets_requirements(self):
        for _ in range(20):  # test 20 lần vì có random
            pw = generate_temp_password()
            ok, msg = validate_password_strength(pw)
            assert ok, f"Temp password '{pw}' failed: {msg}"

    def test_temp_password_length(self):
        pw = generate_temp_password()
        assert len(pw) >= 12


class TestJWTTokens:
    def test_access_token_decode(self):
        token = create_access_token({"sub": "user-123", "role": "ceo"})
        payload = decode_token(token)
        assert payload["sub"] == "user-123"
        assert payload["role"] == "ceo"
        assert payload["type"] == "access"

    def test_refresh_token_type(self):
        token = create_refresh_token({"sub": "user-123", "role": "manager"})
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "user-123", "role": "ceo"})
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None

    def test_random_string_returns_none(self):
        assert decode_token("not.a.token") is None

    def test_empty_string_returns_none(self):
        assert decode_token("") is None

    def test_access_cannot_be_used_as_refresh(self):
        token = create_access_token({"sub": "u", "role": "staff"})
        payload = decode_token(token)
        assert payload["type"] == "access"
        assert payload["type"] != "refresh"


class TestOTP:
    def test_otp_is_6_digits(self):
        for _ in range(10):
            otp = generate_otp()
            assert len(otp) == 6
            assert otp.isdigit()

    def test_otps_are_random(self):
        otps = {generate_otp() for _ in range(20)}
        # Với 20 lần sinh, ít nhất phải có 5 giá trị khác nhau
        assert len(otps) >= 5


class TestAES256:
    def test_encrypt_decrypt_roundtrip(self):
        cases = [
            "KPI score: 95.5",
            "Thông tin nhạy cảm tiếng Việt",
            "123",
            "a" * 100,
        ]
        for plaintext in cases:
            encrypted = encrypt_sensitive(plaintext)
            assert decrypt_sensitive(encrypted) == plaintext

    def test_encrypted_is_hex_string(self):
        encrypted = encrypt_sensitive("test data")
        # Kết quả phải là hex string hợp lệ
        bytes.fromhex(encrypted)  # không raise = OK

    def test_different_ciphertext_same_plaintext(self):
        plain = "same input"
        results = {encrypt_sensitive(plain) for _ in range(5)}
        assert len(results) > 1  # random IV tạo ra kết quả khác nhau

    def test_encrypt_empty_string(self):
        encrypted = encrypt_sensitive("")
        assert decrypt_sensitive(encrypted) == ""
