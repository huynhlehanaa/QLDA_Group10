from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class CreateDepartmentRequest(BaseModel):
    """PB052"""
    name: str
    description: Optional[str] = None
    manager_id: Optional[UUID] = None


class UpdateDepartmentRequest(BaseModel):
    """PB053"""
    name: Optional[str] = None
    description: Optional[str] = None


class AssignManagerRequest(BaseModel):
    """PB054, PB055"""
    manager_id: UUID


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    manager_id: Optional[UUID] = None
    manager_name: Optional[str] = None
    is_active: bool
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgChartNode(BaseModel):
    """PB058: sơ đồ tổ chức dạng cây"""
    id: UUID
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    dept_name: Optional[str] = None
    children: list["OrgChartNode"] = []

    model_config = {"from_attributes": True}


OrgChartNode.model_rebuild()
