from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    OTPResendRequest,
    OTPVerifyRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """PB001, PB002, PB003, PB012, PB013, PB014, PB019"""
    return auth_service.login(body.email, body.password, db, request)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
    """PB012: refresh access token"""
    return auth_service.refresh_token(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest, _: User = Depends(get_current_user)):
    """PB005: đăng xuất thiết bị hiện tại"""
    auth_service.logout(body.refresh_token)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(current_user: User = Depends(get_current_user)):
    """PB006: đăng xuất tất cả thiết bị"""
    auth_service.logout_all(str(current_user.id))


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """PB007"""
    auth_service.forgot_password(body.email, db)
    return {"message": "Nếu email tồn tại, link reset đã được gửi"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """PB008"""
    auth_service.reset_password(body.token, body.new_password, db)
    return {"message": "Đặt lại mật khẩu thành công"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB009"""
    auth_service.change_password(current_user, body.old_password, body.new_password, db)
    return {"message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."}


@router.post("/otp/send", status_code=status.HTTP_200_OK)
def send_otp(body: OTPResendRequest, db: Session = Depends(get_db)):
    """PB011: gửi OTP"""
    auth_service.send_otp(body.email, db)
    return {"message": "OTP đã được gửi đến email của bạn"}


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(body: OTPVerifyRequest, db: Session = Depends(get_db)):
    """PB011: xác thực OTP"""
    return auth_service.verify_otp(body.email, body.otp, db)
