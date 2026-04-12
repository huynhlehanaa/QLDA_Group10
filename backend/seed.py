"""
Chạy một lần để tạo dữ liệu ban đầu:
  python seed.py

Tạo ra:
  - 1 Organization (Công ty mẫu)
  - 1 CEO account: ceo@company.com / Admin@123456
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import SessionLocal
from app.models.organization import Organization, Department
from app.models.user import User
from app.core.security import hash_password
import uuid

db = SessionLocal()

try:
    # Kiểm tra đã seed chưa
    if db.query(User).filter(User.role == "ceo").first():
        print("Đã có dữ liệu. Bỏ qua seed.")
        sys.exit(0)

    # Tạo Organization
    org = Organization(
        id=uuid.uuid4(),
        name="Công ty KPI Mẫu",
        work_days=["mon", "tue", "wed", "thu", "fri"],
        work_start="08:00",
        work_end="17:30",
    )
    db.add(org)
    db.flush()

    # Tạo CEO
    ceo = User(
        id=uuid.uuid4(),
        org_id=org.id,
        full_name="Giám đốc CEO",
        email="ceo@company.com",
        password_hash=hash_password("Admin@123456"),
        role="ceo",
        is_active=True,
        must_change_pw=False,
    )
    db.add(ceo)
    db.flush()

    # Tạo 2 phòng ban mẫu
    dept_kt = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Kỹ thuật")
    dept_kd = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Kinh doanh")
    db.add_all([dept_kt, dept_kd])

    db.commit()

    print("Seed thành công!")
    print(f"  Organization : {org.name}")
    print(f"  CEO email    : ceo@company.com")
    print(f"  CEO password : Admin@123456")
    print(f"  Phòng ban    : {dept_kt.name}, {dept_kd.name}")

except Exception as e:
    db.rollback()
    print(f"Lỗi seed: {e}")
    raise
finally:
    db.close()
