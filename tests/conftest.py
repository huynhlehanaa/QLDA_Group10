"""
Shared fixtures cho toàn bộ test suite Sprint 1 + Sprint 2.
QUAN TRỌNG: Mock Redis phải đặt TRƯỚC KHI import app.
"""
import sys
import uuid
import fnmatch
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

# ══════════════════════════════════════════════════════════════
# MOCK REDIS — phải đặt trước tất cả import của app
# ══════════════════════════════════════════════════════════════
fake_store = {}

class FakeRedis:
    def get(self, key):
        return fake_store.get(key)

    def set(self, key, value):
        fake_store[key] = value
        return True

    def setex(self, key, ttl, value):
        fake_store[key] = value
        return True

    def delete(self, key):
        fake_store.pop(key, None)
        return True

    def keys(self, pattern="*"):
        return [k for k in fake_store if fnmatch.fnmatch(k, pattern)]

    def from_url(self, *args, **kwargs):
        return FakeRedis()

_fake_redis = FakeRedis()
_mock_redis_module = MagicMock()
_mock_redis_module.from_url = lambda *a, **kw: _fake_redis
sys.modules["redis"] = _mock_redis_module

# ══════════════════════════════════════════════════════════════
# Bây giờ mới import app và các module khác
# ══════════════════════════════════════════════════════════════
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db import Base, get_db
from app.core.security import hash_password

# Models Sprint 1
from app.models.user import User, LoginLog
from app.models.organization import Organization, Department
from app.models.notification import Notification

# Models Sprint 2
from app.models.task import (
    Task, TaskAssignee, TaskComment, TaskAttachment,
    TaskChecklist, TaskHistory, DeadlineExtensionRequest, Epic,
)
# Models Sprint 3
from app.models.kpi import (
    KpiConfig, KpiCriteria, KpiCriteriaHistory,
    KpiScore, KpiTarget, KpiFinalize, KpiAppeal, KpiAdjustment,
)

# ── Test database (SQLite) ─────────────────────────────────────
TEST_DB_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Session-scoped: tạo bảng 1 lần ───────────────────────────
@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── Auto: xóa data + fake_store sau mỗi test ──────────────────
@pytest.fixture(autouse=True)
def clean_db():
    """Xóa sạch data và Redis store giữa các test."""
    # Reset fake Redis store
    fake_store.clear()
    yield
    db = TestingSession()
    try:
        # Sprint 1
        db.query(LoginLog).delete()
        db.query(Notification).delete()
        db.query(User).delete()
        db.query(Department).delete()
        db.query(Organization).delete()
        # Sprint 2 trước (foreign key)
        db.query(DeadlineExtensionRequest).delete()
        db.query(TaskHistory).delete()
        db.query(TaskChecklist).delete()
        db.query(TaskAttachment).delete()
        db.query(TaskComment).delete()
        db.query(TaskAssignee).delete()
        db.query(Task).delete()
        db.query(Epic).delete()
        # Sprint 3
        db.query(KpiAdjustment).delete()
        db.query(KpiAppeal).delete()
        db.query(KpiFinalize).delete()
        db.query(KpiTarget).delete()
        db.query(KpiScore).delete()
        db.query(KpiCriteriaHistory).delete()
        db.query(KpiCriteria).delete()
        db.query(KpiConfig).delete()
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@pytest.fixture
def db():
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture
def client():
    return TestClient(app)


# ══════════════════════════════════════════════════════════════
# Sprint 1 Fixtures
# ══════════════════════════════════════════════════════════════

@pytest.fixture
def org(db):
    o = Organization(id=uuid.uuid4(), name="Công ty Test")
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@pytest.fixture
def dept(db, org):
    d = Department(id=uuid.uuid4(), org_id=org.id, name="Phòng Test")
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


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
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Login failed: {res.json()}"
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


# ══════════════════════════════════════════════════════════════
# Sprint 2 Fixtures
# ══════════════════════════════════════════════════════════════

@pytest.fixture
def epic(db, org, dept, manager_user):
    e = Epic(
        id=uuid.uuid4(),
        dept_id=dept.id,
        created_by=manager_user.id,
        name="Epic Test",
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@pytest.fixture
def task(db, dept, manager_user):
    t = Task(
        id=uuid.uuid4(),
        dept_id=dept.id,
        created_by=manager_user.id,
        title="Task Test",
        status="todo",
        priority="medium",
        progress_pct=0,
        deadline=datetime.now(timezone.utc) + timedelta(days=3),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def task_with_assignee(db, task, staff_user):
    db.add(TaskAssignee(task_id=task.id, user_id=staff_user.id))
    db.commit()
    return task


@pytest.fixture
def overdue_task(db, dept, manager_user):
    t = Task(
        id=uuid.uuid4(),
        dept_id=dept.id,
        created_by=manager_user.id,
        title="Overdue Task",
        status="in_progress",
        priority="high",
        progress_pct=30,
        deadline=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def done_task(db, dept, manager_user, staff_user):
    now = datetime.now(timezone.utc)
    t = Task(
        id=uuid.uuid4(),
        dept_id=dept.id,
        created_by=manager_user.id,
        title="Done Task",
        status="done",
        priority="low",
        progress_pct=100,
        deadline=now + timedelta(days=1),
        completed_at=now,
    )
    db.add(t)
    db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
    db.commit()
    db.refresh(t)
    return t