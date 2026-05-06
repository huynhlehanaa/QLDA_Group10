"""
User service: PB022-PB051
- CEO tạo/quản lý Manager
- Manager tạo/quản lý Staff
- Import hàng loạt (PB042)
- Profile cá nhân (PB043-PB045)
"""
import io
from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import generate_temp_password, hash_password
from app.models.organization import Department
from app.models.user import User
from app.services.auth_service import logout_all
from app.services.email_service import (
    send_new_manager_email,
    send_new_staff_email,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_or_404(db: Session, user_id: UUID) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


def _check_email_unique(db: Session, email: str, exclude_id: Optional[UUID] = None):
    """PB023, PB033"""
    q = db.query(User).filter(User.email == email)
    if exclude_id:
        q = q.filter(User.id != exclude_id)
    if q.first():
        raise HTTPException(status_code=409, detail=f"Email '{email}' đã tồn tại trong hệ thống")


# ── CEO: quản lý Manager ──────────────────────────────────────────────────────

def create_manager(org_id: UUID, full_name: str, email: str, dept_id: UUID, db: Session) -> User:
    """PB022, PB023, PB024, PB048"""
    _check_email_unique(db, email)

    # PB048: phải có phòng ban
    dept = db.query(Department).filter(Department.id == dept_id, Department.org_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Phòng ban không hợp lệ. Vui lòng chọn phòng ban.")

    temp_pw = generate_temp_password()
    user = User(
        org_id=org_id,
        dept_id=dept_id,
        full_name=full_name,
        email=email,
        password_hash=hash_password(temp_pw),
        role="manager",
        is_active=True,
        must_change_pw=True,
    )
    db.add(user)

    # Gán manager cho phòng ban nếu chưa có
    if not dept.manager_id:
        dept.manager_id = user.id

    db.commit()
    db.refresh(user)

    send_new_manager_email(email, full_name, temp_pw)  # PB024
    return user


def list_managers(org_id: UUID, db: Session, search: Optional[str] = None,
                  page: int = 1, page_size: int = 20) -> dict:
    """PB025, PB026"""
    q = db.query(User).filter(User.org_id == org_id, User.role == "manager")
    if search:
        q = q.filter(or_(
            User.full_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
        ))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size),
    }


def update_manager(user_id: UUID, full_name: Optional[str], dept_id: Optional[UUID],
                   org_id: UUID, db: Session) -> User:
    """PB027, PB028"""
    user = _get_user_or_404(db, user_id)
    if user.role != "manager":
        raise HTTPException(status_code=400, detail="Người dùng không phải Manager")

    if full_name:
        user.full_name = full_name
    if dept_id:
        dept = db.query(Department).filter(Department.id == dept_id, Department.org_id == org_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Phòng ban không hợp lệ")
        user.dept_id = dept_id  # PB028

    db.commit()
    db.refresh(user)
    return user


def reset_user_password(user_id: UUID, requesting_role: str, requesting_dept: Optional[UUID],
                        db: Session) -> str:
    """PB029, PB038"""
    user = _get_user_or_404(db, user_id)

    # PB038: Manager chỉ reset được nhân viên trong phòng của mình
    if requesting_role == "manager":
        if user.dept_id != requesting_dept:
            raise HTTPException(status_code=403, detail="Chỉ có thể reset mật khẩu nhân viên trong phòng ban của bạn")

    temp_pw = generate_temp_password()
    user.password_hash = hash_password(temp_pw)
    user.must_change_pw = True
    logout_all(str(user.id))
    db.commit()

    if user.role == "manager":
        send_new_manager_email(user.email, user.full_name, temp_pw)
    else:
        send_new_staff_email(user.email, user.full_name, temp_pw)

    return temp_pw


def set_active_status(user_id: UUID, is_active: bool, requesting_role: str,
                      requesting_dept: Optional[UUID], db: Session) -> User:
    """PB030, PB031, PB039, PB040"""
    user = _get_user_or_404(db, user_id)

    if requesting_role == "manager" and user.dept_id != requesting_dept:
        raise HTTPException(status_code=403, detail="Không có quyền thao tác với tài khoản này")

    user.is_active = is_active
    if not is_active:
        logout_all(str(user.id))  # force logout ngay khi vô hiệu hóa

    db.commit()
    db.refresh(user)
    return user


# ── Manager: quản lý Staff ────────────────────────────────────────────────────

def create_staff(org_id: UUID, dept_id: UUID, full_name: str, email: str,
                 phone: Optional[str], db: Session) -> User:
    """PB032, PB033, PB034"""
    _check_email_unique(db, email)

    temp_pw = generate_temp_password()
    user = User(
        org_id=org_id,
        dept_id=dept_id,
        full_name=full_name,
        email=email,
        phone=phone,
        password_hash=hash_password(temp_pw),
        role="staff",
        is_active=True,
        must_change_pw=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    send_new_staff_email(email, full_name, temp_pw)  # PB034
    return user


def list_staff(dept_id: UUID, db: Session, search: Optional[str] = None) -> list:
    """PB035, PB036"""
    q = db.query(User).filter(User.dept_id == dept_id, User.role == "staff")
    if search:
        q = q.filter(User.full_name.ilike(f"%{search}%"))
    return q.order_by(User.full_name).all()


def update_staff(user_id: UUID, full_name: Optional[str], phone: Optional[str],
                 manager_dept_id: UUID, db: Session) -> User:
    """PB037"""
    user = _get_user_or_404(db, user_id)
    if user.dept_id != manager_dept_id:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa nhân viên này")
    if full_name:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    db.commit()
    db.refresh(user)
    return user


def import_staff_from_excel(file_bytes: bytes, org_id: UUID, dept_id: UUID, db: Session) -> dict:
    """PB041, PB042: import hàng loạt từ Excel"""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
    ws = wb.active

    errors = []
    created = []

    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):
            continue
        full_name = str(row[0]).strip() if row[0] else ""
        email = str(row[1]).strip() if row[1] else ""
        phone = str(row[2]).strip() if len(row) > 2 and row[2] else None

        if not full_name or not email:
            errors.append({"row": i, "error": "Thiếu họ tên hoặc email"})
            continue

        if db.query(User).filter(User.email == email).first():
            errors.append({"row": i, "email": email, "error": "Email đã tồn tại"})
            continue

        temp_pw = generate_temp_password()
        user = User(
            org_id=org_id, dept_id=dept_id,
            full_name=full_name, email=email, phone=phone,
            password_hash=hash_password(temp_pw),
            role="staff", is_active=True, must_change_pw=True,
        )
        db.add(user)
        created.append({"email": email, "full_name": full_name})
        send_new_staff_email(email, full_name, temp_pw)

    db.commit()
    return {"created": len(created), "errors": errors, "details": created}


# ── Profile cá nhân ───────────────────────────────────────────────────────────

def update_avatar(user: User, avatar_url: str, db: Session) -> User:
    """PB044"""
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user


def update_phone(user: User, phone: str, db: Session) -> User:
    """PB045: validate số điện thoại VN"""
    import re
    if not re.match(r"^(0|\+84)[3-9]\d{8}$", phone):
        raise HTTPException(status_code=400, detail="Số điện thoại không đúng định dạng Việt Nam")
    user.phone = phone
    db.commit()
    db.refresh(user)
    return user
