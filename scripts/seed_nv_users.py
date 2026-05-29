#!/usr/bin/env python
import os
import sys
from uuid import uuid4

# Ensure project root is importable
proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if proj_root not in sys.path:
    sys.path.insert(0, proj_root)

from app.db import SessionLocal
from app.models.organization import Organization, Department
from app.models.user import User
from app.core.security import hash_password

USERS = [
    ("nv1", "nv1@company.com", "Nhân viên 1"),
    ("nv2", "nv2@company.com", "Nhân viên 2"),
    ("nv3", "nv3@company.com", "Nhân viên 3"),
]
PASSWORD = "Nv1@12345"  # initial password for all sample users (meets strength rules)


def main():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Công ty KPI Mẫu")
            db.add(org)
            db.commit()
            db.refresh(org)
            print("Created organization:", org.name)

        dept = db.query(Department).filter(Department.org_id == org.id).first()
        if not dept:
            dept = Department(org_id=org.id, name="Nhân viên")
            db.add(dept)
            db.commit()
            db.refresh(dept)
            print("Created department:", dept.name)

        created = []
        for uname, email, fullname in USERS:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"User already exists: {email}")
                continue
            user = User(
                org_id=org.id,
                dept_id=dept.id,
                full_name=fullname,
                email=email,
                password_hash=hash_password(PASSWORD),
                role="staff",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created.append((email, PASSWORD))
            print(f"Created user: {email}")

        if created:
            print("\nSeeded users:")
            for e, p in created:
                print(e, p)
        else:
            print("No new users created.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
