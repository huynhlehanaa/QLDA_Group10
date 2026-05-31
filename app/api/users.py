from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_user,
    require_ceo,
    require_manager,
    require_ceo_or_manager,
)
from app.db import get_db
from app.models.user import User
from app.schemas.user import (
    CreateManagerRequest,
    CreateStaffRequest,
    PaginatedUsers,
    UpdateAvatarRequest,
    UpdatePhoneRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


# ── Profile cá nhân ──────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """PB043: xem hồ sơ cá nhân"""
    return current_user


@router.patch("/me/avatar")
def update_avatar(
    body: UpdateAvatarRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB044"""
    user = user_service.update_avatar(current_user, body.avatar_url, db)
    return {"avatar_url": user.avatar_url}


@router.patch("/me/phone")
def update_phone(
    body: UpdatePhoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB045"""
    user = user_service.update_phone(current_user, body.phone, db)
    return {"phone": user.phone}


# ── CEO: quản lý Manager ─────────────────────────────────────────────────────

@router.post("/managers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_manager(
    body: CreateManagerRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB022, PB023, PB024, PB048"""
    return user_service.create_manager(
        org_id=current_user.org_id,
        full_name=body.full_name,
        email=body.email,
        dept_id=body.dept_id,
        db=db,
    )


@router.get("/managers", response_model=PaginatedUsers)
def list_managers(
    search: Optional[str] = Query(None, description="Tìm theo tên hoặc email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB025, PB026"""
    result = user_service.list_managers(current_user.org_id, db, search, page, page_size)
    return result


@router.patch("/managers/{user_id}", response_model=UserResponse)
def update_manager(
    user_id: UUID,
    body: UpdateUserRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB027, PB028"""
    return user_service.update_manager(user_id, body.full_name, body.dept_id, current_user.org_id, db)


@router.post("/managers/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_manager_password(
    user_id: UUID,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB029"""
    user_service.reset_user_password(user_id, "ceo", None, db)
    return {"message": "Mật khẩu đã được reset và gửi qua email"}


@router.patch("/managers/{user_id}/deactivate", status_code=status.HTTP_200_OK)
def deactivate_manager(
    user_id: UUID,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB030"""
    user_service.set_active_status(user_id, False, "ceo", None, db)
    return {"message": "Tài khoản đã bị vô hiệu hóa"}


@router.patch("/managers/{user_id}/activate", status_code=status.HTTP_200_OK)
def activate_manager(
    user_id: UUID,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB031"""
    user_service.set_active_status(user_id, True, "ceo", None, db)
    return {"message": "Tài khoản đã được kích hoạt"}


# ── Manager: quản lý Staff ───────────────────────────────────────────────────

@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    body: CreateStaffRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB032, PB033, PB034"""
    return user_service.create_staff(
        org_id=current_user.org_id,
        dept_id=current_user.dept_id,
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        db=db,
    )


@router.get("/staff", response_model=list[UserResponse])
def list_staff(
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB035, PB036"""
    return user_service.list_staff(current_user.dept_id, db, search)


@router.patch("/staff/{user_id}", response_model=UserResponse)
def update_staff(
    user_id: UUID,
    body: UpdateUserRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB037"""
    return user_service.update_staff(user_id, body.full_name, body.phone, current_user.dept_id, db)


@router.post("/staff/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_staff_password(
    user_id: UUID,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB038"""
    user_service.reset_user_password(user_id, "manager", current_user.dept_id, db)
    return {"message": "Mật khẩu đã được reset và gửi qua email"}


@router.patch("/staff/{user_id}/deactivate", status_code=status.HTTP_200_OK)
def deactivate_staff(
    user_id: UUID,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB039"""
    user_service.set_active_status(user_id, False, "manager", current_user.dept_id, db)
    return {"message": "Tài khoản đã bị vô hiệu hóa"}


@router.patch("/staff/{user_id}/activate", status_code=status.HTTP_200_OK)
def activate_staff(
    user_id: UUID,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB040"""
    user_service.set_active_status(user_id, True, "manager", current_user.dept_id, db)
    return {"message": "Tài khoản đã được kích hoạt"}


@router.get("/staff/template/download")
def download_import_template():
    """PB041: tải file Excel template"""
    import io
    import openpyxl
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh sách nhân viên"
    ws.append(["Họ và tên (*)", "Email công ty (*)", "Số điện thoại"])
    ws.append(["Nguyễn Văn A", "a.nguyen@company.com", "0901234567"])
    ws.column_dimensions["A"].width = 25
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 15

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_nhan_vien.xlsx"},
    )


@router.post("/staff/import", status_code=status.HTTP_200_OK)
async def import_staff(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB042: import nhân viên từ Excel"""
    if not file.filename.endswith((".xlsx", ".xls")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file Excel (.xlsx, .xls)")

    content = await file.read()
    result = user_service.import_staff_from_excel(content, current_user.org_id, current_user.dept_id, db)
    return result
