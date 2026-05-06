from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import decode_token
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == UUID(user_id)).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Không tìm thấy người dùng")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa")

    return user


def require_ceo(current_user: User = Depends(get_current_user)) -> User:
    """PB016: chỉ CEO mới truy cập được"""
    if current_user.role != "ceo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ CEO mới có quyền thực hiện thao tác này")
    return current_user


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    """PB017: manager hoặc CEO"""
    if current_user.role not in ("manager", "ceo"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yêu cầu quyền Manager trở lên")
    return current_user


def require_ceo_or_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("ceo", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    return current_user
