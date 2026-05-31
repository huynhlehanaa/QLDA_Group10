import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Organization(Base):
    __tablename__ = "ORGANIZATIONS"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    logo_url = Column(String, nullable=True)
    work_days = Column(JSON, default=list)   # ["mon","tue","wed","thu","fri"]
    work_start = Column(String(5), default="08:00")
    work_end = Column(String(5), default="17:30")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    departments = relationship("Department", back_populates="organization")


class Department(Base):
    __tablename__ = "DEPARTMENTS"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("ORGANIZATIONS.id"), nullable=False)
    # Trong app/models/organization.py, trong class Department:
    manager_id = Column(UUID(as_uuid=True), 
                   ForeignKey("USERS.id", use_alter=True),  # Thêm use_alter=True
                   nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="departments")
    members = relationship("User", back_populates="department", foreign_keys="User.dept_id")
    manager = relationship("User", foreign_keys=[manager_id])
