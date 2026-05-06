from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    """PB001"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    must_change_pw: bool
    user_id: str
    full_name: str
    avatar_url: Optional[str] = None


class RefreshRequest(BaseModel):
    """PB012"""
    refresh_token: str


class LogoutRequest(BaseModel):
    """PB005: đăng xuất thiết bị hiện tại"""
    refresh_token: str


class LogoutAllRequest(BaseModel):
    """PB006: đăng xuất tất cả thiết bị"""
    pass


class ForgotPasswordRequest(BaseModel):
    """PB007"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """PB008"""
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_pw(cls, v):
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        if not any(c.isupper() for c in v):
            raise ValueError("Phải có ít nhất 1 chữ hoa")
        if not any(c.isdigit() for c in v):
            raise ValueError("Phải có ít nhất 1 chữ số")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Phải có ít nhất 1 ký tự đặc biệt")
        return v


class ChangePasswordRequest(BaseModel):
    """PB009"""
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_pw(cls, v):
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        if not any(c.isupper() for c in v):
            raise ValueError("Phải có ít nhất 1 chữ hoa")
        if not any(c.isdigit() for c in v):
            raise ValueError("Phải có ít nhất 1 chữ số")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Phải có ít nhất 1 ký tự đặc biệt")
        return v


class OTPVerifyRequest(BaseModel):
    """PB011"""
    email: EmailStr
    otp: str


class OTPResendRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
