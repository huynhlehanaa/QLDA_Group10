#!/usr/bin/env python
"""Seed nv1, nv2, nv3 — load project modules by file to avoid installed-package conflicts."""
import os
import sys
import importlib.util
import types

proj_root = os.path.abspath(os.getcwd())

def load_module_as(name, relpath):
    path = os.path.join(proj_root, relpath)
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


# Ensure a package module 'app' exists so submodules import normally
if 'app' not in sys.modules:
    sys.modules['app'] = types.ModuleType('app')

# Load core modules under the 'app' package name to satisfy intra-package imports
load_module_as('app.core.config', os.path.join('app', 'core', 'config.py'))
load_module_as('app.core.security', os.path.join('app', 'core', 'security.py'))
db_mod = load_module_as('app.db', os.path.join('app', 'db.py'))
load_module_as('app.models.organization', os.path.join('app', 'models', 'organization.py'))
load_module_as('app.models.user', os.path.join('app', 'models', 'user.py'))

# Import symbols from loaded modules
SessionLocal = sys.modules['app.db'].SessionLocal
Organization = sys.modules['app.models.organization'].Organization
Department = sys.modules['app.models.organization'].Department
User = sys.modules['app.models.user'].User
hash_password = sys.modules['app.core.security'].hash_password

USERS = [
    ("nv1", "nv1@company.com", "Nhân viên 1"),
    ("nv2", "nv2@company.com", "Nhân viên 2"),
    ("nv3", "nv3@company.com", "Nhân viên 3"),
]
PASSWORD = "Nv1@12345"


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
