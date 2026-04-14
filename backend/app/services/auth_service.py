"""
Auth service: PB001-PB015
- Đăng nhập, phân biệt lỗi cụ thể (PB001, PB002)
- Khóa sau 5 lần sai (PB003)
- Refresh token (PB012)
- Đăng xuất thiết bị / tất cả (PB005, PB006)
- Reset mật khẩu (PB007, PB008)
- Đổi mật khẩu (PB009)
- OTP 2FA (PB011)
- Ghi login log (PB013, PB014)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
import logging

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

r = redis_client.from_url(settings.REDIS_URL, decode_responses=True)
logger = logging.getLogger(__name__)

# Redis key prefixes
_REFRESH_PREFIX = "refresh:"     # refresh:<token> = user_id
_BLACKLIST_PREFIX = "bl:"        # bl:<token> = "1"
_OTP_PREFIX = "otp:"             # otp:<email> = otp_code
_OTP_LOCK_PREFIX = "otplk:"      # resend cooldown 60s


def _redis_unavailable_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "CACHE_UNAVAILABLE",
            "message": "Dịch vụ phiên tạm thời không khả dụng. Vui lòng thử lại.",
        },
    )


def _redis_setex(key: str, ttl, value: str):
    try:
        r.setex(key, ttl, value)
    except redis_client.RedisError as exc:
        logger.exception("Redis setex failed for key=%s", key)
        raise _redis_unavailable_error() from exc


def _redis_get(key: str) -> Optional[str]:
    try:
        return r.get(key)
    except redis_client.RedisError as exc:
        logger.exception("Redis get failed for key=%s", key)
        raise _redis_unavailable_error() from exc


def _redis_delete(key: str):
    try:
        r.delete(key)
    except redis_client.RedisError as exc:
        logger.exception("Redis delete failed for key=%s", key)
        raise _redis_unavailable_error() from exc


def _redis_keys(pattern: str) -> list[str]:
    try:
        return r.keys(pattern)
    except redis_client.RedisError as exc:
        logger.exception("Redis keys failed for pattern=%s", pattern)
        raise _redis_unavailable_error() from exc


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

    # PB002: email không tồn tại
    user = db.query(User).filter(User.email == email).first()
    if not user:
        _log(db, None, email, False, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "EMAIL_NOT_FOUND", "message": "Email không tồn tại trong hệ thống"},
        )

    # SQLite có thể trả về datetime naive dù cột khai báo timezone=True.
    locked_until = user.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    # PB002: tài khoản bị khóa
    if locked_until and locked_until > now:
        remaining = int((locked_until - now).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_LOCKED", "message": f"Tài khoản bị khóa. Thử lại sau {remaining} phút"},
        )

    # PB002: sai mật khẩu
    if not verify_password(password, user.password_hash):
        user.failed_login_count += 1

        # PB003: khóa sau 5 lần
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

    # PB002: tài khoản inactive
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Tài khoản đã bị vô hiệu hóa"},
        )

    # Đăng nhập thành công - reset failed count
    user.failed_login_count = 0
    user.locked_until = None
    if not user.first_login_at:
        user.first_login_at = now  # PB047

    db.commit()
    _log(db, user.id, email, True, request)

    # PB012: tạo access + refresh token
    payload = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    # Lưu refresh token vào Redis (PB006: có thể invalidate all)
    _redis_setex(
        f"{_REFRESH_PREFIX}{refresh_token}",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        str(user.id),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,           # PB019: frontend dùng để redirect
        "must_change_pw": user.must_change_pw,  # PB010
        "user_id": str(user.id),
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
    }


def refresh_token(token: str) -> dict:
    """PB012: tự động refresh access token"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token không hợp lệ")

    # Kiểm tra token còn trong Redis không
    stored = _redis_get(f"{_REFRESH_PREFIX}{token}")
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token đã hết hạn hoặc bị thu hồi")

    new_access = create_access_token({"sub": payload["sub"], "role": payload["role"]})
    new_refresh = create_refresh_token({"sub": payload["sub"], "role": payload["role"]})

    # Xoay refresh token (rotation)
    _redis_delete(f"{_REFRESH_PREFIX}{token}")
    _redis_setex(
        f"{_REFRESH_PREFIX}{new_refresh}",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        stored,
    )

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


def logout(refresh_token: str):
    """PB005: đăng xuất thiết bị hiện tại"""
    _redis_delete(f"{_REFRESH_PREFIX}{refresh_token}")


def logout_all(user_id: str):
    """PB006: đăng xuất tất cả thiết bị - xóa mọi refresh token của user"""
    keys = _redis_keys(f"{_REFRESH_PREFIX}*")
    for key in keys:
        if _redis_get(key) == user_id:
            _redis_delete(key)


def forgot_password(email: str, db: Session):
    """PB007"""
    user = db.query(User).filter(User.email == email).first()
    # Không tiết lộ email có tồn tại hay không (security best practice)
    if not user:
        return

    token = create_reset_token(str(user.id))
    # Lưu token vào Redis để đảm bảo dùng 1 lần
    _redis_setex(f"reset:{token}", timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES), str(user.id))

    reset_link = f"{settings.APP_URL}/reset-password?token={token}"
    send_reset_password_email(user.email, reset_link)


def reset_password(token: str, new_password: str, db: Session):
    """PB008"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Link reset không hợp lệ hoặc đã hết hạn")

    # Kiểm tra token còn trong Redis (dùng 1 lần)
    stored = _redis_get(f"reset:{token}")
    if not stored:
        raise HTTPException(status_code=400, detail="Link reset đã được sử dụng hoặc hết hạn")

    ok, msg = validate_password_strength(new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    user_id = UUID(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # PB008: không trùng mật khẩu cũ
    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ")

    user.password_hash = hash_password(new_password)
    user.must_change_pw = False
    _redis_delete(f"reset:{token}")
    db.commit()

    # PB009-style: đăng xuất tất cả thiết bị sau khi đổi mật khẩu
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

    # PB009: đăng xuất tất cả thiết bị
    logout_all(str(user.id))


def send_otp(email: str, db: Session):
    """PB011: gửi OTP, cooldown 60 giây"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email không tồn tại")

    # Kiểm tra cooldown 60 giây
    if _redis_get(f"{_OTP_LOCK_PREFIX}{email}"):
        raise HTTPException(status_code=429, detail="Vui lòng chờ 60 giây trước khi gửi lại OTP")

    otp = generate_otp()
    _redis_setex(f"{_OTP_PREFIX}{email}", timedelta(minutes=settings.OTP_EXPIRE_MINUTES), otp)
    _redis_setex(f"{_OTP_LOCK_PREFIX}{email}", 60, "1")  # cooldown 60s

    send_otp_email(user.email, user.full_name, otp)


def verify_otp(email: str, otp: str, db: Session) -> dict:
    """PB011: xác thực OTP và cấp token"""
    stored_otp = _redis_get(f"{_OTP_PREFIX}{email}")
    if not stored_otp or stored_otp != otp:
        raise HTTPException(status_code=400, detail="OTP không hợp lệ hoặc đã hết hạn")

    _redis_delete(f"{_OTP_PREFIX}{email}")

    user = db.query(User).filter(User.email == email).first()
    payload = {"sub": str(user.id), "role": user.role}
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }
