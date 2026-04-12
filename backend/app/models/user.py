import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "USERS"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("ORGANIZATIONS.id"), nullable=True)
    dept_id = Column(UUID(as_uuid=True), ForeignKey("DEPARTMENTS.id"), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String(20), nullable=False)          # ceo | manager | staff
    is_active = Column(Boolean, default=True)
    must_change_pw = Column(Boolean, default=True)     # PB010
    failed_login_count = Column(Integer, default=0)    # PB003
    locked_until = Column(DateTime(timezone=True), nullable=True)  # PB003
    avatar_url = Column(String, nullable=True)         # PB044
    phone = Column(String(20), nullable=True)          # PB045
    first_login_at = Column(DateTime(timezone=True), nullable=True)  # PB047
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="members", foreign_keys=[dept_id])
    login_logs = relationship("LoginLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class LoginLog(Base):
    """PB013, PB014: ghi log đăng nhập thành công và thất bại"""
    __tablename__ = "LOGIN_LOGS"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    ip_address = Column(String(45))
    user_agent = Column(String)
    success = Column(Boolean, nullable=False)
    email_attempted = Column(String(255), nullable=True)  # log ngay cả khi email sai
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="login_logs")
