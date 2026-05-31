from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_ceo, require_ceo_or_manager
from app.db import get_db
from app.models.user import User
from app.schemas.organization import (
    AssignManagerRequest,
    CreateDepartmentRequest,
    DepartmentResponse,
    UpdateDepartmentRequest,
)
from app.services import org_service

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    body: CreateDepartmentRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB052"""
    return org_service.create_department(
        org_id=current_user.org_id,
        name=body.name,
        description=body.description,
        manager_id=body.manager_id,
        db=db,
    )


@router.get("/departments")
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB060: tất cả role đều xem được danh sách phòng ban"""
    return org_service.list_departments(current_user.org_id, db)


@router.patch("/departments/{dept_id}")
def update_department(
    dept_id: UUID,
    body: UpdateDepartmentRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB053"""
    return org_service.update_department(dept_id, current_user.org_id, body.name, body.description, db)


@router.patch("/departments/{dept_id}/assign-manager")
def assign_manager(
    dept_id: UUID,
    body: AssignManagerRequest,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB054, PB055"""
    return org_service.assign_manager(dept_id, current_user.org_id, body.manager_id, db)


@router.delete("/departments/{dept_id}", status_code=status.HTTP_200_OK)
def deactivate_department(
    dept_id: UUID,
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB056"""
    org_service.deactivate_department(dept_id, current_user.org_id, db)
    return {"message": "Phòng ban đã được vô hiệu hóa"}


@router.get("/departments/without-manager")
def departments_without_manager(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB057: cảnh báo phòng ban không có Manager"""
    depts = org_service.get_departments_without_manager(current_user.org_id, db)
    return {"count": len(depts), "departments": [{"id": d.id, "name": d.name} for d in depts]}


@router.get("/org-chart")
def org_chart(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB058, PB059, PB060"""
    return org_service.get_org_chart(current_user.org_id, db)


@router.get("/stats")
def dept_stats(
    current_user: User = Depends(require_ceo),
    db: Session = Depends(get_db),
):
    """PB050, PB060: thống kê nhân sự theo phòng ban"""
    return org_service.get_dept_stats(current_user.org_id, db)
