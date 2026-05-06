"""
Auth service: PB001-PB015
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import redis as redis_client
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    generate_otp,
    hash_password,
    verify_password,
    validate_password_strength,
)
from app.models.user import LoginLog, User
from app.services.email_service import (
    send_account_locked_email,
    send_otp_email,
    send_reset_password_email,
)

# Redis key prefixes
_REFRESH_PREFIX = "refresh:"
_BLACKLIST_PREFIX = "bl:"
_OTP_PREFIX = "otp:"
_OTP_LOCK_PREFIX = "otplk:"


def _r():
    """Lazy Redis connection — cho phép mock trong test."""
    return redis_client.from_url(settings.REDIS_URL, decode_responses=True)


def _log(db: Session, user_id: Optional[UUID], email: str, success: bool, request: Request):
    """PB013, PB014"""
    log = LoginLog(
        user_id=user_id,
        email_attempted=email,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", ""),
        success=success,
    )
    db.add(log)
    db.commit()


def login(email: str, password: str, db: Session, request: Request) -> dict:
    """PB001, PB002, PB003, PB012, PB013, PB014, PB019"""
    now = datetime.now(timezone.utc)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        _log(db, None, email, False, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "EMAIL_NOT_FOUND", "message": "Email không tồn tại trong hệ thống"},
        )

    locked_until = user.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and locked_until > now:
        remaining = int((locked_until - now).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_LOCKED", "message": f"Tài khoản bị khóa. Thử lại sau {remaining} phút"},
        )

    if not verify_password(password, user.password_hash):
        user.failed_login_count += 1

        if user.failed_login_count >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.commit()
            _log(db, user.id, email, False, request)
            send_account_locked_email(user.email, user.full_name, settings.LOCKOUT_MINUTES)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ACCOUNT_LOCKED",
                    "message": f"Tài khoản bị khóa {settings.LOCKOUT_MINUTES} phút do nhập sai quá 5 lần",
                },
            )

        db.commit()
        _log(db, user.id, email, False, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "WRONG_PASSWORD",
                "message": f"Sai mật khẩu. Còn {settings.MAX_LOGIN_ATTEMPTS - user.failed_login_count} lần thử",
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Tài khoản đã bị vô hiệu hóa"},
        )

    user.failed_login_count = 0
    user.locked_until = None
    if not user.first_login_at:
        user.first_login_at = now

    db.commit()
    _log(db, user.id, email, True, request)

    payload = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    _r().setex(
        f"{_REFRESH_PREFIX}{refresh_token}",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        str(user.id),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "must_change_pw": user.must_change_pw,
        "user_id": str(user.id),
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
    }


def refresh_token(token: str) -> dict:
    """PB012"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token không hợp lệ")

    stored = _r().get(f"{_REFRESH_PREFIX}{token}")
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token đã hết hạn hoặc bị thu hồi")

    new_access = create_access_token({"sub": payload["sub"], "role": payload["role"]})
    new_refresh = create_refresh_token({"sub": payload["sub"], "role": payload["role"]})

    _r().delete(f"{_REFRESH_PREFIX}{token}")
    _r().setex(
        f"{_REFRESH_PREFIX}{new_refresh}",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        stored,
    )

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


def logout(refresh_token: str):
    """PB005"""
    _r().delete(f"{_REFRESH_PREFIX}{refresh_token}")


def logout_all(user_id: str):
    """PB006"""
    keys = _r().keys(f"{_REFRESH_PREFIX}*")
    for key in keys:
        if _r().get(key) == user_id:
            _r().delete(key)


def forgot_password(email: str, db: Session):
    """PB007"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return

    token = create_reset_token(str(user.id))
    _r().setex(f"reset:{token}", timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES), str(user.id))

    reset_link = f"{settings.APP_URL}/reset-password?token={token}"
    send_reset_password_email(user.email, reset_link)


def reset_password(token: str, new_password: str, db: Session):
    """PB008"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Link reset không hợp lệ hoặc đã hết hạn")

    stored = _r().get(f"reset:{token}")
    if not stored:
        raise HTTPException(status_code=400, detail="Link reset đã được sử dụng hoặc hết hạn")

    ok, msg = validate_password_strength(new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    user_id = UUID(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ")

    user.password_hash = hash_password(new_password)
    user.must_change_pw = False
    _r().delete(f"reset:{token}")
    db.commit()

    logout_all(str(user.id))


def change_password(user: User, old_password: str, new_password: str, db: Session):
    """PB009"""
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

    ok, msg = validate_password_strength(new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ")

    user.password_hash = hash_password(new_password)
    user.must_change_pw = False
    db.commit()

    logout_all(str(user.id))


def send_otp(email: str, db: Session):
    """PB011"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email không tồn tại")

    if _r().get(f"{_OTP_LOCK_PREFIX}{email}"):
        raise HTTPException(status_code=429, detail="Vui lòng chờ 60 giây trước khi gửi lại OTP")

    otp = generate_otp()
    _r().setex(f"{_OTP_PREFIX}{email}", timedelta(minutes=settings.OTP_EXPIRE_MINUTES), otp)
    _r().setex(f"{_OTP_LOCK_PREFIX}{email}", 60, "1")

    send_otp_email(user.email, user.full_name, otp)


def verify_otp(email: str, otp: str, db: Session) -> dict:
    """PB011"""
    stored_otp = _r().get(f"{_OTP_PREFIX}{email}")
    if not stored_otp or stored_otp != otp:
        raise HTTPException(status_code=400, detail="OTP không hợp lệ hoặc đã hết hạn")

    _r().delete(f"{_OTP_PREFIX}{email}")

    user = db.query(User).filter(User.email == email).first()
    payload = {"sub": str(user.id), "role": user.role}
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }