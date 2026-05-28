"""
Chạy để tạo hoặc bổ sung dữ liệu mẫu:
  python seed.py

Script này là idempotent: có thể chạy lại nhiều lần mà không bị trùng dữ liệu.
"""
import os
import sys
from datetime import datetime, timedelta
import uuid

sys.path.insert(0, os.path.dirname(__file__))

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.models.organization import Department, Organization
from app.models.task import Task, TaskAssignee
from app.models.user import User


def get_or_create_department(db, org_id, name):
    department = db.query(Department).filter(Department.org_id == org_id, Department.name == name).first()
    if department:
        return department

    department = Department(id=uuid.uuid4(), org_id=org_id, name=name)
    db.add(department)
    db.flush()
    return department


def get_or_create_user(db, *, email, defaults):
    user = db.query(User).filter(User.email == email).first()
    if user:
        for key, value in defaults.items():
            setattr(user, key, value)
        return user

    user = User(id=uuid.uuid4(), email=email, **defaults)
    db.add(user)
    db.flush()
    return user


def get_or_create_task(db, *, title, created_by, defaults):
    task = db.query(Task).filter(Task.created_by == created_by, Task.title == title).first()
    if task:
        for key, value in defaults.items():
            if key != "assignee":
                setattr(task, key, value)
        return task

    task_defaults = {k: v for k, v in defaults.items() if k not in {"assignee", "title"}}
    task = Task(id=uuid.uuid4(), created_by=created_by, title=title, **task_defaults)
    db.add(task)
    db.flush()
    return task


db = SessionLocal()

try:
    Base.metadata.create_all(bind=engine)

    org = db.query(Organization).filter(Organization.name == "Công ty KPI Mẫu").first()
    if not org:
        org = Organization(
            id=uuid.uuid4(),
            name="Công ty KPI Mẫu",
            work_days=["mon", "tue", "wed", "thu", "fri"],
            work_start="08:00",
            work_end="17:30",
        )
        db.add(org)
        db.flush()

    ceo = get_or_create_user(
        db,
        email="ceo@company.com",
        defaults={
            "org_id": org.id,
            "dept_id": None,
            "full_name": "Giám đốc CEO",
            "password_hash": hash_password("Admin@123456"),
            "role": "ceo",
            "is_active": True,
            "must_change_pw": False,
        },
    )

    dept_kt = get_or_create_department(db, org.id, "Phòng Kỹ thuật")
    dept_kd = get_or_create_department(db, org.id, "Phòng Kinh doanh")

    employees = []
    employee_specs = [
        ("nv1@company.com", "Nhân viên 1", dept_kt.id),
        ("nv2@company.com", "Nhân viên 2", dept_kt.id),
        ("nv3@company.com", "Nhân viên 3", dept_kd.id),
    ]

    for email, full_name, dept_id in employee_specs:
        employee = get_or_create_user(
            db,
            email=email,
            defaults={
                "org_id": org.id,
                "dept_id": dept_id,
                "full_name": full_name,
                "password_hash": hash_password("Nv@123456"),
                "role": "employee",
                "is_active": True,
                "must_change_pw": False,
            },
        )
        employees.append(employee)

    now = datetime.now()
    seed_tasks = [
        {
            "title": "Thiết kế giao diện homepage",
            "description": "Tạo mockup và thiết kế giao diện trang chủ theo brand guideline",
            "priority": "high",
            "status": "in_progress",
            "progress_pct": 60,
            "deadline": now + timedelta(days=5),
            "dept_id": dept_kt.id,
            "assignee": employees[0],
        },
        {
            "title": "API authentication",
            "description": "Implement JWT authentication endpoints",
            "priority": "high",
            "status": "in_progress",
            "progress_pct": 80,
            "deadline": now + timedelta(days=3),
            "dept_id": dept_kt.id,
            "assignee": employees[1],
        },
        {
            "title": "Chuẩn bị tài liệu pitch",
            "description": "Soạn deck PowerPoint cho khách hàng mới",
            "priority": "medium",
            "status": "todo",
            "progress_pct": 0,
            "deadline": now + timedelta(days=7),
            "dept_id": dept_kd.id,
            "assignee": employees[2],
        },
        {
            "title": "Kiểm tra chất lượng code",
            "description": "Code review và unit test cho sprint 2",
            "priority": "medium",
            "status": "done",
            "progress_pct": 100,
            "deadline": now - timedelta(days=2),
            "completed_at": now - timedelta(days=1),
            "dept_id": dept_kt.id,
            "assignee": employees[0],
        },
        {
            "title": "Cập nhật báo cáo KPI tháng",
            "description": "Biên soạn báo cáo KPI tháng 5",
            "priority": "high",
            "status": "in_progress",
            "progress_pct": 40,
            "deadline": now + timedelta(days=8),
            "dept_id": dept_kd.id,
            "assignee": employees[2],
        },
        {
            "title": "Fix bugs từ test environment",
            "description": "Sửa các bugs phát hiện được từ QA",
            "priority": "high",
            "status": "todo",
            "progress_pct": 0,
            "deadline": now + timedelta(days=4),
            "dept_id": dept_kt.id,
            "assignee": employees[1],
        },
    ]

    task_count = 0
    for task_data in seed_tasks:
        assignee = task_data.pop("assignee")

        task = get_or_create_task(
            db,
            title=task_data["title"],
            created_by=ceo.id,
            defaults=task_data,
        )

        assignment = db.query(TaskAssignee).filter(
            TaskAssignee.task_id == task.id,
            TaskAssignee.user_id == assignee.id,
        ).first()
        if not assignment:
            db.add(TaskAssignee(task_id=task.id, user_id=assignee.id))
        task_count += 1

    db.commit()

    print("✅ Seed thành công!")
    print(f"Organization : {org.name}")
    print("CEO          : ceo@company.com / Admin@123456")
    print("Nhân viên    : nv1@company.com, nv2@company.com, nv3@company.com / Nv@123456")
    print(f"Phòng ban    : {dept_kt.name}, {dept_kd.name}")
    print(f"Tasks seeded : {task_count}")

except Exception as e:
    db.rollback()
    print(f"❌ Lỗi seed: {e}")
    import traceback

    traceback.print_exc()
    raise
finally:
    db.close()
