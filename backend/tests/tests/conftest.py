"""
Shared fixtures dùng chung cho toàn bộ test suite Sprint 1.
Dùng SQLite in-memory để test không ảnh hưởng database thực.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch
import uuid

from app.main import app
from app.db import Base, get_db
from app.core.security import hash_password
from app.models.user import User, LoginLog
from app.models.organization import Organization, Department
from app.models.notification import Notification

# ── Test database (SQLite in-memory) ──────────────────────────
TEST_DB_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_db():
    """Xóa sạch data giữa các test."""
    yield
    db = TestingSession()
    db.query(LoginLog).delete()
    db.query(Notification).delete()
    db.query(User).delete()
    db.query(Department).delete()
    db.query(Organization).delete()
    db.commit()
    db.close()


@pytest.fixture
def db():
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture
def client():
    return TestClient(app)


# ── Seed helpers ──────────────────────────────────────────────

@pytest.fixture
def org(db):
    org = Organization(id=uuid.uuid4(), name="Công ty Test")
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def dept(db, org):
    dept = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Test")
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@pytest.fixture
def ceo_user(db, org):
    user = User(
        id=uuid.uuid4(), org_id=org.id,
        full_name="CEO Test", email="ceo@test.com",
        password_hash=hash_password("Ceo@123456"),
        role="ceo", is_active=True, must_change_pw=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def manager_user(db, org, dept):
    user = User(
        id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
        full_name="Manager Test", email="manager@test.com",
        password_hash=hash_password("Mgr@123456"),
        role="manager", is_active=True, must_change_pw=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def staff_user(db, org, dept):
    user = User(
        id=uuid.uuid4(), org_id=org.id, dept_id=dept.id,
        full_name="Staff Test", email="staff@test.com",
        password_hash=hash_password("Staff@123456"),
        role="staff", is_active=True, must_change_pw=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Token helpers ─────────────────────────────────────────────

def get_token(client, email: str, password: str) -> dict:
    """Đăng nhập và trả về {"access": ..., "refresh": ...}"""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.json()
    data = res.json()
    return {"access": data["access_token"], "refresh": data["refresh_token"]}


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def ceo_token(client, ceo_user):
    return get_token(client, "ceo@test.com", "Ceo@123456")


@pytest.fixture
def manager_token(client, manager_user):
    return get_token(client, "manager@test.com", "Mgr@123456")


@pytest.fixture
def staff_token(client, staff_user):
    return get_token(client, "staff@test.com", "Staff@123456")
