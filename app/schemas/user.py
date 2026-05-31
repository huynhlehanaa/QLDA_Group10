from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    full_name: str
    email: EmailStr


class CreateManagerRequest(BaseModel):
    """PB022: CEO tạo Manager"""
    full_name: str
    email: EmailStr
    dept_id: UUID


class CreateStaffRequest(BaseModel):
    """PB032: Manager tạo nhân viên"""
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class UpdateUserRequest(BaseModel):
    """PB027, PB037"""
    full_name: Optional[str] = None
    dept_id: Optional[UUID] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    must_change_pw: bool
    dept_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    first_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    dept_id: Optional[UUID] = None
    dept_name: Optional[str] = None
    avatar_url: Optional[str] = None
    first_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateAvatarRequest(BaseModel):
    """PB044"""
    avatar_url: str


class UpdatePhoneRequest(BaseModel):
    """PB045"""
    phone: str


class ImportStaffRow(BaseModel):
    """PB042"""
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class PaginatedUsers(BaseModel):
    items: list[UserListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
