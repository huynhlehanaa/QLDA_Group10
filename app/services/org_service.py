"""
Org service: PB052-PB061
- Tạo/sửa/xóa phòng ban
- Gán Manager phụ trách
- Org chart
"""
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.organization import Department
from app.models.user import User


def create_department(org_id: UUID, name: str, description: Optional[str],
                      manager_id: Optional[UUID], db: Session) -> Department:
    """PB052"""
    if manager_id:
        mgr = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
        if not mgr:
            raise HTTPException(status_code=400, detail="Manager không hợp lệ")

    dept = Department(org_id=org_id, name=name, description=description, manager_id=manager_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(dept_id: UUID, org_id: UUID, name: Optional[str],
                      description: Optional[str], db: Session) -> Department:
    """PB053"""
    dept = _get_dept_or_404(db, dept_id, org_id)
    if name:
        dept.name = name
    if description is not None:
        dept.description = description
    db.commit()
    db.refresh(dept)
    return dept


def assign_manager(dept_id: UUID, org_id: UUID, manager_id: UUID, db: Session) -> Department:
    """PB054, PB055"""
    dept = _get_dept_or_404(db, dept_id, org_id)
    mgr = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not mgr:
        raise HTTPException(status_code=400, detail="Người dùng không phải Manager")

    dept.manager_id = manager_id
    mgr.dept_id = dept_id
    db.commit()
    db.refresh(dept)
    return dept


def deactivate_department(dept_id: UUID, org_id: UUID, db: Session):
    """PB056: kiểm tra còn nhân viên active không"""
    dept = _get_dept_or_404(db, dept_id, org_id)

    active_members = db.query(User).filter(
        User.dept_id == dept_id,
        User.is_active == True,
        User.role == "staff",
    ).count()

    if active_members > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Phòng ban còn {active_members} nhân viên đang active. Vui lòng chuyển họ sang phòng ban khác trước.",
        )

    dept.is_active = False
    db.commit()


def list_departments(org_id: UUID, db: Session) -> list:
    """Danh sách phòng ban kèm số lượng thành viên"""
    depts = db.query(Department).filter(
        Department.org_id == org_id,
        Department.is_active == True,
    ).all()

    result = []
    for d in depts:
        member_count = db.query(User).filter(
            User.dept_id == d.id, User.is_active == True
        ).count()
        manager_name = None
        if d.manager_id:
            mgr = db.query(User).filter(User.id == d.manager_id).first()
            manager_name = mgr.full_name if mgr else None

        result.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "manager_id": d.manager_id,
            "manager_name": manager_name,
            "is_active": d.is_active,
            "member_count": member_count,
            "created_at": d.created_at,
        })
    return result


def get_departments_without_manager(org_id: UUID, db: Session) -> list:
    """PB057: phòng ban không có Manager"""
    return db.query(Department).filter(
        Department.org_id == org_id,
        Department.is_active == True,
        Department.manager_id == None,
    ).all()


def get_org_chart(org_id: UUID, db: Session) -> dict:
    """PB058, PB060: sơ đồ tổ chức dạng cây CEO → Manager → Staff"""
    ceo = db.query(User).filter(User.org_id == org_id, User.role == "ceo").first()
    if not ceo:
        return {}

    depts = db.query(Department).filter(
        Department.org_id == org_id, Department.is_active == True
    ).all()

    dept_nodes = []
    for dept in depts:
        members = db.query(User).filter(
            User.dept_id == dept.id,
            User.role == "staff",
            User.is_active == True,
        ).all()

        manager = None
        if dept.manager_id:
            manager = db.query(User).filter(User.id == dept.manager_id).first()

        dept_nodes.append({
            "dept_id": str(dept.id),
            "dept_name": dept.name,
            "member_count": len(members),
            "manager": {
                "id": str(manager.id),
                "full_name": manager.full_name,
                "avatar_url": manager.avatar_url,
                "role": "manager",
                "children": [
                    {
                        "id": str(m.id),
                        "full_name": m.full_name,
                        "avatar_url": m.avatar_url,
                        "role": "staff",
                    }
                    for m in members
                ],
            } if manager else None,
        })

    return {
        "id": str(ceo.id),
        "full_name": ceo.full_name,
        "role": "ceo",
        "avatar_url": ceo.avatar_url,
        "departments": dept_nodes,
    }


def get_dept_stats(org_id: UUID, db: Session) -> list:
    """PB050, PB060: thống kê nhân sự từng phòng ban"""
    depts = db.query(Department).filter(
        Department.org_id == org_id, Department.is_active == True
    ).all()

    return [
        {
            "dept_id": str(d.id),
            "dept_name": d.name,
            "manager_count": db.query(User).filter(
                User.dept_id == d.id, User.role == "manager", User.is_active == True
            ).count(),
            "staff_count": db.query(User).filter(
                User.dept_id == d.id, User.role == "staff", User.is_active == True
            ).count(),
        }
        for d in depts
    ]


def _get_dept_or_404(db: Session, dept_id: UUID, org_id: UUID) -> Department:
    dept = db.query(Department).filter(
        Department.id == dept_id, Department.org_id == org_id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    return dept
